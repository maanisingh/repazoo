"""
Stripe Configuration and Tier Definitions
Manages Stripe API keys, product configuration, and subscription tiers
"""

import os
from enum import Enum
from typing import Dict, Any
from pydantic import BaseModel, Field


class Environment(str, Enum):
    """Deployment environment types"""
    CFY = "cfy"  # Test/Development environment
    AI = "ai"   # Production environment


class TierDefinition(BaseModel):
    """Subscription tier configuration"""
    name: str = Field(..., description="Tier name (basic, pro)")
    display_name: str = Field(..., description="Human-readable tier name")
    price_usd: int = Field(..., description="Price in USD (monthly)")
    ai_model: str = Field(..., description="AI model for tier (sonnet, opus)")
    monthly_quota: int = Field(..., description="API requests per month")
    stripe_price_id_cfy: str | None = Field(None, description="Stripe Price ID for CFY environment")
    stripe_price_id_ai: str | None = Field(None, description="Stripe Price ID for AI environment")
    stripe_product_id: str | None = Field(None, description="Stripe Product ID")


# Tier Configuration
TIER_CONFIG: Dict[str, TierDefinition] = {
    "basic": TierDefinition(
        name="basic",
        display_name="Basic Tier",
        price_usd=9,
        ai_model="sonnet",
        monthly_quota=1000,
        stripe_price_id_cfy=None,  # Set after Stripe product creation
        stripe_price_id_ai=None,
        stripe_product_id=None,
    ),
    "pro": TierDefinition(
        name="pro",
        display_name="Pro Tier",
        price_usd=29,
        ai_model="opus",
        monthly_quota=10000,
        stripe_price_id_cfy=None,  # Set after Stripe product creation
        stripe_price_id_ai=None,
        stripe_product_id=None,
    ),
}


class StripeConfig:
    """
    Stripe API Configuration
    Loads Stripe keys from environment variables with environment-aware switching
    """

    def __init__(self):
        self.environment = self._detect_environment()
        self._load_keys()

    def _detect_environment(self) -> Environment:
        """Detect current deployment environment"""
        env = os.getenv("REPAZOO_ENV", "cfy").lower()
        if env == "ai":
            return Environment.AI
        return Environment.CFY

    def _load_keys(self):
        """Load Stripe API keys based on environment"""
        if self.environment == Environment.CFY:
            # Test environment - use Stripe test keys
            self.api_key = os.getenv("STRIPE_TEST_SECRET_KEY")
            self.publishable_key = os.getenv("STRIPE_TEST_PUBLISHABLE_KEY")
            self.webhook_secret = os.getenv("STRIPE_TEST_WEBHOOK_SECRET")
        else:
            # Production environment - use Stripe live keys
            self.api_key = os.getenv("STRIPE_LIVE_SECRET_KEY")
            self.publishable_key = os.getenv("STRIPE_LIVE_PUBLISHABLE_KEY")
            self.webhook_secret = os.getenv("STRIPE_LIVE_WEBHOOK_SECRET")

        # Validate required keys are present
        if not self.api_key:
            raise ValueError(
                f"Missing Stripe API key for {self.environment.value} environment. "
                f"Set STRIPE_{'TEST' if self.environment == Environment.CFY else 'LIVE'}_SECRET_KEY"
            )

        if not self.webhook_secret:
            raise ValueError(
                f"Missing Stripe webhook secret for {self.environment.value} environment. "
                f"Set STRIPE_{'TEST' if self.environment == Environment.CFY else 'LIVE'}_WEBHOOK_SECRET"
            )

    @property
    def is_test_mode(self) -> bool:
        """Check if running in test mode"""
        return self.environment == Environment.CFY

    def get_price_id(self, tier: str) -> str | None:
        """Get Stripe Price ID for tier based on current environment"""
        tier_config = TIER_CONFIG.get(tier)
        if not tier_config:
            return None

        if self.environment == Environment.CFY:
            return tier_config.stripe_price_id_cfy
        else:
            return tier_config.stripe_price_id_ai

    def get_tier_config(self, tier: str) -> TierDefinition | None:
        """Get tier configuration"""
        return TIER_CONFIG.get(tier)

    def get_all_tiers(self) -> Dict[str, TierDefinition]:
        """Get all available subscription tiers"""
        return TIER_CONFIG


# Webhook endpoint configuration
WEBHOOK_ENDPOINT = "/webhooks/stripe"
WEBHOOK_DOMAIN = "ntf.repazoo.com"
WEBHOOK_FULL_URL = f"https://{WEBHOOK_DOMAIN}{WEBHOOK_ENDPOINT}"

# Stripe webhook events to handle
WEBHOOK_EVENTS = [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
]

# Grace period configuration
GRACE_PERIOD_DAYS = 3  # Days to maintain access after payment failure

# Subscription configuration
TRIAL_PERIOD_DAYS = 0  # No trial period by default
CANCEL_AT_PERIOD_END = True  # Default behavior for cancellations

# Currency configuration
DEFAULT_CURRENCY = "usd"

# Retry configuration for failed payments
PAYMENT_RETRY_MAX_ATTEMPTS = 3
PAYMENT_RETRY_EXPONENTIAL_BACKOFF = True
