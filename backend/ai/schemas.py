"""
AI Analysis Output Schemas
Pydantic models for structured AI analysis outputs
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, validator


# ============================================================================
# Enums
# ============================================================================

class RiskLevel(str, Enum):
    """Risk severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SentimentType(str, Enum):
    """Sentiment categories"""
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    MIXED = "mixed"


class BiasCategory(str, Enum):
    """Types of bias detected"""
    POLITICAL_LEFT = "political_left"
    POLITICAL_RIGHT = "political_right"
    POLITICAL_NEUTRAL = "political_neutral"
    DEMOGRAPHIC = "demographic"
    IDEOLOGICAL = "ideological"
    CULTURAL = "cultural"
    RELIGIOUS = "religious"


class RiskCategory(str, Enum):
    """Categories of reputation risks"""
    EXTREMISM = "extremism"
    HATE_SPEECH = "hate_speech"
    MISINFORMATION = "misinformation"
    CONTROVERSIAL_TOPICS = "controversial_topics"
    BRAND_SAFETY = "brand_safety"
    POLITICAL_SENSITIVITY = "political_sensitivity"
    GEOPOLITICAL = "geopolitical"
    PROFESSIONAL_CONDUCT = "professional_conduct"


class PurposeCategory(str, Enum):
    """User's analysis purpose"""
    JOB_SEARCH = "job_search"
    CAREER_DEVELOPMENT = "career_development"
    BRAND_BUILDING = "brand_building"
    INFLUENCER = "influencer"
    POLITICAL_CAMPAIGN = "political_campaign"
    ACADEMIC_RESEARCH = "academic_research"
    PERSONAL_REPUTATION = "personal_reputation"
    CORPORATE_COMMUNICATIONS = "corporate_communications"
    VISA_APPLICATION = "visa_application"
    SECURITY_CLEARANCE = "security_clearance"


# ============================================================================
# Sentiment Models
# ============================================================================

class SentimentScore(BaseModel):
    """Sentiment analysis results"""
    overall_sentiment: SentimentType = Field(
        description="Overall sentiment classification"
    )
    sentiment_score: float = Field(
        ge=-1.0,
        le=1.0,
        description="Numeric sentiment score from -1 (very negative) to 1 (very positive)"
    )
    positive_ratio: float = Field(
        ge=0.0,
        le=1.0,
        description="Ratio of positive content"
    )
    negative_ratio: float = Field(
        ge=0.0,
        le=1.0,
        description="Ratio of negative content"
    )
    neutral_ratio: float = Field(
        ge=0.0,
        le=1.0,
        description="Ratio of neutral content"
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence in sentiment assessment"
    )
    concerning_patterns: List[str] = Field(
        default_factory=list,
        description="Patterns of concerning sentiment"
    )
    sample_quotes: List[str] = Field(
        default_factory=list,
        description="Representative quotes"
    )


# ============================================================================
# Theme Models
# ============================================================================

class Theme(BaseModel):
    """Identified topic or theme"""
    name: str = Field(description="Theme name")
    frequency: int = Field(description="Number of occurrences")
    relevance_score: float = Field(
        ge=0.0,
        le=1.0,
        description="Relevance to user's purpose"
    )
    sentiment: SentimentType = Field(description="Sentiment toward theme")
    example_tweets: List[str] = Field(
        default_factory=list,
        max_items=3,
        description="Example tweet IDs"
    )
    is_controversial: bool = Field(
        default=False,
        description="Whether theme is controversial"
    )


# ============================================================================
# Engagement Models
# ============================================================================

class EngagementMetrics(BaseModel):
    """Social media engagement analysis"""
    total_tweets: int = Field(description="Total tweets analyzed")
    average_likes: float = Field(description="Average likes per tweet")
    average_retweets: float = Field(description="Average retweets per tweet")
    average_replies: float = Field(description="Average replies per tweet")
    engagement_rate: float = Field(
        description="Overall engagement rate"
    )
    peak_engagement_times: List[str] = Field(
        default_factory=list,
        description="Times with highest engagement"
    )
    engagement_trend: str = Field(
        description="Trend: increasing, stable, or decreasing"
    )
    most_engaging_content_types: List[str] = Field(
        default_factory=list,
        description="Types of content with highest engagement"
    )


# ============================================================================
# Risk Assessment Models
# ============================================================================

class RiskFlag(BaseModel):
    """Individual risk flag"""
    category: RiskCategory = Field(description="Risk category")
    severity: RiskLevel = Field(description="Severity level")
    description: str = Field(description="Detailed description")
    evidence: List[str] = Field(
        default_factory=list,
        description="Evidence (tweet IDs or quotes)"
    )
    impact_assessment: str = Field(
        description="Potential impact on reputation"
    )
    mitigation_recommendation: str = Field(
        description="How to address this risk"
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence in this assessment"
    )


class AssociationRisk(BaseModel):
    """Risky association with entities or groups"""
    entity_name: str = Field(description="Entity or group name")
    association_type: str = Field(
        description="Type: member, follower, interaction, mention"
    )
    risk_category: RiskCategory = Field(description="Category of risk")
    severity: RiskLevel = Field(description="Severity level")
    evidence: str = Field(description="Specific evidence")
    justification: str = Field(description="Why this is flagged")
    context: str = Field(description="Additional context")


class ContentIntegrityIssue(BaseModel):
    """Content integrity or authenticity concerns"""
    content_type: str = Field(description="image, video, text")
    issue_type: str = Field(
        description="misinformation, manipulation, inappropriate"
    )
    severity: RiskLevel = Field(description="Severity level")
    description: str = Field(description="Detailed description")
    evidence: str = Field(description="Supporting evidence")
    verification_status: str = Field(
        description="verified, unverified, disputed"
    )


class RiskAssessment(BaseModel):
    """Comprehensive risk assessment"""
    overall_risk_score: float = Field(
        ge=0.0,
        le=100.0,
        description="Overall risk score (0=safe, 100=critical)"
    )
    risk_level: RiskLevel = Field(description="Overall risk level")
    flags: List[RiskFlag] = Field(
        default_factory=list,
        description="Individual risk flags"
    )
    association_risks: List[AssociationRisk] = Field(
        default_factory=list,
        description="Risky associations"
    )
    content_integrity_issues: List[ContentIntegrityIssue] = Field(
        default_factory=list,
        description="Content integrity concerns"
    )
    timeline_analysis: str = Field(
        description="Risk patterns over time"
    )
    escalation_required: bool = Field(
        default=False,
        description="Whether human review is required"
    )


# ============================================================================
# Bias Assessment Models
# ============================================================================

class BiasIndicator(BaseModel):
    """Individual bias indicator"""
    category: BiasCategory = Field(description="Bias category")
    strength: float = Field(
        ge=0.0,
        le=1.0,
        description="Strength of bias indicator"
    )
    description: str = Field(description="Description of bias")
    examples: List[str] = Field(
        default_factory=list,
        description="Example content"
    )
    is_problematic: bool = Field(
        default=False,
        description="Whether bias is potentially harmful"
    )


class GeopoliticalAlignment(BaseModel):
    """Geopolitical stance assessment"""
    alignment_score: float = Field(
        ge=0.0,
        le=100.0,
        description="0=highly controversial, 100=neutral/safe"
    )
    primary_affiliations: List[str] = Field(
        default_factory=list,
        description="Political/regional affiliations"
    )
    sensitive_topics: List[str] = Field(
        default_factory=list,
        description="Flagged geopolitical issues"
    )
    regional_risk_factors: List[str] = Field(
        default_factory=list,
        description="Context-specific risks"
    )
    international_relations_concerns: List[str] = Field(
        default_factory=list,
        description="International relations sensitivities"
    )


class BiasAnalysis(BaseModel):
    """Comprehensive bias assessment"""
    overall_bias_score: float = Field(
        ge=-1.0,
        le=1.0,
        description="-1=strong left bias, 0=neutral, 1=strong right bias"
    )
    bias_indicators: List[BiasIndicator] = Field(
        default_factory=list,
        description="Detected bias indicators"
    )
    political_leaning: str = Field(
        description="left, center, right, or mixed"
    )
    demographic_patterns: List[str] = Field(
        default_factory=list,
        description="Demographic bias patterns"
    )
    geopolitical_alignment: GeopoliticalAlignment = Field(
        description="Geopolitical stance"
    )
    neutrality_score: float = Field(
        ge=0.0,
        le=1.0,
        description="How neutral/balanced the content is"
    )
    recommendations: List[str] = Field(
        default_factory=list,
        description="How to improve balance"
    )


# ============================================================================
# Recommendation Models
# ============================================================================

class Recommendation(BaseModel):
    """Actionable recommendation"""
    category: str = Field(description="Recommendation category")
    priority: RiskLevel = Field(description="Priority level")
    title: str = Field(description="Short title")
    description: str = Field(description="Detailed recommendation")
    rationale: str = Field(description="Why this is recommended")
    expected_impact: str = Field(description="Expected positive impact")
    effort_level: str = Field(
        description="low, medium, or high effort required"
    )


# ============================================================================
# Full Analysis Result
# ============================================================================

class AnalysisResult(BaseModel):
    """Complete AI analysis result"""

    # Metadata
    analysis_id: str = Field(description="Unique analysis ID")
    user_id: str = Field(description="User ID")
    timestamp: datetime = Field(description="Analysis timestamp")
    tier: str = Field(description="Subscription tier: basic or pro")
    purpose: PurposeCategory = Field(description="Analysis purpose")
    model_used: str = Field(description="AI model used")

    # Core Analysis
    sentiment: SentimentScore = Field(description="Sentiment analysis")
    themes: List[Theme] = Field(description="Identified themes")
    engagement: EngagementMetrics = Field(description="Engagement metrics")
    risk_assessment: RiskAssessment = Field(description="Risk assessment")
    bias_indicators: BiasAnalysis = Field(description="Bias analysis")

    # Recommendations
    recommendations: List[Recommendation] = Field(
        description="Personalized recommendations"
    )

    # Summary
    executive_summary: str = Field(
        description="High-level summary for quick review"
    )
    key_findings: List[str] = Field(
        default_factory=list,
        max_items=5,
        description="Top 5 key findings"
    )

    # Processing metadata
    processing_time_ms: int = Field(description="Processing time")
    token_count: int = Field(description="Tokens used")
    confidence_level: float = Field(
        ge=0.0,
        le=1.0,
        description="Overall confidence in analysis"
    )
    human_review_required: bool = Field(
        default=False,
        description="Whether human review is needed"
    )

    # Raw data
    raw_response: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Full Claude response (optional)"
    )
    notes: Optional[str] = Field(
        default=None,
        description="Additional context or caveats"
    )

    @validator("confidence_level")
    def check_confidence_threshold(cls, v, values):
        """Flag for human review if confidence is low on high severity items"""
        if v < 0.7 and "risk_assessment" in values:
            risk = values["risk_assessment"]
            if any(f.severity in [RiskLevel.HIGH, RiskLevel.CRITICAL] for f in risk.flags):
                values["human_review_required"] = True
        return v


# ============================================================================
# Database Storage Model
# ============================================================================

class AnalysisResultDB(BaseModel):
    """Analysis result for database storage"""
    id: str
    user_id: str
    twitter_account_id: Optional[str]
    tier: str
    purpose: str

    # Analysis results as JSON
    sentiment_data: Dict[str, Any]
    themes_data: List[Dict[str, Any]]
    engagement_data: Dict[str, Any]
    risk_data: Dict[str, Any]
    bias_data: Dict[str, Any]
    recommendations_data: List[Dict[str, Any]]

    # Metadata
    executive_summary: str
    key_findings: List[str]
    model_used: str
    processing_time_ms: int
    token_count: int
    confidence_level: float
    human_review_required: bool

    # Timestamps
    created_at: datetime
    updated_at: datetime

    def to_analysis_result(self) -> AnalysisResult:
        """Convert database model to analysis result"""
        return AnalysisResult(
            analysis_id=self.id,
            user_id=self.user_id,
            timestamp=self.created_at,
            tier=self.tier,
            purpose=PurposeCategory(self.purpose),
            model_used=self.model_used,
            sentiment=SentimentScore(**self.sentiment_data),
            themes=[Theme(**t) for t in self.themes_data],
            engagement=EngagementMetrics(**self.engagement_data),
            risk_assessment=RiskAssessment(**self.risk_data),
            bias_indicators=BiasAnalysis(**self.bias_data),
            recommendations=[Recommendation(**r) for r in self.recommendations_data],
            executive_summary=self.executive_summary,
            key_findings=self.key_findings,
            processing_time_ms=self.processing_time_ms,
            token_count=self.token_count,
            confidence_level=self.confidence_level,
            human_review_required=self.human_review_required
        )


# ============================================================================
# Export
# ============================================================================

__all__ = [
    "RiskLevel",
    "SentimentType",
    "BiasCategory",
    "RiskCategory",
    "PurposeCategory",
    "SentimentScore",
    "Theme",
    "EngagementMetrics",
    "RiskFlag",
    "AssociationRisk",
    "ContentIntegrityIssue",
    "RiskAssessment",
    "BiasIndicator",
    "GeopoliticalAlignment",
    "BiasAnalysis",
    "Recommendation",
    "AnalysisResult",
    "AnalysisResultDB"
]
