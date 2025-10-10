"""
Authentication Middleware
JWT token validation and user context injection
"""

import logging
from typing import Optional, Callable
from datetime import datetime, timezone

from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from starlette.middleware.base import BaseHTTPMiddleware

from config import settings
from database import db


logger = logging.getLogger(__name__)

# Security scheme for Swagger UI
security = HTTPBearer()


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate JWT tokens and inject user context
    """

    # Routes that don't require authentication
    PUBLIC_ROUTES = [
        "/docs",
        "/redoc",
        "/openapi.json",
        "/healthz",
        "/auth/twitter/login",
        "/auth/twitter/callback",
        "/api/webhooks/stripe",
    ]

    async def dispatch(self, request: Request, call_next: Callable):
        """Process request and validate authentication"""

        # Skip auth for public routes
        if self._is_public_route(request.url.path):
            return await call_next(request)

        # Extract and validate token
        try:
            token = self._extract_token(request)
            if token:
                user_data = self._validate_token(token)
                request.state.user_id = user_data.get("sub")
                request.state.user_email = user_data.get("email")
                request.state.is_authenticated = True
            else:
                request.state.user_id = None
                request.state.is_authenticated = False

        except HTTPException:
            # Let route handler decide if auth is required
            request.state.user_id = None
            request.state.is_authenticated = False

        return await call_next(request)

    def _is_public_route(self, path: str) -> bool:
        """Check if route is public"""
        return any(path.startswith(route) for route in self.PUBLIC_ROUTES)

    def _extract_token(self, request: Request) -> Optional[str]:
        """Extract JWT token from Authorization header"""
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None

        return parts[1]

    def _validate_token(self, token: str) -> dict:
        """Validate JWT token and return payload"""
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm]
            )

            # Check expiration
            exp = payload.get("exp")
            if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired"
                )

            return payload

        except JWTError as e:
            logger.warning(f"JWT validation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )


# ============================================================================
# Dependency Functions
# ============================================================================

async def get_current_user(request: Request) -> str:
    """
    Dependency to get current authenticated user

    Usage:
        @router.get("/users/me")
        async def get_me(user_id: str = Depends(get_current_user)):
            return {"user_id": user_id}
    """
    if not getattr(request.state, "is_authenticated", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return request.state.user_id


async def get_current_user_optional(request: Request) -> Optional[str]:
    """
    Dependency to get current user if authenticated (optional)

    Usage:
        @router.get("/public-endpoint")
        async def public(user_id: Optional[str] = Depends(get_current_user_optional)):
            if user_id:
                # User is logged in
            else:
                # Anonymous user
    """
    return getattr(request.state, "user_id", None)


async def verify_api_key(credentials: HTTPAuthorizationCredentials = security):
    """
    Verify API key from Authorization header

    Usage:
        @router.get("/admin/endpoint")
        async def admin_only(api_key: str = Depends(verify_api_key)):
            # Protected admin endpoint
    """
    # TODO: Implement API key verification from database
    # For now, just validate format
    if not credentials.credentials.startswith("rz_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format"
        )

    return credentials.credentials


# ============================================================================
# Token Creation Helpers
# ============================================================================

def create_access_token(
    user_id: str,
    email: str,
    expires_minutes: Optional[int] = None
) -> str:
    """
    Create JWT access token

    Args:
        user_id: User ID
        email: User email
        expires_minutes: Token expiration in minutes (default from settings)

    Returns:
        JWT token string
    """
    from datetime import timedelta

    if expires_minutes is None:
        expires_minutes = settings.access_token_expire_minutes

    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)

    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access"
    }

    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: str, expires_days: Optional[int] = None) -> str:
    """
    Create JWT refresh token

    Args:
        user_id: User ID
        expires_days: Token expiration in days (default from settings)

    Returns:
        JWT refresh token string
    """
    from datetime import timedelta

    if expires_days is None:
        expires_days = settings.refresh_token_expire_days

    expire = datetime.now(timezone.utc) + timedelta(days=expires_days)

    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh"
    }

    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


# ============================================================================
# Export
# ============================================================================

__all__ = [
    "AuthMiddleware",
    "get_current_user",
    "get_current_user_optional",
    "verify_api_key",
    "create_access_token",
    "create_refresh_token",
]
