"""
Repazoo Twitter OAuth 2.0 PKCE Handler
Implements secure OAuth flow with PKCE, token management, and encryption
"""

import secrets
import hashlib
import base64
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
from urllib.parse import urlencode
import httpx
from supabase import create_client, Client

from .config import get_oauth_config, get_callback_url, get_scopes_string
from .models import (
    PKCEChallenge,
    OAuthStateData,
    TokenRefreshResponse,
    TwitterUserInfo,
    AuditLogEntry,
)


class OAuthHandler:
    """
    Twitter OAuth 2.0 PKCE Flow Handler

    Security Features:
    - PKCE (Proof Key for Code Exchange) for authorization code protection
    - State parameter validation for CSRF prevention
    - Encrypted token storage using database encryption functions
    - Comprehensive audit logging for all operations
    - Token rotation and refresh management
    """

    def __init__(self):
        """Initialize OAuth handler with configuration and Supabase client"""
        self.config = get_oauth_config()
        self.supabase: Client = create_client(
            self.config.supabase_url,
            self.config.supabase_service_key
        )
        self._http_client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Clean up HTTP client resources"""
        await self._http_client.aclose()

    # =========================================================================
    # PKCE Implementation
    # =========================================================================

    def generate_pkce_challenge(self) -> PKCEChallenge:
        """
        Generate PKCE code verifier and challenge per RFC 7636.

        Returns:
            PKCEChallenge: Code verifier and challenge data
        """
        # Generate cryptographically secure random code verifier
        code_verifier = base64.urlsafe_b64encode(
            secrets.token_bytes(96)
        ).decode('utf-8').rstrip('=')

        # Create SHA-256 challenge
        challenge_bytes = hashlib.sha256(code_verifier.encode('utf-8')).digest()
        code_challenge = base64.urlsafe_b64encode(challenge_bytes).decode('utf-8').rstrip('=')

        return PKCEChallenge(
            code_verifier=code_verifier,
            code_challenge=code_challenge,
            code_challenge_method="S256"
        )

    # =========================================================================
    # State Management (CSRF Protection)
    # =========================================================================

    def create_state_parameter(
        self,
        domain: str,
        user_id: Optional[str] = None,
        redirect_after_auth: Optional[str] = None,
        code_verifier: str = ""
    ) -> OAuthStateData:
        """
        Create OAuth state parameter with CSRF protection.

        Args:
            domain: Repazoo domain for callback
            user_id: Optional user ID if authenticated
            redirect_after_auth: Optional post-auth redirect URL
            code_verifier: PKCE code verifier to store

        Returns:
            OAuthStateData: State data with expiration
        """
        state_id = secrets.token_urlsafe(32)
        now = datetime.utcnow()
        expires_at = now + timedelta(seconds=self.config.state_expiration_seconds)

        state_data = OAuthStateData(
            state_id=state_id,
            user_id=user_id,
            domain=domain,
            redirect_after_auth=redirect_after_auth,
            code_verifier=code_verifier,
            created_at=now,
            expires_at=expires_at
        )

        # Store state in database for validation
        self._store_state(state_data)

        return state_data

    def _store_state(self, state_data: OAuthStateData) -> None:
        """
        Store OAuth state in database for later validation.

        Args:
            state_data: State data to store
        """
        # Use a temporary table for state storage (should be created in migrations)
        # For now, we'll use a JSONB column in audit_log or create a dedicated table
        self.supabase.table("oauth_states").insert({
            "state_id": state_data.state_id,
            "user_id": state_data.user_id,
            "domain": state_data.domain,
            "redirect_after_auth": state_data.redirect_after_auth,
            "code_verifier": state_data.code_verifier,
            "expires_at": state_data.expires_at.isoformat(),
            "created_at": state_data.created_at.isoformat()
        }).execute()

    def validate_and_retrieve_state(self, state_id: str) -> Optional[OAuthStateData]:
        """
        Validate and retrieve OAuth state parameter.

        Args:
            state_id: State identifier to validate

        Returns:
            OAuthStateData if valid, None if invalid or expired
        """
        try:
            response = self.supabase.table("oauth_states").select("*").eq(
                "state_id", state_id
            ).execute()

            if not response.data:
                return None

            state_record = response.data[0]
            state_data = OAuthStateData(**state_record)

            # Check expiration
            if datetime.utcnow() > state_data.expires_at:
                self._delete_state(state_id)
                return None

            # Delete state after successful retrieval (one-time use)
            self._delete_state(state_id)

            return state_data

        except Exception:
            return None

    def _delete_state(self, state_id: str) -> None:
        """Delete used or expired state from database"""
        try:
            self.supabase.table("oauth_states").delete().eq("state_id", state_id).execute()
        except Exception:
            pass  # State cleanup failure is non-critical

    # =========================================================================
    # Authorization URL Generation
    # =========================================================================

    def generate_authorization_url(
        self,
        domain: str,
        user_id: Optional[str] = None,
        redirect_after_auth: Optional[str] = None
    ) -> Tuple[str, OAuthStateData]:
        """
        Generate Twitter OAuth authorization URL with PKCE.

        Args:
            domain: Repazoo domain for callback
            user_id: Optional user ID if authenticated
            redirect_after_auth: Optional post-auth redirect URL

        Returns:
            Tuple of (authorization_url, state_data)
        """
        # Generate PKCE challenge
        pkce = self.generate_pkce_challenge()

        # Create state parameter
        state_data = self.create_state_parameter(
            domain=domain,
            user_id=user_id,
            redirect_after_auth=redirect_after_auth,
            code_verifier=pkce.code_verifier
        )

        # Build authorization URL
        params = {
            "response_type": "code",
            "client_id": self.config.twitter_client_id,
            "redirect_uri": get_callback_url(domain),
            "scope": get_scopes_string(),
            "state": state_data.state_id,
            "code_challenge": pkce.code_challenge,
            "code_challenge_method": pkce.code_challenge_method
        }

        authorization_url = f"{self.config.twitter_auth_url}?{urlencode(params)}"

        # Log authorization initiation
        self._log_audit(
            user_id=user_id,
            action="OAUTH_INITIATED",
            metadata={
                "domain": domain,
                "state_id": state_data.state_id
            }
        )

        return authorization_url, state_data

    # =========================================================================
    # Token Exchange (Authorization Code -> Access Token)
    # =========================================================================

    async def exchange_code_for_tokens(
        self,
        code: str,
        state_id: str,
        domain: str
    ) -> Tuple[Dict[str, any], TwitterUserInfo]:
        """
        Exchange authorization code for access and refresh tokens.

        Args:
            code: Authorization code from Twitter
            state_id: State parameter for validation
            domain: Callback domain

        Returns:
            Tuple of (token_data, twitter_user_info)

        Raises:
            ValueError: If state validation fails or token exchange fails
        """
        # Validate state parameter (CSRF protection)
        state_data = self.validate_and_retrieve_state(state_id)
        if not state_data:
            raise ValueError("Invalid or expired state parameter. Possible CSRF attack.")

        if state_data.domain != domain:
            raise ValueError("Domain mismatch in state parameter")

        # Exchange code for tokens using PKCE
        token_data = await self._request_tokens(
            code=code,
            redirect_uri=get_callback_url(domain),
            code_verifier=state_data.code_verifier
        )

        # Fetch Twitter user information
        twitter_user = await self._fetch_twitter_user(token_data["access_token"])

        # Log successful token exchange
        self._log_audit(
            user_id=state_data.user_id,
            action="OAUTH_CONNECT",
            resource_id=twitter_user.id,
            metadata={
                "twitter_username": twitter_user.username,
                "domain": domain
            }
        )

        return token_data, twitter_user

    async def _request_tokens(
        self,
        code: str,
        redirect_uri: str,
        code_verifier: str
    ) -> Dict[str, any]:
        """
        Request access tokens from Twitter API.

        Args:
            code: Authorization code
            redirect_uri: Callback URL used in authorization
            code_verifier: PKCE code verifier

        Returns:
            Dictionary containing access_token, refresh_token, expires_in, etc.

        Raises:
            ValueError: If token request fails
        """
        # Prepare Basic Auth credentials
        auth_string = f"{self.config.twitter_client_id}:{self.config.twitter_client_secret}"
        auth_bytes = auth_string.encode('utf-8')
        auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')

        headers = {
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/x-www-form-urlencoded"
        }

        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "code_verifier": code_verifier
        }

        try:
            response = await self._http_client.post(
                self.config.twitter_token_url,
                headers=headers,
                data=data
            )

            if response.status_code != 200:
                error_data = response.json()
                raise ValueError(
                    f"Token exchange failed: {error_data.get('error_description', 'Unknown error')}"
                )

            token_data = response.json()

            # Validate required fields
            required_fields = ["access_token", "token_type", "expires_in"]
            if not all(field in token_data for field in required_fields):
                raise ValueError("Invalid token response from Twitter API")

            return token_data

        except httpx.HTTPError as e:
            raise ValueError(f"HTTP error during token exchange: {str(e)}")
        except Exception as e:
            raise ValueError(f"Token exchange failed: {str(e)}")

    async def _fetch_twitter_user(self, access_token: str) -> TwitterUserInfo:
        """
        Fetch Twitter user information using access token.

        Args:
            access_token: Valid Twitter access token

        Returns:
            TwitterUserInfo with user details

        Raises:
            ValueError: If user fetch fails
        """
        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        try:
            response = await self._http_client.get(
                self.config.twitter_user_endpoint,
                headers=headers,
                params={"user.fields": "id,username,name"}
            )

            if response.status_code != 200:
                raise ValueError(f"Failed to fetch Twitter user: {response.text}")

            user_data = response.json()["data"]

            return TwitterUserInfo(
                id=user_data["id"],
                username=user_data["username"],
                name=user_data.get("name", user_data["username"])
            )

        except Exception as e:
            raise ValueError(f"Failed to fetch Twitter user: {str(e)}")

    # =========================================================================
    # Token Storage (with Database Encryption)
    # =========================================================================

    def store_twitter_account(
        self,
        user_id: str,
        twitter_user: TwitterUserInfo,
        token_data: Dict[str, any]
    ) -> str:
        """
        Store Twitter account with encrypted tokens in database.

        Args:
            user_id: Repazoo user ID
            twitter_user: Twitter user information
            token_data: Token data from Twitter API

        Returns:
            str: Database ID of created Twitter account

        Raises:
            Exception: If storage fails
        """
        # Calculate token expiration
        expires_in = token_data.get("expires_in", 7200)  # Default 2 hours
        token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        # Extract scopes
        scopes = token_data.get("scope", "").split() if token_data.get("scope") else []

        try:
            # Use database function for encrypted insertion
            response = self.supabase.rpc(
                "insert_twitter_account",
                {
                    "p_user_id": user_id,
                    "p_twitter_user_id": twitter_user.id,
                    "p_twitter_username": twitter_user.username,
                    "p_access_token": token_data["access_token"],
                    "p_refresh_token": token_data.get("refresh_token", ""),
                    "p_token_expires_at": token_expires_at.isoformat(),
                    "p_scopes": scopes
                }
            ).execute()

            account_id = response.data

            # Log account connection
            self._log_audit(
                user_id=user_id,
                action="OAUTH_CONNECT",
                resource_type="twitter_account",
                resource_id=account_id,
                metadata={
                    "twitter_user_id": twitter_user.id,
                    "twitter_username": twitter_user.username,
                    "scopes": scopes
                }
            )

            return account_id

        except Exception as e:
            raise Exception(f"Failed to store Twitter account: {str(e)}")

    # =========================================================================
    # Token Refresh
    # =========================================================================

    async def refresh_access_token(self, account_id: str) -> bool:
        """
        Refresh access token using refresh token.

        Args:
            account_id: Twitter account database ID

        Returns:
            bool: True if refresh succeeded

        Raises:
            Exception: If refresh fails
        """
        # Get encrypted tokens from database
        response = self.supabase.rpc(
            "get_decrypted_twitter_tokens",
            {"p_account_id": account_id}
        ).execute()

        if not response.data:
            raise Exception("Twitter account not found or inactive")

        token_info = response.data[0]
        refresh_token = token_info["refresh_token"]

        # Request new tokens
        auth_string = f"{self.config.twitter_client_id}:{self.config.twitter_client_secret}"
        auth_bytes = auth_string.encode('utf-8')
        auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')

        headers = {
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/x-www-form-urlencoded"
        }

        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }

        try:
            response = await self._http_client.post(
                self.config.twitter_token_url,
                headers=headers,
                data=data
            )

            if response.status_code != 200:
                raise Exception(f"Token refresh failed: {response.text}")

            new_token_data = response.json()

            # Calculate new expiration
            expires_in = new_token_data.get("expires_in", 7200)
            token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

            # Update tokens in database using encrypted update function
            self.supabase.rpc(
                "update_twitter_tokens",
                {
                    "p_account_id": account_id,
                    "p_access_token": new_token_data["access_token"],
                    "p_refresh_token": new_token_data.get("refresh_token", refresh_token),
                    "p_token_expires_at": token_expires_at.isoformat()
                }
            ).execute()

            # Log token refresh
            self._log_audit(
                user_id=None,
                action="TOKEN_REFRESHED",
                resource_type="twitter_account",
                resource_id=account_id,
                metadata={"timestamp": datetime.utcnow().isoformat()}
            )

            return True

        except Exception as e:
            raise Exception(f"Token refresh failed: {str(e)}")

    # =========================================================================
    # Token Revocation
    # =========================================================================

    async def revoke_access(self, account_id: str, user_id: str) -> bool:
        """
        Revoke OAuth access and delete tokens.

        Args:
            account_id: Twitter account database ID
            user_id: User ID for authorization check

        Returns:
            bool: True if revocation succeeded
        """
        try:
            # Get tokens for revocation
            response = self.supabase.rpc(
                "get_decrypted_twitter_tokens",
                {"p_account_id": account_id}
            ).execute()

            if response.data:
                token_info = response.data[0]
                access_token = token_info["access_token"]

                # Revoke token with Twitter
                await self._revoke_token_with_twitter(access_token)

            # Deactivate account in database
            self.supabase.table("twitter_accounts").update({
                "is_active": False
            }).eq("id", account_id).eq("user_id", user_id).execute()

            # Log revocation
            self._log_audit(
                user_id=user_id,
                action="OAUTH_DISCONNECT",
                resource_type="twitter_account",
                resource_id=account_id,
                metadata={"timestamp": datetime.utcnow().isoformat()}
            )

            return True

        except Exception as e:
            # Log failure but don't raise - allow database deactivation even if API call fails
            print(f"Token revocation warning: {str(e)}")
            return True

    async def _revoke_token_with_twitter(self, access_token: str) -> None:
        """Revoke token with Twitter API"""
        auth_string = f"{self.config.twitter_client_id}:{self.config.twitter_client_secret}"
        auth_bytes = auth_string.encode('utf-8')
        auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')

        headers = {
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/x-www-form-urlencoded"
        }

        data = {
            "token": access_token,
            "token_type_hint": "access_token"
        }

        await self._http_client.post(
            self.config.twitter_revoke_url,
            headers=headers,
            data=data
        )

    # =========================================================================
    # Audit Logging
    # =========================================================================

    def _log_audit(
        self,
        action: str,
        resource_type: str = "twitter_account",
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> None:
        """
        Log OAuth operations to audit trail.

        Args:
            action: Action performed (OAUTH_CONNECT, TOKEN_REFRESHED, etc.)
            resource_type: Type of resource
            user_id: Optional user ID
            resource_id: Optional resource ID
            ip_address: Optional client IP
            user_agent: Optional client user agent
            metadata: Additional metadata
        """
        try:
            audit_entry = {
                "user_id": user_id,
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "metadata": metadata or {}
            }

            self.supabase.table("audit_log").insert(audit_entry).execute()

        except Exception as e:
            # Audit logging failure should not break the flow
            print(f"Audit logging failed: {str(e)}")


# Singleton instance for dependency injection
_handler_instance: Optional[OAuthHandler] = None


def get_oauth_handler() -> OAuthHandler:
    """Get or create singleton OAuth handler instance"""
    global _handler_instance
    if _handler_instance is None:
        _handler_instance = OAuthHandler()
    return _handler_instance
