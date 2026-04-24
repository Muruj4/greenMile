import os
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.office365.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))


def send_otp_email(to_email: str, otp: str):
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        raise ValueError("SMTP_EMAIL or SMTP_PASSWORD missing in .env")

    message = EmailMessage()
    message["From"] = SMTP_EMAIL
    message["To"] = to_email
    message["Subject"] = "GreenMile OTP Verification Code"

    message.set_content(
        f"""
Hello,

Your GreenMile verification code is:

{otp}

This code will expire in 5 minutes.

If you did not request this, please ignore this email.

GreenMile Team
"""
    )

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(message)