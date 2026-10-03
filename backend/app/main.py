from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy import text
from app.core.config import settings
from app.core.logging import logger, RequestContextMiddleware
from app.db.session import init_db, async_engine
from app.api.v1.router import api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing Enterprise AI Knowledge Assistant backend...")
    try:
        await init_db()
        logger.info("Database tables and vector extensions initialized.")
    except Exception as e:
        logger.error(f"Database initialization warning: {e}")
    yield
    # Shutdown actions
    logger.info("Shutting down database connection pools...")
    await async_engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Enterprise Knowledge Assistant with grounded RAG, RBAC, and document vector search.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request context and timing middleware
app.add_middleware(RequestContextMiddleware)


from fastapi.encoders import jsonable_encoder

# Global Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Request validation error", "errors": jsonable_encoder(exc.errors())},
    )


# Health Check Endpoints
@app.get("/health", tags=["Health"])
async def health_check():
    """Liveness probe."""
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": "1.0.0",
        "ai_provider": settings.AI_PROVIDER,
    }


@app.get("/ready", tags=["Health"])
async def readiness_check():
    """Readiness probe checking database connectivity."""
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unready", "database": "disconnected", "error": str(e)},
        )


# Mount API V1
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
