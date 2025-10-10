"""
Prompt Sanitization for Anthropic Claude API
Ensures no PII is sent to external AI service
Compliance: Anthropic ToS, GDPR Article 5
"""

import re
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)


class PromptSanitizer:
    """Sanitizes prompts before sending to Anthropic Claude API"""

    # Patterns to remove from prompts
    MENTION_PATTERN = re.compile(r'@[\w_]+')
    EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
    PHONE_PATTERN = re.compile(r'\b(?:\+?1[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b')
    URL_PATTERN = re.compile(r'https?://[^\s]+')
    TWITTER_HANDLE_PATTERN = re.compile(r'@[\w]{1,15}\b')
    USER_ID_PATTERN = re.compile(r'\b\d{10,19}\b')  # Twitter user IDs

    @staticmethod
    def sanitize_tweet_text(text: str, preserve_sentiment: bool = True) -> str:
        """
        Sanitize tweet text for sentiment analysis

        Args:
            text: Raw tweet text
            preserve_sentiment: Keep sentiment-relevant content

        Returns:
            Sanitized text safe for AI processing
        """
        if not text:
            return ""

        sanitized = text

        # Remove @mentions (keeps conversation structure info but removes identity)
        sanitized = PromptSanitizer.MENTION_PATTERN.sub('[USER]', sanitized)

        # Remove email addresses
        sanitized = PromptSanitizer.EMAIL_PATTERN.sub('[EMAIL]', sanitized)

        # Remove phone numbers
        sanitized = PromptSanitizer.PHONE_PATTERN.sub('[PHONE]', sanitized)

        # Replace URLs with generic placeholder (but keep that link existed)
        sanitized = PromptSanitizer.URL_PATTERN.sub('[LINK]', sanitized)

        # Remove numeric user IDs that might appear
        sanitized = PromptSanitizer.USER_ID_PATTERN.sub('[ID]', sanitized)

        # Clean up extra whitespace
        sanitized = ' '.join(sanitized.split())

        return sanitized

    @staticmethod
    def sanitize_tweet_batch(tweets: List[Dict[str, Any]]) -> List[str]:
        """
        Sanitize batch of tweets for analysis

        Args:
            tweets: List of tweet dictionaries

        Returns:
            List of sanitized text strings
        """
        sanitized_texts = []

        for tweet in tweets:
            text = tweet.get('text', '')
            sanitized = PromptSanitizer.sanitize_tweet_text(text)

            if sanitized.strip():  # Only include non-empty
                sanitized_texts.append(sanitized)

        return sanitized_texts

    @staticmethod
    def build_sentiment_prompt(tweets: List[str], include_reasoning: bool = False) -> str:
        """
        Build compliant prompt for sentiment analysis

        Args:
            tweets: List of sanitized tweet texts
            include_reasoning: Include reasoning in response

        Returns:
            Prompt string safe for Anthropic API
        """
        if not tweets:
            return ""

        # Combine tweets with clear separation
        tweet_list = "\n".join([f"{i+1}. {tweet}" for i, tweet in enumerate(tweets)])

        prompt = f"""Analyze the sentiment of the following social media posts. Each post has been anonymized to remove personal information.

Posts to analyze:
{tweet_list}

For each post, provide:
1. Sentiment classification (positive, negative, neutral)
2. Confidence score (0-1)
3. Key sentiment indicators (words/phrases that influenced the classification)
"""

        if include_reasoning:
            prompt += "\n4. Brief reasoning for the classification\n"

        prompt += """
Return the analysis in JSON format:
{{
    "analyses": [
        {{
            "post_number": 1,
            "sentiment": "positive|negative|neutral",
            "confidence": 0.85,
            "indicators": ["word1", "word2"],
            "reasoning": "brief explanation"
        }}
    ],
    "overall_sentiment": "positive|negative|neutral",
    "overall_confidence": 0.80
}}

Important: Base your analysis only on the emotional tone and sentiment expressed. Do not make assumptions about individuals or real-world events.
"""

        return prompt

    @staticmethod
    def build_content_analysis_prompt(tweets: List[str], analysis_type: str = 'themes') -> str:
        """
        Build prompt for content/theme analysis

        Args:
            tweets: List of sanitized tweet texts
            analysis_type: Type of analysis (themes, topics, trends)

        Returns:
            Prompt string
        """
        if not tweets:
            return ""

        tweet_list = "\n".join([f"{i+1}. {tweet}" for i, tweet in enumerate(tweets)])

        prompt = f"""Analyze the following anonymized social media posts for {analysis_type}.

Posts:
{tweet_list}

Provide:
1. Main themes or topics discussed
2. Frequency of each theme
3. Overall tone for each theme

Return JSON format:
{{
    "themes": [
        {{
            "name": "theme name",
            "frequency": 5,
            "sentiment": "positive|negative|neutral",
            "keywords": ["keyword1", "keyword2"]
        }}
    ]
}}

Note: These posts have been anonymized. Focus on content patterns, not individuals.
"""

        return prompt

    @staticmethod
    def validate_prompt_safety(prompt: str) -> bool:
        """
        Validate that prompt doesn't contain PII before sending

        Args:
            prompt: Prompt to validate

        Returns:
            True if safe, False if PII detected
        """
        # Check for email addresses
        if PromptSanitizer.EMAIL_PATTERN.search(prompt):
            logger.error("Email address detected in prompt - validation failed")
            return False

        # Check for phone numbers
        if PromptSanitizer.PHONE_PATTERN.search(prompt):
            logger.error("Phone number detected in prompt - validation failed")
            return False

        # Check for Twitter @handles that weren't replaced
        if PromptSanitizer.TWITTER_HANDLE_PATTERN.search(prompt):
            # Allow [USER] placeholders
            if '@' in prompt and '[USER]' not in prompt:
                logger.error("Twitter handle detected in prompt - validation failed")
                return False

        # Check for long numeric sequences (potential user IDs)
        potential_ids = PromptSanitizer.USER_ID_PATTERN.findall(prompt)
        if potential_ids:
            logger.warning(f"Potential user IDs detected in prompt: {len(potential_ids)}")
            return False

        return True

    @staticmethod
    def sanitize_and_validate(
        tweets: List[Dict[str, Any]],
        analysis_type: str = 'sentiment'
    ) -> tuple[str, bool]:
        """
        Complete sanitization and validation pipeline

        Args:
            tweets: Raw tweet data
            analysis_type: Type of analysis to perform

        Returns:
            Tuple of (prompt, is_valid)
        """
        # Step 1: Sanitize tweets
        sanitized_texts = PromptSanitizer.sanitize_tweet_batch(tweets)

        if not sanitized_texts:
            logger.warning("No valid tweets after sanitization")
            return "", False

        # Step 2: Build prompt
        if analysis_type == 'sentiment':
            prompt = PromptSanitizer.build_sentiment_prompt(sanitized_texts)
        elif analysis_type == 'themes':
            prompt = PromptSanitizer.build_content_analysis_prompt(sanitized_texts, 'themes')
        else:
            prompt = PromptSanitizer.build_sentiment_prompt(sanitized_texts)

        # Step 3: Validate safety
        is_valid = PromptSanitizer.validate_prompt_safety(prompt)

        if not is_valid:
            logger.error("Prompt failed safety validation")
            return "", False

        logger.info(f"Successfully sanitized {len(sanitized_texts)} tweets for {analysis_type} analysis")
        return prompt, True


# Convenience functions
def sanitize_for_ai(tweet_text: str) -> str:
    """Quick sanitization of single tweet"""
    return PromptSanitizer.sanitize_tweet_text(tweet_text)


def build_safe_prompt(tweets: List[Dict], analysis: str = 'sentiment') -> str:
    """Build and validate safe prompt"""
    prompt, valid = PromptSanitizer.sanitize_and_validate(tweets, analysis)
    if not valid:
        raise ValueError("Prompt failed safety validation - contains PII")
    return prompt
