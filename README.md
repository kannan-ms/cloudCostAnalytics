

```markdown
# CloudInsight: Cloud Cost Analytics & Anomaly Detection

CloudInsight is a full-stack FinOps platform for analyzing multi-cloud spend (AWS, Azure, GCP), detecting anomalies, forecasting costs, tracking budgets, and generating reports.

---

## Features

- JWT-based authentication
- OTP email verification
- Multi-cloud cost ingestion:
  - CSV upload
  - Cloud provider APIs (AWS, Azure, GCP)
- Cost analytics by service, region, account
- ML-based anomaly detection
- Cost forecasting (Prophet with sklearn fallback)
- Budget tracking with alerts
- Downloadable reports (CSV, TXT, PDF)
- Optimization recommendations

---

## Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- Recharts and Chart.js
- Axios
- React Router

### Backend
- Flask
- MongoDB (PyMongo)
- JWT and bcrypt
- pandas, numpy, scikit-learn
- Prophet
- reportlab

### Cloud SDKs
- AWS: boto3
- Azure: azure-identity, azure-mgmt-costmanagement
- GCP: google-cloud-bigquery

---

## Architecture Overview

- Frontend handles UI, dashboards, and authentication
- Backend provides REST APIs and business logic
- MongoDB stores users, costs, anomalies, and budgets
- ML models are used for anomaly detection
- Ingestion layer normalizes multi-cloud data

---

## Project Structure

```

cloudProject/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── database.py
│   ├── routes/
│   ├── services/
│   ├── ml/
│   ├── models/
│   └── schemas.py
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── components/
│       ├── services/
│       └── utils/

````

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)
- SMTP credentials for OTP email verification

---

## Environment Variables

### Backend (backend/.env)

```env
FLASK_ENV=development
DEBUG=true
SECRET_KEY=your-secret

MONGODB_URI=your-mongodb-uri
DATABASE_NAME=cloud_cost_analytics

JWT_SECRET_KEY=your-jwt-secret
JWT_EXPIRATION_DAYS=7

CORS_ORIGINS=http://localhost:5173

EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email
EMAIL_PASSWORD=your-password
````

### Frontend (frontend/.env)

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Local Setup

### Backend Setup

```bash
cd backend
python -m venv .venv
```

Activate virtual environment:

```bash
# Windows
.\.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate
```

Install dependencies and run:

```bash
pip install -r requirements.txt
python app.py
```

Backend runs at [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at [http://localhost:5173](http://localhost:5173)

---

API Overview

Auth

* POST /api/auth/register
* POST /api/auth/login
* POST /api/auth/verify-otp

Costs

* POST /api/costs/ingest
* GET /api/costs/summary
* GET /api/costs/trends

Anomalies

* POST /api/anomalies/detect
* GET /api/anomalies

Forecast

* GET /api/forecasts

Budgets

* POST /api/budgets
* GET /api/budgets

Reports

* GET /api/reports/download

---

Data Flow

1. User selects cloud provider
2. Uploads CSV or connects API
3. Data is normalized into categories such as Compute, Storage, Database, Networking
4. Data is stored in MongoDB
5. Anomaly detection runs on processed data

---

Machine Learning
Forecasting

* Prophet model
* Linear Regression fallback

Anomaly Detection

* Isolation Forest
* Rolling statistics and spike detection

---

UI Screens

* Login and registration with OTP
* Dashboard
* Cost analysis
* Forecasting
* Budgets
* Reports

---
 Security

* Do not commit .env files
* Rotate secrets regularly
* Use HTTPS in production
* Restrict CORS origins

---

Future Improvements

* Docker support
* CI/CD pipelines
* Role-based access control
* Unit and integration testing
* Async processing with Redis

---

Summary

CloudInsight enables users to monitor cloud costs, detect anomalies, forecast spending, and optimize resource usage.

