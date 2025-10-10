"""
Distributed Rate Limiter with Redis
Compliance: Twitter API Rate Limits, Anthropic API Limits
- Twitter: 900 requests/15min for user timeline
- Anthropic: 50 requests/min
"""

import time
import redis
from typing import Optional, Tuple
from datetime import datetime, timedelta
import logging
from functools import wraps

logger = logging.getLogger(__name__)


class RateLimitExceeded(Exception):
    """Raised when rate limit is exceeded"""
    def __init__(self, retry_after: int, limit_type: str):
        self.retry_after = retry_after
        self.limit_type = limit_type
        super().__init__(f"Rate limit exceeded for {limit_type}. Retry after {retry_after} seconds.")


class RedisRateLimiter:
    """
    Redis-based sliding window rate limiter
    Tracks per-user and per-service limits
    """

    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        """
        Initialize rate limiter

        Args:
            redis_url: Redis connection URL
        """
        self.redis_client = redis.from_url(redis_url, decode_responses=True)

        # Rate limit configurations
        self.LIMITS = {
            'twitter_user_timeline': {
                'requests': 900,
                'window_seconds': 900,  # 15 minutes
                'description': 'Twitter User Timeline API'
            },
            'twitter_user_lookup': {
                'requests': 900,
                'window_seconds': 900,
                'description': 'Twitter User Lookup API'
            },
            'twitter_tweet_lookup': {
                'requests': 300,
                'window_seconds': 900,
                'description': 'Twitter Tweet Lookup API'
            },
            'anthropic_api': {
                'requests': 50,
                'window_seconds': 60,  # 1 minute
                'description': 'Anthropic Claude API'
            },
            'anthropic_api_tier2': {
                'requests': 100,
                'window_seconds': 60,  # Higher tier
                'description': 'Anthropic Claude API (Pro Tier)'
            }
        }

    def _get_key(self, service: str, user_id: str) -> str:
        """Generate Redis key for rate limiting"""
        return f"ratelimit:{service}:{user_id}"

    def check_and_increment(self, service: str, user_id: str) -> Tuple[bool, int]:
        """
        Check rate limit and increment counter using sliding window

        Args:
            service: Service name (e.g., 'twitter_user_timeline')
            user_id: User identifier

        Returns:
            Tuple of (allowed: bool, retry_after: int seconds)
        """
        if service not in self.LIMITS:
            logger.warning(f"Unknown service: {service}, allowing request")
            return True, 0

        config = self.LIMITS[service]
        max_requests = config['requests']
        window_seconds = config['window_seconds']

        key = self._get_key(service, user_id)
        now = time.time()
        window_start = now - window_seconds

        # Use Redis pipeline for atomic operations
        pipe = self.redis_client.pipeline()

        try:
            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, window_start)

            # Count requests in current window
            pipe.zcard(key)

            # Execute pipeline
            results = pipe.execute()
            current_count = results[1]

            if current_count >= max_requests:
                # Get oldest request in window to calculate retry_after
                oldest = self.redis_client.zrange(key, 0, 0, withscores=True)
                if oldest:
                    oldest_timestamp = oldest[0][1]
                    retry_after = int((oldest_timestamp + window_seconds) - now) + 1
                else:
                    retry_after = window_seconds

                logger.warning(
                    f"Rate limit exceeded for {service} (user: {user_id[-4:]}). "
                    f"Count: {current_count}/{max_requests}. Retry after: {retry_after}s"
                )
                return False, retry_after

            # Add current request to window
            pipe = self.redis_client.pipeline()
            pipe.zadd(key, {f"{now}:{user_id}": now})
            pipe.expire(key, window_seconds + 60)  # TTL with buffer
            pipe.execute()

            logger.debug(
                f"Rate limit check passed for {service} (user: {user_id[-4:]}). "
                f"Count: {current_count + 1}/{max_requests}"
            )
            return True, 0

        except redis.RedisError as e:
            logger.error(f"Redis error in rate limiter: {e}")
            # Fail open in case of Redis failure (but log it)
            return True, 0

    def get_current_usage(self, service: str, user_id: str) -> Tuple[int, int]:
        """
        Get current usage for a service/user

        Args:
            service: Service name
            user_id: User identifier

        Returns:
            Tuple of (current_count, max_allowed)
        """
        if service not in self.LIMITS:
            return 0, 0

        config = self.LIMITS[service]
        max_requests = config['requests']
        window_seconds = config['window_seconds']

        key = self._get_key(service, user_id)
        now = time.time()
        window_start = now - window_seconds

        # Remove old entries and count
        pipe = self.redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        results = pipe.execute()

        return results[1], max_requests

    def reset_limit(self, service: str, user_id: str):
        """Reset rate limit for a user (admin function)"""
        key = self._get_key(service, user_id)
        self.redis_client.delete(key)
        logger.info(f"Reset rate limit for {service} (user: {user_id[-4:]})")

    def parse_twitter_headers(self, headers: dict) -> Optional[dict]:
        """
        Parse Twitter X-Rate-Limit-* headers

        Args:
            headers: Response headers from Twitter API

        Returns:
            Dictionary with rate limit info or None
        """
        try:
            limit_info = {
                'limit': int(headers.get('x-rate-limit-limit', 0)),
                'remaining': int(headers.get('x-rate-limit-remaining', 0)),
                'reset': int(headers.get('x-rate-limit-reset', 0)),
            }

            # Calculate seconds until reset
            reset_time = datetime.fromtimestamp(limit_info['reset'])
            now = datetime.now()
            limit_info['retry_after'] = max(0, (reset_time - now).seconds)

            return limit_info
        except (ValueError, TypeError) as e:
            logger.error(f"Failed to parse Twitter rate limit headers: {e}")
            return None

    def sync_with_twitter_headers(self, service: str, user_id: str, headers: dict):
        """
        Sync internal rate limiter with Twitter's actual limits

        Args:
            service: Service name
            user_id: User identifier
            headers: Response headers from Twitter
        """
        limit_info = self.parse_twitter_headers(headers)
        if not limit_info:
            return

        # If Twitter says we're close to limit, update our tracking
        if limit_info['remaining'] < 10:
            logger.warning(
                f"Twitter rate limit low for {service} (user: {user_id[-4:]}). "
                f"Remaining: {limit_info['remaining']}/{limit_info['limit']}"
            )

        # Store Twitter's actual reset time
        reset_key = f"twitter_reset:{service}:{user_id}"
        self.redis_client.setex(
            reset_key,
            limit_info['retry_after'] + 60,
            limit_info['reset']
        )


def rate_limited(service: str, rate_limiter: RedisRateLimiter):
    """
    Decorator for rate-limited functions

    Args:
        service: Service name to rate limit
        rate_limiter: RedisRateLimiter instance

    Example:
        @rate_limited('twitter_user_timeline', limiter)
        def fetch_tweets(user_id: str):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(user_id: str, *args, **kwargs):
            allowed, retry_after = rate_limiter.check_and_increment(service, user_id)

            if not allowed:
                raise RateLimitExceeded(retry_after, service)

            return func(user_id, *args, **kwargs)

        return wrapper
    return decorator


def exponential_backoff(max_retries: int = 5, base_delay: int = 1):
    """
    Decorator for exponential backoff on HTTP 429 errors

    Args:
        max_retries: Maximum number of retries
        base_delay: Base delay in seconds (doubles each retry)

    Example:
        @exponential_backoff(max_retries=3)
        def api_call():
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except RateLimitExceeded as e:
                    if attempt == max_retries:
                        logger.error(f"Max retries exceeded for {func.__name__}")
                        raise

                    delay = min(base_delay * (2 ** attempt), e.retry_after)
                    logger.info(
                        f"Rate limited, attempt {attempt + 1}/{max_retries}. "
                        f"Retrying in {delay}s"
                    )
                    time.sleep(delay)
                except Exception as e:
                    # Check if HTTP 429
                    if hasattr(e, 'response') and getattr(e.response, 'status_code', None) == 429:
                        if attempt == max_retries:
                            raise

                        retry_after = int(e.response.headers.get('Retry-After', base_delay * (2 ** attempt)))
                        logger.info(f"HTTP 429 received. Retrying in {retry_after}s")
                        time.sleep(retry_after)
                    else:
                        raise

            return None  # Should never reach here

        return wrapper
    return decorator
