# Repazoo Stripe Payment Gateway Integration

Comprehensive Stripe payment processing and subscription management for the Repazoo SaaS platform with tier-based AI model access.

## Overview

This billing module provides secure, PCI-compliant payment processing with:
- Tier-based subscriptions (Basic and Pro)
- Automated webhook handling for subscription lifecycle events
- Complete audit trail for all billing operations
- Fraud detection and suspicious activity monitoring
- Grace period and dunning management
- Integration with Supabase for data persistence

## Architecture

```
/root/repazoo/backend/billing/
├── __init__.py              # Module exports
├── config.py                # Stripe configuration & tier definitions
├── models.py                # Pydantic request/response models
├── stripe_handler.py        # Core Stripe API operations
├── webhook_handler.py       # Webhook event processing
├── routes.py                # FastAPI endpoints
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Subscription Tiers

| Tier  | Price/Month | AI Model       | Monthly Quota | Features                |
|-------|-------------|----------------|---------------|-------------------------|
| Basic | $9 USD      | Claude Sonnet  | 1,000 requests| Standard AI analysis    |
| Pro   | $29 USD     | Claude Opus    | 10,000 requests| Advanced AI analysis   |

## Installation

### 1. Install Python Dependencies

```bash
cd /root/repazoo/backend/billing
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Add the following to `/root/.repazoo-vault/.env`:

```bash
# Environment selector (cfy = test mode, ai = production mode)
REPAZOO_ENV=cfy

# Stripe Test Keys (for CFY environment)
STRIPE_TEST_SECRET_KEY=sk_test_your_test_secret_key_here
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_your_test_publishable_key_here
STRIPE_TEST_WEBHOOK_SECRET=whsec_your_test_webhook_secret_here

# Stripe Live Keys (for AI production environment)
STRIPE_LIVE_SECRET_KEY=sk_live_your_live_secret_key_here
STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key_here
STRIPE_LIVE_WEBHOOK_SECRET=whsec_your_live_webhook_secret_here

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Webhook endpoint
STRIPE_WEBHOOK_ENDPOINT=https://ntf.repazoo.com/webhooks/stripe
```

### 3. Obtain Stripe API Keys

#### Test Mode (Development)
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your test mode keys:
   - Secret Key: `sk_test_...`
   - Publishable Key: `pk_test_...`
3. Add to `.env` as `STRIPE_TEST_SECRET_KEY` and `STRIPE_TEST_PUBLISHABLE_KEY`

#### Live Mode (Production)
1. Complete Stripe account activation
2. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
3. Copy your live mode keys:
   - Secret Key: `sk_live_...`
   - Publishable Key: `pk_live_...`
4. Add to `.env` as `STRIPE_LIVE_SECRET_KEY` and `STRIPE_LIVE_PUBLISHABLE_KEY`

**SECURITY WARNING**: Never commit live keys to version control or expose them in client-side code.

### 4. Create Stripe Products & Prices

Run this script to create products programmatically:

```python
# create_stripe_products.py
import asyncio
from billing.config import StripeConfig
from billing.stripe_handler import StripeHandler

async def main():
    config = StripeConfig()
    handler = StripeHandler(config)

    print("Creating Stripe products and prices...")
    results = await handler.create_products_and_prices()

    for tier, ids in results.items():
        print(f"\n{tier.upper()} Tier:")
        print(f"  Product ID: {ids['product_id']}")
        print(f"  Price ID: {ids['price_id']}")
        print(f"\nAdd these to config.py TIER_CONFIG:")
        print(f"  stripe_price_id_{'cfy' if config.is_test_mode else 'ai'}: \"{ids['price_id']}\"")

if __name__ == "__main__":
    asyncio.run(main())
```

Run it:
```bash
python create_stripe_products.py
```

Update `config.py` with the generated price IDs.

### 5. Configure Stripe Webhooks

#### Option A: Using Stripe Dashboard (Production)

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set endpoint URL: `https://ntf.repazoo.com/webhooks/stripe`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the webhook signing secret (starts with `whsec_`)
7. Add to `.env`:
   ```bash
   STRIPE_TEST_WEBHOOK_SECRET=whsec_...  # For test mode
   STRIPE_LIVE_WEBHOOK_SECRET=whsec_...  # For live mode
   ```

#### Option B: Using Stripe CLI (Development)

Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_X.XX.X_linux_x86_64.tar.gz
tar -xvf stripe_*.tar.gz
sudo mv stripe /usr/local/bin/
```

Login and forward webhooks:
```bash
stripe login
stripe listen --forward-to localhost:8000/webhooks/stripe
```

Copy the webhook signing secret from the output and add to `.env`:
```bash
STRIPE_TEST_WEBHOOK_SECRET=whsec_...
```

## API Endpoints

### Subscription Management

#### Create Subscription
```http
POST /api/subscriptions/create
Content-Type: application/json

{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "tier": "basic",
  "payment_method_id": "pm_1234567890abcdef",
  "email": "user@example.com",
  "trial_period_days": 0
}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174001",
  "stripe_customer_id": "cus_1234567890abcdef",
  "stripe_subscription_id": "sub_1234567890abcdef",
  "tier": "basic",
  "status": "active",
  "current_period_start": "2025-10-07T00:00:00Z",
  "current_period_end": "2025-11-07T00:00:00Z",
  "cancel_at_period_end": false,
  "is_active": true,
  "days_until_renewal": 30,
  "monthly_quota": 1000,
  "ai_model": "sonnet"
}
```

#### Update Subscription Tier
```http
POST /api/subscriptions/update
Content-Type: application/json

{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "new_tier": "pro",
  "prorate": true
}
```

#### Cancel Subscription
```http
POST /api/subscriptions/cancel
Content-Type: application/json

{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "cancel_at_period_end": true,
  "cancellation_reason": "User requested cancellation"
}
```

#### Get Subscription Status
```http
GET /api/subscriptions/status?user_id=123e4567-e89b-12d3-a456-426614174000
```

#### Get Billing History
```http
GET /api/subscriptions/billing-history?user_id=123e4567-e89b-12d3-a456-426614174000&limit=10
```

### Webhook Endpoint

```http
POST /webhooks/stripe
Stripe-Signature: t=1234567890,v1=abc123...
Content-Type: application/json

{
  "id": "evt_1234567890abcdef",
  "type": "customer.subscription.created",
  "data": { ... }
}
```

**SECURITY**: Webhook signature verification is mandatory. Unsigned requests are rejected.

### Admin Endpoints

#### Get Subscription Metrics
```http
GET /api/admin/subscriptions/metrics
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "total_subscriptions": 150,
  "basic_tier_count": 100,
  "pro_tier_count": 50,
  "monthly_revenue": 2350.0,
  "churn_rate": 2.5,
  "failed_payments_count": 3
}
```

## Integration with FastAPI

```python
# main.py
from fastapi import FastAPI
from billing.routes import router as billing_router

app = FastAPI()

# Include billing routes
app.include_router(billing_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## Testing

### Manual Testing with Stripe Test Cards

Use these test card numbers in test mode:

| Card Number         | Scenario                    |
|--------------------|-----------------------------|
| 4242424242424242   | Successful payment          |
| 4000000000000002   | Card declined               |
| 4000002500003155   | Requires authentication     |
| 4000000000009995   | Insufficient funds          |

Example test payment method creation:
```python
import stripe
stripe.api_key = "sk_test_..."

payment_method = stripe.PaymentMethod.create(
    type="card",
    card={
        "number": "4242424242424242",
        "exp_month": 12,
        "exp_year": 2025,
        "cvc": "123",
    },
)

print(f"Payment Method ID: {payment_method.id}")
```

### Testing Webhooks with Stripe CLI

```bash
# Forward webhooks to local development server
stripe listen --forward-to localhost:8000/webhooks/stripe

# Trigger test webhook events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

### Automated Testing

```python
# test_billing.py
import pytest
from billing.stripe_handler import StripeHandler
from billing.config import StripeConfig

@pytest.fixture
def stripe_handler():
    config = StripeConfig()
    return StripeHandler(config)

@pytest.mark.asyncio
async def test_create_subscription(stripe_handler):
    # Test subscription creation
    pass
```

Run tests:
```bash
pytest test_billing.py -v
```

## Database Schema

The billing system uses these Supabase tables:

### `subscriptions` table
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to users table
- `stripe_customer_id` (TEXT): Stripe Customer ID
- `stripe_subscription_id` (TEXT): Stripe Subscription ID
- `tier` (TEXT): Subscription tier (basic, pro, inactive)
- `status` (TEXT): Subscription status (active, canceled, past_due, etc.)
- `current_period_start` (TIMESTAMPTZ): Billing period start
- `current_period_end` (TIMESTAMPTZ): Billing period end
- `cancel_at_period_end` (BOOLEAN): Cancellation flag

### `webhook_events` table
- `id` (UUID): Primary key
- `event_type` (TEXT): Stripe event type
- `stripe_event_id` (TEXT): Unique Stripe event ID
- `payload` (JSONB): Full event payload
- `processed` (BOOLEAN): Processing status
- `processed_at` (TIMESTAMPTZ): Processing timestamp
- `error` (TEXT): Error message if processing failed

### `audit_log` table
- `id` (UUID): Primary key
- `user_id` (UUID): User who performed action
- `action` (TEXT): Action type (SUBSCRIPTION_CREATED, etc.)
- `resource_type` (TEXT): Resource type (subscription, payment)
- `resource_id` (TEXT): Resource identifier
- `metadata` (JSONB): Additional context

## Security Best Practices

### PCI Compliance
1. **NEVER store raw card data**: Always use Stripe's tokenization
2. **Use HTTPS only**: All payment data must be encrypted in transit
3. **Verify webhook signatures**: Prevent webhook spoofing attacks
4. **Implement rate limiting**: Prevent brute force attacks
5. **Log all operations**: Maintain complete audit trail

### API Key Security
- Store keys in environment variables, never in code
- Use test keys for development, live keys only in production
- Rotate keys every 90 days
- Monitor key usage in Stripe dashboard
- Revoke compromised keys immediately

### Fraud Detection
The system automatically flags:
- 3+ failed payment attempts within 10 minutes
- High-value transactions ($500+ USD)
- Unusual geographic patterns (future enhancement)
- Rapid subscription tier changes (future enhancement)

## Webhook Event Handling

### Idempotency
All webhook events are processed idempotently. Duplicate events are detected using `stripe_event_id` and skipped.

### Event Processing Flow
1. Receive webhook POST request
2. Verify Stripe signature
3. Check if event already processed (idempotency)
4. Store event in `webhook_events` table
5. Route to appropriate handler
6. Update subscription status in database
7. Log to audit trail
8. Mark event as processed

### Handled Events

#### `customer.subscription.created`
- Creates subscription record in database
- Sets initial tier and quotas
- Logs subscription creation

#### `customer.subscription.updated`
- Updates subscription status
- Updates tier if changed
- Updates billing period dates
- Adjusts API quotas

#### `customer.subscription.deleted`
- Sets subscription status to canceled
- Sets tier to inactive
- Resets API quotas to zero

#### `invoice.payment_succeeded`
- Ensures subscription is active
- Logs successful payment
- Flags high-value transactions

#### `invoice.payment_failed`
- Updates subscription status to past_due
- Logs failed payment with reason
- Triggers dunning process
- Detects suspicious activity patterns

## Grace Period & Dunning

### Grace Period
- Failed payments trigger 3-day grace period
- Subscription remains active during grace period
- User receives payment retry notifications
- Access revoked after grace period expires

### Automatic Payment Retries
- First retry: 3 days after failure
- Second retry: 5 days after failure
- Third retry: 7 days after failure
- Maximum 3 retry attempts with exponential backoff

## Monitoring & Alerts

### Admin Panel Metrics
- Total active subscriptions
- Monthly recurring revenue (MRR)
- Subscription breakdown by tier
- Failed payment count
- Churn rate

### Automated Alerts
- Failed payment detected
- High-value transaction ($500+)
- Suspicious activity (3+ failures in 10 minutes)
- Subscription expiring in 7 days
- Webhook processing errors

## Troubleshooting

### Webhook Signature Verification Fails
1. Check that webhook secret matches Stripe dashboard
2. Verify environment (test vs live) matches
3. Ensure raw request body is passed to verification
4. Check for proxy/middleware modifying request

### Subscription Creation Fails
1. Verify payment method is valid
2. Check Stripe API key is correct
3. Ensure tier configuration is valid
4. Verify Supabase connection
5. Check audit logs for detailed error

### Database Connection Issues
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
2. Check Supabase project is active
3. Verify network connectivity
4. Check RLS policies allow service key access

### Environment Switching
To switch between test and production:
```bash
# Test mode
export REPAZOO_ENV=cfy

# Production mode
export REPAZOO_ENV=ai
```

## Support & Resources

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe CLI**: https://stripe.com/docs/stripe-cli
- **Supabase Documentation**: https://supabase.com/docs
- **Repazoo Platform**: https://repazoo.com

## License

Proprietary - Repazoo SaaS Platform

---

**Implementation Date**: 2025-10-07
**Last Updated**: 2025-10-07
**Version**: 1.0.0
