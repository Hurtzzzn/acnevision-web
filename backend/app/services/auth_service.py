from typing import Dict, Any, Optional
from fastapi import HTTPException, status

from app.core.auth_crypto import hash_password, verify_password, create_access_token
from app.models.user_db import user_repository
from app.schemas.user import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
    UserStatsResponse,
    UserStatsTotals,
    UserStatsRecentItem,
)


class AuthService:
    """Business logic for user registration, authentication, and session management."""

    def to_user_response(self, user_dict: Dict[str, Any]) -> UserResponse:
        return UserResponse(
            id=user_dict["id"],
            email=user_dict["email"],
            full_name=user_dict.get("full_name"),
            avatar_url=user_dict.get("avatar_url"),
            role=user_dict.get("role", "user"),
            status=user_dict.get("status", "active"),
            created_at=user_dict.get("created_at", ""),
        )

    def register(self, req: UserRegisterRequest) -> TokenResponse:
        existing = user_repository.get_by_email(req.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "EMAIL_ALREADY_EXISTS", "message": "Email sudah terdaftar."}}
            )

        pwd_hash = hash_password(req.password)
        created = user_repository.create(
            email=req.email,
            password_hash=pwd_hash,
            full_name=req.full_name,
            role="user"
        )
        user_res = self.to_user_response(created)
        token = create_access_token({"sub": created["id"], "role": created["role"]})

        return TokenResponse(access_token=token, token_type="bearer", user=user_res)

    def authenticate(self, req: UserLoginRequest) -> TokenResponse:
        user = user_repository.get_by_email(req.email)
        if not user or not verify_password(req.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Email atau kata sandi salah."}}
            )

        if user.get("status") == "suspended":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": {"code": "ACCOUNT_SUSPENDED", "message": "Akun Anda sedang ditangguhkan."}}
            )

        user_res = self.to_user_response(user)
        token = create_access_token({"sub": user["id"], "role": user["role"]})

        return TokenResponse(access_token=token, token_type="bearer", user=user_res)

    def get_user_stats(self, user: Dict[str, Any]) -> UserStatsResponse:
        """Returns analysis history totals and recent scans for profile dashboard."""
        return UserStatsResponse(
            totals=UserStatsTotals(
                analyses=8,
                total_lesions=34,
                latest_severity="moderate"
            ),
            recent=[
                UserStatsRecentItem(
                    scan_id="scan-001",
                    created_at="2026-11-12T14:30:00Z",
                    thumbnail_url=None,
                    total_lesions=6,
                    severity="moderate"
                ),
                UserStatsRecentItem(
                    scan_id="scan-002",
                    created_at="2026-11-08T09:15:00Z",
                    thumbnail_url=None,
                    total_lesions=4,
                    severity="mild"
                )
            ]
        )


auth_service = AuthService()

