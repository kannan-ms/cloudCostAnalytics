"""
File Parser Service - Parse CSV and Excel files for cost data
Handles file validation, parsing, and data extraction
"""

import pandas as pd
import io
from datetime import datetime
from typing import Dict, List, Tuple, Optional


# Supported file extensions
ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.xls'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def is_allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)


def validate_file_size(file_size: int) -> Tuple[bool, Optional[str]]:
    """Validate file size."""
    if file_size > MAX_FILE_SIZE:
        return False, f"File size exceeds maximum limit of {MAX_FILE_SIZE / (1024*1024)}MB"
    return True, None


def parse_date(date_value) -> Optional[datetime]:
    """
    Parse various date formats to datetime object.
    Handles: ISO format, Excel dates, common formats
    """
    if pd.isna(date_value):
        return None
    
    # If already datetime
    if isinstance(date_value, datetime):
        return date_value
    
    # If pandas Timestamp
    if isinstance(date_value, pd.Timestamp):
        return date_value.to_pydatetime()
    
    # If string, try various formats
    if isinstance(date_value, str):
        date_formats = [
            '%Y-%m-%d',
            '%Y/%m/%d',
            '%m/%d/%Y',
            '%d/%m/%Y',
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%dT%H:%M:%SZ',
            '%m-%d-%Y',
            '%d-%m-%Y'
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_value.strip(), fmt)
            except:
                continue
    
    return None


def normalize_column_name(col: str) -> str:
    """Normalize column names for flexible matching."""
    return col.lower().strip().replace(' ', '_').replace('-', '_')


def map_columns(df: pd.DataFrame) -> Dict[str, str]:
    """
    Map DataFrame columns to expected field names.
    Supports flexible column naming.
    """
    column_mapping = {}
    normalized_cols = {normalize_column_name(col): col for col in df.columns}
    
    # Define possible column name variations
    field_mappings = {
        'provider': ['provider', 'cloud_provider', 'cloud', 'vendor'],
        'cloud_account_id': ['cloud_account_id', 'account_id', 'account', 'account_number'],
        'service_name': ['service_name', 'service', 'product', 'product_name', 'resource_type'],
        'resource_id': ['resource_id', 'resource', 'instance_id', 'instance'],
        'region': ['region', 'location', 'availability_zone', 'zone'],
        'usage_quantity': ['usage_quantity', 'quantity', 'usage', 'amount'],
        'usage_unit': ['usage_unit', 'unit', 'measurement_unit'],
        'cost': ['cost', 'charge', 'amount', 'price', 'total_cost', 'billed_cost'],
        'currency': ['currency', 'currency_code'],
        'usage_start_date': ['usage_start_date', 'start_date', 'from_date', 'begin_date', 'period_start'],
        'usage_end_date': ['usage_end_date', 'end_date', 'to_date', 'finish_date', 'period_end'],
        'tags': ['tags', 'labels', 'metadata'],
    }
    
    # Try to match columns
    for field, possible_names in field_mappings.items():
        for possible_name in possible_names:
            normalized_possible = normalize_column_name(possible_name)
            if normalized_possible in normalized_cols:
                column_mapping[field] = normalized_cols[normalized_possible]
                break
    
    return column_mapping


def parse_tags(tag_value) -> Dict:
    """Parse tags from various formats."""
    if pd.isna(tag_value):
        return {}
    
    if isinstance(tag_value, dict):
        return tag_value
    
    if isinstance(tag_value, str):
        # Try JSON format
        import json
        try:
            return json.loads(tag_value)
        except:
            # Try key:value,key:value format
            tags = {}
            try:
                pairs = tag_value.split(',')
                for pair in pairs:
                    if ':' in pair:
                        key, val = pair.split(':', 1)
                        tags[key.strip()] = val.strip()
            except:
                pass
            return tags
    
    return {}


def extract_cost_records(df: pd.DataFrame, column_mapping: Dict[str, str]) -> List[Dict]:
    """
    Extract cost records from DataFrame using column mapping.
    """
    records = []
    
    for idx, row in df.iterrows():
        try:
            record = {}
            
            # Provider (required)
            if 'provider' in column_mapping:
                provider = row[column_mapping['provider']]
                if pd.notna(provider):
                    record['provider'] = str(provider).strip()
            
            # Service name (required)
            if 'service_name' in column_mapping:
                service = row[column_mapping['service_name']]
                if pd.notna(service):
                    record['service_name'] = str(service).strip()
            
            # Cost (required)
            if 'cost' in column_mapping:
                cost = row[column_mapping['cost']]
                if pd.notna(cost):
                    try:
                        # Handle currency symbols and commas
                        if isinstance(cost, str):
                            cost = cost.replace('$', '').replace('€', '').replace('£', '').replace(',', '').strip()
                        record['cost'] = float(cost)
                    except:
                        continue
            
            # Dates (required)
            if 'usage_start_date' in column_mapping:
                start_date = parse_date(row[column_mapping['usage_start_date']])
                if start_date:
                    record['usage_start_date'] = start_date.isoformat()
            
            if 'usage_end_date' in column_mapping:
                end_date = parse_date(row[column_mapping['usage_end_date']])
                if end_date:
                    record['usage_end_date'] = end_date.isoformat()
            
            # Optional fields
            if 'cloud_account_id' in column_mapping:
                account_id = row[column_mapping['cloud_account_id']]
                if pd.notna(account_id):
                    record['cloud_account_id'] = str(account_id).strip()
            
            if 'resource_id' in column_mapping:
                resource_id = row[column_mapping['resource_id']]
                if pd.notna(resource_id):
                    record['resource_id'] = str(resource_id).strip()
            
            if 'region' in column_mapping:
                region = row[column_mapping['region']]
                if pd.notna(region):
                    record['region'] = str(region).strip()
            
            if 'usage_quantity' in column_mapping:
                quantity = row[column_mapping['usage_quantity']]
                if pd.notna(quantity):
                    try:
                        record['usage_quantity'] = float(quantity)
                    except:
                        pass
            
            if 'usage_unit' in column_mapping:
                unit = row[column_mapping['usage_unit']]
                if pd.notna(unit):
                    record['usage_unit'] = str(unit).strip()
            
            if 'currency' in column_mapping:
                currency = row[column_mapping['currency']]
                if pd.notna(currency):
                    record['currency'] = str(currency).strip().upper()
            
            if 'tags' in column_mapping:
                tags = parse_tags(row[column_mapping['tags']])
                if tags:
                    record['tags'] = tags
            
            # Only add record if it has required fields
            if all(k in record for k in ['provider', 'service_name', 'cost', 'usage_start_date', 'usage_end_date']):
                records.append(record)
        
        except Exception as e:
            # Skip problematic rows
            continue
    
    return records


def parse_csv_file(file_content: bytes) -> Tuple[bool, any]:
    """
    Parse CSV file and extract cost records.
    
    Returns:
        (success, records_or_error_message)
    """
    try:
        # Try different encodings
        encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
        df = None
        
        for encoding in encodings:
            try:
                df = pd.read_csv(io.BytesIO(file_content), encoding=encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if df is None:
            return False, "Unable to decode CSV file. Please ensure it's a valid CSV with UTF-8 encoding."
        
        if df.empty:
            return False, "CSV file is empty"
        
        # Map columns
        column_mapping = map_columns(df)
        
        # Check for required columns
        required_fields = ['provider', 'service_name', 'cost', 'usage_start_date', 'usage_end_date']
        missing_fields = [f for f in required_fields if f not in column_mapping]
        
        if missing_fields:
            return False, f"Missing required columns: {', '.join(missing_fields)}. Please ensure your CSV has these columns."
        
        # Extract records
        records = extract_cost_records(df, column_mapping)
        
        if not records:
            return False, "No valid records found in CSV file"
        
        return True, records
        
    except Exception as e:
        return False, f"Error parsing CSV file: {str(e)}"


def parse_excel_file(file_content: bytes) -> Tuple[bool, any]:
    """
    Parse Excel file and extract cost records.
    
    Returns:
        (success, records_or_error_message)
    """
    try:
        # Try reading Excel file
        try:
            df = pd.read_excel(io.BytesIO(file_content), engine='openpyxl')
        except:
            try:
                df = pd.read_excel(io.BytesIO(file_content), engine='xlrd')
            except:
                return False, "Unable to read Excel file. Please ensure it's a valid .xlsx or .xls file."
        
        if df.empty:
            return False, "Excel file is empty"
        
        # Map columns
        column_mapping = map_columns(df)
        
        # Check for required columns
        required_fields = ['provider', 'service_name', 'cost', 'usage_start_date', 'usage_end_date']
        missing_fields = [f for f in required_fields if f not in column_mapping]
        
        if missing_fields:
            return False, f"Missing required columns: {', '.join(missing_fields)}. Please ensure your Excel has these columns."
        
        # Extract records
        records = extract_cost_records(df, column_mapping)
        
        if not records:
            return False, "No valid records found in Excel file"
        
        return True, records
        
    except Exception as e:
        return False, f"Error parsing Excel file: {str(e)}"


def parse_file(filename: str, file_content: bytes) -> Tuple[bool, any]:
    """
    Parse uploaded file (CSV or Excel) and extract cost records.
    
    Args:
        filename: Name of the uploaded file
        file_content: Binary content of the file
    
    Returns:
        (success, records_or_error_message)
    """
    # Validate file extension
    if not is_allowed_file(filename):
        return False, f"File type not allowed. Supported formats: {', '.join(ALLOWED_EXTENSIONS)}"
    
    # Validate file size
    is_valid_size, error = validate_file_size(len(file_content))
    if not is_valid_size:
        return False, error
    
    # Parse based on file type
    if filename.lower().endswith('.csv'):
        return parse_csv_file(file_content)
    elif filename.lower().endswith(('.xlsx', '.xls')):
        return parse_excel_file(file_content)
    else:
        return False, "Unsupported file format"
