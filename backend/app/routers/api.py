from fastapi import APIRouter
from app.routers import detection, classification, stream, health, auth, users

api_router = APIRouter()

# Grouping all modular sub-routers
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(detection.router)
api_router.include_router(classification.router)
api_router.include_router(stream.router)
api_router.include_router(health.router)

