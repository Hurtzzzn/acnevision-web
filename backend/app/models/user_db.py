import sqlite3
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.core.config import get_settings
from app.core.auth_crypto import hash_password
from app.core.logger import logger

settings = get_settings()


class UserRepository:
    """
    SQLite-backed repository for User accounts, authentication credentials, and profiles.
    Ensures persistent storage, zero C-dependency installation, and automated test account seeding.
    """

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or settings.SQLITE_DB_PATH
        self._init_db()
        self._seed_test_accounts()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Initializes database schema if not present."""
        with self._get_connection() as conn:
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
            conn.commit()

    def _seed_test_accounts(self):
        """
        Seeds standard test accounts (Admin, Demo User, and Clinical Patient)
        if they do not already exist in the database.
        """
        test_accounts = [
            {
                "id": "u-admin",
                "email": "admin@acnevision.test",
                "password": "admin12345",
                "full_name": "Admin AcneVision",
                "role": "admin",
            },
            {
                "id": "u-demo",
                "email": "demo@acnevision.test",
                "password": "demo12345",
                "full_name": "Pengguna Demo",
                "role": "user",
            },
            {
                "id": "u-pasien",
                "email": "pasien@acnevision.test",
                "password": "pasien12345",
                "full_name": "Siti Nurhaliza (Pasien)",
                "role": "user",
            },
        ]

        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            for acc in test_accounts:
                existing = conn.execute("SELECT id FROM users WHERE email = ?", (acc["email"],)).fetchone()
                if not existing:
                    pwd_hash = hash_password(acc["password"])
                    conn.execute("""
                        INSERT INTO users (id, email, password_hash, full_name, avatar_url, role, status, created_at, last_seen_at)
                        VALUES (?, ?, ?, ?, NULL, ?, 'active', ?, ?)
                    """, (acc["id"], acc["email"], pwd_hash, acc["full_name"], acc["role"], now, now))
                    logger.info(f"Seeded test account: {acc['email']} ({acc['role']})")
            conn.commit()

    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            return dict(row) if row else None

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM users WHERE lower(email) = lower(?)", (email.strip(),)).fetchone()
            return dict(row) if row else None

    def create(self, email: str, password_hash: str, full_name: str, role: str = "user") -> Dict[str, Any]:
        user_id = f"u-{uuid.uuid4().hex[:10]}"
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO users (id, email, password_hash, full_name, avatar_url, role, status, created_at, last_seen_at)
                VALUES (?, ?, ?, ?, NULL, ?, 'active', ?, ?)
            """, (user_id, email.strip().lower(), password_hash, full_name.strip(), role, now, now))
            conn.commit()
        return self.get_by_id(user_id)  # type: ignore

    def update(self, user_id: str, **fields) -> Optional[Dict[str, Any]]:
        if not fields:
            return self.get_by_id(user_id)

        set_clauses = []
        params = []
        for key, val in fields.items():
            set_clauses.append(f"{key} = ?")
            params.append(val)
        params.append(user_id)

        query = f"UPDATE users SET {', '.join(set_clauses)} WHERE id = ?"
        with self._get_connection() as conn:
            conn.execute(query, params)
            conn.commit()
        return self.get_by_id(user_id)

    def list_all(self, page: int = 1, page_size: int = 20) -> tuple[List[Dict[str, Any]], int]:
        offset = (page - 1) * page_size
        with self._get_connection() as conn:
            total = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            rows = conn.execute(
                "SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (page_size, offset)
            ).fetchall()
            return [dict(r) for r in rows], total


Tuple_Paginated = tuple[List[Dict[str, Any]], int]

user_repository = UserRepository()

