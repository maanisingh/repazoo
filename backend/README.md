# Repazoo SaaS Backend

Complete FastAPI backend for Repazoo Twitter Reputation Analysis Platform with OAuth, Stripe billing, and AI integration.

## Overview

The Repazoo backend is a production-ready FastAPI application that provides:

- **Twitter OAuth 2.0 Authentication** with PKCE security
- **Stripe Integration** for subscription management and payments
- **Tier-based API Access** (Basic/Pro) with quota enforcement
- **Rate Limiting** with Redis
- **Comprehensive Middleware** for auth, logging, and error handling
- **Multi-environment Support** (CFY/NTF/AI)
- **Health Checks** for all dependencies
- **OpenAPI Documentation** (Swagger/ReDoc)

## Architecture

```
/root/repazoo/backend/
├── main.py                 # FastAPI application entry point
├── config.py               # Configuration and settings
├── Dockerfile              # Multi-stage Docker build
├── requirements.txt        # Python dependencies
│
├── auth/                   # Twitter OAuth 2.0
│   ├── routes.py          # OAuth endpoints
│   ├── oauth_handler.py   # OAuth flow logic
│   └── models.py          # Pydantic models
│
├── billing/                # Stripe Integration
│   ├── routes.py          # Billing endpoints
│   ├── stripe_handler.py  # Stripe API logic
│   ├── webhook_handler.py # Webhook processing
│   └── config.py          # Tier configuration
│
├── api/                    # Core API Endpoints
│   └── routes.py          # User, usage, analysis endpoints
│
├── database/               # Database Layer
│   └── supabase_client.py # Supabase client and helpers
│
├── middleware/             # Middleware Stack
│   ├── auth_middleware.py # JWT authentication
│   ├── rate_limiter.py    # Redis rate limiting
│   ├── logging_middleware.py # Request/response logging
│   └── error_handler.py   # Error formatting
│
└── tests/                  # Test Suite
    ├── conftest.py        # Pytest fixtures
    ├── test_auth.py       # Authentication tests
    ├── test_billing.py    # Billing tests
    └── test_api.py        # API endpoint tests
```

## Prerequisites

### Required Services

1. **Supabase** (Database)
   - PostgreSQL with RLS policies
   - Service role key for admin operations
   - Anon key for user-authenticated requests

2. **Redis** (Rate Limiting & Caching)
   - Redis 6.0+ or compatible service
   - Connection URL configured

3. **Stripe** (Payments)
   - Stripe account with test/production keys
   - Webhook endpoint configured
   - Products and prices created

4. **Secrets Vault** (Credentials)
   - Located at `/root/.repazoo-vault/`
   - Contains encrypted credentials

### Environment Variables

Create `/root/.repazoo-vault/.env` with:

```bash
# Environment
REPAZOO_ENV=local  # or cfy, ntf, ai
DEBUG=true
LOG_LEVEL=INFO

# Database (Supabase)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...

# Redis
REDIS_URL=redis://localhost:6379/0

# Authentication
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256

# Twitter OAuth
TWITTER_CLIENT_ID=your-client-id
TWITTER_CLIENT_SECRET=your-client-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_BASIC_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-xxx

# Encryption
ENCRYPTION_KEY=your-encryption-key

# Optional: Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
```

## Installation

### Local Development

1. **Clone and navigate to backend:**
   ```bash
   cd /root/repazoo/backend
   ```

2. **Create virtual environment:**
   ```bash
   python3.11 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment:**
   ```bash
   cp .env.example /root/.repazoo-vault/.env
   # Edit .env with your credentials
   ```

5. **Run migrations:**
   ```bash
   # Apply Supabase migrations from /root/repazoo/supabase/migrations/
   ```

6. **Start development server:**
   ```bash
   python main.py
   # or
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

7. **Access API:**
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### Docker Deployment

1. **Build Docker image:**
   ```bash
   docker build -t repazoo-backend:latest -f Dockerfile .
   ```

2. **Run container:**
   ```bash
   docker run -d \
     --name repazoo-api \
     -p 8000:8000 \
     --env-file /root/.repazoo-vault/.env \
     -v /root/.repazoo-vault:/vault:ro \
     repazoo-backend:latest
   ```

3. **Check health:**
   ```bash
   curl http://localhost:8000/healthz
   ```

### Production Deployment (Docker Compose)

Use the production Docker Compose configuration:

```bash
cd /root/repazoo
docker-compose -f docker-compose.production.yml up -d repazoo-api
```

## API Endpoints

### Health Checks

- `GET /` - API root and information
- `GET /healthz` - Basic health check
- `GET /healthz/db` - Database connectivity
- `GET /healthz/redis` - Redis connectivity
- `GET /healthz/vault` - Vault accessibility
- `GET /info` - Deployment information

### Authentication (Twitter OAuth)

- `GET /auth/twitter/login` - Initiate OAuth flow
- `GET /auth/twitter/callback` - OAuth callback handler
- `GET /auth/twitter/status` - Check auth status
- `POST /auth/twitter/revoke` - Disconnect Twitter account
- `POST /auth/twitter/refresh/{account_id}` - Refresh token

### Billing (Stripe)

- `POST /api/subscriptions/create` - Create subscription
- `POST /api/subscriptions/update` - Update tier
- `POST /api/subscriptions/cancel` - Cancel subscription
- `GET /api/subscriptions/status` - Get subscription status
- `GET /api/subscriptions/billing-history` - Get invoices
- `POST /api/webhooks/stripe` - Stripe webhook handler

### Core API

- `GET /api/users/me` - Get current user profile
- `GET /api/usage/quota` - Check API usage quota
- `POST /api/analyze` - Trigger AI analysis
- `GET /api/analyses` - List user's analyses
- `GET /api/analyses/{id}` - Get specific analysis

## Configuration

### Environment Detection

The application automatically detects the environment:

- **LOCAL**: Development on localhost
- **CFY**: Development environment (cfy.repazoo.com)
- **NTF**: Staging environment (ntf.repazoo.com)
- **AI**: Production environment (ai.repazoo.com / repazoo.com)

Set via `REPAZOO_ENV` environment variable.

### Tier Configuration

| Tier  | Price | Monthly Quota | AI Model         |
|-------|-------|---------------|------------------|
| Basic | $9    | 1,000         | Claude 3 Haiku   |
| Pro   | $29   | 10,000        | Claude 3.5 Sonnet|

Configure in `config.py` → `TierLimits` class.

### Rate Limiting

Default limits (configurable in settings):
- **Per minute**: 60 requests
- **Per hour**: 1,000 requests
- **Monthly quota**: Tier-based (1K/10K)

## Testing

### Run All Tests

```bash
pytest
```

### Run Specific Test Suite

```bash
pytest tests/test_auth.py -v
pytest tests/test_billing.py -v
pytest tests/test_api.py -v
```

### Run with Coverage

```bash
pytest --cov=. --cov-report=html
```

### Test Coverage

Current test coverage includes:
- Authentication flow and JWT tokens
- OAuth 2.0 callback handling
- Stripe subscription lifecycle
- API endpoint authorization
- Rate limiting enforcement
- Error handling and formatting

## Monitoring

### Logs

Application logs include:
- Request/response logging
- Performance metrics (response time)
- Error tracking with incident IDs
- Audit logging for sensitive operations

View logs:
```bash
# Docker
docker logs repazoo-api

# Local
tail -f logs/repazoo.log
```

### Metrics

Exposed via:
- Health check endpoints
- Response headers (X-Request-ID, X-Response-Time)
- Rate limit headers (X-RateLimit-*)
- Quota headers (X-Quota-*)

### Error Tracking

Structured error responses with:
- Error code (machine-readable)
- Error message (human-readable)
- Request ID (for tracking)
- Stack trace (debug mode only)

## Security

### Authentication

- **JWT Tokens**: HS256 algorithm with configurable secret
- **Token Expiration**: 30 minutes (access), 7 days (refresh)
- **OAuth PKCE**: Prevents authorization code interception
- **State Validation**: CSRF protection for OAuth flow

### Data Protection

- **Encrypted Tokens**: Twitter tokens encrypted at rest
- **RLS Policies**: Row-level security in Supabase
- **Secrets Vault**: Encrypted credential storage
- **HTTPS Only**: All production traffic encrypted

### Rate Limiting

- **IP-based**: Anonymous requests
- **User-based**: Authenticated requests
- **Quota Enforcement**: Monthly limits per tier
- **Redis Backend**: Distributed rate limiting

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check Supabase URL and keys
   curl $SUPABASE_URL/rest/v1/
   ```

2. **Redis Connection Failed**
   ```bash
   # Check Redis connection
   redis-cli ping
   ```

3. **OAuth Callback 404**
   - Verify callback URL matches Twitter app settings
   - Check domain routing in OAuth handler

4. **Stripe Webhook Failed**
   - Verify webhook secret matches Stripe dashboard
   - Check endpoint is publicly accessible

5. **Rate Limit Errors**
   - Check Redis is running and accessible
   - Verify rate limit configuration

### Debug Mode

Enable debug mode for detailed error messages:

```bash
export DEBUG=true
export LOG_LEVEL=DEBUG
```

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Secrets encrypted in vault
- [ ] Database migrations applied
- [ ] Stripe products and prices created
- [ ] Twitter OAuth app configured
- [ ] Redis instance running

### Production Deployment

- [ ] Set `REPAZOO_ENV=ai`
- [ ] Set `DEBUG=false`
- [ ] Configure HTTPS/SSL
- [ ] Set up domain routing
- [ ] Configure CORS origins
- [ ] Enable monitoring/alerting
- [ ] Test health check endpoints
- [ ] Verify webhook endpoints accessible

### Post-Deployment

- [ ] Monitor error rates
- [ ] Check database connections
- [ ] Verify rate limiting works
- [ ] Test OAuth flow end-to-end
- [ ] Test Stripe webhook delivery
- [ ] Review application logs

## Development

### Code Quality

Format code:
```bash
black .
ruff check .
```

Type checking:
```bash
mypy .
```

### Adding New Endpoints

1. Create route function in appropriate module
2. Add Pydantic models for request/response
3. Add authentication dependency if needed
4. Write tests in `tests/`
5. Update this README with endpoint documentation

### Database Changes

1. Create migration in `/root/repazoo/supabase/migrations/`
2. Test migration locally
3. Update `database/supabase_client.py` if needed
4. Deploy migration to environments (CFY → NTF → AI)

## Support

For issues and questions:
- Review logs for error details
- Check health endpoints for service status
- Verify environment configuration
- Test with Swagger UI at `/docs`

## License

Proprietary - Repazoo SaaS Platform
