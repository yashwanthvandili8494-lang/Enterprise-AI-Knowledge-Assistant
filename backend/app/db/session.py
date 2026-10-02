from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text
from app.core.config import settings
from app.db.base import Base

# Create async engine with connection pooling
engine_kwargs = {}
if "postgresql" in settings.DATABASE_URL:
    engine_kwargs = {
        "pool_size": 20,
        "max_overflow": 10,
        "pool_pre_ping": True,
    }
elif "sqlite" in settings.DATABASE_URL:
    engine_kwargs = {
        "connect_args": {"check_same_thread": False},
    }

async_engine = create_async_engine(settings.DATABASE_URL, echo=False, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for providing database sessions per request with auto-rollback on error."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initializes the database, creating the vector extension if running in PostgreSQL."""
    async with async_engine.begin() as conn:
        if "postgresql" in settings.DATABASE_URL:
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            except Exception as e:
                # Extension might already exist or require superuser depending on cloud host
                pass
        await conn.run_sync(Base.metadata.create_all)
