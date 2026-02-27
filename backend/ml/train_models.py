"""
Train ML Models for Anomaly Detection
Script to train Isolation Forest models offline using historical dataset.
"""

import sys
import os
import argparse
import logging
import glob
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest 
from sklearn.preprocessing import StandardScaler

# Add project root to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from ml.feature_engineering import create_time_series_features
from ml.category_mapper import SERVICE_CATEGORIES

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

DATA_DIR = os.path.join(BASE_DIR, 'dataSet')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

def train_and_save_models():
    """
    Train Isolation Forest models for all services using dataset files.
    Saves trained models and scalers to backend/models directory.
    """
    if not os.path.exists(MODELS_DIR):
        os.makedirs(MODELS_DIR)
        
    logging.info("Starting model training pipeline...")
    
    # 1. Load Data
    all_files = glob.glob(os.path.join(DATA_DIR, "*.csv"))
    if not all_files:
        logging.error(f"No CSV files found in {DATA_DIR}")
        return

    df_list = []
    for filename in all_files:
        try:
            temp_df = pd.read_csv(filename)
            df_list.append(temp_df)
        except Exception as e:
            logging.error(f"Error reading {filename}: {e}")
            continue
            
    if not df_list:
        logging.error("No data loaded.")
        return

    full_df = pd.concat(df_list, ignore_index=True)
    
    # 2. Preprocess & Map Columns for Multi-Cloud (Azure, AWS, GCP)
    # Define mappings for different providers
    
    # Azure
    azure_map = {
        'Date': 'date', 'UsageStartDate': 'date', 'usage_start_date': 'date',
        'MeterCategory': 'service', 'ServiceName': 'service', 'service_name': 'service',
        'CostInBillingCurrency': 'cost', 'Cost': 'cost', 'predetected_cost': 'cost'
    }
    
    # AWS (CUR - Cost & Usage Report)
    aws_map = {
        'lineItem/UsageStartDate': 'date', 'bill/BillingPeriodStartDate': 'date',
        'product/ProductName': 'service', 'lineItem/ProductCode': 'service',
        'lineItem/UnblendedCost': 'cost', 'lineItem/BlendedCost': 'cost'
    }
    
    # GCP (Billing Export)
    gcp_map = {
        'usage_start_time': 'date', 'start_time': 'date',
        'service.description': 'service', 'service_description': 'service',
        'cost': 'cost', 'usage.amount_in_pricing_units': 'cost' # varies by export type
    }
    
    # Merge all maps (priority given to specific provider if known, but auto-detection is safer here)
    combined_map = {**azure_map, **aws_map, **gcp_map}
    
    # Rename columns using the combined map
    full_df = full_df.rename(columns=combined_map)
    
    # Normalize 'service' names for better matching
    if 'service' in full_df.columns:
        full_df['service'] = full_df['service'].astype(str).str.strip()

    # SERVICE_CATEGORIES imported from services.cloud_cost_ingestion (single source of truth)

    # Check if we have the required columns
    required_cols = ['date', 'service', 'cost']
    
    if not all(col in full_df.columns for col in required_cols):
        logging.error(f"Dataset missing required columns. Requires date, service, cost. Found: {full_df.columns}")
        # Try to guess missing columns or print helpful error
        return

    # Keep only relevant columns
    full_df = full_df[required_cols].copy()

    # Convert date
    full_df['date'] = pd.to_datetime(full_df['date'], utc=True) # Use UTC for standardization
    # Remove timezone info to simplify grouping
    full_df['date'] = full_df['date'].dt.date
    full_df['date'] = pd.to_datetime(full_df['date'])
    
    # Assign Category
    # Use 'map' and fallback to 'Other' if the specific service name isn't found
    full_df['category'] = full_df['service'].map(SERVICE_CATEGORIES).fillna('Other')
    
    if 'category' not in full_df.columns:
         full_df['category'] = 'Other'

    # Group by date and CATEGORY
    # This aggregates costs from Azure VMs AND AWS EC2 into a single "Compute" bucket
    full_df = full_df.groupby(['date', 'category'])['cost'].sum().reset_index()
    
    for category in full_df['category'].unique():
        sdf = full_df[full_df['category'] == category].sort_values('date').copy()
        
        # Need minimum data (e.g. 14 days)
        if len(sdf) < 14:
            logging.warning(f"Skipping {category}: Insufficient data ({len(sdf)} days)")
            continue
            
        logging.info(f"Training model for category: {category} ({len(sdf)} samples)")
        
        try:
            # 4. Feature Engineering
            sdf = create_time_series_features(sdf, cost_col='cost', date_col='date')
            
            # 5. Split Data (Train on older than last 7 days)
            max_date = sdf['date'].max()
            split_date = max_date - timedelta(days=7)
            train_df = sdf[sdf['date'] < split_date].copy()
            
            if len(train_df) < 10:
                logging.warning(f"Skipping {category}: Insufficient training data after split")
                continue
                
            # Feature Selection
            feature_cols = [
                'cost', 'lag_1', 'lag_7', 
                'rolling_mean_7', 'rolling_std_7', 
                'cost_ratio_1', 'cost_ratio_7', 'is_weekend'
            ]
            
            X_train = train_df[feature_cols].values
            
            # 6. Normalize
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            
            # 7. Train Model
            # Use 5% contamination for robust anomaly threshold.
            # With very small datasets floor at 2/n to guarantee >=1 outlier.
            n_samples = len(X_train)
            contamination = max(0.05, 2.0 / n_samples)
            contamination = min(contamination, 0.15)  # cap at 15%
            
            clf = IsolationForest(
                contamination=contamination, 
                random_state=42, 
                n_estimators=200,
                max_features=1.0,
                n_jobs=-1
            )
            clf.fit(X_train_scaled)
            
            # 8. Save Model & Scaler (e.g. Compute_model.pkl)
            safe_name = "".join([c if c.isalnum() else "_" for c in category])
            
            model_path = os.path.join(MODELS_DIR, f"{safe_name}_model.pkl")
            scaler_path = os.path.join(MODELS_DIR, f"{safe_name}_scaler.pkl")
            
            joblib.dump(clf, model_path)
            joblib.dump(scaler, scaler_path)
            
            logging.info(f" Successfully saved model for {category}")
            
        except Exception as e:
            logging.error(f" Failed training for {category}: {e}")
            continue

if __name__ == "__main__":
    train_and_save_models()
