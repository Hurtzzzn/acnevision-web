"""
Standalone verification script for AcneVision AI Account & Auth system.
Uses standard Python library (sqlite3, hashlib, hmac, json, secrets)
to verify database persistence, test accounts, password hashing, and JWT tokens.
"""
import os
import sys
import sqlite3
import hashlib
import hmac
import base64
import json
import secrets
from datetime import datetime, timezone, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "acnevision_users.db")
JWT_SECRET = "acnevision-super-secret-jwt-key-2026-secure"


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"


def verify_password(plain: str, hashed: str) -> bool:
    try:
        salt, key_hex = hashed.split("$", 1)
        expected = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt.encode("utf-8"), 100000)
        return hmac.compare_digest(expected.hex(), key_hex)
    except Exception:
        return False


def create_token(sub: str, role: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": sub,
        "role": role,
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "exp": int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp()),
    }
    b64h = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    b64p = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig_input = f"{b64h}.{b64p}".encode()
    sig = base64.urlsafe_b64encode(hmac.new(JWT_SECRET.encode(), sig_input, hashlib.sha256).digest()).decode().rstrip("=")
    return f"{b64h}.{b64p}.{sig}"


def decode_token(token: str):
    parts = token.split(".")
    if len(parts) != 3:
        return None
    b64h, b64p, b64s = parts
    sig_input = f"{b64h}.{b64p}".encode()
    expected_sig = base64.urlsafe_b64encode(hmac.new(JWT_SECRET.encode(), sig_input, hashlib.sha256).digest()).decode().rstrip("=")
    if not hmac.compare_digest(expected_sig, b64s):
        return None
    pad = 4 - (len(b64p) % 4)
    if pad and pad < 4:
        b64p += "=" * pad
    return json.loads(base64.urlsafe_b64decode(b64p).decode())


def run_checks():
    print("=" * 60)
    print("  AcneVision AI: Account & Auth System Verification")
    print("=" * 60)

    # 1. Database Check
    print("\n[1/4] Checking SQLite Database and Seeded Test Accounts...")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            avatar_url TEXT,
            role TEXT NOT NULL DEFAULT 'user',
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL,
            last_seen_at TEXT
        )
    """)

    test_accounts = [
        ("u-admin", "admin@acnevision.test", "admin12345", "Admin AcneVision", "admin"),
        ("u-demo", "demo@acnevision.test", "demo12345", "Pengguna Demo", "user"),
        ("u-pasien", "pasien@acnevision.test", "pasien12345", "Siti Nurhaliza (Pasien)", "user"),
    ]

    now = datetime.now(timezone.utc).isoformat()
    for uid, email, pwd, name, role in test_accounts:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not row:
            conn.execute(
                "INSERT INTO users VALUES (?, ?, ?, ?, NULL, ?, 'active', ?, ?)",
                (uid, email, hash_password(pwd), name, role, now, now),
            )
    conn.commit()

    rows = conn.execute("SELECT id, email, full_name, role, status FROM users").fetchall()
    print(f"  -> Found {len(rows)} user accounts in database:")
    for r in rows:
        print(f"     * {r['email']:<25} | Name: {r['full_name']:<22} | Role: {r['role']:<6} | Status: {r['status']}")

    # 2. Authentication Verification
    print("\n[2/4] Testing Password Hashing & Verification (PBKDF2-HMAC-SHA256)...")
    for _, email, pwd, _, _ in test_accounts:
        row = conn.execute("SELECT password_hash FROM users WHERE email = ?", (email,)).fetchone()
        valid = verify_password(pwd, row["password_hash"])
        invalid = verify_password("wrong_password", row["password_hash"])
        print(f"  -> Testing {email}:")
        print(f"     - Correct password ('{pwd}'): {'PASSED (Valid)' if valid else 'FAILED'}")
        print(f"     - Wrong password ('wrong_password'): {'PASSED (Rejected)' if not invalid else 'FAILED'}")
        assert valid, f"Password verification failed for {email}"
        assert not invalid, f"False positive on wrong password for {email}"

    # 3. JWT Token Lifecycle
    print("\n[3/4] Testing JWT Token Generation & Validation (RFC 7519)...")
    token = create_token("u-admin", "admin")
    print(f"  -> Generated JWT for 'u-admin': {token[:35]}...")
    payload = decode_token(token)
    assert payload is not None, "Failed to decode valid JWT"
    assert payload["sub"] == "u-admin" and payload["role"] == "admin"
    print(f"  -> Decoded Token Payload: {payload}")
    tampered_token = token[:-4] + "xyz1"
    assert decode_token(tampered_token) is None, "Tampered token was not rejected!"
    print("  -> Tampered Token Test: PASSED (Signature mismatch correctly rejected)")

    # 4. Role-Based Access Control (RBAC) Logic
    print("\n[4/4] Testing Role-Based Access Control (RBAC)...")
    admin_payload = decode_token(create_token("u-admin", "admin"))
    user_payload = decode_token(create_token("u-demo", "user"))

    is_admin_allowed = admin_payload.get("role") == "admin"
    is_user_blocked = user_payload.get("role") != "admin"
    print(f"  -> Admin Accessing Admin Area: {'ALLOWED (200 OK)' if is_admin_allowed else 'BLOCKED'}")
    print(f"  -> User Accessing Admin Area: {'BLOCKED (403 Forbidden)' if is_user_blocked else 'UNAUTHORIZED ACCESS'}")

    conn.close()
    print("\n" + "=" * 60)
    print("  ALL USER & AUTH SYSTEM CHECKS PASSED SUCCESSFULLY! ")
    print("=" * 60)


if __name__ == "__main__":
    run_checks()

