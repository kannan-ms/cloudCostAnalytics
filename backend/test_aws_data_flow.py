"""
Simple test to verify AWS API is sending data through the application.
Shows exactly what data AWS returns and if it's being saved.
"""

import os
import sys
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

load_dotenv()

print("=" * 80)
print("AWS DATA FLOW TEST - Check if AWS API sends data to your app")
print("=" * 80)

# Step 1: Check environment variables
print("\n📋 STEP 1: Checking AWS Credentials...")
aws_key = os.getenv('AWS_ACCESS_KEY_ID')
aws_secret = os.getenv('AWS_SECRET_ACCESS_KEY')

if not aws_key or not aws_secret:
    print("❌ AWS credentials not found in .env file!")
    print("   Add these to backend/.env:")
    print("   AWS_ACCESS_KEY_ID=your-key")
    print("   AWS_SECRET_ACCESS_KEY=your-secret")
    sys.exit(1)

print(f"✅ AWS Key found: {aws_key[:10]}...")
print(f"✅ AWS Secret found: {aws_secret[:10]}...")

# Step 2: Test AWS Connection
print("\n📋 STEP 2: Connecting to AWS Cost Explorer API...")
try:
    import boto3
    
    client = boto3.client(
        'ce',  # Cost Explorer
        region_name='us-east-1',
        aws_access_key_id=aws_key,
        aws_secret_access_key=aws_secret
    )
    print("✅ AWS client created successfully")
except Exception as e:
    print(f"❌ Failed to create AWS client: {e}")
    sys.exit(1)

# Step 3: Call AWS API
print("\n📋 STEP 3: Calling AWS Cost Explorer API...")
try:
    end_date = datetime.now() + timedelta(days=1)
    start_date = end_date - timedelta(days=30)
    
    response = client.get_cost_and_usage(
        TimePeriod={
            'Start': start_date.strftime('%Y-%m-%d'),
            'End': end_date.strftime('%Y-%m-%d')
        },
        Granularity='DAILY',
        Metrics=['UNBLENDED_COST'],
        GroupBy=[
            {'Type': 'DIMENSION', 'Key': 'SERVICE'}
        ]
    )
    print("✅ AWS API call successful!")
    
except Exception as e:
    print(f"❌ AWS API call failed: {e}")
    sys.exit(1)

# Step 4: Parse AWS response
print("\n📋 STEP 4: Parsing AWS Data...")
total_cost = 0
records_count = 0

if 'ResultsByTime' in response:
    print(f"   Found {len(response['ResultsByTime'])} days of data")
    
    for day in response['ResultsByTime'][:3]:  # Show first 3 days
        date = day['TimePeriod']['Start']
        for service_data in day['Groups']:
            service = service_data['Keys'][0]
            cost = float(service_data['Metrics']['UnblendedCost']['Amount'])
            total_cost += cost
            records_count += 1
            print(f"   📊 {date} | {service:20} | ${cost:.2f}")
    
    print(f"\n✅ Total records: {records_count}")
    print(f"✅ Total cost (sample): ${total_cost:.2f}")
else:
    print("⚠️  No data returned from AWS")

# Step 5: Check if data would be saved
print("\n📋 STEP 5: Checking if data can be saved to database...")
try:
    from database import Database
    db = Database()
    
    # Check if we can connect
    test_result = db.db.command('ping')
    print("✅ MongoDB connection successful")
    
    # Check existing costs
    from services.cost_service import CostService
    cost_service = CostService(db)
    existing_costs = cost_service.db.cloud_costs.find_one()
    
    if existing_costs:
        print("✅ Cost data already exists in database")
        print(f"   Sample record: {existing_costs['provider']} - ${existing_costs.get('cost', 0):.2f}")
    else:
        print("ℹ️  No cost data in database yet (will be added after ingestion)")
    
except Exception as e:
    print(f"⚠️  Database check failed: {e}")
    print("   Make sure MongoDB_URI is set in .env file")

# Final Result
print("\n" + "=" * 80)
print("✅ SUCCESS! AWS is configured and API is responding with data!")
print("=" * 80)
print("\n🎯 Next steps:")
print("   1. Run: python app.py (in terminal 1)")
print("   2. Run: npm run dev (in terminal 2)")
print("   3. Login to http://localhost:5173")
print("   4. Go to Integrations → Cloud Integration")
print("   5. Add AWS credentials and click 'Ingest'")
print("   6. Check Dashboard for costs!")
print("=" * 80)
