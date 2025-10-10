# Repazoo Billing - Quick Start Guide

Fast setup guide for getting the Stripe billing integration running.

## Prerequisites

- Python 3.9+
- Stripe account (test mode)
- Supabase project configured
- Environment variables access

## 5-Minute Setup

### Step 1: Install Dependencies (1 min)

```bash
cd /root/repazoo/backend/billing
pip install -r requirements.txt
```

### Step 2: Configure Environment (2 min)

Add to `/root/.repazoo-vault/.env`:

```bash
# Environment
REPAZOO_ENV=cfy

# Stripe Test Keys
STRIPE_TEST_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_YOUR_KEY
STRIPE_TEST_WEBHOOK_SECRET=whsec_YOUR_SECRET

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
```

Get Stripe keys: https://dashboard.stripe.com/test/apikeys

### Step 3: Create Products (1 min)

```bash
source /root/.repazoo-vault/.env
python create_stripe_products.py
```

Copy the generated price IDs to `config.py`.

### Step 4: Setup Webhooks (1 min)

**Option A - Local Testing**:
```bash
stripe login
stripe listen --forward-to localhost:8000/webhooks/stripe
```

**Option B - Production**:
- Go to https://dashboard.stripe.com/webhooks
- Add endpoint: `https://ntf.repazoo.com/webhooks/stripe`
- Select events: `customer.subscription.*`, `invoice.payment_*`
- Copy webhook secret to `.env`

## Test It

### Create Test Subscription

```python
import requests

response = requests.post(
    "http://localhost:8000/api/subscriptions/create",
    json={
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "tier": "basic",
        "payment_method_id": "pm_card_visa",  # Stripe test token
        "email": "test@example.com",
        "trial_period_days": 0
    }
)

print(response.json())
```

### Use Stripe Test Cards

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

## Common Issues

### "Missing Stripe API key"
→ Check `.env` file has correct keys for your environment (cfy/ai)

### "Webhook signature verification failed"
→ Ensure `STRIPE_TEST_WEBHOOK_SECRET` matches Stripe CLI or dashboard

### "Supabase connection error"
→ Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct

## Next Steps

- Read full documentation: `README.md`
- Review implementation: `STRIPE_IMPLEMENTATION_SUMMARY.md`
- Test all endpoints
- Deploy to production

## Support

Questions? See `/root/repazoo/backend/billing/README.md` for detailed docs.
