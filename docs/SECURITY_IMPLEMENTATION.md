# RaptorX Security Implementation Guide

## Overview

This document describes the new security features implemented in RaptorX, including JWT authentication, MFA, audit logging, and device certificate support.

##  Table of Contents

1. [Authentication Flow](#authentication-flow)
2. [API Endpoints](#api-endpoints)
3. [Curl Examples](#curl-examples)
4. [Frontend Integration](#frontend-integration)
5. [Device Certificate Registration](#device-certificates-mtls)
6. [Audit Logging](#audit-logging)

---

## Authentication Flow

### Standard Login (Without MFA)

```
1. User submits email + PIN to POST /api/auth/login
2. Backend verifies credentials + checks brute-force lockout
3. If valid:
   - Creates JWT access token (15 min TTL)
   - Creates refresh token (7 day TTL)
   - Returns access_token, refresh_token, user profile
4. Frontend stores tokens in localStorage or secure storage
5. Subsequent requests include: Authorization: Bearer <access_token>
```

### Login With MFA Enabled

```
1. User submits email + PIN to POST /api/auth/login
2. Backend verifies credentials
3. If MFA enabled, returns: mfa_required=true, mfa_token (5 min TTL)
4. Frontend shows MFA prompt (TOTP or backup code)
5. User submits TOTP/backup code to POST /api/auth/mfa/verify with mfa_token
6. Backend verifies code
7. If valid:
   - Creates JWT access token (15 min TTL)
   - Creates refresh token (7 day TTL)
   - Returns both tokens
```

### Token Refresh

```
1. When access token expires, send: POST /api/auth/refresh with refresh_token
2. Backend verifies refresh token (checks hash, not revoked, not expired)
3. If valid:
   - Old refresh token marked as "rotated"
   - New access token created
   - New refresh token created (rotating refresh tokens)
   - Returns new access_token, refresh_token
4. Token reuse detected → all sessions revoked + re-login required
```

### Logout

```
Single Session:
  POST /api/auth/logout with refresh_token
  → Refresh token marked as revoked

All Sessions:
  POST /api/auth/logout-all with access_token (Authorization header)
  → All user's refresh tokens marked as revoked
```

---

## API Endpoints

### Authentication

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---|
| `/api/auth/login` | POST | Login with email + PIN | No |
| `/api/auth/refresh` | POST | Refresh access token | No (uses refresh_token in body) |
| `/api/auth/logout` | POST | Logout (revoke single refresh token) | No |
| `/api/auth/logout-all` | POST | Logout all sessions | Yes (Bearer token) |
| `/api/auth/profile` | GET | Get current user profile | Yes |

### MFA Management

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---|
| `/api/auth/mfa/enroll` | POST | Start MFA enrollment | Yes |
| `/api/auth/mfa/verify-enroll` | POST | Verify TOTP during enrollment | Yes (via mfa_token) |
| `/api/auth/mfa/verify` | POST | Verify TOTP/backup code during login | No (uses mfa_token from login) |
| `/api/auth/mfa/disable` | POST | Disable MFA for user | Yes |

---

## Curl Examples

### 1. Login Without MFA

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "pin": "1234"
  }'
```

**Response (Success):**
```json
{
  "access_token": "eyJhbGc... (JWT token)",
  "refresh_token": "secret_token_...",
  "token_type": "Bearer",
  "expires_in": 900,
  "mfa_required": false,
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "first_name": "Admin",
    "last_name": "User",
    "role": "admin",
    "mfa_enabled": false
  }
}
```

### 2. Login With MFA (Step 1 - Initial Login)

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "pin": "1234"
  }'
```

**Response (MFA Required):**
```json
{
  "access_token": "",
  "token_type": "Bearer",
  "expires_in": 0,
  "mfa_required": true,
  "mfa_token": "eyJhbGc...(short-lived MFA JWT)"
}
```

### 3. Verify MFA Code (Step 2)

```bash
curl -X POST http://localhost:8000/api/auth/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "mfa_token": "eyJhbGc...",
    "totp_code": "123456"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGc... (JWT token)",
  "refresh_token": "secret_token_...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "first_name": "Admin",
    "last_name": "User",
    "role": "admin",
    "mfa_enabled": true
  }
}
```

### 4. Refresh Access Token

```bash
curl -X POST http://localhost:8000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "secret_token_..."
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGc... (new JWT token)",
  "refresh_token": "new_secret_token_...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

### 5. Logout

```bash
curl -X POST http://localhost:8000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "secret_token_..."
  }'
```

### 6. Logout All Sessions

```bash
curl -X POST http://localhost:8000/api/auth/logout-all \
  -H "Authorization: Bearer eyJhbGc..."
```

### 7. Enroll in MFA (Step 1 - Get QR Code)

```bash
curl -X POST http://localhost:8000/api/auth/mfa/enroll \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "password": "current_pin_password"
  }'
```

**Response:**
```json
{
  "secret": "JBSWY3DPEBLW64TMMQ======",
  "qr_code_url": "data:image/png;base64,iVBORw0KG...",
  "backup_codes": [
    "A1B2C3D4",
    "E5F6G7H8",
    ...
  ],
  "mfa_token": "eyJhbGc... (for next step)"
}
```

### 8. Verify MFA Enrollment (Step 2)

```bash
curl -X POST http://localhost:8000/api/auth/mfa/verify-enroll \
  -H "Content-Type: application/json" \
  -d '{
    "mfa_token": "eyJhbGc...",
    "totp_code": "123456"
  }'
```

### 9. Get Current User Profile

```bash
curl -X GET http://localhost:8000/api/auth/profile \
  -H "Authorization: Bearer eyJhbGc..."
```

### 10. Disable MFA

```bash
curl -X POST http://localhost:8000/api/auth/mfa/disable \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "password": "current_pin_password",
    "mfa_code": "123456"
  }'
```

---

## Frontend Integration

### 1. Update Login Component

**File: `frontend/src/pages/authentication/Login.tsx`**

```typescript
import { useState } from 'react';
import { apiClient } from 'lib/api';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/auth/login', {
        email,
        pin,
      });

      if (response.mfa_required) {
        setMfaRequired(true);
        setMfaToken(response.mfa_token);
      } else {
        // Store tokens
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        
        // Redirect to dashboard
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/auth/mfa/verify', {
        mfa_token: mfaToken,
        totp_code: mfaCode,
      });

      // Store tokens
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      
      // Redirect to dashboard
      window.location.href = '/';
    } catch (err: any) {
      setError(err.response?.data?.detail || 'MFA verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (mfaRequired) {
    return (
      <form onSubmit={handleMFAVerify}>
        <h2>Enter MFA Code</h2>
        <input
          type="text"
          placeholder="TOTP Code (6 digits)"
          value={mfaCode}
          onChange={(e) => setMfaCode(e.target.value)}
          maxLength={6}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify'}
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin}>
      <h2>Login</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
};
```

### 2. Update API Client (`lib/api.ts`)

```typescript
// Add token management
export const apiClient = {
  setToken: (token: string) => {
    localStorage.setItem('access_token', token);
  },

  getToken: () => {
    return localStorage.getItem('access_token');
  },

  clearToken: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  // Intercept requests to add Authorization header
  async request(method: string, path: string, data?: any) {
    const token = this.getToken();
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await axios({
        method,
        url: `${API_BASE_URL}${path}`,
        data,
        headers,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token expired - try refresh
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            const refreshResponse = await axios.post(
              `${API_BASE_URL}/auth/refresh`,
              { refresh_token: refreshToken }
            );
            this.setToken(refreshResponse.data.access_token);
            localStorage.setItem('refresh_token', refreshResponse.data.refresh_token);
            
            // Retry original request
            return this.request(method, path, data);
          } catch (refreshError) {
            this.clearToken();
            window.location.href = '/authentication/login';
          }
        }
      }
      throw error;
    }
  },

  post: (path: string, data: any) => apiClient.request('POST', path, data),
  get: (path: string) => apiClient.request('GET', path),
  put: (path: string, data: any) => apiClient.request('PUT', path, data),
  delete: (path: string) => apiClient.request('DELETE', path),
};
```

### 3. Add RequireAuth Component

**File: `frontend/src/components/auth/RequireAuth.tsx`**

```typescript
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiClient } from 'lib/api';

interface RequireAuthProps {
  children: React.ReactNode;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    // Could add token validation here if needed
    setIsAuthenticated(true);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/authentication/login" replace />;
  }

  return <>{children}</>;
};
```

---

## Device Certificates (mTLS)

### Device Certificate Registration (Admin Only)

```bash
# Register a new device certificate
curl -X POST http://localhost:8000/api/admin/devices/register \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "access_point_id": 1,
    "device_name": "badge_reader_main_entrance",
    "cert_fingerprint": "3e:b5:2d:4a:...",
    "subject_dn": "CN=badge_reader_1,O=RaptorX"
  }'
```

### Device Access Request (mTLS Client Certificate Required)

```bash
# Device makes request with client certificate
curl -X POST https://localhost:8443/api/access/request \
  --cert device_cert.pem \
  --key device_key.pem \
  --cacert ca.pem \
  -H "Content-Type: application/json" \
  -d '{
    "badge_id": "EMP12345",
    "access_point_id": 1
  }'
```

---

## Audit Logging

All admin actions are logged with tamper-evident hash chaining:

### Logged Actions

- `login` - User login success/failure
- `logout` - User logout
- `logout_all` - All sessions logout
- `token_refresh` - Access token refresh
- `mfa_enroll_start` - MFA enrollment started
- `mfa_enroll_verify` - MFA enrollment verified
- `mfa_verify_login` - MFA code verified during login
- `mfa_disable` - MFA disabled
- (Future) `user_create`, `user_update`, `role_change`, `rule_change`, etc.

### Query Audit Log

```bash
curl -X GET "http://localhost:8000/api/admin/audit-logs?limit=50&offset=0" \
  -H "Authorization: Bearer <admin_token>"
```

### Verify Audit Log Integrity

```bash
curl -X GET http://localhost:8000/api/admin/audit-logs/verify \
  -H "Authorization: Bearer <admin_token>"
```

---

## Environment Variables

Update `backend/.env`:

```env
# JWT Configuration
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# MFA Configuration
TOTP_ISSUER=RaptorX

# Brute-force Protection
LOGIN_ATTEMPT_WINDOW_MINUTES=15
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30

# mTLS (Optional)
MTLS_ENABLED=false
MTLS_TRUSTED_PROXY_IPS=127.0.0.1
```

---

## Security Notes

1. **Token Storage**: Consider using HttpOnly cookies instead of localStorage for production
2. **HTTPS Only**: Use HTTPS in production; tokens should never be transmitted over HTTP
3. **Token Rotation**: Refresh tokens are automatically rotated; old tokens cannot be reused
4. **Brute-force Protection**: Failed login attempts are tracked per email+IP with progressive lockout
5. **Audit Trail**: All admin actions are logged with hash-chained entries for tamper detection
6. **MFA**: Backup codes can be used once each and should be stored securely

---

## Testing

### Run Auth Tests

```bash
cd backend
pytest tests/test_auth.py -v
```

### Manual Testing Checklist

- [ ] User can login with email + PIN
- [ ] Access token is returned and can be used in requests
- [ ] Refresh token can be used to get new access token
- [ ] Token reuse is detected and rejected
- [ ] Brute-force attempts are tracked and locked
- [ ] MFA enrollment works (TOTP generation)
- [ ] MFA verification works during login
- [ ] MFA backup codes work as fallback
- [ ] Logout revokes refresh token
- [ ] Logout-all revokes all sessions
- [ ] Audit log entries are created and hash chain is valid
