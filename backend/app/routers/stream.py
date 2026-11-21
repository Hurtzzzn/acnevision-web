from fastapi import APIRouter, File, UploadFile, WebSocket, status
from app.core.security import validate_image_file
from app.services.stream_service import stream_service

router = APIRouter(tags=["Real-Time Video Stream"])


@router.post(
    "/detect/frame",
    status_code=status.HTTP_200_OK,
    summary="Real-Time Video Frame Detection (SRS FR-05)",
    description="Low-overhead endpoint for continuous camera frame stream (<100ms per frame SLA)."
)
async def detect_frame(image: UploadFile = File(...)):
    image_bytes = await validate_image_file(image)
    return await stream_service.process_frame_bytes(image_bytes)


@router.websocket("/ws/detect")
async def websocket_detection_stream(websocket: WebSocket):
    """
    Bi-directional WebSocket streaming endpoint for live video feed.
    Pushes real-time bounding boxes and confidence scores to mobile canvas.
    """
    await stream_service.handle_websocket_stream(websocket)

