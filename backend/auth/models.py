"""
Repazoo Twitter OAuth 2.0 Pydantic Models
Request and response models for OAuth flow
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class OAuthDomain(str, Enum):
    """Valid Repazoo domains for OAuth callbacks"""
    API = "api"
    CFY = "cfy"
    NTF = "ntf"
    AI = "ai"
    DASH = "dash"


class OAuthLoginRequest(BaseModel):
    """Request model for initiating OAuth flow"""
    domain: OAuthDomain = Field(
        ...,
        description="Repazoo domain for callback (api, cfy, ntf, ai, dash)"
    )
    redirect_after_auth: Optional[str] = Field(
        None,
        description="Optional URL to redirect user after successful authentication"
    )

    @validator('redirect_after_auth')
    def validate_redirect_url(cls, v):
        """Ensure redirect URL is valid and uses HTTPS"""
        if v is not None:
            if not v.startswith("https://"):
                raise ValueError("Redirect URL must use HTTPS")
            if not any(v.startswith(f"https://{domain}.repazoo.com") for domain in ["api", "cfy", "ntf", "ai", "dash"]):
                raise ValueError("Redirect URL must be a valid Repazoo domain")
        return v


class OAuthLoginResponse(BaseModel):
    """Response model for OAuth login initiation"""
    authorization_url: str = Field(
        ...,
        description="Twitter OAuth authorization URL to redirect user to"
    )
    state: str = Field(
        ...,
        description="CSRF protection state parameter (for internal tracking only)"
    )
    expires_at: datetime = Field(
        ...,
        description="When the state parameter expires"
    )


class OAuthCallbackRequest(BaseModel):
    """Request model for OAuth callback processing"""
    code: str = Field(
        ...,
        description="Authorization code from Twitter"
    )
    state: str = Field(
        ...,
        description="State parameter for CSRF validation"
    )
    error: Optional[str] = Field(
        None,
        description="Error code if OAuth flow failed"
    )
    error_description: Optional[str] = Field(
        None,
        description="Human-readable error description"
    )


class TwitterUserInfo(BaseModel):
    """Twitter user information from API"""
    id: str = Field(..., description="Twitter user ID")
    username: str = Field(..., description="Twitter username (handle)")
    name: str = Field(..., description="Twitter display name")


class OAuthCallbackResponse(BaseModel):
    """Response model for successful OAuth callback"""
    success: bool = Field(..., description="Whether authentication succeeded")
    twitter_account_id: Optional[str] = Field(
        None,
        description="Database ID of the connected Twitter account"
    )
    twitter_user: Optional[TwitterUserInfo] = Field(
        None,
        description="Twitter user information"
    )
    redirect_url: Optional[str] = Field(
        None,
        description="URL to redirect user to after authentication"
    )
    error: Optional[str] = Field(
        None,
        description="Error message if authentication failed"
    )


class OAuthStatusResponse(BaseModel):
    """Response model for authentication status check"""
    authenticated: bool = Field(
        ...,
        description="Whether user has active Twitter authentication"
    )
    twitter_accounts: List[TwitterUserInfo] = Field(
        default_factory=list,
        description="List of connected Twitter accounts"
    )
    token_expires_at: Optional[datetime] = Field(
        None,
        description="When the current access token expires"
    )
    scopes: List[str] = Field(
        default_factory=list,
        description="OAuth scopes granted"
    )


class OAuthRevokeRequest(BaseModel):
    """Request model for revoking OAuth access"""
    twitter_account_id: str = Field(
        ...,
        description="Database ID of Twitter account to disconnect"
    )


class OAuthRevokeResponse(BaseModel):
    """Response model for OAuth revocation"""
    success: bool = Field(..., description="Whether revocation succeeded")
    message: str = Field(..., description="Status message")


class TokenRefreshRequest(BaseModel):
    """Internal model for token refresh operations"""
    twitter_account_id: str = Field(
        ...,
        description="Database ID of Twitter account"
    )
    refresh_token: str = Field(
        ...,
        description="Encrypted refresh token from database"
    )


class TokenRefreshResponse(BaseModel):
    """Internal model for token refresh response"""
    access_token: str = Field(..., description="New access token")
    refresh_token: str = Field(..., description="New refresh token")
    expires_in: int = Field(..., description="Token lifetime in seconds")
    token_type: str = Field(default="bearer", description="Token type")
    scope: str = Field(..., description="Granted scopes")


class PKCEChallenge(BaseModel):
    """PKCE challenge data for OAuth flow"""
    code_verifier: str = Field(
        ...,
        description="Random code verifier (stored securely in session)"
    )
    code_challenge: str = Field(
        ...,
        description="SHA-256 hash of code verifier (sent to Twitter)"
    )
    code_challenge_method: str = Field(
        default="S256",
        description="Challenge method (always S256 for security)"
    )


class OAuthStateData(BaseModel):
    """Data stored in OAuth state parameter"""
    state_id: str = Field(..., description="Unique state identifier")
    user_id: Optional[str] = Field(None, description="User ID if authenticated")
    domain: str = Field(..., description="Callback domain")
    redirect_after_auth: Optional[str] = Field(
        None,
        description="Post-auth redirect URL"
    )
    code_verifier: str = Field(..., description="PKCE code verifier")
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="State creation timestamp"
    )
    expires_at: datetime = Field(..., description="State expiration timestamp")


class AuditLogEntry(BaseModel):
    """Model for OAuth audit log entries"""
    user_id: Optional[str] = Field(None, description="User ID if available")
    action: str = Field(
        ...,
        description="Action performed (OAUTH_CONNECT, TOKEN_REFRESHED, etc.)"
    )
    resource_type: str = Field(
        default="twitter_account",
        description="Resource type"
    )
    resource_id: Optional[str] = Field(
        None,
        description="Resource identifier"
    )
    ip_address: Optional[str] = Field(None, description="Client IP address")
    user_agent: Optional[str] = Field(None, description="Client user agent")
    metadata: dict = Field(
        default_factory=dict,
        description="Additional metadata"
    )


class ErrorResponse(BaseModel):
    """Standard error response model"""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict] = Field(
        None,
        description="Additional error details"
    )
    incident_id: Optional[str] = Field(
        None,
        description="Incident ID for tracking security violations"
    )
