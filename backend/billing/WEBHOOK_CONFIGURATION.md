# Stripe Webhook Configuration Guide

Complete guide for configuring Stripe webhooks for the Repazoo billing system.

## Webhook Endpoint

**Production URL**: `https://ntf.repazoo.com/webhooks/stripe`
**Local Development**: `http://localhost:8000/webhooks/stripe`

## Configuration Steps

### Production Setup (AI Environment)

1. **Login to Stripe Dashboard**
   - Go to: https://dashboard.stripe.com/webhooks
   - Switch to "Live mode" (toggle in left sidebar)

2. **Add Endpoint**
   - Click "Add endpoint" button
   - Enter endpoint URL: `https://ntf.repazoo.com/webhooks/stripe`
   - Select API version: `Latest` (or specific version)
   - Description: `Repazoo Production Billing Webhooks`

3. **Select Events**
   Select these events (or use "Select all customer.subscription events" and "Select all invoice events"):

   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. **Save and Get Signing Secret**
   - Click "Add endpoint"
   - Click on the newly created endpoint
   - Click "Reveal signing secret"
   - Copy the secret (starts with `whsec_`)

5. **Add to Environment**
   ```bash
   cd /root/.repazoo-vault
   ./scripts/vault-add-secret.sh stripe STRIPE_LIVE_WEBHOOK_SECRET "whsec_YOUR_SECRET"
   ```

   Or add directly to `.env`:
   ```bash
   STRIPE_LIVE_WEBHOOK_SECRET=whsec_YOUR_SECRET
   ```

### Test Setup (CFY Environment)

1. **Login to Stripe Dashboard**
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Ensure "Test mode" is selected

2. **Add Test Endpoint**
   - Click "Add endpoint"
   - Enter endpoint URL: `https://ntf.repazoo.com/webhooks/stripe`
   - Select same events as production
   - Description: `Repazoo Test Billing Webhooks`

3. **Get Test Signing Secret**
   - Click on endpoint
   - Reveal and copy signing secret
   - Add to `.env`:
     ```bash
     STRIPE_TEST_WEBHOOK_SECRET=whsec_YOUR_TEST_SECRET
     ```

### Local Development with Stripe CLI

1. **Install Stripe CLI**

   **macOS**:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

   **Linux**:
   ```bash
   wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_X.XX.X_linux_x86_64.tar.gz
   tar -xvf stripe_*.tar.gz
   sudo mv stripe /usr/local/bin/
   ```

   **Windows**:
   Download from: https://github.com/stripe/stripe-cli/releases

2. **Login to Stripe**
   ```bash
   stripe login
   ```

   This opens browser for authentication.

3. **Forward Webhooks**
   ```bash
   stripe listen --forward-to localhost:8000/webhooks/stripe
   ```

   Output will show:
   ```
   Ready! Your webhook signing secret is whsec_abc123... (^C to quit)
   ```

4. **Copy Signing Secret**
   Add to `.env`:
   ```bash
   STRIPE_TEST_WEBHOOK_SECRET=whsec_abc123...
   ```

5. **Keep CLI Running**
   Keep the terminal open while developing. Webhooks will be forwarded to your local server.

## Verify Webhook Configuration

### Test Webhook Delivery

1. **Using Stripe Dashboard**
   - Go to your webhook endpoint in dashboard
   - Click "Send test webhook"
   - Select event type: `customer.subscription.created`
   - Click "Send test webhook"
   - Check response status (should be 200 OK)

2. **Using Stripe CLI**
   ```bash
   # Trigger specific event
   stripe trigger customer.subscription.created
   stripe trigger invoice.payment_succeeded
   stripe trigger invoice.payment_failed

   # Watch webhook events
   stripe listen
   ```

3. **Check Application Logs**
   ```bash
   # Check logs for webhook processing
   tail -f /var/log/repazoo/billing.log | grep "Webhook"

   # Or check with journalctl
   journalctl -u repazoo-api -f | grep "webhook"
   ```

4. **Verify Database**
   ```sql
   -- Check webhook_events table
   SELECT
     event_type,
     stripe_event_id,
     processed,
     created_at
   FROM webhook_events
   ORDER BY created_at DESC
   LIMIT 10;
   ```

## Webhook Security

### Signature Verification

The webhook handler automatically verifies signatures using:

```python
stripe.Webhook.construct_event(
    payload,
    signature_header,
    webhook_secret
)
```

**Never disable signature verification in production!**

### Best Practices

1. **Use HTTPS Only**
   - Production webhooks must use HTTPS
   - Self-signed certificates not supported by Stripe

2. **Verify Every Request**
   - Check `Stripe-Signature` header exists
   - Validate signature before processing
   - Reject unsigned requests

3. **Idempotent Processing**
   - Check `stripe_event_id` in database
   - Skip already-processed events
   - Use database transactions

4. **Return 200 Quickly**
   - Process webhook in background if needed
   - Return 200 within 5 seconds
   - Log errors but don't throw

5. **Handle Retries**
   - Stripe retries failed webhooks (status != 200)
   - Maximum retry attempts: varies by event
   - Exponential backoff between retries

## Webhook Event Flow

```
Stripe System
    ↓
    POST https://ntf.repazoo.com/webhooks/stripe
    Headers:
      - Stripe-Signature: t=123,v1=abc...
      - Content-Type: application/json
    Body:
      {
        "id": "evt_...",
        "type": "customer.subscription.created",
        "data": { ... }
      }
    ↓
Repazoo Webhook Handler
    1. Verify signature (HMAC-SHA256)
    2. Check idempotency (stripe_event_id)
    3. Store event (webhook_events table)
    4. Route to handler (subscription/payment)
    5. Update database (subscriptions table)
    6. Log audit trail (audit_log table)
    7. Return 200 OK
    ↓
Stripe marks webhook as delivered
```

## Troubleshooting

### Webhook Signature Verification Fails

**Symptoms**:
```
ERROR: Webhook signature verification failed
```

**Solutions**:
1. Check signing secret matches dashboard
2. Verify environment (test vs live) is correct
3. Ensure raw request body is used (not parsed JSON)
4. Check for middleware modifying requests
5. Verify timestamp is within 5 minutes

### Webhook Not Received

**Symptoms**:
- Events happening in Stripe but not processed
- No entries in `webhook_events` table

**Solutions**:
1. Check webhook endpoint is publicly accessible
2. Verify URL in Stripe dashboard is correct
3. Check firewall rules allow Stripe IPs
4. Ensure application is running
5. Check logs for errors

### Webhook Processed Multiple Times

**Symptoms**:
- Duplicate database entries
- Same event_id processed multiple times

**Solutions**:
1. Verify idempotency check is working
2. Check `stripe_event_id` unique constraint
3. Use database transactions
4. Return 200 quickly to prevent retries

### High Latency / Timeouts

**Symptoms**:
```
ERROR: Webhook processing timeout
```

**Solutions**:
1. Move heavy processing to background jobs
2. Return 200 immediately, process async
3. Optimize database queries
4. Check Supabase connection pool
5. Monitor database performance

## Monitoring Webhooks

### Dashboard Metrics

Check in Stripe dashboard:
- Webhook delivery success rate
- Average response time
- Failed deliveries
- Retry attempts

### Application Metrics

Monitor in your application:
```sql
-- Success rate
SELECT
  event_type,
  COUNT(*) as total,
  SUM(CASE WHEN processed = true THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN processed = true THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type;

-- Processing time
SELECT
  event_type,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_seconds
FROM webhook_events
WHERE processed = true
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type;

-- Recent failures
SELECT
  stripe_event_id,
  event_type,
  error,
  created_at
FROM webhook_events
WHERE processed = false
ORDER BY created_at DESC
LIMIT 10;
```

### Set Up Alerts

Configure alerts for:
- Webhook success rate < 95%
- Processing time > 5 seconds
- Failed webhooks > 5 in 1 hour
- Any webhook with status != 200

## Testing Checklist

Before going to production:

- [ ] Webhook endpoint is publicly accessible
- [ ] HTTPS certificate is valid
- [ ] Signing secret is configured correctly
- [ ] All 5 event types are selected
- [ ] Test webhook delivery succeeds
- [ ] Signature verification passes
- [ ] Events are stored in database
- [ ] Subscription updates work correctly
- [ ] Payment success/failure handled
- [ ] Idempotency check prevents duplicates
- [ ] Error handling logs failures
- [ ] Monitoring and alerts configured

## Support

For issues:
1. Check webhook dashboard: https://dashboard.stripe.com/webhooks
2. Review application logs
3. Check `webhook_events` table
4. Test with Stripe CLI
5. Verify signing secret

For Stripe support:
- Email: support@stripe.com
- Documentation: https://stripe.com/docs/webhooks
- Community: https://github.com/stripe

---

**Configuration Complete**: ✓
**Webhook URL**: https://ntf.repazoo.com/webhooks/stripe
**Events Handled**: 5 (subscription + payment events)
**Security**: Signature verification enabled
**Idempotency**: Enabled via stripe_event_id
