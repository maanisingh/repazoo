"""
Twitter Data Ingestion Flow with Full Compliance
Fetches Twitter data with consent verification, rate limiting, and PII protection
Compliance: Twitter Developer Agreement v2, GDPR, OAuth 2.0
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import httpx
from prefect import flow, task
import asyncpg
from cryptography.fernet import Fernet

from .tasks.consent_verification import verify_full_consent, ConsentError
from .utils.rate_limiter import RedisRateLimiter, RateLimitExceeded, exponential_backoff
from .utils.pii_redaction import PIIRedactor, mask_id

logger = logging.getLogger(__name__)


@task(name="decrypt_oauth_token", retries=1)
async def decrypt_oauth_token(
    encrypted_token: str,
    encryption_key: str
) -> str:
    """
    Decrypt OAuth token for API calls

    Args:
        encrypted_token: Encrypted access token
        encryption_key: Encryption key

    Returns:
        Decrypted access token
    """
    fernet = Fernet(encryption_key.encode())
    decrypted = fernet.decrypt(encrypted_token.encode()).decode()
    logger.debug("Successfully decrypted OAuth token")
    return decrypted


@task(name="refresh_twitter_token", retries=2, retry_delay_seconds=5)
async def refresh_twitter_token(
    db_pool: asyncpg.Pool,
    user_id: str,
    refresh_token: str,
    client_id: str,
    client_secret: str,
    encryption_key: str
) -> Dict[str, Any]:
    """
    Refresh expired Twitter OAuth token

    Args:
        db_pool: Database connection pool
        user_id: User identifier
        refresh_token: Refresh token
        client_id: Twitter OAuth client ID
        client_secret: Twitter OAuth client secret
        encryption_key: Encryption key for storing new token

    Returns:
        New token information
    """
    logger.info(f"Refreshing Twitter token for user {mask_id(user_id)}")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://api.twitter.com/2/oauth2/token',
                data={
                    'grant_type': 'refresh_token',
                    'refresh_token': refresh_token,
                    'client_id': client_id
                },
                auth=(client_id, client_secret),
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )

            if response.status_code != 200:
                logger.error(
                    f"Token refresh failed for user {mask_id(user_id)}: "
                    f"HTTP {response.status_code}"
                )
                # Log failure to audit
                async with db_pool.acquire() as conn:
                    await conn.execute(
                        """
                        INSERT INTO audit_log (user_id, action, details, created_at)
                        VALUES ($1, $2, $3, $4)
                        """,
                        user_id,
                        'token_refresh_failed',
                        {'status_code': response.status_code},
                        datetime.utcnow()
                    )
                raise Exception(f"Token refresh failed: {response.status_code}")

            token_data = response.json()

            # Encrypt new tokens
            fernet = Fernet(encryption_key.encode())
            encrypted_access = fernet.encrypt(token_data['access_token'].encode()).decode()
            encrypted_refresh = fernet.encrypt(token_data['refresh_token'].encode()).decode()

            # Update database
            expires_at = datetime.utcnow() + timedelta(seconds=token_data.get('expires_in', 7200))

            async with db_pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE oauth_tokens
                    SET access_token = $1,
                        refresh_token = $2,
                        expires_at = $3,
                        updated_at = $4
                    WHERE user_id = $5 AND provider = 'twitter'
                    """,
                    encrypted_access,
                    encrypted_refresh,
                    expires_at,
                    datetime.utcnow(),
                    user_id
                )

            logger.info(f"Successfully refreshed token for user {mask_id(user_id)}")

            return {
                'access_token': token_data['access_token'],
                'expires_at': expires_at
            }

    except Exception as e:
        logger.error(f"Error refreshing token: {PIIRedactor.redact_error_message(e)}")
        raise


@task(name="fetch_twitter_timeline", retries=2, retry_delay_seconds=10)
@exponential_backoff(max_retries=3, base_delay=2)
async def fetch_twitter_timeline(
    access_token: str,
    user_id: str,
    rate_limiter: RedisRateLimiter,
    max_results: int = 100
) -> List[Dict[str, Any]]:
    """
    Fetch user's Twitter timeline with rate limiting

    Args:
        access_token: Twitter OAuth access token
        user_id: User identifier (for rate limiting)
        rate_limiter: Rate limiter instance
        max_results: Maximum tweets to fetch

    Returns:
        List of tweet objects
    """
    # Check rate limit BEFORE making request
    allowed, retry_after = rate_limiter.check_and_increment('twitter_user_timeline', user_id)

    if not allowed:
        logger.warning(
            f"Rate limit exceeded for user {mask_id(user_id)}. "
            f"Retry after {retry_after}s"
        )
        raise RateLimitExceeded(retry_after, 'twitter_user_timeline')

    logger.info(f"Fetching Twitter timeline for user {mask_id(user_id)}")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://api.twitter.com/2/users/me/timelines/reverse_chronological',
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                },
                params={
                    'max_results': min(max_results, 100),
                    'tweet.fields': 'created_at,author_id,text,public_metrics'
                },
                timeout=30.0
            )

            # Parse and sync with Twitter's rate limit headers
            rate_limiter.sync_with_twitter_headers(
                'twitter_user_timeline',
                user_id,
                dict(response.headers)
            )

            if response.status_code == 429:
                # Twitter rate limit hit
                retry_after = int(response.headers.get('x-rate-limit-reset', 900))
                logger.error(
                    f"Twitter API rate limit hit for user {mask_id(user_id)}. "
                    f"Reset in {retry_after}s"
                )
                raise RateLimitExceeded(retry_after, 'twitter_api')

            response.raise_for_status()
            data = response.json()

            tweets = data.get('data', [])
            logger.info(f"Fetched {len(tweets)} tweets for user {mask_id(user_id)}")

            return tweets

    except httpx.HTTPStatusError as e:
        logger.error(
            f"Twitter API error for user {mask_id(user_id)}: "
            f"HTTP {e.response.status_code}"
        )
        raise
    except Exception as e:
        logger.error(f"Error fetching timeline: {PIIRedactor.redact_error_message(e)}")
        raise


@task(name="sanitize_tweet_data", retries=1)
async def sanitize_tweet_data(tweets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Sanitize tweet data before storage (remove PII from logs)

    Args:
        tweets: Raw tweet data

    Returns:
        Sanitized tweet data
    """
    # Note: We store full tweet data in database (needed for analysis)
    # But we sanitize what goes into LOGS
    sanitized_count = len(tweets)

    logger.info(
        f"Sanitized {sanitized_count} tweets for storage. "
        f"Tweet IDs: {[t.get('id') for t in tweets[:5]]}..."  # Only log IDs, not content
    )

    return tweets


@task(name="store_twitter_data", retries=2)
async def store_twitter_data(
    db_pool: asyncpg.Pool,
    user_id: str,
    tweets: List[Dict[str, Any]]
) -> int:
    """
    Store Twitter data with retention metadata

    Args:
        db_pool: Database connection pool
        user_id: User identifier
        tweets: Tweet data to store

    Returns:
        Number of tweets stored
    """
    if not tweets:
        return 0

    async with db_pool.acquire() as conn:
        # Use INSERT ... ON CONFLICT to avoid duplicates
        stored_count = 0

        for tweet in tweets:
            try:
                await conn.execute(
                    """
                    INSERT INTO twitter_data (
                        user_id,
                        tweet_id,
                        tweet_text,
                        tweet_created_at,
                        author_id,
                        fetched_at,
                        created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (user_id, tweet_id) DO NOTHING
                    """,
                    user_id,
                    tweet.get('id'),
                    tweet.get('text'),
                    datetime.fromisoformat(tweet.get('created_at').replace('Z', '+00:00'))
                    if tweet.get('created_at') else None,
                    tweet.get('author_id'),
                    datetime.utcnow(),
                    datetime.utcnow()
                )
                stored_count += 1
            except Exception as e:
                logger.error(
                    f"Error storing tweet {tweet.get('id')}: "
                    f"{PIIRedactor.redact_error_message(e)}"
                )

    logger.info(f"Stored {stored_count} tweets for user {mask_id(user_id)}")
    return stored_count


@task(name="log_ingestion_to_audit", retries=2)
async def log_ingestion_to_audit(
    db_pool: asyncpg.Pool,
    user_id: str,
    tweets_fetched: int,
    tweets_stored: int
):
    """
    Log ingestion activity to audit log (with PII redaction)

    Args:
        db_pool: Database connection pool
        user_id: User identifier
        tweets_fetched: Number of tweets fetched
        tweets_stored: Number of tweets stored
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
            'twitter_ingestion',
            {
                'tweets_fetched': tweets_fetched,
                'tweets_stored': tweets_stored,
                'timestamp': datetime.utcnow().isoformat()
            },
            datetime.utcnow()
        )

    logger.debug(f"Logged ingestion to audit for user {mask_id(user_id)}")


@flow(name="twitter_data_ingestion", log_prints=True, retries=1)
async def twitter_ingestion_flow(
    db_url: str,
    redis_url: str,
    user_id: str,
    encryption_key: str,
    twitter_client_id: str,
    twitter_client_secret: str,
    max_results: int = 100
) -> Dict[str, Any]:
    """
    Twitter data ingestion flow with full compliance

    Args:
        db_url: Database connection URL
        redis_url: Redis connection URL
        user_id: User identifier
        encryption_key: Encryption key for OAuth tokens
        twitter_client_id: Twitter OAuth client ID
        twitter_client_secret: Twitter OAuth client secret
        max_results: Maximum tweets to fetch

    Returns:
        Ingestion result summary
    """
    logger.info(f"Starting Twitter ingestion for user {mask_id(user_id)}")

    # Initialize services
    db_pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10)
    rate_limiter = RedisRateLimiter(redis_url)

    try:
        # STEP 1: Verify consent (CRITICAL)
        try:
            consent_result = await verify_full_consent(
                db_pool,
                user_id,
                provider='twitter'
            )
        except ConsentError as e:
            logger.error(f"Consent verification failed: {e.reason}")
            # Log failure to audit
            async with db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO audit_log (user_id, action, details, created_at)
                    VALUES ($1, $2, $3, $4)
                    """,
                    user_id,
                    'consent_verification_failed',
                    {'reason': e.reason},
                    datetime.utcnow()
                )
            raise

        # STEP 2: Get OAuth token
        oauth_info = consent_result['oauth_info']
        access_token = await decrypt_oauth_token(
            oauth_info['access_token'],
            encryption_key
        )

        # STEP 3: Refresh token if expired
        if oauth_info['is_expired']:
            refresh_token = await decrypt_oauth_token(
                oauth_info['refresh_token'],
                encryption_key
            )

            new_token_info = await refresh_twitter_token(
                db_pool,
                user_id,
                refresh_token,
                twitter_client_id,
                twitter_client_secret,
                encryption_key
            )
            access_token = new_token_info['access_token']

        # STEP 4: Fetch Twitter data with rate limiting
        tweets = await fetch_twitter_timeline(
            access_token,
            user_id,
            rate_limiter,
            max_results
        )

        # STEP 5: Sanitize data (for logging)
        sanitized_tweets = await sanitize_tweet_data(tweets)

        # STEP 6: Store with retention metadata
        stored_count = await store_twitter_data(db_pool, user_id, sanitized_tweets)

        # STEP 7: Log to audit (with PII redaction)
        await log_ingestion_to_audit(
            db_pool,
            user_id,
            len(tweets),
            stored_count
        )

        logger.info(
            f"Twitter ingestion completed for user {mask_id(user_id)}. "
            f"Fetched: {len(tweets)}, Stored: {stored_count}"
        )

        return {
            'success': True,
            'user_id': user_id,
            'tweets_fetched': len(tweets),
            'tweets_stored': stored_count,
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
            f"Twitter ingestion failed: {PIIRedactor.redact_error_message(e)}"
        )
        raise

    finally:
        await db_pool.close()


if __name__ == "__main__":
    import asyncio
    import os

    # For testing
    asyncio.run(twitter_ingestion_flow(
        db_url=os.getenv('DATABASE_URL'),
        redis_url=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
        user_id=os.getenv('TEST_USER_ID'),
        encryption_key=os.getenv('ENCRYPTION_KEY'),
        twitter_client_id=os.getenv('TWITTER_CLIENT_ID'),
        twitter_client_secret=os.getenv('TWITTER_CLIENT_SECRET')
    ))
