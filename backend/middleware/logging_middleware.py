"""
Logging Middleware
Request/response logging and performance monitoring
"""

import logging
import time
import json
from typing import Callable
from uuid import uuid4

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from config import settings
from database import db


logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging requests and responses
    """

    # Routes to exclude from logging
    EXCLUDE_ROUTES = [
        "/healthz",
        "/docs",
        "/redoc",
        "/openapi.json",
    ]

    # Sensitive headers to redact
    SENSITIVE_HEADERS = [
        "authorization",
        "cookie",
        "x-api-key",
        "stripe-signature",
    ]

    async def dispatch(self, request: Request, call_next: Callable):
        """Log request and response"""

        # Skip logging for excluded routes
        if not settings.enable_request_logging or self._should_exclude(request.url.path):
            return await call_next(request)

        # Generate request ID
        request_id = str(uuid4())
        request.state.request_id = request_id

        # Start timing
        start_time = time.time()

        # Log request
        self._log_request(request, request_id)

        # Process request
        try:
            response = await call_next(request)

            # Calculate duration
            duration = time.time() - start_time

            # Log response
            self._log_response(request, response, duration, request_id)

            # Add request ID header
            response.headers["X-Request-ID"] = request_id

            # Add performance monitoring
            if settings.enable_performance_monitoring:
                response.headers["X-Response-Time"] = f"{duration:.3f}s"

            # Log to audit table for important operations
            if self._should_audit(request):
                self._audit_request(request, response, duration)

            return response

        except Exception as e:
            duration = time.time() - start_time
            self._log_error(request, e, duration, request_id)
            raise

    def _should_exclude(self, path: str) -> bool:
        """Check if route should be excluded from logging"""
        return any(path.startswith(route) for route in self.EXCLUDE_ROUTES)

    def _should_audit(self, request: Request) -> bool:
        """Check if request should be audited"""
        # Audit all POST, PUT, DELETE, PATCH requests
        return request.method in ["POST", "PUT", "DELETE", "PATCH"]

    def _log_request(self, request: Request, request_id: str):
        """Log incoming request"""
        # Redact sensitive headers
        headers = {
            k: "***REDACTED***" if k.lower() in self.SENSITIVE_HEADERS else v
            for k, v in request.headers.items()
        }

        log_data = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "query_params": str(request.query_params),
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "user_id": getattr(request.state, "user_id", None),
        }

        logger.info(f"Request: {json.dumps(log_data)}")

    def _log_response(
        self,
        request: Request,
        response: Response,
        duration: float,
        request_id: str
    ):
        """Log outgoing response"""
        log_data = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration": f"{duration:.3f}s",
            "user_id": getattr(request.state, "user_id", None),
        }

        # Log level based on status code
        if response.status_code >= 500:
            logger.error(f"Response: {json.dumps(log_data)}")
        elif response.status_code >= 400:
            logger.warning(f"Response: {json.dumps(log_data)}")
        else:
            logger.info(f"Response: {json.dumps(log_data)}")

    def _log_error(
        self,
        request: Request,
        error: Exception,
        duration: float,
        request_id: str
    ):
        """Log request error"""
        log_data = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "error": str(error),
            "error_type": type(error).__name__,
            "duration": f"{duration:.3f}s",
            "user_id": getattr(request.state, "user_id", None),
        }

        logger.error(f"Error: {json.dumps(log_data)}", exc_info=True)

    def _audit_request(self, request: Request, response: Response, duration: float):
        """Log request to audit table"""
        try:
            # Only audit if user is authenticated
            user_id = getattr(request.state, "user_id", None)
            if not user_id:
                return

            # Determine action from method and path
            action = self._determine_action(request)

            # Extract resource info
            resource_type, resource_id = self._extract_resource_info(request)

            # Log to audit table
            db.log_audit(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                metadata={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration": duration,
                    "request_id": getattr(request.state, "request_id", None),
                },
                ip_address=request.client.host if request.client else None
            )

        except Exception as e:
            logger.error(f"Failed to audit request: {e}")

    def _determine_action(self, request: Request) -> str:
        """Determine action name from request"""
        method = request.method
        path = request.url.path

        # Map common patterns
        if "/subscriptions/create" in path:
            return "SUBSCRIPTION_CREATED"
        elif "/subscriptions/update" in path:
            return "SUBSCRIPTION_UPDATED"
        elif "/subscriptions/cancel" in path:
            return "SUBSCRIPTION_CANCELED"
        elif "/analyze" in path:
            return "ANALYSIS_CREATED"
        elif method == "POST":
            return "CREATE"
        elif method == "PUT" or method == "PATCH":
            return "UPDATE"
        elif method == "DELETE":
            return "DELETE"

        return "API_REQUEST"

    def _extract_resource_info(self, request: Request) -> tuple[str, str]:
        """Extract resource type and ID from request"""
        path = request.url.path

        # Parse common patterns
        if "/subscriptions" in path:
            return "subscription", None
        elif "/analyses" in path:
            # Extract ID from path if present
            parts = path.split("/")
            if len(parts) > 3:
                return "analysis", parts[-1]
            return "analysis", None
        elif "/users" in path:
            return "user", None

        return "unknown", None


# ============================================================================
# Request Context Helper
# ============================================================================

def get_request_id(request: Request) -> str:
    """Get request ID from request state"""
    return getattr(request.state, "request_id", "unknown")


# ============================================================================
# Export
# ============================================================================

__all__ = ["LoggingMiddleware", "get_request_id"]
