"""
Repazoo SaaS Configuration Module
Environment-aware configuration with vault integration
"""

import os
import json
from enum import Enum
from pathlib import Path
from typing import Optional, Dict, Any
from pydantic_settings import BaseSettings
from pydantic import Field, validator


class Environment(str, Enum):
    """Deployment environments"""
    CFY = "cfy"  # Development
    NTF = "ntf"  # Staging
    AI = "ai"    # Production
    LOCAL = "local"  # Local development


class VaultConfig:
    """Secrets vault configuration and access"""

    VAULT_PATH = Path("/root/.repazoo-vault")
    SECRETS_PATH = VAULT_PATH / "secrets"

    @classmethod
    def load_secret(cls, secret_name: str) -> Dict[str, Any]:
        """
        Load and decrypt secret from vault

        Args:
            secret_name: Name of secret file (without .json.age extension)

        Returns:
            Decrypted secret data as dictionary
        """
        secret_file = cls.SECRETS_PATH / f"{secret_name}.json.age"

        if not secret_file.exists():
            raise FileNotFoundError(f"Secret not found: {secret_name}")

        # For production, implement age decryption
        # For now, return from environment variables as fallback
        # TODO: Implement actual age decryption

        # Fallback to environment variables
        if secret_name == "supabase-credentials":
            return {
                "url": os.getenv("SUPABASE_URL"),
                "service_key": os.getenv("SUPABASE_SERVICE_KEY"),
                "anon_key": os.getenv("SUPABASE_ANON_KEY")
            }
        elif secret_name == "stripe-credentials":
            return {
                "secret_key": os.getenv("STRIPE_SECRET_KEY"),
                "webhook_secret": os.getenv("STRIPE_WEBHOOK_SECRET"),
                "publishable_key": os.getenv("STRIPE_PUBLISHABLE_KEY")
            }
        elif secret_name == "twitter-credentials":
            return {
                "client_id": os.getenv("TWITTER_CLIENT_ID"),
                "client_secret": os.getenv("TWITTER_CLIENT_SECRET")
            }
        elif secret_name == "anthropic-credentials":
            return {
                "api_key": os.getenv("ANTHROPIC_API_KEY")
            }

        return {}


class Settings(BaseSettings):
    """
    Global application settings
    Loads from environment variables and vault
    """

    # ========================================================================
    # Environment Configuration
    # ========================================================================
    environment: Environment = Field(
        default=Environment.LOCAL,
        description="Deployment environment"
    )
    debug: bool = Field(default=False, description="Debug mode")
    log_level: str = Field(default="INFO", description="Logging level")

    # ========================================================================
    # API Configuration
    # ========================================================================
    api_title: str = "Repazoo SaaS API"
    api_version: str = "1.0.0"
    api_description: str = "Twitter Reputation Analysis Platform"

    # CORS Configuration
    cors_origins: list = Field(
        default=[
            "https://dash.repazoo.com",
            "https://cfy.repazoo.com",
            "https://ntf.repazoo.com",
            "https://ai.repazoo.com",
            "http://localhost:3000",  # Local Appsmith
            "http://localhost:8000",  # Local API
        ],
        description="Allowed CORS origins"
    )
    cors_allow_credentials: bool = True
    cors_allow_methods: list = Field(default=["*"])
    cors_allow_headers: list = Field(default=["*"])

    # ========================================================================
    # Database Configuration (Supabase)
    # ========================================================================
    supabase_url: Optional[str] = Field(default=None, env="SUPABASE_URL")
    supabase_service_key: Optional[str] = Field(default=None, env="SUPABASE_SERVICE_KEY")
    supabase_anon_key: Optional[str] = Field(default=None, env="SUPABASE_ANON_KEY")

    # Database connection pool
    db_pool_size: int = Field(default=10, description="Database connection pool size")
    db_max_overflow: int = Field(default=20, description="Max overflow connections")
    db_pool_timeout: int = Field(default=30, description="Connection timeout (seconds)")

    # ========================================================================
    # Redis Configuration (Rate Limiting & Caching)
    # ========================================================================
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        env="REDIS_URL",
        description="Redis connection URL"
    )
    redis_max_connections: int = Field(default=50)

    # ========================================================================
    # Authentication Configuration
    # ========================================================================
    jwt_secret_key: str = Field(
        default="change-me-in-production",
        env="JWT_SECRET_KEY"
    )
    jwt_algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=30)
    refresh_token_expire_days: int = Field(default=7)

    # ========================================================================
    # Twitter OAuth Configuration
    # ========================================================================
    twitter_client_id: Optional[str] = Field(default=None, env="TWITTER_CLIENT_ID")
    twitter_client_secret: Optional[str] = Field(default=None, env="TWITTER_CLIENT_SECRET")
    twitter_callback_base_url: str = Field(
        default="https://api.repazoo.com/auth/twitter/callback",
        description="OAuth callback base URL"
    )

    # ========================================================================
    # Stripe Configuration
    # ========================================================================
    stripe_secret_key: Optional[str] = Field(default=None, env="STRIPE_SECRET_KEY")
    stripe_webhook_secret: Optional[str] = Field(default=None, env="STRIPE_WEBHOOK_SECRET")
    stripe_publishable_key: Optional[str] = Field(default=None, env="STRIPE_PUBLISHABLE_KEY")

    # Stripe Price IDs (environment-specific)
    stripe_basic_price_id: str = Field(
        default="price_basic_test",
        env="STRIPE_BASIC_PRICE_ID"
    )
    stripe_pro_price_id: str = Field(
        default="price_pro_test",
        env="STRIPE_PRO_PRICE_ID"
    )

    # ========================================================================
    # Anthropic AI Configuration
    # ========================================================================
    anthropic_api_key: Optional[str] = Field(default=None, env="ANTHROPIC_API_KEY")
    anthropic_haiku_model: str = Field(default="claude-3-haiku-20240307")
    anthropic_sonnet_model: str = Field(default="claude-3-5-sonnet-20241022")

    # ========================================================================
    # Rate Limiting Configuration
    # ========================================================================
    rate_limit_per_minute: int = Field(default=60, description="API calls per minute")
    rate_limit_per_hour: int = Field(default=1000, description="API calls per hour")

    # Tier-based limits
    basic_tier_monthly_quota: int = Field(default=1000)
    pro_tier_monthly_quota: int = Field(default=10000)

    # ========================================================================
    # Security Configuration
    # ========================================================================
    encryption_key: Optional[str] = Field(default=None, env="ENCRYPTION_KEY")
    allowed_hosts: list = Field(
        default=["repazoo.com", "*.repazoo.com", "localhost"]
    )

    # ========================================================================
    # Monitoring & Logging
    # ========================================================================
    sentry_dsn: Optional[str] = Field(default=None, env="SENTRY_DSN")
    enable_request_logging: bool = Field(default=True)
    enable_performance_monitoring: bool = Field(default=True)

    # ========================================================================
    # N8N Workflow Configuration
    # ========================================================================
    n8n_webhook_url: str = Field(
        default="http://repazoo-n8n:5678",
        env="N8N_WEBHOOK_URL",
        description="N8N webhook base URL"
    )

    # ========================================================================
    # Worker Configuration
    # ========================================================================
    celery_broker_url: str = Field(
        default="redis://localhost:6379/1",
        env="CELERY_BROKER_URL"
    )
    celery_result_backend: str = Field(
        default="redis://localhost:6379/2",
        env="CELERY_RESULT_BACKEND"
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    @validator("environment", pre=True)
    def parse_environment(cls, v):
        """Parse environment from string"""
        if isinstance(v, str):
            return Environment(v.lower())
        return v

    def load_vault_secrets(self):
        """Load secrets from vault into configuration"""
        try:
            # Load Supabase credentials
            if not self.supabase_url:
                supabase_creds = VaultConfig.load_secret("supabase-credentials")
                self.supabase_url = supabase_creds.get("url")
                self.supabase_service_key = supabase_creds.get("service_key")
                self.supabase_anon_key = supabase_creds.get("anon_key")

            # Load Stripe credentials
            if not self.stripe_secret_key:
                stripe_creds = VaultConfig.load_secret("stripe-credentials")
                self.stripe_secret_key = stripe_creds.get("secret_key")
                self.stripe_webhook_secret = stripe_creds.get("webhook_secret")
                self.stripe_publishable_key = stripe_creds.get("publishable_key")

            # Load Twitter credentials
            if not self.twitter_client_id:
                twitter_creds = VaultConfig.load_secret("twitter-credentials")
                self.twitter_client_id = twitter_creds.get("client_id")
                self.twitter_client_secret = twitter_creds.get("client_secret")

            # Load Anthropic credentials
            if not self.anthropic_api_key:
                anthropic_creds = VaultConfig.load_secret("anthropic-credentials")
                self.anthropic_api_key = anthropic_creds.get("api_key")

        except Exception as e:
            # Log warning but don't fail - allow env vars to work
            print(f"Warning: Failed to load vault secrets: {e}")

    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.environment == Environment.AI

    @property
    def is_staging(self) -> bool:
        """Check if running in staging"""
        return self.environment == Environment.NTF

    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.environment == Environment.CFY

    @property
    def is_local(self) -> bool:
        """Check if running locally"""
        return self.environment == Environment.LOCAL

    def get_callback_url(self, domain: str = "api") -> str:
        """Get OAuth callback URL for environment"""
        if self.is_local:
            return f"http://localhost:8000/auth/twitter/callback"

        env_prefix = self.environment.value if not self.is_production else ""
        domain_url = f"https://{env_prefix}.repazoo.com" if env_prefix else "https://repazoo.com"

        return f"{domain_url}/auth/twitter/callback"


# ============================================================================
# Global Settings Instance
# ============================================================================

settings = Settings()

# Load vault secrets on initialization
settings.load_vault_secrets()


# ============================================================================
# Environment Detection Helper
# ============================================================================

def get_environment() -> Environment:
    """
    Detect current environment from various sources
    Priority: ENV var > hostname > default
    """
    # Check environment variable
    env_var = os.getenv("REPAZOO_ENV", os.getenv("ENVIRONMENT", "local"))

    # Check hostname
    hostname = os.getenv("HOSTNAME", "")

    if "ai.repazoo.com" in hostname or env_var.lower() == "ai":
        return Environment.AI
    elif "ntf.repazoo.com" in hostname or env_var.lower() == "ntf":
        return Environment.NTF
    elif "cfy.repazoo.com" in hostname or env_var.lower() == "cfy":
        return Environment.CFY

    return Environment.LOCAL


# ============================================================================
# Tier Configuration
# ============================================================================

class TierLimits:
    """Subscription tier limits and features"""

    BASIC = {
        "name": "Basic",
        "price_monthly": 9,
        "monthly_quota": 1000,
        "ai_model": "claude-3-haiku-20240307",
        "features": [
            "1,000 analyses per month",
            "Claude 3 Haiku AI model",
            "Basic reporting",
            "Email support"
        ]
    }

    PRO = {
        "name": "Pro",
        "price_monthly": 29,
        "monthly_quota": 10000,
        "ai_model": "claude-3-5-sonnet-20241022",
        "features": [
            "10,000 analyses per month",
            "Claude 3.5 Sonnet AI model",
            "Advanced reporting",
            "Priority support",
            "Custom webhooks",
            "API access"
        ]
    }

    @classmethod
    def get_tier_config(cls, tier: str) -> dict:
        """Get configuration for tier"""
        return getattr(cls, tier.upper(), cls.BASIC)

    @classmethod
    def get_monthly_quota(cls, tier: str) -> int:
        """Get monthly quota for tier"""
        return cls.get_tier_config(tier).get("monthly_quota", 1000)

    @classmethod
    def get_ai_model(cls, tier: str) -> str:
        """Get AI model for tier"""
        return cls.get_tier_config(tier).get("ai_model", "claude-3-haiku-20240307")


# ============================================================================
# Export configuration
# ============================================================================

__all__ = [
    "settings",
    "Settings",
    "Environment",
    "VaultConfig",
    "TierLimits",
    "get_environment"
]
