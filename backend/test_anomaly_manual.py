
import sys
import os
import logging
from datetime import datetime, timedelta
from bson import ObjectId
import secrets

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Database, get_collection, Collections
from services.anomaly_detector import detect_anomalies_ml

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_anomaly_pipeline():
    print("--- 1. Initialize DB ---")
    if not Database.initialize():
        print("Failed to connect to DB.")
        return

    # Create a unique test user
    user_id = ObjectId()
    print(f"Test User ID: {user_id}")

    # --- 2. Inject Data (Synthetic) ---
    # We need enough data for the model (lags require 7-14 days history)
    # Strategy: 
    # - Service: 'Virtual Machines' -> Maps to 'Compute' category
    # - Days 1-29: $10.00 (Normal)
    # - Day 30: $500.00 (Anomaly!)
    
    costs_col = get_collection(Collections.CLOUD_COSTS)
    
    records = []
    base_date = datetime.utcnow() - timedelta(days=30)
    
    print("--- 2. Injecting 30 days of data ---")
    for i in range(30):
        current_date = base_date + timedelta(days=i)
        
        # Normal cost is $10, Spike on last day is $500
        if i == 29:
            cost = 500.0
            print(f"Injecting Spike on {current_date.strftime('%Y-%m-%d')}: ${cost}")
        else:
            # Add tiny random noise so it's not a flat line (models hate flat lines)
            cost = 10.0 + (secrets.randbelow(100) / 100.0) 
        
        records.append({
            "user_id": user_id,
            "cost": cost,
            "currency": "USD",
            "usage_start_date": current_date,
            "usage_end_date": current_date,
            "service_name": "Virtual Machines", # Should trigger Compute model
            "resource_id": "test-vm-resources",
            "provider": "azure"
        })
        
    if records:
        costs_col.insert_many(records)
        print(f"Inserted {len(records)} records.")

    # --- 3. Run Detection ---
    print("\n--- 3. Running Detection ---")
    try:
        anomalies = detect_anomalies_ml(str(user_id))
        
        print(f"\nResult: Found {len(anomalies)} anomalies.")
        
        if len(anomalies) > 0:
            print("\n✅ SUCCESS: Anomaly Detected!")
            for a in anomalies:
                print(f" - Service: {a['service_name']}")
                print(f" - Date: {a['detected_at']}")
                print(f" - Value: ${a['detected_value']} (Expected: ${a['expected_value']:.2f})")
                print(f" - Severity: {a['severity']}")
                print(f" - Message: {a['message']}")
        else:
            print("\n❌ FAILURE: No anomalies detected (Model might be too lenient or data issue).")
            
    except Exception as e:
        print(f"Error during detection: {e}")
        import traceback
        traceback.print_exc()

    # --- 4. Cleanup ---
    print("\n--- 4. Cleanup ---")
    costs_col.delete_many({"user_id": user_id})
    print("Test data deleted.")

if __name__ == "__main__":
    test_anomaly_pipeline()
