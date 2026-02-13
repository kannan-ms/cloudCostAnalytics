"""
Cost Forecasting Service - Prophet Based
Forecasts future cloud costs using Facebook's Prophet model.
Handles seasonality and trends better than Linear Regression.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
from bson import ObjectId
from database import get_collection, Collections
from services import insight_service
import pandas as pd
import numpy as np
import logging

# Configure logging to suppress Prophet noise
logging.getLogger('cmdstanpy').setLevel(logging.WARNING)
logging.getLogger('prophet').setLevel(logging.WARNING)

# ML Imports
try:
    from prophet import Prophet
    ML_BACKEND = "prophet"
except ImportError:
    try:
        from sklearn.linear_model import LinearRegression
        ML_BACKEND = "sklearn"
    except ImportError:
        ML_BACKEND = None

def _train_and_predict_prophet(df: pd.DataFrame, periods_ahead: int, freq: str = 'D') -> Tuple[List[Dict], float, str]:
    """Helper to train Prophet model and predict."""
    # Rename for Prophet
    df_prophet = df.rename(columns={'date': 'ds', 'cost': 'y'})
    
    # Initialize model
    # Enable daily seasonality if data is daily
    model = Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=False,
        changepoint_prior_scale=0.05
    )
    
    if freq == 'D':
        model.add_seasonality(name='monthly', period=30.5, fourier_order=5)

    model.fit(df_prophet)
    
    # Create future dataframe
    future = model.make_future_dataframe(periods=periods_ahead, freq=freq)
    
    # Predict
    forecast = model.predict(future)
    
    # Extract future part
    # create a mask for future dates
    last_date = df['date'].max()
    future_forecast = forecast[forecast['ds'] > last_date].copy()
    
    forecast_data = []
    total_predicted = 0
    
    for _, row in future_forecast.iterrows():
        val = max(0, row['yhat']) # No negative costs
        total_predicted += val
        
        forecast_data.append({
            "date": row['ds'].strftime('%Y-%m-%d'),
            "predicted_cost": round(val, 2),
            "lower_bound": round(max(0, row['yhat_lower']), 2),
            "upper_bound": round(max(0, row['yhat_upper']), 2)
        })
        
    # Trend analysis from the component
    trend = "stable"
    # Compare start and end of forecast trend component
    trend_start = future_forecast.iloc[0]['trend']
    trend_end = future_forecast.iloc[-1]['trend']
    
    if trend_end > trend_start * 1.05: trend = "increasing"
    elif trend_end < trend_start * 0.95: trend = "decreasing"
        
    return forecast_data, round(total_predicted, 2), trend


def _train_and_predict_linear(df: pd.DataFrame, periods_ahead: int, freq: str = 'D') -> Tuple[List[Dict], float, str]:
    """Fallback to Linear Regression if Prophet is missing."""
    # Ensure numerical dates for regression
    if 'date_ordinal' not in df.columns:
        df['date_ordinal'] = df['date'].apply(lambda x: x.toordinal())
        
    X = df[['date_ordinal']]
    y = df['cost']
    
    model = LinearRegression()
    model.fit(X, y)
    
    last_date = df['date'].max()
    future_dates = []
    future_ordinals = []
    
    current_date = last_date
    for i in range(periods_ahead):
        if freq == 'D':
            current_date += timedelta(days=1)
        elif freq == 'W':
            current_date += timedelta(weeks=1)
        elif freq == 'M':
            # Simple month add
            new_month = current_date.month + 1 if current_date.month < 12 else 1
            new_year = current_date.year + 1 if current_date.month == 12 else current_date.year
            import calendar
            last_day_of_next_month = calendar.monthrange(new_year, new_month)[1]
            target_day = min(current_date.day, last_day_of_next_month)
            current_date = current_date.replace(year=new_year, month=new_month, day=target_day)
            
        future_dates.append(current_date)
        future_ordinals.append([current_date.toordinal()])
        
    future_costs = model.predict(future_ordinals)
    
    forecast_data = []
    total_predicted = 0
    
    for date, cost in zip(future_dates, future_costs):
        final_cost = max(0, cost)
        total_predicted += final_cost
        
        forecast_data.append({
            "date": date.strftime('%Y-%m-%d'),
            "predicted_cost": round(final_cost, 2)
        })
        
    trend = "stable"
    if hasattr(model, 'coef_'):
        slope = model.coef_[0]
        if slope > 0.1: trend = "increasing"
        elif slope < -0.1: trend = "decreasing"
        
    return forecast_data, round(total_predicted, 2), trend


def predict_future_costs(
    user_id: str, 
    periods_ahead: int = 30, 
    granularity: str = 'daily', 
    filters: Optional[Dict[str, Any]] = None
) -> Dict:
    """
    Predict future costs using Prophet (or Linear Regression fallback).
    """
    if not ML_BACKEND:
        return {"error": "No ML libraries installed (Prophet or Scikit-learn needed)"}

    try:
        costs_collection = get_collection(Collections.CLOUD_COSTS)
        
        match_query = {"user_id": ObjectId(user_id)}
        
        if filters:
            if filters.get('service'):
                match_query["service_name"] = filters['service']
            if filters.get('region'):
                match_query["region"] = filters['region']
            if filters.get('environment'):
                 match_query["tags.environment"] = filters['environment']
            if filters.get('resource_group'):
                match_query["tags.resource_group"] = filters['resource_group']

        pipeline = [
            {"$match": match_query},
            {
                "$group": {
                    "_id": {"date": "$usage_start_date"},
                    "daily_cost": {"$sum": "$cost"}
                }
            },
            {"$sort": {"_id.date": 1}}
        ]
        
        data = list(costs_collection.aggregate(pipeline))
        if not data:
            return {"error": "Not enough data to forecast"}

        records = []
        for d in data:
            d_date = d['_id']['date']
            if isinstance(d_date, str):
                try: d_date = datetime.fromisoformat(d_date.replace('Z', '+00:00'))
                except: pass
            
            if not isinstance(d_date, datetime):
                continue
                
            records.append({'date': d_date, 'cost': d['daily_cost']})

        if not records:
             return {"error": "No valid date records found"}

        df = pd.DataFrame(records)
        df['date'] = pd.to_datetime(df['date'])
        df.set_index('date', inplace=True)
        
        freq_map = {'daily': 'D', 'weekly': 'W', 'monthly': 'M'}
        freq_code = freq_map.get(granularity, 'D')
        
        df_resampled = df.resample(freq_code).sum().reset_index()
        df_resampled['cost'] = df_resampled['cost'].fillna(0)
        
        # Exclude the last period (incomplete day/week) to avoid "drop-off" bias
        # Especially important for daily granularity where "today" is partial.
        if len(df_resampled) > 1:
            df_resampled = df_resampled.iloc[:-1]

        # Prophet needs at least 2 points, but better more
        if len(df_resampled) < 2:
             return {"error": f"Not enough completed {granularity} data points (needs 2+)"}

        # Choose Backend
        if ML_BACKEND == "prophet":
            forecast_data, total_pred, trend = _train_and_predict_prophet(df_resampled, periods_ahead, freq=freq_code)
            model_name = "Prophet (Meta)"
        else:
            forecast_data, total_pred, trend = _train_and_predict_linear(df_resampled, periods_ahead, freq=freq_code)
            model_name = "Linear Regression (Fallback)"
        
        history_data = []
        for _, row in df_resampled.iterrows():
            history_data.append({
                "date": row['date'].strftime('%Y-%m-%d'),
                "actual_cost": round(row['cost'], 2)
            })
            
        return {
            "success": True,
            "forecast": forecast_data,
            "history": history_data,
            "total_predicted_cost": total_pred,
            "trend": trend,
            "granularity": granularity,
            "model_used": model_name
        }

    except Exception as e:
        print(f"Forecasting error: {e}")
        return {"error": str(e)}


def get_detailed_forecast(
    user_id: str, 
    periods_ahead: int = 30,
    granularity: str = 'daily',
    filters: Optional[Dict] = None
) -> Dict:
    """Generate detailed forecast with breakdowns and insights."""
    if not ML_BACKEND:
        return {"error": "No ML libraries installed"}
        
    try:
        global_forecast = predict_future_costs(user_id, periods_ahead, granularity, filters)
        
        costs_collection = get_collection(Collections.CLOUD_COSTS)
        match_query = {"user_id": ObjectId(user_id)}
        
        if filters:
             if filters.get('region'): match_query["region"] = filters['region']
             if filters.get('environment'): match_query["tags.environment"] = filters['environment']
             if filters.get('resource_group'): match_query["tags.resource_group"] = filters['resource_group']
             if filters.get('service'): match_query["service_name"] = filters['service']

        pipeline = [
            {"$match": match_query},
            {"$group": {"_id": "$service_name", "total": {"$sum": "$cost"}}},
            {"$sort": {"total": -1}},
            {"$limit": 5}
        ]
        
        top_services = list(costs_collection.aggregate(pipeline))
        
        service_forecasts = []
        for svc in top_services:
            name = svc['_id']
            svc_filters = filters.copy() if filters else {}
            svc_filters['service'] = name
            
            res = predict_future_costs(user_id, periods_ahead, granularity, svc_filters)
            
            if res.get('success'):
                service_forecasts.append({
                    "service_name": name,
                    "total_predicted_cost": res['total_predicted_cost'],
                    "trend": res['trend'],
                    "forecast_points": res['forecast'],
                    "history_points": res['history']
                })

        insights = insight_service.generate_insights(global_forecast, service_forecasts)

        # Calculate Growth & Risks
        current_daily_avg = 0
        if len(global_forecast['history']) > 0:
             current_daily_avg = sum(d['actual_cost'] for d in global_forecast['history']) / len(global_forecast['history'])

        predicted_daily_avg = global_forecast['total_predicted_cost'] / periods_ahead
        
        growth_pct = 0
        if current_daily_avg > 0:
            growth_pct = ((predicted_daily_avg - current_daily_avg) / current_daily_avg) * 100
        
        # Risk Logic
        risks = []
        status_badge = "Stable"
        
        if growth_pct > 20:
            status_badge = "Critical"
            risks.append(f"Significant cost increase of {growth_pct:.1f}% expected")
        elif growth_pct > 5:
            status_badge = "Warning"
            risks.append(f"Moderate cost increase of {growth_pct:.1f}% expected")
        elif growth_pct < -5:
            status_badge = "Good"
            risks.append(f"Cost saving of {abs(growth_pct):.1f}% expected")
            
        # Top Movers Logic
        for service in service_forecasts:
            svc_growth = 0
            if service['history_points']:
                 svc_curr = sum(h['actual_cost'] for h in service['history_points']) / len(service['history_points'])
                 svc_pred = service['total_predicted_cost'] / periods_ahead
                 if svc_curr > 0:
                     svc_growth = ((svc_pred - svc_curr) / svc_curr) * 100
            
            service['growth_pct'] = round(svc_growth, 1)
            
            # Action Items based on growth
            if svc_growth > 15:
                service['action_item'] = "Review resource allocation and scaling policies."
                service['status'] = "Increasing"
            elif svc_growth < -5:
                service['action_item'] = "Validate if meaningful services were turned off."
                service['status'] = "Decreasing"
            else:
                service['action_item'] = "Monitor for unexpected spikes."
                service['status'] = "Stable"

        return {
            "success": True,
            "global_forecast": global_forecast,
            "top_services_forecast": service_forecasts,
            "insights": insights,
            "executive_summary": {
                "total_predicted_cost": global_forecast['total_predicted_cost'],
                "growth_percentage": round(growth_pct, 1),
                "status_badge": status_badge,
                "risks": risks,
                "period_label": f"Next {periods_ahead} Days"
            }
        }
        
    except Exception as e:
        return {"error": str(e)}