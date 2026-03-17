"""
Recommendation Service
Generates actionable cost optimization recommendations based on:
- Budget overruns
- Detected anomalies
- Forecast trends
- Cost distribution by service
"""

from datetime import datetime, timedelta
import calendar
from typing import Dict, List, Optional
from bson import ObjectId
from database import get_collection, Collections
from services import forecast_service, budget_service, cost_service

class RecommendationService:
    
    @staticmethod
    def generate_recommendations(user_id: str) -> List[Dict]:
        """
        Generate a prioritized list of cost optimization recommendations.
        """
        recommendations = []
        
        # 1. Budget Overrun Recommendations
        budget_recs = RecommendationService._check_budget_overruns(user_id)
        recommendations.extend(budget_recs)
        
        # 2. Anomaly-based Recommendations
        anomaly_recs = RecommendationService._check_recent_anomalies(user_id)
        recommendations.extend(anomaly_recs)
        
        # 3. Forecast Trend Recommendations
        forecast_recs = RecommendationService._check_forecast_trends(user_id)
        recommendations.extend(forecast_recs)
        
        # 4. Cost Distribution Recommendations
        distrib_recs = RecommendationService._check_cost_distribution(user_id)
        recommendations.extend(distrib_recs)
        
        # Sort by priority (HIGH > MEDIUM > LOW) and by recency/impact
        priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        recommendations.sort(key=lambda x: priority_order.get(x.get("priority", "LOW"), 3))
        
        return recommendations
    
    @staticmethod
    def _check_budget_overruns(user_id: str) -> List[Dict]:
        """
        Check for budgets that have been exceeded.
        Priority: HIGH if > 100%, MEDIUM if 80-100%
        """
        recs = []
        budgets_collection = get_collection(Collections.BUDGETS)
        budgets = list(budgets_collection.find({"user_id": ObjectId(user_id)}))
        
        now = datetime.utcnow()
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        _, last_day = calendar.monthrange(now.year, now.month)
        end_date = now.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)
        
        for budget in budgets:
            try:
                # Track the budget to get actual spend
                tracked = budget_service.BudgetService.track_budget(user_id, str(budget['_id']))
                
                if 'error' in tracked:
                    continue
                
                actual_spend = tracked.get('actual_spend', 0)
                budget_amount = budget.get('amount', 0)
                pct_consumed = (actual_spend / budget_amount * 100) if budget_amount > 0 else 0
                
                # Generate recommendation if budget is approaching or exceeded
                if pct_consumed >= 80:
                    priority = "HIGH" if pct_consumed >= 100 else "MEDIUM"
                    
                    scope = budget.get('scope', {})
                    scope_text = ""
                    if scope.get('type') == 'service':
                        scope_text = f" for {scope.get('value')}"
                    elif scope.get('type') == 'resource_group':
                        scope_text = f" for resource group {scope.get('value')}"
                    
                    overspend = actual_spend - budget_amount if pct_consumed >= 100 else 0
                    
                    rec = {
                        "priority": priority,
                        "title": f"Budget {budget['name']} at {pct_consumed:.0f}%",
                        "description": f"Monthly budget has reached {pct_consumed:.1f}% of limit${scope_text}. Current spend: ${actual_spend:.2f} of ${budget_amount:.2f}.",
                        "impact": f"${overspend:.2f} overspend" if overspend > 0 else f"${budget_amount - actual_spend:.2f} remaining",
                        "action": "view_budgets"
                    }
                    recs.append(rec)
            except Exception as e:
                continue
        
        return recs
    
    @staticmethod
    def _check_recent_anomalies(user_id: str) -> List[Dict]:
        """
        Check for recent anomalies (cost spikes).
        Priority: HIGH if multiple anomalies, MEDIUM if single
        """
        recs = []
        anomalies_collection = get_collection(Collections.ANOMALIES)
        
        # Get anomalies from the last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_anomalies = list(anomalies_collection.find({
            "user_id": ObjectId(user_id),
            "detected_at": {"$gte": thirty_days_ago}
        }))
        
        if recent_anomalies:
            num_anomalies = len(recent_anomalies)
            total_spike_value = sum(a.get('detected_value', 0) - a.get('expected_value', 0) for a in recent_anomalies)
            
            priority = "HIGH" if num_anomalies >= 3 else "MEDIUM"
            
            # Group by service if possible
            services = set(a.get('service_name', 'Unknown') for a in recent_anomalies)
            service_text = ", ".join(list(services)[:2])
            
            rec = {
                "priority": priority,
                "title": f"{num_anomalies} cost spikes detected",
                "description": f"Unusual cost increases detected in {service_text}. Review usage patterns and configurations.",
                "impact": f"~${total_spike_value:.2f} unexplained increase",
                "action": "view_anomalies"
            }
            recs.append(rec)
        
        return recs
    
    @staticmethod
    def _check_forecast_trends(user_id: str) -> List[Dict]:
        """
        Check if forecast indicates higher spending next month.
        Priority: MEDIUM if 10-20% increase, HIGH if >20%
        """
        recs = []
        
        try:
            # Get current month costs
            now = datetime.utcnow()
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            _, last_day = calendar.monthrange(now.year, now.month)
            end_date = now.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)
            
            costs_collection = get_collection(Collections.CLOUD_COSTS)
            pipeline = [
                {
                    "$match": {
                        "user_id": ObjectId(user_id),
                        "usage_start_date": {"$gte": start_date, "$lte": end_date}
                    }
                },
                {"$group": {"_id": None, "total": {"$sum": "$cost"}}}
            ]
            
            result = list(costs_collection.aggregate(pipeline))
            current_month_cost = result[0]['total'] if result else 0
            
            if current_month_cost > 0:
                # Get forecast for next 30 days
                forecast_result = forecast_service.predict_future_costs(
                    user_id,
                    periods_ahead=30,
                    granularity='daily'
                )
                
                if forecast_result.get('success'):
                    forecasted_cost = forecast_result.get('total_predicted_cost', 0)
                    increase_pct = ((forecasted_cost - current_month_cost) / current_month_cost) * 100 if current_month_cost > 0 else 0
                    
                    if increase_pct > 10:
                        priority = "HIGH" if increase_pct > 20 else "MEDIUM"
                        increase_amount = forecasted_cost - current_month_cost
                        
                        rec = {
                            "priority": priority,
                            "title": f"Forecast: +{increase_pct:.0f}% spending next month",
                            "description": f"Based on current usage trends, costs are projected to increase to ${forecasted_cost:.2f} next month.",
                            "impact": f"+${increase_amount:.2f} projected increase",
                            "action": "view_forecasts"
                        }
                        recs.append(rec)
        except Exception as e:
            pass
        
        return recs
    
    @staticmethod
    def _check_cost_distribution(user_id: str) -> List[Dict]:
        """
        Check if one service dominates spending (>50%).
        Priority: MEDIUM
        """
        recs = []
        
        try:
            # Get costs by service for current month
            now = datetime.utcnow()
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            _, last_day = calendar.monthrange(now.year, now.month)
            end_date = now.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)
            
            costs_collection = get_collection(Collections.CLOUD_COSTS)
            pipeline = [
                {
                    "$match": {
                        "user_id": ObjectId(user_id),
                        "usage_start_date": {"$gte": start_date, "$lte": end_date}
                    }
                },
                {
                    "$group": {
                        "_id": "$service_name",
                        "total": {"$sum": "$cost"}
                    }
                },
                {"$sort": {"total": -1}}
            ]
            
            result = list(costs_collection.aggregate(pipeline))
            
            if result:
                top_service = result[0]
                total_cost = sum(item['total'] for item in result)
                
                if total_cost > 0:
                    top_service_pct = (top_service['total'] / total_cost) * 100
                    
                    if top_service_pct > 50:
                        rec = {
                            "priority": "MEDIUM",
                            "title": f"{top_service['_id']} drives {top_service_pct:.0f}% of costs",
                            "description": f"{top_service['_id']} is your dominant cost driver this month. Consider reviewing instances, configurations, and usage patterns for optimization opportunities.",
                            "impact": f"${top_service['total']:.2f} of ${total_cost:.2f}",
                            "action": "view_service_analysis"
                        }
                        recs.append(rec)
        except Exception as e:
            pass
        
        return recs
