# 📤 How to Upload Cost Data - Quick Guide

## ✅ What I Just Created:

1. **FileUpload Component** - A beautiful drag-and-drop interface
2. **New "Upload Data" Tab** in your Dashboard
3. **Full integration** with your backend API
4. **Sample test data** file ready to upload

---

## 🚀 How to Upload Data (3 Easy Steps):

### **Step 1: Open Your Dashboard**
1. Go to: http://localhost:5174
2. Login with your credentials
3. Click the **"📤 Upload Data"** tab

### **Step 2: Upload Your File**

**Option A - Drag & Drop:**
- Drag the file `test_cost_data.csv` into the upload area
- Click "Upload File" button

**Option B - Browse:**
- Click "Browse Files" button
- Select `test_cost_data.csv` from your project folder
- Click "Upload File" button

### **Step 3: View Your Data**
- After successful upload, click "Overview" tab
- See your cost charts populated with data!
- Check the stats cards for totals

---

## 📊 Features of the Upload UI:

✨ **Drag & Drop Support** - Just drag files into the upload zone
📄 **File Validation** - Accepts CSV, XLSX, XLS files only
📈 **Progress Tracking** - See upload status in real-time
✅ **Success Feedback** - Shows how many records were imported
⚠️ **Error Reporting** - Displays any issues with specific rows
📥 **Template Download** - Get a sample CSV format anytime

---

## 📝 File Format Requirements:

### Required Columns:
- `provider` - Cloud provider (AWS, Azure, GCP)
- `service_name` - Service name (EC2, S3, etc.)
- `cost` - Cost amount (number)
- `usage_start_date` - Start date (YYYY-MM-DD)
- `usage_end_date` - End date (YYYY-MM-DD)

### Optional Columns:
- `region` - Region/location
- `cloud_account_id` - Account ID
- `resource_id` - Resource identifier
- `usage_quantity` - Usage amount
- `usage_unit` - Unit of measurement
- `currency` - Currency code (default: USD)

### Example CSV Format:
```csv
provider,service_name,cost,usage_start_date,usage_end_date,region
AWS,EC2,150.50,2026-01-01,2026-01-15,us-east-1
Azure,Virtual Machines,180.75,2026-01-01,2026-01-15,East US
GCP,Compute Engine,195.00,2026-01-01,2026-01-15,us-central1
```

---

## 🧪 Test Data Available:

I created `test_cost_data.csv` with:
- ✅ 20 sample cost records
- ✅ 3 providers (AWS, Azure, GCP)
- ✅ 9 different services
- ✅ ~$2,190 total costs
- ✅ January 2026 data

---

## 🎯 After Upload, You Can:

1. **View Cost Charts** - Line, Bar, and Doughnut charts
2. **See Statistics** - Total costs, monthly averages, service counts
3. **Run Anomaly Detection** - Click "Run Anomaly Detection" button
4. **Analyze Trends** - View monthly breakdowns
5. **Check Anomalies** - See detected cost spikes and issues

---

## 🔧 What Happens Behind the Scenes:

When you upload a file:

1. ✅ Frontend validates file type (CSV/Excel)
2. ✅ File sent to `/api/costs/upload` endpoint
3. ✅ Backend parses the file (handles CSV and Excel)
4. ✅ Validates required fields
5. ✅ Maps flexible column names (e.g., "provider" or "cloud_provider")
6. ✅ Inserts records into MongoDB
7. ✅ Returns success/error report
8. ✅ Dashboard automatically refreshes with new data

---

## 💡 Pro Tips:

- **Download Template**: Click "Download Template" to see the exact format
- **Batch Upload**: Upload files with 1000s of records - it handles bulk imports
- **Flexible Columns**: Column names are flexible (e.g., "cost" or "amount" both work)
- **Error Recovery**: If some rows fail, successful rows still get imported
- **Retry Failed Rows**: Fix errors in your CSV and re-upload

---

## 🐛 Troubleshooting:

**Problem**: "File upload failed"
- ✅ Check backend is running on port 5000
- ✅ Verify you're logged in (token exists)
- ✅ Check browser console for errors

**Problem**: "Invalid file format"
- ✅ Use CSV (.csv) or Excel (.xlsx, .xls) files only
- ✅ Ensure file has required columns
- ✅ Check date format is YYYY-MM-DD

**Problem**: "Some records failed"
- ✅ View "Sample Errors" in upload result
- ✅ Fix the problematic rows
- ✅ Re-upload the corrected file

---

## 🎨 UI Features You'll Love:

- **Responsive Design** - Works on desktop and mobile
- **Visual Feedback** - Clear success/error messages
- **Upload Statistics** - See total, success, and failed counts
- **Sample Error Display** - First 5 errors shown for debugging
- **Professional Look** - Clean, modern interface
- **Emoji Icons** - Easy visual recognition

---

## 🚀 Ready to Test!

**Quick Start:**
1. Open http://localhost:5174
2. Login
3. Click "📤 Upload Data" tab
4. Upload `test_cost_data.csv`
5. Watch your dashboard come to life! 🎉

Enjoy your new upload feature! 🎊
