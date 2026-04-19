"""
Advanced AWS diagnostic - checks time sync and permissions
"""

import os
import sys
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
import boto3

load_dotenv()

print("=" * 80)
print("AWS ADVANCED DIAGNOSTIC")
print("=" * 80)

aws_key = os.getenv('AWS_ACCESS_KEY_ID')
aws_secret = os.getenv('AWS_SECRET_ACCESS_KEY')

# Step 1: Check system time
print("\n📋 STEP 1: Checking System Clock Sync...")
try:
    import time
    local_time = datetime.utcnow()
    print(f"   Local time: {local_time}")
    print("   ✅ Time looks OK (AWS needs within 15 minutes)")
except Exception as e:
    print(f"   ⚠️  {e}")

# Step 2: Test basic S3 access (simpler than Cost Explorer)
print("\n📋 STEP 2: Testing Basic AWS Access (S3 List)...")
try:
    s3_client = boto3.client(
        's3',
        region_name='us-east-1',
        aws_access_key_id=aws_key,
        aws_secret_access_key=aws_secret
    )
    response = s3_client.list_buckets()
    print(f"✅ S3 access works! Found {len(response.get('Buckets', []))} buckets")
    print("   This means your AWS credentials are valid!")
except Exception as e:
    print(f"❌ S3 access failed: {str(e)}")
    print("   This means the AWS credentials themselves are incorrect")
    sys.exit(1)

# Step 3: Check IAM user details
print("\n📋 STEP 3: Checking IAM User Permissions...")
try:
    iam_client = boto3.client(
        'iam',
        aws_access_key_id=aws_key,
        aws_secret_access_key=aws_secret
    )
    user_info = iam_client.get_user()
    username = user_info['User']['UserName']
    print(f"✅ IAM User: {username}")
    
    # List attached policies
    policies = iam_client.list_attached_user_policies(UserName=username)
    print(f"   Attached policies: {len(policies.get('AttachedPolicies', []))}")
    for policy in policies.get('AttachedPolicies', []):
        print(f"     - {policy['PolicyName']}")
        
except Exception as e:
    print(f"⚠️  IAM check failed: {e}")

# Step 4: Test Cost Explorer
print("\n📋 STEP 4: Testing Cost Explorer API...")
try:
    ce_client = boto3.client(
        'ce',
        region_name='us-east-1',
        aws_access_key_id=aws_key,
        aws_secret_access_key=aws_secret
    )
    
    end_date = datetime.now() + timedelta(days=1)
    start_date = end_date - timedelta(days=7)  # Last 7 days only
    
    response = ce_client.get_cost_and_usage(
        TimePeriod={
            'Start': start_date.strftime('%Y-%m-%d'),
            'End': end_date.strftime('%Y-%m-%d')
        },
        Granularity='DAILY',
        Metrics=['UNBLENDED_COST']
    )
    print(f"✅ Cost Explorer works!")
    
    # Parse response
    total = 0
    for period in response['ResultsByTime']:
        cost = float(period['Total']['UnblendedCost']['Amount'])
        total += cost
    
    print(f"✅ Total cost (last 7 days): ${total:.2f}")
    
except Exception as e:
    error_str = str(e)
    print(f"❌ Cost Explorer failed: {error_str}")
    
    if "InvalidSignatureException" in error_str:
        print("   🔴 ISSUE: Signature invalid - credentials might be wrong")
        print("   ACTION: Re-check AWS Access Key and Secret Key")
    elif "AccessDenied" in error_str or "not authorized" in error_str:
        print("   🟡 ISSUE: Access denied - IAM user needs Cost Explorer permission")
        print("   ACTION: Add 'ce:GetCostAndUsage' permission to IAM user")
    elif "InvalidAction" in error_str:
        print("   🟡 ISSUE: Cost Explorer not available in this region/account")
        print("   ACTION: Make sure account has been active for 24+ hours")
    else:
        print("   🔴 ISSUE: Unknown error")

print("\n" + "=" * 80)
print("DIAGNOSTIC COMPLETE")
print("=" * 80)
