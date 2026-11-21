import os
import time
from typing import List, Tuple, Dict, Any
from PIL import Image
import numpy as np

from app.core.config import get_settings
from app.core.logger import logger

settings = get_settings()


class AcneInferenceEngine:
    """
    Unified AI/ML Inference Wrapper for YOLOv8 and YOLO11 models.
    Supports PyTorch (.pt), ONNX Runtime (.onnx), and TFLite (.tflite) runtimes.
    Includes automated warm-up and resilient fallback for local development.
    """

    def __init__(self):
        self.model = None
        self.model_type = "uninitialized"
        self.model_name = "YOLO11n-Acne"
        self.version = "1.0.0"
        self.is_mock = False
        self._load_model()

    def _load_model(self):
        """Loads Ultralytics YOLO model from configured path or activates simulation mode."""
        model_path = settings.MODEL_PATH

        if os.path.exists(model_path):
            try:
                from ultralytics import YOLO
                logger.info(f"Loading Ultralytics YOLO model from '{model_path}' on device '{settings.MODEL_DEVICE}'...")
                self.model = YOLO(model_path)
                self.model_type = os.path.splitext(model_path)[1].lower()  # .pt, .onnx, or .tflite
                self.model_name = os.path.basename(model_path).replace(".pt", "").replace(".onnx", "")
                self.is_mock = False
                logger.info(f"YOLO model successfully loaded: {self.model_name} ({self.model_type})")
            except Exception as e:
                logger.error(f"Failed to load Ultralytics YOLO weights: {e}. Falling back to developer simulation engine.")
                self.is_mock = True
        else:
            logger.warning(
                f"Model weights not found at '{model_path}'. "
                "Activating high-fidelity development simulation engine. "
                "Place your trained YOLOv8/YOLO11 weights (.pt / .onnx) in the weights/ folder to enable full production inference."
            )
            self.is_mock = True

    def warmup(self):
        """
        Executes a warmup inference pass on a dummy tensor during application startup
        to eliminate first-request cold-start latency (<100ms SLA).
        """
        try:
            dummy_image = Image.new("RGB", (640, 640), color=(128, 128, 128))
            start_t = time.perf_counter()
            self.predict(dummy_image)
            elapsed_ms = (time.perf_counter() - start_t) * 1000.0
            logger.info(f"Model warm-up completed in {elapsed_ms:.2f} ms.")
        except Exception as e:
            logger.error(f"Model warm-up error: {e}")

    def predict(self, image: Image.Image) -> Dict[str, Any]:
        """
        Executes object detection inference on a static PIL image.

        Returns:
            Dict containing:
              - raw_boxes: List[[x_min, y_min, x_max, y_max]] (pixel values)
              - norm_boxes: List[[x1, y1, x2, y2]] (normalized 0.0 - 1.0)
              - confidences: List[float] (0.0 to 1.0)
              - labels: List[str]
              - count: int
        """
        width, height = image.size

        if not self.is_mock and self.model is not None:
            # Real Ultralytics inference
            results = self.model.predict(
                source=image,
                conf=settings.MODEL_CONFIDENCE_THRESHOLD,
                iou=settings.MODEL_IOU_THRESHOLD,
                device=settings.MODEL_DEVICE,
                half=settings.MODEL_HALF_PRECISION and settings.MODEL_DEVICE == "cuda",
                verbose=False
            )

            raw_boxes: List[List[float]] = []
            norm_boxes: List[List[float]] = []
            confidences: List[float] = []
            labels: List[str] = []

            for r in results:
                for box in r.boxes:
                    coords = box.xyxy[0].tolist()  # [x1, y1, x2, y2] in pixels
                    conf = float(box.conf[0].item())
                    cls_id = int(box.cls[0].item())
                    name = r.names.get(cls_id, "Jerawat")

                    x1, y1, x2, y2 = coords
                    raw_boxes.append([round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)])
                    norm_boxes.append([
                        max(0.0, min(1.0, x1 / width)),
                        max(0.0, min(1.0, y1 / height)),
                        max(0.0, min(1.0, x2 / width)),
                        max(0.0, min(1.0, y2 / height)),
                    ])
                    confidences.append(round(conf, 4))
                    labels.append(name)

            return {
                "raw_boxes": raw_boxes,
                "norm_boxes": norm_boxes,
                "confidences": confidences,
                "labels": labels,
                "count": len(raw_boxes),
            }

        else:
            # High-fidelity development simulation mode
            # Generates realistic acne lesions mapped to facial cheek and forehead zones
            # so the existing frontend can immediately test bounding boxes, chips, and counts.
            simulated_lesions = [
                (0.38, 0.46, 0.44, 0.52, 0.94),  # Left cheek
                (0.60, 0.48, 0.66, 0.54, 0.89),  # Right cheek
                (0.48, 0.30, 0.54, 0.36, 0.91),  # Forehead
                (0.52, 0.62, 0.58, 0.68, 0.87),  # Chin
                (0.42, 0.34, 0.47, 0.39, 0.85),  # Upper forehead
            ]

            raw_boxes = []
            norm_boxes = []
            confidences = []
            labels = []

            for nx1, ny1, nx2, ny2, conf in simulated_lesions:
                raw_boxes.append([
                    round(nx1 * width, 1),
                    round(ny1 * height, 1),
                    round(nx2 * width, 1),
                    round(ny2 * height, 1)
                ])
                norm_boxes.append([nx1, ny1, nx2, ny2])
                confidences.append(conf)
                labels.append("Jerawat")

            return {
                "raw_boxes": raw_boxes,
                "norm_boxes": norm_boxes,
                "confidences": confidences,
                "labels": labels,
                "count": len(raw_boxes),
            }


# Singleton inference engine instance
inference_engine = AcneInferenceEngine()

