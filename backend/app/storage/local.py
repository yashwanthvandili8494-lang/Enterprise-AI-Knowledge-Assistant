import os
import re
import hashlib
from pathlib import Path
from app.core.config import settings
from app.storage.base import BaseStorage


def sanitize_filename(filename: str) -> str:
    """Strip dangerous characters and path traversal indicators."""
    filename = os.path.basename(filename)
    clean = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
    return clean[:200]  # Limit length


def calculate_checksum(content: bytes) -> str:
    """Calculates SHA-256 checksum of raw content."""
    return hashlib.sha256(content).hexdigest()


class LocalStorage(BaseStorage):
    def __init__(self, base_dir: str = settings.UPLOAD_DIRECTORY):
        self.base_dir = Path(base_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_safe_path(self, storage_key: str) -> Path:
        # Prevent path traversal
        clean_key = Path(storage_key).as_posix().lstrip("/")
        full_path = (self.base_dir / clean_key).resolve()
        if not str(full_path).startswith(str(self.base_dir)):
            raise ValueError(f"Path traversal detected for storage key: {storage_key}")
        return full_path

    async def save_file(self, file_content: bytes, destination_key: str) -> str:
        safe_path = self._resolve_safe_path(destination_key)
        safe_path.parent.mkdir(parents=True, exist_ok=True)
        with open(safe_path, "wb") as f:
            f.write(file_content)
        return destination_key

    async def read_file(self, storage_key: str) -> bytes:
        safe_path = self._resolve_safe_path(storage_key)
        if not safe_path.exists():
            raise FileNotFoundError(f"File not found: {storage_key}")
        with open(safe_path, "rb") as f:
            return f.read()

    async def delete_file(self, storage_key: str) -> bool:
        try:
            safe_path = self._resolve_safe_path(storage_key)
            if safe_path.exists():
                safe_path.unlink()
                return True
            return False
        except Exception:
            return False

    def get_file_path(self, storage_key: str) -> str:
        return str(self._resolve_safe_path(storage_key))


default_storage = LocalStorage()
