"""
Repazoo SaaS Backend - FastAPI Application
Complete integration with auth, billing, API, middleware, and monitoring
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from config import settings, get_environment
from database import db

# Import routers
from auth.routes import router as auth_router
from billing.routes import router as billing_router
from api.routes import router as api_router
from api.mentions import router as mentions_router

# Import middleware
from middleware import (
    AuthMiddleware,
    RateLimitMiddleware,
    LoggingMiddleware,
    rate_limiter,
    startup_rate_limiter,
    shutdown_rate_limiter,
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
    quota_exceeded_handler,
    invalid_subscription_handler,
    twitter_api_error_handler,
    stripe_error_handler,
    QuotaExceededError,
    InvalidSubscriptionError,
    TwitterAPIError,
    StripeError,
)


# ============================================================================
# Logging Configuration
# ============================================================================

logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger(__name__)


# ============================================================================
# Lifespan Management
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan management
    Handle startup and shutdown events
    """
    # Startup
    logger.info("=" * 80)
    logger.info(f"Starting Repazoo Backend - Environment: {settings.environment.value}")
    logger.info("=" * 80)

    # Initialize rate limiter
    await startup_rate_limiter()
    logger.info("Rate limiter initialized")

    # Check database connection
    if db.health_check():
        logger.info("Database connection verified")
    else:
        logger.warning("Database connection check failed")

    # Log configuration
    logger.info(f"CORS origins: {settings.cors_origins}")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"Rate limits: {settings.rate_limit_per_minute}/min, {settings.rate_limit_per_hour}/hour")

    yield

    # Shutdown
    logger.info("=" * 80)
    logger.info("Shutting down Repazoo Backend")
    logger.info("=" * 80)

    # Cleanup rate limiter
    await shutdown_rate_limiter()
    logger.info("Rate limiter shutdown complete")


# ============================================================================
# Create FastAPI Application
# ============================================================================

app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=settings.api_version,
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,  # Disable docs in production
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
    debug=settings.debug,
)


# ============================================================================
# Exception Handlers
# ============================================================================

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(QuotaExceededError, quota_exceeded_handler)
app.add_exception_handler(InvalidSubscriptionError, invalid_subscription_handler)
app.add_exception_handler(TwitterAPIError, twitter_api_error_handler)
app.add_exception_handler(StripeError, stripe_error_handler)
app.add_exception_handler(Exception, generic_exception_handler)


# ============================================================================
# Middleware
# ============================================================================

# CORS Middleware (must be first)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)

# Custom Middleware (order matters - last added = first executed)
app.add_middleware(LoggingMiddleware)  # Log all requests
app.add_middleware(RateLimitMiddleware, rate_limiter=rate_limiter)  # Rate limiting
app.add_middleware(AuthMiddleware)  # Authentication


# ============================================================================
# Routers
# ============================================================================

# Include all routers
app.include_router(auth_router)
app.include_router(billing_router)
app.include_router(api_router)
app.include_router(mentions_router)

logger.info("All routers registered")


# ============================================================================
# Root & Health Check Endpoints
# ============================================================================

@app.get(
    "/",
    tags=["root"],
    summary="API root",
    description="Get API information and status"
)
async def root():
    """API root endpoint"""
    return {
        "service": settings.api_title,
        "version": settings.api_version,
        "environment": settings.environment.value,
        "status": "operational",
        "documentation": "/docs" if not settings.is_production else None,
        "health_check": "/healthz"
    }


@app.get(
    "/healthz",
    tags=["health"],
    summary="Basic health check",
    description="Check if API is running"
)
async def health_check():
    """Basic health check for load balancers"""
    return {
        "status": "healthy",
        "service": "repazoo-api",
        "version": settings.api_version,
        "environment": settings.environment.value
    }


@app.get(
    "/healthz/db",
    tags=["health"],
    summary="Database health check",
    description="Check database connectivity"
)
async def health_check_database():
    """Database health check"""
    try:
        healthy = db.health_check()
        if healthy:
            return {
                "status": "healthy",
                "database": "connected",
                "provider": "supabase"
            }
        else:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "status": "unhealthy",
                    "database": "disconnected",
                    "provider": "supabase"
                }
            )
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "database": "error",
                "error": str(e)
            }
        )


@app.get(
    "/healthz/redis",
    tags=["health"],
    summary="Redis health check",
    description="Check Redis connectivity for rate limiting"
)
async def health_check_redis():
    """Redis health check"""
    try:
        # Try to connect to Redis
        await rate_limiter.connect()
        is_limited, info = await rate_limiter.is_rate_limited(
            key="healthcheck",
            limit=1000,
            window_seconds=60
        )

        return {
            "status": "healthy",
            "redis": "connected",
            "url": settings.redis_url.split("@")[-1]  # Hide credentials
        }
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "redis": "disconnected",
                "error": str(e)
            }
        )


@app.get(
    "/healthz/vault",
    tags=["health"],
    summary="Vault accessibility check",
    description="Check if secrets vault is accessible"
)
async def health_check_vault():
    """Vault health check"""
    try:
        from pathlib import Path
        vault_path = Path("/root/.repazoo-vault")

        if vault_path.exists() and vault_path.is_dir():
            # Check if critical secrets exist
            secrets_path = vault_path / "secrets"
            has_supabase = (secrets_path / "supabase-credentials.json.age").exists()
            has_stripe = (secrets_path / "stripe-credentials.json.age").exists()
            has_twitter = (secrets_path / "twitter-credentials.json.age").exists()

            return {
                "status": "healthy",
                "vault": "accessible",
                "path": str(vault_path),
                "secrets": {
                    "supabase": has_supabase,
                    "stripe": has_stripe,
                    "twitter": has_twitter
                }
            }
        else:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "status": "unhealthy",
                    "vault": "not_found",
                    "path": str(vault_path)
                }
            )
    except Exception as e:
        logger.error(f"Vault health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "vault": "error",
                "error": str(e)
            }
        )


# ============================================================================
# Deployment Information Endpoint
# ============================================================================

@app.get(
    "/info",
    tags=["root"],
    summary="Deployment information",
    description="Get deployment and environment information"
)
async def deployment_info():
    """Get deployment information"""
    return {
        "environment": settings.environment.value,
        "version": settings.api_version,
        "debug": settings.debug,
        "is_production": settings.is_production,
        "is_staging": settings.is_staging,
        "is_development": settings.is_development,
        "features": {
            "request_logging": settings.enable_request_logging,
            "performance_monitoring": settings.enable_performance_monitoring,
            "rate_limiting": True,
            "authentication": True,
        },
        "tier_limits": {
            "basic": {
                "monthly_quota": settings.basic_tier_monthly_quota,
                "ai_model": settings.anthropic_haiku_model,
            },
            "pro": {
                "monthly_quota": settings.pro_tier_monthly_quota,
                "ai_model": settings.anthropic_sonnet_model,
            }
        }
    }


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    # Development server configuration
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
        access_log=True,
    )
