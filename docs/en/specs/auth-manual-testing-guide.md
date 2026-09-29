# Manual Testing Guide — Authentication & Authorization

> **Scope:** This guide covers manual end-to-end verification of the passwordless magic-link authentication system implemented in Phases 1–10.
> **Target Audience:** Developers and QA testers verifying the auth system before automated test coverage (Phase 11).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Backend API Testing](#backend-api-testing)
  - [Registration Flow](#1-registration-flow)
  - [Magic Link Login Flow](#2-magic-link-login-flow)
  - [Token Refresh & Logout](#3-token-refresh--logout)
  - [Admin Endpoints](#4-admin-endpoints)
- [Frontend Flow Testing](#frontend-flow-testing)
  - [Registration](#1-registration-frontend)
  - [Email Verification](#2-email-verification)
  - [Magic Link Login](#3-magic-link-login)
  - [Session Persistence](#4-session-persistence)
  - [Logout & Logout All](#5-logout--logout-all)
- [Edge Cases & Error Scenarios](#edge-cases--error-scenarios)
- [Security Verification](#security-verification)
- [Cross-Tab Synchronization](#cross-tab-synchronization)
- [Rate Limiting](#rate-limiting)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v24+) installed
- Docker and Docker Compose running
- Git repository cloned and on the `feat/auth-implementation` branch
- Backend `.env` configured with valid `JWT_SECRET`, `MAGIC_LINK_SECRET`, and email service settings
- MailHog, Mailtrap, or console output available to inspect sent emails

## Environment Setup

```bash
# Start the full development stack
cd /home/flpdorea/Projects/gameplate
make dev

# Verify services are healthy
docker compose -f compose.development.yaml ps
```

Expected running containers:
- `gameplate-front` — Next.js on http://localhost:3000
- `gameplate-back` — NestJS on http://localhost:3001
- `gameplate-db` — PostgreSQL on localhost:5432

If using the mock email service (default in development), magic link and verification emails are logged to the backend container stdout:

```bash
make logs-back
# or
docker compose -f compose.development.yaml logs -f back
```

---

## Backend API Testing

All backend endpoints are prefixed with `/api/v1`. Use `curl` or an HTTP client like Postman/Insomnia.

### 1. Registration Flow

#### 1.1 Register a new user

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "dateOfBirth": "1995-06-15",
    "email": "testuser@example.com",
    "nickname": "testuser_42"
  }'
```

**Expected Response (200 OK):**
```json
{
  "message": "Check your email"
}
```

**Verify in backend logs:** A verification email URL is printed containing `token=` and `nonce=` query parameters.

#### 1.2 Register with duplicate email

Repeat the same request with the same email.

**Expected Response (200 OK):**
```json
{
  "message": "Check your email"
}
```

> **Security Check:** The response is identical to the first request. No email enumeration leak.

#### 1.3 Register with invalid data

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "",
    "lastName": "User",
    "dateOfBirth": "invalid-date",
    "email": "not-an-email",
    "nickname": "ab"
  }'
```

**Expected Response (400 Bad Request):**
Validation errors for each invalid field.

#### 1.4 Preview verification token (GET)

Copy the verification link from the backend logs. It looks like:
```
http://localhost:3001/api/v1/auth/verify-email?token=XYZ&nonce=ABC
```

```bash
curl -v "http://localhost:3001/api/v1/auth/verify-email?token=<TOKEN>&nonce=<NONCE>"
```

**Expected Response (302 Redirect):**
- `Location` header: `http://localhost:3000/auth/confirm-verification?token=<TOKEN>`
- The token is **NOT** consumed yet (two-step confirmation).

#### 1.5 Consume verification token (POST)

```bash
curl -X POST http://localhost:3001/api/v1/auth/verify-email/confirm \
  -H "Content-Type: application/json" \
  -d '{ "token": "<TOKEN>" }'
```

**Expected Response (200 OK):**
```json
{
  "redirectTo": "/"
}
```

**Verify cookies are set:**
```bash
# Use -c to save cookies
curl -X POST http://localhost:3001/api/v1/auth/verify-email/confirm \
  -H "Content-Type: application/json" \
  -d '{ "token": "<TOKEN>" }' \
  -c cookies.txt

cat cookies.txt
```

You should see:
- `refresh_token` — httpOnly, Secure, SameSite=Strict
- `auth_status` — non-httpOnly, SameSite=Lax

#### 1.6 Resend verification email

```bash
curl -X POST http://localhost:3001/api/v1/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{ "email": "testuser@example.com" }'
```

**Expected Response (200 OK):**
```json
{
  "message": "Check your email"
}
```

---

### 2. Magic Link Login Flow

#### 2.1 Request magic link

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "testuser@example.com" }' \
  -c login_attempt.txt
```

**Expected Response (200 OK):**
```json
{
  "message": "Check your email"
}
```

**Verify cookies:**
```bash
cat login_attempt.txt
```
- `login_attempt` cookie should be present (httpOnly, 15min expiry).

#### 2.2 Preview magic link (GET)

Copy the magic link from backend logs.

```bash
curl -v "http://localhost:3001/api/v1/auth/login?token=<TOKEN>&nonce=<NONCE>" \
  -b login_attempt.txt
```

**Expected Response (302 Redirect):**
- `Location` header: `http://localhost:3000/auth/confirm-login?token=<TOKEN>`

#### 2.3 Consume magic link (POST)

```bash
curl -X POST http://localhost:3001/api/v1/auth/login/confirm \
  -H "Content-Type: application/json" \
  -d '{ "token": "<TOKEN>" }' \
  -b login_attempt.txt \
  -c session.txt
```

**Expected Response (200 OK):**
```json
{
  "redirectTo": "/"
}
```

**Verify cookies in `session.txt`:**
- `refresh_token`
- `auth_status`

#### 2.4 Get current user

```bash
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Expected Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "testuser@example.com",
  "nickname": "testuser_42",
  "firstName": "Test",
  "lastName": "User",
  "role": "player",
  "isEmailVerified": true
}
```

> To get the access token: it is returned in the response body of `POST /auth/login/confirm` and `POST /auth/verify-email/confirm`. In frontend testing, it is stored in memory by the Axios interceptor.

---

### 3. Token Refresh & Logout

#### 3.1 Refresh token

Use the `refresh_token` cookie from the session:

```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -b session.txt
```

**Expected Response (200 OK):**
```json
{
  "accessToken": "new-jwt-token"
}
```

**Verify:** A new `refresh_token` cookie is set (token rotation).

#### 3.2 Logout

```bash
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -b session.txt \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Expected Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Verify:**
- `refresh_token` and `auth_status` cookies are cleared.
- Subsequent `POST /auth/refresh` with the old cookie returns 401.

#### 3.3 Logout all devices

First, log in again to get a fresh session. Then:

```bash
curl -X POST http://localhost:3001/api/v1/auth/logout-all \
  -b session.txt \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Expected Response (200 OK):**
```json
{
  "message": "Logged out from all devices"
}
```

**Verify:**
- All refresh tokens for this user are revoked in the database.
- The access token `jti` is blacklisted.

---

### 4. Admin Endpoints

#### 4.1 Create an admin user

Manually update the user role in the database, or register a new user and promote it:

```bash
# Connect to the database
docker compose -f compose.development.yaml exec db psql -U postgres -d gameplate

# Promote user to admin
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

#### 4.2 List users (admin only)

```bash
curl http://localhost:3001/api/v1/admin/users \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

**Expected Response (200 OK):**
```json
{
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 5 }
}
```

#### 4.3 Access admin endpoint as non-admin

Use a regular player's access token:

```bash
curl http://localhost:3001/api/v1/admin/users \
  -H "Authorization: Bearer <PLAYER_ACCESS_TOKEN>"
```

**Expected Response (403 Forbidden):**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

#### 4.4 Update user role

```bash
curl -X PATCH http://localhost:3001/api/v1/admin/users/<USER_ID>/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -d '{ "role": "institution" }'
```

**Expected Response (200 OK):**
Updated user object.

#### 4.5 Toggle user status

```bash
curl -X PATCH http://localhost:3001/api/v1/admin/users/<USER_ID>/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -d '{ "isActive": false }'
```

**Expected Response (200 OK):**
Updated user object.

**Verify:** An inactive user cannot log in. Attempting `POST /auth/login` returns the generic "Check your email" response, but no magic link email is sent.

---

## Frontend Flow Testing

Open the browser at http://localhost:3000. Open DevTools (F12) → Network tab and enable **Preserve log**.

### 1. Registration (Frontend)

1. Navigate to `/register`.
2. Fill in the form:
   - First Name: `Test`
   - Last Name: `User`
   - Date of Birth: `06/15/1995`
   - Email: `testuser@example.com`
   - Nickname: `testuser_42`
3. Submit the form.

**Expected:**
- Form shows loading state.
- On success, form is replaced with: "Check your email to verify your account."
- No error toast appears.

**Verify in DevTools:**
- `POST /api/v1/auth/register` returns 200.
- Response body contains `{ message: "Check your email" }`.

### 2. Email Verification

1. Open backend logs (`make logs-back`) and find the verification email URL.
2. Copy the `token` query parameter value.
3. Navigate to `/auth/confirm-verification?token=<TOKEN>`.

**Expected:**
- Page displays "Verify Email" button.
- Clicking the button shows a loading spinner, then redirects to `/`.

**Verify in DevTools:**
- `POST /api/v1/auth/verify-email/confirm` returns 200 with `{ redirectTo: "/" }`.
- Response cookies include `refresh_token` and `auth_status`.
- `GET /api/v1/auth/me` is called automatically after redirect and returns user data.

### 3. Magic Link Login

#### 3.1 Request magic link

1. Log out first (if logged in).
2. Navigate to `/login`.
3. Enter email: `testuser@example.com`.
4. Submit.

**Expected:**
- Form shows loading state.
- Replaced with "Check your email for a magic link" and a 60-second countdown timer.
- Resend button is disabled during countdown.

**Verify in DevTools:**
- `POST /api/v1/auth/login` returns 200.
- `login_attempt` cookie is set.

#### 3.2 Confirm login

1. Open backend logs and copy the magic link `token`.
2. Navigate to `/auth/confirm-login?token=<TOKEN>`.

**Expected:**
- Page shows "Confirm Login" button.
- Clicking the button shows loading spinner, then redirects to `/`.

**Verify in DevTools:**
- `POST /api/v1/auth/login/confirm` returns 200.
- New `refresh_token` and `auth_status` cookies are set.
- `GET /api/v1/auth/me` returns user data.

### 4. Session Persistence

1. Ensure you are logged in (navigate to `/` and the game loads).
2. Close the browser tab.
3. Reopen http://localhost:3000 in a new tab.

**Expected:**
- Page loads without redirecting to `/login`.
- `AuthGuard` shows `LoadingScreen` briefly.
- `GET /api/v1/auth/me` is called with the stored access token.
- If the access token expired, `POST /api/v1/auth/refresh` is called automatically, then `/me` is retried.
- Game renders after user data is loaded.

### 5. Logout & Logout All

#### 5.1 Logout

1. While logged in, trigger logout (implement a logout button in the UI or call `logout()` from `useAuth()`).

**Expected:**
- User is redirected to `/login`.
- `auth_status` cookie is removed.
- `refresh_token` cookie is cleared.

**Verify in DevTools:**
- `POST /api/v1/auth/logout` returns 200.
- `Set-Cookie` headers clear both cookies.

#### 5.2 Logout All

1. Log in on two different browsers (or normal + incognito).
2. In Browser A, trigger "Logout All Devices."

**Expected:**
- Both Browser A and Browser B are redirected to `/login`.

**Verify in Browser B:**
- On the next API call (or page refresh), `POST /auth/refresh` returns 401.
- `AuthContext` clears state and redirects to `/login`.

---

## Edge Cases & Error Scenarios

### Expired Magic Link

1. Request a magic link.
2. Wait 15 minutes (or manually expire the token in the database).
3. Navigate to the confirmation page and click "Confirm Login."

**Expected:**
- `POST /auth/login/confirm` returns 401 or 400.
- Frontend redirects to `/login?error=expired` with an error message.

### Reused Magic Link

1. Request a magic link.
2. Click the link and successfully log in.
3. Navigate back to the confirmation page and click "Confirm Login" again with the same token.

**Expected:**
- `POST /auth/login/confirm` returns 400.
- Frontend redirects to `/login?error=already_used`.

### Wrong Device (Magic Link)

1. Request a magic link in Browser A.
2. Copy only the `token` from the URL (not the cookie).
3. Paste the confirmation page URL into Browser B.

**Expected:**
- `POST /auth/login/confirm` returns 401 because the `login_attempt` cookie nonce does not match.
- Frontend redirects to `/login?error=wrong_device`.

### Email Pre-fetching

1. Request a magic link.
2. Paste the magic link URL into Slack, Discord, or any chat app that unfurls links.

**Expected:**
- The unfurl triggers a `GET` request, which only validates a preview.
- The token is **NOT** consumed.
- Clicking the link from the email still works normally.

### Concurrent 401s

1. Log in and wait for the access token to expire (15 minutes).
2. Trigger multiple API calls simultaneously (e.g., rapid button clicks or page load with multiple data fetches).

**Expected:**
- Only **one** `POST /auth/refresh` request is sent.
- All failed requests are retried with the new access token.
- No duplicate refresh calls in the Network tab.

### Blacklisted Access Token

1. Log in.
2. Copy the access token from memory (you can temporarily log it in the Axios interceptor).
3. Log out.
4. Try to use the copied access token in a `curl` request:

```bash
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <OLD_ACCESS_TOKEN>"
```

**Expected:**
- Response is 401 Unauthorized.
- The `jti` has been blacklisted.

---

## Security Verification

### Cookie Flags

Open DevTools → Application → Cookies → http://localhost:3000.

| Cookie | httpOnly | Secure | SameSite | Path |
|--------|----------|--------|----------|------|
| `refresh_token` | ✅ Yes | ✅ Yes | Strict | `/api/v1/auth` |
| `auth_status` | ❌ No | ✅ Yes | Lax | `/` |
| `login_attempt` | ✅ Yes | ✅ Yes | Lax | `/api/v1/auth` |

**Verify:**
- `refresh_token` is **NOT** readable from JavaScript (`document.cookie` does not include it).
- `auth_status` **IS** readable from JavaScript (needed for middleware and client-side checks).
- `Secure` flag may be missing on localhost (browsers allow this for local development).

### Access Token Storage

**Verify:**
- Open DevTools → Console.
- Type `localStorage.getItem('accessToken')` or `sessionStorage.getItem('accessToken')`.
- Expected: `null` (token is never stored in storage).
- The token only exists in the Axios interceptor closure / React state.

### XSS Defense

Since there is no password input field, traditional credential-stuffing and password XSS are eliminated. Verify that:
- No `<script>` tags or event handlers can be injected via the registration form.
- The nickname field rejects special characters (only alphanumeric + underscore allowed).

### Rate Limiting

#### Registration limit

```bash
for i in {1..5}; do
  curl -X POST http://localhost:3001/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{ "firstName": "Test", "lastName": "User", "dateOfBirth": "1995-06-15", "email": "ratelimit@example.com", "nickname": "ratelimit_'$i'" }'
done
```

**Expected:** After 3 requests from the same email within 1 hour, subsequent requests return **429 Too Many Requests**.

#### Login limit

```bash
for i in {1..7}; do
  curl -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{ "email": "ratelimit@example.com" }'
done
```

**Expected:** After 5 requests per email per hour, return 429.

---

## Cross-Tab Synchronization

1. Open http://localhost:3000 in **Tab A** and log in.
2. Open http://localhost:3000 in **Tab B** (same browser, different tab).

**Expected in Tab B:**
- Tab B detects the `auth_status` cookie on load.
- `GET /auth/me` succeeds without requiring a new login.

3. In **Tab A**, trigger Logout.

**Expected in Tab B:**
- Within 1–2 seconds, Tab B is redirected to `/login`.
- This is triggered by the `BroadcastChannel` (or `localStorage` fallback) `LOGOUT` event.

4. Test **Logout All** from Tab A.

**Expected:**
- All tabs redirect to `/login`.

---

## Rate Limiting

| Endpoint | Limit | Test Method |
|----------|-------|-------------|
| `POST /auth/register` | 3/hr per email | Rapid registration with same email |
| `POST /auth/login` | 5/hr per email | Rapid login requests with same email |
| `POST /auth/resend-verification` | 3/hr per email | Rapid resend requests |
| `POST /auth/refresh` | 30/min per IP | Rapid refresh calls |
| `GET /admin/*` | 30/min per IP | Rapid admin page loads |

**Verify:** When the limit is exceeded, the response is:
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## Troubleshooting

### Magic link email not appearing in logs

- Check that the backend container is running: `docker compose ps`
- Check that the email service is configured correctly in `.env`.
- If using the mock service, ensure `EMAIL_SERVICE=mock` is set.

### CORS errors in the browser

- Verify the backend `CORS_ORIGIN` includes `http://localhost:3000`.
- Verify `credentials: true` is set in the NestJS CORS config.
- The `Access-Control-Allow-Origin` header must NOT be `*` when cookies are used.

### Middleware not redirecting

- Check that the `auth_status` cookie is present in DevTools → Application → Cookies.
- If missing, verify that `POST /auth/login/confirm` or `POST /auth/verify-email/confirm` successfully set the cookie.
- Ensure the frontend and backend are on the same top-level domain (localhost is fine).

### Session not restoring after refresh

- Check DevTools → Network for `POST /api/v1/auth/refresh`.
- If it returns 401, the `refresh_token` cookie may be missing or expired.
- Verify the cookie is sent with the request (look for the `Cookie` header in the Network tab).

### "Wrong device" error

- This means the `login_attempt` cookie is missing or the nonce doesn't match.
- Ensure you are testing on the same browser/session where the magic link was requested.
- If testing with `curl`, you must pass the `-b` and `-c` flags to maintain cookies.

---

## Sign-Off Checklist

Before proceeding to Phase 11 (Automated Tests), verify all items below:

### Registration
- [ ] New user can register with valid data
- [ ] Duplicate email returns identical generic response (no enumeration)
- [ ] Invalid data shows validation errors
- [ ] Verification email is sent and logged
- [ ] Verification link preview (GET) does not consume token
- [ ] Verification confirmation (POST) activates account and sets cookies
- [ ] Resend verification works and is rate-limited

### Login
- [ ] Magic link request sends email and sets `login_attempt` cookie
- [ ] Magic link preview (GET) redirects to confirmation page without consuming token
- [ ] Magic link confirmation (POST) sets `refresh_token` and `auth_status` cookies
- [ ] Wrong device/cookie returns `wrong_device` error
- [ ] Expired link returns `expired` error
- [ ] Reused link returns `already_used` error
- [ ] Email pre-fetching does not consume token

### Session
- [ ] Access token is stored in memory only (not localStorage/sessionStorage)
- [ ] Refresh token rotation works (old token revoked, new token issued)
- [ ] Session restores after page refresh via refresh token
- [ ] Concurrent 401s result in a single refresh call
- [ ] Blacklisted access token returns 401

### Logout
- [ ] Logout revokes refresh token and clears cookies
- [ ] Logout-all revokes all refresh tokens and blacklists access token
- [ ] Cross-tab logout synchronizes across all tabs

### Middleware & Routing
- [ ] Unauthenticated user accessing `/` is redirected to `/login`
- [ ] Authenticated user accessing `/login` is redirected to `/`
- [ ] `auth_status` cookie is readable by JavaScript and middleware
- [ ] `refresh_token` cookie is httpOnly and not readable by JavaScript

### Admin
- [ ] Admin can list users
- [ ] Admin can update user role
- [ ] Admin can toggle user status
- [ ] Non-admin receives 403 on admin endpoints
- [ ] Inactive user cannot log in

### Rate Limiting
- [ ] Registration is rate-limited per email
- [ ] Login is rate-limited per email
- [ ] Refresh is rate-limited per IP

### Security
- [ ] All cookies have appropriate `SameSite`, `Secure`, and `httpOnly` flags
- [ ] No password fields exist in the UI or API
- [ ] No JWT secret or magic link secret is exposed in logs or responses
- [ ] Error messages do not leak sensitive information (e.g., "user not found")

---

*End of Manual Testing Guide*
