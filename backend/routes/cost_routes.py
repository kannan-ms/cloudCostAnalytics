"""
Cost Routes - REST API endpoints for cloud cost data management
Production-quality Flask routes with authentication and error handling
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
from datetime import datetime
from config import Config
from services import cost_service, user_service

cost_routes = Blueprint('costs', __name__, url_prefix='/api/costs')


def token_required(f):
    """Decorator to require valid JWT token for protected routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid token format. Use: Bearer <token>'}), 401
        
        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401
        
        try:
            # Decode token
            payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITHM])
            current_user_id = payload['user_id']
            
            # Verify user exists
            user = user_service.get_user_by_id(current_user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 401
            
            # Pass user_id to route function
            return f(current_user_id, *args, **kwargs)
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        except Exception as e:
            return jsonify({'error': f'Authentication error: {str(e)}'}), 401
    
    return decorated


@cost_routes.route('/ingest', methods=['POST'])
@token_required
def ingest_cost(current_user_id):
    """
    Ingest a single cost record.
    
    POST /api/costs/ingest
    
    Request Body:
    {
        "provider": "AWS",
        "cloud_account_id": "123456789012",
        "service_name": "EC2",
        "resource_id": "i-1234567890abcdef0",
        "region": "us-east-1",
        "usage_quantity": 744.0,
        "usage_unit": "Hours",
        "cost": 150.50,
        "currency": "USD",
        "usage_start_date": "2026-01-01T00:00:00Z",
        "usage_end_date": "2026-01-31T23:59:59Z",
        "tags": {
            "Environment": "Production",
            "Team": "DevOps"
        },
        "metadata": {
            "instance_type": "t3.medium"
        }
    }
    
    Response:
    {
        "success": true,
        "message": "Cost record ingested successfully",
        "cost_id": "507f1f77bcf86cd799439011"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Create cost record
        success, result = cost_service.create_cost_record(current_user_id, data)
        
        if not success:
            return jsonify({'error': result}), 400
        
        return jsonify({
            'success': True,
            'message': 'Cost record ingested successfully',
            'cost_id': result
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@cost_routes.route('/ingest/bulk', methods=['POST'])
@token_required
def bulk_ingest_costs(current_user_id):
    """
    Bulk ingest multiple cost records.
    
    POST /api/costs/ingest/bulk
    
    Request Body:
    {
        "records": [
            {
                "provider": "AWS",
                "service_name": "EC2",
                "cost": 150.50,
                "usage_start_date": "2026-01-01T00:00:00Z",
                "usage_end_date": "2026-01-31T23:59:59Z",
                ...
            },
            ...
        ]
    }
    
    Response:
    {
        "success": true,
        "total_records": 100,
        "success_count": 95,
        "error_count": 5,
        "inserted_ids": [...],
        "errors": [...]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'records' not in data:
            return jsonify({'error': 'No records provided. Use {"records": [...]}'}), 400
        
        records = data['records']
        
        if not isinstance(records, list):
            return jsonify({'error': 'Records must be an array'}), 400
        
        # Bulk ingest
        success, result = cost_service.bulk_ingest_costs(current_user_id, records)
        
        if not success:
            return jsonify({'error': result.get('error', 'Bulk ingest failed')}), 400
        
        status_code = 201 if result['error_count'] == 0 else 207  # 207 = Multi-Status
        
        return jsonify({
            'success': True,
            **result
        }), status_code
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@cost_routes.route('', methods=['GET'])
@token_required
def get_costs(current_user_id):
    """
    Get cost records with filtering, pagination, and sorting.
    
    GET /api/costs
    
    Query Parameters:
    - start_date: Filter by start date (ISO 8601 format)
    - end_date: Filter by end date (ISO 8601 format)
    - provider: Filter by provider (AWS, Azure, GCP)
    - service_name: Filter by service name (partial match)
    - region: Filter by region
    - page: Page number (default: 1)
    - page_size: Records per page (default: 50, max: 100)
    - sort_by: Field to sort by (default: usage_start_date)
    - sort_order: asc or desc (default: desc)
    
    Example:
    GET /api/costs?start_date=2026-01-01&provider=AWS&page=1&page_size=20&sort_by=cost&sort_order=desc
    
    Response:
    {
        "success": true,
        "costs": [...],
        "pagination": {
            "page": 1,
            "page_size": 20,
            "total_count": 150,
            "total_pages": 8,
            "has_next": true,
            "has_prev": false
        }
    }
    """
    try:
        # Parse query parameters
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        provider = request.args.get('provider')
        service_name = request.args.get('service_name')
        region = request.args.get('region')
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', Config.DEFAULT_PAGE_SIZE))
        sort_by = request.args.get('sort_by', 'usage_start_date')
        sort_order = request.args.get('sort_order', 'desc')
        
        # Parse dates
        start_date = None
        end_date = None
        
        if start_date_str:
            try:
                start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid start_date format. Use ISO 8601 (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)'}), 400
        
        if end_date_str:
            try:
                end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use ISO 8601 (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)'}), 400
        
        # Validate page and page_size
        if page < 1:
            return jsonify({'error': 'Page must be >= 1'}), 400
        
        if page_size < 1 or page_size > Config.MAX_PAGE_SIZE:
            return jsonify({'error': f'Page size must be between 1 and {Config.MAX_PAGE_SIZE}'}), 400
        
        # Get costs
        success, result = cost_service.get_costs(
            user_id=current_user_id,
            start_date=start_date,
            end_date=end_date,
            provider=provider,
            service_name=service_name,
            region=region,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        if not success:
            return jsonify({'error': result}), 400
        
        return jsonify({
            'success': True,
            **result
        }), 200
        
    except ValueError as e:
        return jsonify({'error': f'Invalid parameter: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@cost_routes.route('/<cost_id>', methods=['GET'])
@token_required
def get_cost(current_user_id, cost_id):
    """
    Get a single cost record by ID.
    
    GET /api/costs/{cost_id}
    
    Response:
    {
        "success": true,
        "cost": {
            "_id": "507f1f77bcf86cd799439011",
            "provider": "AWS",
            "service_name": "EC2",
            ...
        }
    }
    """
    try:
        success, result = cost_service.get_cost_by_id(current_user_id, cost_id)
        
        if not success:
            return jsonify({'error': result}), 404
        
        return jsonify({
            'success': True,
            'cost': result
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@cost_routes.route('/<cost_id>', methods=['PUT'])
@token_required
def update_cost(current_user_id, cost_id):
    """
    Update a cost record.
    
    PUT /api/costs/{cost_id}
    
    Request Body:
    {
        "cost": 175.00,
        "tags": {
            "Environment": "Staging"
        }
    }
    
    Response:
    {
        "success": true,
        "message": "Cost record updated successfully",
        "cost": {...}
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No update data provided'}), 400
        
        success, result = cost_service.update_cost(current_user_id, cost_id, data)
        
        if not success:
            return jsonify({'error': result}), 400
        
        return jsonify({
            'success': True,
            'message': 'Cost record updated successfully',
            'cost': result
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@cost_routes.route('/<cost_id>', methods=['DELETE'])
@token_required
def delete_cost(current_user_id, cost_id):
    """
    Delete a cost record.
    
    DELETE /api/costs/{cost_id}
    
    Response:
    {
        "success": true,
        "message": "Cost record deleted successfully"
    }
    """
    try:
        success, result = cost_service.delete_cost(current_user_id, cost_id)
        
        if not success:
            return jsonify({'error': result}), 404
        
        return jsonify({
            'success': True,
            'message': result
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@cost_routes.route('/summary', methods=['GET'])
@token_required
def get_summary(current_user_id):
    """
    Get aggregated cost summary.
    
    GET /api/costs/summary
    
    Query Parameters:
    - start_date: Start date for filtering (ISO 8601)
    - end_date: End date for filtering (ISO 8601)
    - group_by: Group by field (provider, service, region, billing_period)
    
    Example:
    GET /api/costs/summary?start_date=2026-01-01&end_date=2026-01-31&group_by=provider
    
    Response:
    {
        "success": true,
        "summary": {
            "group_by": "provider",
            "grand_total": 5420.50,
            "groups": [
                {
                    "name": "AWS",
                    "total_cost": 3500.00,
                    "record_count": 120,
                    "avg_cost": 29.17,
                    "min_cost": 0.50,
                    "max_cost": 500.00,
                    "percentage": 64.58
                },
                ...
            ]
        }
    }
    """
    try:
        # Parse query parameters
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        group_by = request.args.get('group_by', 'provider')
        
        # Validate group_by
        valid_group_by = ['provider', 'service', 'region', 'billing_period']
        if group_by not in valid_group_by:
            return jsonify({'error': f'group_by must be one of: {", ".join(valid_group_by)}'}), 400
        
        # Parse dates
        start_date = None
        end_date = None
        
        if start_date_str:
            try:
                start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid start_date format'}), 400
        
        if end_date_str:
            try:
                end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid end_date format'}), 400
        
        # Get summary
        success, result = cost_service.get_cost_summary(
            user_id=current_user_id,
            start_date=start_date,
            end_date=end_date,
            group_by=group_by
        )
        
        if not success:
            return jsonify({'error': result}), 400
        
        return jsonify({
            'success': True,
            'summary': result
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


# Error handlers
@cost_routes.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@cost_routes.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'error': 'Method not allowed'}), 405


@cost_routes.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500
