"""
User Data Export Flow (GDPR Article 20, CCPA Section 1798.110)
Allows users to export all their data
"""

import logging
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List
import secrets
from prefect import flow, task
import asyncpg

from .utils.pii_redaction import mask_id

logger = logging.getLogger(__name__)


@task(name="collect_user_profile_data", retries=2)
async def collect_user_profile_data(
    db_pool: asyncpg.Pool,
    user_id: str
) -> Dict[str, Any]:
    """
    Collect user profile data

    Args:
        db_pool: Database connection pool
        user_id: User identifier

    Returns:
        Dictionary with user profile data
    """
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            """
            SELECT
                id,
                email,
                full_name,
                created_at,
                updated_at
            FROM users
            WHERE id = $1
            """,
            user_id
        )

    if not user:
        logger.warning(f"User not found: {mask_id(user_id)}")
        return {}

    return {
        'user_id': user['id'],
        'email': user['email'],
        'full_name': user['full_name'],
        'account_created': user['created_at'].isoformat(),
        'last_updated': user['updated_at'].isoformat() if user['updated_at'] else None
    }


@task(name="collect_oauth_data", retries=2)
async def collect_oauth_data(
    db_pool: asyncpg.Pool,
    user_id: str
) -> List[Dict[str, Any]]:
    """
    Collect OAuth authorization history (without sensitive tokens)

    Args:
        db_pool: Database connection pool
        user_id: User identifier

    Returns:
        List of OAuth authorizations
    """
    async with db_pool.acquire() as conn:
        tokens = await conn.fetch(
            """
            SELECT
                provider,
                revoked,
                created_at,
                expires_at
            FROM oauth_tokens
            WHERE user_id = $1
            ORDER BY created_at DESC
            """,
            user_id
        )

    return [
        {
            'provider': t['provider'],
            'authorized_at': t['created_at'].isoformat(),
            'expires_at': t['expires_at'].isoformat() if t['expires_at'] else None,
            'revoked': t['revoked']
        }
        for t in tokens
    ]


@task(name="collect_subscription_data", retries=2)
async def collect_subscription_data(
    db_pool: asyncpg.Pool,
    user_id: str
) -> List[Dict[str, Any]]:
    """
    Collect subscription history

    Args:
        db_pool: Database connection pool
        user_id: User identifier

    Returns:
        List of subscriptions
    """
    async with db_pool.acquire() as conn:
        subscriptions = await conn.fetch(
            """
            SELECT
                tier,
                status,
                start_date,
                end_date,
                cancelled_at,
                created_at
            FROM subscriptions
            WHERE user_id = $1
            ORDER BY created_at DESC
            """,
            user_id
        )

    return [
        {
            'tier': s['tier'],
            'status': s['status'],
            'start_date': s['start_date'].isoformat(),
            'end_date': s['end_date'].isoformat() if s['end_date'] else None,
            'cancelled_at': s['cancelled_at'].isoformat() if s['cancelled_at'] else None,
            'created_at': s['created_at'].isoformat()
        }
        for s in subscriptions
    ]


@task(name="collect_twitter_data", retries=2)
async def collect_twitter_data(
    db_pool: asyncpg.Pool,
    user_id: str
) -> List[Dict[str, Any]]:
    """
    Collect stored Twitter data

    Args:
        db_pool: Database connection pool
        user_id: User identifier

    Returns:
        List of Twitter data records
    """
    async with db_pool.acquire() as conn:
        twitter_data = await conn.fetch(
            """
            SELECT
                tweet_id,
                tweet_text,
                tweet_created_at,
                author_id,
                fetched_at,
                created_at
            FROM twitter_data
            WHERE user_id = $1
              AND deleted_at IS NULL
            ORDER BY created_at DESC
            """,
            user_id
        )

    return [
        {
            'tweet_id': t['tweet_id'],
            'text': t['tweet_text'],
            'posted_at': t['tweet_created_at'].isoformat() if t['tweet_created_at'] else None,
            'author_id': t['author_id'],
            'fetched_at': t['fetched_at'].isoformat() if t['fetched_at'] else None,
            'stored_at': t['created_at'].isoformat()
        }
        for t in twitter_data
    ]


@task(name="collect_analysis_data", retries=2)
async def collect_analysis_data(
    db_pool: asyncpg.Pool,
    user_id: str
) -> List[Dict[str, Any]]:
    """
    Collect AI analysis results

    Args:
        db_pool: Database connection pool
        user_id: User identifier

    Returns:
        List of analysis results
    """
    async with db_pool.acquire() as conn:
        analyses = await conn.fetch(
            """
            SELECT
                id,
                analysis_type,
                sentiment,
                confidence,
                result_data,
                created_at
            FROM analyses
            WHERE user_id = $1
              AND deleted_at IS NULL
            ORDER BY created_at DESC
            """,
            user_id
        )

    return [
        {
            'analysis_id': a['id'],
            'type': a['analysis_type'],
            'sentiment': a['sentiment'],
            'confidence': float(a['confidence']) if a['confidence'] else None,
            'results': a['result_data'],
            'analyzed_at': a['created_at'].isoformat()
        }
        for a in analyses
    ]


@task(name="collect_audit_log_data", retries=2)
async def collect_audit_log_data(
    db_pool: asyncpg.Pool,
    user_id: str
) -> List[Dict[str, Any]]:
    """
    Collect audit log entries

    Args:
        db_pool: Database connection pool
        user_id: User identifier

    Returns:
        List of audit log entries
    """
    async with db_pool.acquire() as conn:
        logs = await conn.fetch(
            """
            SELECT
                action,
                details,
                created_at
            FROM audit_log
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1000
            """,
            user_id
        )

    return [
        {
            'action': log['action'],
            'details': log['details'],
            'timestamp': log['created_at'].isoformat()
        }
        for log in logs
    ]


@task(name="generate_export_package", retries=1)
async def generate_export_package(
    user_profile: Dict,
    oauth_data: List[Dict],
    subscription_data: List[Dict],
    twitter_data: List[Dict],
    analysis_data: List[Dict],
    audit_logs: List[Dict]
) -> str:
    """
    Generate complete export package in JSON format

    Returns:
        JSON string with all user data
    """
    export_package = {
        'export_metadata': {
            'generated_at': datetime.utcnow().isoformat(),
            'format_version': '1.0',
            'data_subject_rights': 'GDPR Article 20, CCPA Section 1798.110'
        },
        'user_profile': user_profile,
        'oauth_authorizations': oauth_data,
        'subscription_history': subscription_data,
        'twitter_data': twitter_data,
        'ai_analyses': analysis_data,
        'audit_log': audit_logs,
        'summary': {
            'total_oauth_authorizations': len(oauth_data),
            'total_subscriptions': len(subscription_data),
            'total_tweets_stored': len(twitter_data),
            'total_analyses': len(analysis_data),
            'total_audit_entries': len(audit_logs)
        }
    }

    return json.dumps(export_package, indent=2, default=str)


@task(name="store_export_file", retries=2)
async def store_export_file(
    db_pool: asyncpg.Pool,
    user_id: str,
    export_data: str
) -> str:
    """
    Store export file and generate download token

    Args:
        db_pool: Database connection pool
        user_id: User identifier
        export_data: JSON export data

    Returns:
        Download token
    """
    download_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=24)

    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO data_exports (
                user_id,
                download_token,
                export_data,
                expires_at,
                created_at
            ) VALUES ($1, $2, $3, $4, $5)
            """,
            user_id,
            download_token,
            export_data,
            expires_at,
            datetime.utcnow()
        )

    logger.info(f"Created data export for user {mask_id(user_id)}, expires in 24h")
    return download_token


@task(name="log_export_request", retries=2)
async def log_export_request(
    db_pool: asyncpg.Pool,
    user_id: str,
    export_size_bytes: int
):
    """
    Log data export request to audit log

    Args:
        db_pool: Database connection pool
        user_id: User identifier
        export_size_bytes: Size of export file
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
            'data_export_request',
            {
                'export_size_bytes': export_size_bytes,
                'export_format': 'json',
                'timestamp': datetime.utcnow().isoformat()
            },
            datetime.utcnow()
        )


@task(name="cleanup_expired_exports", retries=1)
async def cleanup_expired_exports(db_pool: asyncpg.Pool) -> int:
    """
    Delete expired export files

    Args:
        db_pool: Database connection pool

    Returns:
        Number of exports deleted
    """
    async with db_pool.acquire() as conn:
        result = await conn.execute(
            """
            DELETE FROM data_exports
            WHERE expires_at < NOW()
            """,
        )

    deleted_count = int(result.split()[-1])
    logger.info(f"Deleted {deleted_count} expired data exports")
    return deleted_count


@flow(name="user_data_export", log_prints=True)
async def user_data_export_flow(
    db_url: str,
    user_id: str
) -> Dict[str, Any]:
    """
    Complete user data export flow (GDPR Article 20, CCPA compliance)

    Args:
        db_url: Database connection URL
        user_id: User identifier

    Returns:
        Dictionary with download token and metadata

    Endpoint: POST /api/users/export-data
    """
    logger.info(f"Starting data export for user {mask_id(user_id)}")

    # Create database connection pool
    db_pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10)

    try:
        # Collect all user data in parallel
        user_profile = await collect_user_profile_data(db_pool, user_id)
        oauth_data = await collect_oauth_data(db_pool, user_id)
        subscription_data = await collect_subscription_data(db_pool, user_id)
        twitter_data = await collect_twitter_data(db_pool, user_id)
        analysis_data = await collect_analysis_data(db_pool, user_id)
        audit_logs = await collect_audit_log_data(db_pool, user_id)

        # Generate export package
        export_json = await generate_export_package(
            user_profile,
            oauth_data,
            subscription_data,
            twitter_data,
            analysis_data,
            audit_logs
        )

        # Store export and get download token
        download_token = await store_export_file(db_pool, user_id, export_json)

        # Log export request
        export_size = len(export_json.encode('utf-8'))
        await log_export_request(db_pool, user_id, export_size)

        # Cleanup old exports
        await cleanup_expired_exports(db_pool)

        logger.info(
            f"Data export completed for user {mask_id(user_id)}. "
            f"Size: {export_size} bytes"
        )

        return {
            'success': True,
            'download_token': download_token,
            'expires_in_hours': 24,
            'export_size_bytes': export_size,
            'generated_at': datetime.utcnow().isoformat()
        }

    finally:
        await db_pool.close()


if __name__ == "__main__":
    import asyncio
    import os

    # For testing
    db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/repazoo')
    test_user_id = os.getenv('TEST_USER_ID', 'test-user-123')

    result = asyncio.run(user_data_export_flow(db_url, test_user_id))
    print(json.dumps(result, indent=2))
