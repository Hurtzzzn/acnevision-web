from typing import Optional
from fastapi import APIRouter, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.user import UserRegisterRequest, UserLoginRequest, TokenResponse
from app.schemas.common import ApiErrorResponse
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication & Accounts"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="User Registration",
    description="Registers a new user account and returns JWT access token.",
    responses={
        400: {"model": ApiErrorResponse, "description": "Email already registered"},
        422: {"model": ApiErrorResponse, "description": "Validation error"},
    }
)
async def register(payload: UserRegisterRequest) -> TokenResponse:
    return auth_service.register(payload)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User Login",
    description="Authenticates user credentials and returns JWT bearer token.",
    responses={
        401: {"model": ApiErrorResponse, "description": "Invalid credentials"},
        403: {"model": ApiErrorResponse, "description": "Account suspended"},
    }
)
async def login(payload: UserLoginRequest) -> TokenResponse:
    return auth_service.authenticate(payload)


@router.post(
    "/token",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
    summary="OAuth2 Form Login",
    description="Standard OAuth2 form login compatibility endpoint for Swagger UI authorize button."
)
async def oauth2_token(form_data: OAuth2PasswordRequestForm = Depends()) -> TokenResponse:
    req = UserLoginRequest(email=form_data.username, password=form_data.password)
    return auth_service.authenticate(req)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="User Logout",
    description="Stateless logout invalidation confirmation."
)
async def logout():
    return {"status": "ok", "message": "Berhasil keluar dari sesi."}

