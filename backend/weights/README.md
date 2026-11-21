# AcneVision AI Model Weights

Place your trained YOLOv8 / YOLO11 weights here. Supported formats:
- `best_yolov8n_acne.pt` or `best_yolo11n_acne.pt` (Ultralytics PyTorch weights)
- `best_yolo11n_acne.onnx` (ONNX Runtime optimized engine for <100ms CPU inference)
- `best_yolo11n_acne.tflite` (Edge/mobile runtime)

The detection engine will automatically detect whether the weights file exists. If weights are not yet placed during development/testing, the engine gracefully falls back to a development simulation mode so full API integration and frontend end-to-end tests can run without failure.

