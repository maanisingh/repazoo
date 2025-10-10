"""
Purpose Personalization Handler
Tailors analysis and recommendations based on user's stated purpose
"""

import logging
from typing import Dict, Any, List
from .schemas import Recommendation, RiskLevel, PurposeCategory

logger = logging.getLogger(__name__)


# ============================================================================
# Purpose Handler
# ============================================================================

class PurposeHandler:
    """
    Personalizes analysis based on user's purpose
    """

    def __init__(self, purpose: str):
        """
        Initialize purpose handler

        Args:
            purpose: User's stated analysis purpose
        """
        try:
            self.purpose = PurposeCategory(purpose.lower())
        except ValueError:
            logger.warning(f"Unknown purpose '{purpose}', defaulting to personal_reputation")
            self.purpose = PurposeCategory.PERSONAL_REPUTATION

        self.config = self._load_purpose_config()

    def _load_purpose_config(self) -> Dict[str, Any]:
        """Load configuration for purpose"""
        configs = {
            PurposeCategory.JOB_SEARCH: {
                "focus_areas": [
                    "professional_tone",
                    "controversial_content",
                    "brand_safety",
                    "skill_endorsements",
                    "workplace_conduct"
                ],
                "risk_sensitivity": "high",
                "recommendation_focus": "employer_perspective",
                "critical_flags": [
                    "hate_speech",
                    "extremism",
                    "professional_conduct",
                    "brand_safety"
                ]
            },
            PurposeCategory.VISA_APPLICATION: {
                "focus_areas": [
                    "geopolitical_alignment",
                    "extremism",
                    "controversial_associations",
                    "misinformation",
                    "security_concerns"
                ],
                "risk_sensitivity": "critical",
                "recommendation_focus": "immigration_compliance",
                "critical_flags": [
                    "extremism",
                    "hate_speech",
                    "geopolitical",
                    "misinformation"
                ]
            },
            PurposeCategory.BRAND_BUILDING: {
                "focus_areas": [
                    "engagement_patterns",
                    "content_themes",
                    "audience_sentiment",
                    "brand_safety",
                    "content_consistency"
                ],
                "risk_sensitivity": "medium",
                "recommendation_focus": "growth_strategy",
                "critical_flags": [
                    "brand_safety",
                    "controversial_topics"
                ]
            },
            PurposeCategory.POLITICAL_CAMPAIGN: {
                "focus_areas": [
                    "political_bias",
                    "controversial_topics",
                    "public_sentiment",
                    "engagement_patterns",
                    "message_consistency"
                ],
                "risk_sensitivity": "medium",
                "recommendation_focus": "political_strategy",
                "critical_flags": [
                    "misinformation",
                    "hate_speech",
                    "controversial_topics"
                ]
            },
            PurposeCategory.SECURITY_CLEARANCE: {
                "focus_areas": [
                    "extremism",
                    "foreign_associations",
                    "controversial_content",
                    "misinformation",
                    "trustworthiness_indicators"
                ],
                "risk_sensitivity": "critical",
                "recommendation_focus": "security_compliance",
                "critical_flags": [
                    "extremism",
                    "hate_speech",
                    "geopolitical",
                    "misinformation",
                    "controversial_topics"
                ]
            },
            PurposeCategory.PERSONAL_REPUTATION: {
                "focus_areas": [
                    "overall_sentiment",
                    "brand_safety",
                    "controversial_topics",
                    "engagement_patterns"
                ],
                "risk_sensitivity": "medium",
                "recommendation_focus": "general_improvement",
                "critical_flags": [
                    "hate_speech",
                    "brand_safety",
                    "professional_conduct"
                ]
            },
            PurposeCategory.CAREER_DEVELOPMENT: {
                "focus_areas": [
                    "professional_expertise",
                    "thought_leadership",
                    "industry_engagement",
                    "professional_tone"
                ],
                "risk_sensitivity": "medium",
                "recommendation_focus": "professional_growth",
                "critical_flags": [
                    "professional_conduct",
                    "brand_safety"
                ]
            },
            PurposeCategory.INFLUENCER: {
                "focus_areas": [
                    "engagement_authenticity",
                    "brand_safety",
                    "audience_sentiment",
                    "content_quality"
                ],
                "risk_sensitivity": "medium",
                "recommendation_focus": "influencer_optimization",
                "critical_flags": [
                    "brand_safety",
                    "controversial_topics"
                ]
            }
        }

        return configs.get(self.purpose, configs[PurposeCategory.PERSONAL_REPUTATION])

    def personalize_recommendations(
        self,
        analysis_result: Dict[str, Any]
    ) -> List[Recommendation]:
        """
        Generate personalized recommendations based on purpose

        Args:
            analysis_result: AI analysis results

        Returns:
            List of personalized recommendations
        """
        recommendations = []

        # Extract relevant data
        sentiment = analysis_result.get("sentiment", {})
        risk_assessment = analysis_result.get("risk_assessment", {})
        engagement = analysis_result.get("engagement", {})
        bias_indicators = analysis_result.get("bias_indicators", {})

        # Generate purpose-specific recommendations
        if self.purpose == PurposeCategory.JOB_SEARCH:
            recommendations.extend(
                self._job_search_recommendations(
                    sentiment, risk_assessment, engagement
                )
            )
        elif self.purpose == PurposeCategory.VISA_APPLICATION:
            recommendations.extend(
                self._visa_recommendations(
                    risk_assessment, bias_indicators
                )
            )
        elif self.purpose == PurposeCategory.BRAND_BUILDING:
            recommendations.extend(
                self._brand_building_recommendations(
                    engagement, sentiment, risk_assessment
                )
            )
        elif self.purpose == PurposeCategory.POLITICAL_CAMPAIGN:
            recommendations.extend(
                self._political_campaign_recommendations(
                    bias_indicators, engagement, sentiment
                )
            )
        elif self.purpose == PurposeCategory.SECURITY_CLEARANCE:
            recommendations.extend(
                self._security_clearance_recommendations(
                    risk_assessment, bias_indicators
                )
            )
        else:
            recommendations.extend(
                self._general_recommendations(
                    sentiment, risk_assessment, engagement
                )
            )

        return recommendations

    def _job_search_recommendations(
        self,
        sentiment: Dict[str, Any],
        risk_assessment: Dict[str, Any],
        engagement: Dict[str, Any]
    ) -> List[Recommendation]:
        """Generate job search specific recommendations"""
        recs = []

        # Check for high-risk content
        if risk_assessment.get("overall_risk_score", 0) > 60:
            recs.append(Recommendation(
                category="content_cleanup",
                priority=RiskLevel.HIGH,
                title="Review High-Risk Content Before Job Applications",
                description="Your profile contains content that may concern potential employers. Review and consider removing or making private any controversial or unprofessional posts.",
                rationale="Employers frequently review social media during hiring processes",
                expected_impact="Significantly improve hiring prospects",
                effort_level="medium"
            ))

        # Check professional tone
        negative_ratio = sentiment.get("negative_ratio", 0)
        if negative_ratio > 0.4:
            recs.append(Recommendation(
                category="sentiment_improvement",
                priority=RiskLevel.MEDIUM,
                title="Balance Negative Content with Positive Posts",
                description=f"{negative_ratio:.0%} of your content is negative. Balance this with more positive, constructive posts to present a more optimistic professional image.",
                rationale="Employers prefer candidates with positive, solution-oriented attitudes",
                expected_impact="Improve perceived professional attitude",
                effort_level="low"
            ))

        # Highlight skills
        recs.append(Recommendation(
            category="skill_endorsement",
            priority=RiskLevel.LOW,
            title="Showcase Professional Skills and Achievements",
            description="Use Twitter to highlight your professional skills, certifications, and achievements. Share industry insights and engage with professional content.",
            rationale="Demonstrates expertise and commitment to your field",
            expected_impact="Strengthen professional brand",
            effort_level="low"
        ))

        return recs

    def _visa_recommendations(
        self,
        risk_assessment: Dict[str, Any],
        bias_indicators: Dict[str, Any]
    ) -> List[Recommendation]:
        """Generate visa application specific recommendations"""
        recs = []

        # Check for critical risks
        flags = risk_assessment.get("flags", [])
        critical_flags = [
            f for f in flags
            if f.get("severity") in ["high", "critical"]
        ]

        if critical_flags:
            recs.append(Recommendation(
                category="risk_mitigation",
                priority=RiskLevel.CRITICAL,
                title="Address Critical Content Before Visa Application",
                description=f"Found {len(critical_flags)} high-severity issues that could impact visa approval. These require immediate attention and potentially professional consultation.",
                rationale="Visa officers conduct thorough social media reviews",
                expected_impact="Critical for visa approval",
                effort_level="high"
            ))

        # Check geopolitical alignment
        geo_score = bias_indicators.get("geopolitical_alignment", {}).get("alignment_score", 50)
        if geo_score < 40:
            recs.append(Recommendation(
                category="geopolitical_risk",
                priority=RiskLevel.HIGH,
                title="Review Geopolitically Sensitive Content",
                description="Your posts contain geopolitically sensitive topics that may raise concerns. Consider providing context or removing inflammatory content.",
                rationale="Visa applications are sensitive to international relations concerns",
                expected_impact="Improve application approval chances",
                effort_level="medium"
            ))

        return recs

    def _brand_building_recommendations(
        self,
        engagement: Dict[str, Any],
        sentiment: Dict[str, Any],
        risk_assessment: Dict[str, Any]
    ) -> List[Recommendation]:
        """Generate brand building specific recommendations"""
        recs = []

        # Check engagement rate
        engagement_rate = engagement.get("engagement_rate", 0)
        if engagement_rate < 2.0:  # Less than 2% engagement
            recs.append(Recommendation(
                category="engagement_optimization",
                priority=RiskLevel.MEDIUM,
                title="Improve Content Engagement Strategy",
                description=f"Current engagement rate is {engagement_rate:.2%}. Focus on creating more interactive content, asking questions, and engaging with your audience.",
                rationale="Higher engagement builds stronger audience relationships",
                expected_impact="Increase reach and influence",
                effort_level="medium"
            ))

        # Check sentiment consistency
        positive_ratio = sentiment.get("positive_ratio", 0)
        if positive_ratio < 0.4:
            recs.append(Recommendation(
                category="content_tone",
                priority=RiskLevel.MEDIUM,
                title="Increase Positive, Value-Adding Content",
                description="Shift content balance toward more positive, inspirational, and educational posts. This attracts and retains followers.",
                rationale="Positive content generally receives better engagement",
                expected_impact="Grow and retain audience",
                effort_level="low"
            ))

        # Brand safety
        if risk_assessment.get("overall_risk_score", 0) > 40:
            recs.append(Recommendation(
                category="brand_safety",
                priority=RiskLevel.HIGH,
                title="Improve Brand Safety for Partnership Opportunities",
                description="Some content may limit brand partnership opportunities. Review and adjust controversial or unsafe content to be more brand-friendly.",
                rationale="Brands partner with safe, non-controversial influencers",
                expected_impact="Unlock partnership opportunities",
                effort_level="medium"
            ))

        return recs

    def _political_campaign_recommendations(
        self,
        bias_indicators: Dict[str, Any],
        engagement: Dict[str, Any],
        sentiment: Dict[str, Any]
    ) -> List[Recommendation]:
        """Generate political campaign specific recommendations"""
        recs = []

        # Check message consistency
        political_leaning = bias_indicators.get("political_leaning", "mixed")
        if political_leaning == "mixed":
            recs.append(Recommendation(
                category="message_consistency",
                priority=RiskLevel.MEDIUM,
                title="Clarify and Strengthen Political Messaging",
                description="Your political messaging appears mixed or inconsistent. Develop clearer, more consistent policy positions.",
                rationale="Clear messaging builds trust and attracts committed supporters",
                expected_impact="Strengthen supporter base",
                effort_level="medium"
            ))

        # Engagement with constituents
        engagement_trend = engagement.get("engagement_trend", "stable")
        if engagement_trend == "decreasing":
            recs.append(Recommendation(
                category="voter_engagement",
                priority=RiskLevel.HIGH,
                title="Increase Constituent Engagement",
                description="Your engagement is trending downward. Increase interaction with supporters, respond to comments, and host Q&A sessions.",
                rationale="Direct engagement builds voter loyalty",
                expected_impact="Improve voter connection and turnout",
                effort_level="high"
            ))

        return recs

    def _security_clearance_recommendations(
        self,
        risk_assessment: Dict[str, Any],
        bias_indicators: Dict[str, Any]
    ) -> List[Recommendation]:
        """Generate security clearance specific recommendations"""
        recs = []

        # Check for any risks
        if risk_assessment.get("overall_risk_score", 0) > 30:
            recs.append(Recommendation(
                category="security_risk",
                priority=RiskLevel.CRITICAL,
                title="Address All Security Concerns Before Clearance Application",
                description="Any flagged content could jeopardize security clearance. Consult with a security clearance attorney before applying.",
                rationale="Security clearance reviews are extremely thorough",
                expected_impact="Critical for clearance approval",
                effort_level="high"
            ))

        # Foreign associations
        geo_concerns = bias_indicators.get("geopolitical_alignment", {}).get("international_relations_concerns", [])
        if geo_concerns:
            recs.append(Recommendation(
                category="foreign_associations",
                priority=RiskLevel.HIGH,
                title="Document Foreign Associations and Context",
                description="Prepare explanations for any foreign associations or interests. Document the nature and extent of these relationships.",
                rationale="Foreign connections require full disclosure and explanation",
                expected_impact="Improve clearance process transparency",
                effort_level="high"
            ))

        return recs

    def _general_recommendations(
        self,
        sentiment: Dict[str, Any],
        risk_assessment: Dict[str, Any],
        engagement: Dict[str, Any]
    ) -> List[Recommendation]:
        """Generate general reputation management recommendations"""
        recs = []

        # Basic sentiment improvement
        if sentiment.get("sentiment_score", 0) < 0:
            recs.append(Recommendation(
                category="sentiment",
                priority=RiskLevel.MEDIUM,
                title="Improve Overall Sentiment",
                description="Your overall sentiment is negative. Consider posting more positive, uplifting content.",
                rationale="Positive online presence attracts better opportunities",
                expected_impact="Improve overall reputation",
                effort_level="low"
            ))

        # Risk mitigation
        if risk_assessment.get("overall_risk_score", 0) > 50:
            recs.append(Recommendation(
                category="risk_reduction",
                priority=RiskLevel.HIGH,
                title="Review and Remove High-Risk Content",
                description="Some content poses reputation risks. Review flagged items and consider removal.",
                rationale="Proactive reputation management prevents future issues",
                expected_impact="Reduce reputation vulnerabilities",
                effort_level="medium"
            ))

        return recs

    def get_focus_areas(self) -> List[str]:
        """Get focus areas for this purpose"""
        return self.config.get("focus_areas", [])

    def get_critical_flags(self) -> List[str]:
        """Get critical flag categories for this purpose"""
        return self.config.get("critical_flags", [])

    def get_risk_sensitivity(self) -> str:
        """Get risk sensitivity level for this purpose"""
        return self.config.get("risk_sensitivity", "medium")


# ============================================================================
# Export
# ============================================================================

__all__ = [
    "PurposeHandler"
]
