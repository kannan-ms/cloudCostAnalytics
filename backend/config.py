import os
from datetime import timedelta

class Config:
    """Base configuration for the Flask application."""
    
    # Flask settings
    FLASK_ENV = os.environ.get('FLASK_ENV', 'development')
    DEBUG = os.environ.get('DEBUG', os.environ.get('FLASK_DEBUG', 'true')).lower() == 'true'
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production-make-it-strong')
    
    # CORS settings
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:5173,http://localhost:5174,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:5174').split(',')
    
    # MongoDB Atlas Configuration
    MONGODB_URI = os.environ.get('MONGODB_URI', 'mongodb+srv://dbuser:kavin2021@cloudcluster.r4u5spe.mongodb.net/?retryWrites=true&w=majority&appName=cloudCluster')
    DATABASE_NAME = os.environ.get('DATABASE_NAME') or os.environ.get('MONGODB_DB_NAME') or 'cloud_cost_analytics'
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'f1cd69f6cb718705de261a15c3b52ef2d28fbfc36c4050453633e0e10f45d6a8')
    JWT_EXPIRATION_DELTA = timedelta(days=int(os.environ.get('JWT_EXPIRATION_DAYS', '7')))
    JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
    
    # Password hashing
    BCRYPT_LOG_ROUNDS = int(os.environ.get('BCRYPT_LOG_ROUNDS', '12'))
    
    # Pagination
    DEFAULT_PAGE_SIZE = int(os.environ.get('DEFAULT_PAGE_SIZE', '50'))
    MAX_PAGE_SIZE = int(os.environ.get('MAX_PAGE_SIZE', '100'))

    # Email / SMTP Configuration (use environment variables for secrets)
    EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
    EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
    EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'true').lower() == 'true'
    EMAIL_USE_SSL = os.environ.get('EMAIL_USE_SSL', 'false').lower() == 'true'
    EMAIL_USERNAME = os.environ.get('EMAIL_USERNAME', '')
    EMAIL_PASSWORD = os.environ.get('EMAIL_PASSWORD', '')
    EMAIL_FROM = os.environ.get('EMAIL_FROM', 'Cloud Cost Alerts <alerts@example.com>')
    EMAIL_COOLDOWN_MINUTES = int(os.environ.get('EMAIL_COOLDOWN_MINUTES', '10'))

if __name__ == '__main__':
    # This block is no longer needed; left intentionally empty to avoid side effects on import
