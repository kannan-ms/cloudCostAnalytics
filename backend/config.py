import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
# Try to load from backend directory first, then root
env_loaded = load_dotenv()
if not env_loaded:
    # Try loading from parent directory
    env_loaded = load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

class Config:
    """Base configuration for the Flask application."""
    
    # Flask settings
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production-make-it-strong')
    
    # CORS settings
    CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174']
    
    # MongoDB Atlas Configuration
    MONGODB_URI = os.getenv('MONGODB_URI')
    DATABASE_NAME = os.getenv('DATABASE_NAME', 'cloud_cost_analytics')
    
    # Validate MongoDB URI is set
    if not MONGODB_URI:
        print(" ERROR: MONGODB_URI is not set in .env file!")
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', SECRET_KEY)
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
