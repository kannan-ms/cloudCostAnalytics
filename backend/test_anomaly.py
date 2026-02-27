
import sys
import os
import logging
from datetime import datetime
from bson import ObjectId

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Database, get_collection, Collections
from services.anomaly_detector import run_anomaly_detection_for_user
from services.file_parser import parse_csv
from schemas import User

# Setup logging
logging.basicConfig(level=logging.INFO)

def test_flow():
    print("--- Initialize DB ---")
    if not Database.initialize():
        print("Failed to connect to DB. Make sure MongoDB is running.")
        return

    # 1. Create a Dummy User
    users_col = get_collection(Collections.USERS)
    user = users_col.find_one({"email": "test@example.com"})
    
    if not user:
        print("Creating test user...")
        user_doc = User.create_document("Test User", "test@example.com", "hashed_pw")
        result = users_col.insert_one(user_doc)
        user_id = str(result.inserted_id)
    else:
        print("Test user found.")
        user_id = str(user['_id'])

    print(f"User ID: {user_id}")

    # 2. Check if we have cost data, if not, parse the dataset
    costs_col = get_collection(Collections.CLOUD_COSTS)
    count = costs_col.count_documents({"user_id": ObjectId(user_id)})
    print(f"Found {count} cost records for user.")

    if count < 100:
        print("Seeding data from azureDataset.csv...")
        dataset_path = os.path.join(os.path.dirname(__file__), 'dataSet', 'azureDataset.csv')
        if os.path.exists(dataset_path):
             # We need to manually parse because file_parser might expect a file object
             # Let's just read it and insert manually for this test if needed, 
             # OR use the parse_csv function if adaptable.
             # Actually, let's just insert some dummy processed data if the parser is complex.
             # But wait, the user has a csv. Let's try to use the csv.
             
             import pandas as pd
             df = pd.read_csv(dataset_path)
             # Map columns roughly to schema
             records = []
             # Taking a subset for speed
             df = df.head(1000) 
             
             for _, row in df.iterrows():
                try:
                    # Simple mapping based on known structure
                    date_val = pd.to_datetime(row['Date'])
                    records.append({
                        "user_id": ObjectId(user_id),
                        "cost": float(row['CostInBillingCurrency']),
                        "currency": "USD", # Assumption
                        "usage_start_date": date_val,
                        "usage_end_date": date_val,
                        "service_name": row['MeterCategory'],
                        "resource_id": row.get('ResourceName', 'unknown'),
                        "provider": "azure"
                    })
                except Exception as e:
                    continue
            
             if records:
                 costs_col.insert_many(records)
                 print(f"Inserted {len(records)} records.")
        else:
            print("Dataset file not found.")

    # 3. Run Anomaly Detection
    print("\n--- Running Anomaly Detection ---")
    success, result = run_anomaly_detection_for_user(user_id)
    
    if success:
        print("Success!")
        print(f"Total Detected: {result.get('total_detected', 0)}")
        print(f"Stored: {result.get('stored', 0)}")
        if result.get('anomalies'):
            print("Sample Anomaly:")
            print(result['anomalies'][0])
    else:
        print(f"Failed: {result}")

if __name__ == "__main__":
    test_flow()
