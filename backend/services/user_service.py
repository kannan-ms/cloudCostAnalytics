"""
User Service - Handle user management and authentication with MongoDB
"""

import re
import bcrypt
import jwt
import logging
from datetime import datetime, timedelta
from bson import ObjectId
from database import get_collection, Collections
from schemas import User
from config import Config

logger = logging.getLogger(__name__)


def validate_email(email):
    """
    Validate email format.
    Returns (is_valid, error_message)
    """
    if not email:
        return False, "Email is required"
    
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return False, "Invalid email format"
    
    if len(email) > 255:
        return False, "Email is too long"
    
    return True, None


def validate_password(password):
   
    if not password:
        return False, "Password is required"
    
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if len(password) > 128:
        return False, "Password is too long (max 128 characters)"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>\-_+=\[\];~/\\]', password):
        return False, "Password must contain at least one special character"
    
    return True, None


def validate_name(name):
    """
    Validate user name.
    Returns (is_valid, error_message)
    """
    if not name:
        return False, "Name is required"
    
    if len(name) < 2:
        return False, "Name must be at least 2 characters long"
    
    if len(name) > 100:
        return False, "Name is too long (max 100 characters)"
    
    if not re.match(r"^[a-zA-Z\s\-']+$", name):
        return False, "Name can only contain letters, spaces, hyphens, and apostrophes"
    
    return True, None


def hash_password(password):
    """Hash password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(Config.BCRYPT_LOG_ROUNDS)).decode('utf-8')


def check_password(password, password_hash):
    """Verify password against hash."""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def email_exists(email):
    """Check if email already exists in database."""
    users_collection = get_collection(Collections.USERS)
    return users_collection.find_one({"email": email.lower()}) is not None


def get_user_by_email(email):
    """Get user by email address."""
    users_collection = get_collection(Collections.USERS)
    return users_collection.find_one({"email": email.lower()})


def get_user_by_id(user_id):
    """Get user by ID."""
    try:
        users_collection = get_collection(Collections.USERS)
        return users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception as e:
        logger.exception("Error in get_user_by_id")
        return None


def create_user(name, email, password):
    """
    Create a new user with validation.
    Returns (success, user_data_or_error_message)
    """
    logger.info(f"[CREATE_USER] Starting for {email}")
    
    # Validate name
    is_valid, error = validate_name(name)
    if not is_valid:
        return False, error
    
    # Validate email
    is_valid, error = validate_email(email)
    if not is_valid:
        return False, error
    
    # Check if email already exists
    if email_exists(email):
        return False, "Email already registered"
    
    # Validate password
    is_valid, error = validate_password(password)
    if not is_valid:
        return False, error
    
    # Hash password
    password_hash = hash_password(password)
    
    # Create user document
    user_doc = User.create_document(name.strip(), email, password_hash)
    
    # Skip email verification - mark user as verified immediately
    user_doc['is_verified'] = True
    user_doc['verified_at'] = datetime.utcnow()

    # Insert into database
    users_collection = get_collection(Collections.USERS)
    result = users_collection.insert_one(user_doc)
    
    logger.info(f"[CREATE_USER] User {email} created and automatically verified (email verification skipped)")
    
    # Return user without password
    return True, {
        'id': str(result.inserted_id),
        'name': user_doc['name'],
        'email': user_doc['email'],
        'created_at': user_doc['created_at'].isoformat()
    }


def authenticate_user(email, password):
    """
    Authenticate user with email and password.
    Returns (success, user_data_or_error_message)
    """
    if not email or not password:
        return False, "Email and password are required"
    
    user = get_user_by_email(email)
    
    if not user:
        return False, "Invalid email or password"
    
    # Check if password_hash exists and is valid
    if 'password_hash' not in user or not user['password_hash']:
        return False, "Invalid account data. Please contact support."
    
    try:
        if not check_password(password, user['password_hash']):
            return False, "Invalid email or password"
    except Exception as e:
        # Handle malformed password hash
        logger.exception("Password check error")
        return False, "Invalid account data. Please contact support."
    
    # Check if user is verified (legacy users without field are considered verified)
    if not user.get('is_verified', True):
        return False, "verify_required"
    
    # Update last login
    users_collection = get_collection(Collections.USERS)
    users_collection.update_one(
        {"_id": user['_id']},
        {"$set": {"updated_at": datetime.utcnow()}}
    )
    
    # Return user without password
    return True, {
        'id': str(user['_id']),
        'name': user['name'],
        'email': user['email'],
        'created_at': user.get('created_at', datetime.utcnow()).isoformat() if isinstance(user.get('created_at'), datetime) else str(user.get('created_at', ''))
    }


def generate_token(user_data):
    """Generate JWT token for authenticated user."""
    payload = {
        'user_id': user_data['id'],
        'email': user_data['email'],
        'name': user_data['name'],
        'exp': datetime.utcnow() + Config.JWT_EXPIRATION_DELTA
    }
    
    token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm=Config.JWT_ALGORITHM)
    return token


def verify_token(token):
    """
    Verify JWT token and return user data.
    Returns (success, user_data_or_error_message)
    """
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITHM])
        user = get_user_by_id(payload['user_id'])
        
        if not user:
            return False, "User not found"
        
        return True, {
            'id': str(user['_id']),
            'name': user['name'],
            'email': user['email']
        }
    except jwt.ExpiredSignatureError:
        return False, "Token has expired"
    except jwt.InvalidTokenError:
        return False, "Invalid token"


def get_all_users():
    """Get all users (without passwords) - for admin purposes."""
    users_collection = get_collection(Collections.USERS)
    users = list(users_collection.find())
    return [User.sanitize(user) for user in users]


def verify_user_otp(email, otp):
    """
    Verify the OTP for a user during registration.
    """
    if not email or not otp:
        return False, "Email and OTP are required", None
        
    user = get_user_by_email(email)
    if not user:
        return False, "User not found", None
        
    if user.get('is_verified'):
        return False, "User is already verified", None
        
    if user.get('otp_code') != otp:
        return False, "Invalid verification code", None
        
    if not user.get('otp_expires_at') or datetime.utcnow() > user['otp_expires_at']:
        return False, "Verification code has expired. Please request a new one.", None
        
    # Mark as verified
    users_collection = get_collection(Collections.USERS)
    users_collection.update_one(
        {"_id": user['_id']},
        {"$set": {
            "is_verified": True, 
            "otp_code": None, 
            "otp_expires_at": None,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Return user data for token generation
    return True, "Verification successful", {
        'id': str(user['_id']),
        'name': user['name'],
        'email': user['email'],
        'created_at': user.get('created_at', datetime.utcnow()).isoformat() if isinstance(user.get('created_at'), datetime) else str(user.get('created_at', ''))
    }


def resend_user_otp(email):
    """
    Resend a new OTP to the user.
    """
    if not email:
        return False, "Email is required"

    if not is_email_configured():
        logger.warning("Cannot resend OTP: Email not configured")
        return False, "Email service not available. Please try again later or contact support."
        
    user = get_user_by_email(email)
    if not user:
        return False, "User not found"
        
    if user.get('is_verified'):
        return False, "User is already verified"
        
    import random
    otp_code = f"{random.randint(100000, 999999)}"
    
    users_collection = get_collection(Collections.USERS)
    users_collection.update_one(
        {"_id": user['_id']},
        {"$set": {
            "otp_code": otp_code,
            "otp_expires_at": datetime.utcnow() + timedelta(minutes=15),
            "updated_at": datetime.utcnow()
        }}
    )
    
    try:
        send_verification_email(user['email'], user['name'], otp_code)
    except Exception as exc:
        return False, f"Failed to send verification email: {str(exc)}"
    
    return True, "Code sent successfully"
