"""
AWS Billing Data Ingestion Service
----------------------------------
Robust ingestion of AWS billing data using pandas.
Designed to be resilient to schema drift, missing columns, and data type issues.
"""

import pandas as pd
import numpy as np
import io
import logging
from typing import Optional, Dict, List, Tuple, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the STRICT schema we expect in our application
# This ensures that no matter what the input file has, the output DataFrame
# will ALWAYS have these columns.
EXPECTED_SCHEMA = {
    'provider': 'object',
    'usage_start_date': 'datetime64[ns]',
    'usage_end_date': 'datetime64[ns]',
    'service_name': 'object',
    'cost': 'float64',
    'currency': 'object',
    'usage_quantity': 'float64',
    'usage_unit': 'object',
    'resource_id': 'object',
    'region': 'object',
    'tags': 'object'
}

# Mapping of potential input column names to our standard schema columns
# This handles the "Discovery" phase of ingestion.
COLUMN_MAPPINGS = {
    'provider': ['ProductCode', 'Provider', 'provider'], # AWS often uses ProductCode as a proxy for service, but we use 'AWS' as provider constant usually
    'service_name': ['ProductName', 'Service', 'service', 'Product Name'],
    'usage_start_date': ['UsageStartDate', 'UsageStart', 'bill/BillingPeriodStartDate', 'lineItem/UsageStartDate'],
    'usage_end_date': ['UsageEndDate', 'UsageEnd', 'bill/BillingPeriodEndDate', 'lineItem/UsageEndDate'],
    'cost': ['Cost', 'BlendedCost', 'UnblendedCost', 'AmortizedCost', 'lineItem/BlendedCost', 'lineItem/UnblendedCost'],
    'currency': ['CurrencyCode', 'currency', 'lineItem/CurrencyCode'],
    'usage_quantity': ['UsageQuantity', 'Quantity', 'lineItem/UsageAmount'],
    'usage_unit': ['UsageUnit', 'Unit', 'lineItem/UsageType'], # UsageType is often a proxy for unit description
    'resource_id': ['ResourceId', 'Resource', 'lineItem/ResourceId'],
    'region': ['AvailabilityZone', 'Region', 'product/region'],
    'tags': ['Tags', 'user:tags']
}

def clean_currency(val):
    """Clean currency strings like '$1,234.56' to float."""
    if isinstance(val, (int, float)):
        return val
    if isinstance(val, str):
        clean_str = val.replace('$', '').replace(',', '').strip()
        try:
            return float(clean_str)
        except ValueError:
            return 0.0
    return 0.0

def ingest_aws_bill(file_content: bytes, file_format: str = 'csv') -> pd.DataFrame:
    """
    Ingests an AWS billing file and returns a standardized DataFrame.
    
    Resilience Features:
    1. Schema Drift: Uses flexible column mapping.
    2. Missing Data: Fills missing core columns with defaults.
    3. Type Safety: Coerces types (dates, numbers) strictly.
    4. Isolation: Drops unexpected columns to prevent downstream schema pollution.
    """
    try:
        # 1. Load Data
        if file_format.lower() == 'csv':
            # Low_memory=False avoids mixed type warnings on large files
            df = pd.read_csv(io.BytesIO(file_content), low_memory=False)
        elif file_format.lower() in ['xlsx', 'excel']:
            df = pd.read_excel(io.BytesIO(file_content))
        elif file_format.lower() == 'parquet':
            df = pd.read_parquet(io.BytesIO(file_content))
        else:
            raise ValueError(f"Unsupported format: {file_format}")

        if df.empty:
            logger.warning("Ingested file is empty.")
            return pd.DataFrame(columns=EXPECTED_SCHEMA.keys())

        # 2. Normalize Columns
        # Strip whitespace and handle case sensitivity if needed (simple robust step)
        df.columns = df.columns.astype(str).str.strip()
        
        # 3. Apply Column Mapping (The "Discovery" Phase)
        # We construct a rename dictionary based on what we find in the file
        rename_map = {}
        found_cols = set(df.columns)
        
        for target_col, potential_matches in COLUMN_MAPPINGS.items():
            # If the target is already there, good (unless we want to enforce mapping priority)
            if target_col in found_cols:
                continue
                
            # Look for matches
            for match in potential_matches:
                if match in found_cols:
                    rename_map[match] = target_col
                    break # Stop at first match (priority order)
        
        if rename_map:
            logger.info(f"Mapping columns: {rename_map}")
            df = df.rename(columns=rename_map)

        # 4. Enforce Schema (The "Resilience" Phase)
        # Ensure all expected columns exist. If not, create them with defaults.
        for col, dtype in EXPECTED_SCHEMA.items():
            if col not in df.columns:
                logger.warning(f"Column '{col}' missing. creating with default null.")
                df[col] = np.nan

        # 5. Type Coercion & Cleaning
        
        # Dates
        for date_col in ['usage_start_date', 'usage_end_date']:
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            # Fallback: if Start Date is missing, maybe default to "today" or drop? 
            # For billing, we often drop rows without dates, or fill with file date.
            # Here we leave as NaT but filter later if strict.
            
        # Numerics
        # 'cost' might come in as strings "$100.00"
        df['cost'] = df['cost'].apply(clean_currency)
        df['cost'] = pd.to_numeric(df['cost'], errors='coerce').fillna(0.0)
        
        df['usage_quantity'] = pd.to_numeric(df['usage_quantity'], errors='coerce').fillna(0.0)
        
        # Strings
        # Fill NaN with empty string for object columns (cleaner than NaN for text)
        string_cols = [c for c, t in EXPECTED_SCHEMA.items() if t == 'object']
        df[string_cols] = df[string_cols].fillna("Unknown")
        
        # 6. Final Selection
        # Discard any columns not in our EXPECTED_SCHEMA ("Schema strictness")
        df_final = df[list(EXPECTED_SCHEMA.keys())].copy()
        
        # 7. Post-Processing / Defaults
        if 'provider' in df_final.columns and (df_final['provider'] == 'Unknown').all():
             df_final['provider'] = 'AWS' # Default if not specified

        logger.info(f"Successfully digested {len(df_final)} rows.")
        return df_final

    except Exception as e:
        logger.error(f"Failed to ingest AWS bill: {str(e)}")
        # Return empty DF on failure to prevent crash, let caller handle empty
        return pd.DataFrame(columns=EXPECTED_SCHEMA.keys())

# --- Usage Example ---
if __name__ == "__main__":
    # Create a dummy CSV in memory to test drift
    csv_data = """
    lineItem/UsageStartDate,lineItem/UsageEndDate,ProductName,UnblendedCost,StrangeNewColumn
    2023-01-01,2023-01-02,Amazon S3,1.50,foobar
    2023-01-02,2023-01-03,Amazon EC2,"$2,005.00",baz
    """
    
    print("--- Testing Ingestion ---")
    df = ingest_aws_bill(csv_data.encode('utf-8'), 'csv')
    print("\nResulting DataFrame Schema:")
    print(df.info())
    print("\nData:")
    print(df)
