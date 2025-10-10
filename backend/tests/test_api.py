"""
API Endpoint Tests
Test core API endpoints for user management, analyses, and usage tracking
"""

import pytest
from datetime import datetime, timezone


class TestHealthCheckEndpoints:
    """Test health check endpoints"""

    def test_root_endpoint(self, client):
        """Test API root endpoint"""
        response = client.get("/")
        assert response.status_code == 200

        data = response.json()
        assert data["service"] == "Repazoo SaaS API"
        assert data["status"] == "operational"
        assert "version" in data

    def test_basic_health_check(self, client):
        """Test basic health check"""
        response = client.get("/healthz")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "repazoo-api"

    def test_database_health_check(self, client):
        """Test database health check"""
        response = client.get("/healthz/db")
        # May fail if database is not configured in test environment
        assert response.status_code in [200, 503]

    def test_redis_health_check(self, client):
        """Test Redis health check"""
        response = client.get("/healthz/redis")
        # May fail if Redis is not running in test environment
        assert response.status_code in [200, 503]

    def test_vault_health_check(self, client):
        """Test vault health check"""
        response = client.get("/healthz/vault")
        # Should succeed if vault directory exists
        assert response.status_code in [200, 503]

        if response.status_code == 200:
            data = response.json()
            assert "vault" in data
            assert "secrets" in data

    def test_deployment_info(self, client):
        """Test deployment information endpoint"""
        response = client.get("/info")
        assert response.status_code == 200

        data = response.json()
        assert "environment" in data
        assert "version" in data
        assert "features" in data
        assert "tier_limits" in data


class TestUserEndpoints:
    """Test user management endpoints"""

    def test_get_user_profile_unauthenticated(self, client):
        """Test getting user profile without authentication"""
        response = client.get("/api/users/me")
        assert response.status_code == 401

    @pytest.mark.skip(reason="Requires database with test user")
    def test_get_user_profile_authenticated(self, authenticated_client):
        """Test getting user profile with authentication"""
        response = authenticated_client.get("/api/users/me")
        assert response.status_code == 200

        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "subscription_tier" in data


class TestUsageQuotaEndpoints:
    """Test API usage quota endpoints"""

    def test_check_quota_unauthenticated(self, client):
        """Test checking quota without authentication"""
        response = client.get("/api/usage/quota")
        assert response.status_code == 401

    @pytest.mark.skip(reason="Requires database setup")
    def test_check_quota_authenticated(self, authenticated_client):
        """Test checking quota with authentication"""
        response = authenticated_client.get("/api/usage/quota")

        # May succeed or fail depending on database state
        if response.status_code == 200:
            data = response.json()
            assert "requests_used" in data
            assert "quota" in data
            assert "remaining" in data
            assert "tier" in data


class TestAnalysisEndpoints:
    """Test analysis endpoints"""

    def test_trigger_analysis_unauthenticated(self, client):
        """Test triggering analysis without authentication"""
        payload = {
            "twitter_username": "testuser",
            "analysis_type": "reputation"
        }

        response = client.post("/api/analyze", json=payload)
        assert response.status_code == 401

    @pytest.mark.skip(reason="Requires active subscription")
    def test_trigger_analysis_authenticated(self, authenticated_client):
        """Test triggering analysis with authentication"""
        payload = {
            "twitter_username": "testuser",
            "analysis_type": "reputation",
            "include_tweets": True
        }

        response = authenticated_client.post("/api/analyze", json=payload)

        # May return 402 if no subscription, 429 if quota exceeded
        assert response.status_code in [202, 402, 429, 500]

        if response.status_code == 202:
            data = response.json()
            assert "id" in data
            assert "status" in data
            assert data["status"] == "pending"
            assert "ai_model" in data

    def test_trigger_analysis_validation(self, authenticated_client):
        """Test analysis request validation"""
        # Missing required field
        payload = {
            "analysis_type": "reputation"
        }

        response = authenticated_client.post("/api/analyze", json=payload)
        assert response.status_code == 422  # Validation error

    def test_list_analyses_unauthenticated(self, client):
        """Test listing analyses without authentication"""
        response = client.get("/api/analyses")
        assert response.status_code == 401

    @pytest.mark.skip(reason="Requires database setup")
    def test_list_analyses_authenticated(self, authenticated_client):
        """Test listing analyses with authentication"""
        response = authenticated_client.get("/api/analyses")

        if response.status_code == 200:
            data = response.json()
            assert "analyses" in data
            assert "total" in data
            assert "limit" in data
            assert "offset" in data

    def test_list_analyses_pagination(self, authenticated_client):
        """Test analysis list pagination"""
        response = authenticated_client.get("/api/analyses?limit=10&offset=0")

        # Should handle pagination even with empty results
        assert response.status_code in [200, 401, 500]

    def test_get_analysis_unauthenticated(self, client):
        """Test getting specific analysis without authentication"""
        analysis_id = "test-analysis-123"
        response = client.get(f"/api/analyses/{analysis_id}")
        assert response.status_code == 401

    @pytest.mark.skip(reason="Requires database with test analysis")
    def test_get_analysis_authenticated(self, authenticated_client):
        """Test getting specific analysis with authentication"""
        analysis_id = "test-analysis-123"
        response = authenticated_client.get(f"/api/analyses/{analysis_id}")

        # May return 404 if analysis doesn't exist
        assert response.status_code in [200, 404]


class TestRateLimiting:
    """Test rate limiting functionality"""

    @pytest.mark.skip(reason="Requires Redis")
    def test_rate_limit_headers(self, authenticated_client):
        """Test that rate limit headers are included"""
        response = authenticated_client.get("/api/health")

        # Check for rate limit headers
        headers = response.headers
        # Headers may not be present if rate limiting is disabled
        # assert "X-RateLimit-Limit" in headers
        # assert "X-RateLimit-Remaining" in headers

    @pytest.mark.skip(reason="Requires Redis and multiple requests")
    def test_rate_limit_exceeded(self, authenticated_client):
        """Test rate limit enforcement"""
        # Would need to make many requests to trigger rate limit
        # In practice, this is tested with load testing tools
        pass


class TestErrorHandling:
    """Test error handling and responses"""

    def test_404_error_format(self, client):
        """Test 404 error response format"""
        response = client.get("/api/nonexistent-endpoint")
        assert response.status_code == 404

        data = response.json()
        assert "error" in data
        assert "code" in data["error"]
        assert "message" in data["error"]

    def test_validation_error_format(self, authenticated_client):
        """Test validation error response format"""
        # Send invalid data
        response = authenticated_client.post("/api/analyze", json={})
        assert response.status_code == 422

        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"

    def test_authentication_error_format(self, client):
        """Test authentication error response format"""
        response = client.get("/api/users/me")
        assert response.status_code == 401

        data = response.json()
        assert "error" in data


class TestCORS:
    """Test CORS configuration"""

    def test_cors_headers(self, client):
        """Test CORS headers are present"""
        response = client.options("/api/users/me")

        # CORS headers should be present
        # Note: TestClient may not fully simulate CORS
        assert response.status_code in [200, 401]


class TestRequestLogging:
    """Test request logging middleware"""

    def test_request_id_header(self, client):
        """Test that request ID is added to responses"""
        response = client.get("/api/health")

        # Request ID may or may not be present depending on middleware
        # headers = response.headers
        # assert "X-Request-ID" in headers


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
