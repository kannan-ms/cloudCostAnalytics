"""
Anomaly Detection Service - ML-Based
Detects anomalies using Pre-Trained Isolation Forest models (Category-based).
"""

from datetime import datetime, timedelta
import os
import logging
from typing import Dict, List, Tuple, Optional
from bson import ObjectId
from database import get_collection, Collections
from schemas import Anomaly
from ml.category_mapper import SERVICE_CATEGORIES, get_category

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ML Imports
try:
    import pandas as pd
    import numpy as np
    import joblib
    from sklearn.ensemble import IsolationForest 
    ML_AVAILABLE = True
except ImportError as e:
    ML_AVAILABLE = False
    print(f"ML libraries missed: {e}")

# Base Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, 'models')

# SERVICE_CATEGORIES is imported from ml.category_mapper (single source of truth)

def delete_all_anomalies_for_user(user_id: str) -> bool:
    """Delete all anomalies for a user."""
    try:
        get_collection(Collections.ANOMALIES).delete_many({"user_id": ObjectId(user_id)})
        return True
    except Exception:
        return False


def detect_anomalies_ml(user_id: str) -> List[Dict]:
    """
    Detect anomalies using Pre-Trained Isolation Forest Models.
    Strategy:
    1. Get recent cost data for user.
    2. Group data by Service but assign Category.
    3. Load the corresponding Category Model (Compute, Storage, etc.).
    4. Predict anomalies.
    """
    if not ML_AVAILABLE:
        return []

    try:
        costs_collection = get_collection(Collections.CLOUD_COSTS)
        
        # Fetch ALL cost data for this user (Atlas M0 doesn't support $gte on dates reliably)
        raw_docs = list(costs_collection.find(
            {"user_id": ObjectId(user_id)},
            {"service_name": 1, "usage_start_date": 1, "cost": 1}
        ))
        if not raw_docs:
            return []
        
        # Build records and parse dates in Python
        records = []
        for doc in raw_docs:
            d_date = doc.get('usage_start_date')
            if isinstance(d_date, str):
                try:
                    d_date = datetime.fromisoformat(d_date.replace('Z', '+00:00'))
                except:
                    continue
            if d_date is None:
                continue
            records.append({
                'service': doc['service_name'],
                'date': d_date,
                'cost': float(doc.get('cost', 0))
            })
        
        if not records:
            return []

        df = pd.DataFrame(records)
        if not pd.api.types.is_datetime64_any_dtype(df['date']):
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df = df.dropna(subset=['date'])
        
        # Find latest date and filter to last 90 days in Python
        latest_date = df['date'].max()
        start_date = latest_date - timedelta(days=90)
        df = df[df['date'] >= start_date]
        
        # Group by service + date (aggregate duplicate entries)
        df = df.groupby(['service', 'date'], as_index=False)['cost'].sum()
        df = df.rename(columns={'cost': 'cost'})
        
        if df.empty:
            return []
        
        anomalies = []
        
        # Process per service, but use Category Model
        for service in df['service'].unique():
            # Get Category (uses shared mapping from cloud_cost_ingestion)
            category = get_category(service)
            safe_category = "".join([c if c.isalnum() else "_" for c in category])
            
            # Load Model & Scaler
            model_path = os.path.join(MODELS_DIR, f"{safe_category}_model.pkl")
            scaler_path = os.path.join(MODELS_DIR, f"{safe_category}_scaler.pkl")
            
            if not os.path.exists(model_path) or not os.path.exists(scaler_path):
                # logger.warning(f"No model found for category: {category} (Service: {service})")
                continue
            
            try:
                clf = joblib.load(model_path)
                scaler = joblib.load(scaler_path)
            except Exception as e:
                logger.error(f"Error loading model for {category}: {e}")
                continue

            # Prepare data
            sdf = df[df['service'] == service].sort_values('date').copy()
            
            # Feature Engineering (MUST MATCH TRAIN LOGIC)
            if len(sdf) < 8: continue # Min data for lags
            
            sdf['lag_1'] = sdf['cost'].shift(1)
            sdf['lag_7'] = sdf['cost'].shift(7)
            sdf['rolling_mean_7'] = sdf['cost'].shift(1).rolling(window=7).mean()
            sdf['rolling_std_7'] = sdf['cost'].shift(1).rolling(window=7).std()
            
            epsilon = 1e-5
            sdf['cost_ratio_1'] = sdf['cost'] / (sdf['lag_1'] + epsilon)
            sdf['cost_ratio_7'] = sdf['cost'] / (sdf['rolling_mean_7'] + epsilon)
            
            sdf['day_of_week'] = sdf['date'].dt.dayofweek
            sdf['is_weekend'] = sdf['day_of_week'].isin([5, 6]).astype(int)
            
            # Only predict on recent data (last 7 days) but keep enough history for features
            # Drop NaN from lags
            sdf_clean = sdf.dropna().copy()
            
            feature_cols = [
                'cost', 'lag_1', 'lag_7', 
                'rolling_mean_7', 'rolling_std_7', 
                'cost_ratio_1', 'cost_ratio_7', 'is_weekend'
            ]
            
            # Predict
            try:
                X = sdf_clean[feature_cols].values
                X_scaled = scaler.transform(X)
                
                sdf_clean['ano'] = clf.predict(X_scaled)
                sdf_clean['score'] = clf.decision_function(X_scaled)
                
                # ── Hybrid Rule: flag extreme ratio deviations the model may miss ──
                RATIO_SPIKE_THRESHOLD = 5.0    # cost > 5× the 7-day mean
                RATIO_DROP_THRESHOLD  = 0.15   # cost < 15% of the 7-day mean
                for idx in sdf_clean.index:
                    ratio = sdf_clean.at[idx, 'cost_ratio_7']
                    if sdf_clean.at[idx, 'ano'] == 1:  # model said normal
                        if ratio >= RATIO_SPIKE_THRESHOLD or ratio <= RATIO_DROP_THRESHOLD:
                            sdf_clean.at[idx, 'ano'] = -1  # override to anomaly
                
                # Check anomalies in the LAST 7 DAYS of the data (relative to latest date)
                cutoff_date = latest_date - timedelta(days=7)
                recent_anomalies = sdf_clean[(sdf_clean['ano'] == -1) & (sdf_clean['date'] >= cutoff_date)]
                
                for _, row in recent_anomalies.iterrows():
                    actual_cost = float(row['cost'])
                    expected_cost = float(row['rolling_mean_7'])
                    
                    # Logic check: Ignore tiny absolute costs
                    if actual_cost < 1.0: continue 

                    if expected_cost > 0:
                        deviation_pct = ((actual_cost - expected_cost) / expected_cost) * 100
                    else:
                        deviation_pct = 100.0 if actual_cost > 0 else 0.0
                    
                    # Skip insignificant deviations (noise)
                    MIN_DEVIATION_PCT = 25.0
                    if abs(deviation_pct) < MIN_DEVIATION_PCT:
                        continue
                    
                    direction = "Spike" if actual_cost > expected_cost else "Drop"
                    
                    anomalies.append({
                        "user_id": user_id,
                        "service_name": service,
                        "detected_value": actual_cost,
                        "expected_value": expected_cost,
                        "threshold": expected_cost,
                        "deviation_percentage": round(deviation_pct, 2),
                        "severity": "high" if abs(deviation_pct) > 100 else "medium",
                        "anomaly_score": float(row['score']),
                        "message": f"{direction} detected: based on {category} patterns ({abs(deviation_pct):.0f}% deviation)",
                        "detected_at": row['date'].to_pydatetime()
                    })

            except Exception as e:
                logger.error(f"Prediction error for {service}: {e}")
                continue
                
        return anomalies
    except Exception as e:
        print(f"ML Global error: {e}")
        return []


def run_anomaly_detection_for_user(user_id: str) -> Tuple[bool, any]:
    """Run ML anomaly detection."""
    try:
        ml_anomalies = detect_anomalies_ml(user_id)
        
        # Store results
        anomalies_collection = get_collection(Collections.ANOMALIES)
        
        # Deduplication: find the date range from detected anomalies
        if ml_anomalies:
            earliest_anomaly = min(a['detected_at'] for a in ml_anomalies)
            dedup_start = earliest_anomaly - timedelta(days=1)
        else:
            dedup_start = datetime.utcnow() - timedelta(days=30)
        
        existing = list(anomalies_collection.find({
            "user_id": ObjectId(user_id),
            "type": "ml_pattern",
            "detected_at": {"$gte": dedup_start}
        }, {"service_name": 1, "detected_at": 1}))
        
        # Create set for O(1) lookup: (service, date_string)
        existing_keys = set(
            (e['service_name'], e['detected_at'].strftime('%Y-%m-%d')) 
            for e in existing if 'detected_at' in e
        )
        
        new_docs = []
        for a in ml_anomalies:
            key = (a['service_name'], a['detected_at'].strftime('%Y-%m-%d'))
            
            if key not in existing_keys:
                doc = Anomaly.create_document(
                    user_id=user_id,
                    cost_id="0"*24,
                    service_name=a['service_name'],
                    detected_value=a['detected_value'],
                    expected_value=a['expected_value'],
                    threshold=a['threshold'],
                    severity=a['severity'],
                    message=a['message'],
                    detected_at=a['detected_at']
                )
                doc['type'] = 'ml_pattern'
                doc['recommendation'] = "Investigate anomalous spending pattern detected by ML."
                new_docs.append(doc)
                existing_keys.add(key)
        
        if new_docs:
            anomalies_collection.insert_many(new_docs)
            
        return True, {
            "total_detected": len(ml_anomalies),
            "stored": len(new_docs),
            "anomalies": ml_anomalies,
            "breakdown": {"ml_patterns": len(ml_anomalies)}
        }
    except Exception as e:
        return False, f"Error: {str(e)}"


def get_user_anomalies(user_id: str, status: Optional[str] = None, severity: Optional[str] = None, limit: int = 50) -> Tuple[bool, any]:
    """Get anomalies."""
    try:
        query = {"user_id": ObjectId(user_id)}
        if status: query["status"] = status
        if severity: query["severity"] = severity
        
        anomalies = list(get_collection(Collections.ANOMALIES).find(query).sort("detected_at", -1).limit(limit))
        
        # Serialize
        for a in anomalies:
            a['_id'] = str(a['_id'])
            a['user_id'] = str(a['user_id'])
            a['cost_id'] = str(a.get('cost_id', ''))
            a['detected_at'] = a['detected_at'].isoformat()
            if a.get('acknowledged_at'): a['acknowledged_at'] = a['acknowledged_at'].isoformat()
            if a.get('resolved_at'): a['resolved_at'] = a['resolved_at'].isoformat()
            
        return True, {"anomalies": anomalies, "count": len(anomalies)}
    except Exception as e:
        return False, f"Error: {str(e)}"


def update_anomaly_status(user_id: str, anomaly_id: str, status: str) -> Tuple[bool, any]:
    """Update status."""
    try:
        update_fields = {"status": status, "updated_at": datetime.utcnow()}
        if status == "acknowledged": update_fields["acknowledged_at"] = datetime.utcnow()
        elif status == "resolved": update_fields["resolved_at"] = datetime.utcnow()
        
        res = get_collection(Collections.ANOMALIES).update_one(
            {"_id": ObjectId(anomaly_id), "user_id": ObjectId(user_id)},
            {"$set": update_fields}
        )
        return (True, f"Updated to {status}") if res.modified_count else (False, "Not found")
    except Exception as e:
        return False, f"Error: {str(e)}"


def detect_anomalies_from_dataframe(ingested_df) -> List[Dict]:
    """
    Run anomaly detection directly on a normalized DataFrame produced by
    cloud_cost_ingestion.fetch_cloud_cost_data().

    Expected columns: date, category, cost, provider

    Returns a list of anomaly dicts (same format as detect_anomalies_ml).
    """
    if not ML_AVAILABLE:
        return []

    if ingested_df is None or ingested_df.empty:
        return []

    df = ingested_df.copy()

    # Ensure types
    if not pd.api.types.is_datetime64_any_dtype(df["date"]):
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["cost"] = pd.to_numeric(df["cost"], errors="coerce")
    df = df.dropna(subset=["date", "cost"])

    anomalies = []

    for category in df["category"].unique():
        safe_category = "".join([c if c.isalnum() else "_" for c in category])
        model_path = os.path.join(MODELS_DIR, f"{safe_category}_model.pkl")
        scaler_path = os.path.join(MODELS_DIR, f"{safe_category}_scaler.pkl")

        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            continue

        try:
            clf = joblib.load(model_path)
            scaler = joblib.load(scaler_path)
        except Exception as e:
            logger.error(f"Error loading model for {category}: {e}")
            continue

        sdf = df[df["category"] == category].sort_values("date").copy()
        if len(sdf) < 8:
            continue

        # Feature engineering (must match training logic)
        sdf["lag_1"] = sdf["cost"].shift(1)
        sdf["lag_7"] = sdf["cost"].shift(7)
        sdf["rolling_mean_7"] = sdf["cost"].shift(1).rolling(window=7).mean()
        sdf["rolling_std_7"] = sdf["cost"].shift(1).rolling(window=7).std()

        epsilon = 1e-5
        sdf["cost_ratio_1"] = sdf["cost"] / (sdf["lag_1"] + epsilon)
        sdf["cost_ratio_7"] = sdf["cost"] / (sdf["rolling_mean_7"] + epsilon)

        sdf["day_of_week"] = sdf["date"].dt.dayofweek
        sdf["is_weekend"] = sdf["day_of_week"].isin([5, 6]).astype(int)

        sdf_clean = sdf.dropna().copy()
        if sdf_clean.empty:
            continue

        feature_cols = [
            "cost", "lag_1", "lag_7",
            "rolling_mean_7", "rolling_std_7",
            "cost_ratio_1", "cost_ratio_7", "is_weekend",
        ]

        try:
            X = sdf_clean[feature_cols].values
            X_scaled = scaler.transform(X)

            sdf_clean["ano"] = clf.predict(X_scaled)
            sdf_clean["score"] = clf.decision_function(X_scaled)

            # ── Hybrid Rule: flag extreme ratio deviations the model may miss ──
            RATIO_SPIKE_THRESHOLD = 5.0    # cost > 5× the 7-day mean
            RATIO_DROP_THRESHOLD  = 0.15   # cost < 15% of the 7-day mean
            for idx in sdf_clean.index:
                ratio = sdf_clean.at[idx, "cost_ratio_7"]
                if sdf_clean.at[idx, "ano"] == 1:  # model said normal
                    if ratio >= RATIO_SPIKE_THRESHOLD or ratio <= RATIO_DROP_THRESHOLD:
                        sdf_clean.at[idx, "ano"] = -1  # override to anomaly

            cutoff_date = df["date"].max() - timedelta(days=7)
            recent_anomalies = sdf_clean[
                (sdf_clean["ano"] == -1) & (sdf_clean["date"] >= cutoff_date)
            ]

            for _, row in recent_anomalies.iterrows():
                actual_cost = float(row["cost"])
                expected_cost = float(row["rolling_mean_7"])
                if actual_cost < 1.0:
                    continue

                if expected_cost > 0:
                    deviation_pct = ((actual_cost - expected_cost) / expected_cost) * 100
                else:
                    deviation_pct = 100.0 if actual_cost > 0 else 0.0

                # Skip insignificant deviations (noise)
                MIN_DEVIATION_PCT = 25.0
                if abs(deviation_pct) < MIN_DEVIATION_PCT:
                    continue

                direction = "Spike" if actual_cost > expected_cost else "Drop"
                provider_val = row.get("provider", "unknown") if "provider" in sdf_clean.columns else "unknown"

                anomalies.append({
                    "service_name": category,
                    "detected_value": actual_cost,
                    "expected_value": expected_cost,
                    "threshold": expected_cost,
                    "deviation_percentage": round(deviation_pct, 2),
                    "severity": "high" if abs(deviation_pct) > 100 else "medium",
                    "anomaly_score": float(row["score"]),
                    "message": (
                        f"{direction} detected in {category} ({provider_val}): "
                        f"{abs(deviation_pct):.0f}% deviation"
                    ),
                    "detected_at": row["date"].to_pydatetime(),
                })
        except Exception as e:
            logger.error(f"Prediction error for {category}: {e}")
            continue

    return anomalies


# Alias
run_anomaly_detection = run_anomaly_detection_for_user
