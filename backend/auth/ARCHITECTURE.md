# Repazoo Twitter OAuth 2.0 Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REPAZOO SAAS PLATFORM                              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        CLIENT APPLICATIONS                           │  │
│  │                                                                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐│  │
│  │  │   DASH   │  │   CFY    │  │   NTF    │  │    AI    │  │  API   ││  │
│  │  │ .repazoo │  │ .repazoo │  │ .repazoo │  │ .repazoo │  │.repazoo││  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘│  │
│  │       │             │             │             │            │     │  │
│  │       └─────────────┴─────────────┴─────────────┴────────────┘     │  │
│  │                                   │                                │  │
│  └───────────────────────────────────┼────────────────────────────────┘  │
│                                      │                                    │
│                                      │ HTTPS                              │
│                                      ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │                          FASTAPI BACKEND                             ││
│  │                                                                      ││
│  │  ┌────────────────────────────────────────────────────────────────┐ ││
│  │  │                    OAUTH ROUTER                                │ ││
│  │  │  /auth/twitter/login                                           │ ││
│  │  │  /auth/twitter/callback                                        │ ││
│  │  │  /auth/twitter/status                                          │ ││
│  │  │  /auth/twitter/revoke                                          │ ││
│  │  │  /auth/twitter/refresh/{id}                                    │ ││
│  │  └────────────────────┬───────────────────────────────────────────┘ ││
│  │                       │                                             ││
│  │                       ▼                                             ││
│  │  ┌────────────────────────────────────────────────────────────────┐ ││
│  │  │                  OAUTH HANDLER                                 │ ││
│  │  │                                                                │ ││
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │ ││
│  │  │  │    PKCE      │  │    State     │  │   Token Management   │ │ ││
│  │  │  │  Generator   │  │  Validator   │  │  (Refresh/Revoke)    │ │ ││
│  │  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │ ││
│  │  │                                                                │ ││
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │ ││
│  │  │  │   Twitter    │  │   Audit      │  │   Token Storage      │ │ ││
│  │  │  │  API Client  │  │   Logger     │  │   (Encrypted)        │ │ ││
│  │  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │ ││
│  │  └────────┬───────────────────┬───────────────────┬───────────────┘ ││
│  └───────────┼───────────────────┼───────────────────┼─────────────────┘│
│              │                   │                   │                   │
│              │                   │                   │                   │
│              ▼                   ▼                   ▼                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  TWITTER OAUTH   │  │  VAULT SYSTEM    │  │  SUPABASE DATABASE   │  │
│  │      API         │  │                  │  │                      │  │
│  │  ┌────────────┐  │  │  ┌────────────┐  │  │  ┌────────────────┐ │  │
│  │  │/oauth2/    │  │  │  │ Encrypted  │  │  │  │ twitter_       │ │  │
│  │  │ authorize  │  │  │  │ Twitter    │  │  │  │  accounts      │ │  │
│  │  └────────────┘  │  │  │ Creds      │  │  │  │ (encrypted)    │ │  │
│  │  ┌────────────┐  │  │  └────────────┘  │  │  └────────────────┘ │  │
│  │  │/oauth2/    │  │  │  ┌────────────┐  │  │  ┌────────────────┐ │  │
│  │  │ token      │  │  │  │    ACL     │  │  │  │ oauth_states   │ │  │
│  │  └────────────┘  │  │  │   Rules    │  │  │  │ (temporary)    │ │  │
│  │  ┌────────────┐  │  │  └────────────┘  │  │  └────────────────┘ │  │
│  │  │/users/me   │  │  │  ┌────────────┐  │  │  ┌────────────────┐ │  │
│  │  └────────────┘  │  │  │   Audit    │  │  │  │  audit_log     │ │  │
│  │                  │  │  │    Log     │  │  │  │  (immutable)   │ │  │
│  └──────────────────┘  │  └────────────┘  │  │  └────────────────┘ │  │
│                        └──────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### 1. OAuth Initiation Flow

```
User (Browser)
    │
    │ 1. Click "Connect Twitter"
    │
    ▼
Client App (dash.repazoo.com)
    │
    │ 2. GET /auth/twitter/login?domain=dash
    │
    ▼
FastAPI Router (routes.py)
    │
    │ 3. Call initiate_oauth_flow()
    │
    ▼
OAuth Handler (oauth_handler.py)
    │
    ├─► 4. Generate PKCE Challenge
    │   ├── code_verifier: random 128 bytes
    │   └── code_challenge: SHA256(code_verifier)
    │
    ├─► 5. Create State Parameter
    │   ├── state_id: random 32 bytes
    │   └── expires_at: now + 10 minutes
    │
    ├─► 6. Store State in Database
    │   └── INSERT INTO oauth_states (state_id, code_verifier, ...)
    │
    ├─► 7. Load Credentials from Vault
    │   └── vault-get-secret.sh TWITTER_CLIENT_ID
    │
    └─► 8. Build Authorization URL
        ├── client_id: from vault
        ├── redirect_uri: callback URL for domain
        ├── scope: all required scopes
        ├── state: state_id
        ├── code_challenge: from PKCE
        └── code_challenge_method: S256

    │
    │ 9. Return authorization_url
    │
    ▼
Client App
    │
    │ 10. Redirect user to authorization_url
    │
    ▼
Twitter OAuth
    │
    │ 11. User authorizes app
    │
    └─► 12. Redirect to callback with code & state
```

### 2. OAuth Callback Flow

```
Twitter OAuth
    │
    │ 1. Redirect: /callback?code=XXX&state=YYY&domain=dash
    │
    ▼
FastAPI Router (routes.py)
    │
    │ 2. Call handle_oauth_callback()
    │
    ▼
OAuth Handler (oauth_handler.py)
    │
    ├─► 3. Validate State (CSRF Protection)
    │   ├── SELECT * FROM oauth_states WHERE state_id = ?
    │   ├── Check expiration (< 10 minutes)
    │   ├── Retrieve code_verifier
    │   └── DELETE state (one-time use)
    │
    ├─► 4. Load Credentials from Vault
    │   ├── TWITTER_CLIENT_ID
    │   └── TWITTER_CLIENT_SECRET
    │
    ├─► 5. Exchange Code for Tokens (with PKCE)
    │   │
    │   └─► POST https://api.twitter.com/2/oauth2/token
    │       ├── grant_type: authorization_code
    │       ├── code: authorization code
    │       ├── redirect_uri: callback URL
    │       ├── code_verifier: from state
    │       └── Authorization: Basic base64(client_id:secret)
    │
    │   Response:
    │   ├── access_token
    │   ├── refresh_token
    │   ├── expires_in
    │   ├── token_type
    │   └── scope
    │
    ├─► 6. Fetch Twitter User Info
    │   │
    │   └─► GET https://api.twitter.com/2/users/me
    │       └── Authorization: Bearer access_token
    │
    │   Response:
    │   ├── id (Twitter user ID)
    │   ├── username
    │   └── name
    │
    ├─► 7. Store Account with Encrypted Tokens
    │   │
    │   └─► CALL insert_twitter_account(
    │       │   user_id,
    │       │   twitter_user_id,
    │       │   twitter_username,
    │       │   access_token,    ◄─── Plain text
    │       │   refresh_token,   ◄─── Plain text
    │       │   token_expires_at,
    │       │   scopes
    │       )
    │       │
    │       └─► Database Function:
    │           ├── encrypt_token(access_token)  ◄─── AES-256
    │           ├── encrypt_token(refresh_token) ◄─── AES-256
    │           └── INSERT INTO twitter_accounts (
    │               access_token_encrypted,  ◄─── BYTEA
    │               refresh_token_encrypted, ◄─── BYTEA
    │               ...
    │             )
    │
    └─► 8. Log to Audit Trail
        └── INSERT INTO audit_log (
            action: 'OAUTH_CONNECT',
            resource_id: account_id,
            metadata: {twitter_username, scopes}
          )

    │
    │ 9. Return success response
    │
    ▼
Client App
    │
    │ 10. Show "Connected successfully"
    │
    └─► User sees connected Twitter account
```

### 3. Token Refresh Flow

```
Background Job / API Request
    │
    │ 1. Check token expiration
    │
    ▼
OAuth Handler
    │
    ├─► 2. Get Encrypted Tokens from Database
    │   │
    │   └─► CALL get_decrypted_twitter_tokens(account_id)
    │       │
    │       └─► Database Function (SECURITY DEFINER):
    │           ├── SELECT access_token_encrypted, refresh_token_encrypted
    │           │   FROM twitter_accounts WHERE id = account_id
    │           │
    │           ├── decrypt_token(access_token_encrypted)  ◄─── AES-256
    │           ├── decrypt_token(refresh_token_encrypted) ◄─── AES-256
    │           │
    │           └─► Return plaintext tokens (in memory only)
    │
    ├─► 3. Request New Tokens from Twitter
    │   │
    │   └─► POST https://api.twitter.com/2/oauth2/token
    │       ├── grant_type: refresh_token
    │       ├── refresh_token: from database
    │       └── Authorization: Basic base64(client_id:secret)
    │
    │   Response:
    │   ├── access_token (new)
    │   ├── refresh_token (new, rotated)
    │   ├── expires_in
    │   └── scope
    │
    ├─► 4. Update Database with New Tokens
    │   │
    │   └─► CALL update_twitter_tokens(
    │       │   account_id,
    │       │   new_access_token,  ◄─── Plain text
    │       │   new_refresh_token  ◄─── Plain text
    │       )
    │       │
    │       └─► Database Function:
    │           ├── encrypt_token(new_access_token)  ◄─── AES-256
    │           ├── encrypt_token(new_refresh_token) ◄─── AES-256
    │           └── UPDATE twitter_accounts SET
    │               access_token_encrypted = ...,
    │               refresh_token_encrypted = ...,
    │               token_expires_at = ...,
    │               last_synced_at = NOW()
    │
    └─► 5. Log Refresh Event
        └── INSERT INTO audit_log (
            action: 'TOKEN_REFRESHED',
            resource_id: account_id
          )

    │
    └─► Continue with API request using new token
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Transport Security
┌─────────────────────────────────────────────────────────────────┐
│ ■ HTTPS/TLS 1.3 for all communications                          │
│ ■ Certificate pinning (recommended for production)              │
│ ■ HSTS headers enforced                                         │
└─────────────────────────────────────────────────────────────────┘

Layer 2: Authentication
┌─────────────────────────────────────────────────────────────────┐
│ ■ JWT/Session tokens for Repazoo user auth                      │
│ ■ Twitter OAuth 2.0 for Twitter account linking                 │
│ ■ Service role authentication for database functions            │
└─────────────────────────────────────────────────────────────────┘

Layer 3: Authorization
┌─────────────────────────────────────────────────────────────────┐
│ ■ Row Level Security (RLS) on all database tables               │
│ ■ Vault ACL for credential access                               │
│ ■ User ownership validation on Twitter accounts                 │
└─────────────────────────────────────────────────────────────────┘

Layer 4: CSRF Protection
┌─────────────────────────────────────────────────────────────────┐
│ ■ State parameter (32-byte random)                              │
│ ■ 10-minute expiration window                                   │
│ ■ One-time use (deleted after validation)                       │
│ ■ Database storage with user binding                            │
└─────────────────────────────────────────────────────────────────┘

Layer 5: Code Injection Protection (PKCE)
┌─────────────────────────────────────────────────────────────────┐
│ ■ Code verifier: 128-byte random string                         │
│ ■ Code challenge: SHA-256(code_verifier)                        │
│ ■ Challenge method: S256 (SHA-256)                              │
│ ■ Prevents authorization code interception                      │
└─────────────────────────────────────────────────────────────────┘

Layer 6: Token Encryption (At Rest)
┌─────────────────────────────────────────────────────────────────┐
│ ■ Algorithm: AES-256-CBC with PKCS padding                      │
│ ■ Key: 32-byte from environment/vault                           │
│ ■ Storage: BYTEA columns in PostgreSQL                          │
│ ■ Access: SECURITY DEFINER functions only                       │
└─────────────────────────────────────────────────────────────────┘

Layer 7: Audit Logging
┌─────────────────────────────────────────────────────────────────┐
│ ■ All OAuth operations logged                                   │
│ ■ Immutable audit_log table                                     │
│ ■ IP address, user agent, timestamps                            │
│ ■ Metadata for forensic analysis                                │
└─────────────────────────────────────────────────────────────────┘

Layer 8: Secrets Management
┌─────────────────────────────────────────────────────────────────┐
│ ■ Age-encrypted vault for credentials                           │
│ ■ ACL-based access control                                      │
│ ■ Audit logging for all secret access                           │
│ ■ No hardcoded credentials in code                              │
└─────────────────────────────────────────────────────────────────┘

Layer 9: Defense in Depth
┌─────────────────────────────────────────────────────────────────┐
│ ■ Input validation (Pydantic models)                            │
│ ■ SQL injection prevention (parameterized queries)              │
│ ■ Rate limiting (recommended)                                   │
│ ■ CORS restrictions (Repazoo domains only)                      │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Token Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOKEN LIFECYCLE DIAGRAM                       │
└─────────────────────────────────────────────────────────────────┘

1. TOKEN ACQUISITION
   Twitter → Backend (HTTPS)
   ├─ access_token (plaintext in memory)
   ├─ refresh_token (plaintext in memory)
   └─ expires_in (typically 7200 seconds)

2. ENCRYPTION
   Backend Memory → Database Function
   ├─ encrypt_token(access_token)
   │  ├─ Get encryption key from environment
   │  ├─ AES-256-CBC encryption
   │  └─ Return BYTEA
   └─ encrypt_token(refresh_token)
      └─ Same process

3. STORAGE
   Database Function → PostgreSQL
   └─ INSERT INTO twitter_accounts (
      access_token_encrypted BYTEA,  ◄── Never plaintext
      refresh_token_encrypted BYTEA, ◄── Never plaintext
      token_expires_at TIMESTAMPTZ
    )

4. RETRIEVAL (Service Role Only)
   Backend → Database Function
   └─ get_decrypted_twitter_tokens(account_id)
      ├─ SECURITY DEFINER (elevated privileges)
      ├─ decrypt_token(access_token_encrypted)
      └─ Returns plaintext in memory (never logged)

5. USAGE
   Backend Memory → Twitter API (HTTPS)
   └─ Authorization: Bearer {access_token}
      └─ Token never persisted in plaintext

6. REFRESH (Before Expiration)
   Backend → Twitter API
   ├─ POST /oauth2/token
   ├─ grant_type: refresh_token
   └─ refresh_token: from decrypted storage

   Response → Encryption → Storage
   ├─ New access_token (encrypted)
   ├─ New refresh_token (encrypted, rotated)
   └─ UPDATE twitter_accounts

7. REVOCATION
   User Request → Backend → Twitter API
   ├─ POST /oauth2/revoke
   └─ token: access_token

   Backend → Database
   └─ UPDATE twitter_accounts SET is_active = false

8. EXPIRATION & CLEANUP
   Automatic Process
   ├─ Monitor token_expires_at
   ├─ Trigger refresh if < 5 minutes remaining
   └─ Mark inactive if refresh fails
```

## Module Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY GRAPH                              │
└─────────────────────────────────────────────────────────────────┘

main.py
  │
  ├─► auth/__init__.py
  │     │
  │     ├─► auth/routes.py
  │     │     │
  │     │     ├─► auth/models.py
  │     │     │     └─► pydantic
  │     │     │
  │     │     └─► auth/oauth_handler.py
  │     │           │
  │     │           ├─► auth/config.py
  │     │           │     │
  │     │           │     ├─► vault-get-secret.sh
  │     │           │     └─► .env (environment)
  │     │           │
  │     │           ├─► auth/models.py
  │     │           │
  │     │           ├─► httpx (Twitter API)
  │     │           │
  │     │           └─► supabase-py (Database)
  │     │                 │
  │     │                 └─► PostgreSQL
  │     │                       │
  │     │                       ├─► twitter_accounts
  │     │                       ├─► oauth_states
  │     │                       └─► audit_log
  │     │
  │     └─► auth/config.py
  │
  ├─► fastapi
  ├─► uvicorn
  └─► pydantic
```

## Security Threat Model & Mitigations

```
┌─────────────────────────────────────────────────────────────────┐
│                   THREAT MODEL & MITIGATIONS                     │
└─────────────────────────────────────────────────────────────────┘

THREAT: Authorization Code Interception
├─ Attack: Attacker intercepts authorization code
├─ Impact: Could exchange code for tokens
└─ Mitigation: PKCE (code_verifier only in server)
   └─ Even with code, attacker cannot complete exchange

THREAT: CSRF (Cross-Site Request Forgery)
├─ Attack: Trick user into authorizing attacker's app
├─ Impact: Link victim's Twitter to attacker's account
└─ Mitigation: State parameter validation
   ├─ Cryptographically random state
   ├─ 10-minute expiration
   └─ One-time use

THREAT: Token Theft from Database
├─ Attack: SQL injection or database breach
├─ Impact: Steal OAuth tokens
└─ Mitigation: AES-256 encryption
   ├─ Tokens encrypted at rest
   ├─ Encryption key separate from database
   └─ SECURITY DEFINER functions restrict access

THREAT: Token Theft in Transit
├─ Attack: Man-in-the-middle attack
├─ Impact: Intercept tokens during API calls
└─ Mitigation: HTTPS/TLS 1.3
   └─ All communications encrypted

THREAT: Credential Exposure
├─ Attack: Hardcoded secrets in code
├─ Impact: Twitter app compromise
└─ Mitigation: Vault system
   ├─ Age-encrypted credential storage
   ├─ ACL-based access control
   └─ No secrets in code or git

THREAT: Session Hijacking
├─ Attack: Steal user session token
├─ Impact: Access user's OAuth tokens
└─ Mitigation: RLS + ownership validation
   ├─ Users can only access their own tokens
   └─ Service role required for decryption

THREAT: Replay Attacks
├─ Attack: Reuse authorization code or state
├─ Impact: Unauthorized token acquisition
└─ Mitigation: One-time use
   ├─ Authorization codes consumed by Twitter
   └─ States deleted after use

THREAT: Insider Threat
├─ Attack: Malicious internal access
├─ Impact: Steal tokens or credentials
└─ Mitigation: Audit logging
   ├─ All access logged immutably
   ├─ IP addresses tracked
   └─ Anomaly detection (recommended)
```

## Performance Considerations

```
┌─────────────────────────────────────────────────────────────────┐
│                   PERFORMANCE OPTIMIZATIONS                      │
└─────────────────────────────────────────────────────────────────┘

CONFIG LOADING
├─ @lru_cache() on get_oauth_config()
├─ Vault accessed once at startup
└─ Credentials cached in memory

DATABASE QUERIES
├─ Indexed on state_id, user_id, twitter_user_id
├─ SECURITY DEFINER functions minimize round trips
└─ Prepared statements for encryption/decryption

HTTP CLIENT
├─ Persistent httpx.AsyncClient
├─ Connection pooling to Twitter API
└─ Timeout: 30 seconds

TOKEN REFRESH
├─ Proactive refresh (before expiration)
├─ Background jobs for bulk refresh
└─ Avoid refresh storms with jitter

STATE CLEANUP
├─ Automatic expiration (10 minutes)
├─ Periodic cleanup job (hourly)
└─ Index on expires_at for fast deletion

AUDIT LOGGING
├─ Async insertion (non-blocking)
├─ Batching for high-volume events
└─ Index on created_at for queries
```

This architecture provides enterprise-grade security for Twitter OAuth integration while maintaining high performance and scalability for the Repazoo SaaS platform.
