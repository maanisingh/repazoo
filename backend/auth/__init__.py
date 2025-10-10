"""
Repazoo Twitter OAuth 2.0 Authentication Module

This module provides secure Twitter OAuth 2.0 authentication with PKCE,
token management, and encrypted storage.

Components:
- config: OAuth configuration and vault integration
- models: Pydantic models for requests/responses
- oauth_handler: Core OAuth logic with PKCE and token management
- routes: FastAPI endpoints for OAuth flow

Security Features:
- PKCE (Proof Key for Code Exchange) for authorization code protection
- State parameter validation for CSRF prevention
- AES-256 encrypted token storage via database functions
- Comprehensive audit logging
- Token refresh and rotation
- Multi-domain callback support

Usage:
    from backend.auth import router as auth_router
    app.include_router(auth_router)
"""

from .routes import router
from .oauth_handler import get_oauth_handler, OAuthHandler
from .config import get_oauth_config, OAuthConfig
from .models import (
    OAuthLoginRequest,
    OAuthLoginResponse,
    OAuthCallbackResponse,
    OAuthStatusResponse,
    OAuthRevokeRequest,
    OAuthRevokeResponse,
    ErrorResponse,
)

__all__ = [
    # Router
    "router",
    # Handler
    "get_oauth_handler",
    "OAuthHandler",
    # Config
    "get_oauth_config",
    "OAuthConfig",
    # Models
    "OAuthLoginRequest",
    "OAuthLoginResponse",
    "OAuthCallbackResponse",
    "OAuthStatusResponse",
    "OAuthRevokeRequest",
    "OAuthRevokeResponse",
    "ErrorResponse",
]

__version__ = "1.0.0"
