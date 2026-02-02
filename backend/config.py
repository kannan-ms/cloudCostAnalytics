import os
from datetime import timedelta

class Config:
    """Base configuration for the Flask application."""
    
    # Flask settings
    FLASK_ENV = 'development'
    DEBUG = True
    SECRET_KEY = 'dev-secret-key-change-in-production-make-it-strong'
    
    # CORS settings
    CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174']
    
    # MongoDB Atlas Configuration
    MONGODB_URI = 'mongodb+srv://dbuser:kavin2021@cloudcluster.r4u5spe.mongodb.net/?retryWrites=true&w=majority&appName=cloudCluster'
    DATABASE_NAME = 'cloud_cost_analytics'
    
    # JWT Configuration
    JWT_SECRET_KEY = 'f1cd69f6cb718705de261a15c3b52ef2d28fbfc36c4050453633e0e10f45d6a8'
    JWT_EXPIRATION_DELTA = timedelta(days=7)
    JWT_ALGORITHM = 'HS256'
    
    # Password hashing
    BCRYPT_LOG_ROUNDS = 12
    
    # Pagination
    DEFAULT_PAGE_SIZE = 50
    MAX_PAGE_SIZE = 100

if __name__ == '__main__':
    print(f"Config loaded successfully")
    print(f"Database: {Config.DATABASE_NAME}")
    print(f"Environment: {Config.FLASK_ENV}")
    print(f"CORS Origins: {Config.CORS_ORIGINS}")
