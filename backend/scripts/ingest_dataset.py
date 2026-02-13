"""
Script to ingest the Azure dataset into MongoDB for ML training.
Run this from the backend directory: python -m scripts.ingest_dataset
"""

import sys
import os
import pandas as pd
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_collection, Collections
from config import Config

def ingest_data(file_path):
    print(f"Reading dataset from {file_path}...")
    
    # Check if file exists
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found.")
        return

    try:
        # Use pandas to read content easily (robust CSV handling)
        df = pd.read_csv(file_path)
        print(f"Found {len(df)} records. Mapping columns...")
        
        # Convert to list of dicts for the parser
        rows = df.to_dict('records')
        
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    # Import parser services
    from services.file_parser import map_columns, extract_cost_records
    
    # 1. Map Columns
    headers = list(df.columns)
    mapping = map_columns(headers)
    print(f"Column Mapping: {mapping}")
    
    if 'cost' not in mapping or ('usage_start_date' not in mapping and 'Date' not in headers):
        print("Warning: Vital columns (Cost or Date) could not be automatically mapped.")
        print("Please check if your CSV has standard headers like 'Cost', 'Amount', 'Date', 'Start Time'.")
    
    # 2. Extract & Normalize
    normalized_data = extract_cost_records(rows, mapping)
    print(f"Successfully normalized {len(normalized_data)} records.")

    if not normalized_data:
        print("No valid cost records found after normalization.")
        return

    # Connect to DB
    costs_collection = get_collection(Collections.CLOUD_COSTS)
    users_collection = get_collection("users")
    
    # Find or Create User
    user = users_collection.find_one({})
    if not user:
        print("No users found. Creating a default Admin user...")
        from models import User
        import bcrypt
        pw_hash = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        new_user = User.create_document("Admin User", "admin@example.com", pw_hash)
        result = users_collection.insert_one(new_user)
        user_id = result.inserted_id
        print(f"Created new user with ID: {user_id}")
    else:
        user_id = user['_id']
        print(f"Attaching data to User ID: {user_id}")
    
    # Clear existing data?
    print("Do you want to clear existing data for this user? (y/n): ", end="")
    # For automation safety, if running in script with args, maybe skip? 
    # But here we assume manual run.
    # We'll just default to clearing for 'training set' logic unless verified.
    # Let's clean it to ensure the ML model trains on THIS data specifically.
    costs_collection.delete_many({"user_id": user_id})
    print("\nOld data cleared. Inserting new records...")

    # 3. Enhance and Insert
    documents = []
    for record in normalized_data:
        record['user_id'] = user_id
        record['imported_at'] = datetime.utcnow()
        # Ensure provider is set if missing
        if 'provider' not in record or not record['provider']:
            record['provider'] = 'Detected_Import'
            
        documents.append(record)
        
        if len(documents) >= 1000:
            costs_collection.insert_many(documents)
            documents = []
            print(".", end="", flush=True)

    if documents:
        costs_collection.insert_many(documents)
        
    print("\nIngestion Complete!")

if __name__ == "__main__":
    # Load environment variables
    load_dotenv()
    
    # Check for command line args
    if len(sys.argv) > 1:
        dataset_path = sys.argv[1]
    else:
        # Default behavior: Search for CSVs or accept input
        print("No file specified.")
        print("Enter the full path to your GCP/Azure CSV file:")
        dataset_path = input("> ").strip().strip('"')
        
    if dataset_path:
        ingest_data(dataset_path)
    else:
        print("No file provided. Exiting.")
