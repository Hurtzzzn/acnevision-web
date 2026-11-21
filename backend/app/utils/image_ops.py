import io
from typing import Tuple
from PIL import Image
import numpy as np


def decode_image_bytes(image_bytes: bytes) -> Tuple[Image.Image, int, int]:
    """
    Decodes raw image bytes into a PIL Image and extracts image dimensions.
    Operates strictly in memory to ensure UU PDP privacy compliance.

    Args:
        image_bytes: In-memory byte array of the uploaded image.

    Returns:
        Tuple[Image.Image, int, int]: (PIL Image in RGB mode, width, height)
    """
    image = Image.open(io.BytesIO(image_bytes))

    # Convert non-RGB (e.g. RGBA, CMYK, Grayscale) to standard RGB
    if image.mode != "RGB":
        image = image.convert("RGB")

    width, height = image.size
    return image, width, height


def image_to_numpy(image: Image.Image) -> np.ndarray:
    """Converts PIL Image to NumPy array for inference engine."""
    return np.array(image)

