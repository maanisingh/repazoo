# Prompt Engineering Documentation

## Overview

Repazoo's AI analysis system uses carefully engineered prompts to ensure consistent, accurate, and actionable reputation analysis. This document explains the prompt design philosophy, structure, and optimization techniques.

## Prompt Design Philosophy

### Core Principles

1. **Clarity**: Unambiguous instructions with clear objectives
2. **Structure**: Organized format with distinct sections
3. **Context**: Sufficient background for informed analysis
4. **Constraints**: Explicit output requirements and limitations
5. **Examples**: Schema templates for consistent formatting

### Design Goals

- **Consistency**: Same input → same output structure
- **Accuracy**: Minimize hallucinations and misinterpretations
- **Actionability**: Generate useful, implementable recommendations
- **Efficiency**: Optimize token usage without sacrificing quality
- **Adaptability**: Support multiple purposes with single framework

## System Prompt Architecture

### Base System Prompt

```
You are an elite Reputation Risk & Bias Assessment Specialist with deep
expertise in digital forensics, sentiment analysis, geopolitical intelligence,
and content moderation.

**Core Principles:**
1. Objectivity: Base all assessments on observable evidence
2. Cultural Sensitivity: Account for cultural context and regional norms
3. Temporal Awareness: Consider timeline of posts and activities
4. Proportionality: Distinguish between minor infractions and serious red flags
5. Transparency: Provide clear justifications for every flagged item

You MUST return ONLY valid JSON in the exact schema provided.
```

**Design Rationale:**
- **Role Definition**: Establishes expertise and authority
- **Core Principles**: Guides analysis approach
- **Output Constraint**: Ensures structured, parseable responses

### Purpose Specialization

The system prompt adapts based on analysis purpose:

**Job Search Context:**
```
For this JOB SEARCH analysis, prioritize:
- Professional conduct and tone
- Content that might concern employers
- Brand safety for workplace contexts
- Skill demonstrations and expertise signals
```

**Visa Application Context:**
```
For this VISA APPLICATION analysis, prioritize:
- Security concerns and extremism indicators
- Geopolitical sensitivities
- Foreign associations
- Trustworthiness signals
```

**Brand Building Context:**
```
For this BRAND BUILDING analysis, prioritize:
- Engagement optimization opportunities
- Audience sentiment and growth
- Partnership-readiness
- Content strategy effectiveness
```

## Prompt Structure

### 1. Context Section

```
**USER'S PURPOSE**: {purpose}
**ANALYSIS DATE**: {current_date}

**PROFILE INFORMATION:**
- Username: @{username}
- Follower Count: {follower_count:,}
- Verified: {verified}
- Bio: {bio}
```

**Purpose**: Provides essential context for analysis

### 2. Data Section

```
**TWEET DATA:**
- Total Tweets Analyzed: {tweet_count}
- Date Range: {date_range}
- Average Engagement: {avg_engagement}

**RECENT TWEETS:**
[Tweet 1] (2024-01-15)
  "Content here..."
  Engagement: 10 likes, 5 retweets

[Tweet 2] (2024-01-14)
  "Content here..."
  Engagement: 15 likes, 8 retweets
```

**Purpose**: Presents data in structured, scannable format

**Optimization Techniques:**
- Limit to 50 most recent/relevant tweets
- Truncate tweets to 280 characters
- Include engagement metrics for context
- Chronological ordering for pattern detection

### 3. Analysis Requirements

```
**ANALYSIS REQUIREMENTS:**

Perform comprehensive analysis covering:

1. **Sentiment Analysis**:
   - Overall sentiment score (-1.0 to 1.0)
   - Positive/negative/neutral ratio
   - Concerning patterns
   - Representative quotes

2. **Theme Extraction**:
   - Top 5-7 themes
   - Frequency and relevance
   - Sentiment per theme
   - Controversial topics

[... additional categories ...]
```

**Purpose**: Explicit, detailed instructions for each analysis component

**Design Choices:**
- Numbered sections for clarity
- Bullet points for sub-requirements
- Specific ranges (e.g., -1.0 to 1.0)
- Clear expectations (e.g., "top 5-7")

### 4. Purpose-Specific Focus

```
**CRITICAL INSTRUCTIONS:**
- For purpose "{purpose}", pay special attention to: {focus_areas}
- Use provided evidence (tweet IDs/quotes) to support findings
- Flag any content requiring human review
- Calculate confidence levels for all assessments
- Consider cultural and temporal context
```

**Purpose**: Tailors analysis to user's specific needs

**Dynamic Elements:**
- `{focus_areas}`: Varies by purpose (professional conduct, geopolitical risks, etc.)
- `{critical_flags}`: Purpose-specific red flags to prioritize

### 5. Output Schema

```
**REQUIRED JSON OUTPUT SCHEMA:**
```json
{
  "sentiment": {
    "overall_sentiment": "positive|neutral|negative|mixed",
    "sentiment_score": -1.0 to 1.0,
    ...
  },
  ...
}
```

Return ONLY the JSON object with no additional text.
```

**Purpose**: Ensures consistent, parseable output

**Schema Design:**
- Explicit type constraints
- Range specifications
- Enum options for categorical fields
- Required vs. optional fields clearly marked

## Prompt Optimization Techniques

### 1. Token Efficiency

**Strategy**: Maximize information density while minimizing tokens

**Techniques:**
- Abbreviate repetitive patterns
- Use structured formats (tables, lists)
- Truncate long tweets
- Limit example count
- Remove unnecessary whitespace

**Example:**
```
Before (verbose):
Please analyze the sentiment of each tweet and provide an overall sentiment
score ranging from negative one point zero to positive one point zero, where
negative values indicate negative sentiment and positive values indicate
positive sentiment.

After (efficient):
Analyze sentiment:
- Overall score: -1.0 (negative) to 1.0 (positive)
- Per-tweet classification: positive/neutral/negative
```

### 2. Clarity Enhancement

**Strategy**: Reduce ambiguity to improve accuracy

**Techniques:**
- Use specific numbers (e.g., "5-7 themes" not "several themes")
- Define ranges explicitly (e.g., "0.0 to 1.0")
- Provide examples for complex requirements
- Use consistent terminology throughout

**Example:**
```
Unclear:
"Assess the risk level"

Clear:
"Calculate risk score (0-100):
- 0-30: Low
- 30-60: Medium
- 60-85: High
- 85-100: Critical"
```

### 3. Output Consistency

**Strategy**: Guarantee parseable, structured responses

**Techniques:**
- Explicitly require JSON format
- Provide complete schema example
- Specify "no additional text" constraint
- Use retry prompts for malformed responses

**Retry Prompt:**
```
The previous response could not be parsed as valid JSON.

ERROR: {error_message}

Please provide valid JSON following the exact schema. Ensure:
1. All fields present and correctly named
2. No trailing commas
3. All strings properly quoted
4. Balanced brackets and braces
```

### 4. Context Preservation

**Strategy**: Maintain relevant context while controlling prompt length

**Techniques:**
- Prioritize recent tweets
- Include high-engagement content
- Sample diverse content types
- Preserve temporal ordering
- Summarize older content

**Example:**
```
**RECENT TWEETS** (Last 30 days):
[Detailed individual tweets]

**OLDER CONTENT SUMMARY** (30-90 days ago):
- Total tweets: 50
- Primary themes: Technology (45%), Personal (30%), Politics (25%)
- Average sentiment: Positive (0.6)
```

### 5. Cultural Sensitivity

**Strategy**: Account for cultural context and regional differences

**Techniques:**
- Note user's apparent location/culture
- Request cultural context consideration
- Distinguish regional language differences
- Flag content requiring cultural expertise

**Example:**
```
**CULTURAL CONTEXT:**
- Consider regional language variations
- Account for cultural norms and customs
- Distinguish between offensive vs. acceptable language in user's context
- Flag culturally ambiguous content for review
```

## Purpose-Specific Prompts

### Job Search Optimization

**Focus Areas:**
```
For JOB SEARCH analysis, emphasize:

1. **Professional Conduct**:
   - Language professionalism
   - Workplace-related content
   - Public complaints
   - Ethical behavior

2. **Employer Concerns**:
   - Controversial opinions
   - Discriminatory language
   - Reliability indicators
   - Cultural fit signals

3. **Skill Demonstrations**:
   - Technical expertise
   - Industry knowledge
   - Problem-solving examples
   - Professional achievements
```

### Visa Application Optimization

**Focus Areas:**
```
For VISA APPLICATION analysis, emphasize:

1. **Security Screening**:
   - Extremism indicators
   - Violence-related content
   - Terrorism associations
   - National security concerns

2. **Geopolitical Sensitivity**:
   - Stance on destination country
   - International relations topics
   - Foreign government affiliations
   - Controversial political views

3. **Character Assessment**:
   - Trustworthiness indicators
   - Law-abiding behavior
   - Respect for institutions
   - Integration potential
```

### Brand Building Optimization

**Focus Areas:**
```
For BRAND BUILDING analysis, emphasize:

1. **Engagement Optimization**:
   - High-performing content types
   - Optimal posting times
   - Audience response patterns
   - Growth opportunities

2. **Brand Safety**:
   - Partnership-suitable content
   - Advertiser-friendly topics
   - Controversy management
   - Reputation protection

3. **Content Strategy**:
   - Theme consistency
   - Value proposition
   - Audience alignment
   - Differentiation opportunities
```

## Risk Assessment Prompts

### Specialized Risk Prompts

For deep-dive risk analysis, we use specialized sub-prompts:

**Extremism Detection:**
```
Analyze for extremism indicators:

**DETECTION CRITERIA:**
1. Violent rhetoric or calls to action
2. Dehumanizing language toward groups
3. Conspiracy theories promoting harm
4. Affiliation with known extremist groups
5. Coded language or dog whistles

Return assessment with:
- Severity: low|medium|high|critical
- Specific evidence
- Context consideration
- False positive risk assessment
```

**Hate Speech Detection:**
```
Analyze for hate speech:

**PROTECTED CHARACTERISTICS:**
- Race, ethnicity, national origin
- Religion or belief
- Gender identity or expression
- Sexual orientation
- Disability

**INDICATORS:**
- Slurs or derogatory terms
- Calls for discrimination
- Dehumanizing language
- Incitement to hatred

Consider context:
- Satire vs. genuine hate
- Quoted vs. endorsed
- Reclaimed language by in-group
```

## Prompt Testing and Validation

### Testing Methodology

1. **Consistency Testing**: Same input → same output structure
2. **Edge Case Testing**: Unusual inputs, extreme content
3. **Cross-Cultural Testing**: Diverse language and cultural contexts
4. **Purpose Testing**: Each purpose category with relevant data
5. **Error Recovery Testing**: Malformed responses, retry logic

### Validation Metrics

- **Parse Success Rate**: % of responses successfully parsed as JSON
- **Schema Compliance**: % of responses matching schema exactly
- **Field Completeness**: % of required fields present
- **Value Range Compliance**: % of values within specified ranges
- **Consistency Score**: Variation in repeated analyses

### A/B Testing Framework

```python
# Compare prompt versions
def test_prompt_variants():
    variants = {
        "A": original_prompt,
        "B": optimized_prompt
    }

    results = {}
    for variant_name, prompt in variants.items():
        results[variant_name] = {
            "parse_rate": ...,
            "avg_confidence": ...,
            "avg_tokens": ...,
            "user_satisfaction": ...
        }

    return compare_results(results)
```

## Continuous Improvement

### Feedback Integration

1. **User Feedback**: Accuracy ratings, dispute flags
2. **Human Review**: Expert validation of outputs
3. **Error Analysis**: Common failure patterns
4. **Token Optimization**: Cost vs. quality trade-offs

### Version Control

```
Prompt Version History:

v1.0.0 (2024-01-01): Initial release
- Basic sentiment and theme analysis
- Single-purpose prompts

v1.1.0 (2024-01-15): Purpose specialization
- Added purpose-specific focus areas
- Improved risk detection prompts
- Optimized token usage

v1.2.0 (2024-02-01): Enhanced accuracy
- Added cultural sensitivity instructions
- Improved output schema specificity
- Implemented retry logic

v2.0.0 (2024-03-01): Major revision
- Complete prompt restructure
- Advanced risk assessment
- Bias detection integration
```

### Performance Monitoring

Track key metrics:
- Average tokens per analysis
- Parse success rate
- User satisfaction scores
- False positive/negative rates
- Processing time
- Cost per analysis

## Best Practices

### Do's

✓ Be explicit and specific
✓ Provide clear examples
✓ Define all ranges and enums
✓ Request JSON-only output
✓ Include retry logic
✓ Consider cultural context
✓ Optimize token usage
✓ Test extensively

### Don'ts

✗ Use ambiguous language
✗ Omit output format requirements
✗ Ignore cultural differences
✗ Over-constrain creativity
✗ Neglect edge cases
✗ Skip validation steps
✗ Forget error handling

## Advanced Techniques

### Chain-of-Thought Prompting

For complex risk assessments:

```
Analyze this content step-by-step:

1. First, identify any concerning keywords or phrases
2. Then, assess the context in which they appear
3. Next, evaluate the user's intent
4. Consider alternative interpretations
5. Assess the severity based on purpose ({purpose})
6. Determine confidence level
7. Provide final assessment with justification
```

### Few-Shot Learning

Include examples for complex tasks:

```
**EXAMPLE SENTIMENT ANALYSIS:**

Input: "Just got promoted! Excited for the new challenges ahead."
Output: {
  "sentiment": "positive",
  "score": 0.85,
  "confidence": 0.9
}

Input: "Another day, another disaster. Nothing ever goes right."
Output: {
  "sentiment": "negative",
  "score": -0.75,
  "confidence": 0.85
}

Now analyze the user's tweets using this approach.
```

### Self-Consistency

Request internal validation:

```
After completing your analysis:

1. Review each finding for evidence support
2. Check for internal contradictions
3. Verify all scores are in valid ranges
4. Confirm confidence levels are appropriate
5. Validate JSON format correctness

Then provide your final analysis.
```

## Conclusion

Effective prompt engineering is critical to Repazoo's analysis quality. By following these principles and continuously refining prompts based on feedback and performance data, we ensure accurate, consistent, and actionable reputation insights for all users.
