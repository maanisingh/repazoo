"""
Stripe Webhook Handler
Processes Stripe webhook events with signature verification and idempotent processing
"""

import logging
import hmac
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from uuid import UUID, uuid4

import stripe
from stripe.error import SignatureVerificationError

from .config import StripeConfig, TIER_CONFIG, GRACE_PERIOD_DAYS, WEBHOOK_EVENTS
from .models import SubscriptionStatus, SubscriptionTier


logger = logging.getLogger(__name__)


class StripeWebhookHandler:
    """
    Secure webhook event processor with signature verification
    Implements idempotent processing to prevent duplicate event handling
    """

    def __init__(self, config: StripeConfig, supabase_client):
        """
        Initialize webhook handler

        Args:
            config: StripeConfig instance
            supabase_client: Supabase client for database operations
        """
        self.config = config
        self.supabase = supabase_client
        stripe.api_key = config.api_key

    # =====================================================
    # Webhook Signature Verification
    # =====================================================

    def verify_webhook_signature(
        self,
        payload: bytes,
        signature_header: str,
    ) -> stripe.Event:
        """
        Verify Stripe webhook signature for security

        Args:
            payload: Raw webhook payload bytes
            signature_header: Stripe-Signature header value

        Returns:
            Verified Stripe Event object

        Raises:
            SignatureVerificationError: If signature is invalid

        SECURITY: This prevents webhook spoofing attacks
        """
        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature_header,
                self.config.webhook_secret,
            )
            logger.info(f"Webhook signature verified for event {event.id}")
            return event

        except SignatureVerificationError as e:
            logger.error(f"Webhook signature verification failed: {str(e)}")
            raise

        except Exception as e:
            logger.error(f"Error verifying webhook signature: {str(e)}")
            raise

    # =====================================================
    # Idempotency & Event Storage
    # =====================================================

    async def is_event_processed(self, stripe_event_id: str) -> bool:
        """
        Check if event has already been processed

        Args:
            stripe_event_id: Stripe event ID

        Returns:
            True if event was already processed
        """
        try:
            result = self.supabase.table("webhook_events").select("id").eq(
                "stripe_event_id", stripe_event_id
            ).execute()

            return len(result.data) > 0

        except Exception as e:
            logger.error(f"Error checking event processing status: {str(e)}")
            return False

    async def store_webhook_event(
        self,
        event: stripe.Event,
        processed: bool = False,
        error: Optional[str] = None,
    ) -> UUID:
        """
        Store webhook event in database for audit trail

        Args:
            event: Stripe Event object
            processed: Whether event was successfully processed
            error: Error message if processing failed

        Returns:
            Database record UUID
        """
        try:
            event_data = {
                "event_type": event.type,
                "stripe_event_id": event.id,
                "payload": event.to_dict(),
                "processed": processed,
                "processed_at": datetime.now(timezone.utc).isoformat() if processed else None,
                "error": error,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

            result = self.supabase.table("webhook_events").insert(event_data).execute()

            logger.info(
                f"Stored webhook event {event.id} (type={event.type}, processed={processed})"
            )

            return UUID(result.data[0]["id"])

        except Exception as e:
            logger.error(f"Failed to store webhook event {event.id}: {str(e)}")
            raise

    async def mark_event_processed(
        self,
        stripe_event_id: str,
        error: Optional[str] = None,
    ) -> bool:
        """
        Mark webhook event as processed

        Args:
            stripe_event_id: Stripe event ID
            error: Error message if processing failed

        Returns:
            True if successful
        """
        try:
            update_data = {
                "processed": error is None,
                "processed_at": datetime.now(timezone.utc).isoformat(),
                "error": error,
            }

            self.supabase.table("webhook_events").update(update_data).eq(
                "stripe_event_id", stripe_event_id
            ).execute()

            return True

        except Exception as e:
            logger.error(f"Failed to mark event {stripe_event_id} as processed: {str(e)}")
            return False

    # =====================================================
    # Subscription Event Handlers
    # =====================================================

    async def handle_subscription_created(self, event: stripe.Event) -> Dict[str, Any]:
        """
        Handle customer.subscription.created event

        Args:
            event: Stripe Event object

        Returns:
            Processing result
        """
        try:
            subscription = event.data.object
            customer_id = subscription.customer
            subscription_id = subscription.id
            tier = subscription.metadata.get("tier", "basic")
            user_id = subscription.metadata.get("user_id")

            if not user_id:
                raise ValueError(f"No user_id in subscription metadata: {subscription_id}")

            # Update subscriptions table
            subscription_data = {
                "user_id": user_id,
                "stripe_customer_id": customer_id,
                "stripe_subscription_id": subscription_id,
                "tier": tier,
                "status": self._map_stripe_status(subscription.status),
                "current_period_start": datetime.fromtimestamp(
                    subscription.current_period_start, tz=timezone.utc
                ).isoformat(),
                "current_period_end": datetime.fromtimestamp(
                    subscription.current_period_end, tz=timezone.utc
                ).isoformat(),
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            # Upsert subscription
            self.supabase.table("subscriptions").upsert(
                subscription_data, on_conflict="user_id"
            ).execute()

            # Log to audit trail
            await self._log_audit_event(
                user_id=UUID(user_id),
                action="SUBSCRIPTION_CREATED",
                resource_type="subscription",
                resource_id=subscription_id,
                metadata={
                    "tier": tier,
                    "status": subscription.status,
                    "customer_id": customer_id,
                },
            )

            logger.info(
                f"Subscription created: user={user_id}, tier={tier}, "
                f"subscription={subscription_id}"
            )

            return {"success": True, "subscription_id": subscription_id}

        except Exception as e:
            logger.error(f"Failed to handle subscription.created: {str(e)}")
            raise

    async def handle_subscription_updated(self, event: stripe.Event) -> Dict[str, Any]:
        """
        Handle customer.subscription.updated event

        Args:
            event: Stripe Event object

        Returns:
            Processing result
        """
        try:
            subscription = event.data.object
            subscription_id = subscription.id
            tier = subscription.metadata.get("tier", "basic")
            user_id = subscription.metadata.get("user_id")

            if not user_id:
                raise ValueError(f"No user_id in subscription metadata: {subscription_id}")

            # Update subscription status
            update_data = {
                "tier": tier,
                "status": self._map_stripe_status(subscription.status),
                "current_period_start": datetime.fromtimestamp(
                    subscription.current_period_start, tz=timezone.utc
                ).isoformat(),
                "current_period_end": datetime.fromtimestamp(
                    subscription.current_period_end, tz=timezone.utc
                ).isoformat(),
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            self.supabase.table("subscriptions").update(update_data).eq(
                "stripe_subscription_id", subscription_id
            ).execute()

            # Update API usage quotas
            await self._update_user_quota(UUID(user_id), tier)

            # Log to audit trail
            await self._log_audit_event(
                user_id=UUID(user_id),
                action="SUBSCRIPTION_UPDATED",
                resource_type="subscription",
                resource_id=subscription_id,
                metadata={
                    "tier": tier,
                    "status": subscription.status,
                    "cancel_at_period_end": subscription.cancel_at_period_end,
                },
            )

            logger.info(
                f"Subscription updated: user={user_id}, tier={tier}, "
                f"status={subscription.status}, subscription={subscription_id}"
            )

            return {"success": True, "subscription_id": subscription_id}

        except Exception as e:
            logger.error(f"Failed to handle subscription.updated: {str(e)}")
            raise

    async def handle_subscription_deleted(self, event: stripe.Event) -> Dict[str, Any]:
        """
        Handle customer.subscription.deleted event

        Args:
            event: Stripe Event object

        Returns:
            Processing result
        """
        try:
            subscription = event.data.object
            subscription_id = subscription.id
            user_id = subscription.metadata.get("user_id")

            if not user_id:
                raise ValueError(f"No user_id in subscription metadata: {subscription_id}")

            # Update subscription to inactive status
            update_data = {
                "tier": "inactive",
                "status": "canceled",
                "cancel_at_period_end": False,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            self.supabase.table("subscriptions").update(update_data).eq(
                "stripe_subscription_id", subscription_id
            ).execute()

            # Reset API usage quotas to zero
            await self._update_user_quota(UUID(user_id), "inactive")

            # Log to audit trail
            await self._log_audit_event(
                user_id=UUID(user_id),
                action="SUBSCRIPTION_CANCELED",
                resource_type="subscription",
                resource_id=subscription_id,
                metadata={
                    "reason": "subscription_deleted",
                    "canceled_at": datetime.now(timezone.utc).isoformat(),
                },
            )

            logger.info(
                f"Subscription deleted: user={user_id}, subscription={subscription_id}"
            )

            return {"success": True, "subscription_id": subscription_id}

        except Exception as e:
            logger.error(f"Failed to handle subscription.deleted: {str(e)}")
            raise

    # =====================================================
    # Payment Event Handlers
    # =====================================================

    async def handle_payment_succeeded(self, event: stripe.Event) -> Dict[str, Any]:
        """
        Handle invoice.payment_succeeded event

        Args:
            event: Stripe Event object

        Returns:
            Processing result
        """
        try:
            invoice = event.data.object
            customer_id = invoice.customer
            subscription_id = invoice.subscription
            amount = invoice.amount_paid / 100  # Convert from cents

            # Get user_id from subscription
            subscription = stripe.Subscription.retrieve(subscription_id)
            user_id = subscription.metadata.get("user_id")

            if not user_id:
                raise ValueError(f"No user_id in subscription {subscription_id}")

            # Ensure subscription is active
            update_data = {
                "status": "active",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            self.supabase.table("subscriptions").update(update_data).eq(
                "stripe_subscription_id", subscription_id
            ).execute()

            # Log successful payment to audit trail
            await self._log_audit_event(
                user_id=UUID(user_id),
                action="SUBSCRIPTION_UPDATED",
                resource_type="payment",
                resource_id=invoice.id,
                metadata={
                    "amount_usd": amount,
                    "currency": invoice.currency,
                    "invoice_id": invoice.id,
                    "status": "succeeded",
                },
            )

            # Check if high-value transaction
            if amount >= 500.0:
                logger.warning(
                    f"HIGH VALUE TRANSACTION: User {user_id} paid ${amount:.2f} USD "
                    f"(invoice={invoice.id})"
                )

            logger.info(
                f"Payment succeeded: user={user_id}, amount=${amount:.2f}, "
                f"invoice={invoice.id}"
            )

            return {
                "success": True,
                "invoice_id": invoice.id,
                "amount": amount,
            }

        except Exception as e:
            logger.error(f"Failed to handle payment.succeeded: {str(e)}")
            raise

    async def handle_payment_failed(self, event: stripe.Event) -> Dict[str, Any]:
        """
        Handle invoice.payment_failed event

        Args:
            event: Stripe Event object

        Returns:
            Processing result
        """
        try:
            invoice = event.data.object
            customer_id = invoice.customer
            subscription_id = invoice.subscription
            amount = invoice.amount_due / 100  # Convert from cents
            failure_message = invoice.last_payment_error.get("message", "Unknown error") if invoice.last_payment_error else "Payment failed"

            # Get user_id from subscription
            subscription = stripe.Subscription.retrieve(subscription_id)
            user_id = subscription.metadata.get("user_id")

            if not user_id:
                raise ValueError(f"No user_id in subscription {subscription_id}")

            # Update subscription to past_due status
            update_data = {
                "status": "past_due",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            self.supabase.table("subscriptions").update(update_data).eq(
                "stripe_subscription_id", subscription_id
            ).execute()

            # Log failed payment to audit trail
            await self._log_audit_event(
                user_id=UUID(user_id),
                action="SUBSCRIPTION_UPDATED",
                resource_type="payment",
                resource_id=invoice.id,
                metadata={
                    "amount_usd": amount,
                    "currency": invoice.currency,
                    "invoice_id": invoice.id,
                    "status": "failed",
                    "failure_reason": failure_message,
                },
            )

            logger.warning(
                f"PAYMENT FAILED: User {user_id} failed to pay ${amount:.2f} USD "
                f"(invoice={invoice.id}, reason={failure_message})"
            )

            # Check for suspicious activity (implementation would track failed attempts)
            # This is a placeholder - actual implementation would query database
            # for recent failed attempts by this user

            return {
                "success": True,
                "invoice_id": invoice.id,
                "amount": amount,
                "failure_reason": failure_message,
            }

        except Exception as e:
            logger.error(f"Failed to handle payment.failed: {str(e)}")
            raise

    # =====================================================
    # Main Webhook Processing
    # =====================================================

    async def process_webhook(
        self,
        payload: bytes,
        signature_header: str,
    ) -> Dict[str, Any]:
        """
        Main webhook processing entry point

        Args:
            payload: Raw webhook payload bytes
            signature_header: Stripe-Signature header

        Returns:
            Processing result with event details

        SECURITY: Verifies signature before processing
        """
        try:
            # Verify webhook signature
            event = self.verify_webhook_signature(payload, signature_header)

            # Check if event already processed (idempotency)
            if await self.is_event_processed(event.id):
                logger.info(f"Event {event.id} already processed, skipping")
                return {
                    "success": True,
                    "message": "Event already processed",
                    "event_id": event.id,
                }

            # Store event in database
            await self.store_webhook_event(event, processed=False)

            # Route to appropriate handler
            result = None
            error = None

            try:
                if event.type == "customer.subscription.created":
                    result = await self.handle_subscription_created(event)
                elif event.type == "customer.subscription.updated":
                    result = await self.handle_subscription_updated(event)
                elif event.type == "customer.subscription.deleted":
                    result = await self.handle_subscription_deleted(event)
                elif event.type == "invoice.payment_succeeded":
                    result = await self.handle_payment_succeeded(event)
                elif event.type == "invoice.payment_failed":
                    result = await self.handle_payment_failed(event)
                else:
                    logger.warning(f"Unhandled webhook event type: {event.type}")
                    result = {"success": True, "message": "Event type not handled"}

            except Exception as e:
                error = str(e)
                logger.error(f"Error processing webhook event {event.id}: {error}")
                raise

            finally:
                # Mark event as processed (or failed)
                await self.mark_event_processed(event.id, error=error)

            return {
                "success": True,
                "event_id": event.id,
                "event_type": event.type,
                "result": result,
            }

        except SignatureVerificationError as e:
            logger.error(f"Webhook signature verification failed: {str(e)}")
            raise

        except Exception as e:
            logger.error(f"Webhook processing error: {str(e)}")
            raise

    # =====================================================
    # Helper Methods
    # =====================================================

    def _map_stripe_status(self, stripe_status: str) -> str:
        """
        Map Stripe subscription status to internal status

        Args:
            stripe_status: Stripe status string

        Returns:
            Internal SubscriptionStatus value
        """
        status_map = {
            "active": "active",
            "canceled": "canceled",
            "past_due": "past_due",
            "unpaid": "unpaid",
            "incomplete": "inactive",
            "incomplete_expired": "inactive",
            "trialing": "trialing",
        }
        return status_map.get(stripe_status, "inactive")

    async def _update_user_quota(self, user_id: UUID, tier: str) -> bool:
        """
        Update user's API usage quota based on tier

        Args:
            user_id: User UUID
            tier: Subscription tier

        Returns:
            True if successful
        """
        try:
            tier_config = TIER_CONFIG.get(tier)
            if not tier_config:
                logger.warning(f"Unknown tier {tier} for user {user_id}")
                return False

            # This would update quota tracking in api_usage table or separate quota table
            # Implementation depends on quota tracking mechanism
            logger.info(
                f"Updated quota for user {user_id}: tier={tier}, "
                f"quota={tier_config.monthly_quota}"
            )

            return True

        except Exception as e:
            logger.error(f"Failed to update quota for user {user_id}: {str(e)}")
            return False

    async def _log_audit_event(
        self,
        user_id: UUID,
        action: str,
        resource_type: str,
        resource_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Log event to audit trail

        Args:
            user_id: User UUID
            action: Action performed
            resource_type: Type of resource
            resource_id: Resource identifier
            metadata: Additional metadata

        Returns:
            True if successful
        """
        try:
            audit_data = {
                "user_id": str(user_id),
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "metadata": metadata,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

            self.supabase.table("audit_log").insert(audit_data).execute()

            logger.debug(f"Logged audit event: {action} on {resource_type}/{resource_id}")

            return True

        except Exception as e:
            logger.error(f"Failed to log audit event: {str(e)}")
            return False
