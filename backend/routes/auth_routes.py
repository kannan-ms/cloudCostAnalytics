"""
Authentication Routes
Handles user registration, login, and token verification
"""

from flask import Blueprint, jsonify, request
from services.user_service import (
    create_user,
    authenticate_user,
    generate_token,
    verify_token,
    get_all_users
)

auth_routes = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_routes.route('/register', methods=['POST'])
def register():
    """
    Register a new user.
    Expected JSON: { "name": "...", "email": "...", "password": "...", "confirmPassword": "..." }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract fields
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        confirm_password = data.get('confirmPassword', '')
        
        # Check for required fields
        if not all([name, email, password, confirm_password]):
            return jsonify({
                'error': 'All fields are required',
                'fields': ['name', 'email', 'password', 'confirmPassword']
            }), 400
        
        # Check if passwords match
        if password != confirm_password:
            return jsonify({'error': 'Passwords do not match'}), 400
        
        # Create user
        success, result = create_user(name, email, password)
        
        if not success:
            return jsonify({'error': result}), 400
        
        # Generate token
        token = generate_token(result)
        
        return jsonify({
            'message': 'Registration successful',
            'user': result,
            'token': token
        }), 201
    
    except Exception as e:
        return jsonify({
            'error': 'Registration failed',
            'message': str(e)
        }), 500


@auth_routes.route('/login', methods=['POST'])
def login():
    """
    Login user.
    Expected JSON: { "email": "...", "password": "..." }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({
                'error': 'Email and password are required'
            }), 400
        
        # Authenticate user
        success, result = authenticate_user(email, password)
        
        if not success:
            return jsonify({'error': result}), 401
        
        # Generate token
        token = generate_token(result)
        
        return jsonify({
            'message': 'Login successful',
            'user': result,
            'token': token
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Login failed',
            'message': str(e)
        }), 500


@auth_routes.route('/verify', methods=['GET'])
def verify():
    """
    Verify JWT token.
    Expected header: Authorization: Bearer <token>
    """
    try:
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'error': 'No token provided'}), 401
        
        # Extract token from "Bearer <token>"
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'error': 'Invalid token format'}), 401
        
        token = parts[1]
        
        # Verify token
        success, result = verify_token(token)
        
        if not success:
            return jsonify({'error': result}), 401
        
        return jsonify({
            'valid': True,
            'user': result
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Token verification failed',
            'message': str(e)
        }), 500


@auth_routes.route('/me', methods=['GET'])
def get_current_user():
    """
    Get current user information from token.
    Expected header: Authorization: Bearer <token>
    """
    try:
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'error': 'No token provided'}), 401
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'error': 'Invalid token format'}), 401
        
        token = parts[1]
        
        # Verify token
        success, result = verify_token(token)
        
        if not success:
            return jsonify({'error': result}), 401
        
        return jsonify({
            'user': result
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Failed to get user information',
            'message': str(e)
        }), 500


@auth_routes.route('/users', methods=['GET'])
def list_users():
    """
    Get all users (admin endpoint - should be protected in production).
    """
    try:
        users = get_all_users()
        return jsonify({
            'users': users,
            'count': len(users)
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Failed to retrieve users',
            'message': str(e)
        }), 500


# Password validation endpoint for client-side validation feedback
@auth_routes.route('/validate-password', methods=['POST'])
def validate_password_endpoint():
    """
    Validate password strength without creating user.
    Expected JSON: { "password": "..." }
    """
    from services.user_service import validate_password
    
    try:
        data = request.get_json()
        password = data.get('password', '')
        
        is_valid, error = validate_password(password)
        
        if is_valid:
            return jsonify({
                'valid': True,
                'message': 'Password meets requirements'
            }), 200
        else:
            return jsonify({
                'valid': False,
                'error': error
            }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Validation failed',
            'message': str(e)
        }), 500


# Email validation endpoint for client-side validation feedback
@auth_routes.route('/validate-email', methods=['POST'])
def validate_email_endpoint():
    """
    Validate email format and check availability.
    Expected JSON: { "email": "..." }
    """
    from services.user_service import validate_email, email_exists
    
    try:
        data = request.get_json()
        email = data.get('email', '').strip()
        
        is_valid, error = validate_email(email)
        
        if not is_valid:
            return jsonify({
                'valid': False,
                'error': error
            }), 200
        
        if email_exists(email):
            return jsonify({
                'valid': False,
                'error': 'Email already registered'
            }), 200
        
        return jsonify({
            'valid': True,
            'message': 'Email is available'
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Validation failed',
            'message': str(e)
        }), 500
