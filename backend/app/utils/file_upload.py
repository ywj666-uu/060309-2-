import os
from app.config import settings

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"}


def validate_file(filename: str, file_size: int) -> tuple[bool, str]:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"File type {ext} not allowed. Allowed: {ALLOWED_EXTENSIONS}"
    if file_size > settings.MAX_UPLOAD_SIZE:
        return False, f"File too large. Max size: {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB"
    return True, ""
