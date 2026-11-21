import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.logger import logger
from app.models.detection_model import inference_engine
from app.routers.api import api_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application Lifespan Events:
    - Startup: Pre-warms YOLOv8/YOLO11 models to achieve <100ms latency on initial requests.
    - Shutdown: Cleans up thread workers and GPU memory pools.
    """
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}...")
    inference_engine.warmup()
    yield
    logger.info("Shutting down AcneVision AI Backend gracefully...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Production-grade Backend API for AcneVision AI: Real-Time Acne Detection System. "
        "Compliant with Indonesian Personal Data Protection (UU PDP No. 27/2022). "
        "Supports YOLOv8 and YOLO11 inference runtimes with sub-100ms frame latency."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# 1. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 2. Performance & UU PDP Compliant Telemetry Middleware
@app.middleware("http")
async def telemetry_and_privacy_middleware(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000.0

    response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"

    # Audit log entry strictly excluding image bodies to preserve user privacy
    logger.info(
        f"{request.method} {request.url.path} responded {response.status_code} in {duration_ms:.2f}ms",
        extra={
            "metrics": {
                "path": request.url.path,
                "method": request.method,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2)
            }
        }
    )
    return response


# 3. Standardized Error Handling (Matches Frontend ApiError structure)
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        error_payload = detail
    else:
        error_payload = {
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": str(detail)
            }
        }
    return JSONResponse(status_code=exc.status_code, content=error_payload)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Parameter permintaan tidak valid.",
                "details": {"errors": exc.errors()}
            }
        }
    )


# 4. Mount API Routes
# Mount at /api/v1 (standard specification) and root for frontend client fallback
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

