"""
Prefect Scheduler - Coordinates all workflows
Manages scheduled and on-demand flows
"""

import logging
from datetime import datetime
from typing import Dict, Any
from prefect import flow
from prefect.deployments import run_deployment

logger = logging.getLogger(__name__)


@flow(name="orchestrate_all_workflows", log_prints=True)
async def orchestrate_workflows():
    """
    Main orchestration flow that coordinates all workflows

    This is the entry point for scheduled execution
    """
    logger.info("Starting workflow orchestration")

    results = {
        'timestamp': datetime.utcnow().isoformat(),
        'flows_executed': []
    }

    try:
        # Flow 1: Data Retention Cleanup (scheduled daily at 3 AM UTC)
        logger.info("Executing data retention cleanup...")
        retention_result = await run_deployment(
            name="data-retention-cleanup/production",
            timeout=0  # No timeout for cleanup
        )
        results['flows_executed'].append({
            'flow': 'data_retention_cleanup',
            'status': 'completed',
            'result': retention_result
        })

        # Flow 2: Monitoring (scheduled every 5 minutes)
        logger.info("Executing monitoring flow...")
        monitoring_result = await run_deployment(
            name="monitoring-and-alerts/production",
            timeout=0
        )
        results['flows_executed'].append({
            'flow': 'monitoring',
            'status': 'completed',
            'result': monitoring_result
        })

        logger.info("Workflow orchestration completed successfully")
        results['status'] = 'success'

    except Exception as e:
        logger.error(f"Error in workflow orchestration: {e}")
        results['status'] = 'failed'
        results['error'] = str(e)

    return results


# Individual flow wrappers for deployment

@flow(name="scheduled_data_retention")
async def scheduled_data_retention():
    """Wrapper for scheduled data retention cleanup"""
    from .data_retention import data_retention_cleanup_flow
    import os

    db_url = os.getenv('DATABASE_URL')
    return await data_retention_cleanup_flow(db_url)


@flow(name="scheduled_monitoring")
async def scheduled_monitoring():
    """Wrapper for scheduled monitoring"""
    from .monitoring import monitoring_flow
    import os

    db_url = os.getenv('DATABASE_URL')
    return await monitoring_flow(db_url)


@flow(name="on_demand_twitter_ingestion")
async def on_demand_twitter_ingestion(user_id: str):
    """
    Wrapper for on-demand Twitter ingestion

    Args:
        user_id: User identifier
    """
    from .twitter_ingestion import twitter_ingestion_flow
    import os

    return await twitter_ingestion_flow(
        db_url=os.getenv('DATABASE_URL'),
        redis_url=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
        user_id=user_id,
        encryption_key=os.getenv('ENCRYPTION_KEY'),
        twitter_client_id=os.getenv('TWITTER_CLIENT_ID'),
        twitter_client_secret=os.getenv('TWITTER_CLIENT_SECRET')
    )


@flow(name="on_demand_ai_analysis")
async def on_demand_ai_analysis(user_id: str):
    """
    Wrapper for on-demand AI analysis

    Args:
        user_id: User identifier
    """
    from .ai_analysis import ai_analysis_flow
    import os

    return await ai_analysis_flow(
        db_url=os.getenv('DATABASE_URL'),
        redis_url=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
        user_id=user_id,
        anthropic_api_key=os.getenv('ANTHROPIC_API_KEY')
    )


@flow(name="on_demand_data_export")
async def on_demand_data_export(user_id: str):
    """
    Wrapper for on-demand data export (GDPR/CCPA)

    Args:
        user_id: User identifier
    """
    from .user_data_export import user_data_export_flow
    import os

    return await user_data_export_flow(
        db_url=os.getenv('DATABASE_URL'),
        user_id=user_id
    )


if __name__ == "__main__":
    import asyncio

    # Test orchestration
    asyncio.run(orchestrate_workflows())
