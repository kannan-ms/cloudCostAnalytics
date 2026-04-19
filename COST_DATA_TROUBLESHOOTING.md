# Cloud Insight - Cost Data $0.00 Issue - Troubleshooting Guide

## Summary of Issues Found & Fixed

### ✅ Bug Fixes Applied

1. **Date Range Filtering Bug (CRITICAL)**
   - **Fixed in**: `cost_service.py`
   - **Issue**: When querying by end_date only, system queried wrong database field
   - **Impact**: Incorrect data retrieval in cost endpoints
   - **Status**: FIXED

2. **Provider Name Normalization Bug**
   - **Fixed in**: `ingestion_routes.py`
   - **Issue**: Provider names weren't properly normalized (AWS was becoming "Aws")
   - **Impact**: Data might not match expected provider values
   - **Status**: FIXED

---

## Why System Shows $0.00

The system shows $0.00 because **NO COST DATA HAS BEEN INGESTED** into the database yet.

### Verification Steps

#### Step 1: Check if Data Exists in Database
Run this command in MongoDB to check:
```bash
# Connect to MongoDB and run:
db.cloud_costs.countDocuments({})  # Should return number of records
db.cloud_costs.findOne()  # View a sample record
```

#### Step 2: Check Ingestion Endpoints
The system has two ways to ingest cost data:

**Option A: Upload AWS/Azure/GCP CSV File**
```
POST /api/ingestion/file
Headers: Authorization: Bearer <your-token>
Body (form-data):
  - provider: "aws" (or "azure", "gcp")
  - file: <your-billing.csv>
```

**Option B: Connect via Cloud Provider API**
```
POST /api/ingestion/api
Headers: Authorization: Bearer <your-token>
Body (JSON):
{
  "provider": "aws",
  "credentials": {
    "aws_access_key_id": "YOUR_KEY",
    "aws_secret_access_key": "YOUR_SECRET"
  },
  "start_date": "2026-01-01",
  "end_date": "2026-04-16"
}
```

---

## How to Fix the $0.00 Issue

### For AWS Users

#### Method 1: Upload Billing CSV
1. Export your AWS billing report from AWS Cost Management Console
2. Navigate to: Application → Integrations → File Upload
3. Select "AWS" as provider
4. Upload your CSV file
5. Check the response for success count

#### Method 2: Use AWS API Credentials
1. Get your AWS Access Key and Secret Key
2. Ensure the key has permissions: `ce:GetCostAndUsage`
3. Call `/api/ingestion/api` with your credentials
4. System will pull last 30 days by default

### For Azure Users
1. Export billing data from Azure Cost Management
2. Upload via File Upload with "Azure" provider
3. Ensure CSV has columns: Date, MeterCategory, CostInBillingCurrency

### For GCP Users
1. Set up BigQuery billing export
2. Use API endpoint with service account credentials
3. Provide: service_account_json, project_id, dataset_id, table_id

---

## Expected CSV Format

### AWS CSV
Required columns:
- lineItem/UsageStartDate (or similar date column)
- lineItem/ProductCode (or service name)
- lineItem/UnblendedCost (or cost column)

### Azure CSV
Required columns:
- Date
- MeterCategory
- CostInBillingCurrency

### GCP CSV
Required columns:
- usage_start_time
- service.description
- cost

---

## Debugging Checklist

If data still shows as $0.00 after ingestion:

- [ ] Check ingestion endpoint returned `success_count > 0`
- [ ] Verify no parse errors in ingestion response
- [ ] Check database has records: `db.cloud_costs.count()`
- [ ] Verify user_id in records matches your user account
- [ ] Check date range - ensure data is within last 30 days (or adjust date filter)
- [ ] Check provider name is one of: AWS, Azure, GCP, Other
- [ ] Check MongoDB connection is working

---

## API Endpoints to Use

### Check Your Data
```
GET /api/costs/summary
GET /api/costs/trends/auto
GET /api/costs?page=1&page_size=10
```

### Ingest New Data
```
POST /api/ingestion/file
POST /api/ingestion/api
POST /api/ingestion/detect  (ingest + anomaly detection)
```

---

## Sample Test Request (cURL)

```bash
# Upload AWS CSV file
curl -X POST http://localhost:5000/api/ingestion/file \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "provider=aws" \
  -F "file=@billing.csv"

# Expected response:
{
  "success": true,
  "summary": {
    "rows_ingest": 250,
    "success_count": 245,
    "error_count": 5,
    "total_cost": 4527.89,
    "date_range": {
      "from": "2026-04-01",
      "to": "2026-04-16"
    }
  }
}
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| CSV upload returns error "Cannot find 'cost' column" | Column names don't match expected format | Check CSV column names match supported format |
| Response shows `error_count > 0` but `success_count > 0` | Some rows had parsing errors | Check specific error messages in response |
| Data ingested but still shows $0.00 | Data is older than 30 days | Adjust date range or verify data dates match current period |
| AWS credentials return 401 | Invalid AWS keys | Verify AWS Access Key and Secret Key are correct |
| Azure API returns error | Missing authentication | Provide all required credentials: tenant_id, client_id, client_secret, subscription_id |

---

## Next Steps

1. **Ingest your actual AWS/Azure/GCP cost data**
2. **Verify dashboard shows correct total spend**
3. **Check anomalies and forecasts work correctly**
4. **Set up budgets and alerts**

## Support

If issues persist after following this guide:
1. Check application logs for error messages
2. Verify MongoDB connection is active
3. Confirm CSV format matches expected schema
4. Check API authentication token is valid
