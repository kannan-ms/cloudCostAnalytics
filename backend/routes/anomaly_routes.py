"""
Anomaly Routes - REST API endpoints for anomaly detection
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
from config import Config
from services import anomaly_detector, user_service

anomaly_routes = Blueprint('anomalies', __name__, url_prefix='/api/anomalies')


def token_required(f):
    """Decorator to require valid JWT token for protected routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401
        
        try:
            payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITHM])
            current_user_id = payload['user_id']
            
            user = user_service.get_user_by_id(current_user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 401
            
            return f(current_user_id, *args, **kwargs)
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        except Exception as e:
            return jsonify({'error': f'Authentication error: {str(e)}'}), 401
    
    return decorated


@anomaly_routes.route('/detect', methods=['POST'])
@token_required
def run_detection(current_user_id):
    """
    Run anomaly detection for the user.
    
    POST /api/anomalies/detect
    
    Response:
    {
        "success": true,
        "total_detected": 15,
        "stored": 12,
        "anomalies": [...],
        "breakdown": {
            "cost_spikes": 8,
            "new_services": 2,
            "continuous_increases": 5
        }
    }
    """
    try:
        success, result = anomaly_detector.run_anomaly_detection(current_user_id)
        
        if not success:
            return jsonify({'error': result}), 400
        
        return jsonify({
            'success': True,
            **result
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@anomaly_routes.route('', methods=['GET'])
@token_required
def get_anomalies(current_user_id):
    """
    Get anomalies for the user.
    
    GET /api/anomalies
    
    Query Parameters:
    - status: Filter by status (new, acknowledged, resolved, ignored)
    - severity: Filter by severity (low, medium, high)
    - limit: Maximum results (default: 50)
    
    Response:
    {
        "success": true,
        "anomalies": [...],
        "count": 15
    }
    """
    try:
        status = request.args.get('status')
        severity = request.args.get('severity')
        limit = int(request.args.get('limit', 50))
        
        if limit < 1 or limit > 200:
            return jsonify({'error': 'Limit must be between 1 and 200'}), 400
        
        success, result = anomaly_detector.get_user_anomalies(current_user_id, status, severity, limit)
        
        if not success:
            return jsonify({'error': result}), 400
        
        return jsonify({
            'success': True,
            **result
        }), 200
        
    except ValueError:
        return jsonify({'error': 'Invalid limit parameter'}), 400
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@anomaly_routes.route('/<anomaly_id>/status', methods=['PUT'])
@token_required
def update_status(current_user_id, anomaly_id):
    """
    Update anomaly status.
    
    PUT /api/anomalies/{anomaly_id}/status
    
    Request Body:
    {
        "status": "acknowledged" | "resolved" | "ignored"
    }
    
    Response:
    {
        "success": true,
        "message": "Anomaly status updated to acknowledged"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'status' not in data:
            return jsonify({'error': 'Status is required'}), 400
        
        status = data['status']
        valid_statuses = ['acknowledged', 'resolved', 'ignored']
        
        if status not in valid_statuses:
            return jsonify({'error': f'Status must be one of: {", ".join(valid_statuses)}'}), 400
        
        success, result = anomaly_detector.update_anomaly_status(current_user_id, anomaly_id, status)
        
        if not success:
            return jsonify({'error': result}), 400
        
        return jsonify({
            'success': True,
            'message': result
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500
