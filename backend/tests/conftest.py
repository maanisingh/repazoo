"""
Pytest Configuration and Fixtures
Shared test fixtures for Repazoo backend tests
"""

import pytest
import asyncio
from typing import Generator
from fastapi.testclient import TestClient

# Import the application
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app
from config import settings
from database import db
from middleware import create_access_token


# ============================================================================
# Pytest Configuration
# ============================================================================

def pytest_configure(config):
    """Configure pytest"""
    # Set test environment
    import os
    os.environ["REPAZOO_ENV"] = "local"
    os.environ["DEBUG"] = "true"


# ============================================================================
# Event Loop Fixture
# ============================================================================

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ============================================================================
# Test Client Fixture
# ============================================================================

@pytest.fixture(scope="module")
def client() -> Generator:
    """
    Create test client for API testing

    Usage:
        def test_endpoint(client):
            response = client.get("/api/users/me")
            assert response.status_code == 200
    """
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="module")
def authenticated_client(client, test_user_token) -> Generator:
    """
    Create authenticated test client

    Usage:
        def test_protected_endpoint(authenticated_client):
            response = authenticated_client.get("/api/users/me")
            assert response.status_code == 200
    """
    client.headers = {
        **client.headers,
        "Authorization": f"Bearer {test_user_token}"
    }
    yield client


# ============================================================================
# Database Fixtures
# ============================================================================

@pytest.fixture(scope="function")
def db_client():
    """
    Get database client for testing

    Usage:
        def test_database(db_client):
            user = db_client.get_user(user_id)
            assert user is not None
    """
    return db


# ============================================================================
# User Fixtures
# ============================================================================

@pytest.fixture(scope="session")
def test_user_id() -> str:
    """Test user ID"""
    return "test-user-12345"


@pytest.fixture(scope="session")
def test_user_email() -> str:
    """Test user email"""
    return "test@repazoo.com"


@pytest.fixture(scope="session")
def test_user_token(test_user_id, test_user_email) -> str:
    """
    Create test JWT token

    Usage:
        def test_auth(test_user_token):
            headers = {"Authorization": f"Bearer {test_user_token}"}
            response = client.get("/api/users/me", headers=headers)
    """
    return create_access_token(
        user_id=test_user_id,
        email=test_user_email,
        expires_minutes=60
    )


@pytest.fixture(scope="function")
def test_user_data(test_user_id, test_user_email) -> dict:
    """
    Test user data dictionary

    Usage:
        def test_create_user(test_user_data):
            user = db.create_user(test_user_data)
    """
    return {
        "id": test_user_id,
        "email": test_user_email,
        "full_name": "Test User",
        "is_active": True,
    }


# ============================================================================
# Subscription Fixtures
# ============================================================================

@pytest.fixture(scope="function")
def test_subscription_data(test_user_id) -> dict:
    """
    Test subscription data

    Usage:
        def test_subscription(test_subscription_data):
            subscription = db.create_subscription(test_subscription_data)
    """
    from datetime import datetime, timezone, timedelta

    now = datetime.now(timezone.utc)
    period_end = now + timedelta(days=30)

    return {
        "user_id": test_user_id,
        "stripe_customer_id": "cus_test12345",
        "stripe_subscription_id": "sub_test12345",
        "tier": "basic",
        "status": "active",
        "current_period_start": now.isoformat(),
        "current_period_end": period_end.isoformat(),
        "cancel_at_period_end": False,
    }


# ============================================================================
# Twitter Account Fixtures
# ============================================================================

@pytest.fixture(scope="function")
def test_twitter_account_data(test_user_id) -> dict:
    """
    Test Twitter account data

    Usage:
        def test_twitter_connection(test_twitter_account_data):
            # Test Twitter account operations
    """
    return {
        "user_id": test_user_id,
        "twitter_user_id": "123456789",
        "twitter_username": "testuser",
        "token_expires_at": "2025-12-31T23:59:59Z",
        "scopes": ["tweet.read", "users.read", "offline.access"],
        "is_active": True,
    }


# ============================================================================
# Mock Fixtures
# ============================================================================

@pytest.fixture
def mock_stripe_customer():
    """Mock Stripe customer object"""
    return {
        "id": "cus_test12345",
        "email": "test@repazoo.com",
        "created": 1234567890,
        "metadata": {
            "user_id": "test-user-12345"
        }
    }


@pytest.fixture
def mock_stripe_subscription():
    """Mock Stripe subscription object"""
    import time
    from datetime import datetime, timedelta

    now = datetime.now()
    period_end = now + timedelta(days=30)

    return {
        "id": "sub_test12345",
        "customer": "cus_test12345",
        "status": "active",
        "current_period_start": int(now.timestamp()),
        "current_period_end": int(period_end.timestamp()),
        "items": {
            "data": [{
                "price": {
                    "id": "price_basic",
                    "unit_amount": 900,
                    "currency": "usd",
                }
            }]
        }
    }


@pytest.fixture
def mock_twitter_user():
    """Mock Twitter user data"""
    return {
        "id": "123456789",
        "username": "testuser",
        "name": "Test User",
        "profile_image_url": "https://example.com/avatar.jpg",
        "verified": False,
    }


# ============================================================================
# Cleanup Fixtures
# ============================================================================

@pytest.fixture(scope="function", autouse=True)
def cleanup():
    """
    Cleanup after each test
    Runs automatically after every test function
    """
    yield
    # Cleanup code here (if needed)
    # Example: Delete test records from database
    pass


# ============================================================================
# Helper Functions
# ============================================================================

@pytest.fixture
def assert_valid_response():
    """
    Helper to assert valid API response format

    Usage:
        def test_api(client, assert_valid_response):
            response = client.get("/api/endpoint")
            assert_valid_response(response, 200)
    """
    def _assert(response, expected_status=200):
        assert response.status_code == expected_status
        if expected_status < 400:
            assert response.json() is not None
        return response.json()

    return _assert


@pytest.fixture
def assert_error_response():
    """
    Helper to assert error response format

    Usage:
        def test_error(client, assert_error_response):
            response = client.get("/api/invalid")
            assert_error_response(response, 404, "NOT_FOUND")
    """
    def _assert(response, expected_status, expected_code=None):
        assert response.status_code == expected_status
        data = response.json()
        assert "error" in data
        if expected_code:
            assert data["error"]["code"] == expected_code
        return data

    return _assert
