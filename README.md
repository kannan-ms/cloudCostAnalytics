

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
- Route-level and view-level lazy loading (React.lazy + Suspense)
- Manual vendor chunk splitting via Vite Rollup config

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
│       │   ├── analysis/
│       │   ├── anomaly/
│       │   ├── auth/
│       │   ├── budget/
│       │   ├── charts/
│       │   ├── dashboard/
│       │   ├── forecast/
│       │   ├── integration/
│       │   ├── layout/
│       │   ├── recommendations/
│       │   └── reports/
│       ├── services/
│       └── utils/

````

---

## Frontend Performance Notes

- Routes and major dashboard views are lazy loaded to reduce initial bundle cost.
- Advanced forecast analysis is loaded only when the panel is expanded.
- Vite manual chunking separates core React, chart libraries, and utility vendors.

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

CloudInsight includes a cost forecasting pipeline that predicts future cloud spend from historical billing data to support proactive budgeting and capacity planning.

Current forecasting methods in this project:

* Prophet model (primary)
* Linear Regression fallback (when Prophet is unavailable)

The additive forecasting form is:

$$
y(t) = g(t) + s(t) + e(t)
$$

Where:

* $g(t)$ captures long-term trend (growth or decline)
* $s(t)$ captures recurring seasonal behavior (for example, weekly effects)
* $e(t)$ captures residual noise

For each forecast point, the system returns:

* Predicted cost
* Lower and upper confidence bounds
* Trend label (increasing, decreasing, stable)
* Model confidence score

To keep forecasts realistic, negative predictions are clipped to zero and historical data is aggregated by selected granularity (daily, weekly, monthly).

Recommended validation additions for documentation/reporting:

* Evaluate forecast quality with MAE, RMSE, and MAPE on a holdout window
* Compare forecasted and actual cost curves using rolling backtesting
* Track model drift and retrain periodically when error exceeds an agreed threshold
* Document known limitations (sudden architectural changes, one-time billing events, or missing tags can reduce accuracy)

Suggested baseline target values (can be tuned per organization):

| Metric | Suggested Target | Notes |
|---|---|---|
| Forecast MAPE (30-day horizon) | <= 15% | Good baseline for aggregated daily cloud spend forecasting |
| Forecast RMSE | <= 12% of mean daily cost | Normalized RMSE target to handle different account sizes |
| Forecast refresh frequency | Every 24 hours | Increase to 6-12 hours for highly dynamic workloads |
| Forecast bias (mean error) | Between -5% and +5% | Helps ensure the model does not consistently under- or over-predict |
| Forecast interval coverage (95% interval) | 90%-95% | Share of actual values inside forecast confidence bounds |
| Backtesting window | Last 90 days (rolling) | Evaluate stability across recent billing cycles |
| Retraining trigger | MAPE > 20% for 2 consecutive runs | Practical drift threshold for scheduled model refresh |

These are forecasting-focused reference benchmarks for academic and project documentation. Final production thresholds should be calibrated using your actual billing volatility and business risk tolerance.

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

## 2.4 Non-Functional Requirements

### Performance

- The system should ingest, preprocess, and analyze billing data within operationally acceptable latency for interactive use.
- Dashboard pages, charts, and reports should render quickly enough to support near real-time monitoring and decision-making.
- API endpoints for core workflows (ingestion, cost summary, anomaly detection, forecasting) should be optimized to avoid noticeable user delay under normal load.

### Scalability

- The platform must support growth in billing records across AWS, Azure, and GCP without significant throughput degradation.
- The architecture should support horizontal scaling (multiple service instances) and vertical scaling (resource upgrades) based on workload.
- Data pipelines should support partitioning and batching strategies for large datasets.
- Caching should be applied to repeated read-heavy analytics queries to improve responsiveness.
- The design should allow onboarding of additional cloud providers with minimal changes to existing modules.

### Reliability

- Identical input data should produce consistent and repeatable analytics, anomaly, and forecast outputs (within model tolerance).
- The system should maintain high availability and graceful degradation during partial service failures.
- Scheduled ingestion, monitoring, and analysis jobs should execute reliably with retry and failure-notification mechanisms.
- Centralized error handling and structured logging must be implemented for observability and incident diagnosis.
- Backup and recovery procedures must be defined and periodically validated to minimize data loss risk.

### Accuracy

- Anomaly detection should be tuned to minimize false positives and false negatives while preserving practical sensitivity.
- Models should be trained and validated on diverse, representative datasets across providers and spending patterns.
- Forecast outputs should be evaluated against historical trends using standard error metrics (for example, MAE, RMSE, or MAPE).
- Periodic model evaluation and retraining should be performed to prevent performance drift.
- Data preprocessing and feature engineering must remain consistent and validated to preserve model quality.

### Usability

- The dashboard must be intuitive for both technical and non-technical users.
- Visualizations should clearly communicate spend trends, anomalies, and forecasted values.
- Users should be able to filter and customize views by provider, account, service, and time range.
- Important actions and states should include contextual guidance (tooltips, labels, and empty-state messaging).
- Documentation should cover setup, workflows, and troubleshooting for efficient onboarding.

### Security

- Secrets (API keys, tokens, credentials) must be encrypted at rest and protected in transit using HTTPS/TLS.
- Authentication should enforce strong credential and token practices.
- Authorization should follow role-based access control (RBAC) to enforce least privilege.
- Security logging, audit trails, and activity monitoring should be enabled for sensitive operations.
- Regular vulnerability scanning, dependency checks, and security reviews should be part of the release process.

### Maintainability

- The codebase should follow a modular, loosely coupled architecture with clear service boundaries.
- Coding standards, linting, and documentation should be enforced to improve long-term readability and supportability.
- New features and refactors should preserve backward compatibility for stable APIs where required.
- Version control and review workflows (branching, pull requests, code review) should govern all production changes.
- Automated testing (unit, integration, and regression) should be used to detect breakage and ensure safe updates.

---

Future Improvements

* Docker support
* CI/CD pipelines
* Role-based access control
* Unit and integration testing
* Async processing with Redis

---

## Platform Comparison

The following table compares CloudInsight with commonly used cloud cost management platforms.

| Platform | Multi-Cloud Coverage (AWS/Azure/GCP) | Cost Visibility and Reporting | Budgeting and Alerts | Anomaly Detection | Forecasting | Deployment and Setup Complexity | Best Fit |
|---|---|---|---|---|---|---|---|
| CloudInsight (This Project) | Yes | Detailed dashboards, service-level trends, downloadable reports | Yes, budget tracking with alerts | ML-driven (Isolation Forest plus rule-based spike checks) | ML-based (Prophet with Linear Regression fallback) | Moderate; self-hosted Flask + React + MongoDB setup | Teams needing customizable, ML-enabled FinOps without enterprise platform lock-in |
| CloudHealth by VMware | Yes | Strong enterprise reporting and policy views | Yes | Available, typically policy and rule oriented | Available, enterprise-focused planning features | High; enterprise-grade onboarding and governance configuration | Large enterprises with mature cloud governance programs |
| Datadog Cloud Cost Management | Yes | Strong cost analytics integrated with observability data | Yes | Available through monitoring and alerting workflows | Available, often tied to broader observability workflows | Moderate to high; depends on existing Datadog adoption | Organizations already standardized on Datadog |
| Apptio Cloudability | Yes | Strong financial allocation, chargeback, and cost analysis | Yes | Mostly rule-driven compared with ML-first anomaly pipelines | Forecasting available, typically finance workflow oriented | High; enterprise setup, governance, and process integration | Finance-led enterprise FinOps teams |
| Flexera One (Cloud Cost Optimization) | Yes | Strong optimization and governance reporting | Yes | Available through optimization and policy engines | Available, optimization-focused | High; enterprise integration and policy setup effort | Large enterprises with complex license and cloud estates |
| Kubecost | Partial (primarily Kubernetes workloads) | Strong Kubernetes cost and allocation visibility | Yes, Kubernetes-centric | Limited outside Kubernetes-specific contexts | Basic forecasting relative to enterprise FinOps suites | Low to moderate for Kubernetes environments | Teams focused on Kubernetes cost management |
| Native Cloud Tools (AWS Cost Explorer, Azure Cost Management, GCP Billing) | Single provider per tool | Good provider-native reporting | Basic to moderate, provider dependent | Basic threshold and rule alerts | Basic forecasting and trend projections | Low to moderate; easiest within each provider | Teams operating mostly in one cloud provider |

### Key Takeaways

- CloudInsight differentiates with ML-first anomaly detection and forecasting while remaining deployable as a custom full-stack application.
- Enterprise suites provide broader governance depth but usually require greater setup effort and higher licensing cost.
- Native provider tools are usef

---

Summary

CloudInsight enables users to monitor cloud costs, detect anomalies, forecast spending, and optimize resource usage.

