"""
PII Redaction Utilities for Compliance
Sanitizes logs, error messages, and data before storage/transmission
Compliance: GDPR Article 5, CCPA Section 1798.140
"""

import re
from typing import Any, Dict, Optional
import json


class PIIRedactor:
    """Redacts personally identifiable information from strings and objects"""

    # Regex patterns for PII detection
    EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
    PHONE_PATTERN = re.compile(r'\b(?:\+?1[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b')
    IP_PATTERN = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
    CREDIT_CARD_PATTERN = re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b')
    SSN_PATTERN = re.compile(r'\b\d{3}-\d{2}-\d{4}\b')

    # OAuth token patterns (Bearer tokens, OAuth 2.0)
    TOKEN_PATTERNS = [
        re.compile(r'Bearer\s+[A-Za-z0-9\-._~+/]+=*', re.IGNORECASE),
        re.compile(r'oauth_token["\']?\s*[:=]\s*["\']?([A-Za-z0-9\-._~+/]+)', re.IGNORECASE),
        re.compile(r'access_token["\']?\s*[:=]\s*["\']?([A-Za-z0-9\-._~+/]+)', re.IGNORECASE),
        re.compile(r'refresh_token["\']?\s*[:=]\s*["\']?([A-Za-z0-9\-._~+/]+)', re.IGNORECASE),
        re.compile(r'api[_-]?key["\']?\s*[:=]\s*["\']?([A-Za-z0-9\-._~+/]+)', re.IGNORECASE),
    ]

    # Password patterns
    PASSWORD_PATTERNS = [
        re.compile(r'password["\']?\s*[:=]\s*["\']?([^\s"\']+)', re.IGNORECASE),
        re.compile(r'passwd["\']?\s*[:=]\s*["\']?([^\s"\']+)', re.IGNORECASE),
        re.compile(r'pwd["\']?\s*[:=]\s*["\']?([^\s"\']+)', re.IGNORECASE),
    ]

    @staticmethod
    def redact_string(text: str, preserve_length: bool = False) -> str:
        """
        Redact PII from a string

        Args:
            text: Input text to redact
            preserve_length: If True, replace with asterisks of same length

        Returns:
            Redacted string
        """
        if not text:
            return text

        redacted = text

        # Redact emails
        redacted = PIIRedactor.EMAIL_PATTERN.sub('[EMAIL_REDACTED]', redacted)

        # Redact phone numbers
        redacted = PIIRedactor.PHONE_PATTERN.sub('[PHONE_REDACTED]', redacted)

        # Redact IP addresses
        redacted = PIIRedactor.IP_PATTERN.sub('[IP_REDACTED]', redacted)

        # Redact credit cards
        redacted = PIIRedactor.CREDIT_CARD_PATTERN.sub('[CARD_REDACTED]', redacted)

        # Redact SSN
        redacted = PIIRedactor.SSN_PATTERN.sub('[SSN_REDACTED]', redacted)

        # Redact tokens
        for pattern in PIIRedactor.TOKEN_PATTERNS:
            redacted = pattern.sub('[TOKEN_REDACTED]', redacted)

        # Redact passwords
        for pattern in PIIRedactor.PASSWORD_PATTERNS:
            redacted = pattern.sub(r'password=[PASSWORD_REDACTED]', redacted)

        return redacted

    @staticmethod
    def mask_user_id(user_id: str, show_chars: int = 4) -> str:
        """
        Partially mask user ID for logging

        Args:
            user_id: User identifier
            show_chars: Number of characters to show at end

        Returns:
            Masked user ID (e.g., "****1234")
        """
        if not user_id or len(user_id) <= show_chars:
            return "****"

        return "*" * (len(user_id) - show_chars) + user_id[-show_chars:]

    @staticmethod
    def redact_dict(data: Dict[str, Any], sensitive_keys: Optional[list] = None) -> Dict[str, Any]:
        """
        Redact sensitive fields from dictionary

        Args:
            data: Dictionary to redact
            sensitive_keys: Additional keys to redact beyond defaults

        Returns:
            Redacted dictionary copy
        """
        if sensitive_keys is None:
            sensitive_keys = []

        # Default sensitive keys
        default_sensitive = [
            'password', 'passwd', 'pwd', 'secret', 'api_key', 'apikey',
            'access_token', 'refresh_token', 'oauth_token', 'bearer_token',
            'email', 'phone', 'ssn', 'credit_card', 'ip_address',
            'authorization', 'auth', 'credentials'
        ]

        all_sensitive = set(default_sensitive + sensitive_keys)

        redacted = {}
        for key, value in data.items():
            key_lower = key.lower()

            # Check if key is sensitive
            if any(sensitive in key_lower for sensitive in all_sensitive):
                redacted[key] = '[REDACTED]'
            elif isinstance(value, dict):
                # Recursively redact nested dicts
                redacted[key] = PIIRedactor.redact_dict(value, sensitive_keys)
            elif isinstance(value, str):
                # Redact PII from string values
                redacted[key] = PIIRedactor.redact_string(value)
            elif isinstance(value, list):
                # Redact items in lists
                redacted[key] = [
                    PIIRedactor.redact_dict(item, sensitive_keys) if isinstance(item, dict)
                    else PIIRedactor.redact_string(item) if isinstance(item, str)
                    else item
                    for item in value
                ]
            else:
                redacted[key] = value

        return redacted

    @staticmethod
    def redact_error_message(error: Exception) -> str:
        """
        Redact PII from exception messages before logging

        Args:
            error: Exception object

        Returns:
            Redacted error message
        """
        error_msg = str(error)
        return PIIRedactor.redact_string(error_msg)

    @staticmethod
    def sanitize_log_message(message: str, user_id: Optional[str] = None) -> str:
        """
        Sanitize log message for safe logging

        Args:
            message: Log message
            user_id: Optional user ID to mask

        Returns:
            Sanitized log message
        """
        sanitized = PIIRedactor.redact_string(message)

        if user_id:
            # Replace any occurrence of full user ID with masked version
            sanitized = sanitized.replace(user_id, PIIRedactor.mask_user_id(user_id))

        return sanitized


def safe_log_data(data: Any) -> str:
    """
    Convert data to safe loggable string with PII redaction

    Args:
        data: Any data structure

    Returns:
        JSON string with PII redacted
    """
    if isinstance(data, dict):
        redacted = PIIRedactor.redact_dict(data)
        return json.dumps(redacted, indent=2)
    elif isinstance(data, str):
        return PIIRedactor.redact_string(data)
    else:
        return PIIRedactor.redact_string(str(data))


# Convenience functions
def redact(text: str) -> str:
    """Quick redaction of PII from text"""
    return PIIRedactor.redact_string(text)


def mask_id(user_id: str) -> str:
    """Quick masking of user ID"""
    return PIIRedactor.mask_user_id(user_id)


def safe_dict(data: dict) -> dict:
    """Quick dictionary redaction"""
    return PIIRedactor.redact_dict(data)
