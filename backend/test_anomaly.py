
import sys
import os
import logging
from pathlib import Path
from bson import ObjectId

try:
    import pandas as pd
except ImportError:
    pd = None

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Database, get_collection, Collections
from services.anomaly_detector import run_anomaly_detection_for_user
from schemas import User

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

def test_flow():
    logger.info("--- Initialize DB ---")
    if not Database.initialize():
        logger.error("Failed to connect to DB. Make sure MongoDB is running.")
        return

    # 1. Create a Dummy User
    users_col = get_collection(Collections.USERS)
    user = users_col.find_one({"email": "test@example.com"})

    if not user:
        logger.info("Creating test user...")
        user_doc = User.create_document("Test User", "test@example.com", "hashed_pw")
        result = users_col.insert_one(user_doc)
        user_id = str(result.inserted_id)
    else:
        logger.info("Test user found.")
        user_id = str(user['_id'])

    user_id_obj = ObjectId(user_id)

    logger.info("User ID: %s", user_id)

    # 2. Check if we have cost data, if not, parse the dataset
    costs_col = get_collection(Collections.CLOUD_COSTS)
    count = costs_col.count_documents({"user_id": user_id_obj})
    logger.info("Found %s cost records for user.", count)

    if count < 100:
        logger.info("Seeding data from azureDataset.csv...")
        dataset_path = Path(__file__).resolve().parent / "dataSet" / "azureDataset.csv"

        if not pd:
            logger.error("pandas is required to seed data; install it or ensure it's on the PYTHONPATH.")
            return

        if os.path.exists(dataset_path):
            df = pd.read_csv(dataset_path)
            # Map columns roughly to schema
            records = []
            # Taking a subset for speed
            df = df.head(1000)

            for idx, row in df.iterrows():
                try:
                    # Simple mapping based on known structure
                    date_val = pd.to_datetime(row['Date'])
                    records.append({
                        "user_id": user_id_obj,
                        "cost": float(row['CostInBillingCurrency']),
                        "currency": "USD",  # Assumption
                        "usage_start_date": date_val,
                        "usage_end_date": date_val,
                        "service_name": row['MeterCategory'],
                        "resource_id": row.get('ResourceName', 'unknown'),
                        "provider": "azure"
                    })
                except (KeyError, TypeError, ValueError) as exc:
                    logger.debug("Skipping row %s: %s", idx, exc)

            if records:
                costs_col.insert_many(records)
                logger.info("Inserted %s records.", len(records))
        else:
            logger.warning("Dataset file not found at %s", dataset_path)

    # 3. Run Anomaly Detection
    logger.info("--- Running Anomaly Detection ---")
    success, result = run_anomaly_detection_for_user(user_id)
    
    if success:
        logger.info("Success!")
        logger.info("Total Detected: %s", result.get('total_detected', 0))
        logger.info("Stored: %s", result.get('stored', 0))
        if result.get('anomalies'):
            logger.info("Sample Anomaly: %s", result['anomalies'][0])
    else:
        logger.error("Failed: %s", result)

if __name__ == "__main__":
    test_flow()
