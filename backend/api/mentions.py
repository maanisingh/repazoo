"""
Repazoo Mentions API Routes
Twitter mentions tracking with media support
"""

import logging
from typing import Optional, List
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field

from database import get_db, SupabaseClient
from middleware import get_current_user


logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/mentions", tags=["mentions"])


# ============================================================================
# Request/Response Models
# ============================================================================

class MediaItem(BaseModel):
    """Media attachment in a tweet"""
    id: str
    type: str  # photo, video, animated_gif
    url: str
    preview_url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    alt_text: Optional[str] = None
    display_order: int = 0


class MentionAuthor(BaseModel):
    """Mention author information"""
    id: str
    username: str
    display_name: Optional[str] = None
    verified: bool = False
    followers_count: int = 0
    profile_image_url: Optional[str] = None


class MentionEngagement(BaseModel):
    """Engagement metrics"""
    likes: int = 0
    retweets: int = 0
    replies: int = 0
    quotes: int = 0
    views: int = 0
    bookmarks: int = 0


class Mention(BaseModel):
    """Twitter mention with media"""
    id: str
    tweet_id: str
    user_id: str
    author: MentionAuthor
    text: str
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    risk_level: Optional[str] = None
    risk_score: Optional[float] = None
    engagement: MentionEngagement
    tweet_url: str
    tweet_created_at: datetime
    created_at: datetime
    media: List[MediaItem] = []
    has_media: bool = False
    conversation_id: Optional[str] = None
    is_retweet: bool = False
    is_quote: bool = False


class MentionsListResponse(BaseModel):
    """Paginated mentions list"""
    mentions: List[Mention]
    total: int
    page: int
    page_size: int
    has_more: bool


class MentionsStatsResponse(BaseModel):
    """Aggregate mentions statistics"""
    total_mentions: int
    total_engagement: int
    avg_engagement_score: float
    sentiment_breakdown: dict
    risk_breakdown: dict
    mentions_with_media: int
    most_recent_mention: Optional[datetime] = None
    viral_mentions: int


class ScanMentionsRequest(BaseModel):
    """Request to scan for new mentions"""
    twitter_user_id: str = Field(..., description="Twitter user ID to fetch mentions for")
    max_results: int = Field(default=100, ge=10, le=100)
    force_refresh: bool = False


class ScanMentionsResponse(BaseModel):
    """Scan result response"""
    status: str
    scan_id: str
    mentions_fetched: int
    mentions_with_media: int
    total_media_items: int
    message: str


# ============================================================================
# Helper Functions
# ============================================================================

def format_mention(row: dict, media_items: List[dict] = None) -> Mention:
    """Format database row to Mention model"""

    # Build author
    author = MentionAuthor(
        id=row.get("author_id", ""),
        username=row.get("author_username", ""),
        display_name=row.get("author_display_name"),
        verified=row.get("author_verified", False),
        followers_count=row.get("author_followers_count", 0),
        profile_image_url=row.get("author_profile_image_url")
    )

    # Build engagement
    engagement = MentionEngagement(
        likes=row.get("like_count", 0),
        retweets=row.get("retweet_count", 0),
        replies=row.get("reply_count", 0),
        quotes=row.get("quote_count", 0),
        views=row.get("view_count", 0),
        bookmarks=row.get("bookmark_count", 0)
    )

    # Build media list
    media = []
    if media_items:
        for item in media_items:
            media.append(MediaItem(
                id=item.get("id", ""),
                type=item.get("type", "photo"),
                url=item.get("url", ""),
                preview_url=item.get("preview_url"),
                width=item.get("width"),
                height=item.get("height"),
                alt_text=item.get("alt_text"),
                display_order=item.get("display_order", 0)
            ))

    # Build mention
    return Mention(
        id=row.get("id", ""),
        tweet_id=row.get("tweet_id", ""),
        user_id=row.get("user_id", ""),
        author=author,
        text=row.get("tweet_text", ""),
        sentiment=row.get("sentiment"),
        sentiment_score=float(row.get("sentiment_score")) if row.get("sentiment_score") else None,
        risk_level=row.get("risk_level"),
        risk_score=float(row.get("risk_score")) if row.get("risk_score") else None,
        engagement=engagement,
        tweet_url=row.get("tweet_url", ""),
        tweet_created_at=row.get("tweet_created_at"),
        created_at=row.get("created_at"),
        media=media,
        has_media=row.get("has_media", False),
        conversation_id=row.get("conversation_id"),
        is_retweet=row.get("is_retweet", False),
        is_quote=row.get("is_quote", False)
    )


# ============================================================================
# Mention Endpoints
# ============================================================================

@router.get(
    "",
    response_model=MentionsListResponse,
    summary="List user's mentions",
    description="Get paginated list of user's Twitter mentions with media"
)
async def list_mentions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sentiment: Optional[str] = Query(default=None),
    risk_level: Optional[str] = Query(default=None),
    has_media: Optional[bool] = Query(default=None),
    sort_by: str = Query(default="newest", regex="^(newest|oldest|most_engagement|highest_risk)$"),
    user_id: str = Depends(get_current_user),
    database: SupabaseClient = Depends(get_db)
):
    """
    List user's mentions with pagination and filtering

    Supports filtering by:
    - sentiment (positive, neutral, negative)
    - risk_level (low, medium, high, critical)
    - has_media (true/false)

    Sorting options:
    - newest (default)
    - oldest
    - most_engagement
    - highest_risk
    """
    try:
        offset = (page - 1) * page_size

        # Build query using stored function
        query = """
            SELECT * FROM get_user_mentions_with_media(
                $1::UUID,
                $2::INTEGER,
                $3::INTEGER,
                $4::VARCHAR,
                $5::VARCHAR,
                $6::BOOLEAN
            )
        """

        result = database.client.rpc(
            'get_user_mentions_with_media',
            {
                'p_user_id': user_id,
                'p_limit': page_size,
                'p_offset': offset,
                'p_sentiment': sentiment,
                'p_risk_level': risk_level,
                'p_has_media': has_media
            }
        ).execute()

        mentions_data = result.data if result.data else []

        # Format mentions
        mentions = []
        for row in mentions_data:
            media_items = row.get('media', [])
            mention = format_mention(row, media_items)
            mentions.append(mention)

        # Get total count (simplified - would need separate query for exact count)
        total = len(mentions_data)
        has_more = len(mentions_data) == page_size

        return MentionsListResponse(
            mentions=mentions,
            total=total,
            page=page,
            page_size=page_size,
            has_more=has_more
        )

    except Exception as e:
        logger.error(f"Error listing mentions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list mentions: {str(e)}"
        )


@router.get(
    "/{mention_id}",
    response_model=Mention,
    summary="Get specific mention",
    description="Retrieve details of a specific mention by ID"
)
async def get_mention(
    mention_id: str,
    user_id: str = Depends(get_current_user),
    database: SupabaseClient = Depends(get_db)
):
    """Get specific mention with all media"""
    try:
        # Use stored function to get mention with media
        result = database.client.rpc(
            'get_mention_with_media',
            {'p_mention_id': mention_id}
        ).execute()

        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mention not found"
            )

        row = result.data[0]

        # Verify ownership
        if row.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        media_items = row.get('media', [])
        mention = format_mention(row, media_items)

        return mention

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching mention: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch mention: {str(e)}"
        )


@router.get(
    "/stats/summary",
    response_model=MentionsStatsResponse,
    summary="Get mentions statistics",
    description="Get aggregate statistics for user's mentions"
)
async def get_mentions_stats(
    user_id: str = Depends(get_current_user),
    database: SupabaseClient = Depends(get_db)
):
    """Get aggregate statistics for user's mentions"""
    try:
        # Use stored function
        result = database.client.rpc(
            'get_user_mention_stats',
            {'p_user_id': user_id}
        ).execute()

        if not result.data or len(result.data) == 0:
            return MentionsStatsResponse(
                total_mentions=0,
                total_engagement=0,
                avg_engagement_score=0.0,
                sentiment_breakdown={},
                risk_breakdown={},
                mentions_with_media=0,
                viral_mentions=0
            )

        stats = result.data[0]

        # Get count of mentions with media
        media_result = database.client.from_('twitter_mentions')\
            .select('id', count='exact')\
            .eq('user_id', user_id)\
            .eq('has_media', True)\
            .execute()

        mentions_with_media = media_result.count if hasattr(media_result, 'count') else 0

        return MentionsStatsResponse(
            total_mentions=stats.get('total_mentions', 0),
            total_engagement=stats.get('total_engagement', 0),
            avg_engagement_score=float(stats.get('avg_engagement_score', 0)),
            sentiment_breakdown={
                'positive': stats.get('sentiment_positive', 0),
                'neutral': stats.get('sentiment_neutral', 0),
                'negative': stats.get('sentiment_negative', 0)
            },
            risk_breakdown={
                'low': stats.get('risk_low', 0),
                'medium': stats.get('risk_medium', 0),
                'high': stats.get('risk_high', 0),
                'critical': stats.get('risk_critical', 0)
            },
            mentions_with_media=mentions_with_media,
            most_recent_mention=stats.get('most_recent_mention'),
            viral_mentions=stats.get('viral_mentions', 0)
        )

    except Exception as e:
        logger.error(f"Error fetching mentions stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch mentions stats: {str(e)}"
        )


@router.post(
    "/scan",
    response_model=ScanMentionsResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger mention scan",
    description="Trigger a scan to fetch new mentions from Twitter"
)
async def scan_mentions(
    request: ScanMentionsRequest,
    user_id: str = Depends(get_current_user),
    database: SupabaseClient = Depends(get_db)
):
    """
    Trigger a scan to fetch new mentions from Twitter API directly
    """
    try:
        from services.twitter_mentions import twitter_mentions_service
        import uuid

        # Get last synced tweet_id for incremental fetching
        last_mention = database.client.from_('twitter_mentions')\
            .select('tweet_id')\
            .eq('user_id', user_id)\
            .order('tweet_created_at', desc=True)\
            .limit(1)\
            .execute()

        since_id = last_mention.data[0]['tweet_id'] if last_mention.data else None

        # Fetch mentions from Twitter
        result = await twitter_mentions_service.fetch_user_mentions(
            user_id=user_id,
            twitter_user_id=request.twitter_user_id,
            max_results=request.max_results,
            since_id=since_id
        )

        scan_id = str(uuid.uuid4())

        return ScanMentionsResponse(
            status="success",
            scan_id=scan_id,
            mentions_fetched=result["mentions_fetched"],
            mentions_with_media=result["mentions_with_media"],
            total_media_items=result["total_media_items"],
            message=f"Successfully fetched {result['mentions_fetched']} mentions"
        )

    except ValueError as e:
        logger.error(f"Twitter connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error scanning mentions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to scan mentions: {str(e)}"
        )


# ============================================================================
# Export
# ============================================================================

__all__ = ["router"]
