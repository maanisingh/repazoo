"""
FastAPI Billing Routes
RESTful API endpoints for subscription management and payment processing
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from fastapi.responses import JSONResponse

from .config import StripeConfig, TIER_CONFIG
from .models import (
    CreateSubscriptionRequest,
    UpdateSubscriptionRequest,
    CancelSubscriptionRequest,
    SubscriptionResponse,
    BillingHistoryResponse,
    BillingHistoryItem,
    SubscriptionMetrics,
    SubscriptionTier,
    SubscriptionStatus,
)
from .stripe_handler import StripeHandler
from .webhook_handler import StripeWebhookHandler


logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api", tags=["billing"])


# =====================================================
# Dependency Injection
# =====================================================


def get_stripe_config() -> StripeConfig:
    """Get Stripe configuration"""
    return StripeConfig()


def get_stripe_handler(config: StripeConfig = Depends(get_stripe_config)) -> StripeHandler:
    """Get Stripe handler instance"""
    return StripeHandler(config)


def get_supabase_client():
    """
    Get Supabase client instance
    NOTE: Implementation depends on your Supabase setup
    Replace with actual Supabase client initialization
    """
    # TODO: Replace with actual Supabase client
    from supabase import create_client
    import os

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")

    if not url or not key:
        raise ValueError("Missing Supabase credentials")

    return create_client(url, key)


def get_webhook_handler(
    config: StripeConfig = Depends(get_stripe_config),
) -> StripeWebhookHandler:
    """Get webhook handler instance"""
    supabase = get_supabase_client()
    return StripeWebhookHandler(config, supabase)


# =====================================================
# Subscription Management Endpoints
# =====================================================


@router.post(
    "/subscriptions/create",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new subscription",
    description="Create a new subscription for a user with specified tier and payment method",
)
async def create_subscription(
    request: CreateSubscriptionRequest,
    handler: StripeHandler = Depends(get_stripe_handler),
    supabase=Depends(get_supabase_client),
):
    """
    Create new subscription for user

    SECURITY: Uses Stripe tokenized payment_method_id only
    NEVER accepts raw card data
    """
    try:
        # Check if user already has active subscription
        existing = supabase.table("subscriptions").select("*").eq(
            "user_id", str(request.user_id)
        ).execute()

        if existing.data and existing.data[0].get("status") == "active":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already has active subscription",
            )

        # Create Stripe subscription
        stripe_result = await handler.create_subscription(request)

        # Store in database
        tier_config = TIER_CONFIG[request.tier.value]
        subscription_data = {
            "user_id": str(request.user_id),
            "stripe_customer_id": stripe_result["customer_id"],
            "stripe_subscription_id": stripe_result["subscription_id"],
            "tier": request.tier.value,
            "status": stripe_result["status"],
            "current_period_start": stripe_result["current_period_start"].isoformat(),
            "current_period_end": stripe_result["current_period_end"].isoformat(),
            "cancel_at_period_end": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        db_result = supabase.table("subscriptions").insert(subscription_data).execute()

        # Log audit event
        audit_data = {
            "user_id": str(request.user_id),
            "action": "SUBSCRIPTION_CREATED",
            "resource_type": "subscription",
            "resource_id": stripe_result["subscription_id"],
            "metadata": {
                "tier": request.tier.value,
                "payment_method": "card",  # Don't log actual payment details
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("audit_log").insert(audit_data).execute()

        logger.info(
            f"Created subscription for user {request.user_id}: "
            f"tier={request.tier.value}, subscription={stripe_result['subscription_id']}"
        )

        # Build response
        subscription_record = db_result.data[0]
        return SubscriptionResponse(
            id=UUID(subscription_record["id"]),
            user_id=request.user_id,
            stripe_customer_id=subscription_record["stripe_customer_id"],
            stripe_subscription_id=subscription_record["stripe_subscription_id"],
            tier=SubscriptionTier(subscription_record["tier"]),
            status=SubscriptionStatus(subscription_record["status"]),
            current_period_start=datetime.fromisoformat(subscription_record["current_period_start"]),
            current_period_end=datetime.fromisoformat(subscription_record["current_period_end"]),
            cancel_at_period_end=subscription_record["cancel_at_period_end"],
            created_at=datetime.fromisoformat(subscription_record["created_at"]),
            updated_at=datetime.fromisoformat(subscription_record["updated_at"]),
            is_active=subscription_record["status"] == "active",
            days_until_renewal=(
                datetime.fromisoformat(subscription_record["current_period_end"]) - datetime.now(timezone.utc)
            ).days,
            monthly_quota=tier_config.monthly_quota,
            ai_model=tier_config.ai_model,
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription",
        )


@router.post(
    "/subscriptions/update",
    response_model=SubscriptionResponse,
    summary="Update subscription tier",
    description="Update user's subscription to a different tier with optional proration",
)
async def update_subscription(
    request: UpdateSubscriptionRequest,
    handler: StripeHandler = Depends(get_stripe_handler),
    supabase=Depends(get_supabase_client),
):
    """
    Update subscription tier
    """
    try:
        # Get existing subscription
        existing = supabase.table("subscriptions").select("*").eq(
            "user_id", str(request.user_id)
        ).execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found",
            )

        subscription = existing.data[0]
        stripe_subscription_id = subscription["stripe_subscription_id"]

        # Update in Stripe
        stripe_result = await handler.update_subscription_tier(
            subscription_id=stripe_subscription_id,
            new_tier=request.new_tier.value,
            prorate=request.prorate,
        )

        # Update database
        tier_config = TIER_CONFIG[request.new_tier.value]
        update_data = {
            "tier": request.new_tier.value,
            "status": stripe_result["status"],
            "current_period_start": stripe_result["current_period_start"].isoformat(),
            "current_period_end": stripe_result["current_period_end"].isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        db_result = supabase.table("subscriptions").update(update_data).eq(
            "user_id", str(request.user_id)
        ).execute()

        # Log audit event
        audit_data = {
            "user_id": str(request.user_id),
            "action": "SUBSCRIPTION_UPDATED",
            "resource_type": "subscription",
            "resource_id": stripe_subscription_id,
            "metadata": {
                "old_tier": subscription["tier"],
                "new_tier": request.new_tier.value,
                "prorate": request.prorate,
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("audit_log").insert(audit_data).execute()

        logger.info(
            f"Updated subscription for user {request.user_id}: "
            f"tier={request.new_tier.value}, prorate={request.prorate}"
        )

        # Build response
        subscription_record = db_result.data[0]
        return SubscriptionResponse(
            id=UUID(subscription_record["id"]),
            user_id=request.user_id,
            stripe_customer_id=subscription_record["stripe_customer_id"],
            stripe_subscription_id=subscription_record["stripe_subscription_id"],
            tier=SubscriptionTier(subscription_record["tier"]),
            status=SubscriptionStatus(subscription_record["status"]),
            current_period_start=datetime.fromisoformat(subscription_record["current_period_start"]),
            current_period_end=datetime.fromisoformat(subscription_record["current_period_end"]),
            cancel_at_period_end=subscription_record["cancel_at_period_end"],
            created_at=datetime.fromisoformat(subscription_record["created_at"]),
            updated_at=datetime.fromisoformat(subscription_record["updated_at"]),
            is_active=subscription_record["status"] == "active",
            days_until_renewal=(
                datetime.fromisoformat(subscription_record["current_period_end"]) - datetime.now(timezone.utc)
            ).days,
            monthly_quota=tier_config.monthly_quota,
            ai_model=tier_config.ai_model,
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Error updating subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update subscription",
        )


@router.post(
    "/subscriptions/cancel",
    response_model=dict,
    summary="Cancel subscription",
    description="Cancel subscription either immediately or at the end of billing period",
)
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    handler: StripeHandler = Depends(get_stripe_handler),
    supabase=Depends(get_supabase_client),
):
    """
    Cancel subscription
    """
    try:
        # Get existing subscription
        existing = supabase.table("subscriptions").select("*").eq(
            "user_id", str(request.user_id)
        ).execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found",
            )

        subscription = existing.data[0]
        stripe_subscription_id = subscription["stripe_subscription_id"]

        # Cancel in Stripe
        stripe_result = await handler.cancel_subscription(
            subscription_id=stripe_subscription_id,
            cancel_at_period_end=request.cancel_at_period_end,
            cancellation_reason=request.cancellation_reason,
        )

        # Update database
        update_data = {
            "status": stripe_result["status"],
            "cancel_at_period_end": request.cancel_at_period_end,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        # If immediate cancellation, set tier to inactive
        if not request.cancel_at_period_end:
            update_data["tier"] = "inactive"

        supabase.table("subscriptions").update(update_data).eq(
            "user_id", str(request.user_id)
        ).execute()

        # Log audit event
        audit_data = {
            "user_id": str(request.user_id),
            "action": "SUBSCRIPTION_CANCELED",
            "resource_type": "subscription",
            "resource_id": stripe_subscription_id,
            "metadata": {
                "cancel_at_period_end": request.cancel_at_period_end,
                "cancellation_reason": request.cancellation_reason,
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("audit_log").insert(audit_data).execute()

        logger.info(
            f"Canceled subscription for user {request.user_id}: "
            f"cancel_at_period_end={request.cancel_at_period_end}"
        )

        return {
            "success": True,
            "message": (
                "Subscription will be canceled at the end of the billing period"
                if request.cancel_at_period_end
                else "Subscription canceled immediately"
            ),
            "canceled_at": stripe_result["canceled_at"].isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error canceling subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription",
        )


@router.get(
    "/subscriptions/status",
    response_model=SubscriptionResponse,
    summary="Get subscription status",
    description="Retrieve current subscription status and details for a user",
)
async def get_subscription_status(
    user_id: UUID,
    supabase=Depends(get_supabase_client),
):
    """
    Get subscription status for user
    """
    try:
        # Get subscription from database
        result = supabase.table("subscriptions").select("*").eq(
            "user_id", str(user_id)
        ).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found",
            )

        subscription = result.data[0]
        tier = subscription["tier"]
        tier_config = TIER_CONFIG.get(tier, TIER_CONFIG["basic"])

        return SubscriptionResponse(
            id=UUID(subscription["id"]),
            user_id=user_id,
            stripe_customer_id=subscription.get("stripe_customer_id"),
            stripe_subscription_id=subscription.get("stripe_subscription_id"),
            tier=SubscriptionTier(tier),
            status=SubscriptionStatus(subscription["status"]),
            current_period_start=(
                datetime.fromisoformat(subscription["current_period_start"])
                if subscription.get("current_period_start")
                else None
            ),
            current_period_end=(
                datetime.fromisoformat(subscription["current_period_end"])
                if subscription.get("current_period_end")
                else None
            ),
            cancel_at_period_end=subscription["cancel_at_period_end"],
            created_at=datetime.fromisoformat(subscription["created_at"]),
            updated_at=datetime.fromisoformat(subscription["updated_at"]),
            is_active=subscription["status"] == "active",
            days_until_renewal=(
                (datetime.fromisoformat(subscription["current_period_end"]) - datetime.now(timezone.utc)).days
                if subscription.get("current_period_end")
                else None
            ),
            monthly_quota=tier_config.monthly_quota,
            ai_model=tier_config.ai_model,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting subscription status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve subscription status",
        )


@router.get(
    "/subscriptions/billing-history",
    response_model=BillingHistoryResponse,
    summary="Get billing history",
    description="Retrieve invoice history for a user",
)
async def get_billing_history(
    user_id: UUID,
    limit: int = 10,
    handler: StripeHandler = Depends(get_stripe_handler),
    supabase=Depends(get_supabase_client),
):
    """
    Get billing history for user
    """
    try:
        # Get subscription to find customer_id
        result = supabase.table("subscriptions").select("stripe_customer_id").eq(
            "user_id", str(user_id)
        ).execute()

        if not result.data or not result.data[0].get("stripe_customer_id"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No billing history found",
            )

        customer_id = result.data[0]["stripe_customer_id"]

        # Get invoices from Stripe
        invoices = await handler.get_billing_history(customer_id, limit)

        return BillingHistoryResponse(
            user_id=user_id,
            invoices=[
                BillingHistoryItem(
                    id=inv["id"],
                    amount=inv["amount"],
                    currency=inv["currency"],
                    status=inv["status"],
                    invoice_pdf=inv.get("invoice_pdf"),
                    created_at=inv["created_at"],
                    period_start=inv["period_start"],
                    period_end=inv["period_end"],
                )
                for inv in invoices
            ],
            total_count=len(invoices),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting billing history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve billing history",
        )


# =====================================================
# Webhook Endpoint
# =====================================================


@router.post(
    "/webhooks/stripe",
    status_code=status.HTTP_200_OK,
    summary="Stripe webhook endpoint",
    description="Handles Stripe webhook events with signature verification",
    include_in_schema=False,  # Hide from public API docs
)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    webhook_handler: StripeWebhookHandler = Depends(get_webhook_handler),
):
    """
    Stripe webhook endpoint

    SECURITY: Verifies webhook signature to prevent spoofing
    """
    try:
        # Get raw payload
        payload = await request.body()

        if not stripe_signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing Stripe-Signature header",
            )

        # Process webhook
        result = await webhook_handler.process_webhook(payload, stripe_signature)

        logger.info(f"Webhook processed: {result['event_type']} ({result['event_id']})")

        return JSONResponse(
            content={"success": True, "event_id": result["event_id"]},
            status_code=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Webhook processing error: {str(e)}")
        # Return 200 to prevent Stripe from retrying invalid webhooks
        return JSONResponse(
            content={"success": False, "error": "Webhook processing failed"},
            status_code=status.HTTP_200_OK,
        )


# =====================================================
# Admin Endpoints (Protected)
# =====================================================


@router.get(
    "/admin/subscriptions/metrics",
    response_model=SubscriptionMetrics,
    summary="Get subscription metrics",
    description="Retrieve subscription metrics for admin panel (requires admin authentication)",
)
async def get_subscription_metrics(
    supabase=Depends(get_supabase_client),
    # TODO: Add admin authentication dependency
):
    """
    Get subscription metrics for admin panel
    """
    try:
        # Get all active subscriptions
        subscriptions = supabase.table("subscriptions").select("*").eq(
            "status", "active"
        ).execute()

        total = len(subscriptions.data)
        basic_count = sum(1 for s in subscriptions.data if s["tier"] == "basic")
        pro_count = sum(1 for s in subscriptions.data if s["tier"] == "pro")

        # Calculate MRR
        basic_mrr = basic_count * TIER_CONFIG["basic"].price_usd
        pro_mrr = pro_count * TIER_CONFIG["pro"].price_usd
        monthly_revenue = basic_mrr + pro_mrr

        # Get failed payments in last 30 days
        thirty_days_ago = (datetime.now(timezone.utc) - datetime.timedelta(days=30)).isoformat()
        failed_payments = supabase.table("webhook_events").select("id").eq(
            "event_type", "invoice.payment_failed"
        ).gte("created_at", thirty_days_ago).execute()

        return SubscriptionMetrics(
            total_subscriptions=total,
            basic_tier_count=basic_count,
            pro_tier_count=pro_count,
            monthly_revenue=monthly_revenue,
            churn_rate=0.0,  # TODO: Calculate actual churn rate
            failed_payments_count=len(failed_payments.data),
        )

    except Exception as e:
        logger.error(f"Error getting subscription metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve subscription metrics",
        )
