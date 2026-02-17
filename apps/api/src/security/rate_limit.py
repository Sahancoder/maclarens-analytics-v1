"""
Rate Limiting Middleware
Simple in-memory rate limiter for API endpoints

For production, consider using Redis-backed rate limiting.
"""
import time
from typing import Dict, Tuple, Optional, Callable
from functools import wraps
from collections import defaultdict

from fastapi import Request, HTTPException, status, Depends
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from src.config.settings import settings


# ============ IN-MEMORY RATE LIMITER ============

class RateLimiter:
    """
    Simple token bucket rate limiter.
    
    For production scale, replace with Redis-backed implementation.
    """
    
    def __init__(self):
        # {key: (tokens_remaining, last_update_time)}
        self._buckets: Dict[str, Tuple[float, float]] = defaultdict(lambda: (0.0, 0.0))
    
    def _get_bucket(self, key: str, max_requests: int, window_seconds: int) -> Tuple[float, float]:
        """Get or initialize a bucket"""
        if key not in self._buckets:
            # New client starts with a full bucket.
            now = time.time()
            self._buckets[key] = (float(max_requests), now)
            return float(max_requests), now

        tokens, last_update = self._buckets[key]
        now = time.time()
        
        # Calculate tokens to add based on time passed
        time_passed = now - last_update if last_update > 0 else 0
        tokens_to_add = time_passed * (max_requests / window_seconds)
        
        # Update tokens (cap at max_requests)
        tokens = min(max_requests, tokens + tokens_to_add)
        
        return tokens, now
    
    def is_allowed(
        self, 
        key: str, 
        max_requests: int = 60, 
        window_seconds: int = 60
    ) -> Tuple[bool, int, int]:
        """
        Check if request is allowed under rate limit.
        
        Returns:
            (is_allowed, remaining_requests, retry_after_seconds)
        """
        tokens, now = self._get_bucket(key, max_requests, window_seconds)
        
        if tokens >= 1:
            # Consume a token
            self._buckets[key] = (tokens - 1, now)
            return (True, int(tokens - 1), 0)
        else:
            # Rate limited
            self._buckets[key] = (tokens, now)
            retry_after = int(window_seconds / max_requests)
            return (False, 0, retry_after)
    
    def clear(self, key: str = None):
        """Clear rate limit data"""
        if key:
            if key in self._buckets:
                del self._buckets[key]
        else:
            self._buckets.clear()


# Global rate limiter instance
rate_limiter = RateLimiter()


# ============ RATE LIMIT CONFIGURATIONS ============

class RateLimitConfig:
    """Rate limit presets for different endpoint types"""
    
    # Default: 60 requests per minute
    DEFAULT = (60, 60)
    
    # Auth endpoints: stricter to prevent brute force
    AUTH = (10, 60)  # 10 per minute
    
    # Write endpoints: moderate
    WRITE = (30, 60)  # 30 per minute
    
    # Heavy endpoints (exports, reports): strict
    HEAVY = (10, 60)  # 10 per minute
    
    # Dev/test endpoints: lenient
    DEV = (100, 60)  # 100 per minute


# ============ FASTAPI DEPENDENCIES ============

def get_client_identifier(request: Request) -> str:
    """Get a unique identifier for the client"""
    # Use X-Forwarded-For if behind a proxy
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    # Fall back to client host
    return request.client.host if request.client else "unknown"


def rate_limit(
    max_requests: int = 60,
    window_seconds: int = 60,
    key_prefix: str = ""
):
    """
    Dependency for rate limiting endpoints.
    
    Usage:
        @app.post("/login")
        async def login(
            _: None = Depends(rate_limit(max_requests=10, window_seconds=60))
        ):
            ...
    """
    async def check_rate_limit(request: Request):
        # Skip rate limiting in dev mode if configured
        if settings.auth_mode.value == "dev" and not settings.debug:
            return
        
        client_id = get_client_identifier(request)
        path = request.url.path
        key = f"{key_prefix}:{client_id}:{path}" if key_prefix else f"{client_id}:{path}"
        
        allowed, remaining, retry_after = rate_limiter.is_allowed(
            key, max_requests, window_seconds
        )
        
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "rate_limit_exceeded",
                    "message": f"Too many requests. Retry after {retry_after} seconds.",
                    "retry_after": retry_after
                },
                headers={"Retry-After": str(retry_after)}
            )
    
    return Depends(check_rate_limit)


def rate_limit_auth():
    """Rate limiter preset for auth endpoints (strict)"""
    return rate_limit(*RateLimitConfig.AUTH, key_prefix="auth")


def rate_limit_write():
    """Rate limiter preset for write endpoints"""
    return rate_limit(*RateLimitConfig.WRITE, key_prefix="write")


def rate_limit_heavy():
    """Rate limiter preset for heavy/export endpoints"""
    return rate_limit(*RateLimitConfig.HEAVY, key_prefix="heavy")


# ============ MIDDLEWARE (Alternative Approach) ============

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Global rate limiting middleware.
    Applies default rate limits to all requests.
    
    For more granular control, use the dependency-based approach instead.
    """
    
    def __init__(
        self,
        app,
        max_requests: int = 100,
        window_seconds: int = 60,
        exclude_paths: Optional[list] = None
    ):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.exclude_paths = exclude_paths or ["/health", "/docs", "/openapi.json"]
    
    async def dispatch(self, request: Request, call_next):
        # Skip excluded paths
        path = request.url.path
        if any(path.startswith(ex) for ex in self.exclude_paths):
            return await call_next(request)
        
        client_id = get_client_identifier(request)
        key = f"global:{client_id}"
        
        allowed, remaining, retry_after = rate_limiter.is_allowed(
            key, self.max_requests, self.window_seconds
        )
        
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": {
                        "error": "rate_limit_exceeded",
                        "message": f"Too many requests. Retry after {retry_after} seconds.",
                        "retry_after": retry_after
                    }
                },
                headers={"Retry-After": str(retry_after)}
            )
        
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        
        return response
