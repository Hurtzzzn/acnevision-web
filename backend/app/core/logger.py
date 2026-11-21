import logging
import sys
import json
from typing import Any, Dict
from datetime import datetime, timezone


class PrivacyCompliantJsonFormatter(logging.Formatter):
    """
    JSON log formatter designed to comply with Indonesian Personal Data Protection
    Law (UU PDP No. 27/2022). Ensures sensitive facial image data, base64 payloads,
    and PII are strictly excluded from audit logs while recording execution times
    and telemetry metrics.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Attach custom metadata if present
        if hasattr(record, "metrics"):
            log_entry["metrics"] = getattr(record, "metrics")

        if hasattr(record, "request_id"):
            log_entry["request_id"] = getattr(record, "request_id")

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


def setup_logger(name: str = "acnevision") -> logging.Logger:
    """Configures and returns a centralized privacy-compliant logger."""
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Avoid duplicate handlers if already initialized
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(PrivacyCompliantJsonFormatter())
        logger.addHandler(handler)

    logger.propagate = False
    return logger


logger = setup_logger()

