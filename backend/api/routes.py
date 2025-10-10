"""
Repazoo API Routes
Core application endpoints for user management, analyses, and usage tracking
"""

import logging
from typing import Optional, List
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field

from config import settings, TierLimits
from database import db, get_db, SupabaseClient
from middleware import (
    get_current_user,
    QuotaExceededError,
    InvalidSubscriptionError,
)


logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api", tags=["api"])


# ============================================================================
# Request/Response Models
# ============================================================================

class UserProfileResponse(BaseModel):
    """User profile response"""
    id: str
    email: str
    full_name: Optional[str] = None
    created_at: datetime
    subscription_tier: str
    subscription_status: str
    twitter_accounts_count: int


class UsageQuotaResponse(BaseModel):
    """API usage quota response"""
    requests_used: int
    quota: int
    remaining: int
    tier: str
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    percentage_used: float


class AnalyzeRequest(BaseModel):
    """Request to analyze Twitter account"""
    twitter_username: str = Field(..., description="Twitter username to analyze")
    analysis_type: str = Field(
        default="reputation",
        description="Type of analysis (reputation, engagement, growth)"
    )
    include_tweets: bool = Field(
        default=True,
        description="Include recent tweets in analysis"
    )


class AnalysisResponse(BaseModel):
    """Analysis result response"""
    id: str
    user_id: str
    twitter_username: str
    analysis_type: str
    status: str
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    ai_model: str


class AnalysisListResponse(BaseModel):
    """List of analyses"""
    analyses: List[AnalysisResponse]
    total: int
    limit: int
    offset: int


class ScanResponse(BaseModel):
    """Scan result response (maps to analysis)"""
    id: str
    user_id: str
    twitter_handle: str
    status: str
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    analysis_result: Optional[dict] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class CreateScanRequest(BaseModel):
    """Request to create a new scan"""
    twitter_handle: str = Field(..., description="Twitter username to scan")


class DashboardStatsResponse(BaseModel):
    """Dashboard statistics response"""
    total_scans: int
    today_scans: int
    average_risk_score: float
    high_risk_accounts: int


# ============================================================================
# User Endpoints
# ============================================================================

@router.get(
    "/users/me",
    response_model=UserProfileResponse,
    summary="Get current user profile",
    description="Retrieve profile information for authenticated user"
)
async def get_current_user_profile(
    user_id: str = Depends(get_current_user),
    database: SupabaseClient = Depends(get_db)
):
    """Get current user's profile"""
    try:
        # Get user data
        user = database.get_user(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Get subscription
        subscription = database.get_user_subscription(user_id)
        subscription_tier = subscription.get("tier", "inactive") if subscription else "inactive"
        subscription_status = subscription.get("status", "inactive") if subscription else "inactive"

        # Get Twitter accounts count
        twitter_accounts = database.get_twitter_accounts(user_id)

        return UserProfileResponse(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name"),
            created_at=datetime.fromisoformat(user["created_at"]),
            subscription_tier=subscription_tier,
            subscription_status=subscription_status,
            twitter_accounts_count=len(twitter_accounts)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user profile"
        )


# ============================================================================
# Usage Quota Endpoints
# ============================================================================

@router.get(
    "/usage/quota",
    response_model=UsageQuotaResponse,
    summary="Check API usage quota",
    description="Get current API usage and remaining quota for the billing period"
)
async def check_usage_quota(
    user_id: str = Depends(get_current_user),
    database: SupabaseClient = Depends(get_db)
):
    """Check user's API usage quota"""
    try:
        usage = database.get_current_usage(user_id)

        requests_used = usage.get("requests_used", 0)
        quota = usage.get("quota", 0)
        percentage_used = (requests_used / quota * 100) if quota > 0 else 0

        return UsageQuotaResponse(
            requests_used=requests_used,
            quota=quota,
            remaining=usage.get("remaining", 0),
            tier=usage.get("tier", "basic"),
            period_start=usage.get("period_start"),
            period_end=usage.get("period_end"),
            percentage_used=round(percentage_used, 2)
        )

    except Exception as e:
        logger.error(f"Error checking usage quota: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check usage quota"
        )


# ============================================================================
# Analysis Endpoints
# ============================================================================

@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger AI analysis",
    description="Analyze a Twitter account (tier-based AI model routing)"
)
async def trigger_analysis(
    request: AnalyzeRequest,
    user_id: str = Depends(get_current_user),
    database: SupabaseClient = Depends(get_db)
):
    """
    Trigger AI analysis for Twitter account

    - Checks quota and subscription tier
    - Routes to appropriate AI model (Haiku for Basic, Sonnet for Pro)
    - Creates analysis record and queues processing
    """
    try:
        # Check quota
        if not database.check_quota(user_id):
            usage = database.get_current_usage(user_id)
            raise QuotaExceededError(
                message="Monthly API quota exceeded. Upgrade to Pro for higher limits.",
                quota_info=usage
            )

        # Get subscription for tier-based routing
        subscription = database.get_user_subscription(user_id)
        if not subscription or subscription.get("status") != "active":
            raise InvalidSubscriptionError("Active subscription required")

        tier = subscription.get("tier", "basic")
        ai_model = TierLimits.get_ai_model(tier)

        # Increment usage
        database.increment_usage(user_id, count=1)

        # Create analysis record
        analysis_data = {
            "user_id": user_id,
            "twitter_username": request.twitter_username,
            "analysis_type": request.analysis_type,
            "status": "pending",
            "ai_model": ai_model,
            "parameters": {
                "include_tweets": request.include_tweets,
                "tier": tier,
            }
        }

        analysis = database.create_analysis(analysis_data)
        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create analysis"
            )

        # TODO: Queue analysis task to Celery worker
        # from ..tasks import analyze_twitter_account
        # analyze_twitter_account.delay(analysis["id"])

        logger.info(
            f"Analysis created: {analysis['id']} "
            f"user={user_id} username={request.twitter_username} "
            f"model={ai_model}"
        )

        return AnalysisResponse(
            id=analysis["id"],
            user_id=analysis["user_id"],
            twitter_username=analysis["twitter_username"],
            analysis_type=analysis["analysis_type"],
            status=analysis["status"],
            result=None,
            error=None,
            created_at=datetime.fromisoformat(analysis["created_at"]),
            completed_at=None,
            ai_model=ai_model
        )

    except (QuotaExceededError, InvalidSubscriptionError):
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger analysis"
        )


@router.get(
    "/analyses",
    response_model=AnalysisListResponse,
    summary="List user's analyses",
    description="Get paginated list of user's analyses"
)
async def list_analyses(
    limit: int = 50,
    offset: int = 0,
    user_id: str = Depends(get_current_user),
    database: SupabaseClient = Depends(get_db)
):
    """List user's analyses with pagination"""
    try:
        # Validate pagination
        if limit > 100:
            limit = 100
        if limit < 1:
            limit = 10

        # Get analyses
        analyses = database.get_user_analyses(user_id, limit=limit, offset=offset)

        # Format response
        analysis_responses = []
        for analysis in analyses:
            analysis_responses.append(
                AnalysisResponse(
                    id=analysis["id"],
                    user_id=analysis["user_id"],
                    twitter_username=analysis["twitter_username"],
                    analysis_type=analysis["analysis_type"],
                    status=analysis["status"],
                    result=analysis.get("result"),
                    error=analysis.get("error"),
                    created_at=datetime.fromisoformat(analysis["created_at"]),
                    completed_at=(
                        datetime.fromisoformat(analysis["completed_at"])
                        if analysis.get("completed_at")
                        else None
                    ),
                    ai_model=analysis.get("ai_model", "unknown")
                )
            )

        return AnalysisListResponse(
            analyses=analysis_responses,
            total=len(analysis_responses),
            limit=limit,
            offset=offset
        )

    except Exception as e:
        logger.error(f"Error listing analyses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list analyses"
        )


@router.get(
    "/analyses/{analysis_id}",
    response_model=AnalysisResponse,
    summary="Get specific analysis",
    description="Retrieve details of a specific analysis by ID"
)
async def get_analysis(
    analysis_id: str,
    user_id: str = Depends(get_current_user),
    database: SupabaseClient = Depends(get_db)
):
    """Get specific analysis result"""
    try:
        # Get analysis
        analysis = database.get_analysis(analysis_id)

        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found"
            )

        # Verify ownership
        if analysis["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        return AnalysisResponse(
            id=analysis["id"],
            user_id=analysis["user_id"],
            twitter_username=analysis["twitter_username"],
            analysis_type=analysis["analysis_type"],
            status=analysis["status"],
            result=analysis.get("result"),
            error=analysis.get("error"),
            created_at=datetime.fromisoformat(analysis["created_at"]),
            completed_at=(
                datetime.fromisoformat(analysis["completed_at"])
                if analysis.get("completed_at")
                else None
            ),
            ai_model=analysis.get("ai_model", "unknown")
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch analysis"
        )


# ============================================================================
# Scan Endpoints (Frontend-Compatible API - Maps to Analyses)
# ============================================================================

@router.get(
    "/scans",
    response_model=List[ScanResponse],
    summary="List user's scans",
    description="Get list of user's scans (maps to analyses)"
)
async def list_scans(
    limit: int = 50,
    offset: int = 0,
    user_id: str = Depends(get_current_user),
    database: SupabaseClient = Depends(get_db)
):
    """
    List user's scans with pagination
    Maps to analyses table but returns frontend-compatible scan format
    """
    try:
        # Validate pagination
        if limit > 100:
            limit = 100
        if limit < 1:
            limit = 10

        # Get analyses from database
        analyses = database.get_user_analyses(user_id, limit=limit, offset=offset)

        # Convert analyses to scan format
        scan_responses = []
        for analysis in analyses:
            # Extract risk data from result
            result = analysis.get("result") or {}
            risk_data = result.get("risk_assessment", {})

            scan_responses.append(
                ScanResponse(
                    id=analysis["id"],
                    user_id=analysis["user_id"],
                    twitter_handle=analysis["twitter_username"],
                    status=analysis["status"],
                    risk_score=risk_data.get("overall_risk_score"),
                    risk_level=risk_data.get("risk_level"),
                    analysis_result=result,
                    created_at=datetime.fromisoformat(analysis["created_at"]),
                    completed_at=(
                        datetime.fromisoformat(analysis["completed_at"])
                        if analysis.get("completed_at")
                        else None
                    )
                )
            )

        return scan_responses

    except Exception as e:
        logger.error(f"Error listing scans: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list scans"
        )


@router.get(
    "/scans/{scan_id}",
    response_model=ScanResponse,
    summary="Get specific scan",
    description="Retrieve details of a specific scan by ID"
)
async def get_scan(
    scan_id: str,
    user_id: str = Depends(get_current_user),
    database: SupabaseClient = Depends(get_db)
):
    """
    Get specific scan result
    Maps to analysis but returns frontend-compatible scan format
    """
    try:
        # Get analysis from database
        analysis = database.get_analysis(scan_id)

        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scan not found"
            )

        # Verify ownership
        if analysis["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Extract risk data from result
        result = analysis.get("result") or {}
        risk_data = result.get("risk_assessment", {})

        return ScanResponse(
            id=analysis["id"],
            user_id=analysis["user_id"],
            twitter_handle=analysis["twitter_username"],
            status=analysis["status"],
            risk_score=risk_data.get("overall_risk_score"),
            risk_level=risk_data.get("risk_level"),
            analysis_result=result,
            created_at=datetime.fromisoformat(analysis["created_at"]),
            completed_at=(
                datetime.fromisoformat(analysis["completed_at"])
                if analysis.get("completed_at")
                else None
            )
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching scan: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch scan"
        )


@router.post(
    "/scans",
    response_model=ScanResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Create new scan",
    description="Create a new scan (triggers analysis)"
)
async def create_scan(
    request: CreateScanRequest,
    user_id: str = Depends(get_current_user),
    database: SupabaseClient = Depends(get_db)
):
    """
    Create new scan
    Maps to analysis creation but accepts frontend-compatible scan format
    """
    try:
        # Check quota
        if not database.check_quota(user_id):
            usage = database.get_current_usage(user_id)
            raise QuotaExceededError(
                message="Monthly API quota exceeded. Upgrade to Pro for higher limits.",
                quota_info=usage
            )

        # Get subscription for tier-based routing
        subscription = database.get_user_subscription(user_id)
        if not subscription or subscription.get("status") != "active":
            raise InvalidSubscriptionError("Active subscription required")

        tier = subscription.get("tier", "basic")
        ai_model = TierLimits.get_ai_model(tier)

        # Increment usage
        database.increment_usage(user_id, count=1)

        # Create analysis record (scans map to analyses)
        analysis_data = {
            "user_id": user_id,
            "twitter_username": request.twitter_handle,
            "analysis_type": "reputation",
            "status": "pending",
            "ai_model": ai_model,
            "parameters": {
                "include_tweets": True,
                "tier": tier,
            }
        }

        analysis = database.create_analysis(analysis_data)
        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create scan"
            )

        # TODO: Queue analysis task to Celery worker
        # from ..tasks import analyze_twitter_account
        # analyze_twitter_account.delay(analysis["id"])

        logger.info(
            f"Scan created: {analysis['id']} "
            f"user={user_id} handle={request.twitter_handle} "
            f"model={ai_model}"
        )

        return ScanResponse(
            id=analysis["id"],
            user_id=analysis["user_id"],
            twitter_handle=analysis["twitter_username"],
            status=analysis["status"],
            risk_score=None,
            risk_level=None,
            analysis_result=None,
            created_at=datetime.fromisoformat(analysis["created_at"]),
            completed_at=None
        )

    except (QuotaExceededError, InvalidSubscriptionError):
        raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating scan: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create scan"
        )


@router.get(
    "/dashboard/stats",
    response_model=DashboardStatsResponse,
    summary="Get dashboard statistics",
    description="Get aggregated statistics for the dashboard"
)
async def get_dashboard_stats(
    user_id: str = Depends(get_current_user),
    database: SupabaseClient = Depends(get_db)
):
    """
    Get dashboard statistics
    Aggregates data from analyses for dashboard display
    """
    try:
        # Get all user analyses
        all_analyses = database.get_user_analyses(user_id, limit=1000, offset=0)

        # Calculate statistics
        total_scans = len(all_analyses)

        # Count today's scans
        today = datetime.now(timezone.utc).date()
        today_scans = sum(
            1 for a in all_analyses
            if datetime.fromisoformat(a["created_at"]).date() == today
        )

        # Calculate average risk score and count high-risk accounts
        risk_scores = []
        high_risk_count = 0

        for analysis in all_analyses:
            result = analysis.get("result") or {}
            risk_data = result.get("risk_assessment", {})
            risk_score = risk_data.get("overall_risk_score")
            risk_level = risk_data.get("risk_level")

            if risk_score is not None:
                risk_scores.append(risk_score)

            if risk_level in ["high", "critical"]:
                high_risk_count += 1

        average_risk_score = (
            sum(risk_scores) / len(risk_scores)
            if risk_scores
            else 0.0
        )

        return DashboardStatsResponse(
            total_scans=total_scans,
            today_scans=today_scans,
            average_risk_score=round(average_risk_score, 2),
            high_risk_accounts=high_risk_count
        )

    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard statistics"
        )


# ============================================================================
# Health Check Endpoints
# ============================================================================

@router.get(
    "/health",
    summary="API health check",
    description="Check if API is healthy and responsive",
    tags=["health"]
)
async def health_check():
    """Basic health check"""
    return {
        "status": "healthy",
        "service": "repazoo-api",
        "version": settings.api_version,
        "environment": settings.environment.value,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ============================================================================
# Export
# ============================================================================

__all__ = ["router"]
