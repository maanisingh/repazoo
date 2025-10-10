"""Middleware module"""

from .auth_middleware import (
    AuthMiddleware,
    get_current_user,
    get_current_user_optional,
    create_access_token,
    create_refresh_token,
)
from .rate_limiter import (
    RateLimiter,
    RateLimitMiddleware,
    rate_limiter,
    startup_rate_limiter,
    shutdown_rate_limiter,
)
from .logging_middleware import LoggingMiddleware, get_request_id
from .error_handler import (
    ErrorResponse,
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
    quota_exceeded_handler,
    invalid_subscription_handler,
    twitter_api_error_handler,
    stripe_error_handler,
    QuotaExceededError,
    InvalidSubscriptionError,
    TwitterAPIError,
    StripeError,
)

__all__ = [
    "AuthMiddleware",
    "get_current_user",
    "get_current_user_optional",
    "create_access_token",
    "create_refresh_token",
    "RateLimiter",
    "RateLimitMiddleware",
    "rate_limiter",
    "startup_rate_limiter",
    "shutdown_rate_limiter",
    "LoggingMiddleware",
    "get_request_id",
    "ErrorResponse",
    "http_exception_handler",
    "validation_exception_handler",
    "generic_exception_handler",
    "quota_exceeded_handler",
    "invalid_subscription_handler",
    "twitter_api_error_handler",
    "stripe_error_handler",
    "QuotaExceededError",
    "InvalidSubscriptionError",
    "TwitterAPIError",
    "StripeError",
]
