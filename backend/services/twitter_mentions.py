"""
Twitter Mentions Service
Fetch mentions from Twitter API v2
"""

import logging
from typing import List, Dict, Optional
from datetime import datetime
import tweepy
from config import settings
from database import get_db

logger = logging.getLogger(__name__)


class TwitterMentionsService:
    """Service to fetch Twitter mentions using OAuth 2.0"""

    def __init__(self):
        self.client_id = settings.twitter_client_id
        self.client_secret = settings.twitter_client_secret

    def get_twitter_client(self, access_token: str) -> tweepy.Client:
        """Create Twitter API client with user's access token"""
        return tweepy.Client(
            bearer_token=None,
            consumer_key=None,
            consumer_secret=None,
            access_token=access_token,
        )

    async def fetch_user_mentions(
        self,
        user_id: str,
        twitter_user_id: str,
        max_results: int = 100,
        since_id: Optional[str] = None
    ) -> Dict:
        """
        Fetch mentions for a Twitter user

        Args:
            user_id: Repazoo user ID
            twitter_user_id: Twitter user ID to fetch mentions for
            max_results: Maximum number of mentions to fetch (10-100)
            since_id: Only fetch mentions after this tweet ID

        Returns:
            Dict with mentions_fetched, mentions_with_media, total_media_items
        """
        try:
            # Get user's Twitter credentials from database
            db = next(get_db())

            # Query for access token
            from database.queries import get_twitter_credentials
            credentials = await get_twitter_credentials(user_id)

            if not credentials or not credentials.get('access_token'):
                raise ValueError("Twitter not connected for this user")

            access_token = credentials['access_token']

            # Create Twitter client
            client = self.get_twitter_client(access_token)

            # Fetch mentions
            response = client.get_users_mentions(
                id=twitter_user_id,
                max_results=min(max_results, 100),
                since_id=since_id,
                tweet_fields=['created_at', 'public_metrics', 'entities', 'referenced_tweets', 'conversation_id', 'lang'],
                user_fields=['username', 'name', 'verified', 'profile_image_url', 'public_metrics'],
                media_fields=['url', 'preview_image_url', 'type', 'width', 'height', 'alt_text'],
                expansions=['author_id', 'attachments.media_keys', 'referenced_tweets.id']
            )

            if not response.data:
                logger.info(f"No new mentions found for user {user_id}")
                return {
                    "mentions_fetched": 0,
                    "mentions_with_media": 0,
                    "total_media_items": 0
                }

            # Process and store mentions
            mentions_fetched = 0
            mentions_with_media = 0
            total_media_items = 0

            # Build user lookup
            users_dict = {}
            if response.includes and response.includes.get('users'):
                for user in response.includes['users']:
                    users_dict[user.id] = user

            # Build media lookup
            media_dict = {}
            if response.includes and response.includes.get('media'):
                for media in response.includes['media']:
                    media_dict[media.media_key] = media

            # Store each mention
            for tweet in response.data:
                author = users_dict.get(tweet.author_id)
                if not author:
                    continue

                # Check for media
                has_media = False
                media_items = []
                if tweet.attachments and tweet.attachments.get('media_keys'):
                    has_media = True
                    for media_key in tweet.attachments['media_keys']:
                        media_item = media_dict.get(media_key)
                        if media_item:
                            media_items.append(media_item)
                            total_media_items += 1

                if has_media:
                    mentions_with_media += 1

                # Store mention in database
                await self._store_mention(
                    user_id=user_id,
                    tweet=tweet,
                    author=author,
                    media_items=media_items
                )

                mentions_fetched += 1

            logger.info(f"Fetched {mentions_fetched} mentions for user {user_id}")

            return {
                "mentions_fetched": mentions_fetched,
                "mentions_with_media": mentions_with_media,
                "total_media_items": total_media_items
            }

        except tweepy.TweepyException as e:
            logger.error(f"Twitter API error: {e}")
            raise ValueError(f"Twitter API error: {str(e)}")
        except Exception as e:
            logger.error(f"Error fetching mentions: {e}")
            raise

    async def _store_mention(
        self,
        user_id: str,
        tweet,
        author,
        media_items: List = None
    ):
        """Store a mention in the database"""
        import asyncpg
        from database import get_postgres_pool

        pool = await get_postgres_pool()

        async with pool.acquire() as conn:
            # Insert mention
            mention_id = await conn.fetchval(
                """
                INSERT INTO twitter_mentions (
                    user_id, tweet_id, author_id, author_username, author_display_name,
                    author_verified, author_followers_count, author_profile_image_url,
                    tweet_text, tweet_language, tweet_url, tweet_created_at,
                    retweet_count, reply_count, like_count, quote_count, view_count,
                    conversation_id, is_retweet, is_quote,
                    engagement_score, has_media, media_count, created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                    $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW()
                )
                ON CONFLICT (tweet_id) DO UPDATE SET
                    retweet_count = EXCLUDED.retweet_count,
                    reply_count = EXCLUDED.reply_count,
                    like_count = EXCLUDED.like_count,
                    quote_count = EXCLUDED.quote_count,
                    view_count = EXCLUDED.view_count,
                    engagement_score = EXCLUDED.engagement_score,
                    updated_at = NOW()
                RETURNING id
                """,
                user_id,
                tweet.id,
                author.id,
                author.username,
                author.name,
                author.verified if hasattr(author, 'verified') else False,
                author.public_metrics.get('followers_count', 0) if hasattr(author, 'public_metrics') else 0,
                author.profile_image_url if hasattr(author, 'profile_image_url') else None,
                tweet.text,
                tweet.lang if hasattr(tweet, 'lang') else None,
                f"https://twitter.com/{author.username}/status/{tweet.id}",
                tweet.created_at if hasattr(tweet, 'created_at') else datetime.utcnow(),
                tweet.public_metrics.get('retweet_count', 0) if hasattr(tweet, 'public_metrics') else 0,
                tweet.public_metrics.get('reply_count', 0) if hasattr(tweet, 'public_metrics') else 0,
                tweet.public_metrics.get('like_count', 0) if hasattr(tweet, 'public_metrics') else 0,
                tweet.public_metrics.get('quote_count', 0) if hasattr(tweet, 'public_metrics') else 0,
                tweet.public_metrics.get('impression_count', 0) if hasattr(tweet, 'public_metrics') else 0,
                tweet.conversation_id if hasattr(tweet, 'conversation_id') else None,
                self._is_retweet(tweet),
                self._is_quote(tweet),
                self._calculate_engagement(tweet),
                len(media_items) > 0 if media_items else False,
                len(media_items) if media_items else 0
            )

            # Store media
            if media_items and mention_id:
                for idx, media in enumerate(media_items):
                    await conn.execute(
                        """
                        INSERT INTO tweet_media (
                            mention_id, media_key, type, url, preview_url,
                            width, height, alt_text, display_order
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        ON CONFLICT (mention_id, media_key) DO NOTHING
                        """,
                        mention_id,
                        media.media_key,
                        media.type,
                        media.url if hasattr(media, 'url') else (media.preview_image_url if hasattr(media, 'preview_image_url') else ''),
                        media.preview_image_url if hasattr(media, 'preview_image_url') else None,
                        media.width if hasattr(media, 'width') else None,
                        media.height if hasattr(media, 'height') else None,
                        media.alt_text if hasattr(media, 'alt_text') else None,
                        idx
                    )

    def _is_retweet(self, tweet) -> bool:
        """Check if tweet is a retweet"""
        if not hasattr(tweet, 'referenced_tweets') or not tweet.referenced_tweets:
            return False
        return any(ref.type == 'retweeted' for ref in tweet.referenced_tweets)

    def _is_quote(self, tweet) -> bool:
        """Check if tweet is a quote tweet"""
        if not hasattr(tweet, 'referenced_tweets') or not tweet.referenced_tweets:
            return False
        return any(ref.type == 'quoted' for ref in tweet.referenced_tweets)

    def _calculate_engagement(self, tweet) -> int:
        """Calculate engagement score"""
        if not hasattr(tweet, 'public_metrics'):
            return 0

        metrics = tweet.public_metrics
        likes = metrics.get('like_count', 0)
        retweets = metrics.get('retweet_count', 0)
        replies = metrics.get('reply_count', 0)
        quotes = metrics.get('quote_count', 0)

        # Weighted engagement: retweets and quotes are more valuable
        return likes * 1 + replies * 2 + retweets * 3 + quotes * 3


# Singleton instance
twitter_mentions_service = TwitterMentionsService()
