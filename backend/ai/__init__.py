"""
Repazoo AI Analysis Module
LangChain-powered Twitter reputation analysis with risk and bias detection
"""

from .langchain_analyzer import LangChainAnalyzer, create_analyzer, get_model_for_tier_name
from .analysis_pipeline import AnalysisPipeline, create_pipeline
from .risk_detector import RiskDetector, BiasDetector
from .purpose_handler import PurposeHandler
from .schemas import (
    AnalysisResult,
    RiskLevel,
    SentimentType,
    BiasCategory,
    RiskCategory,
    PurposeCategory
)
from .config import (
    AIModel,
    SubscriptionTier,
    AnalysisConfig,
    get_model_for_tier,
    get_model_config,
    get_purpose_config
)

__version__ = "1.0.0"

__all__ = [
    # Main classes
    "LangChainAnalyzer",
    "AnalysisPipeline",
    "RiskDetector",
    "BiasDetector",
    "PurposeHandler",

    # Factory functions
    "create_analyzer",
    "create_pipeline",

    # Schemas
    "AnalysisResult",
    "RiskLevel",
    "SentimentType",
    "BiasCategory",
    "RiskCategory",
    "PurposeCategory",

    # Config
    "AIModel",
    "SubscriptionTier",
    "AnalysisConfig",
    "get_model_for_tier",
    "get_model_config",
    "get_purpose_config",
    "get_model_for_tier_name",
]
