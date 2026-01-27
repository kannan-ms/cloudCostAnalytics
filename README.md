# ☁️ Intelligent Cloud Cost Behaviour Analytics and Anomaly Detection

A comprehensive full-stack web application for analyzing cloud costs, detecting anomalies, and visualizing cost trends in real-time. This project provides insights into cloud spending patterns and alerts users to unusual cost spikes.

## 📋 Project Overview

This application is designed to help organizations understand and monitor their cloud infrastructure costs. It analyzes historical cost data, detects anomalous spending patterns, and presents insights through an intuitive dashboard.

**Current Status:** MVP (Minimum Viable Product) - Base version with mocked data
**Note:** Azure integration is currently mocked for demonstration purposes.

---

## 🛠️ Tech Stack

### Backend
- **Framework:** Flask 2.3.3 (Python)
- **API:** REST API with CORS support
- **Data Storage:** Local JSON (expandable to SQLite)
- **Cloud Integration:** Mocked Azure Cost Management APIs (read-only)

### Frontend
- **Framework:** React 18.2 with Vite bundler
- **Charting:** Chart.js + react-chartjs-2
- **HTTP Client:** Axios
- **Styling:** Custom CSS with responsive design
- **Port:** 5173 (Vite dev server)

### Infrastructure
- **Backend Port:** 5000
- **Frontend Port:** 5173
- **Communication:** REST API via HTTP

---

## 📁 Project Structure

```
cloudProject/
├── backend/                          # Flask REST API
│   ├── app.py                       # Main Flask application entry point
│   ├── config.py                    # Configuration management
│   ├── requirements.txt             # Python dependencies
│   ├── .gitignore                   # Git ignore file
│   ├── services/
│   │   ├── azure_cost_service.py   # Mock Azure Cost data provider
│   │   └── anomaly_detection.py    # Anomaly detection logic
│   └── routes/
│       └── cost_routes.py           # API endpoints for costs, anomalies, and trend
│
├── frontend/                        # React + Vite application
│   ├── package.json                # Node.js dependencies
│   ├── vite.config.js              # Vite configuration
│   ├── index.html                  # HTML entry point
│   ├── .gitignore                  # Git ignore file
│   └── src/
│       ├── main.jsx                # React entry point
│       ├── App.jsx                 # Main React component
│       ├── App.css                 # Global styles
│       ├── index.css               # Root styles
│       ├── components/
│       │   ├── Dashboard.jsx       # Main dashboard component
│       │   ├── CostChart.jsx       # Cost trend chart component
│       │   └── AnomalyList.jsx     # Anomaly detection results component
│       └── services/
│           └── api.js              # API client for backend communication
│
└── README.md                        # This file
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.8+** for backend
- **Node.js 16+** and npm for frontend
- **Git** for version control

### Backend Setup

#### 1. Navigate to Backend Directory
```bash
cd backend
```

#### 2. Create Virtual Environment (Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 4. Run Flask Server
```bash
python app.py
```

**Expected Output:**
```
============================================================
Cloud Cost Analytics API - Starting Server
============================================================
Environment: development
Debug Mode: True
CORS Origins: ['http://localhost:5173', 'http://localhost:3000']

Server will be available at: http://localhost:5000
API Documentation: http://localhost:5000/api
============================================================
```

The backend will be available at `http://localhost:5000`

---

### Frontend Setup

#### 1. Navigate to Frontend Directory
```bash
cd frontend
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Run Development Server
```bash
npm run dev
```

**Expected Output:**
```
  VITE v4.x.x  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

The frontend will be available at `http://localhost:5173`

---

## 📡 API Endpoints

### Health Check
- **GET** `/api/health` - Check API status
  ```json
  {
    "status": "healthy",
    "timestamp": "2025-12-29T10:30:45.123456",
    "service": "Cloud Cost Analytics API"
  }
  ```

### Cost Data
- **GET** `/api/costs` - Retrieve all costs (supports filtering)
  - Query Parameters:
    - `start_date` (optional): YYYY-MM-DD format
    - `end_date` (optional): YYYY-MM-DD format
    - `service` (optional): Filter by service name

  ```json
  {
    "total_cost": 45250.75,
    "costs_by_service": {
      "Compute": 15000.50,
      "Storage": 12500.25,
      "Networking": 8750.00,
      "Database": 6000.00,
      "Analytics": 3000.00
    },
    "daily_costs": [
      {
        "date": "2025-12-01",
        "service": "Compute",
        "cost": 300.50,
        "timestamp": "2025-12-01T00:00:00"
      }
    ],
    "currency": "USD",
    "period": "Last 30 days"
  }
  ```

### Anomalies
- **GET** `/api/anomalies` - Detect and retrieve cost anomalies
  ```json
  {
    "anomalies": [
      {
        "date": "2025-12-15",
        "service": "Compute",
        "cost": 550.00,
        "average": 300.00,
        "threshold": 450.00,
        "severity": "high",
        "message": "Unusual spike in Compute costs on 2025-12-15: $550.00 (avg: $300.00)"
      }
    ],
    "summary": {
      "total_anomalies": 3,
      "high_severity": 1,
      "medium_severity": 2,
      "status": "warning",
      "last_detected": "2025-12-15"
    }
  }
  ```

### Trend Analysis
- **GET** `/api/trend` - Get cost trend analysis
  ```json
  {
    "trend": {
      "trend": "increasing",
      "change_percentage": 12.5,
      "first_period_avg": 1500.00,
      "second_period_avg": 1687.50
    },
    "period": "Last 30 days"
  }
  ```

### Summary
- **GET** `/api/summary` - Comprehensive cost and anomaly summary
  ```json
  {
    "total_cost": 45250.75,
    "costs_by_service": {...},
    "anomaly_summary": {...},
    "trend": {...},
    "period": "Last 30 days",
    "currency": "USD"
  }
  ```

---

## 🎯 Features

### Current Features (MVP)
- ✅ Real-time cost dashboard with key metrics
- ✅ Interactive cost trend chart (Chart.js)
- ✅ Anomaly detection with severity levels
- ✅ Cost breakdown by service
- ✅ Health check endpoint
- ✅ CORS-enabled REST API
- ✅ Responsive UI design
- ✅ Mock data generation
- ✅ Tab-based navigation

### Anomaly Detection Algorithm
The system uses **statistical analysis** to detect anomalies:
1. Calculates average cost per service
2. Computes standard deviation
3. Flags costs > 1.5σ from mean as anomalies
4. Classifies severity based on deviation magnitude

### Mock Data
- **Duration:** Last 30 days
- **Services:** Compute, Storage, Networking, Database, Analytics
- **Cost Range:** $50-$300 per service per day
- **Trend:** Slight increase in Compute costs for realistic patterns

---

## 🔧 Configuration

### Backend Configuration (`backend/config.py`)
```python
FLASK_ENV = 'development'          # Environment mode
DEBUG = True                       # Debug mode
SECRET_KEY = 'dev-secret-key'     # Session secret (change in production)
CORS_ORIGINS = [...]              # Allowed origins
AZURE_SUBSCRIPTION_ID = '...'     # Azure subscription (mocked)
```

### Frontend Configuration (`frontend/vite.config.js`)
- Dev server on port 5173
- API proxy to backend at /api
- Hot module replacement enabled

---

## 📊 Dashboard Components

### Dashboard.jsx
Main component that:
- Fetches and manages all data
- Displays key metrics
- Handles tab navigation
- Shows service cost breakdown

### CostChart.jsx
Visualizes:
- Daily cost trend line
- Average cost reference line
- Responsive Chart.js implementation
- Interactive tooltips

### AnomalyList.jsx
Displays:
- Anomaly summary statistics
- Detailed anomaly table
- Severity badges (High/Medium/Low)
- Cost deviation percentages

---

## 🔮 Future Enhancements

### Phase 2: Real Azure Integration
- [ ] Authenticate with Azure Service Principal
- [ ] Fetch real cost data from Azure Cost Management API
- [ ] Real-time billing data synchronization
- [ ] Support for multiple subscriptions

### Phase 3: Advanced Features
- [ ] User authentication and authorization
- [ ] Persistent data storage (SQLite/PostgreSQL)
- [ ] Budget alerts and notifications
- [ ] Historical data analysis and predictions
- [ ] Machine learning-based anomaly detection
- [ ] Custom reporting and exports
- [ ] Cost optimization recommendations

### Phase 4: DevOps & Deployment
- [ ] Docker containerization
- [ ] Kubernetes deployment configs
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Production-grade logging
- [ ] Monitoring and observability

---

## 🧪 Testing

### Backend Testing
```bash
# Unit tests for anomaly detection
python -m pytest tests/

# Manual API testing
curl http://localhost:5000/api/costs
curl http://localhost:5000/api/anomalies
```

### Frontend Testing
```bash
# Run with npm test (when configured)
npm run test
```

---

## 📝 Development Notes

### Adding New Services
1. Update `azure_cost_service.py` to include new service data
2. Modify cost generation logic in `generate_mock_cost_data()`
3. Frontend automatically adapts to new services

### Modifying Anomaly Detection
1. Edit `services/anomaly_detection.py`
2. Adjust threshold multiplier (currently 1.5σ)
3. Add custom severity rules as needed

### API Expansion
1. Add new routes in `routes/cost_routes.py`
2. Register new blueprints in `app.py`
3. Update frontend API client in `src/services/api.js`

---

## 🐛 Troubleshooting

### Backend Issues

**Port Already in Use**
```bash
# Find process on port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

**Module Not Found Error**
```bash
# Verify virtual environment is activated
which python  # Should show venv path

# Reinstall dependencies
pip install -r requirements.txt --upgrade
```

### Frontend Issues

**Port 5173 in Use**
```bash
npm run dev -- --port 5174
```

**API Connection Error**
- Verify backend is running on port 5000
- Check CORS settings in `backend/config.py`
- Verify API proxy in `frontend/vite.config.js`

**Module Not Found**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

---

## 📚 Additional Resources

### Azure Cost Management
- [Azure Cost Management API Documentation](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/)
- [Azure Service Principal Setup](https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal)

### Flask Documentation
- [Flask Official Docs](https://flask.palletsprojects.com/)
- [Flask-CORS](https://flask-cors.readthedocs.io/)

### React & Vite
- [React Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Chart.js Documentation](https://www.chartjs.org/)

---

## 📄 License

This project is provided as-is for educational and demonstration purposes.

---

## 👨‍💻 Author & Support

**Project:** Intelligent Cloud Cost Behaviour Analytics and Anomaly Detection
**Version:** 1.0.0 (MVP)
**Last Updated:** December 29, 2025

For issues, suggestions, or contributions, please refer to the repository guidelines.

---

## 🎓 Learning Outcomes

This project demonstrates:
- ✅ Full-stack web application development
- ✅ REST API design and implementation
- ✅ React functional components and hooks
- ✅ Data visualization with Chart.js
- ✅ Statistical anomaly detection
- ✅ Responsive web design
- ✅ Frontend-backend integration
- ✅ Configuration management
- ✅ Error handling and user feedback

---

**Happy analyzing your cloud costs!** ☁️📊
