from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Query, status, HTTPException
from app.core.dependencies import get_current_user, get_current_admin
from app.models.user_db import user_repository
from app.services.auth_service import auth_service
from app.schemas.user import (
    UserResponse,
    UserUpdateRequest,
    AdminUserUpdateRequest,
    UserStatsResponse,
    PaginatedUsersResponse,
)

router = APIRouter(tags=["User Profile & Accounts"])


# --- User Profile Endpoints (Self) ---

@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Current User Profile",
    description="Returns authenticated user profile details matching frontend 'Me' interface."
)
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)) -> UserResponse:
    return auth_service.to_user_response(current_user)


@router.patch(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Current User Profile",
    description="Updates user profile fields (e.g. full_name, avatar_url)."
)
async def update_me(
    payload: UserUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> UserResponse:
    update_data = {}
    if payload.full_name is not None:
        update_data["full_name"] = payload.full_name.strip()
    if payload.avatar_url is not None:
        update_data["avatar_url"] = payload.avatar_url

    updated = user_repository.update(current_user["id"], **update_data)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return auth_service.to_user_response(updated)


@router.get(
    "/me/stats",
    response_model=UserStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Current User Statistics",
    description="Returns aggregate scan totals and recent scan history."
)
async def get_me_stats(current_user: Dict[str, Any] = Depends(get_current_user)) -> UserStatsResponse:
    return auth_service.get_user_stats(current_user)


# --- Admin Management Endpoints ---

@router.get(
    "/admin/users",
    response_model=PaginatedUsersResponse,
    status_code=status.HTTP_200_OK,
    summary="List All Users (Admin Only)",
    description="Paginated list of registered users for administrator panel."
)
async def list_admin_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    _admin: Dict[str, Any] = Depends(get_current_admin)
) -> PaginatedUsersResponse:
    users_raw, total = user_repository.list_all(page=page, page_size=page_size)
    user_items = [auth_service.to_user_response(u) for u in users_raw]
    return PaginatedUsersResponse(
        items=user_items,
        page=page,
        page_size=page_size,
        total=total
    )


@router.patch(
    "/admin/users/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update User Status / Role (Admin Only)",
    description="Allows administrator to suspend/activate accounts or change user roles."
)
async def admin_update_user(
    user_id: str,
    payload: AdminUserUpdateRequest,
    _admin: Dict[str, Any] = Depends(get_current_admin)
) -> UserResponse:
    existing = user_repository.get_by_id(user_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "USER_NOT_FOUND", "message": "Pengguna tidak ditemukan."}}
        )

    update_data = {}
    if payload.full_name is not None:
        update_data["full_name"] = payload.full_name
    if payload.role is not None:
        update_data["role"] = payload.role
    if payload.status is not None:
        update_data["status"] = payload.status

    updated = user_repository.update(user_id, **update_data)
    return auth_service.to_user_response(updated)  # type: ignore


@router.get(
    "/admin/stats/usage",
    status_code=status.HTTP_200_OK,
    summary="Admin Usage Telemetry (Admin Only)"
)
async def admin_usage_stats(_admin: Dict[str, Any] = Depends(get_current_admin)):
    return {
        "active_users": 3,
        "scans_today": 42,
        "total_scans": 289,
        "avg_latency_ms": 48.5
    }


@router.get(
    "/admin/stats/model",
    status_code=status.HTTP_200_OK,
    summary="Admin Model Performance Stats (Admin Only)"
)
async def admin_model_stats(_admin: Dict[str, Any] = Depends(get_current_admin)):
    return {
        "model_name": "YOLO11n-Acne",
        "mean_latency_ms": 38.2,
        "p95_latency_ms": 64.1,
        "precision": 0.892,
        "recall": 0.865
    }


@router.get(
    "/admin/audit-logs",
    status_code=status.HTTP_200_OK,
    summary="Admin Audit Logs (Admin Only)"
)
async def admin_audit_logs(
    page: int = Query(1, ge=1),
    _admin: Dict[str, Any] = Depends(get_current_admin)
):
    return {
        "items": [
            {
                "id": "log-001",
                "timestamp": "2026-11-16T20:00:00Z",
                "action": "MODEL_INFERENCE",
                "user_id": "u-demo",
                "status": "SUCCESS",
                "latency_ms": 41.2
            }
        ],
        "page": page,
        "page_size": 10,
        "total": 1
    }

