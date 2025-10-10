"""
Complete Analysis Pipeline
End-to-end AI analysis orchestration with database integration
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from .langchain_analyzer import LangChainAnalyzer, create_analyzer
from .risk_detector import RiskDetector, BiasDetector
from .purpose_handler import PurposeHandler
from .schemas import (
    AnalysisResult,
    AnalysisResultDB,
    PurposeCategory,
    SentimentScore,
    Theme,
    EngagementMetrics,
    RiskAssessment,
    BiasAnalysis,
    Recommendation
)
from .config import AnalysisConfig, get_model_for_tier
from ..database.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


# ============================================================================
# Analysis Pipeline
# ============================================================================

class AnalysisPipeline:
    """
    Complete AI analysis pipeline with database integration
    """

    def __init__(
        self,
        user_id: str,
        tier: str,
        db_client: Optional[SupabaseClient] = None
    ):
        """
        Initialize analysis pipeline

        Args:
            user_id: User ID
            tier: Subscription tier
            db_client: Database client (optional)
        """
        self.user_id = user_id
        self.tier = tier.lower()
        self.db = db_client or SupabaseClient()

        # Initialize components
        self.analyzer = create_analyzer(tier=self.tier)
        self.risk_detector: Optional[RiskDetector] = None
        self.bias_detector = BiasDetector()
        self.purpose_handler: Optional[PurposeHandler] = None

        logger.info(
            f"Initialized analysis pipeline for user {user_id}, tier {tier}"
        )

    async def run_analysis(
        self,
        twitter_account_id: Optional[str] = None,
        purpose: str = "personal_reputation",
        force_refresh: bool = False
    ) -> AnalysisResult:
        """
        Run complete analysis pipeline

        Args:
            twitter_account_id: Twitter account ID (optional)
            purpose: Analysis purpose
            force_refresh: Force new analysis (ignore cache)

        Returns:
            Complete analysis result

        Raises:
            ValueError: If user has no Twitter data
            RuntimeError: If analysis fails
        """
        logger.info(
            f"Starting analysis for user {self.user_id}, "
            f"purpose: {purpose}, tier: {self.tier}"
        )

        # Step 1: Validate quota
        if not self._check_quota():
            raise RuntimeError("User has exceeded analysis quota")

        # Step 2: Fetch Twitter data
        tweet_data, user_profile = self._fetch_twitter_data(twitter_account_id)

        # Step 3: Validate data
        self._validate_data(tweet_data, user_profile)

        # Step 4: Initialize purpose-specific components
        self.purpose_handler = PurposeHandler(purpose)
        self.risk_detector = RiskDetector(purpose)

        # Step 5: Sanitize data (remove PII)
        sanitized_data = self._sanitize_data(tweet_data)

        # Step 6: Run AI analysis
        ai_result = await self.analyzer.analyze(
            tweet_data=sanitized_data,
            user_profile=user_profile,
            purpose=purpose
        )

        # Step 7: Enhance with rule-based detection
        enhanced_result = self._enhance_with_detection(
            ai_result,
            sanitized_data
        )

        # Step 8: Generate personalized recommendations
        recommendations = self.purpose_handler.personalize_recommendations(
            enhanced_result
        )
        enhanced_result["recommendations"] = [
            r.dict() for r in recommendations
        ]

        # Step 9: Create structured result
        analysis_result = self._create_analysis_result(
            enhanced_result,
            purpose
        )

        # Step 10: Store in database
        await self._store_result(
            analysis_result,
            twitter_account_id
        )

        # Step 11: Update usage
        self._increment_usage()

        # Step 12: Log audit
        self._log_audit(analysis_result.analysis_id, purpose)

        logger.info(
            f"Analysis completed for user {self.user_id}, "
            f"ID: {analysis_result.analysis_id}"
        )

        return analysis_result

    def run_analysis_sync(
        self,
        twitter_account_id: Optional[str] = None,
        purpose: str = "personal_reputation",
        force_refresh: bool = False
    ) -> AnalysisResult:
        """Synchronous version of run_analysis"""
        logger.info(
            f"Starting sync analysis for user {self.user_id}, "
            f"purpose: {purpose}, tier: {self.tier}"
        )

        # Step 1: Validate quota
        if not self._check_quota():
            raise RuntimeError("User has exceeded analysis quota")

        # Step 2: Fetch Twitter data
        tweet_data, user_profile = self._fetch_twitter_data(twitter_account_id)

        # Step 3: Validate data
        self._validate_data(tweet_data, user_profile)

        # Step 4: Initialize purpose-specific components
        self.purpose_handler = PurposeHandler(purpose)
        self.risk_detector = RiskDetector(purpose)

        # Step 5: Sanitize data
        sanitized_data = self._sanitize_data(tweet_data)

        # Step 6: Run AI analysis
        ai_result = self.analyzer.analyze_sync(
            tweet_data=sanitized_data,
            user_profile=user_profile,
            purpose=purpose
        )

        # Step 7: Enhance with rule-based detection
        enhanced_result = self._enhance_with_detection(
            ai_result,
            sanitized_data
        )

        # Step 8: Generate personalized recommendations
        recommendations = self.purpose_handler.personalize_recommendations(
            enhanced_result
        )
        enhanced_result["recommendations"] = [
            r.dict() for r in recommendations
        ]

        # Step 9: Create structured result
        analysis_result = self._create_analysis_result(
            enhanced_result,
            purpose
        )

        # Step 10: Store in database
        self._store_result_sync(
            analysis_result,
            twitter_account_id
        )

        # Step 11: Update usage
        self._increment_usage()

        # Step 12: Log audit
        self._log_audit(analysis_result.analysis_id, purpose)

        logger.info(
            f"Sync analysis completed for user {self.user_id}, "
            f"ID: {analysis_result.analysis_id}"
        )

        return analysis_result

    def _check_quota(self) -> bool:
        """Check if user has remaining quota"""
        return self.db.check_quota(self.user_id)

    def _fetch_twitter_data(
        self,
        twitter_account_id: Optional[str]
    ) -> tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Fetch Twitter data from database

        Returns:
            Tuple of (tweet_data, user_profile)
        """
        # Get user's Twitter accounts
        accounts = self.db.get_twitter_accounts(self.user_id)

        if not accounts:
            raise ValueError("No Twitter accounts connected")

        # Use specified account or first active account
        if twitter_account_id:
            account = next(
                (a for a in accounts if a["id"] == twitter_account_id),
                None
            )
            if not account:
                raise ValueError(f"Twitter account {twitter_account_id} not found")
        else:
            account = accounts[0]

        # Extract profile data
        user_profile = {
            "username": account.get("twitter_username"),
            "display_name": account.get("display_name"),
            "follower_count": account.get("follower_count", 0),
            "following_count": account.get("following_count", 0),
            "verified": account.get("verified", False),
            "bio": account.get("bio", ""),
            "created_at": account.get("twitter_created_at")
        }

        # Get tweets from twitter_data table
        # In production, this would query the twitter_data table
        # For now, we'll use cached data from the account
        tweet_data = account.get("cached_tweets", {})

        # If no cached tweets, fetch from Twitter API
        # This would be implemented in the Twitter integration module
        if not tweet_data or not tweet_data.get("tweets"):
            logger.warning(f"No cached tweets for account {account['id']}")
            # In production: fetch from Twitter API
            tweet_data = {
                "tweets": [],
                "total_count": 0,
                "date_range": "N/A",
                "total_likes": 0,
                "total_retweets": 0,
                "total_replies": 0,
                "avg_engagement": 0.0
            }

        return tweet_data, user_profile

    def _validate_data(
        self,
        tweet_data: Dict[str, Any],
        user_profile: Dict[str, Any]
    ):
        """Validate data before analysis"""
        tweets = tweet_data.get("tweets", [])

        if len(tweets) < AnalysisConfig.MIN_TWEETS_REQUIRED:
            raise ValueError(
                f"Insufficient tweets for analysis. "
                f"Required: {AnalysisConfig.MIN_TWEETS_REQUIRED}, "
                f"Found: {len(tweets)}"
            )

        if not user_profile.get("username"):
            raise ValueError("Username is required")

    def _sanitize_data(self, tweet_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize data to remove PII and sensitive information

        Args:
            tweet_data: Raw tweet data

        Returns:
            Sanitized tweet data
        """
        sanitized = tweet_data.copy()

        # Limit number of tweets
        tweets = sanitized.get("tweets", [])
        if len(tweets) > AnalysisConfig.MAX_TWEETS_TO_ANALYZE:
            sanitized["tweets"] = tweets[:AnalysisConfig.MAX_TWEETS_TO_ANALYZE]

        # Truncate long tweets
        for tweet in sanitized["tweets"]:
            text = tweet.get("text", "")
            if len(text) > AnalysisConfig.MAX_TWEET_LENGTH:
                tweet["text"] = text[:AnalysisConfig.MAX_TWEET_LENGTH]

            # Remove location data
            tweet.pop("location", None)
            tweet.pop("coordinates", None)

            # Remove user IDs from mentions (keep usernames)
            if "mentions" in tweet:
                tweet["mentions"] = [
                    m.get("username") for m in tweet["mentions"]
                    if "username" in m
                ]

        return sanitized

    def _enhance_with_detection(
        self,
        ai_result: Dict[str, Any],
        tweet_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Enhance AI results with rule-based detection

        Args:
            ai_result: AI analysis results
            tweet_data: Tweet data

        Returns:
            Enhanced results
        """
        # Run risk detection
        risk_score, risk_level, risk_flags = self.risk_detector.detect_risks(
            tweet_data,
            ai_result
        )

        # Run bias detection
        tweets = tweet_data.get("tweets", [])
        bias_score, political_leaning, bias_indicators = \
            self.bias_detector.detect_political_bias(tweets)

        # Enhance risk assessment
        if "risk_assessment" in ai_result:
            # Merge AI and rule-based risk flags
            existing_flags = ai_result["risk_assessment"].get("flags", [])
            ai_result["risk_assessment"]["flags"] = existing_flags + [
                f.__dict__ if hasattr(f, '__dict__') else f
                for f in risk_flags
            ]

            # Update risk score (weighted average)
            ai_risk = ai_result["risk_assessment"].get("overall_risk_score", 0)
            ai_result["risk_assessment"]["overall_risk_score"] = \
                (ai_risk * 0.6) + (risk_score * 0.4)

        # Enhance bias indicators
        if "bias_indicators" in ai_result:
            ai_result["bias_indicators"]["overall_bias_score"] = bias_score
            ai_result["bias_indicators"]["political_leaning"] = political_leaning

            # Add detected indicators
            existing_indicators = ai_result["bias_indicators"].get("bias_indicators", [])
            ai_result["bias_indicators"]["bias_indicators"] = existing_indicators + [
                ind.__dict__ if hasattr(ind, '__dict__') else ind
                for ind in bias_indicators
            ]

        return ai_result

    def _create_analysis_result(
        self,
        enhanced_result: Dict[str, Any],
        purpose: str
    ) -> AnalysisResult:
        """
        Create structured AnalysisResult from enhanced data

        Args:
            enhanced_result: Enhanced analysis results
            purpose: Analysis purpose

        Returns:
            Structured AnalysisResult
        """
        analysis_id = str(uuid.uuid4())

        return AnalysisResult(
            analysis_id=analysis_id,
            user_id=self.user_id,
            timestamp=datetime.now(timezone.utc),
            tier=self.tier,
            purpose=PurposeCategory(purpose.lower()),
            model_used=enhanced_result.get("model_used", get_model_for_tier(self.tier).value),
            sentiment=SentimentScore(**enhanced_result["sentiment"]),
            themes=[Theme(**t) for t in enhanced_result["themes"]],
            engagement=EngagementMetrics(**enhanced_result["engagement"]),
            risk_assessment=RiskAssessment(**enhanced_result["risk_assessment"]),
            bias_indicators=BiasAnalysis(**enhanced_result["bias_indicators"]),
            recommendations=[
                Recommendation(**r) for r in enhanced_result["recommendations"]
            ],
            executive_summary=enhanced_result.get("executive_summary", ""),
            key_findings=enhanced_result.get("key_findings", []),
            processing_time_ms=enhanced_result.get("processing_time_ms", 0),
            token_count=enhanced_result.get("token_count", 0),
            confidence_level=enhanced_result.get("confidence_level", 0.8),
            human_review_required=enhanced_result.get("human_review_required", False),
            raw_response=enhanced_result
        )

    async def _store_result(
        self,
        result: AnalysisResult,
        twitter_account_id: Optional[str]
    ):
        """Store analysis result in database"""
        self._store_result_sync(result, twitter_account_id)

    def _store_result_sync(
        self,
        result: AnalysisResult,
        twitter_account_id: Optional[str]
    ):
        """Store analysis result in database (sync)"""
        analysis_data = {
            "id": result.analysis_id,
            "user_id": self.user_id,
            "twitter_account_id": twitter_account_id,
            "tier": self.tier,
            "purpose": result.purpose.value,
            "sentiment_data": result.sentiment.dict(),
            "themes_data": [t.dict() for t in result.themes],
            "engagement_data": result.engagement.dict(),
            "risk_data": result.risk_assessment.dict(),
            "bias_data": result.bias_indicators.dict(),
            "recommendations_data": [r.dict() for r in result.recommendations],
            "executive_summary": result.executive_summary,
            "key_findings": result.key_findings,
            "model_used": result.model_used,
            "processing_time_ms": result.processing_time_ms,
            "token_count": result.token_count,
            "confidence_level": result.confidence_level,
            "human_review_required": result.human_review_required
        }

        # Store in analysis_results table
        stored = self.db.create_analysis(analysis_data)

        if not stored:
            logger.error(f"Failed to store analysis result {result.analysis_id}")
        else:
            logger.info(f"Stored analysis result {result.analysis_id}")

    def _increment_usage(self):
        """Increment API usage counter"""
        success = self.db.increment_usage(self.user_id, count=1)
        if not success:
            logger.warning(f"Failed to increment usage for user {self.user_id}")

    def _log_audit(self, analysis_id: str, purpose: str):
        """Log analysis to audit log"""
        self.db.log_audit(
            user_id=self.user_id,
            action="analysis_completed",
            resource_type="analysis",
            resource_id=analysis_id,
            metadata={
                "purpose": purpose,
                "tier": self.tier
            }
        )


# ============================================================================
# Factory Function
# ============================================================================

def create_pipeline(
    user_id: str,
    tier: str,
    db_client: Optional[SupabaseClient] = None
) -> AnalysisPipeline:
    """
    Factory function to create analysis pipeline

    Args:
        user_id: User ID
        tier: Subscription tier
        db_client: Database client (optional)

    Returns:
        Configured AnalysisPipeline instance

    Example:
        pipeline = create_pipeline(user_id="123", tier="pro")
        result = await pipeline.run_analysis(purpose="job_search")
    """
    return AnalysisPipeline(user_id, tier, db_client)


# ============================================================================
# Export
# ============================================================================

__all__ = [
    "AnalysisPipeline",
    "create_pipeline"
]
