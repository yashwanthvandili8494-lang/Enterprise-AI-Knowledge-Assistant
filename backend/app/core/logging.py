import sys
import logging
import uuid
import time
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Configure structured formatter
class StructuredFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }
        if hasattr(record, "request_id"):
            log_obj["request_id"] = record.request_id
        if hasattr(record, "duration_ms"):
            log_obj["duration_ms"] = record.duration_ms
        return f"[{log_obj['level']}] {log_obj['timestamp']} {log_obj.get('request_id', '-')} - {log_obj['message']}"


logger = logging.getLogger("enterprise_ai")
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(StructuredFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        start_time = time.time()
        
        response: Response = await call_next(request)
        
        duration = round((time.time() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-MS"] = str(duration)
        
        # Avoid logging token headers or sensitive query parameters
        client_host = request.client.host if request.client else "unknown"
        if request.url.path not in ["/health", "/ready"]:
            logger.info(
                f"{request.method} {request.url.path} -> {response.status_code} ({duration}ms) from {client_host}",
                extra={"request_id": request_id, "duration_ms": duration}
            )
        
        return response
