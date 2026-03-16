"""
Report Service - Generate downloadable reports from cost data
"""

import csv
from io import StringIO, BytesIO
from datetime import datetime, timedelta
from bson import ObjectId
from database import get_collection, Collections

try:
    from ml.category_mapper import get_category
except Exception:
    get_category = None


def _to_object_id(user_id):
    """Normalize user id to ObjectId for MongoDB queries."""
    try:
        return ObjectId(user_id) if isinstance(user_id, str) else user_id
    except Exception:
        return user_id


def _coerce_datetime(value):
    """Best-effort conversion of stored date values to datetime."""
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00')).replace(tzinfo=None)
        except Exception:
            try:
                return datetime.strptime(value[:10], '%Y-%m-%d')
            except Exception:
                return None
    return None


def _format_date(value):
    dt = _coerce_datetime(value)
    if dt:
        return dt.strftime('%Y-%m-%d')
    return str(value) if value is not None else ''


def _extract_cost_date(cost_doc):
    """Support both usage_start_date (primary) and legacy date field."""
    return _coerce_datetime(cost_doc.get('usage_start_date') or cost_doc.get('date'))


def _extract_category(service_name, stored_category=None):
    if stored_category:
        return stored_category
    if get_category and service_name:
        try:
            return get_category(service_name)
        except Exception:
            pass
    return 'Uncategorized'


def _get_user_costs(user_id):
    costs_collection = get_collection(Collections.CLOUD_COSTS)
    user_oid = _to_object_id(user_id)
    return list(costs_collection.find({'user_id': user_oid}))


def convert_csv_to_txt(csv_string):
    """Convert CSV string to a readable plain-text table format."""
    try:
        reader = list(csv.reader(StringIO(csv_string)))
        if not reader:
            return "No data"

        # Compute column widths from non-empty rows.
        non_empty_rows = [row for row in reader if any(str(cell).strip() for cell in row)]
        if not non_empty_rows:
            return "No data"

        max_cols = max(len(row) for row in non_empty_rows)
        widths = [0] * max_cols
        for row in non_empty_rows:
            for idx in range(max_cols):
                val = str(row[idx]).strip() if idx < len(row) else ''
                widths[idx] = max(widths[idx], len(val))

        lines = []
        for row_idx, row in enumerate(reader):
            if not any(str(cell).strip() for cell in row):
                lines.append("")
                continue

            cells = []
            for idx in range(max_cols):
                val = str(row[idx]).strip() if idx < len(row) else ''
                cells.append(val.ljust(widths[idx]))

            line = " | ".join(cells).rstrip()
            lines.append(line)

            # Divider after header row
            if row_idx == 0:
                divider = "-+-".join("-" * w for w in widths)
                lines.append(divider)

        return "\n".join(lines)
    except Exception:
        return csv_string


def convert_csv_to_pdf(title, csv_string):
    """Convert CSV report content into a simple PDF document."""
    try:
        from reportlab.lib.pagesizes import A4  # type: ignore[reportMissingImports]
        from reportlab.pdfgen import canvas  # type: ignore[reportMissingImports]
    except ImportError:
        return False, "PDF generation requires reportlab. Install with: pip install reportlab"

    try:
        txt = convert_csv_to_txt(csv_string)
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)

        page_width, page_height = A4
        x_margin = 40
        y = page_height - 40

        pdf.setFont("Helvetica-Bold", 13)
        pdf.drawString(x_margin, y, title)
        y -= 16

        pdf.setFont("Helvetica", 9)
        pdf.drawString(x_margin, y, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        y -= 18

        pdf.setFont("Courier", 7)
        for raw_line in txt.splitlines():
            line = raw_line if len(raw_line) <= 140 else raw_line[:137] + "..."
            if y < 40:
                pdf.showPage()
                y = page_height - 40
                pdf.setFont("Courier", 7)
            pdf.drawString(x_margin, y, line)
            y -= 10

        pdf.save()
        buffer.seek(0)
        return True, buffer.getvalue()
    except Exception as e:
        return False, f"Error generating PDF: {str(e)}"


def generate_monthly_cost_summary(user_id, year, month):
    """
    Generate monthly cost summary CSV report.
    Returns (success, csv_string_or_error)
    """
    try:
        # Get costs for the specified month
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)

        all_costs = _get_user_costs(user_id)
        costs = []
        for cost in all_costs:
            d = _extract_cost_date(cost)
            if d and start_date <= d < end_date:
                costs.append(cost)

        costs.sort(key=lambda c: _extract_cost_date(c) or datetime.min)
        
        if not costs:
            return False, "No cost data found for the specified period"
        
        # Generate CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Date', 'Service Name', 'Category', 'Region', 
            'Cost', 'Currency', 'Provider', 'Resource ID'
        ])
        
        # Write data rows
        for cost in costs:
            service_name = cost.get('service_name', '')
            writer.writerow([
                _format_date(_extract_cost_date(cost)),
                service_name,
                _extract_category(service_name, cost.get('category')),
                cost.get('region', ''),
                f"{cost.get('cost', 0):.2f}",
                cost.get('currency', 'USD'),
                cost.get('provider', ''),
                cost.get('resource_id', '')
            ])
        
        # Add summary row
        total_cost = sum(c.get('cost', 0) for c in costs)
        writer.writerow([])
        writer.writerow(['TOTAL', '', '', '', f"{total_cost:.2f}", '', '', ''])
        
        csv_string = output.getvalue()
        output.close()
        
        return True, csv_string
        
    except Exception as e:
        return False, f"Error generating report: {str(e)}"


def generate_resource_utilization_report(user_id):
    """
    Generate resource utilization report by service and category.
    Returns (success, csv_string_or_error)
    """
    try:
        # Get all costs for user
        costs = _get_user_costs(user_id)
        
        if not costs:
            return False, "No cost data found"
        
        # Aggregate by service and category
        service_stats = {}
        for cost in costs:
            service = cost.get('service_name', 'Unknown')
            category = _extract_category(service, cost.get('category'))
            key = f"{service}|{category}"
            
            if key not in service_stats:
                service_stats[key] = {
                    'service': service,
                    'category': category,
                    'total_cost': 0,
                    'count': 0,
                    'provider': cost.get('provider', '')
                }
            
            service_stats[key]['total_cost'] += cost.get('cost', 0)
            service_stats[key]['count'] += 1
        
        # Generate CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Service Name', 'Category', 'Provider', 
            'Total Cost', 'Record Count', 'Average Cost'
        ])
        
        # Write data rows (sorted by total cost)
        sorted_stats = sorted(service_stats.values(), 
                            key=lambda x: x['total_cost'], 
                            reverse=True)
        
        for stat in sorted_stats:
            avg_cost = stat['total_cost'] / stat['count'] if stat['count'] > 0 else 0
            writer.writerow([
                stat['service'],
                stat['category'],
                stat['provider'],
                f"{stat['total_cost']:.2f}",
                stat['count'],
                f"{avg_cost:.2f}"
            ])
        
        # Add total
        total_cost = sum(s['total_cost'] for s in sorted_stats)
        total_count = sum(s['count'] for s in sorted_stats)
        writer.writerow([])
        writer.writerow(['TOTAL', '', '', f"{total_cost:.2f}", total_count, ''])
        
        csv_string = output.getvalue()
        output.close()
        
        return True, csv_string
        
    except Exception as e:
        return False, f"Error generating report: {str(e)}"


def generate_anomaly_detection_report(user_id):
    """
    Generate anomaly detection log report.
    Returns (success, csv_string_or_error)
    """
    try:
        anomalies_collection = get_collection(Collections.ANOMALIES)
        user_oid = _to_object_id(user_id)
        
        # Get all anomalies for user
        anomalies = list(anomalies_collection.find({
            'user_id': user_oid
        }).sort('detected_at', -1))
        
        if not anomalies:
            return False, "No anomalies found"
        
        # Generate CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Detected At', 'Date', 'Service Name', 'Category',
            'Actual Cost', 'Expected Cost', 'Deviation %',
            'Severity', 'Status'
        ])
        
        # Write data rows
        for anomaly in anomalies:
            detected_at = anomaly.get('detected_at')
            actual_cost = anomaly.get('detected_value', anomaly.get('actual_cost', anomaly.get('cost', 0)))
            expected_cost = anomaly.get('expected_value', anomaly.get('expected_cost', 0))
            service_name = anomaly.get('service_name', '')
            writer.writerow([
                _format_date(detected_at),
                _format_date(anomaly.get('date') or detected_at),
                service_name,
                _extract_category(service_name, anomaly.get('category')),
                f"{float(actual_cost):.2f}",
                f"{float(expected_cost):.2f}",
                f"{anomaly.get('deviation_percentage', 0):.1f}",
                anomaly.get('severity', 'medium'),
                anomaly.get('status', 'new')
            ])
        
        csv_string = output.getvalue()
        output.close()
        
        return True, csv_string
        
    except Exception as e:
        return False, f"Error generating report: {str(e)}"


def generate_executive_overview(user_id):
    """
    Generate executive overview with key metrics.
    Returns (success, csv_string_or_error)
    """
    try:
        # Get costs for last 90 days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)

        all_costs = _get_user_costs(user_id)
        costs = []
        for cost in all_costs:
            d = _extract_cost_date(cost)
            if d and start_date <= d <= end_date:
                costs.append(cost)
        
        if not costs:
            return False, "No cost data found for the last 90 days"
        
        # Calculate metrics
        total_cost = sum(c.get('cost', 0) for c in costs)
        
        # Group by provider
        provider_costs = {}
        for cost in costs:
            provider = cost.get('provider', 'Unknown')
            provider_costs[provider] = provider_costs.get(provider, 0) + cost.get('cost', 0)
        
        # Group by category
        category_costs = {}
        for cost in costs:
            category = _extract_category(cost.get('service_name', ''), cost.get('category'))
            category_costs[category] = category_costs.get(category, 0) + cost.get('cost', 0)
        
        # Generate CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Executive Summary
        writer.writerow(['EXECUTIVE OVERVIEW - LAST 90 DAYS'])
        writer.writerow([])
        writer.writerow(['Report Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow(['Period:', f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"])
        writer.writerow(['Total Cost:', f"${total_cost:.2f}"])
        writer.writerow(['Total Records:', len(costs)])
        writer.writerow([])
        
        # Cost by Provider
        writer.writerow(['COST BY PROVIDER'])
        writer.writerow(['Provider', 'Total Cost', 'Percentage'])
        for provider, cost in sorted(provider_costs.items(), key=lambda x: x[1], reverse=True):
            percentage = (cost / total_cost * 100) if total_cost > 0 else 0
            writer.writerow([provider, f"${cost:.2f}", f"{percentage:.1f}%"])
        writer.writerow([])
        
        # Cost by Category
        writer.writerow(['COST BY CATEGORY'])
        writer.writerow(['Category', 'Total Cost', 'Percentage'])
        for category, cost in sorted(category_costs.items(), key=lambda x: x[1], reverse=True):
            percentage = (cost / total_cost * 100) if total_cost > 0 else 0
            writer.writerow([category, f"${cost:.2f}", f"{percentage:.1f}%"])
        
        csv_string = output.getvalue()
        output.close()
        
        return True, csv_string
        
    except Exception as e:
        return False, f"Error generating report: {str(e)}"
