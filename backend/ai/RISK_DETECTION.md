# Risk Detection Methodology

## Overview

The Repazoo risk detection system combines AI-powered analysis with rule-based detection to identify reputation risks across multiple categories. It uses a multi-layered approach to ensure comprehensive coverage while minimizing false positives.

## Detection Architecture

### Hybrid Detection Model

```
Input Content
    ↓
┌───────────────────────────────────┐
│   AI-Powered Detection (Claude)  │
│   - Contextual understanding      │
│   - Nuanced interpretation        │
│   - Complex pattern recognition   │
└───────────┬───────────────────────┘
            │
            ↓
┌───────────────────────────────────┐
│   Rule-Based Detection            │
│   - Keyword matching              │
│   - Pattern recognition           │
│   - Entity identification         │
└───────────┬───────────────────────┘
            │
            ↓
┌───────────────────────────────────┐
│   Risk Scoring & Aggregation      │
│   - Weighted combination          │
│   - Purpose-specific adjustment   │
│   - Confidence assessment         │
└───────────┬───────────────────────┘
            │
            ↓
        Risk Report
```

## Risk Categories

### 1. Extremism Detection

**Indicators:**
- Violent rhetoric or calls to action
- Dehumanizing language toward groups
- Affiliation with known extremist organizations
- Conspiracy theories promoting harm
- Coded language (dog whistles)
- Recruitment or radicalization attempts

**Severity Levels:**
- **Low**: Borderline language, requires context
- **Medium**: Clear extremist rhetoric without violence
- **High**: Violent language or explicit extremist affiliation
- **Critical**: Imminent threat indicators or active recruitment

**Detection Methods:**
- Keyword matching (e.g., violent terms, extremist group names)
- Pattern recognition (e.g., radicalization narratives)
- Entity recognition (known extremist groups/figures)
- Context analysis (distinguishing reporting from endorsement)

**Example Flags:**
```json
{
  "category": "extremism",
  "severity": "high",
  "description": "Detected violent rhetoric and extremist keywords",
  "evidence": ["tweet_id_123", "tweet_id_456"],
  "confidence": 0.85,
  "mitigation": "Remove content; consult professional if visa/clearance application"
}
```

### 2. Hate Speech Detection

**Indicators:**
- Slurs or derogatory terms
- Calls for discrimination or violence against protected groups
- Dehumanizing language
- Stereotyping or othering
- Incitement to hatred
- Group-based attacks

**Protected Characteristics:**
- Race, ethnicity, national origin
- Religion or belief
- Gender identity or expression
- Sexual orientation
- Disability
- Age

**Severity Levels:**
- **Low**: Insensitive language, microaggressions
- **Medium**: Stereotypes, discriminatory statements
- **High**: Dehumanizing language, clear hate speech
- **Critical**: Incitement to violence or harm

**Special Considerations:**
- **Satire/Irony**: Distinguish between genuine hate speech and satirical critique
- **Reclaimed Language**: Consider context when in-group members use historically derogatory terms
- **Academic/Journalistic**: Quotes or discussions about hate speech vs. endorsement

### 3. Misinformation Detection

**Indicators:**
- Factually incorrect claims
- Misleading framing or cherry-picked data
- Conspiracy theories
- Manipulated media (deepfakes, edited images)
- False attribution or fabricated quotes
- Lack of credible sources
- Contradicts established scientific consensus

**Categories:**
- Health misinformation (vaccines, treatments)
- Election misinformation (voter fraud, results)
- Climate misinformation (denialism, cherry-picking)
- Scientific misinformation (pseudoscience)
- Historical misinformation (revisionism)
- Financial misinformation (scams, pump-and-dump)

**Severity Levels:**
- **Low**: Unverified claims, lacks context
- **Medium**: Misleading framing, cherry-picked data
- **High**: Provably false claims with harm potential
- **Critical**: Dangerous misinformation (health, safety)

**Detection Challenges:**
- Rapidly evolving information
- Genuine uncertainty vs. misinformation
- Opinion vs. factual claim
- Satire vs. genuine misinformation

### 4. Geopolitical Risk Assessment

**Indicators:**
- Sensitive territorial disputes (Taiwan, Kashmir, Crimea)
- Sanctions and embargoes discussion
- Foreign government affiliations
- Human rights controversies
- International relations flashpoints
- State-sponsored narrative alignment

**Risk Factors by Purpose:**

**Visa Applications:**
- Stance on applicant's destination country
- Criticism of destination government
- Support for sanctioned entities
- Foreign intelligence connections

**Security Clearance:**
- Foreign government ties
- Unauthorized disclosure tendencies
- Susceptibility to coercion
- Foreign preference indicators

**General Reputation:**
- Association with controversial regimes
- Inflammatory international politics content
- Lack of diplomatic sensitivity

**Severity Levels:**
- **Low**: General international news commentary
- **Medium**: Strong political stances on sensitive topics
- **High**: Explicit support for sanctioned entities
- **Critical**: Foreign intelligence connections, security threats

### 5. Brand Safety Assessment

**Unsafe Content Categories:**
- Adult/sexual content
- Violence or gore
- Illegal activities
- Controversial topics (inflammatory politics/religion)
- Profanity or vulgar language
- Dangerous content
- Spam or scams
- Misleading content

**Brand Safety Tiers:**
- **Family-Friendly**: No profanity, violence, adult themes
- **General Audience**: Minimal profanity, no graphic content
- **Mature Audience**: Adult themes acceptable, no illegal content
- **Restricted**: High-risk content unsuitable for partnerships

**Impact Assessment:**
- **Advertiser-Friendly**: Content suitable for brand partnerships
- **Limited Monetization**: Some advertisers may avoid
- **Demonetized**: Most brands will not partner
- **Blacklisted**: Content unsuitable for any partnerships

### 6. Professional Conduct Assessment

**Indicators:**
- Unprofessional language or tone
- Public workplace complaints
- Confidentiality breaches
- Unethical behavior
- Discrimination or harassment
- Conflicts of interest
- Misleading credentials

**Focus Areas:**
- **Communication Style**: Professional vs. casual/crude
- **Workplace Behavior**: Public complaints, gossip
- **Ethics**: Honesty, integrity, confidentiality
- **Judgment**: Decision-making, discretion
- **Respect**: Treatment of colleagues, clients

**Severity Levels:**
- **Low**: Overly casual tone, minor complaints
- **Medium**: Frequent workplace negativity, unprofessional language
- **High**: Ethics violations, harassment allegations
- **Critical**: Illegal conduct, severe misconduct

### 7. Controversial Topics

**Categories:**
- Partisan politics
- Religious debates
- Social justice controversies
- Ethical dilemmas (abortion, capital punishment)
- Cultural conflicts
- Economic policy debates

**Risk Assessment:**
- **Frequency**: How often user engages with controversy
- **Intensity**: Inflammatory vs. thoughtful discussion
- **Balance**: One-sided vs. nuanced perspectives
- **Professional Context**: Relevance to career/purpose

**Purpose-Specific Thresholds:**
- **Job Search**: Lower tolerance (employers prefer neutrality)
- **Political Campaign**: Higher tolerance (expected engagement)
- **Brand Building**: Medium tolerance (audience-dependent)
- **Visa/Clearance**: Lower tolerance (avoid red flags)

## Risk Scoring Algorithm

### Base Score Calculation

```python
# Individual risk score
risk_score = severity_value * confidence * purpose_weight

# Severity values
LOW = 20
MEDIUM = 50
HIGH = 80
CRITICAL = 100

# Purpose weights (examples)
visa_application = {
    "extremism": 2.5,
    "hate_speech": 2.0,
    "geopolitical": 2.5,
    "misinformation": 1.5
}

job_search = {
    "professional_conduct": 2.5,
    "brand_safety": 2.0,
    "hate_speech": 2.0,
    "extremism": 1.5
}
```

### Overall Risk Score

```python
# Aggregate multiple risks
if risks:
    max_risk = max(risk_scores)  # Highest individual risk
    avg_risk = sum(risk_scores) / len(risk_scores)  # Average risk

    # Weighted combination (max has more influence)
    overall_score = (max_risk * 0.7) + (avg_risk * 0.3)
else:
    overall_score = 0.0

# Clamp to 0-100 range
overall_score = min(100.0, max(0.0, overall_score))
```

### Risk Level Thresholds

```
0-30:  LOW       - Minimal concerns
30-60: MEDIUM    - Some areas for improvement
60-85: HIGH      - Significant reputation risks
85-100: CRITICAL - Severe risks, immediate action required
```

## Confidence Assessment

### Confidence Factors

1. **Evidence Quality**
   - Direct quote: High confidence (0.9)
   - Paraphrase/summary: Medium confidence (0.7)
   - Inference: Lower confidence (0.5)

2. **Context Clarity**
   - Clear, unambiguous: High confidence
   - Requires interpretation: Medium confidence
   - Ambiguous/sarcastic: Lower confidence

3. **Detection Method**
   - AI + Rule-based agreement: Highest confidence (0.95)
   - AI only: High confidence (0.85)
   - Rule-based only: Medium confidence (0.7)

4. **Pattern Strength**
   - Multiple instances: Higher confidence
   - Single occurrence: Lower confidence
   - Consistent pattern: Highest confidence

### Human Review Triggers

Content flagged for human review when:
- Confidence < 0.7 AND Severity >= HIGH
- Critical severity flags (always review)
- Contradictory indicators (AI vs. rules)
- Sensitive purpose (visa, security clearance)

## False Positive Mitigation

### Context Awareness

1. **Quotation Detection**: Distinguish quoting vs. endorsing
2. **Satire Recognition**: Identify satirical/ironic content
3. **Academic/Journalistic**: Recognize educational discussion
4. **Language Nuance**: Account for colloquialisms, regional language

### Pattern Validation

- Require multiple indicators for high-severity flags
- Cross-reference with user's overall profile
- Consider temporal patterns (single event vs. pattern)
- Validate against known false positive patterns

### Adjustment Mechanisms

- **Whitelist**: Known safe entities/phrases
- **Context Modifiers**: Reduce severity with proper context
- **Historical Correction**: Learn from human review feedback

## Edge Cases

### 1. Reclaimed Language

**Challenge**: In-group members using historically derogatory terms

**Approach**:
- Check user's demographic profile
- Assess context (empowerment vs. attack)
- Flag for review with low confidence

### 2. Satire and Irony

**Challenge**: Distinguishing satire from genuine extremism

**Approach**:
- Analyze account history for satirical patterns
- Check for satire indicators (hyperbole, absurdity)
- Compare with known satirical accounts
- Flag ambiguous cases for human review

### 3. News Reporting

**Challenge**: Discussing vs. endorsing problematic content

**Approach**:
- Detect reporting language ("according to", "reports say")
- Check for journalist/news credentials
- Assess overall stance (critical vs. supportive)
- Reduce severity for clear reporting

### 4. Academic Discussion

**Challenge**: Scholarly analysis of sensitive topics

**Approach**:
- Identify academic credentials/affiliation
- Check for scholarly framing (citations, analysis)
- Reduce severity for educational content
- Maintain context in risk report

### 5. Language Barriers

**Challenge**: Non-English content or translation issues

**Approach**:
- Detect non-English text
- Flag for native speaker review
- Lower confidence for machine-translated content
- Note language limitations in report

### 6. Temporal Context

**Challenge**: Old content vs. current views

**Approach**:
- Weight recent content more heavily
- Note timing of problematic content
- Assess if views have evolved
- Consider apologies/retractions

## Integration with AI Analysis

### AI Advantages

- Context understanding
- Nuanced interpretation
- Novel pattern detection
- Natural language comprehension
- Cultural awareness

### Rule-Based Advantages

- Consistent keyword detection
- Known entity recognition
- Pattern matching speed
- No API costs
- Explainable results

### Optimal Combination

1. **First Pass**: Rule-based detection for known patterns
2. **Second Pass**: AI analysis for context and nuance
3. **Synthesis**: Combine results with weighted scoring
4. **Validation**: Cross-check AI and rule-based findings
5. **Human Review**: Flag discrepancies or high-severity/low-confidence items

## Privacy and Ethics

### Privacy Protections

- Analyze only public tweets
- Sanitize PII before analysis
- Anonymize stored results
- Comply with data protection regulations

### Ethical Guidelines

- Objective assessment (no political bias in detection)
- Cultural sensitivity
- Transparent methodology
- Clear justifications for flags
- User right to explanation
- Appeal mechanisms for disputed flags

### Bias Mitigation

- Regular audits of keyword lists
- Diverse training data (if fine-tuning models)
- Cross-cultural review panels
- Feedback loops for false positives
- Documentation of limitations

## Continuous Improvement

### Feedback Mechanisms

1. **User Feedback**: Users can dispute flags
2. **Human Review Logs**: Track review decisions
3. **Accuracy Metrics**: Measure false positive/negative rates
4. **A/B Testing**: Test algorithm changes

### Update Cycle

- **Weekly**: Keyword list updates
- **Monthly**: Pattern refinement
- **Quarterly**: Algorithm review
- **Annually**: Full methodology audit

### Monitoring

- False positive rate tracking
- Category-wise accuracy metrics
- User satisfaction scores
- Human review load
- Appeal outcomes

## References

### Risk Databases

- OFAC Sanctions List
- EU Terrorism List
- ADL Hate Symbol Database
- SPLC Extremism Database
- Fact-checking organizations (Snopes, PolitiFact)

### Standards

- Twitter/X Community Guidelines
- Facebook Community Standards
- GARM Brand Safety Framework
- IAB Content Taxonomy
- EU Code of Conduct on Hate Speech

### Research

- Extremism research (GIFCT, SITE Intelligence)
- Misinformation studies (MIT Media Lab, Stanford Internet Observatory)
- Bias detection (Fairness, Accountability, Transparency research)
