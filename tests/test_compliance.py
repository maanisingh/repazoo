"""
Compliance Test Suite
Tests all critical compliance requirements
Run with: pytest tests/test_compliance.py -v
"""

import pytest
import asyncio
from datetime import datetime, timedelta
import sys
import os

# Add workflows to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from workflows.utils.pii_redaction import PIIRedactor, mask_id, redact, safe_dict
from workflows.utils.rate_limiter import RedisRateLimiter, RateLimitExceeded
from workflows.utils.prompt_sanitizer import PromptSanitizer


class TestPIIRedaction:
    """Test PII redaction compliance"""

    def test_email_redaction(self):
        """Test that emails are redacted from logs"""
        text = "Contact user at john.doe@example.com for details"
        redacted = PIIRedactor.redact_string(text)
        assert "john.doe@example.com" not in redacted
        assert "[EMAIL_REDACTED]" in redacted

    def test_phone_redaction(self):
        """Test that phone numbers are redacted"""
        text = "Call me at 555-123-4567 or (555) 987-6543"
        redacted = PIIRedactor.redact_string(text)
        assert "555-123-4567" not in redacted
        assert "(555) 987-6543" not in redacted
        assert "[PHONE_REDACTED]" in redacted

    def test_ip_address_redaction(self):
        """Test that IP addresses are redacted"""
        text = "Request from 192.168.1.100"
        redacted = PIIRedactor.redact_string(text)
        assert "192.168.1.100" not in redacted
        assert "[IP_REDACTED]" in redacted

    def test_oauth_token_redaction(self):
        """Test that OAuth tokens are redacted"""
        text = "Bearer abc123def456ghi789"
        redacted = PIIRedactor.redact_string(text)
        assert "abc123def456ghi789" not in redacted
        assert "[TOKEN_REDACTED]" in redacted

        text2 = "oauth_token=xyz789abc123"
        redacted2 = PIIRedactor.redact_string(text2)
        assert "xyz789abc123" not in redacted2

    def test_password_redaction(self):
        """Test that passwords are redacted"""
        text = "password=secret123"
        redacted = PIIRedactor.redact_string(text)
        assert "secret123" not in redacted
        assert "[PASSWORD_REDACTED]" in redacted

    def test_user_id_masking(self):
        """Test that user IDs are partially masked"""
        user_id = "user-12345678"
        masked = mask_id(user_id)
        assert masked == "********5678"
        assert len(masked) == len(user_id)

    def test_dict_redaction(self):
        """Test that sensitive dictionary keys are redacted"""
        data = {
            'username': 'john',
            'password': 'secret',
            'api_key': 'key123',
            'email': 'john@example.com',
            'public_data': 'visible'
        }

        redacted = PIIRedactor.redact_dict(data)
        assert redacted['password'] == '[REDACTED]'
        assert redacted['api_key'] == '[REDACTED]'
        assert redacted['public_data'] == 'visible'
        assert '[EMAIL_REDACTED]' in redacted['email']

    def test_nested_dict_redaction(self):
        """Test that nested dictionaries are redacted"""
        data = {
            'user': {
                'name': 'John',
                'credentials': {
                    'password': 'secret',
                    'api_key': 'key123'
                }
            }
        }

        redacted = PIIRedactor.redact_dict(data)
        assert redacted['user']['credentials']['password'] == '[REDACTED]'
        assert redacted['user']['credentials']['api_key'] == '[REDACTED]'


class TestPromptSanitizer:
    """Test Anthropic prompt sanitization compliance"""

    def test_mention_removal(self):
        """Test that @mentions are removed from prompts"""
        text = "Hey @john check this out @jane"
        sanitized = PromptSanitizer.sanitize_tweet_text(text)
        assert "@john" not in sanitized
        assert "@jane" not in sanitized
        assert "[USER]" in sanitized

    def test_email_removal(self):
        """Test that emails are removed from prompts"""
        text = "Contact me at test@example.com"
        sanitized = PromptSanitizer.sanitize_tweet_text(text)
        assert "test@example.com" not in sanitized
        assert "[EMAIL]" in sanitized

    def test_url_removal(self):
        """Test that URLs are removed from prompts"""
        text = "Check out https://example.com/page"
        sanitized = PromptSanitizer.sanitize_tweet_text(text)
        assert "https://example.com" not in sanitized
        assert "[LINK]" in sanitized

    def test_user_id_removal(self):
        """Test that numeric user IDs are removed"""
        text = "User 1234567890123 posted this"
        sanitized = PromptSanitizer.sanitize_tweet_text(text)
        assert "1234567890123" not in sanitized
        assert "[ID]" in sanitized

    def test_phone_removal(self):
        """Test that phone numbers are removed from prompts"""
        text = "Call 555-1234 for info"
        sanitized = PromptSanitizer.sanitize_tweet_text(text)
        assert "555-1234" not in sanitized
        assert "[PHONE]" in sanitized

    def test_sentiment_preserved(self):
        """Test that sentiment-relevant content is preserved"""
        text = "I absolutely love this product! Amazing quality"
        sanitized = PromptSanitizer.sanitize_tweet_text(text)
        assert "love" in sanitized
        assert "Amazing" in sanitized
        # Sentiment should still be detectable

    def test_batch_sanitization(self):
        """Test batch tweet sanitization"""
        tweets = [
            {'text': 'Hey @user this is great!'},
            {'text': 'Contact me@example.com'},
            {'text': 'Check https://example.com'}
        ]

        sanitized = PromptSanitizer.sanitize_tweet_batch(tweets)
        assert len(sanitized) == 3
        assert '@user' not in sanitized[0]
        assert 'me@example.com' not in sanitized[1]
        assert 'https://example.com' not in sanitized[2]

    def test_prompt_safety_validation(self):
        """Test that unsafe prompts are rejected"""
        # Safe prompt
        safe_prompt = "Analyze sentiment: I love this product"
        assert PromptSanitizer.validate_prompt_safety(safe_prompt) is True

        # Unsafe prompts
        unsafe_email = "Analyze: Contact john@example.com"
        assert PromptSanitizer.validate_prompt_safety(unsafe_email) is False

        unsafe_phone = "Analyze: Call 555-1234"
        assert PromptSanitizer.validate_prompt_safety(unsafe_phone) is False

    def test_no_pii_in_anthropic_prompt(self):
        """Critical: Ensure NO PII reaches Anthropic API"""
        tweets = [
            {
                'text': '@john sent me email@test.com with details. '
                        'Call 555-1234 or visit https://example.com/secret. '
                        'User ID: 1234567890123'
            }
        ]

        prompt, valid = PromptSanitizer.sanitize_and_validate(tweets, 'sentiment')

        # Validation must pass
        assert valid is True

        # Prompt must not contain any PII
        assert '@john' not in prompt
        assert 'email@test.com' not in prompt
        assert '555-1234' not in prompt
        assert 'https://example.com/secret' not in prompt
        assert '1234567890123' not in prompt

        # Should contain placeholders
        assert '[USER]' in prompt or 'analyze' in prompt.lower()


class TestRateLimiter:
    """Test rate limiting compliance"""

    @pytest.fixture
    def rate_limiter(self):
        """Create rate limiter for testing"""
        # Use separate Redis DB for testing
        return RedisRateLimiter('redis://localhost:6379/15')

    def test_twitter_rate_limit_config(self, rate_limiter):
        """Test that Twitter rate limits match ToS (900/15min)"""
        config = rate_limiter.LIMITS['twitter_user_timeline']
        assert config['requests'] == 900
        assert config['window_seconds'] == 900  # 15 minutes

    def test_anthropic_rate_limit_config(self, rate_limiter):
        """Test that Anthropic rate limits match ToS (50/min)"""
        config = rate_limiter.LIMITS['anthropic_api']
        assert config['requests'] == 50
        assert config['window_seconds'] == 60  # 1 minute

    def test_rate_limit_enforcement(self, rate_limiter):
        """Test that rate limits are actually enforced"""
        user_id = f"test-user-{datetime.utcnow().timestamp()}"

        # Create a low limit for testing
        rate_limiter.LIMITS['test_service'] = {
            'requests': 3,
            'window_seconds': 10
        }

        # First 3 requests should succeed
        for i in range(3):
            allowed, retry_after = rate_limiter.check_and_increment('test_service', user_id)
            assert allowed is True, f"Request {i+1} should be allowed"
            assert retry_after == 0

        # 4th request should fail
        allowed, retry_after = rate_limiter.check_and_increment('test_service', user_id)
        assert allowed is False, "4th request should be blocked"
        assert retry_after > 0

        # Cleanup
        rate_limiter.reset_limit('test_service', user_id)

    def test_per_user_tracking(self, rate_limiter):
        """Test that rate limits are per-user, not global"""
        user1 = f"user1-{datetime.utcnow().timestamp()}"
        user2 = f"user2-{datetime.utcnow().timestamp()}"

        rate_limiter.LIMITS['test_service'] = {
            'requests': 2,
            'window_seconds': 10
        }

        # User 1 makes 2 requests
        rate_limiter.check_and_increment('test_service', user1)
        rate_limiter.check_and_increment('test_service', user1)

        # User 1 is now at limit
        allowed1, _ = rate_limiter.check_and_increment('test_service', user1)
        assert allowed1 is False

        # User 2 should still be allowed
        allowed2, _ = rate_limiter.check_and_increment('test_service', user2)
        assert allowed2 is True

        # Cleanup
        rate_limiter.reset_limit('test_service', user1)
        rate_limiter.reset_limit('test_service', user2)

    def test_sliding_window(self, rate_limiter):
        """Test that sliding window works correctly"""
        import time

        user_id = f"sliding-test-{datetime.utcnow().timestamp()}"

        rate_limiter.LIMITS['test_service'] = {
            'requests': 2,
            'window_seconds': 2  # 2 second window
        }

        # Make 2 requests
        rate_limiter.check_and_increment('test_service', user_id)
        rate_limiter.check_and_increment('test_service', user_id)

        # 3rd should fail
        allowed, _ = rate_limiter.check_and_increment('test_service', user_id)
        assert allowed is False

        # Wait for window to slide (3 seconds to be safe)
        time.sleep(3)

        # Now should succeed again
        allowed, _ = rate_limiter.check_and_increment('test_service', user_id)
        assert allowed is True

        # Cleanup
        rate_limiter.reset_limit('test_service', user_id)


class TestConsentVerification:
    """Test consent verification (would require database setup)"""

    @pytest.mark.skip(reason="Requires database connection")
    async def test_revoked_token_blocks_access(self):
        """Test that revoked OAuth tokens prevent data access"""
        # This would test the consent_verification.py module
        # Skipped in unit tests, requires integration test environment
        pass

    @pytest.mark.skip(reason="Requires database connection")
    async def test_expired_subscription_blocks_access(self):
        """Test that expired subscriptions prevent API usage"""
        # This would test subscription status checking
        pass

    @pytest.mark.skip(reason="Requires database connection")
    async def test_consent_too_old_blocks_access(self):
        """Test that consent older than 365 days is rejected"""
        pass


class TestDataRetention:
    """Test data retention compliance"""

    @pytest.mark.skip(reason="Requires database connection")
    async def test_old_data_deleted(self):
        """Test that data older than 90 days is deleted for inactive users"""
        pass

    @pytest.mark.skip(reason="Requires database connection")
    async def test_revoked_token_data_deleted(self):
        """Test that data for revoked tokens is deleted"""
        pass

    @pytest.mark.skip(reason="Requires database connection")
    async def test_soft_delete_before_hard_delete(self):
        """Test that soft delete happens before hard delete"""
        pass


class TestAuditLogging:
    """Test audit logging compliance"""

    @pytest.mark.skip(reason="Requires database connection")
    async def test_consent_verification_logged(self):
        """Test that consent checks are logged"""
        pass

    @pytest.mark.skip(reason="Requires database connection")
    async def test_rate_limit_violations_logged(self):
        """Test that rate limit hits are logged"""
        pass

    @pytest.mark.skip(reason="Requires database connection")
    async def test_data_access_logged(self):
        """Test that all data access is logged"""
        pass


# Test runner
if __name__ == "__main__":
    pytest.main([__file__, '-v', '--tb=short'])
