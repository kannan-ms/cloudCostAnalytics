"""
Budget Service
Handles budget creation, monitoring, and alert generation.
Integrates with Forecast Service to predict proactive breaches.
"""

from datetime import datetime, timedelta
import calendar
from typing import Dict, List, Optional
from bson import ObjectId
from database import get_collection, Collections
from services import forecast_service

class BudgetService:
    @staticmethod
    def create_budget(user_id: str, data: Dict) -> Dict:
        budgets = get_collection(Collections.BUDGETS)
        
        budget = {
            "user_id": ObjectId(user_id),
            "name": data['name'],
            "amount": float(data['amount']),
            "period": data.get('period', 'monthly'), # Default monthly
            "scope": data.get('scope', {'type': 'global'}), # {type: 'service', value: 'Compute'}
            "thresholds": data.get('thresholds', [50, 80, 100]), # Percentages
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = budgets.insert_one(budget)
        budget['_id'] = str(result.inserted_id)
        budget['user_id'] = str(budget['user_id'])
        return budget

    @staticmethod
    def get_budgets(user_id: str) -> List[Dict]:
        budgets_collection = get_collection(Collections.BUDGETS)
        budgets = list(budgets_collection.find({"user_id": ObjectId(user_id)}).sort("created_at", -1))
        
        # Enrich with status
        for budget in budgets:
            budget['_id'] = str(budget['_id'])
            budget['user_id'] = str(budget['user_id'])
            # Calc status on the fly (lightweight version)
            # Full status requires aggregation which we do in 'track_budget'
        
        return budgets

    @staticmethod
    def delete_budget(user_id: str, budget_id: str) -> bool:
        budgets = get_collection(Collections.BUDGETS)
        result = budgets.delete_one({"_id": ObjectId(budget_id), "user_id": ObjectId(user_id)})
        return result.deleted_count > 0

    @staticmethod
    def track_budget(user_id: str, budget_id: str) -> Dict:
        """
        Calculates:
        - Actual spend so far
        - Forecasted total
        - Alerts
        """
        budgets_collection = get_collection(Collections.BUDGETS)
        budget = budgets_collection.find_one({"_id": ObjectId(budget_id), "user_id": ObjectId(user_id)})
        
        if not budget:
            return {"error": "Budget not found"}

        # Determine Date Range (Monthly)
        now = datetime.utcnow()
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        _, last_day = calendar.monthrange(now.year, now.month)
        end_date = now.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)
        
        days_in_month = last_day
        days_passed = now.day
        days_remaining = days_in_month - days_passed

        # 1. Calculate Actual Spend
        costs_collection = get_collection(Collections.CLOUD_COSTS)
        
        match_query = {
            "user_id": ObjectId(user_id),
            "usage_start_date": {"$gte": start_date, "$lte": end_date}
        }
        
        # Apply Scope
        scope = budget.get('scope', {})
        if scope.get('type') == 'service':
            match_query['service_name'] = scope.get('value')
        elif scope.get('type') == 'resource_group':
             match_query['tags.resource_group'] = scope.get('value')
        
        pipeline = [
            {"$match": match_query},
            {"$group": {"_id": None, "total": {"$sum": "$cost"}}}
        ]
        
        res = list(costs_collection.aggregate(pipeline))
        actual_spend = res[0]['total'] if res else 0.0
        
        # 2. Forecast Future Spend (for remaining days)
        forecasted_remaining = 0.0
        forecast_alert = None
        
        # Only forecast if we have remaining days
        if days_remaining > 0:
            filters = {}
            if scope.get('type') == 'service': filters['service'] = scope.get('value')
            
            # Use forecast service to predict remaining days
            # We ask for 'days_remaining' prediction
            fc_res = forecast_service.predict_future_costs(
                user_id, 
                periods_ahead=days_remaining, 
                granularity='daily',
                filters=filters
            )
            
            if fc_res.get('success'):
                forecasted_remaining = fc_res['total_predicted_cost']

        total_projected = actual_spend + forecasted_remaining
        pct_consumed = (actual_spend / budget['amount']) * 100
        pct_projected = (total_projected / budget['amount']) * 100
        
        # 3. Status & Alerts
        status = "Safe"
        alerts = []
        
        # Check standard thresholds
        sorted_thresholds = sorted(budget.get('thresholds', []))
        for t in sorted_thresholds:
            if pct_consumed >= t:
                alerts.append(f"Exceeded {t}% threshold ({pct_consumed:.1f}%)")
                if t >= 90: status = "Critical"
                elif t >= 50 and status != "Critical": status = "Warning"

        # Check Forecast Breach
        if total_projected > budget['amount']:
             over_amount = total_projected - budget['amount']
             alerts.append(f"Forecasted to exceed budget by ${over_amount:.2f}")
             if status != "Critical": status = "Warning" # Forecast breach is at least a warning

        return {
            "budget": {
                "id": str(budget['_id']),
                "name": budget['name'],
                "amount": budget['amount'],
                "scope": budget['scope'],
                "thresholds": budget['thresholds']
            },
            "status": status,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days_remaining": days_remaining
            },
            "metrics": {
                "actual_spend": round(actual_spend, 2),
                "forecasted_remaining": round(forecasted_remaining, 2),
                "total_projected": round(total_projected, 2),
                "pct_consumed": round(pct_consumed, 1),
                "pct_projected": round(pct_projected, 1),
                "remaining_amount": round(budget['amount'] - actual_spend, 2)
            },
            "alerts": alerts
        }

budget_service = BudgetService()
