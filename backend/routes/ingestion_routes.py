"""
Ingestion Routes – REST API endpoints for multi-cloud cost ingestion.
Supports both CSP API connectivity and CSV file upload.
"""

import os
import tempfile
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import pandas as pd
from config import Config
from services import user_service
from services.cloud_cost_ingestion import fetch_cloud_cost_data
from ml.category_mapper import SERVICE_CATEGORIES
from services.anomaly_detector import detect_anomalies_from_dataframe
from services.cost_service import bulk_ingest_costs

logger = logging.getLogger(__name__)

ingestion_routes = Blueprint("ingestion", __name__, url_prefix="/api/ingestion")


def _persist_normalized_costs(user_id: str, result_df):
    """
    Persist normalized ingestion rows into cloud_costs using existing service validation.
    Handles null/None values gracefully and validates all required fields.
    """
    if result_df is None or result_df.empty:
        return True, {
            "total_records": 0,
            "success_count": 0,
            "error_count": 0,
            "errors": []
        }
    
    records = []
    parse_errors = []
    
    for row_index, row in result_df.iterrows():
        try:
            # Parse and validate date
            row_date = row.get("date")
            
            # Handle missing or invalid dates by skipping invalid rows.
            if hasattr(row_date, "to_pydatetime"):
                row_date = row_date.to_pydatetime()
            
            if row_date is None or pd.isna(row_date):
                parse_errors.append({"row": int(row_index), "field": "date", "error": "Missing date"})
                continue
            elif isinstance(row_date, str):
                try:
                    row_date = datetime.fromisoformat(row_date.replace('Z', '+00:00'))
                except Exception:
                    parse_errors.append({"row": int(row_index), "field": "date", "error": "Invalid date format"})
                    continue
            elif not isinstance(row_date, datetime):
                parse_errors.append({"row": int(row_index), "field": "date", "error": "Unsupported date type"})
                continue

            # Parse and validate cost
            try:
                cost_val = row.get("cost")
                if cost_val is None or pd.isna(cost_val):
                    parse_errors.append({"row": int(row_index), "field": "cost", "error": "Missing cost value"})
                    continue
                normalized_cost = float(cost_val)
            except (TypeError, ValueError) as e:
                parse_errors.append({"row": int(row_index), "field": "cost", "error": f"Invalid numeric cost: {str(e)}"})
                continue

            # Extract and normalize provider
            provider_val = row.get("provider")
            if provider_val is None or pd.isna(provider_val):
                provider_val = "Other"
            else:
                provider_val = str(provider_val).strip().lower()
            
            provider_map = {"aws": "AWS", "azure": "Azure", "gcp": "GCP"}
            normalized_provider = provider_map.get(provider_val, "Other")

            # Extract category/service name - must not be empty
            category_val = row.get("category")
            if category_val is None or pd.isna(category_val):
                service_name = "Other"
            else:
                service_name = str(category_val).strip()
                if not service_name:
                    service_name = "Other"

            # Safe extraction of optional fields
            def safe_get_str(field_name, default=""):
                """Safely extract a string field, handling None/NaN values."""
                val = row.get(field_name)
                if val is None or (isinstance(val, float) and pd.isna(val)):
                    return default
                return str(val).strip() if val is not None else default

            def safe_get_float(field_name, default=0.0):
                """Safely extract a float field, handling None/NaN values."""
                val = row.get(field_name)
                if val is None or (isinstance(val, float) and pd.isna(val)):
                    return default
                try:
                    return float(val)
                except (TypeError, ValueError):
                    return default

            def safe_get_dict(field_name, default=None):
                """Safely extract a dict field, handling None/NaN values."""
                val = row.get(field_name)
                if val is None or (isinstance(val, float) and pd.isna(val)):
                    return default if default is not None else {}
                if isinstance(val, dict):
                    return val
                return default if default is not None else {}

            # Build record with safe field extraction
            region = safe_get_str("region", "global")
            account_id = safe_get_str("account_id", "")
            usage_unit = safe_get_str("usage_unit", "")
            currency = safe_get_str("currency", "USD")
            usage_quantity = safe_get_float("usage_quantity", 0.0)
            tags = safe_get_dict("tags", {})

            records.append({
                "provider": normalized_provider,
                "service_name": service_name,
                "cost": normalized_cost,
                "usage_start_date": row_date,
                "usage_end_date": row_date,
                "region": region,
                "currency": currency,
                "cloud_account_id": account_id,
                "usage_quantity": usage_quantity,
                "usage_unit": usage_unit,
                "tags": tags,
                "metadata": {
                    "source": "ingestion",
                    "aggregation": "category_daily",
                    "ingested_at": datetime.utcnow().isoformat()
                }
            })

        except Exception as e:
            parse_errors.append({
                "row": int(row_index),
                "field": "row",
                "error": f"Row processing failed: {str(e)}"
            })
            logger.exception(f"Error processing row {row_index}")
            continue

    if not records:
        return True, {
            "total_records": 0,
            "success_count": 0,
            "error_count": len(parse_errors),
            "errors": parse_errors[:10]
        }

    total_records = len(records)
    total_success = 0
    total_errors = len(parse_errors)
    merged_errors = list(parse_errors)

    for start in range(0, total_records, 1000):
        chunk = records[start:start + 1000]
        ok, chunk_result = bulk_ingest_costs(user_id, chunk)
        if not ok:
            return False, {
                "error": chunk_result.get("error", "Bulk ingestion failed")
            }

        total_success += chunk_result.get("success_count", 0)
        total_errors += chunk_result.get("error_count", 0)
        chunk_errors = chunk_result.get("errors", [])
        if chunk_errors:
            merged_errors.extend(chunk_errors)

    return True, {
        "total_records": total_records,
        "success_count": total_success,
        "error_count": total_errors,
        "errors": merged_errors[:10]
    }


# ── Auth decorator (same pattern as cost_routes) ─────────────────────────
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            try:
                token = request.headers["Authorization"].split(" ")[1]
            except IndexError:
                return jsonify({"error": "Invalid token format"}), 401
        if not token:
            return jsonify({"error": "Token missing"}), 401
        try:
            payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITHM])
            user = user_service.get_user_by_id(payload["user_id"])
            if not user:
                return jsonify({"error": "User not found"}), 401
            return f(payload["user_id"], *args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
    return decorated


# ── POST /api/ingestion/api – fetch from CSP API ─────────────────────────
@ingestion_routes.route("/api", methods=["POST"])
@token_required
def ingest_from_api(current_user_id):
    """
    Fetch billing data from a cloud provider API.

    Request JSON:
    {
        "provider": "azure" | "aws" | "gcp",
        "credentials": { ... },          // provider-specific keys
        "start_date": "2026-01-01",       // optional
        "end_date":   "2026-01-31"        // optional
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON body provided"}), 400

    provider = data.get("provider")
    credentials = data.get("credentials")
    start_date = data.get("start_date")
    end_date = data.get("end_date")

    if not provider:
        return jsonify({"error": "provider is required"}), 400
    if not credentials:
        return jsonify({"error": "credentials are required for API ingestion"}), 400

    success, result = fetch_cloud_cost_data(
        source_type="api",
        provider=provider,
        credentials=credentials,
        start_date=start_date,
        end_date=end_date,
    )

    if not success:
        return jsonify({"error": result}), 400

    if result is None or result.empty:
        return jsonify({"error": "No data returned from cloud provider"}), 400

    ingest_ok, ingest_result = _persist_normalized_costs(current_user_id, result)
    if not ingest_ok:
        return jsonify({"error": ingest_result.get("error", "Failed to persist ingested data")}), 500

    # Log successful ingestion
    logger.info(f"API ingestion completed: {ingest_result['success_count']} records inserted, {ingest_result['error_count']} errors")
    
    # result is a normalised DataFrame
    summary = {
        "rows_ingest": len(result) if result is not None else 0,
        "categories": result["category"].unique().tolist() if result is not None and len(result) > 0 else [],
        "date_range": {
            "from": str(result["date"].min().date()) if result is not None and len(result) > 0 else "N/A",
            "to": str(result["date"].max().date()) if result is not None and len(result) > 0 else "N/A",
        },
        "total_cost": round(float(result["cost"].sum()), 2) if result is not None and len(result) > 0 else 0,
        "database_insert": {
            "success_count": ingest_result["success_count"],
            "error_count": ingest_result["error_count"],
            "inserted_ids": ingest_result.get("inserted_ids", [])[:10]
        },
        "errors": ingest_result.get("errors", [])[:5] if ingest_result.get("errors") else []
    }

    return jsonify({"success": True, "summary": summary}), 200


# ── POST /api/ingestion/file – upload CSV file ───────────────────────────
@ingestion_routes.route("/file", methods=["POST"])
@token_required
def ingest_from_file(current_user_id):
    """
    Upload a billing CSV file from Azure / AWS / GCP.

    Multipart form fields:
        provider : "azure" | "aws" | "gcp"
        file     : the CSV file
    """
    provider = request.form.get("provider")
    if not provider:
        return jsonify({"error": "provider form field is required"}), 400

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    uploaded = request.files["file"]
    if uploaded.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    # Save to a temp file so _parse_file can read it
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
    try:
        uploaded.save(tmp.name)
        tmp.close()

        success, result = fetch_cloud_cost_data(
            source_type="file",
            provider=provider,
            file_path=tmp.name,
        )
    finally:
        # Clean up temp file
        if os.path.exists(tmp.name):
            os.unlink(tmp.name)

    if not success:
        return jsonify({"error": result}), 400

    if result is None or result.empty:
        return jsonify({"error": "No data returned from file"}), 400

    ingest_ok, ingest_result = _persist_normalized_costs(current_user_id, result)
    if not ingest_ok:
        return jsonify({"error": ingest_result.get("error", "Failed to persist ingested data")}), 500

    # Log successful ingestion
    logger.info(f"File ingestion completed: {ingest_result['success_count']} records inserted, {ingest_result['error_count']} errors")
    
    summary = {
        "rows_ingest": len(result) if result is not None else 0,
        "categories": result["category"].unique().tolist() if result is not None and len(result) > 0 else [],
        "date_range": {
            "from": str(result["date"].min().date()) if result is not None and len(result) > 0 else "N/A",
            "to": str(result["date"].max().date()) if result is not None and len(result) > 0 else "N/A",
        },
        "total_cost": round(float(result["cost"].sum()), 2) if result is not None and len(result) > 0 else 0,
        "database_insert": {
            "success_count": ingest_result["success_count"],
            "error_count": ingest_result["error_count"],
            "inserted_ids": ingest_result.get("inserted_ids", [])[:10]  # Show first 10
        },
        "errors": ingest_result.get("errors", [])[:5] if ingest_result.get("errors") else []
    }
    for rec in summary.get("data", []):
        if "date" in rec:
            rec["date"] = str(rec["date"].date()) if hasattr(rec["date"], "date") else str(rec["date"])

    return jsonify({"success": True, "summary": summary}), 200


# ── POST /api/ingestion/detect – ingest + run anomaly detection ──────────
@ingestion_routes.route("/detect", methods=["POST"])
@token_required
def ingest_and_detect(current_user_id):
    """
    Ingest data (API or file) then immediately run ML anomaly detection
    on the normalised result.

    JSON body (for API):
    {
        "source_type": "api",
        "provider": "aws",
        "credentials": { ... },
        "start_date": "2026-01-01",
        "end_date":   "2026-01-31"
    }

    OR multipart form (for file):
        source_type : "file"
        provider    : "azure"
        file        : <csv>
    """
    source_type = (
        request.form.get("source_type")
        or (request.get_json() or {}).get("source_type", "")
    ).lower()

    if source_type == "file":
        provider = request.form.get("provider", "")
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        uploaded = request.files["file"]
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
        try:
            uploaded.save(tmp.name)
            tmp.close()
            success, result = fetch_cloud_cost_data(
                source_type="file", provider=provider, file_path=tmp.name
            )
        finally:
            if os.path.exists(tmp.name):
                os.unlink(tmp.name)

    elif source_type == "api":
        data = request.get_json() or {}
        success, result = fetch_cloud_cost_data(
            source_type="api",
            provider=data.get("provider", ""),
            credentials=data.get("credentials"),
            start_date=data.get("start_date"),
            end_date=data.get("end_date"),
        )
    else:
        return jsonify({"error": "source_type must be 'api' or 'file'"}), 400

    if not success:
        return jsonify({"error": result}), 400

    if result is None or result.empty:
        return jsonify({"error": "No data returned from source"}), 400

    ingest_ok, ingest_result = _persist_normalized_costs(current_user_id, result)
    if not ingest_ok:
        return jsonify({"error": ingest_result.get("error", "Failed to persist ingested data")}), 500

    # Run ML anomaly detection on the normalized DataFrame
    anomalies = detect_anomalies_from_dataframe(result) if result is not None else []
    
    # Store detected anomalies to database WITH deduplication
    if anomalies:
        try:
            from database import get_collection, Collections
            from bson import ObjectId
            from datetime import timedelta
            
            anomalies_col = get_collection(Collections.ANOMALIES)
            
            # Deduplication: find the date range from detected anomalies
            if anomalies:
                earliest_anomaly = min(a['detected_at'] for a in anomalies)
                dedup_start = earliest_anomaly - timedelta(days=1)
            else:
                dedup_start = datetime.utcnow() - timedelta(days=30)
            
            # Find existing anomalies in this date range
            existing = list(anomalies_col.find({
                "user_id": ObjectId(current_user_id),
                "detected_at": {"$gte": dedup_start}
            }, {"service_name": 1, "detected_at": 1}))
            
            # Create set for O(1) lookup: (service, date_string)
            existing_keys = set(
                (e['service_name'], e['detected_at'].strftime('%Y-%m-%d')) 
                for e in existing if 'detected_at' in e
            )
            
            # Filter to only NEW anomalies
            anomaly_docs = []
            for anom in anomalies:
                key = (anom.get("service_name"), anom.get("detected_at", datetime.utcnow()).strftime('%Y-%m-%d'))
                
                if key not in existing_keys:
                    anom_doc = {
                        "user_id": ObjectId(current_user_id),
                        "service_name": anom.get("service_name"),
                        "detected_value": anom.get("detected_value"),
                        "expected_value": anom.get("expected_value"),
                        "threshold": anom.get("threshold"),
                        "deviation_percentage": anom.get("deviation_percentage"),
                        "severity": anom.get("severity"),
                        "message": anom.get("message"),
                        "detected_at": anom.get("detected_at", datetime.utcnow()),
                        "created_at": datetime.utcnow(),
                        "type": "ingestion",
                        "status": "new"
                    }
                    anomaly_docs.append(anom_doc)
                    existing_keys.add(key)
            
            if anomaly_docs:
                anomalies_col.insert_many(anomaly_docs)
                logger.info(f"Stored {len(anomaly_docs)} NEW anomalies (deduped) for user {current_user_id}")
        except Exception as e:
            logger.error(f"Failed to store anomalies: {e}")

    return jsonify({
        "success": True,
        "ingestion": {
            "rows_processed": len(result) if result is not None and len(result) > 0 else 0,
            "categories": result["category"].unique().tolist() if result is not None and len(result) > 0 else [],
            "total_cost": round(float(result["cost"].sum()), 2) if result is not None and len(result) > 0 else 0,
            "database_insert": {
                "success_count": ingest_result["success_count"],
                "error_count": ingest_result["error_count"]
            },
        },
        "anomalies_detected": {
            "total": len(anomalies) if anomalies else 0,
            "stored": len(anomalies) if anomalies else 0,
            "items": anomalies[:10] if anomalies else []  # Show first 10
        },
    }), 200


# ── GET /api/ingestion/categories – list known categories ────────────────
@ingestion_routes.route("/categories", methods=["GET"])
def list_categories():
    """Return the full service-to-category mapping."""
    return jsonify({"categories": SERVICE_CATEGORIES}), 200
