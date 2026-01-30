"""
Simple script to upload cost data CSV to the application.
Usage: python upload_test_data.py
"""

import requests
import json
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:5000/api"
CSV_FILE = "test_cost_data.csv"

def login(email, password):
    """Login and get JWT token"""
    print(f"\n🔐 Logging in as {email}...")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('token')
        print(f"✅ Login successful!")
        return token
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def upload_csv(token, csv_file):
    """Upload CSV file with cost data"""
    print(f"\n📤 Uploading {csv_file}...")
    
    file_path = Path(csv_file)
    
    if not file_path.exists():
        print(f"❌ File not found: {csv_file}")
        return False
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    with open(file_path, 'rb') as f:
        files = {'file': (file_path.name, f, 'text/csv')}
        response = requests.post(
            f"{BASE_URL}/costs/upload",
            headers=headers,
            files=files
        )
    
    if response.status_code in [201, 207]:
        data = response.json()
        print(f"\n✅ Upload successful!")
        print(f"   📊 Total records: {data.get('total_records')}")
        print(f"   ✔️  Success count: {data.get('success_count')}")
        print(f"   ❌ Error count: {data.get('error_count')}")
        
        if data.get('sample_errors'):
            print(f"\n⚠️  Sample errors:")
            for error in data.get('sample_errors', []):
                print(f"      - {error}")
        
        return True
    else:
        print(f"❌ Upload failed: {response.text}")
        return False

def get_costs(token):
    """Get cost records to verify upload"""
    print(f"\n📋 Fetching cost records...")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(
        f"{BASE_URL}/costs?page=1&page_size=5",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        costs = data.get('costs', [])
        pagination = data.get('pagination', {})
        
        print(f"\n✅ Found {pagination.get('total_count')} total records")
        print(f"\nShowing first {len(costs)} records:")
        
        for cost in costs[:5]:
            print(f"\n   🔹 {cost.get('provider')} - {cost.get('service_name')}")
            print(f"      💰 Cost: ${cost.get('cost')} {cost.get('currency', 'USD')}")
            print(f"      📅 Period: {cost.get('usage_start_date')} to {cost.get('usage_end_date')}")
            print(f"      🌍 Region: {cost.get('region', 'N/A')}")
        
        return True
    else:
        print(f"❌ Failed to fetch costs: {response.text}")
        return False

def main():
    print("=" * 60)
    print("🚀 Cost Data Upload Tool")
    print("=" * 60)
    
    # Get login credentials
    print("\nEnter your login credentials:")
    email = input("Email: ").strip()
    password = input("Password: ").strip()
    
    # Login
    token = login(email, password)
    if not token:
        print("\n❌ Cannot proceed without authentication")
        return
    
    # Upload CSV
    success = upload_csv(token, CSV_FILE)
    if not success:
        print("\n❌ Upload failed")
        return
    
    # Verify by fetching records
    get_costs(token)
    
    print("\n" + "=" * 60)
    print("✅ Done! You can now view the data in the dashboard")
    print("🌐 Open: http://localhost:5174")
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Cancelled by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
