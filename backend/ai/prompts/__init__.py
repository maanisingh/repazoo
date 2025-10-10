"""
AI Prompt Templates
"""

from .analysis_prompt import SYSTEM_PROMPT, get_analysis_prompt, get_retry_prompt
from .risk_prompts import (
    RISK_DETECTION_SYSTEM_PROMPT,
    get_risk_analysis_prompt,
    get_composite_risk_prompt
)

__all__ = [
    "SYSTEM_PROMPT",
    "get_analysis_prompt",
    "get_retry_prompt",
    "RISK_DETECTION_SYSTEM_PROMPT",
    "get_risk_analysis_prompt",
    "get_composite_risk_prompt"
]
