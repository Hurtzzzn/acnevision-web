import hashlib
import hmac
import base64
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from app.core.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with a cryptographically secure random salt.
    Format: salt$hash
    """
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations=100000
    )
    return f"{salt}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain-text password against a stored PBKDF2 salt$hash string using constant-time comparison.
    """
    try:
        salt, key_hex = hashed_password.split("$", 1)
        expected_key = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations=100000
        )
        return hmac.compare_digest(expected_key.hex(), key_hex)
    except Exception:
        return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding and padding < 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a signed JWT access token.
    Uses pure-Python HMAC-SHA256 (RFC 7519) for maximum cross-platform portability.
    """
    header = {"alg": settings.JWT_ALGORITHM, "typ": "JWT"}
    payload = data.copy()

    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload["exp"] = int(expire.timestamp())
    payload["iat"] = int(now.timestamp())

    header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")

    encoded_header = _b64url_encode(header_bytes)
    encoded_payload = _b64url_encode(payload_bytes)

    signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
    signature = hmac.new(
        settings.JWT_SECRET.encode("utf-8"),
        signing_input,
        hashlib.sha256
    ).digest()
    encoded_sig = _b64url_encode(signature)

    return f"{encoded_header}.{encoded_payload}.{encoded_sig}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and validates a JWT token's signature and expiration time.
    Returns payload dictionary if valid, or None if invalid/expired.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        encoded_header, encoded_payload, encoded_sig = parts
        signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")

        expected_sig = hmac.new(
            settings.JWT_SECRET.encode("utf-8"),
            signing_input,
            hashlib.sha256
        ).digest()

        provided_sig = _b64url_decode(encoded_sig)
        if not hmac.compare_digest(expected_sig, provided_sig):
            return None

        payload_bytes = _b64url_decode(encoded_payload)
        payload = json.loads(payload_bytes.decode("utf-8"))

        # Verify expiration
        exp = payload.get("exp")
        if exp and datetime.now(timezone.utc).timestamp() > exp:
            return None

        return payload
    except Exception:
        return None

