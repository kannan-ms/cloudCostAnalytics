"""
Model Loader for Anomaly Detection
Provides functions to load trained models and scalers.
"""

import os
import joblib
import logging

# Define model path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, 'models')

def load_model(service_name: str, user_id: str = None):
    """
    Load saved Isolation Forest model for a specific service.
    
    Args:
        service_name: Name of the cloud service (e.g., 'Amazon EC2')
        user_id: Optional User ID (kept for compatibility, but not used in file path)
        
    Returns:
        model: Loaded scikit-learn model or None
    """
    try:
        # Sanitize filename
        safe_service = "".join([c if c.isalnum() else "_" for c in service_name])
        # File naming convention: {service}_model.pkl (Simplified for offline training)
        model_path = os.path.join(MODELS_DIR, f"{safe_service}_model.pkl")
        
        if os.path.exists(model_path):
            return joblib.load(model_path)
        return None
    except Exception as e:
        logging.error(f"Error loading model for {service_name}: {e}")
        return None

def load_scaler(service_name: str, user_id: str = None):
    """
    Load saved scaler for a specific service.
    
    Args:
        service_name: Name of the cloud service
        user_id: Optional User ID
        
    Returns:
        scaler: Loaded StandardScaler or None
    """
    try:
        # Sanitize filename
        safe_service = "".join([c if c.isalnum() else "_" for c in service_name])
        scaler_path = os.path.join(MODELS_DIR, f"{safe_service}_scaler.pkl")
        
        if os.path.exists(scaler_path):
            return joblib.load(scaler_path)
        return None
    except Exception as e:
        logging.error(f"Error loading scaler for {service_name}: {e}")
        return None

def save_model_artifacts(model, scaler, service_name: str, user_id: str):
    """
    Save trained model and scaler to disk.
    
    Args:
        model: Trained Isolation Forest model
        scaler: Fitted StandardScaler
        service_name: Name of the service
        user_id: User ID
    """
    if not os.path.exists(MODELS_DIR):
        os.makedirs(MODELS_DIR)
        
    try:
        safe_service = "".join([c if c.isalnum() else "_" for c in service_name])
        
        # Save Model
        model_path = os.path.join(MODELS_DIR, f"{user_id}_{safe_service}_model.pkl")
        joblib.dump(model, model_path)
        
        # Save Scaler
        scaler_path = os.path.join(MODELS_DIR, f"{user_id}_{safe_service}_scaler.pkl")
        joblib.dump(scaler, scaler_path)
        
        return True
    except Exception as e:
        logging.error(f"Error saving model for {service_name}: {e}")
        return False
