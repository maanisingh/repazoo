"""
Risk Assessment Prompt Templates
Specialized prompts for deep risk and bias analysis
"""

from typing import List, Dict, Any


# ============================================================================
# Risk Detection System Prompt
# ============================================================================

RISK_DETECTION_SYSTEM_PROMPT = """You are a specialized Risk Detection AI with expertise in:
- Extremism and radicalization indicators
- Hate speech and discriminatory language detection
- Misinformation and disinformation patterns
- Geopolitical sensitivity analysis
- Brand safety assessment
- Professional conduct evaluation

Your role is to identify, categorize, and assess reputation risks with precision and cultural awareness. Base all assessments on observable evidence and provide clear justifications."""


# ============================================================================
# Extremism Detection
# ============================================================================

EXTREMISM_DETECTION_PROMPT = """Analyze the following content for extremism indicators:

**CONTENT:**
{content}

**DETECTION CRITERIA:**
1. Violent rhetoric or calls to action
2. Dehumanizing language toward groups
3. Conspiracy theories promoting harm
4. Affiliation with known extremist groups
5. Coded language or dog whistles
6. Recruitment or radicalization attempts

**EXTREMISM CATEGORIES:**
- Violent extremism
- Political extremism
- Religious extremism
- Ideological extremism
- Single-issue extremism

Return JSON:
{{
  "extremism_detected": true|false,
  "severity": "low|medium|high|critical",
  "categories": ["list of categories"],
  "indicators": [
    {{
      "type": "indicator type",
      "evidence": "specific content",
      "explanation": "why this is concerning",
      "confidence": 0.0 to 1.0
    }}
  ],
  "context": "cultural or temporal context",
  "false_positive_risk": "low|medium|high",
  "recommendations": ["actions to take"]
}}"""


# ============================================================================
# Hate Speech Detection
# ============================================================================

HATE_SPEECH_DETECTION_PROMPT = """Analyze the following content for hate speech indicators:

**CONTENT:**
{content}

**DETECTION CRITERIA:**
1. Slurs or derogatory terms
2. Calls for discrimination or violence
3. Dehumanizing language
4. Stereotyping or othering
5. Incitement to hatred
6. Group-based attacks

**PROTECTED CHARACTERISTICS:**
- Race, ethnicity, national origin
- Religion or belief
- Gender identity or expression
- Sexual orientation
- Disability
- Age

Return JSON:
{{
  "hate_speech_detected": true|false,
  "severity": "low|medium|high|critical",
  "target_groups": ["affected groups"],
  "indicators": [
    {{
      "type": "slur|dehumanization|incitement|stereotyping|other",
      "evidence": "specific content",
      "target": "group targeted",
      "explanation": "why this is hate speech",
      "confidence": 0.0 to 1.0
    }}
  ],
  "context_considerations": "relevant context",
  "satire_or_quote_consideration": "assessment if content is quoted or satirical",
  "recommendations": ["actions to take"]
}}"""


# ============================================================================
# Misinformation Detection
# ============================================================================

MISINFORMATION_DETECTION_PROMPT = """Analyze the following content for misinformation indicators:

**CONTENT:**
{content}

**DETECTION CRITERIA:**
1. Factually incorrect claims
2. Misleading framing or context
3. Conspiracy theories
4. Manipulated media
5. False attribution or quotes
6. Lack of credible sources
7. Contradicts established facts

**MISINFORMATION TYPES:**
- Health misinformation
- Election misinformation
- Climate misinformation
- Scientific misinformation
- Historical misinformation
- Financial misinformation

Return JSON:
{{
  "misinformation_detected": true|false,
  "severity": "low|medium|high|critical",
  "type": "health|election|climate|scientific|historical|financial|other",
  "claims": [
    {{
      "claim": "the claim",
      "assessment": "false|misleading|unverified|lacks_context",
      "evidence_against": "why this is problematic",
      "harm_potential": "potential harm",
      "confidence": 0.0 to 1.0
    }}
  ],
  "fact_check_urls": ["relevant fact-check links if known"],
  "recommendations": ["actions to take"]
}}"""


# ============================================================================
# Geopolitical Risk Assessment
# ============================================================================

GEOPOLITICAL_RISK_PROMPT = """Analyze the following content for geopolitical sensitivities:

**CONTENT:**
{content}

**CONTEXT:** Analysis for {purpose} in {region}

**ASSESSMENT CRITERIA:**
1. International relations sensitivities
2. Territorial disputes
3. Sanctions or embargoes
4. Political conflicts
5. Human rights issues
6. Regional tensions

**RISK FACTORS:**
- Foreign government affiliations
- State-sponsored narratives
- Sensitive diplomatic topics
- Security clearance concerns
- Immigration red flags

Return JSON:
{{
  "geopolitical_risk_detected": true|false,
  "alignment_score": 0.0 to 100.0,
  "risk_level": "low|medium|high|critical",
  "sensitive_topics": [
    {{
      "topic": "topic name",
      "region": "affected region",
      "sensitivity_level": "low|medium|high|critical",
      "context": "why this is sensitive",
      "potential_impact": "impact description"
    }}
  ],
  "affiliations": [
    {{
      "entity": "entity name",
      "type": "government|organization|movement",
      "relationship": "support|opposition|neutral|unclear",
      "risk_level": "low|medium|high|critical"
    }}
  ],
  "recommendations": ["actions to take"]
}}"""


# ============================================================================
# Brand Safety Assessment
# ============================================================================

BRAND_SAFETY_PROMPT = """Analyze the following content for brand safety:

**CONTENT:**
{content}

**CONTEXT:** {context}

**BRAND SAFETY CATEGORIES:**
- Adult/sexual content
- Violence or gore
- Hate speech or discrimination
- Illegal activities
- Controversial topics (politics, religion)
- Profanity or vulgar language
- Dangerous content
- Spam or scams

Return JSON:
{{
  "brand_safe": true|false,
  "overall_risk": "low|medium|high|critical",
  "violations": [
    {{
      "category": "category",
      "severity": "low|medium|high|critical",
      "evidence": "specific content",
      "explanation": "why this is problematic",
      "advertiser_impact": "impact on brand partnerships"
    }}
  ],
  "suitable_for": ["professional", "family", "general_audience", "mature_audience"],
  "unsuitable_for": ["list of audiences"],
  "recommendations": ["actions to improve brand safety"]
}}"""


# ============================================================================
# Professional Conduct Assessment
# ============================================================================

PROFESSIONAL_CONDUCT_PROMPT = """Analyze the following content for professional conduct:

**CONTENT:**
{content}

**CONTEXT:** {purpose}

**ASSESSMENT CRITERIA:**
1. Professional tone and language
2. Respectful communication
3. Ethical behavior
4. Confidentiality breaches
5. Conflicts of interest
6. Workplace conduct
7. Industry standards

**CONCERNING BEHAVIORS:**
- Unprofessional language
- Workplace complaints
- Unethical practices
- Discrimination or harassment
- Confidentiality violations
- Misleading credentials

Return JSON:
{{
  "professional_conduct_score": 0.0 to 100.0,
  "conduct_level": "excellent|good|acceptable|concerning|problematic",
  "issues": [
    {{
      "category": "category",
      "severity": "low|medium|high|critical",
      "evidence": "specific content",
      "explanation": "why this is concerning",
      "employer_impact": "how this might affect job prospects"
    }}
  ],
  "strengths": ["positive professional indicators"],
  "recommendations": ["actions to improve professional presence"]
}}"""


# ============================================================================
# Bias Detection Deep Analysis
# ============================================================================

BIAS_DEEP_ANALYSIS_PROMPT = """Perform deep bias analysis on the following content:

**CONTENT:**
{content}

**ANALYSIS DIMENSIONS:**

1. **Political Bias:**
   - Left/right ideological indicators
   - Partisan language
   - Policy positions
   - Political figures referenced

2. **Demographic Bias:**
   - Age, gender, race/ethnicity patterns
   - Socioeconomic indicators
   - Geographic/regional bias
   - Cultural perspectives

3. **Cognitive Bias:**
   - Confirmation bias
   - Selection bias
   - Availability bias
   - Anchoring bias

4. **Media Bias:**
   - Source diversity
   - Echo chamber indicators
   - Information diet balance
   - Fact-checking engagement

Return JSON:
{{
  "overall_bias_score": -1.0 to 1.0,
  "political_leaning": "far_left|left|center_left|center|center_right|right|far_right|mixed",
  "bias_dimensions": [
    {{
      "dimension": "dimension name",
      "score": -1.0 to 1.0,
      "strength": "weak|moderate|strong",
      "indicators": ["specific indicators"],
      "is_problematic": true|false,
      "context": "relevant context"
    }}
  ],
  "echo_chamber_score": 0.0 to 1.0,
  "diversity_score": 0.0 to 1.0,
  "neutrality_score": 0.0 to 1.0,
  "recommendations": ["how to increase balance and diversity"]
}}"""


# ============================================================================
# Helper Functions
# ============================================================================

def get_risk_analysis_prompt(
    content: str,
    risk_type: str,
    context: Dict[str, Any]
) -> str:
    """
    Get specialized risk analysis prompt

    Args:
        content: Content to analyze
        risk_type: Type of risk analysis
        context: Additional context

    Returns:
        Formatted prompt
    """
    prompts = {
        "extremism": EXTREMISM_DETECTION_PROMPT,
        "hate_speech": HATE_SPEECH_DETECTION_PROMPT,
        "misinformation": MISINFORMATION_DETECTION_PROMPT,
        "geopolitical": GEOPOLITICAL_RISK_PROMPT,
        "brand_safety": BRAND_SAFETY_PROMPT,
        "professional_conduct": PROFESSIONAL_CONDUCT_PROMPT,
        "bias": BIAS_DEEP_ANALYSIS_PROMPT
    }

    prompt_template = prompts.get(risk_type, BRAND_SAFETY_PROMPT)

    # Format with context
    return prompt_template.format(
        content=content,
        purpose=context.get("purpose", "general analysis"),
        region=context.get("region", "global"),
        context=str(context)
    )


# ============================================================================
# Composite Risk Analysis
# ============================================================================

def get_composite_risk_prompt(
    content: str,
    focus_areas: List[str],
    context: Dict[str, Any]
) -> str:
    """Generate composite risk analysis prompt covering multiple areas"""

    focus_descriptions = {
        "extremism": "violent or extreme ideological content",
        "hate_speech": "discriminatory or hateful language",
        "misinformation": "false or misleading claims",
        "geopolitical": "international relations sensitivities",
        "brand_safety": "content suitable for professional/brand contexts",
        "professional_conduct": "workplace and professional behavior",
        "bias": "political, demographic, or ideological bias"
    }

    focus_list = "\n".join([
        f"- {focus_descriptions.get(area, area)}"
        for area in focus_areas
    ])

    return f"""{RISK_DETECTION_SYSTEM_PROMPT}

Perform comprehensive risk analysis on the following content:

**CONTENT:**
{content}

**CONTEXT:** {context.get('purpose', 'general analysis')}

**FOCUS AREAS:**
{focus_list}

Analyze each focus area and provide:
1. Risk presence (detected/not detected)
2. Severity level if detected
3. Specific evidence
4. Confidence level
5. Recommendations

Return comprehensive JSON covering all focus areas with the combined schema from individual risk prompts."""


# ============================================================================
# Export
# ============================================================================

__all__ = [
    "RISK_DETECTION_SYSTEM_PROMPT",
    "EXTREMISM_DETECTION_PROMPT",
    "HATE_SPEECH_DETECTION_PROMPT",
    "MISINFORMATION_DETECTION_PROMPT",
    "GEOPOLITICAL_RISK_PROMPT",
    "BRAND_SAFETY_PROMPT",
    "PROFESSIONAL_CONDUCT_PROMPT",
    "BIAS_DEEP_ANALYSIS_PROMPT",
    "get_risk_analysis_prompt",
    "get_composite_risk_prompt"
]
