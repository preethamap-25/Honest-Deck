from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from collections import defaultdict
from datetime import datetime, timezone
import asyncio

from app.core.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._counts: dict[str, list] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health check
        if request.url.path == "/health":
            return await call_next(request)

        client_ip = request.client.host or "unknown"
        now = datetime.now(timezone.utc).timestamp()
        window = 60  # seconds

        async with self._lock:
            # Purge timestamps older than the window
            self._counts[client_ip] = [
                t for t in self._counts[client_ip] if now - t < window
            ]

            if len(self._counts[client_ip]) >= settings.RATE_LIMIT_PER_MINUTE:
                return JSONResponse(
                    status_code=429,
                    content={"detail": f"Rate limit exceeded: {settings.RATE_LIMIT_PER_MINUTE} requests/minute"},
                    headers={"Retry-After": "60"},
                )

            self._counts[client_ip].append(now)

        return await call_next(request)
