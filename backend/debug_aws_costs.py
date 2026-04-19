#!/usr/bin/env python3
"""
AWS Cost Explorer Diagnostic Test
Run this to verify your AWS setup and diagnose the $0 cost issue

Usage:
  python debug_aws_costs.py
"""

import sys
from datetime import datetime, timedelta

def test_aws_costs():
    print("\n" + "="*70)
    print(" AWS Cost Explorer - Diagnostic Test")
    print("="*70)
    
    # Get credentials
    print("\n[INPUT] AWS Credentials")
    print("-" * 70)
    access_key = input("Enter AWS Access Key ID: ").strip()
    secret_key = input("Enter AWS Secret Access Key: ").strip()
    
    if not access_key or not secret_key:
        print("❌ Credentials required!")
        return
    
    # Try boto3
    try:
        import boto3
    except ImportError:
        print("❌ boto3 not installed. Run: pip install boto3")
        return
    
    # Test 1: Create client
    print("\n[TEST 1] Creating AWS Cost Explorer client...")
    print("-" * 70)
    try:
        ce = boto3.client(
            "ce",
            region_name="us-east-1",  # CRITICAL
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key
        )
        print("✅ Client created successfully (region: us-east-1)")
    except Exception as e:
        print(f"❌ Failed to create client: {e}")
        return
    
    # Calculate dates
    print("\n[TEST 2] Calculating date range...")
    print("-" * 70)
    today = datetime.utcnow()
    month_start = today.replace(day=1)
    month_end = today + timedelta(days=1)  # Exclusive
    
    start_str = month_start.strftime("%Y-%m-%d")
    end_str = month_end.strftime("%Y-%m-%d")
    
    print(f"  Current month: {month_start.strftime('%B %Y')}")
    print(f"  Start date: {start_str}")
    print(f"  End date (exclusive): {end_str}")
    print(f"  Date range: {(month_end - month_start).days} days")
    print("✅ Date range calculated")
    
    # Test 3: API call
    print("\n[TEST 3] Calling AWS Cost Explorer API...")
    print("-" * 70)
    print("  Metric: UNBLENDED_COST (uppercase)")
    print("  Granularity: DAILY")
    print("  Filter: RECORD_TYPE in [Usage, Tax, Support, Other, Refund]")
    print("  GroupBy: SERVICE")
    
    try:
        response = ce.get_cost_and_usage(
            TimePeriod={
                "Start": start_str,
                "End": end_str
            },
            Granularity="DAILY",
            Metrics=["UNBLENDED_COST"],
            GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
            Filter={
                "Dimensions": {
                    "Key": "RECORD_TYPE",
                    "Values": ["Usage", "Tax", "Support", "Other", "Refund"]
                }
            }
        )
        print("✅ API call successful")
    except Exception as e:
        print(f"❌ API call failed: {e}")
        print("\n  Likely causes:")
        print("  • Cost Explorer not enabled (24-48 hour wait)")
        print("  • IAM lacking ce:GetCostAndUsage permission")
        print("  • Invalid credentials")
        return
    
    # Test 4: Parse results
    print("\n[TEST 4] Parsing API response...")
    print("-" * 70)
    
    periods = response.get("ResultsByTime", [])
    total_cost = 0.0
    total_services = 0
    dates_with_cost = 0
    
    print(f"  Periods returned: {len(periods)}")
    
    if len(periods) == 0:
        print("⚠️  WARNING: No time periods in response!")
        print("   Your AWS account may not be set up for Cost Explorer yet.")
        print("   Please wait 24-48 hours after enabling Cost Explorer.")
        return
    
    # Detailed breakdown
    print("\n[TEST 5] Cost Breakdown by Day...")
    print("-" * 70)
    
    for period in periods:
        day = period["TimePeriod"]["Start"]
        groups = period.get("Groups", [])
        day_total = 0.0
        
        if len(groups) > 0:
            print(f"\n  📅 {day}:")
            for group in groups:
                service = group["Keys"][0]
                amount = float(group["Metrics"]["UNBLENDED_COST"]["Amount"])
                day_total += amount
                total_cost += amount
                total_services += 1
                
                if amount > 0:
                    print(f"      • {service}: ${amount:.4f}")
                    dates_with_cost += 1
            
            if day_total > 0:
                print(f"      Day Total: ${day_total:.2f}")
            else:
                print(f"      Day Total: $0.00 (no charges)")
        else:
            print(f"\n  📅 {day}: No services")
    
    # Summary
    print("\n" + "="*70)
    print(" SUMMARY")
    print("="*70)
    print(f"  Total Cost: ${total_cost:.2f}")
    print(f"  Total Services: {total_services}")
    print(f"  Days with costs: {dates_with_cost}/{len(periods)}")
    print()
    
    if total_cost > 0:
        print("✅ SUCCESS! Costs detected!")
        print(f"   Your dashboard should display: ${total_cost:.2f}")
        print("\n   If still showing $0.00 in the app:")
        print("   • Restart the backend service")
        print("   • Clear browser cache")
        print("   • Refresh the dashboard page")
    else:
        print("⚠️  WARNING: No costs found")
        print("\n   This could mean:")
        print("   1. Your AWS account genuinely has $0 costs")
        print("   2. Costs take 24-48 hours to appear in Cost Explorer")
        print("   3. Using only free tier services")
        print("   4. Free tier limits prevent charges")
        print("\n   Next steps:")
        print("   • Check AWS Billing Dashboard manually")
        print("   • Try different date range")
        print("   • Wait 24-48 hours for costs to propagate")
        print("   • Verify Cost Explorer is enabled:")
        print("     AWS Console → Cost Management → Cost Explorer")
    
    print("\n" + "="*70)

if __name__ == "__main__":
    try:
        test_aws_costs()
    except KeyboardInterrupt:
        print("\n\nTest cancelled.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
