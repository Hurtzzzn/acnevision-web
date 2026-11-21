from fastapi import HTTPException, UploadFile, status
from app.core.config import get_settings

settings = get_settings()

# Magic bytes (file signatures) for image verification
MAGIC_SIGNATURES = {
    b"\xFF\xD8\xFF": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"RIFF": "image/webp",  # WebP files start with 'RIFF....WEBP'
}


async def validate_image_file(file: UploadFile) -> bytes:
    """
    Validates uploaded file against MIME type, magic byte signature, and maximum file size.
    Loads file safely into RAM for in-memory processing (UU PDP compliant).

    Returns:
        bytes: Raw image file content.
    Raises:
        HTTPException: If file is missing, oversized, or invalid format.
    """
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "FILE_REQUIRED", "message": "File citra wajah wajib disertakan."}}
        )

    # Check reported content-type header
    content_type = file.content_type or ""
    if content_type.lower() not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={
                "error": {
                    "code": "INVALID_CONTENT_TYPE",
                    "message": f"Tipe file '{content_type}' tidak didukung. Format yang diizinkan: {', '.join(settings.ALLOWED_IMAGE_TYPES)}."
                }
            }
        )

    # Read image content into memory
    content = await file.read()

    # Check file size limit
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "error": {
                    "code": "FILE_TOO_LARGE",
                    "message": f"Ukuran file melebihi batas maksimum {settings.MAX_UPLOAD_SIZE_MB} MB."
                }
            }
        )

    if len(content) < 16:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "CORRUPTED_FILE", "message": "File citra rusak atau kosong."}}
        )

    # Magic byte inspection
    is_valid_magic = False
    for sig in MAGIC_SIGNATURES:
        if content.startswith(sig):
            is_valid_magic = True
            break

    if not is_valid_magic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "INVALID_IMAGE_SIGNATURE",
                    "message": "Header file tidak valid untuk format citra yang diperbolehkan."
                }
            }
        )

    return content

