import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Enterprise AI Knowledge Assistant"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/knowledge_db"
    DATABASE_SYNC_URL: str = "postgresql://postgres:postgres@localhost:5432/knowledge_db"
    TEST_MODE: bool = False
    
    # Security & Auth
    JWT_SECRET_KEY: str = "enterprise-ai-super-secret-jwt-signing-key-for-development-change-in-prod-32bytes"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Rate Limiting
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_API: str = "60/minute"
    
    # AI & RAG
    AI_PROVIDER: str = "mock"  # "gemini", "openai", "mock"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    LLM_MODEL: str = "gemini-1.5-flash"
    EMBEDDING_MODEL: str = "text-embedding-004"
    EMBEDDING_DIMENSIONS: int = 768
    
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 150
    RETRIEVAL_TOP_K: int = 5
    SIMILARITY_THRESHOLD: float = 0.25
    
    # Storage
    UPLOAD_DIRECTORY: str = "./storage/uploads"
    MAX_UPLOAD_SIZE_MB: int = 25
    
    # Redis / Queue
    REDIS_URL: str = "redis://localhost:6379/0"
    USE_IN_PROCESS_WORKER: bool = True  # Allows async queue without Redis dependency
    
    # CORS
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return [str(v)]
        
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
