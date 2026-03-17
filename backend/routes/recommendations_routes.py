"""
Recommendations Routes - REST API endpoints for cost optimization suggestions
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
from config import Config
from services import user_service, recommendation_service

recommendations_routes = Blueprint('recommendations', __name__, url_prefix='/api/recommendations')


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


@recommendations_routes.route('', methods=['GET'])
@token_required
def get_recommendations(current_user_id):
    """
    Get cost optimization recommendations for the user.
    GET /api/recommendations
    """
    try:
        recs = recommendation_service.RecommendationService.generate_recommendations(current_user_id)
        return jsonify({
            'success': True,
            'recommendations': recs,
            'count': len(recs)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to generate recommendations: {str(e)}'}), 500
