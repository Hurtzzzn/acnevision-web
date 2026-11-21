from typing import Optional
from app.schemas.detection import SeverityType


def get_hayashi_severity(lesion_count: int) -> Optional[SeverityType]:
    """
    Classifies acne severity based on the clinical Hayashi Acne Grading System:
    - 0 lesions: None (Clear skin)
    - 1 - 5 lesions: Mild (Ringan)
    - 6 - 20 lesions: Moderate (Sedang)
    - 21 - 50 lesions: Severe (Berat)
    - > 50 lesions: Very Severe (Sangat Berat)

    Args:
        lesion_count (int): Total number of detected acne lesions.

    Returns:
        Optional[SeverityType]: Estimated severity category, or None if count is 0.
    """
    if lesion_count <= 0:
        return None
    elif lesion_count <= 5:
        return "mild"
    elif lesion_count <= 20:
        return "moderate"
    elif lesion_count <= 50:
        return "severe"
    else:
        return "very_severe"


def format_confidence_pct(score: float) -> str:
    """Formats float confidence (0.852) to percentage string ('85%')."""
    return f"{round(score * 100)}%"

