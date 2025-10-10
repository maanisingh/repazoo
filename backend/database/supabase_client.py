"""
Supabase Database Client
Centralized database operations with connection pooling and helpers
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from supabase import create_client, Client
from postgrest.exceptions import APIError

from config import settings


logger = logging.getLogger(__name__)


class SupabaseClient:
    """
    Supabase client wrapper with helper methods and connection management
    """

    _instance: Optional['SupabaseClient'] = None
    _client: Optional[Client] = None
    _service_client: Optional[Client] = None

    def __new__(cls):
        """Singleton pattern for client instance"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize Supabase client"""
        if self._client is None:
            self._initialize_clients()

    def _initialize_clients(self):
        """Initialize both anon and service role clients"""
        if not settings.supabase_url:
            raise ValueError("SUPABASE_URL not configured")

        # Anon client (for user-authenticated requests with RLS)
        if settings.supabase_anon_key:
            self._client = create_client(
                settings.supabase_url,
                settings.supabase_anon_key
            )
            logger.info("Supabase anon client initialized")

        # Service client (for admin operations bypassing RLS)
        if settings.supabase_service_key:
            self._service_client = create_client(
                settings.supabase_url,
                settings.supabase_service_key
            )
            logger.info("Supabase service client initialized")

    @property
    def client(self) -> Client:
        """Get anon client (respects RLS)"""
        if self._client is None:
            self._initialize_clients()
        return self._client

    @property
    def service_client(self) -> Client:
        """Get service client (bypasses RLS - use with caution)"""
        if self._service_client is None:
            self._initialize_clients()
        return self._service_client

    # ========================================================================
    # User Operations
    # ========================================================================

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            response = self.client.table("users").select("*").eq("id", user_id).execute()
            return response.data[0] if response.data else None
        except APIError as e:
            logger.error(f"Error fetching user {user_id}: {e}")
            return None

    def create_user(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create new user"""
        try:
            user_data["created_at"] = datetime.now(timezone.utc).isoformat()
            user_data["updated_at"] = datetime.now(timezone.utc).isoformat()

            response = self.service_client.table("users").insert(user_data).execute()
            logger.info(f"Created user: {response.data[0]['id']}")
            return response.data[0]
        except APIError as e:
            logger.error(f"Error creating user: {e}")
            return None

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user"""
        try:
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()

            response = self.client.table("users").update(updates).eq("id", user_id).execute()
            logger.info(f"Updated user: {user_id}")
            return response.data[0] if response.data else None
        except APIError as e:
            logger.error(f"Error updating user {user_id}: {e}")
            return None

    # ========================================================================
    # Subscription Operations
    # ========================================================================

    def get_user_subscription(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get active subscription for user"""
        try:
            response = self.client.table("subscriptions").select("*").eq(
                "user_id", user_id
            ).order("created_at", desc=True).limit(1).execute()

            return response.data[0] if response.data else None
        except APIError as e:
            logger.error(f"Error fetching subscription for user {user_id}: {e}")
            return None

    def create_subscription(self, subscription_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create new subscription"""
        try:
            subscription_data["created_at"] = datetime.now(timezone.utc).isoformat()
            subscription_data["updated_at"] = datetime.now(timezone.utc).isoformat()

            response = self.service_client.table("subscriptions").insert(subscription_data).execute()
            logger.info(f"Created subscription for user: {subscription_data['user_id']}")
            return response.data[0]
        except APIError as e:
            logger.error(f"Error creating subscription: {e}")
            return None

    def update_subscription(
        self,
        user_id: str,
        updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update subscription"""
        try:
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()

            response = self.service_client.table("subscriptions").update(updates).eq(
                "user_id", user_id
            ).execute()

            logger.info(f"Updated subscription for user: {user_id}")
            return response.data[0] if response.data else None
        except APIError as e:
            logger.error(f"Error updating subscription for user {user_id}: {e}")
            return None

    # ========================================================================
    # API Usage Tracking
    # ========================================================================

    def get_current_usage(self, user_id: str) -> Dict[str, Any]:
        """Get current month's API usage for user"""
        try:
            # Get current period from subscription
            subscription = self.get_user_subscription(user_id)
            if not subscription:
                return {"requests_used": 0, "quota": 0, "remaining": 0}

            # Get usage count
            response = self.client.table("api_usage").select("requests_used").eq(
                "user_id", user_id
            ).eq("period_start", subscription.get("current_period_start")).execute()

            requests_used = response.data[0]["requests_used"] if response.data else 0

            # Get tier quota
            from config import TierLimits
            tier = subscription.get("tier", "basic")
            quota = TierLimits.get_monthly_quota(tier)

            return {
                "requests_used": requests_used,
                "quota": quota,
                "remaining": max(0, quota - requests_used),
                "tier": tier,
                "period_start": subscription.get("current_period_start"),
                "period_end": subscription.get("current_period_end")
            }
        except APIError as e:
            logger.error(f"Error fetching usage for user {user_id}: {e}")
            return {"requests_used": 0, "quota": 0, "remaining": 0}

    def increment_usage(self, user_id: str, count: int = 1) -> bool:
        """Increment API usage counter"""
        try:
            subscription = self.get_user_subscription(user_id)
            if not subscription:
                logger.warning(f"No subscription found for user {user_id}")
                return False

            period_start = subscription.get("current_period_start")

            # Try to update existing record
            response = self.service_client.table("api_usage").select("id").eq(
                "user_id", user_id
            ).eq("period_start", period_start).execute()

            if response.data:
                # Update existing
                self.service_client.rpc(
                    "increment_api_usage",
                    {"p_user_id": user_id, "p_count": count}
                ).execute()
            else:
                # Create new record
                self.service_client.table("api_usage").insert({
                    "user_id": user_id,
                    "period_start": period_start,
                    "period_end": subscription.get("current_period_end"),
                    "requests_used": count,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }).execute()

            logger.debug(f"Incremented usage for user {user_id} by {count}")
            return True

        except APIError as e:
            logger.error(f"Error incrementing usage for user {user_id}: {e}")
            return False

    def check_quota(self, user_id: str) -> bool:
        """Check if user has remaining quota"""
        usage = self.get_current_usage(user_id)
        return usage.get("remaining", 0) > 0

    # ========================================================================
    # Audit Logging
    # ========================================================================

    def log_audit(
        self,
        user_id: Optional[str],
        action: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> bool:
        """Log audit event"""
        try:
            audit_data = {
                "user_id": user_id,
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "metadata": metadata or {},
                "ip_address": ip_address,
                "created_at": datetime.now(timezone.utc).isoformat()
            }

            self.service_client.table("audit_log").insert(audit_data).execute()
            logger.debug(f"Logged audit: {action} by {user_id}")
            return True

        except APIError as e:
            logger.error(f"Error logging audit event: {e}")
            return False

    # ========================================================================
    # Twitter Account Operations
    # ========================================================================

    def get_twitter_accounts(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's connected Twitter accounts"""
        try:
            response = self.client.table("twitter_accounts").select("*").eq(
                "user_id", user_id
            ).eq("is_active", True).execute()

            return response.data or []
        except APIError as e:
            logger.error(f"Error fetching Twitter accounts for user {user_id}: {e}")
            return []

    def get_twitter_account(self, account_id: str) -> Optional[Dict[str, Any]]:
        """Get Twitter account by ID"""
        try:
            response = self.service_client.table("twitter_accounts").select("*").eq(
                "id", account_id
            ).execute()

            return response.data[0] if response.data else None
        except APIError as e:
            logger.error(f"Error fetching Twitter account {account_id}: {e}")
            return None

    # ========================================================================
    # Analysis Operations
    # ========================================================================

    def create_analysis(self, analysis_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create new analysis record"""
        try:
            analysis_data["created_at"] = datetime.now(timezone.utc).isoformat()
            analysis_data["updated_at"] = datetime.now(timezone.utc).isoformat()

            response = self.service_client.table("analyses").insert(analysis_data).execute()
            logger.info(f"Created analysis: {response.data[0]['id']}")
            return response.data[0]
        except APIError as e:
            logger.error(f"Error creating analysis: {e}")
            return None

    def get_analysis(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        """Get analysis by ID"""
        try:
            response = self.client.table("analyses").select("*").eq("id", analysis_id).execute()
            return response.data[0] if response.data else None
        except APIError as e:
            logger.error(f"Error fetching analysis {analysis_id}: {e}")
            return None

    def get_user_analyses(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get user's analyses with pagination"""
        try:
            response = self.client.table("analyses").select("*").eq(
                "user_id", user_id
            ).order("created_at", desc=True).range(offset, offset + limit - 1).execute()

            return response.data or []
        except APIError as e:
            logger.error(f"Error fetching analyses for user {user_id}: {e}")
            return []

    def update_analysis(
        self,
        analysis_id: str,
        updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update analysis"""
        try:
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()

            response = self.service_client.table("analyses").update(updates).eq(
                "id", analysis_id
            ).execute()

            return response.data[0] if response.data else None
        except APIError as e:
            logger.error(f"Error updating analysis {analysis_id}: {e}")
            return None

    # ========================================================================
    # Health Check
    # ========================================================================

    def health_check(self) -> bool:
        """Check database connectivity"""
        try:
            # Simple query to check connection
            self.client.table("users").select("id").limit(1).execute()
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False


# ============================================================================
# Global Instance
# ============================================================================

# Singleton instance
db = SupabaseClient()


# ============================================================================
# Dependency for FastAPI
# ============================================================================

def get_db() -> SupabaseClient:
    """
    FastAPI dependency for database access

    Usage:
        @router.get("/users/me")
        def get_current_user(db: SupabaseClient = Depends(get_db)):
            return db.get_user(user_id)
    """
    return db


# ============================================================================
# Export
# ============================================================================

__all__ = ["SupabaseClient", "db", "get_db"]
