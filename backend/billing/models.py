"""
Subscription and Billing Pydantic Models
Type-safe request/response models for billing operations
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, EmailStr, field_validator


class SubscriptionTier(str, Enum):
    """Subscription tier levels"""
    BASIC = "basic"
    PRO = "pro"
    INACTIVE = "inactive"


class SubscriptionStatus(str, Enum):
    """Stripe subscription status values"""
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    UNPAID = "unpaid"
    INACTIVE = "inactive"
    TRIALING = "trialing"


class PaymentStatus(str, Enum):
    """Payment transaction status"""
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    PENDING = "pending"
    REFUNDED = "refunded"


# =====================================================
# Request Models
# =====================================================


class CreateSubscriptionRequest(BaseModel):
    """Request to create new subscription"""
    user_id: UUID = Field(..., description="User UUID from auth.users")
    tier: SubscriptionTier = Field(..., description="Subscription tier to create")
    payment_method_id: str = Field(..., description="Stripe PaymentMethod ID (pm_xxx)")
    email: EmailStr = Field(..., description="Customer email for Stripe")
    trial_period_days: int = Field(0, ge=0, le=90, description="Trial period days (0-90)")

    @field_validator("tier")
    @classmethod
    def validate_tier(cls, v):
        if v == SubscriptionTier.INACTIVE:
            raise ValueError("Cannot create subscription with inactive tier")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "tier": "basic",
                "payment_method_id": "pm_1234567890abcdef",
                "email": "user@example.com",
                "trial_period_days": 0
            }
        }


class UpdateSubscriptionRequest(BaseModel):
    """Request to update existing subscription"""
    user_id: UUID = Field(..., description="User UUID")
    new_tier: SubscriptionTier = Field(..., description="New subscription tier")
    prorate: bool = Field(True, description="Prorate charges for tier change")

    @field_validator("new_tier")
    @classmethod
    def validate_tier(cls, v):
        if v == SubscriptionTier.INACTIVE:
            raise ValueError("Cannot update to inactive tier. Use cancel endpoint instead.")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "new_tier": "pro",
                "prorate": True
            }
        }


class CancelSubscriptionRequest(BaseModel):
    """Request to cancel subscription"""
    user_id: UUID = Field(..., description="User UUID")
    cancel_at_period_end: bool = Field(
        True,
        description="If True, cancel at end of billing period. If False, cancel immediately."
    )
    cancellation_reason: Optional[str] = Field(None, max_length=500, description="Reason for cancellation")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "cancel_at_period_end": True,
                "cancellation_reason": "Switching to competitor"
            }
        }


# =====================================================
# Response Models
# =====================================================


class SubscriptionResponse(BaseModel):
    """Subscription information response"""
    id: UUID = Field(..., description="Subscription record ID")
    user_id: UUID = Field(..., description="User UUID")
    stripe_customer_id: Optional[str] = Field(None, description="Stripe Customer ID")
    stripe_subscription_id: Optional[str] = Field(None, description="Stripe Subscription ID")
    tier: SubscriptionTier = Field(..., description="Current subscription tier")
    status: SubscriptionStatus = Field(..., description="Subscription status")
    current_period_start: Optional[datetime] = Field(None, description="Current billing period start")
    current_period_end: Optional[datetime] = Field(None, description="Current billing period end")
    cancel_at_period_end: bool = Field(..., description="Will cancel at period end")
    created_at: datetime = Field(..., description="Subscription creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    # Computed fields
    is_active: bool = Field(..., description="Whether subscription is currently active")
    days_until_renewal: Optional[int] = Field(None, description="Days until next billing")
    monthly_quota: int = Field(..., description="API requests quota per month")
    ai_model: str = Field(..., description="AI model for tier (sonnet/opus)")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "stripe_customer_id": "cus_1234567890abcdef",
                "stripe_subscription_id": "sub_1234567890abcdef",
                "tier": "pro",
                "status": "active",
                "current_period_start": "2025-10-07T00:00:00Z",
                "current_period_end": "2025-11-07T00:00:00Z",
                "cancel_at_period_end": False,
                "created_at": "2025-10-07T00:00:00Z",
                "updated_at": "2025-10-07T00:00:00Z",
                "is_active": True,
                "days_until_renewal": 30,
                "monthly_quota": 10000,
                "ai_model": "opus"
            }
        }


class PaymentResponse(BaseModel):
    """Payment transaction response"""
    transaction_id: str = Field(..., description="Unique transaction ID")
    amount: float = Field(..., description="Payment amount in USD")
    currency: str = Field("usd", description="Currency code")
    status: PaymentStatus = Field(..., description="Payment status")
    payment_method_type: Optional[str] = Field(None, description="Payment method type (card, etc)")
    created_at: datetime = Field(..., description="Payment timestamp")
    failure_reason: Optional[str] = Field(None, description="Reason for failed payment")

    class Config:
        json_schema_extra = {
            "example": {
                "transaction_id": "pi_1234567890abcdef",
                "amount": 29.0,
                "currency": "usd",
                "status": "succeeded",
                "payment_method_type": "card",
                "created_at": "2025-10-07T00:00:00Z",
                "failure_reason": None
            }
        }


class WebhookEventResponse(BaseModel):
    """Webhook event processing response"""
    event_id: str = Field(..., description="Stripe event ID")
    event_type: str = Field(..., description="Stripe event type")
    processed: bool = Field(..., description="Whether event was processed successfully")
    error: Optional[str] = Field(None, description="Error message if processing failed")
    created_at: datetime = Field(..., description="Event timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "event_id": "evt_1234567890abcdef",
                "event_type": "customer.subscription.created",
                "processed": True,
                "error": None,
                "created_at": "2025-10-07T00:00:00Z"
            }
        }


class BillingHistoryItem(BaseModel):
    """Billing history record"""
    id: str = Field(..., description="Invoice ID")
    amount: float = Field(..., description="Invoice amount")
    currency: str = Field(..., description="Currency code")
    status: str = Field(..., description="Invoice status")
    invoice_pdf: Optional[str] = Field(None, description="PDF download URL")
    created_at: datetime = Field(..., description="Invoice creation timestamp")
    period_start: datetime = Field(..., description="Billing period start")
    period_end: datetime = Field(..., description="Billing period end")


class BillingHistoryResponse(BaseModel):
    """Billing history response"""
    user_id: UUID = Field(..., description="User UUID")
    invoices: list[BillingHistoryItem] = Field(..., description="List of invoices")
    total_count: int = Field(..., description="Total invoice count")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "invoices": [
                    {
                        "id": "in_1234567890abcdef",
                        "amount": 29.0,
                        "currency": "usd",
                        "status": "paid",
                        "invoice_pdf": "https://invoice.stripe.com/i/pdf",
                        "created_at": "2025-10-07T00:00:00Z",
                        "period_start": "2025-10-07T00:00:00Z",
                        "period_end": "2025-11-07T00:00:00Z"
                    }
                ],
                "total_count": 1
            }
        }


# =====================================================
# Admin Panel Models
# =====================================================


class SubscriptionMetrics(BaseModel):
    """Subscription metrics for admin panel"""
    total_subscriptions: int = Field(..., description="Total active subscriptions")
    basic_tier_count: int = Field(..., description="Basic tier subscription count")
    pro_tier_count: int = Field(..., description="Pro tier subscription count")
    monthly_revenue: float = Field(..., description="Monthly recurring revenue (MRR)")
    churn_rate: float = Field(..., description="Churn rate percentage")
    failed_payments_count: int = Field(..., description="Failed payments in last 30 days")

    class Config:
        json_schema_extra = {
            "example": {
                "total_subscriptions": 150,
                "basic_tier_count": 100,
                "pro_tier_count": 50,
                "monthly_revenue": 2350.0,
                "churn_rate": 2.5,
                "failed_payments_count": 3
            }
        }
