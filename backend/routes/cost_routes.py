"""
Cost Routes - REST API endpoints for cloud cost data management
Production-quality Flask routes with authentication and error handling
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
from datetime import datetime
from config import Config
from services import cost_service, user_service, anomaly_detector
from services.file_parser import parse_file

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


@cost_routes.route('/trends/daily', methods=['GET'])
@token_required
def get_daily_trends(current_user_id):
    """
    Get daily cost trends.
    
    GET /api/costs/trends/daily
    
    Query Parameters:
    - start_date: Start date (ISO 8601, optional, default: 30 days ago)
    - end_date: End date (ISO 8601, optional, default: today)
    
    Response:
    {
        "success": true,
        "trends": [
            {"date": "2026-01-01", "total_cost": 450.50, "record_count": 25},
            ...
        ],
        "summary": {
            "total_cost": 13500.00,
            "average_daily_cost": 450.00,
            "days_count": 30
        }
    }
    """
    try:
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
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
        
        success, result = cost_service.get_daily_trends(current_user_id, start_date, end_date)
        
        if not success:
            return jsonify({'error': result}), 400
        
        return jsonify({
            'success': True,
            **result
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@cost_routes.route('/trends/category-daily', methods=['GET'])
@token_required
def get_category_daily_trends(current_user_id):
    """
    Daily cost trends grouped by infrastructure category for a given month.
    Returns rolling-average data and anomaly markers.

    GET /api/costs/trends/category-daily?month=2025-11
    """
    try:
        from ml.category_mapper import map_service_to_category
        from datetime import timedelta
        import math

        month_str = request.args.get('month')
        if not month_str:
            return jsonify({'error': 'month parameter is required (e.g. 2025-11)'}), 400

        try:
            month_start = datetime.strptime(month_str, '%Y-%m')
        except ValueError:
            return jsonify({'error': 'Invalid month format. Use YYYY-MM'}), 400

        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)

        user_oid = ObjectId(current_user_id)
        costs_col = get_collection(Collections.CLOUD_COSTS)

        # ── Step 1: Fetch daily service-level costs for the month ──
        pipeline = [
            {"$match": {
                "user_id": user_oid,
                "usage_start_date": {"$gte": month_start, "$lt": month_end}
            }},
            {"$group": {
                "_id": {
                    "day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$usage_start_date"}},
                    "service": "$service_name"
                },
                "cost": {"$sum": "$cost"}
            }},
            {"$sort": {"_id.day": 1}}
        ]
        raw = list(costs_col.aggregate(pipeline))

        if not raw:
            return jsonify({'success': True, 'trends': [], 'categories': [], 'anomalies': []}), 200

        # ── Step 2: Pivot into { date -> { category -> cost } } ──
        date_cat: dict = {}   # date_str -> { cat -> cost }
        for r in raw:
            d = r['_id']['day']
            cat = map_service_to_category(r['_id']['service'])
            date_cat.setdefault(d, {})
            date_cat[d][cat] = date_cat[d].get(cat, 0) + r['cost']

        sorted_dates = sorted(date_cat.keys())
        all_cats = sorted({cat for cats in date_cat.values() for cat in cats})

        # ── Step 3: Build trend rows with 7-day rolling average ──
        trends = []
        window_size = 7

        for idx, d in enumerate(sorted_dates):
            row = {'date': d}
            for cat in all_cats:
                cost = round(date_cat[d].get(cat, 0), 2)
                row[cat] = cost

                # Rolling average
                window_vals = []
                for w in range(max(0, idx - window_size + 1), idx + 1):
                    w_date = sorted_dates[w]
                    window_vals.append(date_cat[w_date].get(cat, 0))
                avg = sum(window_vals) / len(window_vals) if window_vals else 0
                row[f'{cat}_avg'] = round(avg, 2)

                # Percent deviation from rolling avg
                if avg > 0:
                    dev = ((cost - avg) / avg) * 100
                    row[f'{cat}_dev'] = round(dev, 1)
                else:
                    row[f'{cat}_dev'] = 0.0

            row['total'] = round(sum(date_cat[d].get(c, 0) for c in all_cats), 2)
            trends.append(row)

        # ── Step 4: Detect anomaly points (>40% above 7d rolling avg) ──
        anomaly_threshold = 40  # percent
        anomalies = []
        for row in trends:
            for cat in all_cats:
                dev = row.get(f'{cat}_dev', 0)
                if dev > anomaly_threshold and row[cat] > 1:  # ignore tiny costs
                    anomalies.append({
                        'date': row['date'],
                        'category': cat,
                        'cost': row[cat],
                        'deviation': dev,
                        'rolling_avg': row.get(f'{cat}_avg', 0)
                    })

        return jsonify({
            'success': True,
            'month': month_str,
            'categories': all_cats,
            'trends': trends,
            'anomalies': anomalies
        }), 200

    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@cost_routes.route('/trends/auto', methods=['GET'])
@token_required
def get_auto_trends(current_user_id):
    """
    Automatically detect date range and return trends from user's actual data.
    """
    try:
        # Get optional breakdown parameter
        breakdown_by = request.args.get('breakdown', 'service')
        
        # Get optional granularity parameter (daily | monthly | auto)
        granularity = request.args.get('granularity', None)
        if granularity and granularity not in ('daily', 'monthly'):
            granularity = None  # fall back to auto-detect
        
        # Get optional month filter (e.g. "2026-01")
        month = request.args.get('month', None)
        if month and month == 'all':
            month = None
        
        # If latest_month=true, auto-detect the latest month server-side
        latest_month = request.args.get('latest_month', 'false').lower() == 'true'
        
        # Extract filters
        filters = {
            'service': request.args.get('service'),
            'region': request.args.get('region'),
            'account': request.args.get('account'),
            'provider': request.args.get('provider')
        }
        
        success, result = cost_service.get_auto_trends(current_user_id, breakdown_by, filters, granularity, month, latest_month)
        
        if not success:
            return jsonify({'error': result}), 400
        
        return jsonify({
            'success': True,
            **result
        }), 200
        
    except Exception as e:
        print(f"Error getting auto trends: {e}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@cost_routes.route('/filters', methods=['GET'])
@token_required
def get_filter_options(current_user_id):
    """
    Get available filter options based on user's data.
    """
    try:
        success, result = cost_service.get_filter_options(current_user_id)
        if not success:
            return jsonify({'error': result}), 400
            
        return jsonify({
            'success': True,
            **result
        }), 200

    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@cost_routes.route('/trends/monthly', methods=['GET'])
@token_required
def get_monthly_trends(current_user_id):
    """
    Get monthly cost trends.
    
    GET /api/costs/trends/monthly
    
    Query Parameters:
    - months: Number of months to include (default: 6)
    
    Response:
    {
        "success": true,
        "trends": [
            {
                "month": "2025-12",
                "total_cost": 5200.00,
                "record_count": 150,
                "unique_services": 8,
                "change_percentage": 12.5
            },
            ...
        ]
    }
    """
    try:
        months = int(request.args.get('months', 6))
        
        if months < 1 or months > 24:
            return jsonify({'error': 'Months must be between 1 and 24'}), 400
        
        success, result = cost_service.get_monthly_trends(current_user_id, months)
        
        if not success:
            return jsonify({'error': result}), 400
        
        return jsonify({
            'success': True,
            **result
        }), 200
        
    except ValueError:
        return jsonify({'error': 'Invalid months parameter'}), 400
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@cost_routes.route('/comparison', methods=['GET'])
@token_required
def get_comparison(current_user_id):
    """
    Compare costs between two periods.
    
    GET /api/costs/comparison
    
    Query Parameters:
    - current_start: Current period start (ISO 8601)
    - current_end: Current period end (ISO 8601)
    - previous_start: Previous period start (ISO 8601)
    - previous_end: Previous period end (ISO 8601)
    
    Response:
    {
        "success": true,
        "comparisons": [
            {
                "service_name": "EC2",
                "current_cost": 1500.00,
                "previous_cost": 1200.00,
                "difference": 300.00,
                "change_percentage": 25.0,
                "status": "increased"
            }
        ],
        "summary": {...}
    }
    """
    try:
        current_start_str = request.args.get('current_start')
        current_end_str = request.args.get('current_end')
        previous_start_str = request.args.get('previous_start')
        previous_end_str = request.args.get('previous_end')
        
        if not all([current_start_str, current_end_str, previous_start_str, previous_end_str]):
            return jsonify({'error': 'All date parameters are required'}), 400
        
        try:
            current_start = datetime.fromisoformat(current_start_str.replace('Z', '+00:00'))
            current_end = datetime.fromisoformat(current_end_str.replace('Z', '+00:00'))
            previous_start = datetime.fromisoformat(previous_start_str.replace('Z', '+00:00'))
            previous_end = datetime.fromisoformat(previous_end_str.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use ISO 8601'}), 400
        
        success, result = cost_service.get_cost_comparison(
            current_user_id,
            current_start,
            current_end,
            previous_start,
            previous_end
        )
        
        if not success:
            return jsonify({'error': result}), 400
        
        return jsonify({
            'success': True,
            **result
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@cost_routes.route('/top-resources', methods=['GET'])
@token_required
def get_top_resources(current_user_id):
    """
    Get top cost resources.
    
    GET /api/costs/top-resources
    
    Query Parameters:
    - limit: Number of resources (default: 10, max: 50)
    - start_date: Optional start date
    - end_date: Optional end date
    
    Response:
    {
        "success": true,
        "top_resources": [
            {
                "service_name": "EC2",
                "resource_id": "i-1234567890",
                "region": "us-east-1",
                "total_cost": 2500.00,
                "record_count": 30
            }
        ]
    }
    """
    try:
        limit = int(request.args.get('limit', 10))
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        if limit < 1 or limit > 50:
            return jsonify({'error': 'Limit must be between 1 and 50'}), 400
        
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
        
        success, result = cost_service.get_top_resources(current_user_id, limit, start_date, end_date)
        
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


@cost_routes.route('/upload', methods=['POST'])
@token_required
def upload_cost_file(current_user_id):
    """
    Upload and process CSV or Excel file with cost data.
    """
    try:
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided. Please upload a file with key "file"'}), 400
        
        file = request.files['file']
        
        # Check if filename is empty
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read file content
        file_content = file.read()
        
        if not file_content:
            return jsonify({'error': 'File is empty'}), 400
        
        # Parse file
        success, result = parse_file(file.filename, file_content)
        
        if not success:
            return jsonify({'error': result}), 400
        
        records = result

        # Clear existing data for a fresh start (per option 2 requirement)
        cost_service.delete_all_costs_for_user(current_user_id)
        anomaly_detector.delete_all_anomalies_for_user(current_user_id)
        
        # Bulk ingest the parsed records
        success, ingest_result = cost_service.bulk_ingest_costs(current_user_id, records)
        
        if not success:
            return jsonify({'error': ingest_result.get('error', 'Failed to ingest records')}), 400
            
        # Run anomaly detection on the new data
        anomaly_detector.run_anomaly_detection_for_user(current_user_id)
        
        # Determine status code
        if ingest_result['error_count'] == 0:
            status_code = 201
            message = 'File processed successfully. All records imported.'
        elif ingest_result['success_count'] > 0:
            status_code = 207  # Multi-Status
            message = f"File processed with warnings. {ingest_result['success_count']} records imported, {ingest_result['error_count']} failed."
        else:
            status_code = 400
            message = 'File processing failed. No records were imported.'
        
        return jsonify({
            'success': ingest_result['success_count'] > 0,
            'message': message,
            'filename': file.filename,
            'total_records': ingest_result['total_records'],
            'success_count': ingest_result['success_count'],
            'error_count': ingest_result['error_count'],
            'sample_errors': ingest_result['errors'][:5] if ingest_result['errors'] else []
        }), status_code
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@cost_routes.route('/upload/template', methods=['GET'])
def download_template():
    """
    Download a CSV template file for cost data upload.
    
    GET /api/costs/upload/template
    
    Response: CSV file download
    """
    from flask import make_response
    
    template_content = """provider,service_name,cost,usage_start_date,usage_end_date,region,cloud_account_id,resource_id,usage_quantity,usage_unit,currency,tags
AWS,EC2,150.50,2026-01-01,2026-01-31,us-east-1,123456789012,i-1234567890abcdef0,744,Hours,USD,{"Environment":"Production"}
Azure,Virtual Machines,200.00,2026-01-01,2026-01-31,East US,sub-12345,vm-instance-001,720,Hours,USD,{"Team":"DevOps"}
GCP,Compute Engine,180.75,2026-01-01,2026-01-31,us-central1,project-123,instance-456,744,Hours,USD,{"App":"WebServer"}
"""
    
    response = make_response(template_content)
    response.headers['Content-Type'] = 'text/csv'
    response.headers['Content-Disposition'] = 'attachment; filename=cost_data_template.csv'
    
    return response


@cost_routes.route('/dashboard-insights', methods=['GET'])
@token_required
def get_dashboard_insights(current_user_id):
    """
    Get dashboard financial insights in a single call.
    OPTIMIZED: Fetches all user cost data once, computes everything in Python.
    Returns: spend change, top cost driver, anomaly count,
    fastest growing service, category distribution, and text insights.
    """
    try:
        from bson import ObjectId
        from database import get_collection, Collections
        from datetime import datetime, timedelta
        from ml.category_mapper import map_service_to_category

        costs_col = get_collection(Collections.CLOUD_COSTS)
        user_oid = ObjectId(current_user_id)

        # --------------------------------------------------
        # SINGLE DB QUERY: Fetch all user cost records (only needed fields)
        # --------------------------------------------------
        all_docs = list(costs_col.find(
            {"user_id": user_oid},
            {"service_name": 1, "cost": 1, "usage_start_date": 1, "_id": 0}
        ))

        if not all_docs:
            return jsonify({"success": True, "has_data": False}), 200

        # Parse dates if needed and extract data
        costs_data = []
        for doc in all_docs:
            d = doc.get("usage_start_date")
            if isinstance(d, str):
                d = datetime.fromisoformat(d.replace('Z', '+00:00'))
            costs_data.append({
                "service": doc.get("service_name", "Unknown"),
                "cost": doc.get("cost", 0),
                "date": d
            })

        # Compute date boundaries
        dates = [c["date"] for c in costs_data if c["date"]]
        if not dates:
            return jsonify({"success": True, "has_data": False}), 200

        min_date = min(dates)
        max_date = max(dates)

        # Use relative windows from max_date
        week_start = max_date - timedelta(days=6)
        prev_week_start = week_start - timedelta(days=7)
        prev_week_end = week_start - timedelta(seconds=1)

        # --------------------------------------------------
        # 2. Spend change (computed in-memory)
        # --------------------------------------------------
        current_week_spend = sum(c["cost"] for c in costs_data if c["date"] and week_start <= c["date"] <= max_date)
        prev_week_spend = sum(c["cost"] for c in costs_data if c["date"] and prev_week_start <= c["date"] <= prev_week_end)

        spend_change_pct = 0
        if prev_week_spend > 0:
            spend_change_pct = round(((current_week_spend - prev_week_spend) / prev_week_spend) * 100, 1)

        # --------------------------------------------------
        # 3. Top cost driver & total cost (computed in-memory)
        # --------------------------------------------------
        service_totals = {}
        total_user_cost = 0
        for c in costs_data:
            service_totals[c["service"]] = service_totals.get(c["service"], 0) + c["cost"]
            total_user_cost += c["cost"]

        top_driver = None
        if service_totals:
            top_svc = max(service_totals, key=service_totals.get)
            top_total = service_totals[top_svc]
            pct = round((top_total / total_user_cost) * 100, 1) if total_user_cost else 0
            top_driver = {"service": top_svc, "total": round(top_total, 2), "percentage": pct}

        # --------------------------------------------------
        # 4. Active anomaly count (lightweight count query)
        # --------------------------------------------------
        anomaly_col = get_collection(Collections.ANOMALIES)
        anomaly_count = anomaly_col.count_documents({"user_id": user_oid})

        # --------------------------------------------------
        # 5. Fastest growing service (in-memory)
        # --------------------------------------------------
        data_span = (max_date - min_date).days
        mid_date = min_date + timedelta(days=data_span // 2)

        svc_halves = {}
        for c in costs_data:
            svc = c["service"]
            half = "recent" if c["date"] and c["date"] >= mid_date else "earlier"
            svc_halves.setdefault(svc, {"earlier": 0, "recent": 0})
            svc_halves[svc][half] += c["cost"]

        fastest_growing = None
        max_growth = -999
        for svc, halves in svc_halves.items():
            earlier = halves.get("earlier", 0)
            recent = halves.get("recent", 0)
            if earlier > 0:
                growth = ((recent - earlier) / earlier) * 100
            elif recent > 0:
                growth = 100
            else:
                growth = 0
            if growth > max_growth:
                max_growth = growth
                fastest_growing = {"service": svc, "growth_pct": round(growth, 1)}

        # --------------------------------------------------
        # 6. Cost distribution by category (in-memory)
        # --------------------------------------------------
        category_totals = {}
        for svc, total in service_totals.items():
            cat = map_service_to_category(svc)
            category_totals[cat] = category_totals.get(cat, 0) + total

        distribution = [{"category": k, "cost": round(v, 2)} for k, v in sorted(category_totals.items(), key=lambda x: -x[1])]

        # --------------------------------------------------
        # 7. Quick insights (in-memory)
        # --------------------------------------------------
        insights = []
        svc_periods = {}
        for c in costs_data:
            svc = c["service"]
            svc_periods.setdefault(svc, {"recent": 0, "older": 0})
            if c["date"] and c["date"] >= week_start:
                svc_periods[svc]["recent"] += c["cost"]
            else:
                svc_periods[svc]["older"] += c["cost"]

        for svc, periods in svc_periods.items():
            older = periods["older"]
            recent = periods["recent"]
            if older > 0:
                change = ((recent - older) / older) * 100
                if abs(change) >= 3:
                    direction = "increased" if change > 0 else "decreased"
                    insights.append({
                        "service": svc,
                        "message": f"{svc} cost {direction} by {abs(change):.0f}%",
                        "change_pct": round(change, 1),
                        "type": "warning" if change > 10 else "success" if change < -3 else "info"
                    })
            elif recent > 0:
                insights.append({
                    "service": svc,
                    "message": f"{svc} is a new cost entry",
                    "change_pct": 0,
                    "type": "info"
                })

        insights.sort(key=lambda x: (0 if x["type"] == "warning" else 1, -abs(x["change_pct"])))
        insights = insights[:6]

        return jsonify({
            "success": True,
            "has_data": True,
            "spend_change": {
                "current_week": round(current_week_spend, 2),
                "previous_week": round(prev_week_spend, 2),
                "change_pct": spend_change_pct
            },
            "top_driver": top_driver,
            "anomaly_count": anomaly_count,
            "fastest_growing": fastest_growing,
            "distribution": distribution,
            "insights": insights
        }), 200

    except Exception as e:
        print(f"Dashboard insights error: {e}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


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
