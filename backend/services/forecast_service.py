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
import math

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

def _train_and_predict_prophet(df: pd.DataFrame, periods_ahead: int, freq: str = 'D') -> Tuple[List[Dict], float, str, float]:
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
    
    # Extract future part -- create a mask for future dates
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
    
    # Prophet confidence score: use mean interval width relative to prediction
    avg_width = (future_forecast['yhat_upper'] - future_forecast['yhat_lower']).mean()
    avg_pred = future_forecast['yhat'].mean()
    confidence = max(0, min(100, 100 - (avg_width / max(avg_pred, 1)) * 50))
        
    return forecast_data, round(total_predicted, 2), trend, round(confidence, 1)


def _add_month(date_obj: datetime) -> datetime:
    """Advance by one month while keeping day in range for target month."""
    new_month = date_obj.month + 1 if date_obj.month < 12 else 1
    new_year = date_obj.year + 1 if date_obj.month == 12 else date_obj.year
    import calendar
    last_day_of_next_month = calendar.monthrange(new_year, new_month)[1]
    target_day = min(date_obj.day, last_day_of_next_month)
    return date_obj.replace(year=new_year, month=new_month, day=target_day)


def _next_date(date_obj: datetime, freq: str) -> datetime:
    if freq == 'D':
        return date_obj + timedelta(days=1)
    if freq == 'W':
        return date_obj + timedelta(weeks=1)
    if freq == 'M':
        return _add_month(date_obj)
    return date_obj + timedelta(days=1)


def _build_time_features(dates: pd.Series, base_date: datetime, freq: str) -> np.ndarray:
    """Create trend + seasonal features for regression fallback."""
    t = np.array([(d - base_date).days for d in dates], dtype=float)
    t2 = t ** 2

    if freq == 'D':
        period = 7.0
    elif freq == 'W':
        period = 52.0
    else:
        period = 12.0

    sin1 = np.sin(2 * np.pi * t / period)
    cos1 = np.cos(2 * np.pi * t / period)
    sin2 = np.sin(4 * np.pi * t / period)
    cos2 = np.cos(4 * np.pi * t / period)

    return np.column_stack([t, t2, sin1, cos1, sin2, cos2])


def _train_and_predict_linear(df: pd.DataFrame, periods_ahead: int, freq: str = 'D') -> Tuple[List[Dict], float, str, float]:
    """Enhanced sklearn fallback with trend + seasonality features."""
    df = df.sort_values('date').copy()

    # Keep outliers from dominating trend in fallback mode.
    y_raw = df['cost'].astype(float).values
    if len(y_raw) >= 10:
        q1, q3 = np.percentile(y_raw, [25, 75])
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        y = np.clip(y_raw, lower, upper)
    else:
        y = y_raw

    base_date = df['date'].min()
    X = _build_time_features(df['date'], base_date, freq)

    model = LinearRegression()
    model.fit(X, y)

    y_pred_train = model.predict(X)
    residuals = y - y_pred_train
    residual_std = float(np.std(residuals)) if len(residuals) > 2 else 0.0

    # Confidence by MAPE-like score on non-zero points.
    non_zero_mask = np.abs(y) > 1e-6
    if np.any(non_zero_mask):
        mape = float(np.mean(np.abs((y[non_zero_mask] - y_pred_train[non_zero_mask]) / y[non_zero_mask])) * 100)
    else:
        mape = 100.0
    confidence_score = max(0.0, min(100.0, 100.0 - mape))

    last_date = df['date'].max()
    future_dates: List[datetime] = []
    current_date = last_date
    for _ in range(periods_ahead):
        current_date = _next_date(current_date, freq)
        future_dates.append(current_date)

    X_future = _build_time_features(pd.Series(future_dates), base_date, freq)
    future_costs = model.predict(X_future)

    forecast_data = []
    total_predicted = 0.0

    # Increase uncertainty with horizon but less aggressively than before.
    for idx, (date, pred_cost) in enumerate(zip(future_dates, future_costs), start=1):
        final_cost = float(max(0.0, pred_cost))
        total_predicted += final_cost

        horizon_scale = math.sqrt(1 + (idx / max(len(df), 1)))
        margin = 1.64 * residual_std * horizon_scale

        forecast_data.append({
            "date": date.strftime('%Y-%m-%d'),
            "predicted_cost": round(final_cost, 2),
            "lower_bound": round(max(0.0, final_cost - margin), 2),
            "upper_bound": round(final_cost + margin, 2)
        })

    trend = "stable"
    if len(forecast_data) >= 2:
        start = forecast_data[0]['predicted_cost']
        end = forecast_data[-1]['predicted_cost']
        if start > 0 and end > start * 1.05:
            trend = "increasing"
        elif start > 0 and end < start * 0.95:
            trend = "decreasing"

    return forecast_data, round(total_predicted, 2), trend, round(confidence_score, 1)


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
            forecast_data, total_pred, trend, confidence_score = _train_and_predict_prophet(df_resampled, periods_ahead, freq=freq_code)
            model_name = "Prophet (Meta)"
        else:
            forecast_data, total_pred, trend, confidence_score = _train_and_predict_linear(df_resampled, periods_ahead, freq=freq_code)
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
            "confidence_score": confidence_score,
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
                "period_label": f"Next {periods_ahead} Days",
                "confidence_score": global_forecast.get('confidence_score', 0),
                "current_daily_avg": round(current_daily_avg, 2),
                "predicted_daily_avg": round(predicted_daily_avg, 2)
            }
        }
        
    except Exception as e:
        return {"error": str(e)}
