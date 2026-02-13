"""
Forecast Routes - REST API endpoints for future cost prediction
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
from config import Config
from services import forecast_service, user_service

forecast_routes = Blueprint('forecasts', __name__, url_prefix='/api/forecasts')


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401
        try:
            payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITHM])
            current_user_id = payload['user_id']
            user = user_service.get_user_by_id(current_user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 401
            return f(current_user_id, *args, **kwargs)
        except Exception as e:
            return jsonify({'error': f'Authentication error: {str(e)}'}), 401
    return decorated


@forecast_routes.route('', methods=['GET'])
@token_required
def get_forecast(current_user_id):
    """
    Get cost forecast for the user.
    GET /api/forecasts?days=30&granularity=daily&detailed=true&service=X&env=Y
    """
    try:
        days_ahead = request.args.get('days', 30, type=int)
        granularity = request.args.get('granularity', 'daily')
        detailed_view = request.args.get('detailed', 'false').lower() == 'true'
        
        filters = {}
        if request.args.get('service'):
            filters['service'] = request.args.get('service')
        if request.args.get('region'):
            filters['region'] = request.args.get('region')
        if request.args.get('environment'):
            filters['environment'] = request.args.get('environment')
        if request.args.get('resource_group'):
            filters['resource_group'] = request.args.get('resource_group')
            
        if detailed_view:
            result = forecast_service.get_detailed_forecast(
                current_user_id, 
                days_ahead=days_ahead
            )
        else:
            service_name = filters.get('service') if filters else None
            result = forecast_service.predict_future_costs(
                current_user_id, 
                days_ahead=days_ahead,
                service_name=service_name
            )
        
        if result.get("error"):
            # Return 400 with error message but don't crash
            return jsonify({'error': result['error']}), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500
