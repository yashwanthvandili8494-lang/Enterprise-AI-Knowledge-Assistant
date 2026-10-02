from abc import ABC, abstractmethod
from typing import BinaryIO


class BaseStorage(ABC):
    @abstractmethod
    async def save_file(self, file_content: bytes, destination_key: str) -> str:
        """Saves file content to storage and returns unique storage path/key."""
        pass

    @abstractmethod
    async def read_file(self, storage_key: str) -> bytes:
        """Reads file content from storage by key."""
        pass

    @abstractmethod
    async def delete_file(self, storage_key: str) -> bool:
        """Deletes file from storage by key."""
        pass

    @abstractmethod
    def get_file_path(self, storage_key: str) -> str:
        """Gets local physical path if available."""
        pass
