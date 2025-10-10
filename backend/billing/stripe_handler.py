"""
Stripe Payment Handler
Core Stripe API integration with PCI-compliant payment processing
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from uuid import UUID

import stripe
from stripe.error import (
    StripeError,
    CardError,
    InvalidRequestError,
    AuthenticationError,
    APIConnectionError,
)

from .config import StripeConfig, TIER_CONFIG, DEFAULT_CURRENCY, TRIAL_PERIOD_DAYS
from .models import (
    SubscriptionTier,
    SubscriptionStatus,
    PaymentStatus,
    CreateSubscriptionRequest,
    UpdateSubscriptionRequest,
    CancelSubscriptionRequest,
)


logger = logging.getLogger(__name__)


class StripeHandler:
    """
    Secure Stripe payment processing handler
    NEVER logs or stores raw payment card data - uses Stripe tokenization
    """

    def __init__(self, config: StripeConfig):
        """
        Initialize Stripe handler with configuration

        Args:
            config: StripeConfig instance with API keys
        """
        self.config = config
        stripe.api_key = config.api_key
        self.test_mode = config.is_test_mode

        logger.info(
            f"Stripe handler initialized in {'TEST' if self.test_mode else 'LIVE'} mode"
        )

    # =====================================================
    # Product & Price Management
    # =====================================================

    async def create_products_and_prices(self) -> Dict[str, Dict[str, str]]:
        """
        Create Stripe products and prices programmatically if they don't exist
        Returns mapping of tier -> {product_id, price_id}

        SECURITY: This method does not handle payment data
        """
        results = {}

        for tier_name, tier_config in TIER_CONFIG.items():
            try:
                # Create product
                product = stripe.Product.create(
                    name=f"Repazoo {tier_config.display_name}",
                    description=f"{tier_config.ai_model.upper()} AI Model - {tier_config.monthly_quota:,} requests/month",
                    metadata={
                        "tier": tier_name,
                        "ai_model": tier_config.ai_model,
                        "monthly_quota": str(tier_config.monthly_quota),
                    },
                )

                # Create recurring price
                price = stripe.Price.create(
                    product=product.id,
                    unit_amount=tier_config.price_usd * 100,  # Convert to cents
                    currency=DEFAULT_CURRENCY,
                    recurring={"interval": "month"},
                    metadata={"tier": tier_name},
                )

                results[tier_name] = {
                    "product_id": product.id,
                    "price_id": price.id,
                }

                logger.info(
                    f"Created Stripe product for {tier_name}: "
                    f"product={product.id}, price={price.id}"
                )

            except StripeError as e:
                logger.error(f"Failed to create Stripe product for {tier_name}: {str(e)}")
                raise

        return results

    async def get_or_create_price(self, tier: str) -> str:
        """
        Get existing price ID or create new product/price for tier

        Args:
            tier: Subscription tier name

        Returns:
            Stripe Price ID

        Raises:
            ValueError: If tier is invalid
            StripeError: If Stripe API fails
        """
        # Check if price already exists in config
        existing_price_id = self.config.get_price_id(tier)
        if existing_price_id:
            return existing_price_id

        # Create new product and price
        products = await self.create_products_and_prices()
        return products[tier]["price_id"]

    # =====================================================
    # Customer Management
    # =====================================================

    async def create_customer(
        self,
        email: str,
        user_id: UUID,
        payment_method_id: str,
    ) -> str:
        """
        Create Stripe customer with payment method

        Args:
            email: Customer email address
            user_id: Internal user UUID
            payment_method_id: Stripe PaymentMethod ID (pm_xxx)

        Returns:
            Stripe Customer ID

        SECURITY: Uses Stripe tokenized payment_method_id, never raw card data
        """
        try:
            customer = stripe.Customer.create(
                email=email,
                payment_method=payment_method_id,
                invoice_settings={
                    "default_payment_method": payment_method_id,
                },
                metadata={
                    "user_id": str(user_id),
                    "platform": "repazoo",
                },
            )

            logger.info(f"Created Stripe customer {customer.id} for user {user_id}")
            return customer.id

        except CardError as e:
            # Card validation error - safe to expose to user
            logger.warning(f"Card error creating customer for user {user_id}: {e.user_message}")
            raise ValueError(f"Card error: {e.user_message}")

        except StripeError as e:
            logger.error(f"Stripe error creating customer for user {user_id}: {str(e)}")
            raise

    async def update_payment_method(
        self,
        customer_id: str,
        payment_method_id: str,
    ) -> bool:
        """
        Update customer's default payment method

        Args:
            customer_id: Stripe Customer ID
            payment_method_id: New Stripe PaymentMethod ID

        Returns:
            True if successful

        SECURITY: Uses tokenized payment_method_id only
        """
        try:
            # Attach payment method to customer
            stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id,
            )

            # Set as default payment method
            stripe.Customer.modify(
                customer_id,
                invoice_settings={
                    "default_payment_method": payment_method_id,
                },
            )

            logger.info(f"Updated payment method for customer {customer_id}")
            return True

        except StripeError as e:
            logger.error(f"Failed to update payment method for {customer_id}: {str(e)}")
            raise

    # =====================================================
    # Subscription Management
    # =====================================================

    async def create_subscription(
        self,
        request: CreateSubscriptionRequest,
        customer_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create new subscription for user

        Args:
            request: CreateSubscriptionRequest with user details
            customer_id: Existing Stripe customer ID (optional)

        Returns:
            Dict with subscription_id, customer_id, status, period info

        SECURITY: All payment data handled via Stripe tokenization
        """
        try:
            # Create customer if not exists
            if not customer_id:
                customer_id = await self.create_customer(
                    email=request.email,
                    user_id=request.user_id,
                    payment_method_id=request.payment_method_id,
                )

            # Get price ID for tier
            price_id = await self.get_or_create_price(request.tier.value)

            # Create subscription
            subscription_params = {
                "customer": customer_id,
                "items": [{"price": price_id}],
                "metadata": {
                    "user_id": str(request.user_id),
                    "tier": request.tier.value,
                },
                "payment_behavior": "default_incomplete",
                "payment_settings": {
                    "save_default_payment_method": "on_subscription",
                },
                "expand": ["latest_invoice.payment_intent"],
            }

            # Add trial period if specified
            if request.trial_period_days > 0:
                subscription_params["trial_period_days"] = request.trial_period_days

            subscription = stripe.Subscription.create(**subscription_params)

            logger.info(
                f"Created subscription {subscription.id} for user {request.user_id} "
                f"(tier={request.tier.value}, customer={customer_id})"
            )

            return {
                "subscription_id": subscription.id,
                "customer_id": customer_id,
                "status": subscription.status,
                "current_period_start": datetime.fromtimestamp(
                    subscription.current_period_start, tz=timezone.utc
                ),
                "current_period_end": datetime.fromtimestamp(
                    subscription.current_period_end, tz=timezone.utc
                ),
                "client_secret": (
                    subscription.latest_invoice.payment_intent.client_secret
                    if hasattr(subscription, "latest_invoice")
                    and subscription.latest_invoice
                    else None
                ),
            }

        except CardError as e:
            logger.warning(f"Card error creating subscription for user {request.user_id}: {e.user_message}")
            raise ValueError(f"Payment failed: {e.user_message}")

        except StripeError as e:
            logger.error(f"Stripe error creating subscription for user {request.user_id}: {str(e)}")
            raise

    async def update_subscription_tier(
        self,
        subscription_id: str,
        new_tier: str,
        prorate: bool = True,
    ) -> Dict[str, Any]:
        """
        Update subscription to new tier

        Args:
            subscription_id: Stripe Subscription ID
            new_tier: New tier name (basic, pro)
            prorate: Whether to prorate charges

        Returns:
            Updated subscription details
        """
        try:
            # Get current subscription
            subscription = stripe.Subscription.retrieve(subscription_id)

            # Get new price ID
            new_price_id = await self.get_or_create_price(new_tier)

            # Update subscription
            updated_subscription = stripe.Subscription.modify(
                subscription_id,
                items=[{
                    "id": subscription["items"]["data"][0].id,
                    "price": new_price_id,
                }],
                proration_behavior="create_prorations" if prorate else "none",
                metadata={
                    **subscription.metadata,
                    "tier": new_tier,
                },
            )

            logger.info(
                f"Updated subscription {subscription_id} to tier {new_tier} "
                f"(prorate={prorate})"
            )

            return {
                "subscription_id": updated_subscription.id,
                "status": updated_subscription.status,
                "current_period_start": datetime.fromtimestamp(
                    updated_subscription.current_period_start, tz=timezone.utc
                ),
                "current_period_end": datetime.fromtimestamp(
                    updated_subscription.current_period_end, tz=timezone.utc
                ),
            }

        except StripeError as e:
            logger.error(f"Failed to update subscription {subscription_id}: {str(e)}")
            raise

    async def cancel_subscription(
        self,
        subscription_id: str,
        cancel_at_period_end: bool = True,
        cancellation_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Cancel subscription

        Args:
            subscription_id: Stripe Subscription ID
            cancel_at_period_end: If True, cancel at period end. If False, cancel immediately.
            cancellation_reason: Optional cancellation reason

        Returns:
            Cancellation details with status and effective date
        """
        try:
            if cancel_at_period_end:
                # Cancel at period end - user keeps access until billing cycle ends
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True,
                    metadata={
                        "cancellation_reason": cancellation_reason or "User requested",
                    },
                )
                effective_date = datetime.fromtimestamp(
                    subscription.current_period_end, tz=timezone.utc
                )
                logger.info(
                    f"Subscription {subscription_id} marked to cancel at period end "
                    f"({effective_date.isoformat()})"
                )
            else:
                # Cancel immediately - access revoked now
                subscription = stripe.Subscription.cancel(
                    subscription_id,
                    metadata={
                        "cancellation_reason": cancellation_reason or "User requested immediate cancellation",
                    },
                )
                effective_date = datetime.now(timezone.utc)
                logger.info(f"Subscription {subscription_id} canceled immediately")

            return {
                "subscription_id": subscription.id,
                "status": subscription.status,
                "canceled_at": effective_date,
                "cancel_at_period_end": cancel_at_period_end,
            }

        except StripeError as e:
            logger.error(f"Failed to cancel subscription {subscription_id}: {str(e)}")
            raise

    async def reactivate_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """
        Reactivate a subscription marked for cancellation

        Args:
            subscription_id: Stripe Subscription ID

        Returns:
            Updated subscription details
        """
        try:
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=False,
            )

            logger.info(f"Reactivated subscription {subscription_id}")

            return {
                "subscription_id": subscription.id,
                "status": subscription.status,
                "cancel_at_period_end": False,
            }

        except StripeError as e:
            logger.error(f"Failed to reactivate subscription {subscription_id}: {str(e)}")
            raise

    # =====================================================
    # Billing & Invoice Operations
    # =====================================================

    async def get_billing_history(
        self,
        customer_id: str,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve billing history for customer

        Args:
            customer_id: Stripe Customer ID
            limit: Number of invoices to retrieve

        Returns:
            List of invoice details
        """
        try:
            invoices = stripe.Invoice.list(
                customer=customer_id,
                limit=limit,
            )

            return [
                {
                    "id": invoice.id,
                    "amount": invoice.amount_paid / 100,  # Convert from cents
                    "currency": invoice.currency,
                    "status": invoice.status,
                    "invoice_pdf": invoice.invoice_pdf,
                    "created_at": datetime.fromtimestamp(invoice.created, tz=timezone.utc),
                    "period_start": datetime.fromtimestamp(invoice.period_start, tz=timezone.utc),
                    "period_end": datetime.fromtimestamp(invoice.period_end, tz=timezone.utc),
                }
                for invoice in invoices.data
            ]

        except StripeError as e:
            logger.error(f"Failed to retrieve billing history for {customer_id}: {str(e)}")
            raise

    async def retry_failed_payment(self, invoice_id: str) -> Dict[str, Any]:
        """
        Retry payment for failed invoice

        Args:
            invoice_id: Stripe Invoice ID

        Returns:
            Payment attempt result
        """
        try:
            invoice = stripe.Invoice.retrieve(invoice_id)

            # Only retry if payment failed
            if invoice.status != "open":
                raise ValueError(f"Invoice {invoice_id} is not in retryable state: {invoice.status}")

            # Attempt to pay invoice
            paid_invoice = stripe.Invoice.pay(invoice_id)

            logger.info(f"Retried payment for invoice {invoice_id}: status={paid_invoice.status}")

            return {
                "invoice_id": paid_invoice.id,
                "status": paid_invoice.status,
                "amount": paid_invoice.amount_paid / 100,
                "currency": paid_invoice.currency,
            }

        except StripeError as e:
            logger.error(f"Failed to retry payment for invoice {invoice_id}: {str(e)}")
            raise

    # =====================================================
    # Subscription Status Queries
    # =====================================================

    async def get_subscription_details(self, subscription_id: str) -> Dict[str, Any]:
        """
        Retrieve detailed subscription information

        Args:
            subscription_id: Stripe Subscription ID

        Returns:
            Comprehensive subscription details
        """
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)

            return {
                "subscription_id": subscription.id,
                "customer_id": subscription.customer,
                "status": subscription.status,
                "tier": subscription.metadata.get("tier", "unknown"),
                "current_period_start": datetime.fromtimestamp(
                    subscription.current_period_start, tz=timezone.utc
                ),
                "current_period_end": datetime.fromtimestamp(
                    subscription.current_period_end, tz=timezone.utc
                ),
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "canceled_at": (
                    datetime.fromtimestamp(subscription.canceled_at, tz=timezone.utc)
                    if subscription.canceled_at
                    else None
                ),
            }

        except StripeError as e:
            logger.error(f"Failed to retrieve subscription {subscription_id}: {str(e)}")
            raise

    # =====================================================
    # Fraud Detection & Security
    # =====================================================

    async def detect_suspicious_activity(
        self,
        user_id: UUID,
        failed_attempts: int,
        timeframe_minutes: int = 10,
    ) -> bool:
        """
        Detect suspicious payment patterns

        Args:
            user_id: User UUID
            failed_attempts: Number of failed payment attempts
            timeframe_minutes: Timeframe to check

        Returns:
            True if suspicious activity detected
        """
        # Flag suspicious if 3+ failures in 10 minutes
        if failed_attempts >= 3 and timeframe_minutes <= 10:
            logger.warning(
                f"SUSPICIOUS ACTIVITY: User {user_id} had {failed_attempts} "
                f"failed payment attempts in {timeframe_minutes} minutes"
            )
            return True

        return False

    def is_high_value_transaction(self, amount_usd: float) -> bool:
        """
        Check if transaction is high-value and requires notification

        Args:
            amount_usd: Transaction amount in USD

        Returns:
            True if transaction exceeds threshold
        """
        HIGH_VALUE_THRESHOLD = 500.0
        return amount_usd >= HIGH_VALUE_THRESHOLD
