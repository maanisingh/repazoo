# ============================================================================
# Repazoo Backend - Multi-Stage Docker Build
# ============================================================================

# ============================================================================
# Stage 1: Base Python Image
# ============================================================================
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create app user for security
RUN useradd -m -u 1000 -s /bin/bash appuser

WORKDIR /app


# ============================================================================
# Stage 2: Dependencies
# ============================================================================
FROM base AS dependencies

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install additional production dependencies
RUN pip install --no-cache-dir \
    gunicorn==21.2.0 \
    redis==5.0.1


# ============================================================================
# Stage 3: Application
# ============================================================================
FROM dependencies AS application

# Copy application code
COPY --chown=appuser:appuser . /app/

# Create necessary directories
RUN mkdir -p /app/logs && chown -R appuser:appuser /app/logs

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/healthz || exit 1

# Default command (can be overridden)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]


# ============================================================================
# Stage 4: Production (Final)
# ============================================================================
FROM application AS production

ENV REPAZOO_ENV=production \
    LOG_LEVEL=INFO \
    WORKERS=4

# Use gunicorn for production with uvicorn workers
CMD ["gunicorn", "main:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "4", \
     "--bind", "0.0.0.0:8000", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]


# ============================================================================
# Stage 5: Development
# ============================================================================
FROM application AS development

ENV REPAZOO_ENV=local \
    LOG_LEVEL=DEBUG

# Install development dependencies
USER root
RUN pip install --no-cache-dir \
    pytest==7.4.3 \
    pytest-asyncio==0.21.1 \
    pytest-cov==4.1.0 \
    black==23.12.1 \
    ruff==0.1.9 \
    ipython==8.19.0

USER appuser

# Development server with hot reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--log-level", "debug"]
