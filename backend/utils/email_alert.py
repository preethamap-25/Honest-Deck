"""
Email alert system using SMTP (Gmail-compatible).
Sends alerts for high-risk detections.
"""
import os
import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
ALERT_RECIPIENT = os.getenv("ALERT_RECIPIENT", "")


def _build_html(alert: dict) -> str:
    color = "#dc2626" if alert["risk_score"] >= 0.75 else "#f59e0b"
    return f"""
    <html><body style="font-family:Arial,sans-serif;padding:20px;">
      <h2 style="color:{color};">⚠️ SEETHRU Alert: {alert['label']}</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;font-weight:bold;">Input Type</td>
            <td style="padding:8px;">{alert['input_type']}</td></tr>
        <tr style="background:#f3f4f6"><td style="padding:8px;font-weight:bold;">Risk Score</td>
            <td style="padding:8px;">{alert['risk_score']:.0%}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Alert ID</td>
            <td style="padding:8px;">{alert['alert_id']}</td></tr>
        <tr style="background:#f3f4f6"><td style="padding:8px;font-weight:bold;">Explanation</td>
            <td style="padding:8px;">{alert['explanation']}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:12px;margin-top:20px;">
        Sent by SEETHRU Misinformation Detection System
      </p>
    </body></html>
    """


def _send_email_sync(alert: dict) -> None:
    if not all([SMTP_USER, SMTP_PASSWORD, ALERT_RECIPIENT]):
        return  # Email not configured — skip silently

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[SEETHRU] {alert['label']} Detected — Risk {alert['risk_score']:.0%}"
    msg["From"] = SMTP_USER
    msg["To"] = ALERT_RECIPIENT
    msg.attach(MIMEText(_build_html(alert), "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, ALERT_RECIPIENT, msg.as_string())


async def send_alert_email(alert: dict) -> None:
    """Non-blocking wrapper — fire and forget."""
    try:
        await asyncio.to_thread(_send_email_sync, alert)
    except Exception:
        pass  # Do not crash the pipeline if email fails
