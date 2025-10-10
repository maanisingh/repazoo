"""
LangChain-based Twitter Analysis System
Tier-based AI routing with structured output generation
"""

import json
import logging
import time
from typing import Dict, Any, Optional, List
from datetime import datetime

from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableParallel
from langchain.callbacks import get_openai_callback

from .config import (
    AIModel,
    get_model_for_tier,
    get_model_config,
    get_anthropic_api_key,
    AnalysisConfig
)
from .schemas import AnalysisResult, PurposeCategory
from .prompts.analysis_prompt import (
    SYSTEM_PROMPT,
    get_analysis_prompt,
    get_retry_prompt
)

logger = logging.getLogger(__name__)


# ============================================================================
# LangChain Analyzer
# ============================================================================

class LangChainAnalyzer:
    """
    LangChain-powered Twitter analysis with tier-based model routing
    """

    def __init__(self, tier: str = "basic"):
        """
        Initialize analyzer with appropriate model for tier

        Args:
            tier: Subscription tier (free, basic, pro, enterprise)
        """
        self.tier = tier.lower()
        self.model_enum = get_model_for_tier(self.tier)
        self.model_config = get_model_config(self.model_enum)
        self.api_key = get_anthropic_api_key()

        # Initialize LangChain model
        self.llm = self._create_llm()

        # Initialize output parser
        self.output_parser = JsonOutputParser()

        # Create analysis chain
        self.analysis_chain = self._create_analysis_chain()

        logger.info(
            f"Initialized LangChain analyzer for tier '{self.tier}' "
            f"using model '{self.model_enum.value}'"
        )

    def _create_llm(self) -> ChatAnthropic:
        """Create ChatAnthropic instance with tier-specific configuration"""
        return ChatAnthropic(
            model=self.model_enum.value,
            anthropic_api_key=self.api_key,
            max_tokens=self.model_config["max_tokens"],
            temperature=self.model_config["temperature"],
            top_p=self.model_config["top_p"],
            timeout=self.model_config["timeout"],
            max_retries=self.model_config["max_retries"],
        )

    def _create_analysis_chain(self):
        """Create LangChain analysis chain"""
        # Create prompt template
        prompt = ChatPromptTemplate.from_messages([
            SystemMessagePromptTemplate.from_template(SYSTEM_PROMPT),
            HumanMessagePromptTemplate.from_template("{analysis_prompt}")
        ])

        # Create chain: prompt -> llm -> parse
        chain = prompt | self.llm | self.output_parser

        return chain

    async def analyze(
        self,
        tweet_data: Dict[str, Any],
        user_profile: Dict[str, Any],
        purpose: str = "personal_reputation",
        analysis_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Perform comprehensive analysis

        Args:
            tweet_data: Aggregated tweet data
            user_profile: Twitter profile information
            purpose: Analysis purpose
            analysis_config: Analysis configuration overrides

        Returns:
            Analysis results as dictionary

        Raises:
            ValueError: If input validation fails
            RuntimeError: If analysis fails after retries
        """
        start_time = time.time()

        # Validate inputs
        self._validate_inputs(tweet_data, user_profile)

        # Generate analysis prompt
        analysis_prompt = get_analysis_prompt(
            purpose=purpose,
            tweet_data=tweet_data,
            user_profile=user_profile,
            analysis_config=analysis_config or {}
        )

        # Execute analysis with retries
        result = await self._execute_with_retry(
            analysis_prompt=analysis_prompt,
            max_retries=AnalysisConfig.MAX_RETRIES
        )

        # Add metadata
        result["processing_time_ms"] = int((time.time() - start_time) * 1000)
        result["model_used"] = self.model_enum.value
        result["tier"] = self.tier

        logger.info(
            f"Analysis completed in {result['processing_time_ms']}ms "
            f"using {result.get('token_count', 0)} tokens"
        )

        return result

    def analyze_sync(
        self,
        tweet_data: Dict[str, Any],
        user_profile: Dict[str, Any],
        purpose: str = "personal_reputation",
        analysis_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Synchronous version of analyze method

        Args:
            tweet_data: Aggregated tweet data
            user_profile: Twitter profile information
            purpose: Analysis purpose
            analysis_config: Analysis configuration overrides

        Returns:
            Analysis results as dictionary
        """
        start_time = time.time()

        # Validate inputs
        self._validate_inputs(tweet_data, user_profile)

        # Generate analysis prompt
        analysis_prompt = get_analysis_prompt(
            purpose=purpose,
            tweet_data=tweet_data,
            user_profile=user_profile,
            analysis_config=analysis_config or {}
        )

        # Execute analysis with retries
        result = self._execute_with_retry_sync(
            analysis_prompt=analysis_prompt,
            max_retries=AnalysisConfig.MAX_RETRIES
        )

        # Add metadata
        result["processing_time_ms"] = int((time.time() - start_time) * 1000)
        result["model_used"] = self.model_enum.value
        result["tier"] = self.tier

        logger.info(
            f"Analysis completed in {result['processing_time_ms']}ms "
            f"using {result.get('token_count', 0)} tokens"
        )

        return result

    async def _execute_with_retry(
        self,
        analysis_prompt: str,
        max_retries: int
    ) -> Dict[str, Any]:
        """Execute analysis with retry logic"""
        last_error = None

        for attempt in range(max_retries):
            try:
                logger.debug(f"Analysis attempt {attempt + 1}/{max_retries}")

                # Invoke chain
                result = await self.analysis_chain.ainvoke({
                    "analysis_prompt": analysis_prompt
                })

                # Validate result
                if self._validate_result(result):
                    # Estimate token count (Claude returns usage in metadata)
                    result["token_count"] = self._estimate_tokens(
                        analysis_prompt,
                        str(result)
                    )
                    return result

                raise ValueError("Result validation failed")

            except json.JSONDecodeError as e:
                logger.warning(f"JSON parsing error on attempt {attempt + 1}: {e}")
                last_error = e

                # If not last attempt, try with clarification prompt
                if attempt < max_retries - 1:
                    analysis_prompt = get_retry_prompt(
                        str(result) if 'result' in locals() else "",
                        str(e)
                    )

            except Exception as e:
                logger.error(f"Analysis error on attempt {attempt + 1}: {e}")
                last_error = e

                # Exponential backoff
                if attempt < max_retries - 1:
                    wait_time = AnalysisConfig.RETRY_DELAY * (2 ** attempt)
                    logger.info(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)

        # All retries failed
        raise RuntimeError(
            f"Analysis failed after {max_retries} attempts. "
            f"Last error: {last_error}"
        )

    def _execute_with_retry_sync(
        self,
        analysis_prompt: str,
        max_retries: int
    ) -> Dict[str, Any]:
        """Synchronous version of execute with retry"""
        last_error = None

        for attempt in range(max_retries):
            try:
                logger.debug(f"Analysis attempt {attempt + 1}/{max_retries}")

                # Invoke chain
                result = self.analysis_chain.invoke({
                    "analysis_prompt": analysis_prompt
                })

                # Validate result
                if self._validate_result(result):
                    # Estimate token count
                    result["token_count"] = self._estimate_tokens(
                        analysis_prompt,
                        str(result)
                    )
                    return result

                raise ValueError("Result validation failed")

            except json.JSONDecodeError as e:
                logger.warning(f"JSON parsing error on attempt {attempt + 1}: {e}")
                last_error = e

                # If not last attempt, try with clarification prompt
                if attempt < max_retries - 1:
                    analysis_prompt = get_retry_prompt(
                        str(result) if 'result' in locals() else "",
                        str(e)
                    )

            except Exception as e:
                logger.error(f"Analysis error on attempt {attempt + 1}: {e}")
                last_error = e

                # Exponential backoff
                if attempt < max_retries - 1:
                    wait_time = AnalysisConfig.RETRY_DELAY * (2 ** attempt)
                    logger.info(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)

        # All retries failed
        raise RuntimeError(
            f"Analysis failed after {max_retries} attempts. "
            f"Last error: {last_error}"
        )

    def _validate_inputs(
        self,
        tweet_data: Dict[str, Any],
        user_profile: Dict[str, Any]
    ):
        """Validate input data"""
        # Check tweet data
        if not tweet_data:
            raise ValueError("Tweet data is required")

        tweets = tweet_data.get("tweets", [])
        if len(tweets) < AnalysisConfig.MIN_TWEETS_REQUIRED:
            raise ValueError(
                f"At least {AnalysisConfig.MIN_TWEETS_REQUIRED} tweets required "
                f"for analysis. Provided: {len(tweets)}"
            )

        # Check user profile
        if not user_profile:
            raise ValueError("User profile is required")

        required_fields = ["username"]
        missing = [f for f in required_fields if f not in user_profile]
        if missing:
            raise ValueError(f"Missing required profile fields: {missing}")

    def _validate_result(self, result: Dict[str, Any]) -> bool:
        """Validate analysis result structure"""
        required_keys = [
            "sentiment",
            "themes",
            "engagement",
            "risk_assessment",
            "bias_indicators",
            "recommendations",
            "executive_summary",
            "key_findings",
            "confidence_level",
            "human_review_required"
        ]

        for key in required_keys:
            if key not in result:
                logger.warning(f"Missing required key in result: {key}")
                return False

        return True

    def _estimate_tokens(self, input_text: str, output_text: str) -> int:
        """
        Estimate token count (rough approximation)
        Claude's actual token count would come from API metadata
        """
        # Rough estimate: ~4 characters per token
        input_tokens = len(input_text) // 4
        output_tokens = len(output_text) // 4
        return input_tokens + output_tokens


# ============================================================================
# Factory Function
# ============================================================================

def create_analyzer(tier: str = "basic") -> LangChainAnalyzer:
    """
    Factory function to create analyzer instance

    Args:
        tier: Subscription tier

    Returns:
        Configured LangChainAnalyzer instance

    Example:
        analyzer = create_analyzer("pro")
        result = await analyzer.analyze(tweet_data, user_profile, "job_search")
    """
    return LangChainAnalyzer(tier=tier)


def get_model_for_tier_name(tier: str) -> str:
    """
    Get model name for tier (helper for display/logging)

    Args:
        tier: Subscription tier

    Returns:
        Model name string
    """
    model_enum = get_model_for_tier(tier)
    return model_enum.value


# ============================================================================
# Export
# ============================================================================

__all__ = [
    "LangChainAnalyzer",
    "create_analyzer",
    "get_model_for_tier_name"
]
