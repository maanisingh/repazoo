"""
Rate Limiting Middleware
Redis-based rate limiting with tier-aware quotas
"""

import logging
import hashlib
from typing import Optional, Callable
from datetime import datetime, timezone

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as aioredis

from config import settings
from database import db


logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Redis-based rate limiter with sliding window algorithm
    """

    def __init__(self, redis_url: str = None):
        """Initialize rate limiter with Redis connection"""
        self.redis_url = redis_url or settings.redis_url
        self._redis: Optional[aioredis.Redis] = None

    async def connect(self):
        """Connect to Redis"""
        if self._redis is None:
            self._redis = await aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=settings.redis_max_connections
            )
            logger.info("Connected to Redis for rate limiting")

    async def disconnect(self):
        """Disconnect from Redis"""
        if self._redis:
            await self._redis.close()
            self._redis = None

    async def is_rate_limited(
        self,
        key: str,
        limit: int,
        window_seconds: int = 60
    ) -> tuple[bool, dict]:
        """
        Check if request should be rate limited

        Args:
            key: Unique identifier for rate limit (e.g., user_id, IP)
            limit: Maximum requests allowed in window
            window_seconds: Time window in seconds

        Returns:
            Tuple of (is_limited, info_dict)
            info_dict contains: requests, limit, reset_at
        """
        if self._redis is None:
            await self.connect()

        current_time = int(datetime.now(timezone.utc).timestamp())
        window_start = current_time - window_seconds

        # Redis key
        redis_key = f"ratelimit:{key}:{window_seconds}"

        try:
            # Use Redis sorted set for sliding window
            pipe = self._redis.pipeline()

            # Remove old entries
            pipe.zremrangebyscore(redis_key, 0, window_start)

            # Count current requests
            pipe.zcard(redis_key)

            # Add current request
            pipe.zadd(redis_key, {str(current_time): current_time})

            # Set expiration
            pipe.expire(redis_key, window_seconds)

            results = await pipe.execute()
            current_requests = results[1]

            is_limited = current_requests >= limit
            reset_at = current_time + window_seconds

            return is_limited, {
                "requests": current_requests,
                "limit": limit,
                "remaining": max(0, limit - current_requests),
                "reset_at": reset_at,
                "window_seconds": window_seconds
            }

        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # Fail open - don't block on Redis errors
            return False, {
                "requests": 0,
                "limit": limit,
                "remaining": limit,
                "reset_at": current_time + window_seconds,
                "window_seconds": window_seconds
            }

    async def check_monthly_quota(self, user_id: str) -> tuple[bool, dict]:
        """
        Check monthly API quota for user

        Returns:
            Tuple of (quota_exceeded, quota_info)
        """
        try:
            usage = db.get_current_usage(user_id)

            quota_exceeded = usage.get("remaining", 0) <= 0

            return quota_exceeded, {
                "requests_used": usage.get("requests_used", 0),
                "quota": usage.get("quota", 0),
                "remaining": usage.get("remaining", 0),
                "tier": usage.get("tier", "basic"),
                "period_start": usage.get("period_start"),
                "period_end": usage.get("period_end")
            }

        except Exception as e:
            logger.error(f"Quota check failed for user {user_id}: {e}")
            # Fail open
            return False, {
                "requests_used": 0,
                "quota": 1000,
                "remaining": 1000,
                "tier": "basic"
            }


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce rate limits on API requests
    """

    # Routes exempt from rate limiting
    EXEMPT_ROUTES = [
        "/docs",
        "/redoc",
        "/openapi.json",
        "/healthz",
        "/api/webhooks",
    ]

    def __init__(self, app, rate_limiter: RateLimiter):
        super().__init__(app)
        self.rate_limiter = rate_limiter

    async def dispatch(self, request: Request, call_next: Callable):
        """Apply rate limiting to requests"""

        # Skip exempt routes
        if self._is_exempt(request.url.path):
            return await call_next(request)

        # Get identifier for rate limiting
        identifier = self._get_identifier(request)

        # Check per-minute rate limit
        is_limited, rate_info = await self.rate_limiter.is_rate_limited(
            key=f"minute:{identifier}",
            limit=settings.rate_limit_per_minute,
            window_seconds=60
        )

        if is_limited:
            logger.warning(f"Rate limit exceeded for {identifier}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
                headers={
                    "X-RateLimit-Limit": str(rate_info["limit"]),
                    "X-RateLimit-Remaining": str(rate_info["remaining"]),
                    "X-RateLimit-Reset": str(rate_info["reset_at"]),
                    "Retry-After": str(rate_info["window_seconds"])
                }
            )

        # Check hourly rate limit
        is_limited_hour, hour_info = await self.rate_limiter.is_rate_limited(
            key=f"hour:{identifier}",
            limit=settings.rate_limit_per_hour,
            window_seconds=3600
        )

        if is_limited_hour:
            logger.warning(f"Hourly rate limit exceeded for {identifier}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Hourly rate limit exceeded. Please try again later.",
                headers={
                    "X-RateLimit-Limit": str(hour_info["limit"]),
                    "X-RateLimit-Remaining": str(hour_info["remaining"]),
                    "X-RateLimit-Reset": str(hour_info["reset_at"]),
                    "Retry-After": str(hour_info["window_seconds"])
                }
            )

        # Check monthly quota for authenticated users
        if hasattr(request.state, "user_id") and request.state.user_id:
            quota_exceeded, quota_info = await self.rate_limiter.check_monthly_quota(
                request.state.user_id
            )

            if quota_exceeded:
                logger.warning(f"Monthly quota exceeded for user {request.state.user_id}")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Monthly quota exceeded. Upgrade to Pro for higher limits.",
                    headers={
                        "X-Quota-Limit": str(quota_info["quota"]),
                        "X-Quota-Remaining": "0",
                        "X-Quota-Reset": quota_info.get("period_end", ""),
                    }
                )

            # Add quota headers to response
            request.state.quota_info = quota_info

        # Process request
        response = await call_next(request)

        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(rate_info["limit"])
        response.headers["X-RateLimit-Remaining"] = str(rate_info["remaining"])
        response.headers["X-RateLimit-Reset"] = str(rate_info["reset_at"])

        # Add quota headers if available
        if hasattr(request.state, "quota_info"):
            quota = request.state.quota_info
            response.headers["X-Quota-Limit"] = str(quota["quota"])
            response.headers["X-Quota-Remaining"] = str(quota["remaining"])
            response.headers["X-Quota-Used"] = str(quota["requests_used"])

        return response

    def _is_exempt(self, path: str) -> bool:
        """Check if route is exempt from rate limiting"""
        return any(path.startswith(route) for route in self.EXEMPT_ROUTES)

    def _get_identifier(self, request: Request) -> str:
        """Get unique identifier for rate limiting"""
        # Use user_id if authenticated
        if hasattr(request.state, "user_id") and request.state.user_id:
            return f"user:{request.state.user_id}"

        # Use IP address for anonymous requests
        client_ip = request.client.host if request.client else "unknown"

        # Hash IP for privacy
        return f"ip:{hashlib.sha256(client_ip.encode()).hexdigest()[:16]}"


# ============================================================================
# Global Instance
# ============================================================================

rate_limiter = RateLimiter()


# ============================================================================
# Startup/Shutdown Handlers
# ============================================================================

async def startup_rate_limiter():
    """Connect to Redis on startup"""
    await rate_limiter.connect()
    logger.info("Rate limiter initialized")


async def shutdown_rate_limiter():
    """Disconnect from Redis on shutdown"""
    await rate_limiter.disconnect()
    logger.info("Rate limiter shutdown")


# ============================================================================
# Export
# ============================================================================

__all__ = [
    "RateLimiter",
    "RateLimitMiddleware",
    "rate_limiter",
    "startup_rate_limiter",
    "shutdown_rate_limiter",
]
