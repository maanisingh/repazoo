"""
Analysis Prompt Templates
Comprehensive prompts for Twitter reputation analysis
"""

from typing import Dict, Any, List
from datetime import datetime


# ============================================================================
# System Prompt
# ============================================================================

SYSTEM_PROMPT = """You are an elite Reputation Risk & Bias Assessment Specialist with deep expertise in digital forensics, sentiment analysis, geopolitical intelligence, and content moderation. Your mission is to analyze social media data and produce comprehensive, actionable risk assessments.

**Core Principles:**
1. Objectivity: Base all assessments on observable evidence
2. Cultural Sensitivity: Account for cultural context and regional norms
3. Temporal Awareness: Consider timeline of posts and activities
4. Proportionality: Distinguish between minor infractions and serious red flags
5. Transparency: Provide clear justifications for every flagged item

You MUST return ONLY valid JSON in the exact schema provided. Do not include any explanatory text before or after the JSON."""


# ============================================================================
# Base Analysis Prompt
# ============================================================================

def get_analysis_prompt(
    purpose: str,
    tweet_data: Dict[str, Any],
    user_profile: Dict[str, Any],
    analysis_config: Dict[str, Any]
) -> str:
    """
    Generate comprehensive analysis prompt

    Args:
        purpose: User's stated purpose for analysis
        tweet_data: Aggregated tweet data
        user_profile: Twitter profile information
        analysis_config: Analysis configuration parameters

    Returns:
        Formatted prompt string
    """

    prompt = f"""Analyze the following Twitter data for reputation and sentiment insights.

**USER'S PURPOSE**: {purpose}
**ANALYSIS DATE**: {datetime.now().strftime('%Y-%m-%d')}

**PROFILE INFORMATION:**
- Username: @{user_profile.get('username', 'unknown')}
- Display Name: {user_profile.get('display_name', 'N/A')}
- Follower Count: {user_profile.get('follower_count', 0):,}
- Following Count: {user_profile.get('following_count', 0):,}
- Account Created: {user_profile.get('created_at', 'N/A')}
- Verified: {user_profile.get('verified', False)}
- Bio: {user_profile.get('bio', 'N/A')}

**TWEET DATA:**
- Total Tweets Analyzed: {tweet_data.get('total_count', 0)}
- Date Range: {tweet_data.get('date_range', 'N/A')}
- Average Engagement: {tweet_data.get('avg_engagement', 0):.2f}

**RECENT TWEETS:**
{_format_tweets(tweet_data.get('tweets', []))}

**ENGAGEMENT SUMMARY:**
- Total Likes: {tweet_data.get('total_likes', 0):,}
- Total Retweets: {tweet_data.get('total_retweets', 0):,}
- Total Replies: {tweet_data.get('total_replies', 0):,}

**ANALYSIS REQUIREMENTS:**

Perform a comprehensive analysis covering:

1. **Sentiment Analysis**:
   - Overall sentiment score (-1.0 to 1.0)
   - Positive/negative/neutral ratio
   - Concerning patterns or language
   - Representative quotes

2. **Theme Extraction**:
   - Top 5-7 themes or topics
   - Frequency and relevance of each theme
   - Sentiment toward each theme
   - Flag controversial themes

3. **Engagement Analysis**:
   - Engagement patterns and trends
   - Peak engagement times/content types
   - Most/least engaging content
   - Engagement rate trends

4. **Risk Assessment**:
   - Overall risk score (0-100)
   - Specific risk flags with severity levels
   - Controversial topics or associations
   - Misinformation indicators
   - Brand safety concerns
   - Professional conduct issues
   - {_get_purpose_specific_risks(purpose)}

5. **Bias Detection**:
   - Political bias indicators (left/center/right)
   - Demographic or cultural bias patterns
   - Geopolitical alignment assessment
   - Controversial affiliations
   - Neutrality score

6. **Personalized Recommendations**:
   Based on purpose "{purpose}", provide:
   - {_get_purpose_specific_recommendations(purpose)}
   - Priority-ranked action items
   - Risk mitigation strategies
   - Reputation improvement suggestions

**CRITICAL INSTRUCTIONS:**
- For purpose "{purpose}", pay special attention to: {_get_focus_areas(purpose)}
- Use the provided evidence (tweet IDs/quotes) to support all findings
- Flag any content requiring human review
- Calculate confidence levels for all assessments
- Consider cultural and temporal context
- Distinguish between genuine concerns and acceptable variation

{_get_json_schema()}

Return ONLY the JSON object with no additional text."""

    return prompt


# ============================================================================
# Helper Functions
# ============================================================================

def _format_tweets(tweets: List[Dict[str, Any]]) -> str:
    """Format tweets for prompt"""
    if not tweets:
        return "No tweets provided"

    formatted = []
    for i, tweet in enumerate(tweets[:50], 1):  # Limit to 50 tweets
        text = tweet.get('text', '')[:280]  # Truncate if needed
        likes = tweet.get('likes', 0)
        retweets = tweet.get('retweets', 0)
        date = tweet.get('created_at', 'N/A')

        formatted.append(
            f"[Tweet {i}] ({date})\n"
            f"  {text}\n"
            f"  Engagement: {likes} likes, {retweets} retweets\n"
        )

    return "\n".join(formatted)


def _get_purpose_specific_risks(purpose: str) -> str:
    """Get purpose-specific risk areas to focus on"""
    risk_focus = {
        "job_search": "Professional conduct issues, controversial statements, inappropriate content for employers",
        "visa_application": "Extremism indicators, geopolitical sensitivities, controversial associations, security concerns",
        "brand_building": "Brand safety issues, controversial topics that could alienate audience, reputation risks",
        "political_campaign": "Misinformation, controversial statements, inconsistent messaging, opponent attack vectors",
        "security_clearance": "Extremism, foreign associations, trustworthiness indicators, security risks",
        "personal_reputation": "Brand safety, controversial topics, negative sentiment patterns, professional conduct",
        "career_development": "Professional conduct, skill endorsements, thought leadership credibility",
        "influencer": "Brand safety, controversial content, audience sentiment, engagement authenticity"
    }
    return risk_focus.get(purpose.lower(), "General reputation risks")


def _get_purpose_specific_recommendations(purpose: str) -> str:
    """Get purpose-specific recommendation focus"""
    rec_focus = {
        "job_search": "Content that could concern employers, professional tone improvements, skill highlight opportunities",
        "visa_application": "Content to review before application, potential red flags to address, supporting evidence to emphasize",
        "brand_building": "Content strategy improvements, engagement optimization, audience growth tactics",
        "political_campaign": "Messaging consistency, voter sentiment insights, opponent differentiation strategies",
        "security_clearance": "Content to address or explain, risk mitigation strategies, trustworthiness enhancements",
        "personal_reputation": "Reputation improvement tactics, content strategy refinements, risk mitigation",
        "career_development": "Thought leadership opportunities, professional branding improvements, network growth strategies",
        "influencer": "Content optimization, engagement strategies, brand partnership readiness"
    }
    return rec_focus.get(purpose.lower(), "General reputation management recommendations")


def _get_focus_areas(purpose: str) -> str:
    """Get focus areas for purpose"""
    focus_areas = {
        "job_search": "professional conduct, controversial content, brand safety, skill demonstrations",
        "visa_application": "extremism indicators, geopolitical alignment, controversial associations, security concerns",
        "brand_building": "engagement patterns, audience sentiment, brand safety, content consistency",
        "political_campaign": "political messaging, misinformation, controversy management, public sentiment",
        "security_clearance": "extremism, foreign associations, trustworthiness, security risks",
        "personal_reputation": "overall sentiment, brand safety, controversial topics, professional conduct",
        "career_development": "professional expertise, thought leadership, industry engagement",
        "influencer": "engagement authenticity, brand safety, audience sentiment, content quality"
    }
    return focus_areas.get(purpose.lower(), "overall reputation and sentiment")


def _get_json_schema() -> str:
    """Get JSON schema for output"""
    return """
**REQUIRED JSON OUTPUT SCHEMA:**
```json
{
  "sentiment": {
    "overall_sentiment": "positive|neutral|negative|mixed",
    "sentiment_score": -1.0 to 1.0,
    "positive_ratio": 0.0 to 1.0,
    "negative_ratio": 0.0 to 1.0,
    "neutral_ratio": 0.0 to 1.0,
    "confidence": 0.0 to 1.0,
    "concerning_patterns": ["list of patterns"],
    "sample_quotes": ["representative quotes"]
  },
  "themes": [
    {
      "name": "theme name",
      "frequency": count,
      "relevance_score": 0.0 to 1.0,
      "sentiment": "positive|neutral|negative",
      "example_tweets": ["tweet IDs or indices"],
      "is_controversial": true|false
    }
  ],
  "engagement": {
    "total_tweets": count,
    "average_likes": float,
    "average_retweets": float,
    "average_replies": float,
    "engagement_rate": float,
    "peak_engagement_times": ["times or patterns"],
    "engagement_trend": "increasing|stable|decreasing",
    "most_engaging_content_types": ["types"]
  },
  "risk_assessment": {
    "overall_risk_score": 0.0 to 100.0,
    "risk_level": "low|medium|high|critical",
    "flags": [
      {
        "category": "extremism|hate_speech|misinformation|controversial_topics|brand_safety|political_sensitivity|geopolitical|professional_conduct",
        "severity": "low|medium|high|critical",
        "description": "detailed description",
        "evidence": ["tweet IDs or quotes"],
        "impact_assessment": "potential impact",
        "mitigation_recommendation": "how to address",
        "confidence": 0.0 to 1.0
      }
    ],
    "association_risks": [
      {
        "entity_name": "name",
        "association_type": "member|follower|interaction|mention",
        "risk_category": "extremism|hate_speech|political_sensitivity|controversial_topics",
        "severity": "low|medium|high|critical",
        "evidence": "specific evidence",
        "justification": "why flagged",
        "context": "additional context"
      }
    ],
    "content_integrity_issues": [
      {
        "content_type": "image|video|text",
        "issue_type": "misinformation|manipulation|inappropriate",
        "severity": "low|medium|high|critical",
        "description": "description",
        "evidence": "evidence",
        "verification_status": "verified|unverified|disputed"
      }
    ],
    "timeline_analysis": "risk patterns over time",
    "escalation_required": true|false
  },
  "bias_indicators": {
    "overall_bias_score": -1.0 to 1.0,
    "bias_indicators": [
      {
        "category": "political_left|political_right|political_neutral|demographic|ideological|cultural|religious",
        "strength": 0.0 to 1.0,
        "description": "description",
        "examples": ["examples"],
        "is_problematic": true|false
      }
    ],
    "political_leaning": "left|center|right|mixed",
    "demographic_patterns": ["patterns"],
    "geopolitical_alignment": {
      "alignment_score": 0.0 to 100.0,
      "primary_affiliations": ["affiliations"],
      "sensitive_topics": ["topics"],
      "regional_risk_factors": ["factors"],
      "international_relations_concerns": ["concerns"]
    },
    "neutrality_score": 0.0 to 1.0,
    "recommendations": ["how to improve balance"]
  },
  "recommendations": [
    {
      "category": "category",
      "priority": "low|medium|high|critical",
      "title": "short title",
      "description": "detailed recommendation",
      "rationale": "why recommended",
      "expected_impact": "expected positive impact",
      "effort_level": "low|medium|high"
    }
  ],
  "executive_summary": "2-3 sentence high-level summary",
  "key_findings": ["top 5 key findings"],
  "confidence_level": 0.0 to 1.0,
  "human_review_required": true|false,
  "notes": "additional context or caveats (optional)"
}
```
"""


# ============================================================================
# Retry Prompt
# ============================================================================

def get_retry_prompt(original_response: str, error_message: str) -> str:
    """Generate prompt for retry after JSON parsing failure"""
    return f"""The previous response could not be parsed as valid JSON.

ERROR: {error_message}

PREVIOUS RESPONSE:
{original_response[:500]}...

Please provide a valid JSON response following the exact schema specified. Ensure:
1. All fields are present and correctly named
2. Values match the specified types and ranges
3. No trailing commas
4. All strings are properly quoted
5. All brackets and braces are balanced

Return ONLY the JSON object with no additional text or explanation."""


# ============================================================================
# Export
# ============================================================================

__all__ = [
    "SYSTEM_PROMPT",
    "get_analysis_prompt",
    "get_retry_prompt"
]
