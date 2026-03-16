"""
Report Routes - API endpoints for generating and downloading reports
"""

from flask import Blueprint, request, jsonify, make_response
from functools import wraps
import jwt
from datetime import datetime
from config import Config
from services import user_service, report_service

report_routes = Blueprint('reports', __name__, url_prefix='/api/reports')


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
    
    return decorated


@report_routes.route('/list', methods=['GET'])
@token_required
def list_reports(current_user_id):
    """
    List available reports for download.
    Returns metadata about available reports.
    """
    try:
        # Define available report types
        reports = [
            {
                'id': 'monthly_summary',
                'name': 'Monthly Cost Summary',
                'description': 'Detailed breakdown of costs for a specific month',
                'type': 'pdf',
                'available_formats': ['pdf', 'txt', 'csv'],
                'requires_params': True,
                'params': ['year', 'month']
            },
            {
                'id': 'executive_overview',
                'name': 'Executive Overview - Last 90 Days',
                'description': 'High-level summary of cloud spending',
                'type': 'pdf',
                'available_formats': ['pdf', 'txt', 'csv'],
                'requires_params': False
            },
            {
                'id': 'resource_utilization',
                'name': 'Resource Utilization Report',
                'description': 'Cost breakdown by service and category',
                'type': 'pdf',
                'available_formats': ['pdf', 'txt', 'csv'],
                'requires_params': False
            },
            {
                'id': 'anomaly_log',
                'name': 'Anomaly Detection Log',
                'description': 'All detected cost anomalies',
                'type': 'pdf',
                'available_formats': ['pdf', 'txt', 'csv'],
                'requires_params': False
            }
        ]
        
        return jsonify({
            'success': True,
            'reports': reports
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@report_routes.route('/download/<report_type>', methods=['GET'])
@token_required
def download_report(current_user_id, report_type):
    """
    Download a specific report.
    
    Query params:
    - year: Year for monthly reports (optional)
    - month: Month for monthly reports (optional)
    """
    try:
        fmt = request.args.get('format', 'pdf').lower()
        if fmt not in ('pdf', 'txt', 'csv'):
            return jsonify({'success': False, 'error': 'Invalid format. Use pdf, txt, or csv'}), 400

        # Generate report based on type
        if report_type == 'monthly_summary':
            # Get year and month from query params
            year = request.args.get('year', type=int)
            month = request.args.get('month', type=int)
            
            # Default to last month if not provided
            if not year or not month:
                now = datetime.now()
                if now.month == 1:
                    year = now.year - 1
                    month = 12
                else:
                    year = now.year
                    month = now.month - 1
            
            success, result = report_service.generate_monthly_cost_summary(
                current_user_id, year, month
            )
            base_filename = f"monthly_cost_summary_{year}_{month:02d}"
            report_title = f"Monthly Cost Summary ({year}-{month:02d})"
            
        elif report_type == 'executive_overview':
            success, result = report_service.generate_executive_overview(current_user_id)
            base_filename = f"executive_overview_{datetime.now().strftime('%Y%m%d')}"
            report_title = "Executive Overview"
            
        elif report_type == 'resource_utilization':
            success, result = report_service.generate_resource_utilization_report(current_user_id)
            base_filename = f"resource_utilization_{datetime.now().strftime('%Y%m%d')}"
            report_title = "Resource Utilization Report"
            
        elif report_type == 'anomaly_log':
            success, result = report_service.generate_anomaly_detection_report(current_user_id)
            base_filename = f"anomaly_log_{datetime.now().strftime('%Y%m%d')}"
            report_title = "Anomaly Detection Log"
            
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid report type'
            }), 400
        
        if not success:
            return jsonify({
                'success': False,
                'error': result
            }), 404

        # Convert generated CSV content to requested output format
        if fmt == 'csv':
            payload = result
            mime_type = 'text/csv'
            filename = f"{base_filename}.csv"
        elif fmt == 'txt':
            payload = report_service.convert_csv_to_txt(result)
            mime_type = 'text/plain'
            filename = f"{base_filename}.txt"
        else:  # pdf
            ok, pdf_payload = report_service.convert_csv_to_pdf(report_title, result)
            if not ok:
                # Graceful fallback when optional PDF dependency is unavailable.
                # This keeps reports downloadable in professional text format.
                if isinstance(pdf_payload, str) and 'reportlab' in pdf_payload.lower():
                    payload = report_service.convert_csv_to_txt(result)
                    mime_type = 'text/plain'
                    filename = f"{base_filename}.txt"
                else:
                    return jsonify({'success': False, 'error': pdf_payload}), 500
            else:
                payload = pdf_payload
                mime_type = 'application/pdf'
                filename = f"{base_filename}.pdf"
        
        # Create response with generated file
        response = make_response(payload)
        response.headers['Content-Type'] = mime_type
        response.headers['Content-Disposition'] = f'attachment; filename={filename}'
        if fmt == 'pdf' and filename.endswith('.txt'):
            response.headers['X-Report-Format-Fallback'] = 'txt'
        
        return response
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
