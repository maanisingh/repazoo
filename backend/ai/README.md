# Repazoo AI Analysis System

## Overview

The Repazoo AI Analysis System is a comprehensive LangChain-powered Twitter reputation analysis platform with advanced risk detection and bias assessment capabilities. It uses Anthropic's Claude models to provide deep insights into social media presence, tailored to specific use cases.

## Architecture

### Core Components

```
backend/ai/
├── langchain_analyzer.py      # LangChain AI integration
├── analysis_pipeline.py        # End-to-end orchestration
├── risk_detector.py            # Risk and bias detection
├── purpose_handler.py          # Purpose personalization
├── schemas.py                  # Pydantic data models
├── config.py                   # Configuration and routing
├── prompts/
│   ├── analysis_prompt.py      # Main analysis prompts
│   └── risk_prompts.py         # Risk assessment prompts
└── tests/                      # Comprehensive test suite
```

### Data Flow

```
User Request
    ↓
Analysis Pipeline
    ↓
├─→ Fetch Twitter Data (Database)
├─→ Validate & Sanitize Data
├─→ LangChain Analyzer (Claude AI)
│   ├─→ Sentiment Analysis
│   ├─→ Theme Extraction
│   ├─→ Engagement Analysis
│   └─→ AI Risk Detection
├─→ Rule-Based Risk Detector
│   ├─→ Extremism Detection
│   ├─→ Hate Speech Detection
│   ├─→ Misinformation Detection
│   ├─→ Brand Safety Assessment
│   └─→ Professional Conduct Review
├─→ Bias Detector
│   ├─→ Political Bias Analysis
│   ├─→ Demographic Patterns
│   └─→ Geopolitical Alignment
├─→ Purpose Handler
│   └─→ Personalized Recommendations
├─→ Store Results (Database)
└─→ Return Analysis Result
```

## Tier-Based Model Routing

### Subscription Tiers

| Tier       | Model              | Token Limit | Use Case                    |
|------------|-------------------|-------------|-----------------------------|
| Free       | Claude 3 Haiku    | 4,096       | Basic exploration           |
| Basic      | Claude 3.5 Sonnet | 8,192       | Professional analysis       |
| Pro        | Claude 3.5 Opus   | 8,192       | Enterprise/critical use     |
| Enterprise | Claude 3.5 Opus   | 8,192       | Custom solutions            |

### Model Selection Logic

```python
from backend.ai import create_analyzer

# Automatic tier-based routing
analyzer = create_analyzer(tier="pro")  # Uses Claude 3.5 Opus
result = await analyzer.analyze(tweet_data, user_profile, purpose="visa_application")
```

## Features

### 1. Sentiment Analysis

- **Overall Sentiment Score**: -1.0 (very negative) to 1.0 (very positive)
- **Sentiment Distribution**: Positive/negative/neutral ratios
- **Concerning Patterns**: Identification of problematic sentiment trends
- **Sample Quotes**: Representative content examples

### 2. Theme Extraction

- Identifies top 5-7 themes/topics in content
- Calculates frequency and relevance scores
- Assesses sentiment toward each theme
- Flags controversial topics

### 3. Engagement Analysis

- Average likes, retweets, and replies
- Engagement rate calculation
- Peak engagement times and content types
- Trend analysis (increasing/stable/decreasing)

### 4. Risk Assessment

#### Risk Categories

- **Extremism**: Violent rhetoric, radicalization indicators
- **Hate Speech**: Discriminatory language, slurs, dehumanization
- **Misinformation**: False claims, conspiracy theories
- **Geopolitical**: International relations sensitivities
- **Brand Safety**: Content unsuitable for professional contexts
- **Professional Conduct**: Workplace complaints, unprofessional behavior
- **Controversial Topics**: Polarizing political/religious content

#### Risk Levels

- **Low** (0-30): Minimal concerns
- **Medium** (30-60): Some areas for improvement
- **High** (60-85): Significant reputation risks
- **Critical** (85-100): Severe risks requiring immediate action

### 5. Bias Detection

- **Political Bias**: Left/center/right classification
- **Bias Score**: -1.0 (far left) to 1.0 (far right)
- **Demographic Patterns**: Age, gender, cultural bias indicators
- **Geopolitical Alignment**: Foreign policy stance assessment
- **Neutrality Score**: Content balance measurement

### 6. Purpose Personalization

Analysis tailored to specific use cases:

#### Job Search
- Focus: Professional conduct, brand safety
- Highlights: Employer-concerning content
- Recommendations: Profile cleanup, skill showcasing

#### Visa Application
- Focus: Extremism, geopolitical sensitivity
- Highlights: Security concerns, foreign associations
- Recommendations: Content review, risk mitigation

#### Brand Building
- Focus: Engagement optimization, audience sentiment
- Highlights: Partnership opportunities, growth strategies
- Recommendations: Content strategy, brand safety

#### Political Campaign
- Focus: Message consistency, voter sentiment
- Highlights: Engagement patterns, controversy management
- Recommendations: Messaging refinement, constituent engagement

#### Security Clearance
- Focus: Extremism, trustworthiness indicators
- Highlights: Foreign connections, security risks
- Recommendations: Content documentation, professional consultation

## Usage

### Basic Usage

```python
from backend.ai import create_pipeline

# Create pipeline for user
pipeline = create_pipeline(user_id="user123", tier="pro")

# Run analysis
result = await pipeline.run_analysis(
    twitter_account_id="account456",
    purpose="job_search"
)

# Access results
print(f"Risk Score: {result.risk_assessment.overall_risk_score}")
print(f"Sentiment: {result.sentiment.overall_sentiment}")
print(f"Recommendations: {len(result.recommendations)}")
```

### Synchronous Usage

```python
# For non-async contexts
result = pipeline.run_analysis_sync(
    twitter_account_id="account456",
    purpose="visa_application"
)
```

### Direct Analyzer Usage

```python
from backend.ai import create_analyzer

analyzer = create_analyzer(tier="basic")

result = await analyzer.analyze(
    tweet_data={
        "tweets": [...],
        "total_count": 100,
        ...
    },
    user_profile={
        "username": "testuser",
        "follower_count": 1000,
        ...
    },
    purpose="brand_building"
)
```

### Risk Detection Only

```python
from backend.ai import RiskDetector, BiasDetector

# Risk detection
risk_detector = RiskDetector(purpose="security_clearance")
risk_score, risk_level, flags = risk_detector.detect_risks(tweet_data)

# Bias detection
bias_detector = BiasDetector()
bias_score, leaning, indicators = bias_detector.detect_political_bias(tweets)
```

## Output Schema

```python
{
  "analysis_id": "uuid",
  "user_id": "user123",
  "timestamp": "2024-01-15T10:30:00Z",
  "tier": "pro",
  "purpose": "job_search",

  "sentiment": {
    "overall_sentiment": "positive",
    "sentiment_score": 0.65,
    "positive_ratio": 0.7,
    "negative_ratio": 0.15,
    "neutral_ratio": 0.15,
    "confidence": 0.85,
    "concerning_patterns": [],
    "sample_quotes": [...]
  },

  "themes": [
    {
      "name": "Technology",
      "frequency": 45,
      "relevance_score": 0.9,
      "sentiment": "positive",
      "example_tweets": ["id1", "id2"],
      "is_controversial": false
    }
  ],

  "engagement": {
    "total_tweets": 150,
    "average_likes": 12.5,
    "average_retweets": 3.2,
    "average_replies": 1.8,
    "engagement_rate": 2.5,
    "peak_engagement_times": ["14:00-16:00"],
    "engagement_trend": "increasing",
    "most_engaging_content_types": ["technical posts"]
  },

  "risk_assessment": {
    "overall_risk_score": 25.0,
    "risk_level": "low",
    "flags": [...],
    "association_risks": [...],
    "content_integrity_issues": [...],
    "timeline_analysis": "...",
    "escalation_required": false
  },

  "bias_indicators": {
    "overall_bias_score": 0.1,
    "political_leaning": "center",
    "bias_indicators": [...],
    "demographic_patterns": [...],
    "geopolitical_alignment": {...},
    "neutrality_score": 0.85,
    "recommendations": [...]
  },

  "recommendations": [
    {
      "category": "content_cleanup",
      "priority": "high",
      "title": "Review High-Risk Content",
      "description": "...",
      "rationale": "...",
      "expected_impact": "...",
      "effort_level": "medium"
    }
  ],

  "executive_summary": "...",
  "key_findings": [...],
  "confidence_level": 0.85,
  "human_review_required": false,
  "processing_time_ms": 2500,
  "token_count": 1200
}
```

## Error Handling

### Quota Exceeded

```python
try:
    result = await pipeline.run_analysis(purpose="job_search")
except RuntimeError as e:
    if "quota" in str(e).lower():
        # Handle quota exceeded
        print("Analysis quota exceeded. Please upgrade.")
```

### Insufficient Data

```python
try:
    result = await pipeline.run_analysis()
except ValueError as e:
    if "insufficient tweets" in str(e).lower():
        # Handle insufficient data
        print("Not enough tweets for analysis. Minimum 10 required.")
```

### API Errors

The system includes automatic retry logic with exponential backoff for transient API errors.

## Configuration

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=your_api_key_here

# Optional
AI_MAX_RETRIES=3
AI_RETRY_DELAY=2
AI_TIMEOUT=60
```

### Custom Configuration

```python
from backend.ai.config import AnalysisConfig

# Customize analysis parameters
AnalysisConfig.MAX_TWEETS_TO_ANALYZE = 300
AnalysisConfig.MIN_CONFIDENCE_THRESHOLD = 0.7
AnalysisConfig.HIGH_RISK_THRESHOLD = 80.0
```

## Testing

```bash
# Run all AI tests
pytest backend/ai/tests/

# Run specific test file
pytest backend/ai/tests/test_langchain_analyzer.py

# Run with coverage
pytest backend/ai/tests/ --cov=backend.ai --cov-report=html

# Run async tests
pytest backend/ai/tests/ -v --asyncio-mode=auto
```

## Performance

### Typical Processing Times

- **Basic Tier (Haiku)**: 1-2 seconds
- **Pro Tier (Opus)**: 2-4 seconds
- **Batch Analysis**: ~1.5 seconds per analysis

### Token Usage

- **Average Input**: 800-1200 tokens
- **Average Output**: 600-1000 tokens
- **Total per Analysis**: 1400-2200 tokens

### Cost Estimates (Per 1000 Analyses)

- **Basic Tier**: ~$4.50
- **Pro Tier**: ~$36.00

## Best Practices

1. **Cache Results**: Analysis results are stored in database with timestamps
2. **Batch Processing**: Use purpose-specific batches for efficiency
3. **Error Handling**: Always wrap analysis calls in try-catch blocks
4. **Quota Management**: Check quotas before expensive operations
5. **Human Review**: Flag low-confidence high-severity items for review

## Integration with Prefect

```python
from prefect import flow, task
from backend.ai import create_pipeline

@task
async def run_ai_analysis(user_id: str, tier: str, purpose: str):
    pipeline = create_pipeline(user_id=user_id, tier=tier)
    result = await pipeline.run_analysis(purpose=purpose)
    return result

@flow
async def batch_analysis_workflow(user_ids: list[str]):
    results = []
    for user_id in user_ids:
        result = await run_ai_analysis(user_id, "pro", "job_search")
        results.append(result)
    return results
```

## Monitoring and Logging

All analysis operations are logged with:

- User ID and tier
- Purpose and timestamp
- Processing time and token count
- Risk scores and flags
- Errors and retries

Access logs via application logging or audit_log table.

## Roadmap

- [ ] Multi-language support
- [ ] Image/video content analysis
- [ ] Real-time streaming analysis
- [ ] Custom risk keyword databases
- [ ] Enhanced geopolitical intelligence
- [ ] Comparative analysis (before/after)
- [ ] Automated content recommendations
- [ ] Integration with content moderation APIs

## Support

For issues or questions:
- GitHub Issues: [repazoo/issues](https://github.com/repazoo/issues)
- Documentation: [docs.repazoo.com](https://docs.repazoo.com)
- Email: support@repazoo.com
