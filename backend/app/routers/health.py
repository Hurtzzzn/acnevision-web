from fastapi import APIRouter, status
from app.core.config import get_settings
from app.models.detection_model import inference_engine
from app.schemas.common import HealthCheckResponse

settings = get_settings()
router = APIRouter(tags=["System & Monitoring"])


@router.get(
    "/health",
    response_model=HealthCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="System Health & Readiness Probe"
)
async def health_check() -> HealthCheckResponse:
    return HealthCheckResponse(
        status="ok",
        version=settings.VERSION,
        model_loaded=inference_engine.model is not None or inference_engine.is_mock,
        model_name=inference_engine.model_name,
        device=settings.MODEL_DEVICE,
        environment=settings.ENVIRONMENT
    )

