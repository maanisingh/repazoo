"""
Data Retention and Cleanup Flow
Automated deletion of old data per compliance requirements
Compliance: GDPR Article 5, CCPA Section 1798.105
Schedule: Daily at 3 AM UTC
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
from prefect import flow, task
import asyncpg

from .utils.pii_redaction import mask_id

logger = logging.getLogger(__name__)


@task(name="find_expired_data", retries=2)
async def find_expired_data(
    db_pool: asyncpg.Pool,
    retention_days: int = 90
) -> List[Dict[str, Any]]:
    """
    Find records older than retention period with inactive subscriptions

    Args:
        db_pool: Database connection pool
        retention_days: Retention period in days

    Returns:
        List of records to delete
    """
    cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

    async with db_pool.acquire() as conn:
        # Find old analysis results for inactive users
        records = await conn.fetch(
            """
            SELECT
                a.id,
                a.user_id,
                a.created_at,
                s.status as subscription_status,
                s.end_date as subscription_end_date
            FROM analyses a
            LEFT JOIN subscriptions s ON a.user_id = s.user_id
            WHERE a.created_at < $1
              AND a.deleted_at IS NULL
              AND (
                s.status != 'active'
                OR s.end_date < NOW()
                OR s.id IS NULL
              )
            ORDER BY a.created_at ASC
            """,
            cutoff_date
        )

    logger.info(f"Found {len(records)} expired analysis records")
    return [dict(r) for r in records]


@task(name="find_revoked_token_data", retries=2)
async def find_revoked_token_data(db_pool: asyncpg.Pool) -> List[str]:
    """
    Find user IDs with revoked OAuth tokens

    Args:
        db_pool: Database connection pool

    Returns:
        List of user IDs with revoked tokens
    """
    async with db_pool.acquire() as conn:
        # Find users with only revoked tokens
        user_ids = await conn.fetch(
            """
            SELECT DISTINCT user_id
            FROM oauth_tokens
            WHERE revoked = TRUE
              AND user_id NOT IN (
                SELECT user_id
                FROM oauth_tokens
                WHERE revoked = FALSE
              )
            """
        )

    user_id_list = [r['user_id'] for r in user_ids]
    logger.info(f"Found {len(user_id_list)} users with revoked tokens")
    return user_id_list


@task(name="find_cancelled_subscription_data", retries=2)
async def find_cancelled_subscription_data(
    db_pool: asyncpg.Pool,
    grace_period_days: int = 30
) -> List[str]:
    """
    Find user IDs with cancelled subscriptions past grace period

    Args:
        db_pool: Database connection pool
        grace_period_days: Grace period after cancellation

    Returns:
        List of user IDs to clean up
    """
    cutoff_date = datetime.utcnow() - timedelta(days=grace_period_days)

    async with db_pool.acquire() as conn:
        user_ids = await conn.fetch(
            """
            SELECT DISTINCT user_id
            FROM subscriptions
            WHERE status = 'cancelled'
              AND (
                cancelled_at < $1
                OR (end_date IS NOT NULL AND end_date < NOW())
              )
            """,
            cutoff_date
        )

    user_id_list = [r['user_id'] for r in user_ids]
    logger.info(f"Found {len(user_id_list)} users with cancelled subscriptions")
    return user_id_list


@task(name="soft_delete_analyses", retries=1)
async def soft_delete_analyses(
    db_pool: asyncpg.Pool,
    record_ids: List[int],
    reason: str
) -> int:
    """
    Soft delete analysis records (mark deleted_at timestamp)

    Args:
        db_pool: Database connection pool
        record_ids: IDs of records to delete
        reason: Reason for deletion (for audit)

    Returns:
        Number of records deleted
    """
    if not record_ids:
        return 0

    async with db_pool.acquire() as conn:
        result = await conn.execute(
            """
            UPDATE analyses
            SET deleted_at = $1,
                deletion_reason = $2
            WHERE id = ANY($3)
              AND deleted_at IS NULL
            """,
            datetime.utcnow(),
            reason,
            record_ids
        )

    # Parse result to get count
    deleted_count = int(result.split()[-1])
    logger.info(f"Soft deleted {deleted_count} analysis records: {reason}")
    return deleted_count


@task(name="soft_delete_user_data", retries=1)
async def soft_delete_user_data(
    db_pool: asyncpg.Pool,
    user_ids: List[str],
    reason: str
) -> Dict[str, int]:
    """
    Soft delete all data for specific users

    Args:
        db_pool: Database connection pool
        user_ids: User IDs to delete data for
        reason: Reason for deletion

    Returns:
        Dictionary with counts per table
    """
    if not user_ids:
        return {}

    deleted_counts = {}

    async with db_pool.acquire() as conn:
        # Delete analyses
        result = await conn.execute(
            """
            UPDATE analyses
            SET deleted_at = $1,
                deletion_reason = $2
            WHERE user_id = ANY($3)
              AND deleted_at IS NULL
            """,
            datetime.utcnow(),
            reason,
            user_ids
        )
        deleted_counts['analyses'] = int(result.split()[-1])

        # Delete raw Twitter data
        result = await conn.execute(
            """
            UPDATE twitter_data
            SET deleted_at = $1,
                deletion_reason = $2
            WHERE user_id = ANY($3)
              AND deleted_at IS NULL
            """,
            datetime.utcnow(),
            reason,
            user_ids
        )
        deleted_counts['twitter_data'] = int(result.split()[-1])

        # Note: We don't delete oauth_tokens or subscriptions
        # Those are kept for audit purposes

    logger.info(f"Deleted user data for {len(user_ids)} users: {deleted_counts}")
    return deleted_counts


@task(name="log_deletion_to_audit", retries=2)
async def log_deletion_to_audit(
    db_pool: asyncpg.Pool,
    user_id: str,
    deletion_details: Dict[str, Any]
):
    """
    Log deletion to audit log

    Args:
        db_pool: Database connection pool
        user_id: User ID (or 'system' for automated deletions)
        deletion_details: Details about what was deleted
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
            'data_retention_deletion',
            deletion_details,
            datetime.utcnow()
        )

    logger.debug(f"Logged deletion to audit log for user {mask_id(user_id)}")


@task(name="send_deletion_notification")
async def send_deletion_notification(
    user_id: str,
    deletion_type: str,
    deleted_counts: Dict[str, int]
):
    """
    Send notification to user about data deletion (optional)

    Args:
        user_id: User identifier
        deletion_type: Type of deletion (expired, revoked, cancelled)
        deleted_counts: Counts of deleted records
    """
    # TODO: Implement email notification via SendGrid/SES
    # For now, just log
    logger.info(
        f"Would notify user {mask_id(user_id)} about {deletion_type} deletion: "
        f"{deleted_counts}"
    )


@task(name="hard_delete_old_soft_deleted", retries=1)
async def hard_delete_old_soft_deleted(
    db_pool: asyncpg.Pool,
    soft_delete_retention_days: int = 30
) -> int:
    """
    Permanently delete records that have been soft-deleted for retention period

    Args:
        db_pool: Database connection pool
        soft_delete_retention_days: Days to keep soft-deleted records

    Returns:
        Number of records permanently deleted
    """
    cutoff_date = datetime.utcnow() - timedelta(days=soft_delete_retention_days)

    async with db_pool.acquire() as conn:
        # Hard delete old soft-deleted analyses
        result = await conn.execute(
            """
            DELETE FROM analyses
            WHERE deleted_at IS NOT NULL
              AND deleted_at < $1
            """,
            cutoff_date
        )
        analyses_deleted = int(result.split()[-1])

        # Hard delete old soft-deleted Twitter data
        result = await conn.execute(
            """
            DELETE FROM twitter_data
            WHERE deleted_at IS NOT NULL
              AND deleted_at < $1
            """,
            cutoff_date
        )
        twitter_deleted = int(result.split()[-1])

    total_deleted = analyses_deleted + twitter_deleted
    logger.info(
        f"Hard deleted {total_deleted} records "
        f"(analyses: {analyses_deleted}, twitter_data: {twitter_deleted})"
    )
    return total_deleted


@flow(name="data_retention_cleanup", log_prints=True)
async def data_retention_cleanup_flow(
    db_url: str,
    retention_days: int = 90,
    grace_period_days: int = 30,
    soft_delete_retention_days: int = 30
):
    """
    Main data retention cleanup flow

    Args:
        db_url: Database connection URL
        retention_days: Days to retain analysis data for inactive users
        grace_period_days: Grace period after subscription cancellation
        soft_delete_retention_days: Days to keep soft-deleted records

    Schedule: Daily at 3 AM UTC
    """
    logger.info("Starting data retention cleanup flow")

    # Create database connection pool
    db_pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10)

    try:
        # Step 1: Find and delete expired analysis data
        expired_records = await find_expired_data(db_pool, retention_days)
        if expired_records:
            record_ids = [r['id'] for r in expired_records]
            deleted_count = await soft_delete_analyses(
                db_pool,
                record_ids,
                f"Retention period expired ({retention_days} days)"
            )

            # Log to audit
            await log_deletion_to_audit(
                db_pool,
                'system',
                {
                    'deletion_type': 'expired_data',
                    'records_deleted': deleted_count,
                    'retention_days': retention_days
                }
            )

        # Step 2: Find and delete data for revoked OAuth tokens
        revoked_user_ids = await find_revoked_token_data(db_pool)
        if revoked_user_ids:
            for user_id in revoked_user_ids:
                deleted_counts = await soft_delete_user_data(
                    db_pool,
                    [user_id],
                    "OAuth token revoked"
                )

                # Log to audit
                await log_deletion_to_audit(
                    db_pool,
                    user_id,
                    {
                        'deletion_type': 'revoked_token',
                        'deleted_counts': deleted_counts
                    }
                )

                # Optionally notify user
                await send_deletion_notification(
                    user_id,
                    'revoked_token',
                    deleted_counts
                )

        # Step 3: Find and delete data for cancelled subscriptions
        cancelled_user_ids = await find_cancelled_subscription_data(
            db_pool,
            grace_period_days
        )
        if cancelled_user_ids:
            for user_id in cancelled_user_ids:
                deleted_counts = await soft_delete_user_data(
                    db_pool,
                    [user_id],
                    f"Subscription cancelled (grace period: {grace_period_days} days)"
                )

                # Log to audit
                await log_deletion_to_audit(
                    db_pool,
                    user_id,
                    {
                        'deletion_type': 'cancelled_subscription',
                        'deleted_counts': deleted_counts,
                        'grace_period_days': grace_period_days
                    }
                )

                # Notify user
                await send_deletion_notification(
                    user_id,
                    'cancelled_subscription',
                    deleted_counts
                )

        # Step 4: Hard delete old soft-deleted records
        hard_deleted = await hard_delete_old_soft_deleted(
            db_pool,
            soft_delete_retention_days
        )

        # Log final summary
        await log_deletion_to_audit(
            db_pool,
            'system',
            {
                'deletion_type': 'retention_cleanup_summary',
                'expired_records_deleted': len(expired_records),
                'revoked_users_processed': len(revoked_user_ids),
                'cancelled_users_processed': len(cancelled_user_ids),
                'hard_deleted_records': hard_deleted,
                'timestamp': datetime.utcnow().isoformat()
            }
        )

        logger.info(
            f"Data retention cleanup completed. "
            f"Expired: {len(expired_records)}, "
            f"Revoked: {len(revoked_user_ids)}, "
            f"Cancelled: {len(cancelled_user_ids)}, "
            f"Hard deleted: {hard_deleted}"
        )

    finally:
        await db_pool.close()


if __name__ == "__main__":
    import asyncio
    import os

    # For testing
    db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/repazoo')
    asyncio.run(data_retention_cleanup_flow(db_url))
