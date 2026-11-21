from typing import Optional, List, Literal, Dict, Any
from pydantic import BaseModel, EmailStr, Field


UserRole = Literal["user", "admin"]
UserStatus = Literal["active", "suspended"]


class UserRegisterRequest(BaseModel):
    email: EmailStr = Field(..., example="user@example.com")
    password: str = Field(..., min_length=6, example="password123")
    full_name: str = Field(..., min_length=2, example="Ahmad Pratama")


class UserLoginRequest(BaseModel):
    email: str = Field(..., example="demo@acnevision.test")
    password: str = Field(..., example="demo12345")


class UserResponse(BaseModel):
    """Corresponds exactly to frontend 'Me' interface."""
    id: str = Field(..., example="u-demo")
    email: str = Field(..., example="demo@acnevision.test")
    full_name: Optional[str] = Field(None, example="Pengguna Demo")
    avatar_url: Optional[str] = Field(None)
    role: UserRole = Field(default="user", example="user")
    status: UserStatus = Field(default="active", example="active")
    created_at: str = Field(..., example="2026-10-01T08:00:00Z")


class TokenResponse(BaseModel):
    access_token: str = Field(..., example="eyJhbGciOi...")
    token_type: str = Field(default="bearer", example="bearer")
    user: UserResponse


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, example="Nama Baru")
    avatar_url: Optional[str] = Field(None)


class AdminUserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None


class UserStatsTotals(BaseModel):
    analyses: int = Field(default=0, example=12)
    total_lesions: int = Field(default=0, example=48)
    latest_severity: Optional[str] = Field(default="moderate", example="moderate")


class UserStatsRecentItem(BaseModel):
    scan_id: str = Field(..., example="scan-001")
    created_at: str = Field(..., example="2026-11-09T08:00:00Z")
    thumbnail_url: Optional[str] = Field(None)
    total_lesions: int = Field(..., example=5)
    severity: Optional[str] = Field(default="mild", example="mild")


class UserStatsResponse(BaseModel):
    totals: UserStatsTotals
    recent: List[UserStatsRecentItem] = Field(default_factory=list)


class PaginatedUsersResponse(BaseModel):
    items: List[UserResponse]
    page: int
    page_size: int
    total: int

