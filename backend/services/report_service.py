"""
Report Service - Generate downloadable reports from cost data
"""

import csv
from io import StringIO
from datetime import datetime, timedelta
from database import get_collection, Collections


def generate_monthly_cost_summary(user_id, year, month):
    """
    Generate monthly cost summary CSV report.
    Returns (success, csv_string_or_error)
    """
    try:
        costs_collection = get_collection(Collections.CLOUD_COSTS)
        
        # Get costs for the specified month
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
        
        costs = list(costs_collection.find({
            'user_id': user_id,
            'date': {
                '$gte': start_date.strftime('%Y-%m-%d'),
                '$lt': end_date.strftime('%Y-%m-%d')
            }
        }).sort('date', 1))
        
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
            writer.writerow([
                cost.get('date', ''),
                cost.get('service_name', ''),
                cost.get('category', ''),
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
        costs_collection = get_collection(Collections.CLOUD_COSTS)
        
        # Get all costs for user
        costs = list(costs_collection.find({'user_id': user_id}))
        
        if not costs:
            return False, "No cost data found"
        
        # Aggregate by service and category
        service_stats = {}
        for cost in costs:
            service = cost.get('service_name', 'Unknown')
            category = cost.get('category', 'Uncategorized')
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
        
        # Get all anomalies for user
        anomalies = list(anomalies_collection.find({
            'user_id': user_id
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
            writer.writerow([
                anomaly.get('detected_at', ''),
                anomaly.get('date', ''),
                anomaly.get('service_name', ''),
                anomaly.get('category', ''),
                f"{anomaly.get('actual_cost', 0):.2f}",
                f"{anomaly.get('expected_cost', 0):.2f}",
                f"{anomaly.get('deviation_percentage', 0):.1f}",
                anomaly.get('severity', 'medium'),
                anomaly.get('status', 'open')
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
        costs_collection = get_collection(Collections.CLOUD_COSTS)
        
        # Get costs for last 90 days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        
        costs = list(costs_collection.find({
            'user_id': user_id,
            'date': {
                '$gte': start_date.strftime('%Y-%m-%d'),
                '$lte': end_date.strftime('%Y-%m-%d')
            }
        }))
        
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
            category = cost.get('category', 'Uncategorized')
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
