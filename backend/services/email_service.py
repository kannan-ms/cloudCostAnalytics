"""
Email Service for anomaly alerts.
Uses SMTP credentials from environment variables (via Config) to send
notifications with basic cooldown to avoid duplicate emails.
"""

import logging
import smtplib
import ssl
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from email.message import EmailMessage
from typing import Dict, Optional

from config import Config

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=2)
_last_sent_cache: Dict[str, datetime] = {}


def is_email_configured() -> bool:
    """Return True when SMTP settings are present enough to send mail."""
    return bool(Config.EMAIL_HOST and Config.EMAIL_USERNAME and Config.EMAIL_PASSWORD)


def _should_skip(user_id: str, key: str, cooldown_minutes: int) -> bool:
    now = datetime.utcnow()
    cache_key = f"{user_id}:{key}"
    last_sent = _last_sent_cache.get(cache_key)
    if last_sent and (now - last_sent) < timedelta(minutes=cooldown_minutes):
        return True
    _last_sent_cache[cache_key] = now
    return False


def _build_message(to_email: str, subject: str, text_body: str, html_body: str) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = Config.EMAIL_FROM
    msg["To"] = to_email
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")
    return msg


def _send(msg: EmailMessage):
    use_ssl = Config.EMAIL_USE_SSL
    context = ssl.create_default_context()
    if use_ssl:
        with smtplib.SMTP_SSL(Config.EMAIL_HOST, Config.EMAIL_PORT, context=context) as server:
            if Config.EMAIL_USERNAME:
                server.login(Config.EMAIL_USERNAME, Config.EMAIL_PASSWORD)
            server.send_message(msg)
    else:
        with smtplib.SMTP(Config.EMAIL_HOST, Config.EMAIL_PORT) as server:
            if Config.EMAIL_USE_TLS:
                server.starttls(context=context)
            if Config.EMAIL_USERNAME:
                server.login(Config.EMAIL_USERNAME, Config.EMAIL_PASSWORD)
            server.send_message(msg)


def queue_anomaly_email(
    *,
    user: Dict,
    anomaly_type: str,
    detected_value,
    expected_value,
    detected_at,
    recommendation: Optional[str] = None,
) -> None:
    """Queue an anomaly email if user preferences allow it."""
    if not user or not user.get("email"):
        logger.info("Email alert skipped: user email missing")
        return

    if not Config.EMAIL_HOST:
        logger.warning("Email alert skipped: EMAIL_HOST not configured")
        return

    settings = user.get("settings", {})
    alerts_enabled = settings.get("email_alerts_enabled")
    if alerts_enabled is None:
        alerts_enabled = settings.get("email_notifications", False)
    if not alerts_enabled:
        logger.info("Email alert skipped: user disabled alerts", extra={"user_id": str(user.get("_id", ""))})
        return

    cooldown_minutes = settings.get("email_alert_cooldown_minutes") or Config.EMAIL_COOLDOWN_MINUTES
    # Use anomaly type only to avoid minor value changes bypassing cooldown.
    key = f"{anomaly_type}"
    if _should_skip(str(user.get("_id", "")), key, cooldown_minutes):
        logger.info("Email alert skipped due to cooldown", extra={"user_id": str(user.get("_id", "")), "anomaly_type": anomaly_type})
        return

    timestamp = detected_at
    if isinstance(detected_at, str):
        try:
            timestamp = datetime.fromisoformat(detected_at)
        except ValueError:
            timestamp = datetime.utcnow()
    elif not isinstance(detected_at, datetime):
        timestamp = datetime.utcnow()

    subject = "⚠️ Cloud Cost Anomaly Detected"
    text_lines = [
        f"Hi {user.get('name', 'there')},",
        "",
        f"An anomaly was detected: {anomaly_type}.",
        f"Detected value: {detected_value}",
        f"Expected value: {expected_value}",
        f"Timestamp: {timestamp.isoformat()}",
    ]
    if recommendation:
        text_lines.append(f"Recommendation: {recommendation}")
    text_lines.append("\nIf you have questions, reply to this email.")
    text_body = "\n".join(text_lines)

    html_body = f"""
    <div style="font-family: Arial, sans-serif; color: #0f172a;">
      <h2 style="color:#b91c1c; margin: 0 0 12px 0;">Cloud Cost Anomaly Detected</h2>
      <p style="margin: 0 0 12px 0;">Hi {user.get('name', 'there')},</p>
      <p style="margin: 0 0 12px 0;">An anomaly was detected: <strong>{anomaly_type}</strong>.</p>
      <ul style="line-height: 1.6; padding-left: 18px; margin: 0 0 12px 0;">
        <li><strong>Detected value:</strong> {detected_value}</li>
        <li><strong>Expected value:</strong> {expected_value}</li>
        <li><strong>Timestamp:</strong> {timestamp.isoformat()}</li>
      </ul>
      {f'<p style="margin: 0 0 12px 0;"><strong>Recommendation:</strong> {recommendation}</p>' if recommendation else ''}
      <p style="margin: 0;">If you have questions, reply to this email.</p>
    </div>
    """

    msg = _build_message(user["email"], subject, text_body, html_body)

    def _worker():
        try:
            _send(msg)
            logger.info("Anomaly alert email sent", extra={"user_id": str(user.get("_id", "")), "anomaly_type": anomaly_type})
        except Exception as exc:
            logger.error("Failed to send anomaly email", exc_info=exc)

    _executor.submit(_worker)


def send_verification_email(to_email: str, name: str, otp: str) -> None:
    """Queue an OTP verification email."""
    if not is_email_configured():
        raise RuntimeError("Email service is not configured")

    subject = "Verify Your CloudInsight Account"
    
    text_body = f"""Hi {name},

Thank you for registering with CloudInsight! 
Your verification code is: {otp}

This code will expire in 15 minutes.

If you did not request this, please ignore this email.
"""

    html_body = f"""
    <div style="font-family: Arial, sans-serif; color: #0f172a;">
      <h2 style="color:#2563eb; margin: 0 0 12px 0;">Welcome to CloudInsight!</h2>
      <p style="margin: 0 0 12px 0;">Hi {name},</p>
      <p style="margin: 0 0 12px 0;">Your verification code is:</p>
      <div style="font-size: 24px; font-weight: bold; background: #f1f5f9; padding: 12px; display: inline-block; border-radius: 6px; letter-spacing: 2px;">
         {otp}
      </div>
      <p style="margin: 12px 0 0 0; color: #64748b; font-size: 14px;">This code will expire in 15 minutes.</p>
    </div>
    """

    msg = _build_message(to_email, subject, text_body, html_body)

    def _worker():
        try:
            _send(msg)
            logger.info("Verification email sent", extra={"to": to_email})
        except Exception as exc:
            logger.error("Failed to send verification email", exc_info=exc)

    _executor.submit(_worker)
