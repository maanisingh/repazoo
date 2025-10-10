"""
Error Handler Middleware
Centralized error handling and formatting
"""

import logging
import traceback
from typing import Union
from uuid import uuid4

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import ValidationError

from config import settings


logger = logging.getLogger(__name__)


class ErrorResponse:
    """Standard error response format"""

    @staticmethod
    def format(
        error_code: str,
        message: str,
        status_code: int,
        details: dict = None,
        request_id: str = None
    ) -> dict:
        """
        Format error response

        Args:
            error_code: Machine-readable error code
            message: Human-readable error message
            status_code: HTTP status code
            details: Additional error details
            request_id: Request ID for tracking

        Returns:
            Formatted error dictionary
        """
        error_response = {
            "error": {
                "code": error_code,
                "message": message,
                "status": status_code,
            }
        }

        if details:
            error_response["error"]["details"] = details

        if request_id:
            error_response["request_id"] = request_id

        if settings.debug:
            # Include stack trace in debug mode
            error_response["error"]["stack_trace"] = traceback.format_exc()

        return error_response


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions"""
    request_id = getattr(request.state, "request_id", str(uuid4()))

    logger.warning(
        f"HTTP {exc.status_code}: {exc.detail} "
        f"[{request.method} {request.url.path}] "
        f"request_id={request_id}"
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse.format(
            error_code=f"HTTP_{exc.status_code}",
            message=exc.detail,
            status_code=exc.status_code,
            request_id=request_id
        )
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors"""
    request_id = getattr(request.state, "request_id", str(uuid4()))

    # Format validation errors
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " -> ".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })

    logger.warning(
        f"Validation error: {errors} "
        f"[{request.method} {request.url.path}] "
        f"request_id={request_id}"
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse.format(
            error_code="VALIDATION_ERROR",
            message="Request validation failed",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details={"errors": errors},
            request_id=request_id
        )
    )


async def generic_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions"""
    request_id = getattr(request.state, "request_id", str(uuid4()))
    incident_id = str(uuid4())

    logger.error(
        f"Unhandled exception: {str(exc)} "
        f"[{request.method} {request.url.path}] "
        f"request_id={request_id} incident_id={incident_id}",
        exc_info=True
    )

    # Don't expose internal errors in production
    if settings.is_production:
        message = "An internal error occurred. Please try again later."
        details = {"incident_id": incident_id}
    else:
        message = str(exc)
        details = {
            "incident_id": incident_id,
            "type": type(exc).__name__,
            "traceback": traceback.format_exc()
        }

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse.format(
            error_code="INTERNAL_ERROR",
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details,
            request_id=request_id
        )
    )


# ============================================================================
# Custom Exception Classes
# ============================================================================

class QuotaExceededError(Exception):
    """Raised when user exceeds API quota"""
    def __init__(self, message: str = "API quota exceeded", quota_info: dict = None):
        self.message = message
        self.quota_info = quota_info or {}
        super().__init__(self.message)


class InvalidSubscriptionError(Exception):
    """Raised when subscription is invalid or expired"""
    def __init__(self, message: str = "Invalid or expired subscription"):
        self.message = message
        super().__init__(self.message)


class TwitterAPIError(Exception):
    """Raised when Twitter API request fails"""
    def __init__(self, message: str, status_code: int = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class StripeError(Exception):
    """Raised when Stripe API request fails"""
    def __init__(self, message: str, error_type: str = None):
        self.message = message
        self.error_type = error_type
        super().__init__(self.message)


async def quota_exceeded_handler(request: Request, exc: QuotaExceededError):
    """Handle quota exceeded errors"""
    request_id = getattr(request.state, "request_id", str(uuid4()))

    logger.warning(
        f"Quota exceeded for user {getattr(request.state, 'user_id', 'unknown')} "
        f"request_id={request_id}"
    )

    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content=ErrorResponse.format(
            error_code="QUOTA_EXCEEDED",
            message=exc.message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=exc.quota_info,
            request_id=request_id
        ),
        headers={
            "X-Quota-Limit": str(exc.quota_info.get("quota", 0)),
            "X-Quota-Remaining": "0",
            "X-Quota-Reset": exc.quota_info.get("period_end", ""),
        }
    )


async def invalid_subscription_handler(request: Request, exc: InvalidSubscriptionError):
    """Handle invalid subscription errors"""
    request_id = getattr(request.state, "request_id", str(uuid4()))

    logger.warning(
        f"Invalid subscription for user {getattr(request.state, 'user_id', 'unknown')} "
        f"request_id={request_id}"
    )

    return JSONResponse(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        content=ErrorResponse.format(
            error_code="INVALID_SUBSCRIPTION",
            message=exc.message,
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            request_id=request_id
        )
    )


async def twitter_api_error_handler(request: Request, exc: TwitterAPIError):
    """Handle Twitter API errors"""
    request_id = getattr(request.state, "request_id", str(uuid4()))

    logger.error(
        f"Twitter API error: {exc.message} "
        f"status={exc.status_code} "
        f"request_id={request_id}"
    )

    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content=ErrorResponse.format(
            error_code="TWITTER_API_ERROR",
            message="Twitter API request failed",
            status_code=status.HTTP_502_BAD_GATEWAY,
            details={"twitter_error": exc.message},
            request_id=request_id
        )
    )


async def stripe_error_handler(request: Request, exc: StripeError):
    """Handle Stripe errors"""
    request_id = getattr(request.state, "request_id", str(uuid4()))

    logger.error(
        f"Stripe error: {exc.message} "
        f"type={exc.error_type} "
        f"request_id={request_id}"
    )

    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content=ErrorResponse.format(
            error_code="PAYMENT_ERROR",
            message="Payment processing failed",
            status_code=status.HTTP_502_BAD_GATEWAY,
            details={"payment_error": exc.message},
            request_id=request_id
        )
    )


# ============================================================================
# Export
# ============================================================================

__all__ = [
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
