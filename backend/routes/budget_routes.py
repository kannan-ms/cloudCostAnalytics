from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
from config import Config
from services.budget_service import budget_service
from services import user_service

budget_routes = Blueprint('budgets', __name__, url_prefix='/api/budgets')

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

@budget_routes.route('', methods=['POST'])
@token_required
def create_budget(current_user_id):
    """Create a new budget."""
    try:
        data = request.get_json()
        if not data.get('name') or not data.get('amount'):
            return jsonify({'error': 'Name and amount are required'}), 400
            
        budget = budget_service.create_budget(current_user_id, data)
        return jsonify(budget), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@budget_routes.route('', methods=['GET'])
@token_required
def list_budgets(current_user_id):
    """List all budgets with their current status."""
    try:
        budgets = budget_service.get_budgets(current_user_id)
        
        # Enhance with current tracking data
        enhanced_budgets = []
        for b in budgets:
            try:
                # Get tracking details for each (can be optimized later)
                status = budget_service.track_budget(current_user_id, b['_id'])
                enhanced_budgets.append(status)
            except Exception as e:
                print(f"Error tracking budget {b.get('_id')}: {e}")
                enhanced_budgets.append({"budget": b, "error": "Failed to track"})
                
        return jsonify(enhanced_budgets), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@budget_routes.route('/<budget_id>', methods=['GET'])
@token_required
def get_budget_details(current_user_id, budget_id):
    """Get detailed status of a specific budget."""
    try:
        status = budget_service.track_budget(current_user_id, budget_id)
        if status.get('error'):
            return jsonify(status), 404
        return jsonify(status), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@budget_routes.route('/<budget_id>', methods=['DELETE'])
@token_required
def delete_budget(current_user_id, budget_id):
    """Delete a budget."""
    try:
        success = budget_service.delete_budget(current_user_id, budget_id)
        if success:
            return jsonify({'message': 'Budget deleted successfully'}), 200
        return jsonify({'error': 'Budget not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
