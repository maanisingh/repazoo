"""
Repazoo Twitter OAuth 2.0 Configuration Module
Loads Twitter OAuth credentials from secure vault and manages configuration
"""

import os
import subprocess
from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class OAuthConfig(BaseSettings):
    """OAuth 2.0 Configuration for Twitter"""

    # Twitter OAuth credentials (loaded from vault)
    twitter_client_id: Optional[str] = None
    twitter_client_secret: Optional[str] = None

    # OAuth endpoints
    twitter_auth_url: str = "https://twitter.com/i/oauth2/authorize"
    twitter_token_url: str = "https://api.twitter.com/2/oauth2/token"
    twitter_revoke_url: str = "https://api.twitter.com/2/oauth2/revoke"
    twitter_user_endpoint: str = "https://api.twitter.com/2/users/me"

    # OAuth scopes required for Repazoo
    twitter_scopes: list[str] = [
        "tweet.read",
        "tweet.write",
        "users.read",
        "follows.read",
        "follows.write",
        "offline.access",  # Required for refresh tokens
        "like.read",
        "like.write"
    ]

    # Callback URLs for all Repazoo domains
    callback_urls: dict[str, str] = {
        "api": "https://api.repazoo.com/auth/twitter/callback",
        "cfy": "https://cfy.repazoo.com/auth/twitter/callback",
        "ntf": "https://ntf.repazoo.com/auth/twitter/callback",
        "ai": "https://ai.repazoo.com/auth/twitter/callback",
        "dash": "https://dash.repazoo.com/auth/twitter/callback"
    }

    # Security settings
    state_expiration_seconds: int = 600  # 10 minutes
    pkce_code_verifier_length: int = 128  # Max length per RFC 7636

    # Supabase configuration
    supabase_url: str = os.getenv("SUPABASE_URL", "http://kong:8000")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))

    # Database encryption key (for app.settings.encryption_key)
    db_encryption_key: str = os.getenv("DB_ENCRYPTION_KEY", "")

    # Vault configuration
    vault_script_path: str = "/root/.repazoo-vault/scripts/vault-get-secret.sh"
    service_name: str = "repazoo-oauth-service"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_oauth_config() -> OAuthConfig:
    """
    Get OAuth configuration singleton with credentials loaded from environment.
    Uses LRU cache to prevent repeated access.

    Returns:
        OAuthConfig: Configuration instance with Twitter credentials loaded

    Raises:
        RuntimeError: If credentials cannot be retrieved
    """
    config = OAuthConfig()

    # Load Twitter credentials from environment variables (production mode)
    if not config.twitter_client_id:
        config.twitter_client_id = os.getenv("TWITTER_CLIENT_ID")

    if not config.twitter_client_secret:
        config.twitter_client_secret = os.getenv("TWITTER_CLIENT_SECRET")

    # Fallback to vault if environment variables not set (legacy mode)
    if not config.twitter_client_id or not config.twitter_client_secret:
        try:
            if not config.twitter_client_id:
                config.twitter_client_id = _get_secret_from_vault("TWITTER_CLIENT_ID")
            if not config.twitter_client_secret:
                config.twitter_client_secret = _get_secret_from_vault("TWITTER_CLIENT_SECRET")
        except Exception as e:
            # Vault access failed, but this is okay if env vars are set
            if not config.twitter_client_id or not config.twitter_client_secret:
                raise RuntimeError(f"Failed to load Twitter credentials: {str(e)}")

    # Validate required configuration
    _validate_config(config)

    return config


def _get_secret_from_vault(secret_name: str) -> str:
    """
    Retrieve secret from Repazoo vault using vault-get-secret.sh script.

    Args:
        secret_name: Name of the secret to retrieve

    Returns:
        str: Decrypted secret value

    Raises:
        RuntimeError: If secret retrieval fails
    """
    config = OAuthConfig()

    try:
        result = subprocess.run(
            [config.vault_script_path, secret_name, config.service_name],
            capture_output=True,
            text=True,
            check=True,
            timeout=10
        )

        secret_value = result.stdout.strip()

        if not secret_value:
            raise RuntimeError(f"Empty value returned for secret: {secret_name}")

        return secret_value

    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.strip() if e.stderr else str(e)
        raise RuntimeError(
            f"Vault access denied for {secret_name}. "
            f"Service '{config.service_name}' may lack ACL permissions. "
            f"Error: {error_msg}"
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"Timeout retrieving secret {secret_name} from vault")
    except FileNotFoundError:
        raise RuntimeError(
            f"Vault script not found at {config.vault_script_path}. "
            "Ensure vault is properly installed."
        )
    except Exception as e:
        raise RuntimeError(f"Unexpected error retrieving {secret_name}: {str(e)}")


def _validate_config(config: OAuthConfig) -> None:
    """
    Validate OAuth configuration completeness.

    Args:
        config: OAuthConfig instance to validate

    Raises:
        ValueError: If configuration is invalid or incomplete
    """
    if not config.twitter_client_id:
        raise ValueError("TWITTER_CLIENT_ID not configured")

    if not config.twitter_client_secret:
        raise ValueError("TWITTER_CLIENT_SECRET not configured")

    if not config.supabase_url:
        raise ValueError("SUPABASE_URL environment variable not set")

    if not config.supabase_service_key:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable not set")

    if not config.db_encryption_key:
        raise ValueError("DB_ENCRYPTION_KEY environment variable not set")

    # Validate callback URLs
    for domain, url in config.callback_urls.items():
        if not url.startswith("https://"):
            raise ValueError(f"Callback URL for {domain} must use HTTPS: {url}")


def get_callback_url(domain: str) -> str:
    """
    Get callback URL for specified Repazoo domain.

    Args:
        domain: Domain identifier (api, cfy, ntf, ai, dash)

    Returns:
        str: Full callback URL for the domain

    Raises:
        ValueError: If domain is not recognized
    """
    config = get_oauth_config()

    if domain not in config.callback_urls:
        raise ValueError(
            f"Invalid domain: {domain}. "
            f"Valid domains: {', '.join(config.callback_urls.keys())}"
        )

    return config.callback_urls[domain]


def get_scopes_string() -> str:
    """
    Get OAuth scopes as space-separated string per OAuth 2.0 spec.

    Returns:
        str: Space-separated scope string
    """
    config = get_oauth_config()
    return " ".join(config.twitter_scopes)
