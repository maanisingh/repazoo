"""
Monitoring and Alerting Flow
Tracks compliance violations and system health
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from prefect import flow, task
import asyncpg

from .utils.pii_redaction import mask_id

logger = logging.getLogger(__name__)


class AlertLevel:
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@task(name="check_rate_limit_violations", retries=1)
async def check_rate_limit_violations(
    db_pool: asyncpg.Pool,
    threshold_count: int = 10,
    window_minutes: int = 60
) -> List[Dict[str, Any]]:
    """
    Check for repeated rate limit violations

    Args:
        db_pool: Database connection pool
        threshold_count: Number of violations to trigger alert
        window_minutes: Time window to check

    Returns:
        List of users with excessive violations
    """
    cutoff_time = datetime.utcnow() - timedelta(minutes=window_minutes)

    async with db_pool.acquire() as conn:
        violations = await conn.fetch(
            """
            SELECT
                user_id,
                COUNT(*) as violation_count,
                MAX(created_at) as last_violation
            FROM audit_log
            WHERE action = 'rate_limit_exceeded'
              AND created_at > $1
            GROUP BY user_id
            HAVING COUNT(*) >= $2
            ORDER BY violation_count DESC
            """,
            cutoff_time,
            threshold_count
        )

    return [
        {
            'user_id': v['user_id'],
            'violation_count': v['violation_count'],
            'last_violation': v['last_violation'].isoformat(),
            'severity': AlertLevel.WARNING if v['violation_count'] < 20 else AlertLevel.CRITICAL
        }
        for v in violations
    ]


@task(name="check_token_refresh_failures", retries=1)
async def check_token_refresh_failures(
    db_pool: asyncpg.Pool,
    threshold_count: int = 3,
    window_hours: int = 24
) -> List[Dict[str, Any]]:
    """
    Check for OAuth token refresh failures

    Args:
        db_pool: Database connection pool
        threshold_count: Number of failures to trigger alert
        window_hours: Time window to check

    Returns:
        List of users with refresh failures
    """
    cutoff_time = datetime.utcnow() - timedelta(hours=window_hours)

    async with db_pool.acquire() as conn:
        failures = await conn.fetch(
            """
            SELECT
                user_id,
                COUNT(*) as failure_count,
                MAX(created_at) as last_failure
            FROM audit_log
            WHERE action = 'token_refresh_failed'
              AND created_at > $1
            GROUP BY user_id
            HAVING COUNT(*) >= $2
            ORDER BY failure_count DESC
            """,
            cutoff_time,
            threshold_count
        )

    return [
        {
            'user_id': f['user_id'],
            'failure_count': f['failure_count'],
            'last_failure': f['last_failure'].isoformat(),
            'severity': AlertLevel.CRITICAL
        }
        for f in failures
    ]


@task(name="check_quota_exceeded_attempts", retries=1)
async def check_quota_exceeded_attempts(
    db_pool: asyncpg.Pool,
    threshold_count: int = 5,
    window_hours: int = 12
) -> List[Dict[str, Any]]:
    """
    Check for repeated quota exceeded attempts

    Args:
        db_pool: Database connection pool
        threshold_count: Number of attempts to trigger alert
        window_hours: Time window to check

    Returns:
        List of users attempting to exceed quota
    """
    cutoff_time = datetime.utcnow() - timedelta(hours=window_hours)

    async with db_pool.acquire() as conn:
        attempts = await conn.fetch(
            """
            SELECT
                user_id,
                COUNT(*) as attempt_count,
                MAX(created_at) as last_attempt
            FROM audit_log
            WHERE action = 'quota_exceeded'
              AND created_at > $1
            GROUP BY user_id
            HAVING COUNT(*) >= $2
            ORDER BY attempt_count DESC
            """,
            cutoff_time,
            threshold_count
        )

    return [
        {
            'user_id': a['user_id'],
            'attempt_count': a['attempt_count'],
            'last_attempt': a['last_attempt'].isoformat(),
            'severity': AlertLevel.WARNING
        }
        for a in attempts
    ]


@task(name="check_anomalous_database_access", retries=1)
async def check_anomalous_database_access(
    db_pool: asyncpg.Pool,
    threshold_queries: int = 1000,
    window_minutes: int = 5
) -> List[Dict[str, Any]]:
    """
    Check for anomalous database access patterns

    Args:
        db_pool: Database connection pool
        threshold_queries: Query count to trigger alert
        window_minutes: Time window to check

    Returns:
        List of potential anomalies
    """
    cutoff_time = datetime.utcnow() - timedelta(minutes=window_minutes)

    async with db_pool.acquire() as conn:
        # Check for users with excessive queries
        anomalies = await conn.fetch(
            """
            SELECT
                user_id,
                COUNT(*) as query_count,
                MAX(created_at) as last_query
            FROM audit_log
            WHERE action IN ('data_access', 'analysis_request')
              AND created_at > $1
            GROUP BY user_id
            HAVING COUNT(*) >= $2
            ORDER BY query_count DESC
            """,
            cutoff_time,
            threshold_queries
        )

    return [
        {
            'user_id': a['user_id'],
            'query_count': a['query_count'],
            'last_query': a['last_query'].isoformat(),
            'severity': AlertLevel.CRITICAL,
            'description': 'Anomalously high query volume'
        }
        for a in anomalies
    ]


@task(name="check_failed_consent_verifications", retries=1)
async def check_failed_consent_verifications(
    db_pool: asyncpg.Pool,
    threshold_count: int = 5,
    window_hours: int = 24
) -> List[Dict[str, Any]]:
    """
    Check for failed consent verifications

    Args:
        db_pool: Database connection pool
        threshold_count: Failure count to trigger alert
        window_hours: Time window to check

    Returns:
        List of consent verification failures
    """
    cutoff_time = datetime.utcnow() - timedelta(hours=window_hours)

    async with db_pool.acquire() as conn:
        failures = await conn.fetch(
            """
            SELECT
                user_id,
                COUNT(*) as failure_count,
                MAX(created_at) as last_failure,
                details
            FROM audit_log
            WHERE action = 'consent_verification_failed'
              AND created_at > $1
            GROUP BY user_id, details
            HAVING COUNT(*) >= $2
            ORDER BY failure_count DESC
            """,
            cutoff_time,
            threshold_count
        )

    return [
        {
            'user_id': f['user_id'],
            'failure_count': f['failure_count'],
            'last_failure': f['last_failure'].isoformat(),
            'reason': f['details'].get('reason', 'Unknown'),
            'severity': AlertLevel.WARNING
        }
        for f in failures
    ]


@task(name="send_alert", retries=3, retry_delay_seconds=10)
async def send_alert(
    alert_type: str,
    severity: str,
    details: Dict[str, Any]
):
    """
    Send alert notification

    Args:
        alert_type: Type of alert
        severity: Alert severity level
        details: Alert details

    TODO: Implement actual alerting (email, Slack, PagerDuty, etc.)
    """
    # For now, just log the alert
    # In production, integrate with alerting service
    logger.log(
        logging.CRITICAL if severity == AlertLevel.CRITICAL else logging.WARNING,
        f"ALERT [{severity.upper()}] {alert_type}: {details}"
    )

    # Example integrations to add:
    # - Send email via SendGrid/SES
    # - Post to Slack webhook
    # - Create PagerDuty incident
    # - Push to monitoring dashboard


@task(name="record_alert", retries=2)
async def record_alert(
    db_pool: asyncpg.Pool,
    alert_type: str,
    severity: str,
    details: Dict[str, Any]
):
    """
    Record alert in database

    Args:
        db_pool: Database connection pool
        alert_type: Type of alert
        severity: Alert severity
        details: Alert details
    """
    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO alerts (
                alert_type,
                severity,
                details,
                created_at
            ) VALUES ($1, $2, $3, $4)
            """,
            alert_type,
            severity,
            details,
            datetime.utcnow()
        )


@task(name="health_check", retries=1)
async def health_check(db_pool: asyncpg.Pool) -> Dict[str, Any]:
    """
    Perform system health check

    Args:
        db_pool: Database connection pool

    Returns:
        Health check results
    """
    health_status = {
        'timestamp': datetime.utcnow().isoformat(),
        'checks': {}
    }

    # Check database connectivity
    try:
        async with db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        health_status['checks']['database'] = {
            'status': 'healthy',
            'message': 'Database connection OK'
        }
    except Exception as e:
        health_status['checks']['database'] = {
            'status': 'unhealthy',
            'message': f'Database error: {str(e)}'
        }

    # Check for recent errors in audit log
    try:
        async with db_pool.acquire() as conn:
            error_count = await conn.fetchval(
                """
                SELECT COUNT(*)
                FROM audit_log
                WHERE action LIKE '%error%'
                  AND created_at > NOW() - INTERVAL '1 hour'
                """
            )

        health_status['checks']['error_rate'] = {
            'status': 'healthy' if error_count < 10 else 'degraded',
            'message': f'{error_count} errors in last hour',
            'error_count': error_count
        }
    except Exception as e:
        health_status['checks']['error_rate'] = {
            'status': 'unknown',
            'message': f'Could not check error rate: {str(e)}'
        }

    # Overall health
    statuses = [check['status'] for check in health_status['checks'].values()]
    if 'unhealthy' in statuses:
        health_status['overall'] = 'unhealthy'
    elif 'degraded' in statuses:
        health_status['overall'] = 'degraded'
    else:
        health_status['overall'] = 'healthy'

    return health_status


@flow(name="monitoring_and_alerts", log_prints=True)
async def monitoring_flow(db_url: str):
    """
    Main monitoring and alerting flow

    Args:
        db_url: Database connection URL

    Schedule: Every 5 minutes
    """
    logger.info("Starting monitoring flow")

    # Create database connection pool
    db_pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10)

    try:
        # Run all checks in parallel
        rate_limit_violations = await check_rate_limit_violations(db_pool)
        token_failures = await check_token_refresh_failures(db_pool)
        quota_attempts = await check_quota_exceeded_attempts(db_pool)
        db_anomalies = await check_anomalous_database_access(db_pool)
        consent_failures = await check_failed_consent_verifications(db_pool)
        health = await health_check(db_pool)

        # Process alerts
        all_alerts = []

        if rate_limit_violations:
            for violation in rate_limit_violations:
                await send_alert(
                    'rate_limit_violation',
                    violation['severity'],
                    violation
                )
                await record_alert(
                    db_pool,
                    'rate_limit_violation',
                    violation['severity'],
                    violation
                )
                all_alerts.append(violation)

        if token_failures:
            for failure in token_failures:
                await send_alert(
                    'token_refresh_failure',
                    failure['severity'],
                    failure
                )
                await record_alert(
                    db_pool,
                    'token_refresh_failure',
                    failure['severity'],
                    failure
                )
                all_alerts.append(failure)

        if quota_attempts:
            for attempt in quota_attempts:
                await send_alert(
                    'quota_exceeded_attempts',
                    attempt['severity'],
                    attempt
                )
                await record_alert(
                    db_pool,
                    'quota_exceeded_attempts',
                    attempt['severity'],
                    attempt
                )
                all_alerts.append(attempt)

        if db_anomalies:
            for anomaly in db_anomalies:
                await send_alert(
                    'database_anomaly',
                    anomaly['severity'],
                    anomaly
                )
                await record_alert(
                    db_pool,
                    'database_anomaly',
                    anomaly['severity'],
                    anomaly
                )
                all_alerts.append(anomaly)

        if consent_failures:
            for failure in consent_failures:
                await send_alert(
                    'consent_verification_failure',
                    failure['severity'],
                    failure
                )
                await record_alert(
                    db_pool,
                    'consent_verification_failure',
                    failure['severity'],
                    failure
                )
                all_alerts.append(failure)

        # Check overall health
        if health['overall'] != 'healthy':
            await send_alert(
                'health_check',
                AlertLevel.CRITICAL if health['overall'] == 'unhealthy' else AlertLevel.WARNING,
                health
            )
            await record_alert(
                db_pool,
                'health_check',
                AlertLevel.CRITICAL if health['overall'] == 'unhealthy' else AlertLevel.WARNING,
                health
            )

        logger.info(
            f"Monitoring completed. "
            f"Alerts: {len(all_alerts)}, Health: {health['overall']}"
        )

        return {
            'alerts_triggered': len(all_alerts),
            'health_status': health['overall'],
            'timestamp': datetime.utcnow().isoformat()
        }

    finally:
        await db_pool.close()


if __name__ == "__main__":
    import asyncio
    import os

    db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/repazoo')
    asyncio.run(monitoring_flow(db_url))
