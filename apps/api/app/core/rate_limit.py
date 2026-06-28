import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    """Simple per-key sliding-window rate limiter for auth and public endpoints."""

    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            window_start = now - self.window_seconds
            hits = [t for t in self._hits[key] if t > window_start]
            if len(hits) >= self.max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please try again later.",
                )
            hits.append(now)
            self._hits[key] = hits


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


auth_rate_limiter = InMemoryRateLimiter(max_requests=10, window_seconds=60)
public_form_rate_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=60)
