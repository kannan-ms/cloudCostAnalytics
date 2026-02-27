"""
Multi-Cloud Cost Ingestion Service
Supports both direct CSP API connectivity (Azure / AWS / GCP)
and CSV billing file upload ingestion.

Normalizes all billing data into a unified format for ML anomaly detection.
"""

import os
import io
import csv
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SERVICE CATEGORY NORMALIZATION
# Delegated to ml.category_mapper (single source of truth).
# Legacy imports kept for backward compatibility.
# ---------------------------------------------------------------------------
from ml.category_mapper import SERVICE_CATEGORIES, get_category


# ---------------------------------------------------------------------------
# PART 3: FILE-BASED CSV COLUMN MAPPINGS (per provider)
# ---------------------------------------------------------------------------

_FILE_COLUMN_MAPS = {
    "azure": {
        "date": ["Date", "UsageStartDate", "usage_start_date"],
        "service": ["MeterCategory", "ServiceName", "service_name"],
        "cost": ["CostInBillingCurrency", "Cost", "cost"],
    },
    "aws": {
        "date": [
            "lineItem/UsageStartDate",
            "bill/BillingPeriodStartDate",
            "UsageStartDate",
            "usage_start_date",
        ],
        "service": [
            "product/ProductName",
            "lineItem/ProductCode",
            "ProductName",
            "service_name",
        ],
        "cost": [
            "lineItem/UnblendedCost",
            "lineItem/BlendedCost",
            "BlendedCost",
            "UnblendedCost",
            "cost",
        ],
    },
    "gcp": {
        "date": ["usage_start_time", "start_time", "usage_start_date"],
        "service": ["service.description", "service_description", "service_name"],
        "cost": ["cost", "total_cost"],
    },
}


# ---------------------------------------------------------------------------
# PART 2 – CSP API CONNECTORS
# ---------------------------------------------------------------------------

def _fetch_azure_api(credentials: Dict, start_date: str, end_date: str) -> pd.DataFrame:
    """
    Fetch billing data from Azure Cost Management API.

    Required credentials:
        tenant_id, client_id, client_secret, subscription_id
    """
    try:
        from azure.identity import ClientSecretCredential
        from azure.mgmt.costmanagement import CostManagementClient
    except ImportError:
        raise ImportError(
            "Azure SDK not installed. Run: pip install azure-identity azure-mgmt-costmanagement"
        )

    required_keys = ["tenant_id", "client_id", "client_secret", "subscription_id"]
    missing = [k for k in required_keys if k not in credentials]
    if missing:
        raise ValueError(f"Missing Azure credentials: {', '.join(missing)}")

    credential = ClientSecretCredential(
        tenant_id=credentials["tenant_id"],
        client_id=credentials["client_id"],
        client_secret=credentials["client_secret"],
    )
    client = CostManagementClient(credential)

    scope = f"/subscriptions/{credentials['subscription_id']}"

    # Build query
    from azure.mgmt.costmanagement.models import (
        QueryDefinition,
        QueryTimePeriod,
        ExportType,
        TimeframeType,
        QueryDataset,
        QueryAggregation,
        QueryGrouping,
    )

    query = QueryDefinition(
        type=ExportType.ACTUAL_COST,
        timeframe=TimeframeType.CUSTOM,
        time_period=QueryTimePeriod(
            from_property=datetime.strptime(start_date, "%Y-%m-%d"),
            to=datetime.strptime(end_date, "%Y-%m-%d"),
        ),
        dataset=QueryDataset(
            granularity="Daily",
            aggregation={
                "totalCost": QueryAggregation(name="CostInBillingCurrency", function="Sum")
            },
            grouping=[
                QueryGrouping(type="Dimension", name="MeterCategory"),
            ],
        ),
    )

    result = client.query.usage(scope=scope, parameters=query)

    rows = result.rows
    columns = [col.name for col in result.columns]
    df = pd.DataFrame(rows, columns=columns)

    # Normalise column names to unified schema
    rename_map = {}
    for col in columns:
        cl = col.lower()
        if "cost" in cl or "totalcost" in cl:
            rename_map[col] = "cost"
        elif "metercategory" in cl or "service" in cl:
            rename_map[col] = "service"
        elif "usagedate" in cl or cl == "date":
            rename_map[col] = "date"

    # Azure usage query returns date as an integer like 20260101
    df = df.rename(columns=rename_map)
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"].astype(str), format="%Y%m%d", errors="coerce")
    if "cost" in df.columns:
        df["cost"] = pd.to_numeric(df["cost"], errors="coerce")

    df["provider"] = "azure"
    return df


def _fetch_aws_api(credentials: Dict, start_date: str, end_date: str) -> pd.DataFrame:
    """
    Fetch billing data from AWS Cost Explorer.

    Required credentials:
        aws_access_key_id, aws_secret_access_key, region_name (optional, default us-east-1)
    """
    try:
        import boto3
    except ImportError:
        raise ImportError("boto3 not installed. Run: pip install boto3")

    required_keys = ["aws_access_key_id", "aws_secret_access_key"]
    missing = [k for k in required_keys if k not in credentials]
    if missing:
        raise ValueError(f"Missing AWS credentials: {', '.join(missing)}")

    ce = boto3.client(
        "ce",
        aws_access_key_id=credentials["aws_access_key_id"],
        aws_secret_access_key=credentials["aws_secret_access_key"],
        region_name=credentials.get("region_name", "us-east-1"),
    )

    response = ce.get_cost_and_usage(
        TimePeriod={"Start": start_date, "End": end_date},
        Granularity="DAILY",
        Metrics=["UnblendedCost"],
        GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
    )

    records: List[Dict] = []
    for result_by_time in response.get("ResultsByTime", []):
        day = result_by_time["TimePeriod"]["Start"]
        for group in result_by_time.get("Groups", []):
            service = group["Keys"][0]
            amount = float(group["Metrics"]["UnblendedCost"]["Amount"])
            records.append({"date": day, "service": service, "cost": amount})

    df = pd.DataFrame(records)
    if not df.empty:
        df["date"] = pd.to_datetime(df["date"])
        df["cost"] = pd.to_numeric(df["cost"], errors="coerce")
    df["provider"] = "aws"
    return df


def _fetch_gcp_api(credentials: Dict, start_date: str, end_date: str) -> pd.DataFrame:
    """
    Fetch billing data from GCP BigQuery billing export.

    Required credentials:
        service_account_json  – path to the JSON key file
        project_id            – GCP project ID
        dataset_id            – BigQuery dataset (e.g. 'billing_export')
        table_id              – BigQuery table  (e.g. 'gcp_billing_export_v1')
    """
    try:
        from google.cloud import bigquery
        from google.oauth2 import service_account
    except ImportError:
        raise ImportError(
            "google-cloud-bigquery not installed. Run: pip install google-cloud-bigquery"
        )

    required_keys = ["service_account_json", "project_id", "dataset_id", "table_id"]
    missing = [k for k in required_keys if k not in credentials]
    if missing:
        raise ValueError(f"Missing GCP credentials: {', '.join(missing)}")

    creds = service_account.Credentials.from_service_account_file(
        credentials["service_account_json"]
    )
    client = bigquery.Client(project=credentials["project_id"], credentials=creds)

    full_table = (
        f"`{credentials['project_id']}.{credentials['dataset_id']}.{credentials['table_id']}`"
    )

    query = f"""
        SELECT
            DATE(usage_start_time) AS date,
            service.description    AS service,
            SUM(cost)              AS cost
        FROM {full_table}
        WHERE usage_start_time >= '{start_date}'
          AND usage_start_time <  '{end_date}'
        GROUP BY date, service
        ORDER BY date
    """

    df = client.query(query).to_dataframe()
    if not df.empty:
        df["date"] = pd.to_datetime(df["date"])
        df["cost"] = pd.to_numeric(df["cost"], errors="coerce")
    df["provider"] = "gcp"
    return df


# ---------------------------------------------------------------------------
# PART 3 – FILE UPLOAD PARSER
# ---------------------------------------------------------------------------

def _resolve_column(df_columns: List[str], candidates: List[str]) -> Optional[str]:
    """Return the first column name from *candidates* that exists in *df_columns*."""
    for c in candidates:
        if c in df_columns:
            return c
    return None


def _parse_file(provider: str, file_path: str) -> pd.DataFrame:
    """
    Read a billing CSV exported from a cloud console and map columns
    to the unified schema: date | service | cost.
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    provider = provider.lower()
    if provider not in _FILE_COLUMN_MAPS:
        raise ValueError(f"Unsupported provider '{provider}'. Use: azure, aws, gcp")

    mapping_spec = _FILE_COLUMN_MAPS[provider]

    df = pd.read_csv(file_path)
    if df.empty:
        raise ValueError("CSV file is empty")

    col_map = {}
    for unified_name, candidates in mapping_spec.items():
        src = _resolve_column(list(df.columns), candidates)
        if src is None:
            raise ValueError(
                f"Cannot find '{unified_name}' column for {provider}. "
                f"Expected one of {candidates}. Found columns: {list(df.columns)}"
            )
        col_map[src] = unified_name

    df = df.rename(columns=col_map)

    # Keep only the unified columns
    df = df[["date", "service", "cost"]].copy()

    # Parse date & cost
    df["date"] = pd.to_datetime(df["date"], utc=True, errors="coerce")
    df["date"] = df["date"].dt.tz_localize(None)  # strip tz for consistency
    df["cost"] = pd.to_numeric(df["cost"], errors="coerce")

    df = df.dropna(subset=["date", "cost"])
    df["service"] = df["service"].astype(str).str.strip()
    df["provider"] = provider
    return df


# ---------------------------------------------------------------------------
# PART 4 + 5: NORMALIZATION & AGGREGATION
# ---------------------------------------------------------------------------

def normalize_and_aggregate(df: pd.DataFrame) -> pd.DataFrame:
    """
    1. Map each service to its infrastructure category.
    2. Aggregate (sum) cost per day per category per provider.

    Returns a DataFrame with columns: date, category, cost, provider
    ready for ML inference by the anomaly detector.
    """
    if df.empty:
        return pd.DataFrame(columns=["date", "category", "cost", "provider"])

    df = df.copy()

    # Ensure correct types
    if not pd.api.types.is_datetime64_any_dtype(df["date"]):
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["cost"] = pd.to_numeric(df["cost"], errors="coerce")

    # Strip timezone if present
    if hasattr(df["date"].dt, "tz") and df["date"].dt.tz is not None:
        df["date"] = df["date"].dt.tz_localize(None)

    # Normalize to calendar date (drop time component)
    df["date"] = df["date"].dt.normalize()

    # Category mapping
    df["category"] = df["service"].map(SERVICE_CATEGORIES).fillna("Other")

    # Aggregation – sum cost per (date, category, provider)
    agg_df = (
        df.groupby(["date", "category", "provider"], as_index=False)["cost"]
        .sum()
        .sort_values(["date", "category"])
        .reset_index(drop=True)
    )

    return agg_df


# ---------------------------------------------------------------------------
# PART 1: UNIFIED INTERFACE
# ---------------------------------------------------------------------------

def fetch_cloud_cost_data(
    source_type: str,
    provider: str,
    credentials: Optional[Dict] = None,
    file_path: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Tuple[bool, Any]:
    """
    Unified entry-point for multi-cloud cost data ingestion.

    Parameters
    ----------
    source_type : str
        ``"api"`` – fetch billing data directly from CSP APIs.
        ``"file"`` – read billing data from an uploaded CSV.

    provider : str
        ``"azure"`` | ``"aws"`` | ``"gcp"``

    credentials : dict, optional
        CSP-specific authentication credentials (required when source_type="api").

    file_path : str, optional
        Absolute path to the uploaded CSV (required when source_type="file").

    start_date / end_date : str, optional
        ``"YYYY-MM-DD"`` date range for API queries.
        Defaults to the last 30 days when omitted.

    Returns
    -------
    (success: bool, result: pd.DataFrame | str)
        On success ``result`` is a normalised & aggregated DataFrame with
        columns: ``date``, ``category``, ``cost``, ``provider``.
        On failure ``result`` is an error message string.
    """
    # ── Validation ────────────────────────────────────────────────────────
    source_type = (source_type or "").lower().strip()
    provider = (provider or "").lower().strip()

    if source_type not in ("api", "file"):
        return False, f"Invalid source_type '{source_type}'. Must be 'api' or 'file'."

    if provider not in ("azure", "aws", "gcp"):
        return False, f"Unsupported provider '{provider}'. Must be 'azure', 'aws', or 'gcp'."

    # Default date range – last 30 days
    if not start_date:
        start_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not end_date:
        end_date = datetime.utcnow().strftime("%Y-%m-%d")

    # ── Fetch raw data ────────────────────────────────────────────────────
    try:
        if source_type == "api":
            if not credentials:
                return False, "Credentials are required for API-based ingestion."

            api_fetchers = {
                "azure": _fetch_azure_api,
                "aws": _fetch_aws_api,
                "gcp": _fetch_gcp_api,
            }
            raw_df = api_fetchers[provider](credentials, start_date, end_date)

        else:  # source_type == "file"
            if not file_path:
                return False, "file_path is required for file-based ingestion."
            raw_df = _parse_file(provider, file_path)

    except ImportError as e:
        return False, f"Missing SDK dependency: {e}"
    except FileNotFoundError as e:
        return False, str(e)
    except ValueError as e:
        return False, str(e)
    except Exception as e:
        logger.exception("Unexpected error during data fetch")
        return False, f"Data fetch failed: {e}"

    # ── Validate fetched data ─────────────────────────────────────────────
    if raw_df is None or raw_df.empty:
        return False, "No billing data returned for the given parameters."

    required_cols = {"date", "service", "cost"}
    if not required_cols.issubset(set(raw_df.columns)):
        return False, (
            f"Fetched data missing columns. Required: {required_cols}. "
            f"Found: {set(raw_df.columns)}"
        )

    # ── Normalize & aggregate ─────────────────────────────────────────────
    try:
        result_df = normalize_and_aggregate(raw_df)
    except Exception as e:
        logger.exception("Normalization failed")
        return False, f"Normalization error: {e}"

    if result_df.empty:
        return False, "All records were filtered out during normalization."

    logger.info(
        "Ingestion complete – %d aggregated rows | provider=%s | source=%s",
        len(result_df),
        provider,
        source_type,
    )
    return True, result_df
