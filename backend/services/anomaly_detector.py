"""
Anomaly Detection Service - ML-Based
Detects anomalies using Isolation Forest (ML) only.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from bson import ObjectId
from database import get_collection, Collections
from models import Anomaly

# ML Imports
try:
    import pandas as pd
    import numpy as np
    from sklearn.ensemble import IsolationForest 
    ML_AVAILABLE = True
except ImportError as e:
    ML_AVAILABLE = False
    print(f"ML libraries missed: {e}")


def delete_all_anomalies_for_user(user_id: str) -> bool:
    """Delete all anomalies for a user."""
    try:
        get_collection(Collections.ANOMALIES).delete_many({"user_id": ObjectId(user_id)})
        return True
    except Exception:
        return False


def detect_anomalies_ml(user_id: str) -> List[Dict]:
    """Detect anomalies using Isolation Forest on daily cost data."""
    if not ML_AVAILABLE:
        return []

    try:
        costs_collection = get_collection(Collections.CLOUD_COSTS)
        pipeline = [
            {"$match": {"user_id": ObjectId(user_id)}},
            {
                "$group": {
                    "_id": {"service": "$service_name", "date": "$usage_start_date"},
                    "daily_cost": {"$sum": "$cost"}
                }
            },
            {"$sort": {"_id.date": 1}}
        ]
        
        data = list(costs_collection.aggregate(pipeline))
        if not data:
            return []

        records = []
        for d in data:
            d_date = d['_id']['date']
            # Convert string dates if necessary
            if isinstance(d_date, str):
                try: d_date = datetime.fromisoformat(d_date.replace('Z', '+00:00'))
                except: pass
            
            records.append({
                'service': d['_id']['service'],
                'date': d_date,
                'cost': d['daily_cost']
            })

        df = pd.DataFrame(records)
        # Ensure date datetime
        if not pd.api.types.is_datetime64_any_dtype(df['date']):
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
        
        df = df.dropna(subset=['date'])
        
        anomalies = []
        
        for service in df['service'].unique():
            sdf = df[df['service'] == service].sort_values('date').copy()
            if len(sdf) < 5: continue
            
            # Feature engineering
            sdf['dow'] = sdf['date'].dt.dayofweek
            sdf['is_weekend'] = sdf['dow'].isin([5, 6]).astype(int)
            
            X = sdf[['cost', 'is_weekend']].values
            
            try:
                # ISOLATION FOREST IMPLEMENTATION IS In Implemented
                clf = IsolationForest(contamination=0.05, random_state=42)
                sdf['ano'] = clf.fit_predict(X)
                sdf['score'] = clf.decision_function(X) # negative is anomalous
                
                # Check recent period (last 7 days of data) For week based
                max_date = sdf['date'].max()
                recent_window = max_date - timedelta(days=7)
                recent_anomalies = sdf[(sdf['ano'] == -1) & (sdf['date'] >= recent_window)]
                
                for _, row in recent_anomalies.iterrows():
                    median_cost = sdf['cost'].median()
                    # Skip if cost is lower than median (we care about spikes)
                    if row['cost'] <= median_cost: continue
                    
                    anomalies.append({
                        "user_id": user_id,
                        "service_name": service,
                        "detected_value": float(row['cost']),
                        "expected_value": float(median_cost),
                        "threshold": float(median_cost * 1.5),
                        "severity": "high" if row['score'] < -0.2 else "medium",
                        "message": f"Isolation Forest Anomaly: Cost ${row['cost']:.2f} (score: {row['score']:.2f})",
                        "detected_at": row['date'].to_pydatetime()
                    })
            except Exception as e:
                # print(f"ML Processing error for {service}: {e}")
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
        
        # Deduplication: get recent ML anomalies
        start_date = datetime.utcnow() - timedelta(days=7)
        existing = list(anomalies_collection.find({
            "user_id": ObjectId(user_id),
            "type": "ml_pattern",
            "detected_at": {"$gte": start_date}
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

# Alias
run_anomaly_detection = run_anomaly_detection_for_user
