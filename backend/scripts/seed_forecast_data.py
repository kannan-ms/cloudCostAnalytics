import sys
import os
import pandas as pd
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from config import Config

def seed_data(filepath, user_email='hari@gmail.com'):
    client = MongoClient(Config.MONGODB_URI)
    db = client[Config.DATABASE_NAME]
    
    # Get User
    users = db.users
    user = users.find_one({"email": user_email})
    if not user:
        print(f"User {user_email} not found. Creating...")
        user_id = users.insert_one({
            "email": user_email, 
            "password": "hashed_password_placeholder", 
            "name": "Hari"
        }).inserted_id
    else:
        user_id = user['_id']
        print(f"Found user {user_email} with ID {user_id}")

    # Read CSV
    try:
        df = pd.read_csv(filepath)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    # Valid service columns (exclude 'Service', 'Total costs($)')
    service_cols = [c for c in df.columns if c not in ['Service', 'Total costs($)', 'Refund($)']]
    
    records = []
    
    print(f"Processing {len(df)} rows...")
    for _, row in df.iterrows():
        date_str = str(row['Service']).strip()
        # skip metadata rows like "Service total"
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            continue
            
        for svc in service_cols:
            raw_cost = row[svc]
            try:
                # Handle possible string formatting or empty
                if pd.isna(raw_cost) or raw_cost == '':
                    cost = 0.0
                else:
                    cost = float(str(raw_cost).replace(',', ''))
                
                if cost > 0:
                    clean_svc_name = svc.replace('($)', '').strip()
                    records.append({
                        "user_id": user_id,
                        "service_name": clean_svc_name,
                        "cost": cost,
                        "currency": "USD",
                        "usage_start_date": date_obj,
                        "usage_end_date": date_obj, # Daily
                        "provider": "AWS",
                        "resource_id": "aggregated_import"
                    })
            except Exception as e:
                pass
                
    if records:
        # Clear existing data for strict testing? Or append?
        # Let's append but maybe warn.
        # actually, let's clear to avoid duplicates for clean forecast
        # db.cloud_costs.delete_many({"user_id": user_id, "resource_id": "aggregated_import"})
        
        result = db.cloud_costs.insert_many(records)
        print(f"Successfully inserted {len(result.inserted_ids)} records for {user_email}")
    else:
        print("No valid records found to insert.")

if __name__ == "__main__":
    # Use the path provided by the user
    csv_path = r"c:\Users\Asus\Documents\AWS data real.csv"
    if os.path.exists(csv_path):
        seed_data(csv_path)
    else:
        print(f"File not found: {csv_path}")
