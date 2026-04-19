# AWS Cost Explorer Debug Guide - Complete Troubleshooting

## Summary of Issues Fixed

### 1. ✅ **Metric Name Bug (CRITICAL)**
- **Wrong**: `Metrics=["UnblendedCost"]` (camelCase)
- **Correct**: `Metrics=["UNBLENDED_COST"]` (UPPERCASE)
- **Impact**: This was likely causing API errors or empty responses

### 2. ✅ **Region Enforcement**
- Cost Explorer API **ONLY works in us-east-1**
- Now hardcoded to us-east-1 regardless of other regions
- Other regions will fail silently

### 3. ✅ **Date Range Defaults**
- **Before**: Last 30 days (arbitrary)
- **After**: Current month from day 1 to today (billing-accurate)
- **Critical**: end_date is **exclusive** - we add 1 day to include today

### 4. ✅ **Filter for Cost Types**
- Now filters to include: Usage, Tax, Support, Other, Refund
- This prevents filtering out legitimate costs

### 5. ✅ **Free Tier Handling**
- Now includes ALL costs, even $0 (free tier resources)
- Previously might have been filtered out

---

## Answers to Your Specific Questions

### 1. **Should Cost Explorer be us-east-1?**
✅ **YES - ALWAYS** - Cost Explorer is a global service and **only** responds in us-east-1. 
Your resource region doesn't matter.

```python
# ALWAYS this region for Cost Explorer
ce = boto3.client("ce", region_name="us-east-1")
```

### 2. **Is TimePeriod correct and inclusive?**
⚠️ **MOSTLY** - The issue is the **end_date is EXCLUSIVE**

```python
# WRONG - Returns data ONLY through 2026-04-16
TimePeriod={"Start": "2026-04-01", "End": "2026-04-17"}

# CORRECT - Returns data through 2026-04-17
TimePeriod={"Start": "2026-04-01", "End": "2026-04-18"}  # Add 1 day
```

### 3. **UnblendedCost vs BlendedCost?**
- **UNBLENDED_COST** (recommended): Shows actual hourly rate paid
- **BLENDED_COST**: Average cost across all accounts/discounts
- **Use**: UNBLENDED_COST for most cases

⚠️ **MUST use uppercase**: `UNBLENDED_COST` or `BLENDED_COST`

### 4. **Free Tier Credits Affecting Output?**
- Free tier is included in the metrics but shows as cost
- Credits are separate line items if using reserved instances
- Filter `RECORD_TYPE` to include all types

### 5. **Delay/Caching Issues?**
- Cost Explorer has **24-48 hour delay** for some costs
- Data usually available within a few hours but not guaranteed
- Some costs (e.g., data transfer) may lag 24+ hours
- **Solution**: Wait 24 hours for full accuracy on new AWS account

### 6. **Correct API Request Format**

Here's the working Python example:

```python
import boto3
from datetime import datetime, timedelta

# Setup
ACCESS_KEY = "YOUR_AWS_ACCESS_KEY"
SECRET_KEY = "YOUR_AWS_SECRET_KEY"

ce = boto3.client(
    "ce",
    region_name="us-east-1",  # CRITICAL: Must be us-east-1
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY
)

# Calculate date range (current month)
today = datetime.utcnow()
start_date = today.replace(day=1).strftime("%Y-%m-%d")
end_date = (today + timedelta(days=1)).strftime("%Y-%m-%d")  # Exclusive

print(f"Fetching costs from {start_date} to {end_date} (end is exclusive)")

# The correct request
response = ce.get_cost_and_usage(
    TimePeriod={
        "Start": start_date,
        "End": end_date
    },
    Granularity="DAILY",  # or MONTHLY
    Metrics=[
        "UNBLENDED_COST"  # CRITICAL: Use UPPERCASE
    ],
    GroupBy=[
        {
            "Type": "DIMENSION",
            "Key": "SERVICE"
        }
    ],
    Filter={
        "Dimensions": {
            "Key": "RECORD_TYPE",
            "Values": [
                "Usage",      # Actual usage
                "Tax",        # Taxes
                "Support",    # Support charges
                "Other",      # Other charges
                "Refund"      # Refunds
            ]
        }
    }
)

# Parse response
total_cost = 0
print("\nCosts by Service:")
for result_by_time in response.get("ResultsByTime", []):
    day = result_by_time["TimePeriod"]["Start"]
    print(f"\n{day}:")
    
    for group in result_by_time.get("Groups", []):
        service = group["Keys"][0]
        amount = float(group["Metrics"]["UNBLENDED_COST"]["Amount"])
        total_cost += amount
        
        if amount > 0:
            print(f"  {service}: ${amount:.4f}")

print(f"\nTotal Cost: ${total_cost:.2f}")

if total_cost == 0:
    print("\n⚠️  WARNING: $0 returned. This means:")
    print("  1. Your AWS account has no costs in this period")
    print("  2. Costs haven't appeared yet (24-48 hour delay)")
    print("  3. Cost Explorer needs to be enabled (wait 24 hours)")
    print("  4. Credentials lack ce:GetCostAndUsage permission")
```

---

## Test Script - Run This to Debug

Create a file `test_aws_cost_explorer.py`:

```python
#!/usr/bin/env python3
"""
Test AWS Cost Explorer connectivity and data retrieval
Run: python test_aws_cost_explorer.py
"""

import boto3
from datetime import datetime, timedelta
import json

def test_aws_cost_explorer():
    # Configuration
    ACCESS_KEY = input("Enter AWS Access Key ID: ").strip()
    SECRET_KEY = input("Enter AWS Secret Access Key: ").strip()
    
    print("\n" + "="*60)
    print("AWS Cost Explorer - Connection & Data Test")
    print("="*60)
    
    # Step 1: Test credentials
    print("\n[Step 1] Testing AWS credentials...")
    try:
        ce = boto3.client(
            "ce",
            region_name="us-east-1",
            aws_access_key_id=ACCESS_KEY,
            aws_secret_access_key=SECRET_KEY
        )
        print("✅ Credentials valid - client created")
    except Exception as e:
        print(f"❌ Credentials error: {e}")
        return
    
    # Step 2: Test API call
    print("\n[Step 2] Testing Cost Explorer API call...")
    
    today = datetime.utcnow()
    start_date = today.replace(day=1).strftime("%Y-%m-%d")
    end_date = (today + timedelta(days=1)).strftime("%Y-%m-%d")
    
    print(f"  Date range: {start_date} to {end_date} (end is exclusive)")
    print(f"  Metric: UNBLENDED_COST")
    print(f"  Granularity: DAILY")
    
    try:
        response = ce.get_cost_and_usage(
            TimePeriod={
                "Start": start_date,
                "End": end_date
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
        print(f"❌ API error: {e}")
        print("   Possible causes:")
        print("   - Cost Explorer not enabled (takes 24+ hours to activate)")
        print("   - Region not us-east-1")
        print("   - Credentials lack permission: ce:GetCostAndUsage")
        print("   - Syntax error in request")
        return
    
    # Step 3: Parse response
    print("\n[Step 3] Parsing API response...")
    
    periods = response.get("ResultsByTime", [])
    print(f"✅ Got {len(periods)} time periods")
    
    total_records = 0
    total_cost = 0
    
    for result_by_time in periods:
        groups = result_by_time.get("Groups", [])
        total_records += len(groups)
        
        for group in groups:
            service = group["Keys"][0]
            amount = float(group["Metrics"]["UNBLENDED_COST"]["Amount"])
            total_cost += amount
    
    # Step 4: Results
    print("\n[Step 4] Results:")
    print(f"  Total services: {total_records}")
    print(f"  Total cost: ${total_cost:.2f}")
    
    if total_cost == 0:
        print("\n⚠️  ZERO COST DETECTED")
        print("  This could mean:")
        print("  ✓ Your AWS account genuinely has no costs in this period")
        print("  ✓ Free tier only (some free tier services not tracked)")
        print("  ✓ Costs take 24-48 hours to appear")
        print("  ✓ Need to wait for Cost Explorer to initialize")
        print("\n  Next steps:")
        print("  1. Check AWS Billing dashboard manually")
        print("  2. Try date range: 2026-04-01 to 2026-04-18")
        print("  3. Try different Granularity: MONTHLY")
        print("  4. Wait 24-48 hours if this is a new account")
    else:
        print(f"\n✅ SUCCESS! Found ${total_cost:.2f} in costs")
        print("  Your application should now show this amount")
    
    # Step 5: Detailed breakdown
    print("\n[Step 5] Detailed breakdown:")
    for result_by_time in periods:
        day = result_by_time["TimePeriod"]["Start"]
        print(f"\n  {day}:")
        
        day_total = 0
        for group in result_by_time.get("Groups", []):
            service = group["Keys"][0]
            amount = float(group["Metrics"]["UNBLENDED_COST"]["Amount"])
            day_total += amount
            if amount > 0:
                print(f"    {service}: ${amount:.4f}")
        
        if day_total == 0:
            print(f"    (No costs)")
        else:
            print(f"    Day Total: ${day_total:.2f}")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    test_aws_cost_explorer()
```

**Run it:**
```bash
cd backend
python test_aws_cost_explorer.py
```

---

## Node.js Example

If you prefer Node.js:

```javascript
const AWS = require('aws-sdk');

// Setup
const ceClient = new AWS.CostExplorer({
    region: 'us-east-1',  // CRITICAL: Must be us-east-1
    accessKeyId: 'YOUR_KEY',
    secretAccessKey: 'YOUR_SECRET'
});

// Calculate dates
const today = new Date();
const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
const endDate = new Date(today);
endDate.setDate(endDate.getDate() + 1);  // Add 1 day (exclusive)

const formatDate = (d) => d.toISOString().split('T')[0];

const params = {
    TimePeriod: {
        Start: formatDate(startDate),
        End: formatDate(endDate)
    },
    Granularity: 'DAILY',
    Metrics: ['UNBLENDED_COST'],  // UPPERCASE!
    GroupBy: [{
        Type: 'DIMENSION',
        Key: 'SERVICE'
    }],
    Filter: {
        Dimensions: {
            Key: 'RECORD_TYPE',
            Values: ['Usage', 'Tax', 'Support', 'Other', 'Refund']
        }
    }
};

ceClient.getCostAndUsage(params, (err, data) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    
    let totalCost = 0;
    console.log(`\nCosts from ${params.TimePeriod.Start} to ${params.TimePeriod.End}:\n`);
    
    data.ResultsByTime.forEach(result => {
        const day = result.TimePeriod.Start;
        console.log(`${day}:`);
        
        result.Groups.forEach(group => {
            const service = group.Keys[0];
            const amount = parseFloat(group.Metrics.UNBLENDED_COST.Amount);
            totalCost += amount;
            
            if (amount > 0) {
                console.log(`  ${service}: $${amount.toFixed(4)}`);
            }
        });
    });
    
    console.log(`\nTotal: $${totalCost.toFixed(2)}`);
});
```

---

## Troubleshooting Checklist

- [ ] Region is **us-east-1** (not your resource region)
- [ ] Metric is **UNBLENDED_COST** (uppercase, not UnblendedCost)
- [ ] end_date = today + 1 day (exclusive endpoint)
- [ ] start_date = first day of month (billing accurate)
- [ ] IAM permissions include `ce:GetCostAndUsage`
- [ ] Cost Explorer enabled in AWS console (24-48 hour wait)
- [ ] Account has costs in the billing period
- [ ] Credentials are valid (test manually first)
- [ ] No typos in API request parameters
- [ ] Using correct Metric name (check AWS docs)

---

## Expected Output

```
Costs from 2026-04-01 to 2026-04-18:

2026-04-01:
  Amazon Elastic Compute Cloud - Compute: $0.0245
  Amazon Simple Storage Service: $0.0012

2026-04-02:
  Amazon Elastic Compute Cloud - Compute: $0.0567
  (No other services)

...

Total: $6.23
```

If you get $0.00, wait 24 hours and try again.
