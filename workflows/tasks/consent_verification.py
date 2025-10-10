"""
Consent Verification Tasks
Validates user consent before data access
Compliance: GDPR Article 7, CCPA Section 1798.120
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from prefect import task
import asyncpg

from ..utils.pii_redaction import mask_id

logger = logging.getLogger(__name__)


class ConsentError(Exception):
    """Raised when consent verification fails"""
    def __init__(self, reason: str, user_id: str):
        self.reason = reason
        self.user_id = user_id
        super().__init__(f"Consent verification failed for user {mask_id(user_id)}: {reason}")


@task(name="verify_oauth_consent", retries=2, retry_delay_seconds=5)
async def verify_oauth_consent(
    db_pool: asyncpg.Pool,
    user_id: str,
    provider: str = 'twitter'
) -> Dict[str, Any]:
    """
    Verify OAuth token is valid and not revoked

    Args:
        db_pool: Database connection pool
        user_id: User identifier
        provider: OAuth provider (default: twitter)

    Returns:
        Dictionary with token info if valid

    Raises:
        ConsentError: If token is revoked or invalid
    """
    async with db_pool.acquire() as conn:
        # Query oauth_tokens table
        token_record = await conn.fetchrow(
            """
            SELECT
                id,
                user_id,
                provider,
                access_token,
                refresh_token,
                expires_at,
                revoked,
                created_at,
                updated_at
            FROM oauth_tokens
            WHERE user_id = $1
              AND provider = $2
              AND revoked = FALSE
            ORDER BY created_at DESC
            LIMIT 1
            """,
            user_id,
            provider
        )

        if not token_record:
            logger.warning(f"No valid OAuth token found for user {mask_id(user_id)}")
            raise ConsentError("No valid OAuth token found", user_id)

        # Check if token is revoked
        if token_record['revoked']:
            logger.warning(f"OAuth token revoked for user {mask_id(user_id)}")
            raise ConsentError("OAuth token has been revoked", user_id)

        # Check if token is expired
        if token_record['expires_at'] and token_record['expires_at'] < datetime.utcnow():
            logger.info(f"OAuth token expired for user {mask_id(user_id)}, needs refresh")
            # Note: Expired tokens can be refreshed, so this is not a consent error
            # The caller should handle token refresh

        logger.info(f"OAuth consent verified for user {mask_id(user_id)}")

        return {
            'token_id': token_record['id'],
            'user_id': token_record['user_id'],
            'provider': token_record['provider'],
            'access_token': token_record['access_token'],
            'refresh_token': token_record['refresh_token'],
            'expires_at': token_record['expires_at'],
            'is_expired': token_record['expires_at'] < datetime.utcnow() if token_record['expires_at'] else False
        }


@task(name="verify_subscription_status", retries=2, retry_delay_seconds=5)
async def verify_subscription_status(
    db_pool: asyncpg.Pool,
    user_id: str,
    required_tier: Optional[str] = None
) -> Dict[str, Any]:
    """
    Verify user has active subscription

    Args:
        db_pool: Database connection pool
        user_id: User identifier
        required_tier: Optional minimum tier required (basic, pro, enterprise)

    Returns:
        Dictionary with subscription info if active

    Raises:
        ConsentError: If subscription is inactive or cancelled
    """
    async with db_pool.acquire() as conn:
        # Query subscriptions table
        subscription = await conn.fetchrow(
            """
            SELECT
                id,
                user_id,
                stripe_subscription_id,
                tier,
                status,
                start_date,
                end_date,
                cancelled_at,
                created_at,
                updated_at
            FROM subscriptions
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1
            """,
            user_id
        )

        if not subscription:
            logger.warning(f"No subscription found for user {mask_id(user_id)}")
            raise ConsentError("No subscription found", user_id)

        # Check subscription status
        if subscription['status'] != 'active':
            logger.warning(
                f"Inactive subscription for user {mask_id(user_id)}: "
                f"status={subscription['status']}"
            )
            raise ConsentError(f"Subscription status is {subscription['status']}", user_id)

        # Check if subscription has ended
        now = datetime.utcnow()
        if subscription['end_date'] and subscription['end_date'] < now:
            logger.warning(f"Expired subscription for user {mask_id(user_id)}")
            raise ConsentError("Subscription has expired", user_id)

        # Check if subscription was cancelled
        if subscription['cancelled_at']:
            # Allow until end_date if set
            if not subscription['end_date'] or subscription['end_date'] < now:
                logger.warning(f"Cancelled subscription for user {mask_id(user_id)}")
                raise ConsentError("Subscription has been cancelled", user_id)

        # Check tier requirement
        tier_hierarchy = {'basic': 1, 'pro': 2, 'enterprise': 3}
        if required_tier:
            user_tier_level = tier_hierarchy.get(subscription['tier'].lower(), 0)
            required_tier_level = tier_hierarchy.get(required_tier.lower(), 0)

            if user_tier_level < required_tier_level:
                logger.warning(
                    f"Insufficient tier for user {mask_id(user_id)}: "
                    f"has {subscription['tier']}, needs {required_tier}"
                )
                raise ConsentError(
                    f"Subscription tier {subscription['tier']} insufficient, requires {required_tier}",
                    user_id
                )

        logger.info(
            f"Subscription verified for user {mask_id(user_id)}: "
            f"tier={subscription['tier']}, status={subscription['status']}"
        )

        return {
            'subscription_id': subscription['id'],
            'user_id': subscription['user_id'],
            'tier': subscription['tier'],
            'status': subscription['status'],
            'start_date': subscription['start_date'],
            'end_date': subscription['end_date'],
            'is_cancelled': subscription['cancelled_at'] is not None
        }


@task(name="verify_consent_timestamp", retries=1)
async def verify_consent_timestamp(
    db_pool: asyncpg.Pool,
    user_id: str,
    max_age_days: int = 365
) -> bool:
    """
    Verify consent was given within acceptable timeframe

    Args:
        db_pool: Database connection pool
        user_id: User identifier
        max_age_days: Maximum age of consent in days

    Returns:
        True if consent is recent enough

    Raises:
        ConsentError: If consent is too old or not found
    """
    async with db_pool.acquire() as conn:
        # Check when OAuth was granted (proxy for consent)
        token_record = await conn.fetchrow(
            """
            SELECT created_at
            FROM oauth_tokens
            WHERE user_id = $1
              AND revoked = FALSE
            ORDER BY created_at DESC
            LIMIT 1
            """,
            user_id
        )

        if not token_record:
            raise ConsentError("No consent record found", user_id)

        consent_age = datetime.utcnow() - token_record['created_at']

        if consent_age > timedelta(days=max_age_days):
            logger.warning(
                f"Consent too old for user {mask_id(user_id)}: "
                f"{consent_age.days} days (max: {max_age_days})"
            )
            raise ConsentError(
                f"Consent expired (granted {consent_age.days} days ago)",
                user_id
            )

        logger.info(f"Consent timestamp valid for user {mask_id(user_id)}")
        return True


@task(name="verify_full_consent")
async def verify_full_consent(
    db_pool: asyncpg.Pool,
    user_id: str,
    provider: str = 'twitter',
    required_tier: Optional[str] = None,
    max_consent_age_days: int = 365
) -> Dict[str, Any]:
    """
    Complete consent verification pipeline

    Args:
        db_pool: Database connection pool
        user_id: User identifier
        provider: OAuth provider
        required_tier: Optional minimum subscription tier
        max_consent_age_days: Maximum age of consent

    Returns:
        Dictionary with verification results

    Raises:
        ConsentError: If any verification step fails
    """
    logger.info(f"Starting full consent verification for user {mask_id(user_id)}")

    try:
        # Step 1: Verify OAuth token
        oauth_info = await verify_oauth_consent(db_pool, user_id, provider)

        # Step 2: Verify subscription
        subscription_info = await verify_subscription_status(
            db_pool,
            user_id,
            required_tier
        )

        # Step 3: Verify consent timestamp
        consent_valid = await verify_consent_timestamp(
            db_pool,
            user_id,
            max_consent_age_days
        )

        logger.info(f"Full consent verification passed for user {mask_id(user_id)}")

        return {
            'user_id': user_id,
            'consent_valid': True,
            'oauth_valid': True,
            'subscription_active': True,
            'oauth_info': oauth_info,
            'subscription_info': subscription_info,
            'verified_at': datetime.utcnow()
        }

    except ConsentError as e:
        logger.error(f"Consent verification failed: {e.reason}")
        raise

    except Exception as e:
        logger.error(f"Unexpected error in consent verification: {e}")
        raise ConsentError(f"Verification error: {str(e)}", user_id)


@task(name="log_consent_verification")
async def log_consent_verification(
    db_pool: asyncpg.Pool,
    user_id: str,
    verification_result: Dict[str, Any],
    action: str
):
    """
    Log consent verification to audit log

    Args:
        db_pool: Database connection pool
        user_id: User identifier
        verification_result: Result from verify_full_consent
        action: Action that required consent verification
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
            'consent_verification',
            {
                'action_type': action,
                'consent_valid': verification_result.get('consent_valid', False),
                'oauth_valid': verification_result.get('oauth_valid', False),
                'subscription_active': verification_result.get('subscription_active', False),
                'verified_at': verification_result.get('verified_at').isoformat()
            },
            datetime.utcnow()
        )

    logger.debug(f"Logged consent verification for user {mask_id(user_id)}")
