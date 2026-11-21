import time
import base64
from typing import Dict, Any, List
from fastapi import WebSocket, WebSocketDisconnect

from app.core.logger import logger
from app.services.detection_service import detection_service
from app.schemas.detection import DetectResponse


class StreamService:
    """
    Service optimized for handling high-throughput, low-latency (<100 ms) real-time video frames
    from mobile clients via WebSocket or fast HTTP frame streams.
    """

    async def process_frame_bytes(self, frame_bytes: bytes) -> Dict[str, Any]:
        """Processes a single raw frame from camera stream."""
        detect_resp: DetectResponse = await detection_service.detect_from_bytes(frame_bytes, is_guest=True)

        return {
            "type": "detection_frame",
            "bounding_boxes": detect_resp.bounding_boxes,
            "confidence_scores": detect_resp.confidence_scores,
            "acne_count": detect_resp.acne_count,
            "lesions": [l.model_dump() for l in detect_resp.lesions],
            "latency_ms": detect_resp.timing_ms.detection,
        }

    async def handle_websocket_stream(self, websocket: WebSocket):
        """
        Maintains an active duplex WebSocket connection for real-time video stream.
        Receives raw image bytes or base64 strings and pushes detected bounding boxes.
        """
        await websocket.accept()
        logger.info("Real-time detection WebSocket connection established.")

        try:
            while True:
                # Receive message (supports binary frame or JSON base64 frame)
                message = await websocket.receive()

                if "bytes" in message and message["bytes"]:
                    frame_bytes = message["bytes"]
                elif "text" in message and message["text"]:
                    raw_text = message["text"]
                    if raw_text.startswith("data:image"):
                        raw_text = raw_text.split(",", 1)[1]
                    frame_bytes = base64.b64decode(raw_text)
                else:
                    continue

                # Run inference
                result = await self.process_frame_bytes(frame_bytes)

                # Send back detection result
                await websocket.send_json(result)

        except WebSocketDisconnect:
            logger.info("Real-time detection WebSocket client disconnected.")
        except Exception as e:
            logger.error(f"WebSocket streaming error: {e}")
            try:
                await websocket.close()
            except Exception:
                pass


stream_service = StreamService()

