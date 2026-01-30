from pymongo import MongoClient
import os
import sys
# Add backend to path to import config
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from backend.config import Config
    from backend.database import Collections
except ImportError:
    # Fallback if running from root
    import sys
    sys.path.append('backend')
    from config import Config
    from database import Collections

# Connect to MongoDB
try:
    client = MongoClient(Config.MONGODB_URI)
    db = client[Config.DATABASE_NAME]
    users_col = db[Collections.USERS]
    costs_col = db[Collections.CLOUD_COSTS]

    print("\n--- User Data Debug ---")
    users = list(users_col.find())
    print(f"Total Users: {len(users)}")
    
    for user in users:
        user_id = user['_id']
        email = user['email']
        cost_count = costs_col.count_documents({"user_id": user_id})
        print(f"User: {email} (ID: {user_id})")
        print(f"  Cost Records: {cost_count}")
        
        if cost_count > 0:
            print("  Sample Record:")
            sample = costs_col.find_one({"user_id": user_id})
            print(f"    Services: {sample.get('service_name')}")
            print(f"    Date: {sample.get('usage_start_date')}")
            print(f"    Period: {sample.get('billing_period')}")
            
        print("-" * 30)
except Exception as e:
    print(f"Error: {e}")
