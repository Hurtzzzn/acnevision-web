from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error description")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Optional diagnostic details")


class ApiErrorResponse(BaseModel):
    error: ErrorDetail


class HealthCheckResponse(BaseModel):
    status: str = Field(default="ok", example="ok")
    version: str = Field(..., example="1.0.0")
    model_loaded: bool = Field(..., description="Whether detection model is loaded in memory")
    model_name: str = Field(..., example="YOLO11n-Acne")
    device: str = Field(..., example="cpu")
    environment: str = Field(..., example="development")

