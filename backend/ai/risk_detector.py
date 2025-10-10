"""
Risk & Bias Detection System
Advanced risk assessment and bias detection capabilities
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum

from .schemas import (
    RiskLevel,
    RiskCategory,
    RiskFlag,
    AssociationRisk,
    ContentIntegrityIssue,
    BiasCategory,
    BiasIndicator
)

logger = logging.getLogger(__name__)


# ============================================================================
# Risk Detection Thresholds
# ============================================================================

class RiskThresholds:
    """Risk score thresholds for various categories"""

    # Overall risk levels (0-100 scale)
    LOW_RISK_MAX = 30.0
    MEDIUM_RISK_MAX = 60.0
    HIGH_RISK_MAX = 85.0
    # Above 85.0 is CRITICAL

    # Sentiment risk thresholds
    NEGATIVE_SENTIMENT_THRESHOLD = -0.5
    SEVERE_NEGATIVE_THRESHOLD = -0.8

    # Bias strength thresholds
    MODERATE_BIAS = 0.4
    STRONG_BIAS = 0.7

    # Confidence thresholds
    MIN_CONFIDENCE = 0.6
    HIGH_CONFIDENCE = 0.85


# ============================================================================
# Keyword and Pattern Databases
# ============================================================================

class RiskKeywords:
    """Known risk keywords and patterns"""

    EXTREMISM_KEYWORDS = [
        "jihad", "caliphate", "infidel", "kafir",
        "white power", "race war", "ethnostate",
        "accelerationism", "boogaloo", "dotr",
        # Add more as needed
    ]

    HATE_SPEECH_SLURS = [
        # Intentionally limited - actual implementation would use
        # comprehensive databases with context awareness
    ]

    VIOLENCE_KEYWORDS = [
        "kill", "murder", "assassinate", "bomb",
        "shoot", "attack", "destroy", "eliminate"
    ]

    CONSPIRACY_PATTERNS = [
        "deep state", "false flag", "crisis actor",
        "new world order", "illuminati", "qanon"
    ]

    GEOPOLITICAL_SENSITIVE = [
        "taiwan independence", "tibet", "uyghur",
        "crimea", "kashmir", "palestine",
        "north korea", "iran nuclear", "sanctions"
    ]


class KnownEntities:
    """Known extremist groups and controversial entities"""

    EXTREMIST_GROUPS = [
        "isis", "al-qaeda", "taliban", "kkk",
        "proud boys", "oath keepers", "atomwaffen",
        # Add more as needed
    ]

    SANCTIONED_ENTITIES = [
        # Would be populated from OFAC and other sanction lists
    ]

    CONTROVERSIAL_FIGURES = [
        # Would be populated from monitoring databases
    ]


# ============================================================================
# Risk Detector
# ============================================================================

class RiskDetector:
    """
    Advanced risk detection and assessment system
    """

    def __init__(self, purpose: str = "personal_reputation"):
        """
        Initialize risk detector

        Args:
            purpose: Analysis purpose for context-aware detection
        """
        self.purpose = purpose.lower()
        self.risk_weights = self._get_risk_weights()

    def _get_risk_weights(self) -> Dict[str, float]:
        """Get risk category weights based on purpose"""
        # Different purposes prioritize different risks
        weight_map = {
            "visa_application": {
                "extremism": 2.5,
                "hate_speech": 2.0,
                "geopolitical": 2.5,
                "misinformation": 1.5,
                "brand_safety": 1.0,
                "professional_conduct": 1.2
            },
            "security_clearance": {
                "extremism": 3.0,
                "hate_speech": 2.5,
                "geopolitical": 3.0,
                "misinformation": 2.0,
                "brand_safety": 1.0,
                "professional_conduct": 1.5
            },
            "job_search": {
                "extremism": 1.5,
                "hate_speech": 2.0,
                "geopolitical": 1.0,
                "misinformation": 1.2,
                "brand_safety": 2.0,
                "professional_conduct": 2.5
            },
            "brand_building": {
                "extremism": 1.5,
                "hate_speech": 1.8,
                "geopolitical": 0.8,
                "misinformation": 1.5,
                "brand_safety": 2.5,
                "professional_conduct": 1.5
            }
        }

        return weight_map.get(self.purpose, {
            "extremism": 1.0,
            "hate_speech": 1.0,
            "geopolitical": 1.0,
            "misinformation": 1.0,
            "brand_safety": 1.0,
            "professional_conduct": 1.0
        })

    def detect_risks(
        self,
        tweet_data: Dict[str, Any],
        ai_analysis: Optional[Dict[str, Any]] = None
    ) -> Tuple[float, RiskLevel, List[RiskFlag]]:
        """
        Detect and assess risks in tweet data

        Args:
            tweet_data: Tweet content and metadata
            ai_analysis: Optional AI-generated analysis to enhance

        Returns:
            Tuple of (risk_score, risk_level, risk_flags)
        """
        risk_flags = []
        risk_scores = []

        # Extract tweets
        tweets = tweet_data.get("tweets", [])

        # Run detection methods
        extremism_risks = self._detect_extremism(tweets)
        hate_speech_risks = self._detect_hate_speech(tweets)
        misinformation_risks = self._detect_misinformation(tweets)
        geopolitical_risks = self._detect_geopolitical_risks(tweets)
        brand_safety_risks = self._detect_brand_safety_issues(tweets)
        professional_risks = self._detect_professional_conduct_issues(tweets)

        # Combine all risks
        all_risks = (
            extremism_risks +
            hate_speech_risks +
            misinformation_risks +
            geopolitical_risks +
            brand_safety_risks +
            professional_risks
        )

        # Apply weights and calculate overall score
        for risk in all_risks:
            category_key = risk.category.value.replace("_", " ").split()[0]
            weight = self.risk_weights.get(category_key, 1.0)

            # Convert severity to score
            severity_scores = {
                RiskLevel.LOW: 20,
                RiskLevel.MEDIUM: 50,
                RiskLevel.HIGH: 80,
                RiskLevel.CRITICAL: 100
            }
            base_score = severity_scores.get(risk.severity, 20)

            # Apply weight and confidence
            weighted_score = base_score * weight * risk.confidence

            risk_scores.append(weighted_score)
            risk_flags.append(risk)

        # Calculate overall risk score (0-100)
        if risk_scores:
            # Use max score with diminishing returns for multiple issues
            max_score = max(risk_scores)
            avg_score = sum(risk_scores) / len(risk_scores)
            overall_score = (max_score * 0.7) + (avg_score * 0.3)
        else:
            overall_score = 0.0

        # Determine risk level
        risk_level = self._calculate_risk_level(overall_score)

        logger.info(
            f"Risk detection completed: score={overall_score:.2f}, "
            f"level={risk_level.value}, flags={len(risk_flags)}"
        )

        return overall_score, risk_level, risk_flags

    def _detect_extremism(self, tweets: List[Dict[str, Any]]) -> List[RiskFlag]:
        """Detect extremism indicators"""
        flags = []

        for tweet in tweets:
            text = tweet.get("text", "").lower()

            # Check for extremist keywords
            found_keywords = [
                kw for kw in RiskKeywords.EXTREMISM_KEYWORDS
                if kw in text
            ]

            if found_keywords:
                flags.append(RiskFlag(
                    category=RiskCategory.EXTREMISM,
                    severity=RiskLevel.HIGH,
                    description=f"Detected extremism-related keywords: {', '.join(found_keywords)}",
                    evidence=[tweet.get("id", "unknown")],
                    impact_assessment="Potential association with extremist ideologies",
                    mitigation_recommendation="Review and remove concerning content; distance from extremist rhetoric",
                    confidence=0.7
                ))

            # Check for violent rhetoric
            violent_keywords = [
                kw for kw in RiskKeywords.VIOLENCE_KEYWORDS
                if kw in text
            ]

            if len(violent_keywords) >= 2:  # Multiple violent keywords
                flags.append(RiskFlag(
                    category=RiskCategory.EXTREMISM,
                    severity=RiskLevel.CRITICAL,
                    description="Multiple violent keywords detected",
                    evidence=[tweet.get("id", "unknown")],
                    impact_assessment="Severe reputation risk; potential legal concerns",
                    mitigation_recommendation="Immediate content review required; consider professional consultation",
                    confidence=0.8
                ))

        return flags

    def _detect_hate_speech(self, tweets: List[Dict[str, Any]]) -> List[RiskFlag]:
        """Detect hate speech indicators"""
        flags = []

        for tweet in tweets:
            text = tweet.get("text", "").lower()

            # Check for dehumanizing language patterns
            dehumanizing_patterns = [
                "they are animals",
                "subhuman",
                "vermin",
                "infestation"
            ]

            for pattern in dehumanizing_patterns:
                if pattern in text:
                    flags.append(RiskFlag(
                        category=RiskCategory.HATE_SPEECH,
                        severity=RiskLevel.CRITICAL,
                        description=f"Dehumanizing language detected: '{pattern}'",
                        evidence=[tweet.get("id", "unknown")],
                        impact_assessment="Severe reputation damage; violates platform policies",
                        mitigation_recommendation="Remove content immediately; issue clarification if needed",
                        confidence=0.85
                    ))

        return flags

    def _detect_misinformation(self, tweets: List[Dict[str, Any]]) -> List[RiskFlag]:
        """Detect misinformation indicators"""
        flags = []

        for tweet in tweets:
            text = tweet.get("text", "").lower()

            # Check for conspiracy theory keywords
            conspiracy_found = [
                kw for kw in RiskKeywords.CONSPIRACY_PATTERNS
                if kw in text
            ]

            if conspiracy_found:
                flags.append(RiskFlag(
                    category=RiskCategory.MISINFORMATION,
                    severity=RiskLevel.MEDIUM,
                    description=f"Potential conspiracy theory content: {', '.join(conspiracy_found)}",
                    evidence=[tweet.get("id", "unknown")],
                    impact_assessment="May be associated with misinformation",
                    mitigation_recommendation="Verify claims; add context or corrections if needed",
                    confidence=0.65
                ))

        return flags

    def _detect_geopolitical_risks(self, tweets: List[Dict[str, Any]]) -> List[RiskFlag]:
        """Detect geopolitical sensitivity risks"""
        flags = []

        for tweet in tweets:
            text = tweet.get("text", "").lower()

            # Check for sensitive geopolitical topics
            sensitive_found = [
                topic for topic in RiskKeywords.GEOPOLITICAL_SENSITIVE
                if topic in text
            ]

            if sensitive_found:
                # Severity depends on purpose
                severity = RiskLevel.HIGH if self.purpose in ["visa_application", "security_clearance"] else RiskLevel.MEDIUM

                flags.append(RiskFlag(
                    category=RiskCategory.GEOPOLITICAL,
                    severity=severity,
                    description=f"Sensitive geopolitical topics: {', '.join(sensitive_found)}",
                    evidence=[tweet.get("id", "unknown")],
                    impact_assessment="May impact visa/clearance applications",
                    mitigation_recommendation="Review content for balanced perspective",
                    confidence=0.75
                ))

        return flags

    def _detect_brand_safety_issues(self, tweets: List[Dict[str, Any]]) -> List[RiskFlag]:
        """Detect brand safety concerns"""
        flags = []

        profanity_count = 0
        controversial_count = 0

        for tweet in tweets:
            text = tweet.get("text", "").lower()

            # Check for excessive profanity (simplified check)
            profanity_indicators = ["fuck", "shit", "damn", "ass", "bitch"]
            if any(word in text for word in profanity_indicators):
                profanity_count += 1

            # Check for controversial political/religious topics
            controversial_indicators = [
                "abortion", "gun control", "religion", "politics",
                "trump", "biden", "conservative", "liberal"
            ]
            if any(word in text for word in controversial_indicators):
                controversial_count += 1

        # Flag if excessive
        total_tweets = len(tweets)
        if total_tweets > 0:
            profanity_ratio = profanity_count / total_tweets

            if profanity_ratio > 0.3:  # More than 30% contain profanity
                flags.append(RiskFlag(
                    category=RiskCategory.BRAND_SAFETY,
                    severity=RiskLevel.MEDIUM,
                    description=f"Frequent profanity usage ({profanity_ratio:.0%} of tweets)",
                    evidence=[],
                    impact_assessment="May limit professional opportunities",
                    mitigation_recommendation="Reduce profanity for better professional presence",
                    confidence=0.8
                ))

            controversial_ratio = controversial_count / total_tweets
            if controversial_ratio > 0.5:  # More than 50% controversial
                flags.append(RiskFlag(
                    category=RiskCategory.CONTROVERSIAL_TOPICS,
                    severity=RiskLevel.MEDIUM,
                    description=f"Frequent controversial topic engagement ({controversial_ratio:.0%})",
                    evidence=[],
                    impact_assessment="May polarize audience or employers",
                    mitigation_recommendation="Consider diversifying content topics",
                    confidence=0.7
                ))

        return flags

    def _detect_professional_conduct_issues(self, tweets: List[Dict[str, Any]]) -> List[RiskFlag]:
        """Detect professional conduct concerns"""
        flags = []

        for tweet in tweets:
            text = tweet.get("text", "").lower()

            # Check for workplace complaints
            complaint_patterns = [
                "hate my job",
                "my boss is",
                "work sucks",
                "fired",
                "quit today"
            ]

            for pattern in complaint_patterns:
                if pattern in text:
                    flags.append(RiskFlag(
                        category=RiskCategory.PROFESSIONAL_CONDUCT,
                        severity=RiskLevel.MEDIUM,
                        description="Public workplace complaints detected",
                        evidence=[tweet.get("id", "unknown")],
                        impact_assessment="May concern potential employers",
                        mitigation_recommendation="Remove or make private workplace-related complaints",
                        confidence=0.75
                    ))
                    break  # One flag per tweet

        return flags

    def _calculate_risk_level(self, score: float) -> RiskLevel:
        """Calculate risk level from score"""
        if score <= RiskThresholds.LOW_RISK_MAX:
            return RiskLevel.LOW
        elif score <= RiskThresholds.MEDIUM_RISK_MAX:
            return RiskLevel.MEDIUM
        elif score <= RiskThresholds.HIGH_RISK_MAX:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL

    def detect_associations(
        self,
        tweet_data: Dict[str, Any]
    ) -> List[AssociationRisk]:
        """
        Detect risky associations with entities or groups

        Args:
            tweet_data: Tweet content and metadata

        Returns:
            List of association risks
        """
        associations = []
        tweets = tweet_data.get("tweets", [])

        for tweet in tweets:
            text = tweet.get("text", "").lower()

            # Check for extremist group mentions
            for group in KnownEntities.EXTREMIST_GROUPS:
                if group in text:
                    associations.append(AssociationRisk(
                        entity_name=group.title(),
                        association_type="mention",
                        risk_category=RiskCategory.EXTREMISM,
                        severity=RiskLevel.CRITICAL,
                        evidence=f"Tweet ID: {tweet.get('id', 'unknown')}",
                        justification=f"Mention of known extremist group '{group}'",
                        context="Requires review of context - may be condemning or reporting"
                    ))

        return associations


# ============================================================================
# Bias Detector
# ============================================================================

class BiasDetector:
    """
    Political and demographic bias detection system
    """

    def __init__(self):
        """Initialize bias detector"""
        self.political_keywords = self._load_political_keywords()

    def _load_political_keywords(self) -> Dict[str, List[str]]:
        """Load political bias keyword indicators"""
        return {
            "left": [
                "progressive", "liberal", "democrat", "socialism",
                "social justice", "equity", "inclusive", "diversity"
            ],
            "right": [
                "conservative", "republican", "libertarian", "freedom",
                "traditional values", "law and order", "patriot"
            ]
        }

    def detect_political_bias(
        self,
        tweets: List[Dict[str, Any]]
    ) -> Tuple[float, str, List[BiasIndicator]]:
        """
        Detect political bias in tweets

        Args:
            tweets: List of tweet dictionaries

        Returns:
            Tuple of (bias_score, leaning, indicators)
            bias_score: -1.0 (far left) to 1.0 (far right)
        """
        left_count = 0
        right_count = 0
        indicators = []

        for tweet in tweets:
            text = tweet.get("text", "").lower()

            # Count left-leaning keywords
            left_found = [kw for kw in self.political_keywords["left"] if kw in text]
            left_count += len(left_found)

            # Count right-leaning keywords
            right_found = [kw for kw in self.political_keywords["right"] if kw in text]
            right_count += len(right_found)

            # Create indicators for tweets with clear bias
            if len(left_found) >= 2:
                indicators.append(BiasIndicator(
                    category=BiasCategory.POLITICAL_LEFT,
                    strength=min(len(left_found) / 5.0, 1.0),
                    description="Left-leaning political language",
                    examples=[tweet.get("id", "unknown")],
                    is_problematic=False
                ))

            if len(right_found) >= 2:
                indicators.append(BiasIndicator(
                    category=BiasCategory.POLITICAL_RIGHT,
                    strength=min(len(right_found) / 5.0, 1.0),
                    description="Right-leaning political language",
                    examples=[tweet.get("id", "unknown")],
                    is_problematic=False
                ))

        # Calculate bias score
        total_political = left_count + right_count
        if total_political == 0:
            bias_score = 0.0
            leaning = "center"
        else:
            # -1.0 (all left) to 1.0 (all right)
            bias_score = (right_count - left_count) / total_political

            # Determine leaning
            if bias_score < -0.6:
                leaning = "far_left"
            elif bias_score < -0.2:
                leaning = "left"
            elif bias_score < 0.2:
                leaning = "center"
            elif bias_score < 0.6:
                leaning = "right"
            else:
                leaning = "far_right"

        return bias_score, leaning, indicators


# ============================================================================
# Export
# ============================================================================

__all__ = [
    "RiskDetector",
    "BiasDetector",
    "RiskThresholds",
    "RiskKeywords",
    "KnownEntities"
]
