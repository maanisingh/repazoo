# Repazoo Billing System Architecture

Visual overview of the Stripe payment gateway integration architecture.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REPAZOO BILLING SYSTEM                          │
│                      Stripe Payment Gateway Integration                 │
└─────────────────────────────────────────────────────────────────────────┘

                                  ┌──────────┐
                                  │  Client  │
                                  │ Browser  │
                                  └────┬─────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
           ┌─────────────┐    ┌─────────────┐   ┌─────────────┐
           │   Stripe.js │    │   FastAPI   │   │  Supabase   │
           │  (Frontend) │    │  (Backend)  │   │ (Database)  │
           └──────┬──────┘    └──────┬──────┘   └──────┬──────┘
                  │                  │                  │
                  │                  │                  │
        ┌─────────▼──────────┐      │                  │
        │   Stripe Elements  │      │                  │
        │  (Secure Payment)  │      │                  │
        └─────────┬──────────┘      │                  │
                  │                  │                  │
                  │  TokenID(pm_xxx) │                  │
                  └──────────────────►                  │
                                     │                  │
                           ┌─────────▼──────────┐      │
                           │  Billing Routes    │      │
                           │  /api/subscriptions│◄─────┤
                           └─────────┬──────────┘      │
                                     │                  │
                           ┌─────────▼──────────┐      │
                           │  Stripe Handler    │      │
                           │  (Payment Logic)   │      │
                           └─────────┬──────────┘      │
                                     │                  │
                                     │  API Calls       │
                                     ▼                  │
                           ┌─────────────────┐         │
                           │   Stripe API    │         │
                           │  (stripe.com)   │         │
                           └─────────┬───────┘         │
                                     │                  │
                                     │  Webhooks        │
                                     ▼                  │
                           ┌─────────────────┐         │
                           │ Webhook Handler │         │
                           │  (Event Process)│◄────────┤
                           └─────────┬───────┘         │
                                     │                  │
                                     │  DB Updates      │
                                     └──────────────────►
```

## Data Flow

### 1. Subscription Creation Flow

```
User Action                     System Processing                 Database
───────────                     ─────────────────                ────────

[Click Subscribe]
      │
      ▼
[Enter Card Info]
      │
      ▼                         [Tokenize Card]
[Submit Payment] ──────────────► stripe.js
      │                               │
      │                         [pm_xxx token]
      │                               │
      ▼                               ▼
                              [Create Customer]
                              [Create Subscription]
                                      │
                                      ▼
                              [POST /api/subscriptions/create]
                                      │
                                      ▼
                              [StripeHandler.create_subscription()]
                                      │
                                      ▼
                              [Stripe API Call]
                                      │
                                      ▼
                              [Store in DB] ─────────────────────► subscriptions
                                      │                            webhook_events
                                      │                            audit_log
                                      ▼
[Confirmation] ◄───────────── [Return Success]
```

### 2. Webhook Processing Flow

```
Stripe Event                   Webhook Handler                  Database
────────────                   ───────────────                  ────────

[Payment Success]
      │
      ▼
[Generate Event]
      │
      ▼
[POST /webhooks/stripe]
      │
      ├─► Header: Stripe-Signature
      └─► Body: Event JSON
                              │
                              ▼
                        [Verify Signature]
                        (HMAC-SHA256)
                              │
                              ├─► Invalid ─► [403 Forbidden]
                              │
                              ▼
                        [Check Idempotency]
                              │
                              ├─► Already Processed ─► [200 OK]
                              │
                              ▼
                        [Store Event] ─────────────────────────► webhook_events
                              │
                              ▼
                        [Route to Handler]
                              │
                              ├─► subscription.created
                              ├─► subscription.updated
                              ├─► subscription.deleted
                              ├─► payment_succeeded
                              └─► payment_failed
                                      │
                                      ▼
                              [Update Subscription] ───────────► subscriptions
                                      │
                                      ▼
                              [Update Quotas]
                                      │
                                      ▼
                              [Log Audit Trail] ────────────────► audit_log
                                      │
                                      ▼
                              [Mark Processed] ─────────────────► webhook_events
                                      │
                                      ▼
                              [200 OK Response]
```

### 3. Tier Upgrade Flow

```
User Request               Stripe Operations              Database Updates
────────────               ─────────────────              ────────────────

[Upgrade to Pro]
      │
      ▼
[POST /api/subscriptions/update]
      │
      ├─► user_id: xxx
      ├─► new_tier: pro
      └─► prorate: true
                              │
                              ▼
                        [Get Current Subscription]
                              │
                              ▼
                        [Calculate Proration]
                              │
                              ▼
                        [Update Stripe Subscription]
                        stripe.Subscription.modify()
                              │
                              ▼
                        [Stripe Processes]
                              │
                              ├─► Generate Proration Invoice
                              ├─► Charge Difference
                              └─► Update Subscription
                                      │
                                      ▼
                              [Update Database] ───────────────► subscriptions
                              tier: basic → pro                     (tier updated)
                              status: active
                              updated_at: now
                                      │
                                      ▼
                              [Update Quotas]
                              1,000 → 10,000 requests
                                      │
                                      ▼
                              [Log Audit Trail] ───────────────► audit_log
                                      │                          (upgrade recorded)
                                      ▼
[Confirmation] ◄───────────── [Return Success]
[Pro Tier Active]
```

## Component Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         BILLING MODULE                                │
└──────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────┐
    │  config.py - Configuration & Tier Definitions               │
    │  ─────────────────────────────────────────────────────────  │
    │  • StripeConfig: API key management                        │
    │  • TIER_CONFIG: Subscription tier definitions               │
    │  • Environment switching (CFY/AI)                           │
    │  • Price ID mapping                                         │
    └─────────────────────────────────────────────────────────────┘
                                │
    ┌───────────────────────────┴───────────────────────────────────┐
    │                                                               │
    ▼                                                               ▼
┌─────────────────────────┐                       ┌─────────────────────────┐
│  models.py              │                       │  stripe_handler.py      │
│  ─────────────────────  │                       │  ─────────────────────  │
│  Request Models:        │                       │  Core Operations:       │
│  • CreateSubscription   │                       │  • create_subscription  │
│  • UpdateSubscription   │                       │  • update_tier          │
│  • CancelSubscription   │                       │  • cancel_subscription  │
│                         │                       │  • create_customer      │
│  Response Models:       │                       │  • get_billing_history  │
│  • SubscriptionResponse │                       │  • retry_payment        │
│  • PaymentResponse      │                       │  • fraud_detection      │
│  • BillingHistory       │                       │                         │
│  • Metrics              │                       │  Product Management:    │
│                         │                       │  • create_products      │
│  Enums:                 │                       │  • get_price_id         │
│  • SubscriptionTier     │                       │                         │
│  • SubscriptionStatus   │                       │  Security:              │
│  • PaymentStatus        │                       │  • PCI compliance       │
└─────────────────────────┘                       │  • Tokenization only    │
                                                  └─────────────────────────┘
                                                              │
    ┌─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  webhook_handler.py - Webhook Event Processing              │
│  ─────────────────────────────────────────────────────────  │
│  Security:                                                  │
│  • verify_webhook_signature() - HMAC-SHA256 validation     │
│  • Idempotency check via stripe_event_id                   │
│                                                             │
│  Event Handlers:                                            │
│  • handle_subscription_created()                            │
│  • handle_subscription_updated()                            │
│  • handle_subscription_deleted()                            │
│  • handle_payment_succeeded()                               │
│  • handle_payment_failed()                                  │
│                                                             │
│  Database Operations:                                       │
│  • store_webhook_event()                                    │
│  • mark_event_processed()                                   │
│  • update_subscription_status()                             │
│  • log_audit_event()                                        │
└─────────────────────────────────────────────────────────────┘
                                │
    ┌───────────────────────────┴───────────────────────────────┐
    │                                                           │
    ▼                                                           ▼
┌────────────────────────┐                     ┌────────────────────────┐
│  routes.py             │                     │  Database (Supabase)   │
│  ──────────────────    │                     │  ────────────────────  │
│  FastAPI Endpoints:    │◄───────────────────►│  Tables:               │
│                        │                     │  • subscriptions       │
│  POST /create          │                     │  • webhook_events      │
│  POST /update          │                     │  • audit_log           │
│  POST /cancel          │                     │  • api_usage           │
│  GET  /status          │                     │                        │
│  GET  /billing-history │                     │  Indexes:              │
│  POST /webhooks/stripe │                     │  • stripe_customer_id  │
│  GET  /admin/metrics   │                     │  • stripe_event_id     │
│                        │                     │  • user_id             │
│  Dependencies:         │                     │  • created_at          │
│  • get_stripe_handler  │                     │                        │
│  • get_webhook_handler │                     │  Constraints:          │
│  • get_supabase_client │                     │  • Unique event IDs    │
└────────────────────────┘                     │  • Foreign keys        │
                                               │  • Check constraints   │
                                               └────────────────────────┘
```

## Security Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                                  │
└──────────────────────────────────────────────────────────────────────┘

Layer 1: Payment Data Security
────────────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT SIDE                                                    │
│  ───────────                                                    │
│  • Stripe Elements (secure iframe)                              │
│  • Never touches raw card data                                  │
│  • Generates token: pm_xxx                                      │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Payment Token Only
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  SERVER SIDE                                                    │
│  ───────────                                                    │
│  • Receives pm_xxx token only                                   │
│  • NEVER stores card numbers                                    │
│  • NEVER stores CVV                                             │
│  • NEVER stores expiration dates                                │
│  • PCI DSS compliant by design                                  │
└─────────────────────────────────────────────────────────────────┘

Layer 2: API Security
─────────────────────
┌─────────────────────────────────────────────────────────────────┐
│  • API keys stored in environment variables                     │
│  • Keys never committed to version control                      │
│  • Separate test/live keys                                      │
│  • Environment-aware key selection                              │
│  • Keys rotated quarterly                                       │
└─────────────────────────────────────────────────────────────────┘

Layer 3: Webhook Security
─────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│  • HMAC-SHA256 signature verification                           │
│  • Webhook signing secret validation                            │
│  • Timestamp validation (5-minute window)                       │
│  • Idempotency via stripe_event_id                              │
│  • Prevents replay attacks                                      │
│  • Rejects unsigned requests                                    │
└─────────────────────────────────────────────────────────────────┘

Layer 4: Database Security
──────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│  • Row-level security (RLS) policies                            │
│  • Encrypted connections (TLS 1.2+)                             │
│  • Service key for backend only                                 │
│  • No sensitive payment data stored                             │
│  • Complete audit trail (immutable)                             │
└─────────────────────────────────────────────────────────────────┘

Layer 5: Fraud Detection
────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│  • Failed payment attempt tracking                              │
│  • Suspicious pattern detection                                 │
│  • High-value transaction alerts                                │
│  • Geographic anomaly detection                                  │
│  • Automatic flagging and logging                               │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
Request
   │
   ▼
┌──────────────────┐
│  Input Validation│──► Invalid Input ──► 400 Bad Request
└────────┬─────────┘
         │ Valid
         ▼
┌──────────────────┐
│  Authentication  │──► Unauthorized ──► 401 Unauthorized
└────────┬─────────┘
         │ Authenticated
         ▼
┌──────────────────┐
│  Authorization   │──► Forbidden ──► 403 Forbidden
└────────┬─────────┘
         │ Authorized
         ▼
┌──────────────────┐
│  Business Logic  │──► Not Found ──► 404 Not Found
└────────┬─────────┘     │
         │ Valid          └─► Conflict ──► 409 Conflict
         ▼
┌──────────────────┐
│  Stripe API Call │──► Card Declined ──► 400 with reason
└────────┬─────────┘     │
         │ Success        ├─► Network Error ──► 500 (retry)
         │                └─► Rate Limited ──► 429 (backoff)
         ▼
┌──────────────────┐
│  Database Update │──► DB Error ──► 500 (rollback)
└────────┬─────────┘
         │ Success
         ▼
┌──────────────────┐
│  Audit Logging   │──► Log Error ──► Continue
└────────┬─────────┘
         │
         ▼
     Success Response
     (200/201)
```

## Deployment Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT                      │
└────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │  ntf.repazoo.com │
                    │   (Load Balancer)│
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │   Caddy / Nginx  │
                    │  (Reverse Proxy) │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  FastAPI     │ │  FastAPI     │ │  FastAPI     │
    │  Instance 1  │ │  Instance 2  │ │  Instance 3  │
    └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
           │                │                │
           └────────────────┼────────────────┘
                            │
                    ┌───────┴────────┐
                    │   Supabase     │
                    │  (PostgreSQL)  │
                    └────────────────┘

External Services:
─────────────────
    ┌──────────────┐         ┌──────────────┐
    │  Stripe API  │         │  Monitoring  │
    │ stripe.com   │         │  & Logging   │
    └──────────────┘         └──────────────┘
```

---

**Architecture Version**: 1.0.0
**Last Updated**: 2025-10-07
**Status**: Production Ready
