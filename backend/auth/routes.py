"""
Repazoo Twitter OAuth 2.0 FastAPI Routes
API endpoints for OAuth authentication flow
"""

from fastapi import APIRouter, HTTPException, Request, Depends, status
from fastapi.responses import RedirectResponse
from typing import Optional
import uuid

from .oauth_handler import get_oauth_handler, OAuthHandler
from .models import (
    OAuthLoginRequest,
    OAuthLoginResponse,
    OAuthCallbackRequest,
    OAuthCallbackResponse,
    OAuthStatusResponse,
    OAuthRevokeRequest,
    OAuthRevokeResponse,
    ErrorResponse,
    TwitterUserInfo,
)


# Create router with prefix and tags
router = APIRouter(
    prefix="/auth/twitter",
    tags=["Authentication"],
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"}
    }
)


def get_client_info(request: Request) -> dict:
    """Extract client information from request"""
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent")
    }


def get_user_id_from_session(request: Request) -> Optional[str]:
    """
    Extract user ID from session/JWT token.
    This should integrate with your authentication system.
    """
    # TODO: Implement based on your auth system (JWT, session, etc.)
    # For now, return None (unauthenticated flow is still supported)
    auth_header = request.headers.get("authorization")
    if not auth_header:
        return None

    # Example JWT extraction (implement based on your auth system)
    # token = auth_header.replace("Bearer ", "")
    # decoded = jwt.decode(token, ...)
    # return decoded.get("sub")

    return None


@router.get(
    "/login",
    response_model=OAuthLoginResponse,
    summary="Initiate Twitter OAuth Flow",
    description="Generate Twitter OAuth authorization URL with PKCE for secure authentication"
)
async def initiate_oauth_flow(
    domain: str,
    redirect_after_auth: Optional[str] = None,
    request: Request = None,
    handler: OAuthHandler = Depends(get_oauth_handler)
) -> OAuthLoginResponse:
    """
    Initiate Twitter OAuth 2.0 flow with PKCE.

    **Parameters:**
    - **domain**: Repazoo domain for callback (api, cfy, ntf, ai, dash)
    - **redirect_after_auth**: Optional URL to redirect after authentication

    **Returns:**
    - Authorization URL to redirect user to Twitter
    - State parameter for CSRF validation
    - Expiration timestamp

    **Example:**
    ```
    GET /auth/twitter/login?domain=dash&redirect_after_auth=https://dash.repazoo.com/settings
    ```
    """
    try:
        # Validate domain
        valid_domains = ["api", "cfy", "ntf", "ai", "dash"]
        if domain not in valid_domains:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid domain. Must be one of: {', '.join(valid_domains)}"
            )

        # Get user ID if authenticated
        user_id = get_user_id_from_session(request)

        # Generate authorization URL with PKCE
        authorization_url, state_data = handler.generate_authorization_url(
            domain=domain,
            user_id=user_id,
            redirect_after_auth=redirect_after_auth
        )

        return OAuthLoginResponse(
            authorization_url=authorization_url,
            state=state_data.state_id,
            expires_at=state_data.expires_at
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        # Log error for security monitoring
        incident_id = str(uuid.uuid4())
        print(f"OAuth initiation error [{incident_id}]: {str(e)}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate OAuth flow. Please try again."
        )


@router.get(
    "/callback",
    response_model=OAuthCallbackResponse,
    summary="Handle Twitter OAuth Callback",
    description="Process OAuth callback from Twitter and exchange code for tokens"
)
async def handle_oauth_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    domain: str = "api",
    request: Request = None,
    handler: OAuthHandler = Depends(get_oauth_handler)
) -> OAuthCallbackResponse:
    """
    Handle OAuth 2.0 callback from Twitter.

    **Parameters:**
    - **code**: Authorization code from Twitter
    - **state**: State parameter for CSRF validation
    - **error**: Error code if OAuth failed
    - **error_description**: Human-readable error description
    - **domain**: Callback domain (api, cfy, ntf, ai, dash)

    **Returns:**
    - Success status
    - Twitter account information
    - Redirect URL if specified during login

    **Note:** This endpoint is called by Twitter after user authorizes the app.
    """
    client_info = get_client_info(request)

    # Handle OAuth errors from Twitter
    if error:
        return OAuthCallbackResponse(
            success=False,
            error=f"Twitter OAuth error: {error}. {error_description or ''}"
        )

    # Validate required parameters
    if not code or not state:
        return OAuthCallbackResponse(
            success=False,
            error="Missing required parameters: code and state"
        )

    try:
        # Exchange authorization code for tokens
        token_data, twitter_user = await handler.exchange_code_for_tokens(
            code=code,
            state_id=state,
            domain=domain
        )

        # Get or retrieve state to find user_id and redirect URL
        state_data = handler.validate_and_retrieve_state(state)
        user_id = state_data.user_id if state_data else None
        redirect_url = state_data.redirect_after_auth if state_data else None

        # If no user_id in state, this might be initial signup
        # You should implement user creation logic here or require pre-authentication
        if not user_id:
            # For this implementation, we'll require user to be authenticated first
            return OAuthCallbackResponse(
                success=False,
                error="User must be logged in to Repazoo before connecting Twitter account"
            )

        # Store Twitter account with encrypted tokens
        account_id = handler.store_twitter_account(
            user_id=user_id,
            twitter_user=twitter_user,
            token_data=token_data
        )

        return OAuthCallbackResponse(
            success=True,
            twitter_account_id=account_id,
            twitter_user=twitter_user,
            redirect_url=redirect_url or f"https://{domain}.repazoo.com/settings"
        )

    except ValueError as e:
        # CSRF validation or state errors
        incident_id = str(uuid.uuid4())
        handler._log_audit(
            action="OAUTH_CONNECT",
            metadata={
                "error": str(e),
                "incident_id": incident_id,
                "ip_address": client_info["ip_address"]
            }
        )

        return OAuthCallbackResponse(
            success=False,
            error=f"OAuth validation failed: {str(e)}"
        )

    except Exception as e:
        incident_id = str(uuid.uuid4())
        print(f"OAuth callback error [{incident_id}]: {str(e)}")

        return OAuthCallbackResponse(
            success=False,
            error="Failed to complete OAuth flow. Please try again."
        )


@router.get(
    "/status",
    response_model=OAuthStatusResponse,
    summary="Check Authentication Status",
    description="Check if user has active Twitter authentication"
)
async def check_auth_status(
    request: Request,
    handler: OAuthHandler = Depends(get_oauth_handler)
) -> OAuthStatusResponse:
    """
    Check authentication status for current user.

    **Returns:**
    - Authentication status
    - List of connected Twitter accounts
    - Token expiration information
    - Granted OAuth scopes

    **Note:** Requires user to be authenticated with Repazoo.
    """
    user_id = get_user_id_from_session(request)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not authenticated"
        )

    try:
        # Query user's Twitter accounts
        response = handler.supabase.table("twitter_accounts").select(
            "id, twitter_user_id, twitter_username, token_expires_at, scopes, is_active"
        ).eq("user_id", user_id).eq("is_active", True).execute()

        if not response.data:
            return OAuthStatusResponse(
                authenticated=False,
                twitter_accounts=[],
                scopes=[]
            )

        # Build response with multiple accounts
        twitter_accounts = [
            TwitterUserInfo(
                id=account["twitter_user_id"],
                username=account["twitter_username"],
                name=account["twitter_username"]  # Name not stored in DB
            )
            for account in response.data
        ]

        # Use first account's data for token expiration and scopes
        first_account = response.data[0]

        return OAuthStatusResponse(
            authenticated=True,
            twitter_accounts=twitter_accounts,
            token_expires_at=first_account["token_expires_at"],
            scopes=first_account["scopes"] or []
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check authentication status: {str(e)}"
        )


@router.post(
    "/revoke",
    response_model=OAuthRevokeResponse,
    summary="Revoke Twitter OAuth Access",
    description="Disconnect Twitter account and revoke OAuth tokens"
)
async def revoke_oauth_access(
    revoke_request: OAuthRevokeRequest,
    request: Request,
    handler: OAuthHandler = Depends(get_oauth_handler)
) -> OAuthRevokeResponse:
    """
    Revoke OAuth access and disconnect Twitter account.

    **Parameters:**
    - **twitter_account_id**: Database ID of Twitter account to disconnect

    **Returns:**
    - Success status
    - Status message

    **Note:** Requires user to be authenticated and own the Twitter account.
    """
    user_id = get_user_id_from_session(request)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not authenticated"
        )

    try:
        # Verify ownership
        response = handler.supabase.table("twitter_accounts").select("user_id").eq(
            "id", revoke_request.twitter_account_id
        ).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Twitter account not found"
            )

        account_owner_id = response.data[0]["user_id"]
        if account_owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to revoke this account"
            )

        # Revoke access
        success = await handler.revoke_access(
            account_id=revoke_request.twitter_account_id,
            user_id=user_id
        )

        if success:
            return OAuthRevokeResponse(
                success=True,
                message="Twitter account successfully disconnected"
            )
        else:
            return OAuthRevokeResponse(
                success=False,
                message="Failed to disconnect Twitter account"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revoke access: {str(e)}"
        )


@router.post(
    "/refresh/{account_id}",
    summary="Refresh Access Token",
    description="Manually refresh access token for a Twitter account (typically done automatically)"
)
async def refresh_token(
    account_id: str,
    request: Request,
    handler: OAuthHandler = Depends(get_oauth_handler)
):
    """
    Manually refresh access token.

    **Note:** Token refresh is typically handled automatically.
    This endpoint is for administrative or debugging purposes.
    """
    user_id = get_user_id_from_session(request)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not authenticated"
        )

    try:
        # Verify ownership
        response = handler.supabase.table("twitter_accounts").select("user_id").eq(
            "id", account_id
        ).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Twitter account not found"
            )

        account_owner_id = response.data[0]["user_id"]
        if account_owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to refresh this account"
            )

        # Refresh token
        success = await handler.refresh_access_token(account_id)

        return {
            "success": success,
            "message": "Token refreshed successfully" if success else "Token refresh failed"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh token: {str(e)}"
        )


# Health check endpoint
@router.get("/health", summary="Health Check", tags=["Health"])
async def health_check():
    """Check if OAuth service is healthy"""
    return {
        "status": "healthy",
        "service": "twitter-oauth",
        "version": "1.0.0"
    }
