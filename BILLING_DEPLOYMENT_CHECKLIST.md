# Repazoo Stripe Billing - Deployment Checklist

Complete checklist for deploying the Stripe payment gateway integration.

## Pre-Deployment Checklist

### 1. Stripe Account Setup

- [ ] Stripe account created and verified
- [ ] Business details completed in Stripe dashboard
- [ ] Bank account connected for payouts
- [ ] Tax information provided
- [ ] Identity verification completed (for live mode)

### 2. API Keys Configuration

- [ ] Test secret key obtained (`sk_test_...`)
- [ ] Test publishable key obtained (`pk_test_...`)
- [ ] Live secret key obtained (`sk_live_...`)
- [ ] Live publishable key obtained (`pk_live_...`)
- [ ] Keys added to `/root/.repazoo-vault/.env`
- [ ] Keys verified with test API call

### 3. Environment Variables

Add to `/root/.repazoo-vault/.env`:

```bash
# Environment
REPAZOO_ENV=cfy  # or 'ai' for production

# Stripe Test Keys
STRIPE_TEST_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_YOUR_KEY
STRIPE_TEST_WEBHOOK_SECRET=whsec_YOUR_TEST_SECRET

# Stripe Live Keys
STRIPE_LIVE_SECRET_KEY=sk_live_YOUR_KEY
STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_YOUR_KEY
STRIPE_LIVE_WEBHOOK_SECRET=whsec_YOUR_LIVE_SECRET

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key

# Webhook
STRIPE_WEBHOOK_ENDPOINT=https://ntf.repazoo.com/webhooks/stripe
```

- [ ] All variables configured
- [ ] `.env` file permissions set to 600
- [ ] `.env` excluded from version control

### 4. Python Dependencies

- [ ] Python 3.9+ installed
- [ ] Virtual environment created
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] Stripe library version verified: `stripe>=8.0.0`
- [ ] FastAPI installed and working
- [ ] Supabase client installed and configured

### 5. Database Schema

- [ ] `subscriptions` table exists
- [ ] `webhook_events` table exists
- [ ] `audit_log` table exists
- [ ] `api_usage` table exists
- [ ] Indexes created on all tables
- [ ] Foreign key constraints verified
- [ ] Row-level security policies configured

### 6. Stripe Products and Prices

- [ ] Run `python create_stripe_products.py`
- [ ] Basic tier product created ($9/month)
- [ ] Pro tier product created ($29/month)
- [ ] Price IDs copied to `config.py`
- [ ] Products verified in Stripe dashboard
- [ ] Pricing matches requirements

Update `config.py`:
```python
TIER_CONFIG = {
    "basic": TierDefinition(
        ...
        stripe_price_id_cfy="price_test_...",
        stripe_price_id_ai="price_live_...",
    ),
    "pro": TierDefinition(
        ...
        stripe_price_id_cfy="price_test_...",
        stripe_price_id_ai="price_live_...",
    ),
}
```

### 7. Webhook Configuration

**Test Environment**:
- [ ] Webhook endpoint added in test mode dashboard
- [ ] URL set to `https://ntf.repazoo.com/webhooks/stripe`
- [ ] Events selected (5 events)
- [ ] Webhook signing secret obtained
- [ ] Secret added to `.env` as `STRIPE_TEST_WEBHOOK_SECRET`
- [ ] Test webhook sent successfully

**Production Environment**:
- [ ] Webhook endpoint added in live mode dashboard
- [ ] URL verified: `https://ntf.repazoo.com/webhooks/stripe`
- [ ] Same 5 events selected
- [ ] Live webhook signing secret obtained
- [ ] Secret added to `.env` as `STRIPE_LIVE_WEBHOOK_SECRET`
- [ ] Endpoint is publicly accessible

**Events to Select**:
1. `customer.subscription.created`
2. `customer.subscription.updated`
3. `customer.subscription.deleted`
4. `invoice.payment_succeeded`
5. `invoice.payment_failed`

### 8. Application Integration

- [ ] FastAPI app includes billing routes
- [ ] Import statement added: `from billing.routes import router as billing_router`
- [ ] Router mounted: `app.include_router(billing_router)`
- [ ] Supabase client configured in dependency injection
- [ ] Logging configured (file or stdout)
- [ ] CORS configured for frontend

Example `main.py`:
```python
from fastapi import FastAPI
from billing.routes import router as billing_router

app = FastAPI()
app.include_router(billing_router)
```

### 9. Network Configuration

- [ ] Domain `ntf.repazoo.com` resolves correctly
- [ ] SSL/TLS certificate valid and not expired
- [ ] Port 443 (HTTPS) open and accessible
- [ ] Firewall allows Stripe webhook IPs
- [ ] Load balancer configured (if applicable)
- [ ] Reverse proxy configured (Caddy/Nginx)

### 10. Security Hardening

- [ ] API keys stored in secure vault
- [ ] Webhook signature verification enabled
- [ ] HTTPS enforced (no HTTP)
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] SQL injection protection enabled
- [ ] XSS protection headers set
- [ ] CSRF protection configured

## Testing Checklist

### 11. Test Subscription Creation

```bash
# Test with Stripe test card
curl -X POST https://ntf.repazoo.com/api/subscriptions/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "tier": "basic",
    "payment_method_id": "pm_card_visa",
    "email": "test@example.com",
    "trial_period_days": 0
  }'
```

- [ ] Request returns 201 Created
- [ ] Subscription created in database
- [ ] Stripe customer created
- [ ] Stripe subscription created
- [ ] Audit log entry created

### 12. Test Stripe Test Cards

| Card | Expected Result | Tested |
|------|----------------|--------|
| 4242424242424242 | Success | [ ] |
| 4000000000000002 | Decline | [ ] |
| 4000002500003155 | Authentication required | [ ] |
| 4000000000009995 | Insufficient funds | [ ] |

### 13. Test Webhook Events

Using Stripe CLI:
```bash
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

- [ ] `customer.subscription.created` processed
- [ ] `customer.subscription.updated` processed
- [ ] `customer.subscription.deleted` processed
- [ ] `invoice.payment_succeeded` processed
- [ ] `invoice.payment_failed` processed
- [ ] All events stored in `webhook_events` table
- [ ] Idempotency check prevents duplicates
- [ ] Audit logs created for each event

### 14. Test Subscription Operations

- [ ] Create basic tier subscription
- [ ] Upgrade basic to pro tier
- [ ] Downgrade pro to basic tier
- [ ] Cancel subscription (at period end)
- [ ] Cancel subscription (immediately)
- [ ] Reactivate canceled subscription
- [ ] Query subscription status
- [ ] Retrieve billing history

### 15. Test Error Handling

- [ ] Invalid user_id returns 404
- [ ] Invalid tier returns 400
- [ ] Missing payment method returns 400
- [ ] Declined card returns appropriate error
- [ ] Expired card returns appropriate error
- [ ] Network error handled gracefully
- [ ] Database error handled gracefully
- [ ] All errors logged to audit trail

### 16. Test Admin Endpoints

```bash
curl https://ntf.repazoo.com/api/admin/subscriptions/metrics
```

- [ ] Returns subscription metrics
- [ ] Total count correct
- [ ] Tier distribution correct
- [ ] Revenue calculation correct
- [ ] Failed payments count correct

### 17. Test Webhook Security

- [ ] Request without signature rejected
- [ ] Invalid signature rejected
- [ ] Expired timestamp rejected
- [ ] Replay attack prevented (idempotency)
- [ ] Wrong webhook secret rejected

## Monitoring Setup

### 18. Logging Configuration

- [ ] Application logs to `/var/log/repazoo/billing.log`
- [ ] Log rotation configured
- [ ] Log level set appropriately (INFO for production)
- [ ] Sensitive data not logged (card numbers, etc.)
- [ ] Structured logging enabled (JSON)

### 19. Metrics and Alerting

- [ ] Subscription metrics tracked
- [ ] Payment success rate monitored
- [ ] Failed payment alerts configured
- [ ] High-value transaction alerts enabled
- [ ] Webhook processing latency tracked
- [ ] Error rate alerts configured

Alert thresholds:
- Failed payments > 5 in 1 hour
- Webhook processing time > 5 seconds
- Payment success rate < 95%
- High-value transaction ($500+)

### 20. Dashboard Integration

- [ ] Admin panel shows subscription metrics
- [ ] Revenue chart displays MRR
- [ ] Tier distribution chart visible
- [ ] Recent transactions list populated
- [ ] Failed payments list shows errors
- [ ] Webhook status visible

## Production Deployment

### 21. Pre-Production Verification

- [ ] All tests passing in staging environment
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] Documentation reviewed
- [ ] Backup procedures tested
- [ ] Rollback plan prepared

### 22. Deployment Steps

1. **Backup Database**
   ```bash
   pg_dump $SUPABASE_URL > backup_pre_billing_$(date +%Y%m%d).sql
   ```
   - [ ] Database backup completed

2. **Deploy Code**
   ```bash
   git pull origin main
   cd /root/repazoo/backend
   pip install -r billing/requirements.txt
   systemctl restart repazoo-api
   ```
   - [ ] Code deployed
   - [ ] Dependencies installed
   - [ ] Application restarted

3. **Switch to Production Environment**
   ```bash
   export REPAZOO_ENV=ai
   ```
   - [ ] Environment variable updated
   - [ ] Using live Stripe keys
   - [ ] Using live webhook secret

4. **Verify Deployment**
   ```bash
   curl https://ntf.repazoo.com/health
   ```
   - [ ] Health check passes
   - [ ] Application responding
   - [ ] No errors in logs

5. **Create Live Products**
   ```bash
   python create_stripe_products.py
   ```
   - [ ] Live products created
   - [ ] Price IDs updated in config
   - [ ] Products visible in live dashboard

6. **Configure Live Webhooks**
   - [ ] Live webhook endpoint created
   - [ ] Events selected
   - [ ] Signing secret obtained
   - [ ] Secret added to production .env
   - [ ] Test webhook sent and received

### 23. Post-Deployment Verification

- [ ] Create test subscription in production
- [ ] Verify webhook delivery
- [ ] Check database entries
- [ ] Review audit logs
- [ ] Monitor application logs
- [ ] Test subscription cancellation
- [ ] Verify billing history retrieval

### 24. Smoke Tests

- [ ] Homepage loads
- [ ] Subscription page loads
- [ ] Payment form displays
- [ ] Stripe Elements load
- [ ] Subscription creation works
- [ ] Webhook processing works
- [ ] Admin panel shows data

## Go-Live Checklist

### 25. Final Checks

- [ ] All deployment steps completed
- [ ] All tests passing
- [ ] No errors in logs
- [ ] Webhooks processing correctly
- [ ] Monitoring active
- [ ] Alerts configured
- [ ] Documentation updated
- [ ] Team notified

### 26. Customer Communication

- [ ] Pricing page updated
- [ ] Terms of service updated
- [ ] Privacy policy reviewed
- [ ] Subscription FAQ prepared
- [ ] Support team briefed
- [ ] Cancellation policy documented

### 27. Business Operations

- [ ] Payment reconciliation process defined
- [ ] Refund policy documented
- [ ] Chargeback handling procedure
- [ ] Failed payment follow-up process
- [ ] Customer support escalation path
- [ ] Financial reporting setup

## Post-Launch Monitoring

### 28. Week 1 Monitoring

- [ ] Monitor subscription creation rate
- [ ] Track payment success rate
- [ ] Review failed payment reasons
- [ ] Check webhook delivery rate
- [ ] Monitor error logs
- [ ] Review customer feedback

### 29. Week 2-4 Monitoring

- [ ] Calculate churn rate
- [ ] Analyze tier distribution
- [ ] Review MRR growth
- [ ] Identify payment issues
- [ ] Optimize conversion funnel
- [ ] Plan feature enhancements

### 30. Ongoing Maintenance

- [ ] Review metrics weekly
- [ ] Rotate API keys quarterly
- [ ] Update dependencies monthly
- [ ] Security audit quarterly
- [ ] Review pricing annually
- [ ] Update documentation as needed

## Rollback Plan

### If Issues Occur

1. **Immediate Rollback**
   ```bash
   git checkout <previous-commit>
   systemctl restart repazoo-api
   ```

2. **Disable Webhooks**
   - Disable webhook endpoint in Stripe dashboard
   - Prevents new events from processing

3. **Database Rollback**
   ```bash
   psql $SUPABASE_URL < backup_pre_billing_$(date +%Y%m%d).sql
   ```

4. **Notify Users**
   - Email customers about temporary issue
   - Provide timeline for resolution
   - Offer support contact

## Support Resources

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe Support**: support@stripe.com
- **Documentation**: `/root/repazoo/backend/billing/README.md`
- **Webhook Config**: `/root/repazoo/backend/billing/WEBHOOK_CONFIGURATION.md`
- **Quick Start**: `/root/repazoo/backend/billing/QUICK_START.md`

## Sign-Off

### Development Team
- [ ] Code review completed
- [ ] Tests passed
- [ ] Documentation complete

**Signed**: _________________ **Date**: _________

### DevOps Team
- [ ] Deployment completed
- [ ] Monitoring configured
- [ ] Backups verified

**Signed**: _________________ **Date**: _________

### Product Team
- [ ] Features verified
- [ ] User experience approved
- [ ] Pricing confirmed

**Signed**: _________________ **Date**: _________

---

**Deployment Status**: [ ] Ready [ ] In Progress [ ] Complete
**Go-Live Date**: _______________
**Notes**: ________________________________
