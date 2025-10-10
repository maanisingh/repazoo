"""
AI Configuration Module
Model configuration, tier routing, and analysis settings
"""

from typing import Dict, Any
from enum import Enum
from config import settings


class AIModel(str, Enum):
    """Available AI models"""
    # Claude 3 Family
    HAIKU = "claude-3-haiku-20240307"
    SONNET_35 = "claude-3-5-sonnet-20241022"
    OPUS_35 = "claude-3-5-opus-20241022"

    # Legacy support
    SONNET = "claude-3-sonnet-20240229"
    OPUS = "claude-3-opus-20240229"


class SubscriptionTier(str, Enum):
    """Subscription tiers"""
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"


# ============================================================================
# Tier to Model Mapping
# ============================================================================

TIER_MODEL_MAP: Dict[SubscriptionTier, AIModel] = {
    SubscriptionTier.FREE: AIModel.HAIKU,
    SubscriptionTier.BASIC: AIModel.SONNET_35,
    SubscriptionTier.PRO: AIModel.OPUS_35,
    SubscriptionTier.ENTERPRISE: AIModel.OPUS_35,
}


# ============================================================================
# Model Configuration
# ============================================================================

MODEL_CONFIG: Dict[AIModel, Dict[str, Any]] = {
    AIModel.HAIKU: {
        "max_tokens": 4096,
        "temperature": 0.7,
        "top_p": 0.9,
        "cost_per_1k_input": 0.00025,
        "cost_per_1k_output": 0.00125,
        "timeout": 30,
        "max_retries": 2,
    },
    AIModel.SONNET_35: {
        "max_tokens": 8192,
        "temperature": 0.7,
        "top_p": 0.9,
        "cost_per_1k_input": 0.003,
        "cost_per_1k_output": 0.015,
        "timeout": 60,
        "max_retries": 3,
    },
    AIModel.OPUS_35: {
        "max_tokens": 8192,
        "temperature": 0.7,
        "top_p": 0.9,
        "cost_per_1k_input": 0.015,
        "cost_per_1k_output": 0.075,
        "timeout": 90,
        "max_retries": 3,
    },
}


# ============================================================================
# Analysis Configuration
# ============================================================================

class AnalysisConfig:
    """Configuration for analysis parameters"""

    # Data limits
    MAX_TWEETS_TO_ANALYZE = 200
    MAX_TWEET_LENGTH = 500  # Characters per tweet
    MIN_TWEETS_REQUIRED = 10

    # Time ranges
    DEFAULT_ANALYSIS_DAYS = 30
    MAX_ANALYSIS_DAYS = 90

    # Confidence thresholds
    MIN_CONFIDENCE_THRESHOLD = 0.6
    HIGH_CONFIDENCE_THRESHOLD = 0.85

    # Risk thresholds
    LOW_RISK_THRESHOLD = 30.0
    MEDIUM_RISK_THRESHOLD = 60.0
    HIGH_RISK_THRESHOLD = 85.0

    # Bias thresholds
    STRONG_BIAS_THRESHOLD = 0.7
    MODERATE_BIAS_THRESHOLD = 0.4

    # Processing
    BATCH_SIZE = 50
    MAX_PARALLEL_ANALYSES = 5
    ANALYSIS_CACHE_TTL = 3600  # 1 hour

    # Retry configuration
    MAX_RETRIES = 3
    RETRY_DELAY = 2  # seconds
    EXPONENTIAL_BACKOFF = True


# ============================================================================
# Purpose-Specific Configuration
# ============================================================================

PURPOSE_CONFIG: Dict[str, Dict[str, Any]] = {
    "job_search": {
        "focus_areas": [
            "professional_tone",
            "controversial_content",
            "brand_safety",
            "skill_endorsements"
        ],
        "weight_risk": 1.5,  # Higher weight on risk detection
        "weight_sentiment": 1.2,
        "weight_engagement": 0.8,
        "critical_flags": [
            "hate_speech",
            "extremism",
            "professional_conduct"
        ]
    },
    "visa_application": {
        "focus_areas": [
            "geopolitical_alignment",
            "extremism",
            "controversial_associations",
            "misinformation"
        ],
        "weight_risk": 2.0,  # Highest weight on risk
        "weight_sentiment": 1.0,
        "weight_engagement": 0.5,
        "critical_flags": [
            "extremism",
            "hate_speech",
            "geopolitical",
            "misinformation"
        ]
    },
    "brand_building": {
        "focus_areas": [
            "engagement_patterns",
            "content_themes",
            "audience_sentiment",
            "brand_safety"
        ],
        "weight_risk": 1.0,
        "weight_sentiment": 1.5,
        "weight_engagement": 2.0,  # Highest weight on engagement
        "critical_flags": [
            "brand_safety",
            "controversial_topics"
        ]
    },
    "political_campaign": {
        "focus_areas": [
            "political_bias",
            "controversial_topics",
            "public_sentiment",
            "engagement_patterns"
        ],
        "weight_risk": 1.2,
        "weight_sentiment": 1.5,
        "weight_engagement": 1.5,
        "critical_flags": [
            "misinformation",
            "hate_speech",
            "controversial_topics"
        ]
    },
    "security_clearance": {
        "focus_areas": [
            "extremism",
            "foreign_associations",
            "controversial_content",
            "misinformation"
        ],
        "weight_risk": 2.5,  # Extreme weight on risk
        "weight_sentiment": 1.0,
        "weight_engagement": 0.3,
        "critical_flags": [
            "extremism",
            "hate_speech",
            "geopolitical",
            "misinformation",
            "controversial_topics"
        ]
    },
    "personal_reputation": {
        "focus_areas": [
            "overall_sentiment",
            "brand_safety",
            "controversial_topics",
            "engagement_patterns"
        ],
        "weight_risk": 1.3,
        "weight_sentiment": 1.5,
        "weight_engagement": 1.2,
        "critical_flags": [
            "hate_speech",
            "brand_safety",
            "professional_conduct"
        ]
    }
}


# ============================================================================
# Helper Functions
# ============================================================================

def get_model_for_tier(tier: str) -> AIModel:
    """
    Get appropriate AI model for subscription tier

    Args:
        tier: Subscription tier (free, basic, pro, enterprise)

    Returns:
        AIModel enum value

    Raises:
        ValueError: If tier is invalid
    """
    try:
        tier_enum = SubscriptionTier(tier.lower())
        return TIER_MODEL_MAP[tier_enum]
    except (ValueError, KeyError):
        raise ValueError(f"Invalid subscription tier: {tier}")


def get_model_config(model: AIModel) -> Dict[str, Any]:
    """
    Get configuration for specific model

    Args:
        model: AIModel enum value

    Returns:
        Model configuration dictionary
    """
    return MODEL_CONFIG.get(model, MODEL_CONFIG[AIModel.HAIKU])


def get_purpose_config(purpose: str) -> Dict[str, Any]:
    """
    Get configuration for specific purpose

    Args:
        purpose: Analysis purpose

    Returns:
        Purpose configuration dictionary
    """
    return PURPOSE_CONFIG.get(
        purpose.lower(),
        PURPOSE_CONFIG["personal_reputation"]
    )


def calculate_analysis_cost(
    model: AIModel,
    input_tokens: int,
    output_tokens: int
) -> float:
    """
    Calculate cost of analysis

    Args:
        model: AI model used
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens

    Returns:
        Cost in USD
    """
    config = get_model_config(model)
    input_cost = (input_tokens / 1000) * config["cost_per_1k_input"]
    output_cost = (output_tokens / 1000) * config["cost_per_1k_output"]
    return input_cost + output_cost


def is_tier_valid(tier: str, subscription_status: str = "active") -> bool:
    """
    Check if tier is valid and subscription is active

    Args:
        tier: Subscription tier
        subscription_status: Subscription status

    Returns:
        True if valid and active
    """
    try:
        tier_enum = SubscriptionTier(tier.lower())
        return subscription_status == "active" and tier_enum in TIER_MODEL_MAP
    except ValueError:
        return False


# ============================================================================
# API Key Management
# ============================================================================

def get_anthropic_api_key() -> str:
    """
    Get Anthropic API key from settings

    Returns:
        API key

    Raises:
        ValueError: If API key not configured
    """
    api_key = settings.anthropic_api_key
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not configured")
    return api_key


# ============================================================================
# Export
# ============================================================================

__all__ = [
    "AIModel",
    "SubscriptionTier",
    "AnalysisConfig",
    "TIER_MODEL_MAP",
    "MODEL_CONFIG",
    "PURPOSE_CONFIG",
    "get_model_for_tier",
    "get_model_config",
    "get_purpose_config",
    "calculate_analysis_cost",
    "is_tier_valid",
    "get_anthropic_api_key",
]
