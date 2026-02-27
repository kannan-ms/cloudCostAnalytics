"""
Feature Engineering for Anomaly Detection
Provides reusable functions for creating time-series features.
"""

import pandas as pd
import numpy as np

def create_time_series_features(df: pd.DataFrame, cost_col: str = 'cost', date_col: str = 'date') -> pd.DataFrame:
    """
    Generate time-series features for anomaly detection.
    
    Args:
        df: DataFrame with date and cost columns (must be sorted by date per service)
        cost_col: Name of cost column
        date_col: Name of date column
        
    Returns:
        DataFrame with new feature columns
    """
    # Ensure date is datetime
    if not pd.api.types.is_datetime64_any_dtype(df[date_col]):
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    
    # Sort by date
    df = df.sort_values(date_col).copy()
    
    # 1. Lags
    df['lag_1'] = df[cost_col].shift(1)
    df['lag_7'] = df[cost_col].shift(7)
    
    # 2. Rolling Statistics (window=7 on shifted data for NO LEAKAGE)
    # We use shift(1) so rolling_mean for today is based on yesterday backwards
    df['rolling_mean_7'] = df[cost_col].shift(1).rolling(window=7).mean()
    df['rolling_std_7'] = df[cost_col].shift(1).rolling(window=7).std()
    
    # 3. Relative Features (Ratios)
    epsilon = 1e-5
    df['cost_ratio_1'] = df[cost_col] / (df['lag_1'] + epsilon)
    df['cost_ratio_7'] = df[cost_col] / (df['rolling_mean_7'] + epsilon)
    
    # 4. Temporal Features
    df['day_of_week'] = df[date_col].dt.dayofweek
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    
    # 5. Drop NaN values created by lags and rolling windows
    df = df.dropna().copy()
    
    return df

def get_feature_columns() -> list:
    """Return the list of feature column names used for training."""
    return [
        'cost', 
        'lag_1', 
        'lag_7', 
        'rolling_mean_7', 
        'rolling_std_7', 
        'cost_ratio_1', 
        'cost_ratio_7', 
        'is_weekend'
    ]
