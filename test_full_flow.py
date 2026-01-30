import requests
import json
import time

BASE_URL = "http://localhost:5000/api"

def run_test():
    email = f"test_flow_{int(time.time())}@example.com"
    password = "Password123!"
    
    print(f"1. Registering {email}...")
    try:
        res = requests.post(f"{BASE_URL}/auth/register", json={
            "email": email,
            "password": password,
            "confirmPassword": password,
            "name": "Test User"
        })
        if res.status_code != 201:
            print(f"❌ Registration failed: {res.text}")
            # Try login if already exists
            print("Trying login...")
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return

    print("2. Logging in...")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    token = res.json().get('token')
    if not token:
        print(f"❌ Login failed: {res.text}")
        return
        
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Logged in")

    print("3. Uploading file...")
    # Create dummy CSV content
    csv_content = """provider,service_name,cost,usage_start_date,usage_end_date
AWS,EC2,100.0,2026-01-01,2026-01-31
Azure,VM,200.0,2026-02-01,2026-02-28"""
    
    files = {'file': ('test.csv', csv_content, 'text/csv')}
    res = requests.post(f"{BASE_URL}/costs/upload", headers=headers, files=files)
    print(f"Upload Response: {res.status_code}")
    print(res.json())

    print("4. Fetching Auto Trends...")
    res = requests.get(f"{BASE_URL}/costs/trends/auto", headers=headers)
    print(f"Trends Response: {res.status_code}")
    print(json.dumps(res.json(), indent=2))

if __name__ == "__main__":
    run_test()
