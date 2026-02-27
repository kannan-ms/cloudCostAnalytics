"""
Ingestion Routes – REST API endpoints for multi-cloud cost ingestion.
Supports both CSP API connectivity and CSV file upload.
"""

import os
import tempfile
import logging
from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
from config import Config
from services import user_service
from services.cloud_cost_ingestion import fetch_cloud_cost_data
from ml.category_mapper import SERVICE_CATEGORIES
from services.anomaly_detector import detect_anomalies_from_dataframe

logger = logging.getLogger(__name__)

ingestion_routes = Blueprint("ingestion", __name__, url_prefix="/api/ingestion")


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

    # result is a normalised DataFrame
    summary = {
        "rows": len(result),
        "categories": result["category"].unique().tolist(),
        "date_range": {
            "from": str(result["date"].min().date()),
            "to": str(result["date"].max().date()),
        },
        "total_cost": round(float(result["cost"].sum()), 2),
        "data": result.to_dict(orient="records"),
    }

    # Convert Timestamps to strings for JSON serialisation
    for rec in summary["data"]:
        rec["date"] = str(rec["date"].date()) if hasattr(rec["date"], "date") else str(rec["date"])

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

    summary = {
        "rows": len(result),
        "categories": result["category"].unique().tolist(),
        "date_range": {
            "from": str(result["date"].min().date()),
            "to": str(result["date"].max().date()),
        },
        "total_cost": round(float(result["cost"].sum()), 2),
        "data": result.to_dict(orient="records"),
    }
    for rec in summary["data"]:
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

    # Run ML anomaly detection on the normalized DataFrame
    anomalies = detect_anomalies_from_dataframe(result)

    return jsonify({
        "success": True,
        "ingestion": {
            "rows": len(result),
            "categories": result["category"].unique().tolist(),
            "total_cost": round(float(result["cost"].sum()), 2),
        },
        "anomalies": {
            "total_detected": len(anomalies),
            "items": anomalies,
        },
    }), 200


# ── GET /api/ingestion/categories – list known categories ────────────────
@ingestion_routes.route("/categories", methods=["GET"])
def list_categories():
    """Return the full service-to-category mapping."""
    return jsonify({"categories": SERVICE_CATEGORIES}), 200
