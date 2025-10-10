"""
AI Sentiment Analysis Flow with Full Compliance
Analyzes Twitter data using Anthropic Claude with PII protection
Compliance: Anthropic ToS, GDPR Article 5, Rate Limiting
"""

import logging
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
import httpx
from prefect import flow, task
import asyncpg

from .tasks.consent_verification import verify_full_consent, ConsentError
from .utils.rate_limiter import RedisRateLimiter, RateLimitExceeded, exponential_backoff
from .utils.prompt_sanitizer import PromptSanitizer
from .utils.pii_redaction import PIIRedactor, mask_id

logger = logging.getLogger(__name__)


@task(name="check_api_quota", retries=2)
async def check_api_quota(
    db_pool: asyncpg.Pool,
    user_id: str,
    subscription_tier: str
) -> Dict[str, Any]:
    """
    Check user's API usage quota

    Args:
        db_pool: Database connection pool
        user_id: User identifier
        subscription_tier: User's subscription tier

    Returns:
        Quota information

    Raises:
        Exception: If quota exceeded
    """
    # Define tier quotas (requests per month)
    tier_quotas = {
        'basic': 1000,
        'pro': 10000,
        'enterprise': 100000
    }

    max_quota = tier_quotas.get(subscription_tier.lower(), 0)

    async with db_pool.acquire() as conn:
        # Get current month usage
        current_usage = await conn.fetchval(
            """
            SELECT COUNT(*)
            FROM analyses
            WHERE user_id = $1
              AND created_at >= date_trunc('month', CURRENT_DATE)
              AND deleted_at IS NULL
            """,
            user_id
        )

    quota_remaining = max_quota - current_usage
    quota_percentage = (current_usage / max_quota * 100) if max_quota > 0 else 100

    logger.info(
        f"API quota for user {mask_id(user_id)}: "
        f"{current_usage}/{max_quota} ({quota_percentage:.1f}%)"
    )

    if current_usage >= max_quota:
        logger.warning(f"Quota exceeded for user {mask_id(user_id)}")
        raise Exception(f"API quota exceeded ({current_usage}/{max_quota})")

    return {
        'tier': subscription_tier,
        'max_quota': max_quota,
        'current_usage': current_usage,
        'quota_remaining': quota_remaining,
        'percentage_used': quota_percentage
    }


@task(name="fetch_tweets_for_analysis", retries=2)
async def fetch_tweets_for_analysis(
    db_pool: asyncpg.Pool,
    user_id: str,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Fetch recent tweets for analysis

    Args:
        db_pool: Database connection pool
        user_id: User identifier
        limit: Maximum tweets to analyze

    Returns:
        List of tweet dictionaries
    """
    async with db_pool.acquire() as conn:
        tweets = await conn.fetch(
            """
            SELECT
                id,
                tweet_id,
                tweet_text,
                tweet_created_at,
                author_id
            FROM twitter_data
            WHERE user_id = $1
              AND deleted_at IS NULL
            ORDER BY tweet_created_at DESC
            LIMIT $2
            """,
            user_id,
            limit
        )

    tweet_list = [
        {
            'id': t['id'],
            'tweet_id': t['tweet_id'],
            'text': t['tweet_text'],
            'created_at': t['tweet_created_at'],
            'author_id': t['author_id']
        }
        for t in tweets
    ]

    logger.info(f"Fetched {len(tweet_list)} tweets for analysis (user: {mask_id(user_id)})")
    return tweet_list


@task(name="call_anthropic_api", retries=2, retry_delay_seconds=5)
@exponential_backoff(max_retries=3, base_delay=2)
async def call_anthropic_api(
    api_key: str,
    prompt: str,
    model: str,
    user_id: str,
    rate_limiter: RedisRateLimiter
) -> Dict[str, Any]:
    """
    Call Anthropic Claude API with rate limiting

    Args:
        api_key: Anthropic API key
        prompt: Sanitized prompt
        model: Claude model to use
        user_id: User identifier (for rate limiting)
        rate_limiter: Rate limiter instance

    Returns:
        API response
    """
    # Determine rate limit service based on tier
    service = 'anthropic_api_tier2' if 'opus' in model.lower() else 'anthropic_api'

    # Check rate limit
    allowed, retry_after = rate_limiter.check_and_increment(service, user_id)

    if not allowed:
        logger.warning(
            f"Anthropic rate limit exceeded for user {mask_id(user_id)}. "
            f"Retry after {retry_after}s"
        )
        raise RateLimitExceeded(retry_after, service)

    logger.info(f"Calling Anthropic API for user {mask_id(user_id)} (model: {model})")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://api.anthropic.com/v1/messages',
                headers={
                    'x-api-key': api_key,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                json={
                    'model': model,
                    'max_tokens': 1024,
                    'messages': [
                        {
                            'role': 'user',
                            'content': prompt
                        }
                    ]
                },
                timeout=60.0
            )

            if response.status_code == 429:
                # Rate limit hit
                retry_after = int(response.headers.get('retry-after', 60))
                logger.error(f"Anthropic API rate limit hit. Retry after {retry_after}s")
                raise RateLimitExceeded(retry_after, 'anthropic_api')

            response.raise_for_status()
            data = response.json()

            logger.info(f"Successfully called Anthropic API for user {mask_id(user_id)}")
            return data

    except httpx.HTTPStatusError as e:
        logger.error(
            f"Anthropic API error: HTTP {e.response.status_code} - "
            f"{PIIRedactor.redact_error_message(e)}"
        )
        raise
    except Exception as e:
        logger.error(f"Error calling Anthropic API: {PIIRedactor.redact_error_message(e)}")
        raise


@task(name="parse_analysis_response", retries=1)
async def parse_analysis_response(response: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse Anthropic API response

    Args:
        response: API response

    Returns:
        Parsed analysis results
    """
    try:
        # Extract text content
        content = response.get('content', [])
        if not content:
            raise ValueError("Empty response from Anthropic API")

        text_content = content[0].get('text', '')

        # Try to parse as JSON
        try:
            analysis_data = json.loads(text_content)
        except json.JSONDecodeError:
            # If not JSON, treat as plain text
            analysis_data = {'raw_response': text_content}

        logger.info("Successfully parsed Anthropic API response")
        return analysis_data

    except Exception as e:
        logger.error(f"Error parsing response: {PIIRedactor.redact_error_message(e)}")
        raise


@task(name="store_analysis_results", retries=2)
async def store_analysis_results(
    db_pool: asyncpg.Pool,
    user_id: str,
    analysis_data: Dict[str, Any],
    model_used: str
) -> int:
    """
    Store analysis results in database

    Args:
        db_pool: Database connection pool
        user_id: User identifier
        analysis_data: Analysis results
        model_used: Claude model used

    Returns:
        Analysis record ID
    """
    # Extract overall sentiment
    overall_sentiment = analysis_data.get('overall_sentiment', 'neutral')
    overall_confidence = analysis_data.get('overall_confidence', 0.0)

    async with db_pool.acquire() as conn:
        analysis_id = await conn.fetchval(
            """
            INSERT INTO analyses (
                user_id,
                analysis_type,
                sentiment,
                confidence,
                result_data,
                model_used,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
            """,
            user_id,
            'sentiment_analysis',
            overall_sentiment,
            overall_confidence,
            analysis_data,
            model_used,
            datetime.utcnow()
        )

    logger.info(f"Stored analysis results (ID: {analysis_id}) for user {mask_id(user_id)}")
    return analysis_id


@task(name="update_quota_counter", retries=2)
async def update_quota_counter(
    db_pool: asyncpg.Pool,
    user_id: str,
    analysis_id: int
):
    """
    Update quota usage counter

    Args:
        db_pool: Database connection pool
        user_id: User identifier
        analysis_id: Analysis record ID
    """
    # Quota is tracked via analysis count, so this is just a confirmation log
    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO audit_log (
                user_id,
                action,
                details,
                created_at
            ) VALUES ($1, $2, $3, $4)
            """,
            user_id,
            'quota_used',
            {
                'analysis_id': analysis_id,
                'timestamp': datetime.utcnow().isoformat()
            },
            datetime.utcnow()
        )

    logger.debug(f"Updated quota counter for user {mask_id(user_id)}")


@task(name="log_analysis_to_audit", retries=2)
async def log_analysis_to_audit(
    db_pool: asyncpg.Pool,
    user_id: str,
    analysis_id: int,
    tweets_analyzed: int,
    model_used: str
):
    """
    Log analysis to audit log (with PII redaction)

    Args:
        db_pool: Database connection pool
        user_id: User identifier
        analysis_id: Analysis record ID
        tweets_analyzed: Number of tweets analyzed
        model_used: Model used for analysis
    """
    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO audit_log (
                user_id,
                action,
                details,
                created_at
            ) VALUES ($1, $2, $3, $4)
            """,
            user_id,
            'ai_analysis',
            {
                'analysis_id': analysis_id,
                'tweets_analyzed': tweets_analyzed,
                'model_used': model_used,
                'timestamp': datetime.utcnow().isoformat()
            },
            datetime.utcnow()
        )

    logger.debug(f"Logged analysis to audit for user {mask_id(user_id)}")


@flow(name="ai_sentiment_analysis", log_prints=True, retries=1)
async def ai_analysis_flow(
    db_url: str,
    redis_url: str,
    user_id: str,
    anthropic_api_key: str,
    max_tweets: int = 50
) -> Dict[str, Any]:
    """
    AI sentiment analysis flow with full compliance

    Args:
        db_url: Database connection URL
        redis_url: Redis connection URL
        user_id: User identifier
        anthropic_api_key: Anthropic API key
        max_tweets: Maximum tweets to analyze

    Returns:
        Analysis result summary
    """
    logger.info(f"Starting AI analysis for user {mask_id(user_id)}")

    # Initialize services
    db_pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10)
    rate_limiter = RedisRateLimiter(redis_url)

    try:
        # STEP 1: Verify consent and active subscription
        try:
            consent_result = await verify_full_consent(
                db_pool,
                user_id,
                provider='twitter',
                required_tier=None  # Any tier can use AI
            )
        except ConsentError as e:
            logger.error(f"Consent verification failed: {e.reason}")
            raise

        subscription_info = consent_result['subscription_info']
        tier = subscription_info['tier']

        # STEP 2: Check API usage quota (enforce strictly)
        try:
            quota_info = await check_api_quota(db_pool, user_id, tier)
        except Exception as e:
            # Log quota exceeded to audit
            async with db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO audit_log (user_id, action, details, created_at)
                    VALUES ($1, $2, $3, $4)
                    """,
                    user_id,
                    'quota_exceeded',
                    {
                        'tier': tier,
                        'reason': str(e)
                    },
                    datetime.utcnow()
                )
            raise

        # STEP 3: Fetch raw data
        tweets = await fetch_tweets_for_analysis(db_pool, user_id, max_tweets)

        if not tweets:
            logger.warning(f"No tweets found for analysis (user: {mask_id(user_id)})")
            return {
                'success': False,
                'error': 'No tweets available for analysis'
            }

        # STEP 4: Route by tier (Basic→Sonnet, Pro→Opus)
        model_mapping = {
            'basic': 'claude-3-sonnet-20240229',
            'pro': 'claude-3-opus-20240229',
            'enterprise': 'claude-3-opus-20240229'
        }
        model = model_mapping.get(tier.lower(), 'claude-3-sonnet-20240229')

        # STEP 5: Sanitize prompt (remove PII)
        prompt, is_valid = PromptSanitizer.sanitize_and_validate(
            tweets,
            analysis_type='sentiment'
        )

        if not is_valid:
            logger.error(f"Prompt sanitization failed for user {mask_id(user_id)}")
            raise ValueError("Prompt contains PII - cannot send to Anthropic")

        # STEP 6: Call Anthropic API with rate limiting
        api_response = await call_anthropic_api(
            anthropic_api_key,
            prompt,
            model,
            user_id,
            rate_limiter
        )

        # STEP 7: Parse and store results
        analysis_data = await parse_analysis_response(api_response)
        analysis_id = await store_analysis_results(
            db_pool,
            user_id,
            analysis_data,
            model
        )

        # STEP 8: Update quota counter
        await update_quota_counter(db_pool, user_id, analysis_id)

        # STEP 9: Log with PII redaction
        await log_analysis_to_audit(
            db_pool,
            user_id,
            analysis_id,
            len(tweets),
            model
        )

        logger.info(
            f"AI analysis completed for user {mask_id(user_id)}. "
            f"Analysis ID: {analysis_id}, Model: {model}"
        )

        return {
            'success': True,
            'analysis_id': analysis_id,
            'user_id': user_id,
            'tweets_analyzed': len(tweets),
            'model_used': model,
            'quota_remaining': quota_info['quota_remaining'],
            'timestamp': datetime.utcnow().isoformat()
        }

    except RateLimitExceeded as e:
        logger.warning(f"Rate limit exceeded: {e}")
        # Log to audit
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO audit_log (user_id, action, details, created_at)
                VALUES ($1, $2, $3, $4)
                """,
                user_id,
                'rate_limit_exceeded',
                {
                    'limit_type': e.limit_type,
                    'retry_after': e.retry_after
                },
                datetime.utcnow()
            )
        raise

    except Exception as e:
        logger.error(
            f"AI analysis failed: {PIIRedactor.redact_error_message(e)}"
        )
        raise

    finally:
        await db_pool.close()


if __name__ == "__main__":
    import asyncio
    import os

    # For testing
    asyncio.run(ai_analysis_flow(
        db_url=os.getenv('DATABASE_URL'),
        redis_url=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
        user_id=os.getenv('TEST_USER_ID'),
        anthropic_api_key=os.getenv('ANTHROPIC_API_KEY')
    ))
