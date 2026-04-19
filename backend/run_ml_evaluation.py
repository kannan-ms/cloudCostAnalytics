"""
ML Models Evaluation Report
Comprehensive evaluation of Isolation Forest (anomaly detection) and Prophet (forecasting)
on the billing dataset with full metrics and visualizations.
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    precision_score, recall_score, f1_score, 
    roc_auc_score, confusion_matrix, roc_curve,
    classification_report
)
from prophet import Prophet
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_error, mean_absolute_error

print("=" * 90)
print("ML MODELS EVALUATION - BILLING DATASET ANALYSIS")
print("=" * 90)

# ============================================================================
# PART 1: LOAD AND PREPARE DATA
# ============================================================================
print("\n📊 STEP 1: Loading Billing Dataset...")

dataset_path = os.path.join(os.path.dirname(__file__), 'dataSet', 'azureDataset.csv')

try:
    df = pd.read_csv(dataset_path)
    print(f"✅ Dataset loaded: {len(df)} records, {len(df.columns)} columns")
    print(f"   Columns: {list(df.columns)[:10]}...")
except Exception as e:
    print(f"❌ Error loading dataset: {e}")
    sys.exit(1)

# Normalize column names
df.columns = [col.lower().strip() for col in df.columns]

# Find cost and date columns
cost_cols = [col for col in df.columns if 'cost' in col.lower()]
date_cols = [col for col in df.columns if 'date' in col.lower()]

cost_col = cost_cols[0] if cost_cols else None
date_col = date_cols[0] if date_cols else None

if not cost_col or not date_col:
    print(f"❌ Could not find cost or date columns")
    print(f"   Available columns: {df.columns.tolist()}")
    sys.exit(1)

print(f"   Cost column: {cost_col}")
print(f"   Date column: {date_col}")

# Prepare data
df_prep = df.copy()
df_prep[cost_col] = pd.to_numeric(df_prep[cost_col], errors='coerce')
df_prep[date_col] = pd.to_datetime(df_prep[date_col], errors='coerce')
df_prep = df_prep.dropna(subset=[cost_col, date_col])

# Aggregate daily costs
daily_costs = df_prep.groupby(df_prep[date_col].dt.date)[cost_col].sum().reset_index()
daily_costs.columns = ['date', 'cost']
daily_costs['date'] = pd.to_datetime(daily_costs['date'])
daily_costs = daily_costs.sort_values('date').reset_index(drop=True)

print(f"✅ Daily aggregation: {len(daily_costs)} days of data")
print(f"   Date range: {daily_costs['date'].min().date()} to {daily_costs['date'].max().date()}")
print(f"   Cost range: ${daily_costs['cost'].min():.2f} - ${daily_costs['cost'].max():.2f}")

# ============================================================================
# PART 2: ISOLATION FOREST - ANOMALY DETECTION
# ============================================================================
print("\n" + "=" * 90)
print("ISOLATION FOREST - ANOMALY DETECTION EVALUATION")
print("=" * 90)

print("\n📋 STEP 2: Training Isolation Forest Model...")

# Create features for anomaly detection
X = daily_costs[['cost']].values
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Train Isolation Forest
iso_forest = IsolationForest(
    contamination=0.1,  # Expect ~10% anomalies
    random_state=42
)

# Get predictions (-1 = anomaly, 1 = normal)
predictions = iso_forest.fit_predict(X_scaled)
anomaly_scores = iso_forest.score_samples(X_scaled)

# Convert to binary (1 = anomaly, 0 = normal)
y_pred = (predictions == -1).astype(int)

print(f"✅ Model trained successfully")
print(f"   Anomalies detected: {y_pred.sum()} out of {len(y_pred)} records ({y_pred.sum()/len(y_pred)*100:.1f}%)")

# Create synthetic labels for evaluation (threshold-based)
# Anomalies = costs in top 10% or bottom 10%
cost_q90 = daily_costs['cost'].quantile(0.90)
cost_q10 = daily_costs['cost'].quantile(0.10)
y_true_anomaly = ((daily_costs['cost'] > cost_q90) | (daily_costs['cost'] < cost_q10)).astype(int)

print(f"   Ground truth anomalies: {y_true_anomaly.sum()} (top/bottom 10% cost threshold)")

# Calculate metrics
try:
    precision = precision_score(y_true_anomaly, y_pred, zero_division=0)
    recall = recall_score(y_true_anomaly, y_pred, zero_division=0)
    f1 = f1_score(y_true_anomaly, y_pred, zero_division=0)
    
    print("\n📊 ISOLATION FOREST METRICS:")
    print(f"   ✅ Precision: {precision:.4f}")
    print(f"   ✅ Recall: {recall:.4f}")
    print(f"   ✅ F1-Score: {f1:.4f}")
    
    # Confusion Matrix
    tn, fp, fn, tp = confusion_matrix(y_true_anomaly, y_pred).ravel()
    print(f"\n📊 CONFUSION MATRIX:")
    print(f"   True Positives:  {tp}")
    print(f"   False Positives: {fp}")
    print(f"   True Negatives:  {tn}")
    print(f"   False Negatives: {fn}")
    
    # Calculate AUC-ROC if possible
    if len(np.unique(y_true_anomaly)) > 1:
        auc_score = roc_auc_score(y_true_anomaly, anomaly_scores)
        print(f"\n📊 AUC-ROC Score: {auc_score:.4f}")
    else:
        print(f"\n⚠️  AUC-ROC: Cannot calculate (insufficient class variation)")
    
    print(f"\n📊 DETAILED CLASSIFICATION REPORT:")
    print(classification_report(y_true_anomaly, y_pred, target_names=['Normal', 'Anomaly']))
    
except Exception as e:
    print(f"⚠️  Metric calculation error: {e}")

# Visualize Isolation Forest results
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# Plot 1: Time series with anomalies highlighted
ax = axes[0, 0]
normal = daily_costs[y_pred == 0]
anomalies = daily_costs[y_pred == 1]
ax.plot(daily_costs['date'], daily_costs['cost'], 'b-', label='Daily Cost', linewidth=1)
ax.scatter(normal['date'], normal['cost'], c='green', s=20, alpha=0.6, label='Normal')
ax.scatter(anomalies['date'], anomalies['cost'], c='red', s=50, alpha=0.8, marker='X', label='Anomaly')
ax.set_xlabel('Date')
ax.set_ylabel('Cost ($)')
ax.set_title('Isolation Forest: Anomalies in Billing Data')
ax.legend()
ax.grid(True, alpha=0.3)

# Plot 2: Anomaly Scores Distribution
ax = axes[0, 1]
ax.hist(anomaly_scores[y_pred == 0], bins=20, alpha=0.7, label='Normal', color='green')
ax.hist(anomaly_scores[y_pred == 1], bins=20, alpha=0.7, label='Anomaly', color='red')
ax.set_xlabel('Anomaly Score')
ax.set_ylabel('Frequency')
ax.set_title('Anomaly Score Distribution')
ax.legend()
ax.grid(True, alpha=0.3)

# Plot 3: Confusion Matrix Heatmap
ax = axes[1, 0]
cm = confusion_matrix(y_true_anomaly, y_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=ax, 
            xticklabels=['Normal', 'Anomaly'], yticklabels=['Normal', 'Anomaly'])
ax.set_ylabel('True Label')
ax.set_xlabel('Predicted Label')
ax.set_title('Confusion Matrix - Isolation Forest')

# Plot 4: Precision-Recall
ax = axes[1, 1]
if len(np.unique(y_true_anomaly)) > 1:
    fpr, tpr, _ = roc_curve(y_true_anomaly, anomaly_scores)
    ax.plot(fpr, tpr, 'b-', label=f'ROC Curve (AUC={auc_score:.3f})')
    ax.plot([0, 1], [0, 1], 'r--', label='Random')
    ax.set_xlabel('False Positive Rate')
    ax.set_ylabel('True Positive Rate')
    ax.set_title('ROC Curve')
    ax.legend()
    ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('isolation_forest_evaluation.png', dpi=300, bbox_inches='tight')
print(f"\n✅ Isolation Forest plots saved: isolation_forest_evaluation.png")
plt.close()

# ============================================================================
# PART 3: PROPHET FORECASTING
# ============================================================================
print("\n" + "=" * 90)
print("PROPHET FORECASTING EVALUATION")
print("=" * 90)

print("\n📋 STEP 3: Training Prophet Model...")

# Prepare data for Prophet
df_prophet = daily_costs.copy()
df_prophet.columns = ['ds', 'y']  # Prophet expects 'ds' and 'y'

# Split into train and test (80/20)
split_idx = int(len(df_prophet) * 0.8)
train_df = df_prophet[:split_idx].reset_index(drop=True)
test_df = df_prophet[split_idx:].reset_index(drop=True)

print(f"   Training set: {len(train_df)} records")
print(f"   Test set: {len(test_df)} records")

# Train Prophet
try:
    model = Prophet(interval_width=0.95, yearly_seasonality=False)
    model.fit(train_df)
    print(f"✅ Prophet model trained successfully")
except Exception as e:
    print(f"❌ Prophet training failed: {e}")
    sys.exit(1)

# Make predictions on test set
future_test = test_df[['ds']].copy()
forecast_test = model.make_future_dataframe(periods=len(test_df))
forecast_test = model.predict(forecast_test)
forecast_test = forecast_test[forecast_test['ds'].isin(test_df['ds'])].reset_index(drop=True)

# Extract predictions
y_actual = test_df['y'].values
y_pred_prophet = forecast_test['yhat'].values

# Calculate metrics
mape = mean_absolute_percentage_error(y_actual, y_pred_prophet)
rmse = np.sqrt(mean_squared_error(y_actual, y_pred_prophet))
mae = mean_absolute_error(y_actual, y_pred_prophet)

print(f"\n📊 PROPHET METRICS (Test Set):")
print(f"   ✅ MAPE (Mean Absolute Percentage Error): {mape:.4f} ({mape*100:.2f}%)")
print(f"   ✅ RMSE (Root Mean Square Error): ${rmse:.2f}")
print(f"   ✅ MAE (Mean Absolute Error): ${mae:.2f}")

# Forecast future 30 days
future_30 = model.make_future_dataframe(periods=30)
forecast_30 = model.predict(future_30)

# Get last 30 days of forecast
forecast_30_only = forecast_30.tail(30).copy()

print(f"\n📊 30-DAY FORECAST (From {forecast_30_only['ds'].min().date()} to {forecast_30_only['ds'].max().date()}):")
print(f"   Average predicted daily cost: ${forecast_30_only['yhat'].mean():.2f}")
print(f"   Min predicted cost: ${forecast_30_only['yhat'].min():.2f}")
print(f"   Max predicted cost: ${forecast_30_only['yhat'].max():.2f}")

# Visualize Prophet results
fig, axes = plt.subplots(2, 1, figsize=(14, 10))

# Plot 1: Full history with forecast
ax = axes[0]
ax.plot(train_df['ds'], train_df['y'], 'b-', label='Training Data', linewidth=1)
ax.plot(test_df['ds'], test_df['y'], 'g-', label='Test Data (Actual)', linewidth=1)
ax.plot(forecast_test['ds'], forecast_test['yhat'], 'r--', label='Predictions (Test)', linewidth=1)
ax.fill_between(forecast_test['ds'], 
                forecast_test['yhat_lower'], 
                forecast_test['yhat_upper'], 
                alpha=0.2, color='red', label='Confidence Interval')
ax.set_xlabel('Date')
ax.set_ylabel('Cost ($)')
ax.set_title('Prophet: Actual vs Predicted Cost (Test Set)')
ax.legend()
ax.grid(True, alpha=0.3)

# Plot 2: 30-day forecast
ax = axes[1]
# Show last 30 days of history + 30-day forecast
history_30 = daily_costs.tail(30).copy()
ax.plot(history_30['date'], history_30['cost'], 'b-', label='Historical (30 days)', linewidth=2, marker='o')
ax.plot(forecast_30_only['ds'], forecast_30_only['yhat'], 'r-', label='Forecast (30 days)', linewidth=2, marker='s')
ax.fill_between(forecast_30_only['ds'], 
                forecast_30_only['yhat_lower'], 
                forecast_30_only['yhat_upper'], 
                alpha=0.2, color='red', label='95% Confidence Interval')
ax.set_xlabel('Date')
ax.set_ylabel('Cost ($)')
ax.set_title('Prophet: 30-Day Cost Forecast with Confidence Bounds')
ax.legend()
ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('prophet_forecasting_evaluation.png', dpi=300, bbox_inches='tight')
print(f"\n✅ Prophet plots saved: prophet_forecasting_evaluation.png")
plt.close()

# ============================================================================
# FINAL SUMMARY REPORT
# ============================================================================
print("\n" + "=" * 90)
print("EVALUATION SUMMARY REPORT")
print("=" * 90)

print(f"""
📊 DATASET STATISTICS:
   • Total records: {len(daily_costs)}
   • Date range: {daily_costs['date'].min().date()} to {daily_costs['date'].max().date()}
   • Total cost: ${daily_costs['cost'].sum():.2f}
   • Average daily cost: ${daily_costs['cost'].mean():.2f}
   • Std deviation: ${daily_costs['cost'].std():.2f}

🔍 ISOLATION FOREST (ANOMALY DETECTION):
   • Precision: {precision:.4f}
   • Recall: {recall:.4f}
   • F1-Score: {f1:.4f}
   • Anomalies detected: {y_pred.sum()}
   • True Positives: {tp}
   • False Positives: {fp}
   • False Negatives: {fn}

📈 PROPHET (FORECASTING):
   • MAPE: {mape:.4f} ({mape*100:.2f}%)
   • RMSE: ${rmse:.2f}
   • MAE: ${mae:.2f}
   • 30-day average forecast: ${forecast_30_only['yhat'].mean():.2f}

📁 GENERATED FILES:
   ✅ isolation_forest_evaluation.png
   ✅ prophet_forecasting_evaluation.png
   ✅ ml_evaluation_report.txt
""")

# Save report to file
with open('ml_evaluation_report.txt', 'w') as f:
    f.write("ML MODELS EVALUATION REPORT\n")
    f.write("=" * 80 + "\n\n")
    f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
    
    f.write("DATASET STATISTICS:\n")
    f.write(f"  Total records: {len(daily_costs)}\n")
    f.write(f"  Date range: {daily_costs['date'].min().date()} to {daily_costs['date'].max().date()}\n")
    f.write(f"  Total cost: ${daily_costs['cost'].sum():.2f}\n")
    f.write(f"  Average daily cost: ${daily_costs['cost'].mean():.2f}\n")
    f.write(f"  Std deviation: ${daily_costs['cost'].std():.2f}\n\n")
    
    f.write("ISOLATION FOREST RESULTS:\n")
    f.write(f"  Precision: {precision:.4f}\n")
    f.write(f"  Recall: {recall:.4f}\n")
    f.write(f"  F1-Score: {f1:.4f}\n")
    f.write(f"  Anomalies detected: {y_pred.sum()}\n")
    f.write(f"  True Positives: {tp}\n")
    f.write(f"  False Positives: {fp}\n")
    f.write(f"  False Negatives: {fn}\n")
    if len(np.unique(y_true_anomaly)) > 1:
        f.write(f"  AUC-ROC Score: {auc_score:.4f}\n")
    f.write("\n")
    
    f.write("PROPHET FORECASTING RESULTS:\n")
    f.write(f"  MAPE: {mape:.4f} ({mape*100:.2f}%)\n")
    f.write(f"  RMSE: ${rmse:.2f}\n")
    f.write(f"  MAE: ${mae:.2f}\n")
    f.write(f"  30-day average forecast: ${forecast_30_only['yhat'].mean():.2f}\n")

print("✅ Report saved: ml_evaluation_report.txt")
print("=" * 90)
