from starlette.types import ASGIApp, Receive, Scope, Send
from starlette.responses import JSONResponse
from collections import defaultdict
from datetime import datetime, timezone
import asyncio

from app.core.config import settings


class RateLimitMiddleware:
    """Pure ASGI rate-limit middleware (avoids BaseHTTPMiddleware CORS bug)."""

    def __init__(self, app: ASGIApp):
        self.app = app
        self._counts: dict[str, list] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        method = scope.get("method", "")

        # Skip rate limiting for health check and CORS preflight
        if path == "/health" or method == "OPTIONS":
            await self.app(scope, receive, send)
            return

        # Get client IP
        client = scope.get("client")
        client_ip = client[0] if client else "unknown"
        now = datetime.now(timezone.utc).timestamp()
        window = 60

        async with self._lock:
            self._counts[client_ip] = [
                t for t in self._counts[client_ip] if now - t < window
            ]

            if len(self._counts[client_ip]) >= settings.RATE_LIMIT_PER_MINUTE:
                response = JSONResponse(
                    status_code=429,
                    content={"detail": f"Rate limit exceeded: {settings.RATE_LIMIT_PER_MINUTE} requests/minute"},
                    headers={"Retry-After": "60"},
                )
                await response(scope, receive, send)
                return

            self._counts[client_ip].append(now)

        await self.app(scope, receive, send)
