# Authentication & Authorization Implementation Plan

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Diagrams](#diagrams)
  - [Magic Link Login Flow (Sequence)](#1-magic-link-login-flow-sequence)
  - [Registration Flow (Sequence)](#2-registration-flow-sequence)
  - [Database Schema (ER Diagram)](#3-database-schema-er-diagram)
  - [User Authentication State Machine](#4-user-authentication-state-machine)
  - [Next.js Middleware Route Protection (Flowchart)](#5-nextjs-middleware-route-protection-flowchart)
- [Phase 1: Backend — Dependencies & Config](#phase-1-backend--dependencies--config)
- [Phase 2: Backend — Database Schema & Migrations](#phase-2-backend--database-schema--migrations)
- [Phase 3: Backend — Auth Module](#phase-3-backend--auth-module)
- [Phase 4: Backend — Admin Module](#phase-4-backend--admin-module)
- [Phase 5: Backend — Integration](#phase-5-backend--integration)
- [Phase 6: Frontend — Dependencies & Config](#phase-6-frontend--dependencies--config)
- [Phase 7: Frontend — Auth Types & Validation](#phase-7-frontend--auth-types--validation)
- [Phase 8: Frontend — API Client & Auth Context](#phase-8-frontend--api-client--auth-context)
- [Phase 9: Frontend — Auth Pages (MUI)](#phase-9-frontend--auth-pages-mui)
- [Phase 10: Frontend — Middleware & Route Protection](#phase-10-frontend--middleware--route-protection)
- [Phase 11: Testing](#phase-11-testing)
- [Implementation Order](#implementation-order)
- [Verification](#verification)
- [Architecture & Trade-offs](#architecture--trade-offs)
  - [Passwordless Magic Link vs. Password-Based Authentication](#1-passwordless-magic-link-vs-password-based-authentication)
  - [Two-Step Magic Link Confirmation](#2-two-step-magic-link-confirmation)
  - [Device-Bound Magic Links vs. Universal Magic Links](#3-device-bound-magic-links-vs-universal-magic-links)
  - [Verification Link Auto-Login vs. Redirect to Login Page](#4-verification-link-auto-login-vs-redirect-to-login-page)
  - [Access Token in Memory vs. localStorage](#5-access-token-in-memory-vs-localstorage)
  - [`auth_status` Cookie vs. Access Token in Middleware](#6-auth_status-cookie-vs-access-token-in-middleware)
  - [In-Memory Token Blocklist vs. Redis](#7-in-memory-token-blocklist-vs-redis)
  - [Opaque Refresh Tokens vs. JWT Refresh Tokens](#8-opaque-refresh-tokens-vs-jwt-refresh-tokens)
  - [Refresh Token Reuse Detection](#9-refresh-token-reuse-detection)
  - [Separate `magic_link_tokens` Table vs. Extending `refresh_tokens`](#10-separate-magic_link_tokens-table-vs-extending-refresh_tokens)
  - [Email-Based Rate Limiting](#11-email-based-rate-limiting)
  - [Profile Immutability vs. Editable Profiles](#12-profile-immutability-vs-editable-profiles)
  - [No Password Reset Flow](#13-no-password-reset-flow)
  - [Cookie SameSite Strategy](#14-cookie-samesite-strategy)
  - [Email as Immutable Identifier](#15-email-as-immutable-identifier)
  - [Log Out All Devices](#16-log-out-all-devices)
  - [No Age Verification](#17-no-age-verification)
  - [No Admin Audit Logging](#18-no-admin-audit-logging)
  - [SHA-256 Token Hashing](#19-sha-256-token-hashing)
  - [Security Headers Deferred](#20-security-headers-deferred)
  - [Threat Model Summary](#21-threat-model-summary)
- [Key Design Decisions](#key-design-decisions)

---

## Architecture Overview

**Token Strategy:** Access token (JWT, 15min) stored in JS memory with a unique `jti` claim. Refresh token (opaque random string, 7d) stored in an httpOnly/Secure/SameSite=Strict cookie and rotated on each use. A lightweight `auth_status` cookie (non-httpOnly, SameSite=Lax) enables Next.js middleware route protection.

**Auth Flow (Magic Link):**
1. User enters email on login page → frontend calls `POST /auth/login`
2. Backend generates a single-use magic link token (15min expiry), stores SHA-256 hash in `magic_link_tokens`, and sends it via email
3. Backend sets a short-lived `login_attempt` cookie (15min, httpOnly, Secure, SameSite=Lax) containing a signed nonce
4. The magic link URL includes the token and the nonce: `GET /auth/login?token=xyz&nonce=abc`
5. User clicks the link from email → backend validates the token (preview check), verifies the nonce matches the `login_attempt` cookie, and redirects to the frontend confirmation page
6. Frontend renders "Confirm Login" page; user clicks button → `POST /auth/login/confirm` (cookie sent automatically)
7. Backend validates the token again, marks it as used, sets `refresh_token` & `auth_status` cookies, issues a new access token, and redirects to `/`
8. On token failure (expired, wrong device, already used, unverified) → redirect to `/login?error=<reason>`
9. Axios interceptor attaches Bearer token to all API requests
10. On 401 → interceptor calls `POST /auth/refresh` (cookie sent automatically) → new access token
11. On refresh failure (including reuse detection) → clear state, remove `auth_status` cookie, redirect to `/login`
12. Next.js middleware reads `auth_status` cookie for route protection (no sensitive data in this cookie)

**Registration Flow:**
1. User fills registration form (firstName, lastName, dateOfBirth, email, nickname) → `POST /auth/register`
2. Backend creates user with `isEmailVerified = false`, generates verification token, stores in `magic_link_tokens`
3. Backend sends verification email with link: `GET /auth/verify-email?token=xyz`
4. User clicks verification link from email → backend validates token (preview), redirects to frontend confirmation page
5. User clicks "Verify Email" → `POST /auth/verify-email/confirm` → backend marks email verified, activates account, sets auth cookies, sends welcome email, redirects to `/`
6. If email already exists → return identical generic response (no enumeration leak, no notice email)

**Logout Flow:**
1. `POST /auth/logout` reads the `refresh_token` cookie (no JWT required). Revokes the refresh token in the database, clears all auth cookies. If an `Authorization` header with an access token is present, the token is blacklisted via its `jti`.
2. `POST /auth/logout-all` requires a valid JWT. Revokes ALL refresh tokens for the authenticated user and blacklists the current access token `jti`.

---

## Diagrams

### 1. Magic Link Login Flow (Sequence)

```mermaid
sequenceDiagram
    actor U as User
    participant M as Email Client
    participant F as Frontend (Next.js)
    participant B as Backend (NestJS)
    participant E as Email Service
    participant DB as Database

    U->>F: Enter email, click "Send Magic Link"
    F->>B: POST /api/v1/auth/login<br/>{ email }

    B->>DB: Find user by email
    alt User not found / inactive / unverified
        B-->>F: 200 { message: "Check your email" }
    else User found, active, verified
        B->>B: Generate random token + nonce
        B->>DB: INSERT magic_link_tokens<br/>(type: magic_link, SHA-256 hash, nonce, expiry)
        B->>B: Set login_attempt cookie<br/>(signed nonce, 15min, httpOnly, SameSite=Lax)
        B->>E: Send magic link email<br/>URL: /auth/login?token=xyz&nonce=abc
        B-->>F: 200 { message: "Check your email" }
    end

    F-->>U: Show "Check your email" + countdown timer

    U->>M: Open email, click magic link
    M->>B: GET /api/v1/auth/login?token=xyz&nonce=abc

    B->>B: Read login_attempt cookie<br/>Verify nonce signature
    alt Cookie missing / nonce mismatch
        B-->>F: 302 Redirect /login?error=wrong_device
    else Cookie valid
        B->>DB: Find magic_link_token by SHA-256 hash<br/>(type: magic_link)
        alt Token not found / expired / already used
            B-->>F: 302 Redirect /login?error=expired
        else Token valid
            B-->>F: 302 Redirect /auth/confirm-login?token=xyz
        end
    end

    F-->>U: Render "Confirm Login" page
    U->>F: Click "Confirm Login"
    F->>B: POST /api/v1/auth/login/confirm<br/>{ token: "xyz" }<br/>(login_attempt cookie sent)

    B->>B: Read login_attempt cookie<br/>Verify nonce signature matches token.deviceNonce
    B->>DB: Find magic_link_token by hash<br/>Check not expired, not used
    B->>DB: Mark token as used (usedAt = now)
    B->>DB: INSERT refresh_tokens<br/>(SHA-256 hash of opaque token, 7 day expiry)
    B->>B: Generate JWT access token (15min) with jti claim
    B->>B: Set refresh_token cookie<br/>(7 days, httpOnly, Strict)
    B->>B: Set auth_status cookie<br/>(7 days, Lax)
    B->>E: Send login notification email
    B-->>F: 200 { redirectTo: "/" }

    F->>B: GET /api/v1/auth/me<br/>Authorization: Bearer <access_token>
    B-->>F: 200 { user }

    F-->>U: Render authenticated game page

    Note right of B: Access token expires (15min)
    F->>B: GET /api/v1/auth/me<br/>Bearer: <expired_token>
    B-->>F: 401 Unauthorized

    F->>B: POST /api/v1/auth/refresh<br/>(refresh_token cookie sent automatically)
    B->>DB: Validate refresh token (hash lookup)<br/>Check user isActive & isEmailVerified
    alt Token revoked (reuse detected)
        B->>DB: Revoke ALL refresh tokens for user
        B-->>F: 401 Unauthorized (reuse detected)
    else Token valid
        B->>DB: Rotate: mark old revoked, insert new
        B->>B: Set new refresh_token cookie
        B-->>F: 200 { accessToken }
    end

    F->>B: GET /api/v1/auth/me<br/>Bearer: <new_access_token>
    B-->>F: 200 { user }
```

### 2. Registration Flow (Sequence)

```mermaid
sequenceDiagram
    actor U as User
    participant M as Email Client
    participant F as Frontend (Next.js)
    participant B as Backend (NestJS)
    participant E as Email Service
    participant DB as Database

    U->>F: Fill registration form
    U->>F: Submit (firstName, lastName, DOB, email, nickname)
    F->>B: POST /api/v1/auth/register<br/>{ firstName, lastName, dateOfBirth, email, nickname }

    B->>DB: Check email uniqueness
    alt Email already exists
        B-->>F: 200 { message: "Check your email" }
    else Email available
        B->>DB: INSERT users<br/>(isEmailVerified=false, isActive=true)
        B->>B: Generate verification token
        B->>DB: INSERT magic_link_tokens<br/>(type: verification, SHA-256 hash, expiry)
        B->>E: Send verification email<br/>URL: /auth/verify-email?token=xyz
        B-->>F: 200 { message: "Check your email" }
    end

    F-->>U: Show "Check your email to verify"

    U->>M: Open email, click verification link
    M->>B: GET /api/v1/auth/verify-email?token=xyz

    B->>DB: Find magic_link_token by SHA-256 hash<br/>(type: verification)
    alt Token not found / expired / already used
        B-->>F: 302 Redirect /login?error=expired
    else Token valid
        B-->>F: 302 Redirect /auth/confirm-verification?token=xyz
    end

    F-->>U: Render "Verify Email" page
    U->>F: Click "Verify Email"
    F->>B: POST /api/v1/auth/verify-email/confirm<br/>{ token: "xyz" }

    B->>DB: Find magic_link_token by hash<br/>Check not expired, not used
    B->>DB: Mark token as used
    B->>DB: UPDATE users<br/>SET isEmailVerified=true<br/>WHERE id = userId
    B->>DB: INSERT refresh_tokens<br/>(SHA-256 hash, 7 day expiry)
    B->>B: Generate JWT access token with jti
    B->>B: Set refresh_token cookie
    B->>B: Set auth_status cookie
    B->>E: Send welcome email
    B-->>F: 200 { redirectTo: "/" }

    F-->>U: Render authenticated game page
```

### 3. Database Schema (ER Diagram)

```mermaid
erDiagram
    USER {
        uuid id PK
        string email UK
        string nickname UK
        string firstName
        string lastName
        date dateOfBirth
        enum role "player|institution|admin"
        boolean isEmailVerified
        boolean isActive
        datetime lastLoginAt
        datetime createdAt
        datetime updatedAt
    }

    REFRESH_TOKEN {
        uuid id PK
        string token "SHA-256 hashed"
        uuid userId FK
        datetime expiresAt
        datetime revokedAt
        string replacedByToken
        datetime createdAt
        string userAgent
        string ipAddress
    }

    MAGIC_LINK_TOKEN {
        uuid id PK
        string token "SHA-256 hashed"
        enum type "magic_link|verification"
        uuid userId FK
        datetime expiresAt
        datetime usedAt
        string deviceNonce
        datetime createdAt
        string userAgent
        string ipAddress
    }

    USER ||--o{ REFRESH_TOKEN : has
    USER ||--o{ MAGIC_LINK_TOKEN : has
```

### 4. User Authentication State Machine

```mermaid
stateDiagram-v2
    [*] --> Unregistered

    Unregistered --> Unverified : POST /register
    note right of Unregistered
        Profile created
        isEmailVerified=false
    end note

    Unverified --> Authenticated : POST /verify-email/confirm<br/>(valid token)
    note right of Unverified
        Email verified
        Auto-login after confirmation
    end note

    Unverified --> [*] : Token expired<br/>(no action)

    Authenticated --> Authenticated : POST /refresh<br/>(valid refresh cookie)
    note right of Authenticated
        Access token refreshed
        Session continues
    end note

    Authenticated --> LoggedOut : POST /logout
    note right of LoggedOut
        Refresh token revoked
        Cookies cleared
    end note

    Authenticated --> LoggedOut : POST /logout-all
    note left of LoggedOut
        All refresh tokens revoked
        All sessions terminated
    end note

    LoggedOut --> Authenticated : Magic link login
    note left of LoggedOut
        POST /login → email
        GET /login?token → preview
        POST /login/confirm → valid
    end note

    LoggedOut --> [*] : Abandon session
```

### 5. Next.js Middleware Route Protection (Flowchart)

```mermaid
flowchart TD
    A[Incoming Request] --> B{Path matches<br/>protected route?}

    B -->|Yes| C{Has auth_status<br/>cookie?}
    B -->|No| D{Path matches<br/>guest route?}

    C -->|Yes| E[Allow Request]
    C -->|No| F[Redirect to /login?redirect=path]

    D -->|Yes| G{Has auth_status<br/>cookie?}
    D -->|No| E

    G -->|Yes| H[Redirect to /]
    G -->|No| E

    E --> I[Continue to page]
    F --> J[Login page rendered]
    H --> I

    style E fill:#90EE90
    style F fill:#FFB6C1
    style H fill:#FFB6C1
```

---

**Page Load / Session Restore:**
1. AuthProvider mounts → checks for `auth_status` cookie
2. If present → calls `GET /auth/me` with any stored access token
3. If `/me` returns 401 → tries `POST /auth/refresh` (cookie sent automatically)
4. If refresh succeeds → store new access token, set user state
5. If refresh fails (including reuse detection) → clear all state, remove `auth_status` cookie, redirect to `/login`

**Game Auth:** Phaser game communicates with backend through the React shell. The React shell's Axios interceptor handles auth headers. Phaser dispatches events → React shell makes API calls → returns data to Phaser.

---

## Phase 1: Backend — Dependencies & Config

### Install dependencies
```bash
cd back && npm add @nestjs/passport @nestjs/jwt @nestjs/throttler passport passport-jwt cookie-parser && npm add -D @types/passport-jwt
```

> Note: `bcryptjs` and `@types/bcryptjs` are **removed** — passwordless auth does not need password hashing. Token hashing uses SHA-256 (native Node.js `crypto`).

### Files to create/modify

| File | Purpose |
|------|---------|
| `back/src/core/config/config.service.ts` | Add to Zod schema: `JWT_SECRET`, `JWT_EXPIRATION` (default "15m"), `JWT_ISSUER` (default "gameplate"), `MAGIC_LINK_EXPIRATION_MIN` (default 15), `MAGIC_LINK_SECRET` (for signing cookie nonce) |
| `back/.env.example` | Add all new env vars with defaults |
| `back/src/core/email/email.module.ts` | Email module with mock provider |
| `back/src/core/email/interfaces/email-service.interface.ts` | `IEmailService` interface: `sendMagicLinkEmail()`, `sendVerificationEmail()`, `sendWelcomeEmail()`, `sendLoginNotificationEmail()` |
| `back/src/core/email/services/mock-email.service.ts` | Console.log implementation of IEmailService |
| `back/src/core/email/email.constants.ts` | DI token `EMAIL_SERVICE` |

### Environment variables to add
```
JWT_SECRET=change-me-in-production
JWT_EXPIRATION=15m
JWT_ISSUER=gameplate
MAGIC_LINK_SECRET=change-me-in-production
MAGIC_LINK_EXPIRATION_MIN=15
```

> **Removed env vars:** `REFRESH_SECRET`, `REFRESH_EXPIRATION` — refresh tokens are opaque random strings, not JWTs. Expiry is handled by the database `expiresAt` column (default 7 days).

---

## Phase 2: Backend — Database Schema & Migrations

> **Assumption:** This is a fresh database with no existing password-based users. See [Key Design Decisions](#key-design-decisions) for the documented decision.

### TypeORM CLI Setup

| File | Purpose |
|------|---------|
| `back/src/database/data-source.ts` | TypeORM DataSource config for CLI (used by migration commands) |
| `back/package.json` | Add scripts: `migration:generate`, `migration:run`, `migration:revert` |

### Entities

| File | Purpose |
|------|---------|
| `back/src/modules/users/enums/role.enum.ts` | `Role` enum: `Player = 'player'`, `Institution = 'institution'`, `Admin = 'admin'` |
| `back/src/modules/auth/enums/magic-link-token-type.enum.ts` | `MagicLinkTokenType` enum: `MagicLink = 'magic_link'`, `Verification = 'verification'` |
| `back/src/modules/auth/enums/jwt-token-type.enum.ts` | `JwtTokenType` enum: `Access = 'access'` |
| `back/src/modules/users/user.entity.ts` | **MODIFY EXISTING.** Add columns: `firstName` (string), `lastName` (string), `nickname` (string, unique), `dateOfBirth` (Date), `role` (Role enum, default Player), `isEmailVerified` (boolean, default false), `isActive` (boolean, default true), `lastLoginAt` (Date, nullable). **Remove columns:** `password`, `emailVerificationToken`, `emailVerificationTokenExpires`, `passwordResetToken`, `passwordResetTokenExpires`, `failedLoginAttempts`, `lockedUntil` |
| `back/src/modules/auth/entities/refresh-token.entity.ts` | New entity: `id` (uuid), `token` (string, SHA-256 hashed), `user` (ManyToOne → User), `expiresAt` (Date), `revokedAt` (Date, nullable), `replacedByToken` (string, nullable), `createdAt` (Date), `userAgent` (string, nullable), `ipAddress` (string, nullable) |
| `back/src/modules/auth/entities/magic-link-token.entity.ts` | New entity: `id` (uuid), `token` (string, SHA-256 hashed), `type` (MagicLinkTokenType enum), `user` (ManyToOne → User), `expiresAt` (Date), `usedAt` (Date, nullable), `deviceNonce` (string, nullable), `createdAt` (Date), `userAgent` (string, nullable), `ipAddress` (string, nullable) |

### Migrations

| File | Purpose |
|------|---------|
| `back/src/database/migrations/<timestamp>_AddProfileFieldsToUser.ts` | Add `firstName`, `lastName`, `nickname` (unique), `dateOfBirth`, `role`, `isEmailVerified`, `isActive`, `lastLoginAt`. Remove password-related columns. |
| `back/src/database/migrations/<timestamp>_CreateRefreshTokensTable.ts` | Create `refresh_tokens` table with FK to `users`. Index on `token` (hashed) and `userId`. |
| `back/src/database/migrations/<timestamp>_CreateMagicLinkTokensTable.ts` | Create `magic_link_tokens` table with FK to `users`. Index on `token` (hashed) and `type`. |

### Module update

| File | Purpose |
|------|---------|
| `back/src/modules/users/users.module.ts` | **MODIFY EXISTING.** Add `UserService` provider, export it along with User repository |

---

## Phase 3: Backend — Auth Module

### DTOs

| File | Purpose |
|------|---------|
| `back/src/modules/auth/dto/register.dto.ts` | `firstName` (string), `lastName` (string), `dateOfBirth` (ISO date), `email` (email format), `nickname` (string, 3-30 chars, alphanumeric + underscore) |
| `back/src/modules/auth/dto/login.dto.ts` | `email` (email format) |
| `back/src/modules/auth/dto/login-confirm.dto.ts` | `token` (string) — used by `POST /auth/login/confirm` |
| `back/src/modules/auth/dto/verify-email-confirm.dto.ts` | `token` (string) — used by `POST /auth/verify-email/confirm` |
| `back/src/modules/auth/dto/resend-verification.dto.ts` | `email` (email format) |
| `back/src/modules/auth/dto/auth-response.dto.ts` | `accessToken` (string), `user` ({ id, email, nickname, firstName, lastName, role, isEmailVerified }) |

> **Removed DTOs:** `forgot-password.dto.ts`, `reset-password.dto.ts`, `verify-email.dto.ts` (replaced by confirm DTOs) — not needed for passwordless auth.

### Interfaces

| File | Purpose |
|------|---------|
| `back/src/modules/auth/interfaces/jwt-payload.interface.ts` | `sub` (userId), `email`, `role` (Role), `type` ('access'), `jti` (UUID), `iss`, `iat`, `exp` |
| `back/src/modules/auth/interfaces/request-with-user.interface.ts` | Express Request + `user` property |

### Services

| File | Purpose |
|------|---------|
| `back/src/modules/auth/services/auth.service.ts` | `register()` → create user with `isEmailVerified=false`, generate verification token, send verification email. Returns generic 200 in all cases. `login()` → validate email exists & is active & verified, generate magic link token, set `login_attempt` cookie with nonce, send magic link email. Returns generic 200 in all cases. `confirmMagicLinkLogin()` → validate magic link token, verify `login_attempt` cookie nonce matches the token's stored `deviceNonce`, mark token used, set auth cookies, send login notification email. `confirmVerifyEmail()` → validate verification token, mark `isEmailVerified=true`, set auth cookies, send welcome email. `logout()` → read `refresh_token` cookie, revoke refresh token, clear cookies, blacklist access token `jti` if Authorization header present. `logoutAll()` → revoke all refresh tokens for user, blacklist current access token `jti`, clear auth cookies. `resendVerificationEmail()` → regenerate verification token + send email. |
| `back/src/modules/auth/services/token.service.ts` | `generateAccessToken()` → JWT with {sub, email, role, type:'access', jti, iss, iat, exp}. `generateRefreshToken()` → create RefreshToken entity with SHA-256 hash of a cryptographically random 64-byte opaque token. Returns the raw token to be set in the cookie. `verifyAccessToken()` → validate JWT signature + check blocklist by `jti`. `rotateRefreshToken()` → validate opaque token by SHA-256 hash, check user isActive & isEmailVerified, detect reuse (if revoked → revoke all for user), invalidate old + issue new. `revokeRefreshToken()` → mark revoked. `revokeAllUserTokens()` → revoke all refresh tokens for a user. `addToBlacklist()` → add `jti` to in-memory Map with TTL. `isTokenBlacklisted()` → check Map by `jti`. |
| `back/src/modules/auth/services/magic-link.service.ts` | `createMagicLink()` → generate random secure string (64 bytes URL-safe base64), SHA-256 hash it, store in `magic_link_tokens` with type and nonce. `validateTokenPreview()` → find by hash, check not expired, check not used, check type matches. Used by GET endpoints (does NOT mark used). `validateTokenConsumption()` → same as preview but also marks `usedAt`. `revokeToken()` → mark used (prevents replay). `cleanupExpired()` → remove old expired tokens (scheduled job or on-demand) |

> **Removed services:** `password.service.ts` (no passwords), `lockout.service.ts` (no password brute-force risk).

### Strategies & Guards

| File | Purpose |
|------|---------|
| `back/src/modules/auth/strategies/jwt-access.strategy.ts` | Passport JWT strategy: extract from Authorization header, validate payload, check blocklist by `jti` |
| `back/src/modules/auth/guards/jwt-auth.guard.ts` | Guard using jwt-access strategy |
| `back/src/modules/auth/guards/roles.guard.ts` | RBAC guard: check `@Roles()` metadata against `user.role` |
| `back/src/modules/auth/guards/verified-email.guard.ts` | Check `user.isEmailVerified`. **Exists but NOT applied globally — available for selective use later** |

> **Removed:** `jwt-refresh.strategy.ts`, `jwt-refresh.guard.ts` — refresh tokens are opaque, not JWTs.

### Decorators

| File | Purpose |
|------|---------|
| `back/src/modules/auth/decorators/current-user.decorator.ts` | `@CurrentUser()` — extract user from request |
| `back/src/modules/auth/decorators/roles.decorator.ts` | `@Roles(...roles: Role[])` — set required roles metadata |
| `back/src/modules/auth/decorators/public.decorator.ts` | `@Public()` — skip JWT guard |
| `back/src/modules/auth/decorators/verified-email.decorator.ts` | `@RequireVerifiedEmail()` — require email verification on specific routes |

### Controller

| File | Purpose |
|------|---------|
| `back/src/modules/auth/controllers/auth.controller.ts` | All auth endpoints (see API contract below) |

### Module

| File | Purpose |
|------|---------|
| `back/src/modules/auth/auth.module.ts` | Wire up all providers, controllers, imports (PassportModule, JwtModule, UsersModule, EmailModule, ThrottlerModule) |

### API Endpoints (all prefixed `/api/v1/auth`)

| Method | Path | Auth | Rate Limit | Purpose |
|--------|------|------|------------|---------|
| POST | /register | Public | 3/hr per email | Register new user, send verification email. Returns generic 200 regardless of email existence. |
| POST | /login | Public | 5/hr per email | Request magic link login email, set `login_attempt` cookie |
| GET | /login | Public | — | Validate magic link token preview & nonce, redirect to frontend confirmation page |
| POST | /login/confirm | Cookie | — | Consume magic link token, set cookies, redirect to `/` |
| POST | /logout | Cookie | — | Revoke refresh token, clear cookies, blacklist access token `jti` if present |
| POST | /logout-all | JWT | — | Revoke all refresh tokens for user, blacklist current access token `jti` |
| POST | /refresh | Cookie | 30/min per IP | Rotate refresh token. Checks user isActive & isEmailVerified. Detects reuse. |
| GET | /me | JWT | — | Get current user |
| GET | /verify-email | Public | — | Validate verification token preview, redirect to frontend confirmation page |
| POST | /verify-email/confirm | Public | — | Consume verification token, activate account, set cookies, redirect to `/` |
| POST | /resend-verification | Public | 3/hr per email | Resend verification email |

> **Removed endpoints:** `/forgot-password`, `/reset-password` — not needed for passwordless auth.

### Cookie Configuration

| Cookie | httpOnly | Secure | SameSite | Path | Max-Age | Purpose |
|--------|----------|--------|----------|------|---------|---------|
| `refresh_token` | Yes | Yes | Strict | `/api/v1/auth` | 7 days | Opaque refresh token (sent to /refresh, /logout, /logout-all) |
| `auth_status` | No | Yes | Lax | `/` | 7 days | Boolean flag for middleware route protection |
| `login_attempt` | Yes | Yes | Lax | `/api/v1/auth` | 15 min | Signed nonce for magic link device binding |

> **Change:** `login_attempt` changed from `SameSite=Strict` to `SameSite=Lax` to ensure the cookie is sent when the user clicks the magic link from an email client (cross-site top-level navigation). The device-binding security boundary is enforced by nonce signature verification, not by SameSite.

**auth_status cookie value:** `authenticated` (simple string, not JSON — no PII)

**login_attempt cookie value:** Signed JWT or HMAC containing `{ nonce: string, email: string, iat, exp }`

### JWT Access Token Payload

```json
{
  "sub": "uuid",
  "email": "user@example.com",
  "role": "player",
  "type": "access",
  "jti": "550e8400-e29b-41d4-a716-446655440000",
  "iss": "gameplate",
  "iat": 1234567890,
  "exp": 1234568790
}
```

> **Addition:** `jti` (JWT ID) is a cryptographically random UUIDv4. It enables unambiguous O(1) blocklist lookups and prevents collisions during concurrent token issuance.

---

## Phase 4: Backend — Admin Module

> **Note:** Admin audit logging is explicitly deferred. See [Key Design Decisions](#key-design-decisions).

| File | Purpose |
|------|---------|
| `back/src/modules/admin/dto/list-users-query.dto.ts` | `page` (default 1), `limit` (default 20, max 100), `search` (optional), `role` (optional Role filter), `isActive` (optional boolean) |
| `back/src/modules/admin/dto/update-role.dto.ts` | `role`: Role enum |
| `back/src/modules/admin/dto/toggle-user-status.dto.ts` | `isActive`: boolean |
| `back/src/modules/admin/services/admin.service.ts` | `listUsers()`, `getUserById()`, `updateUserRole()`, `toggleUserStatus()` |
| `back/src/modules/admin/controllers/admin.controller.ts` | Admin CRUD endpoints, guarded with `@Roles(Role.Admin)` |
| `back/src/modules/admin/admin.module.ts` | Module assembly |

### Admin Endpoints (prefixed `/api/v1/admin`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | /users | Admin | List users with pagination |
| GET | /users/:id | Admin | Get user details |
| PATCH | /users/:id/role | Admin | Change user role |
| PATCH | /users/:id/status | Admin | Activate/deactivate |

---

## Phase 5: Backend — Integration

| File | Purpose |
|------|---------|
| `back/src/core/guards/global-jwt.guard.ts` | Global JWT guard with `@Public()` bypass support |
| `back/src/core/filters/auth-exception.filter.ts` | Format auth errors (401, 403) using NestJS default format |
| `back/src/modules/auth/config/cookie.config.ts` | Centralized cookie options factory (different configs for dev vs prod) |
| `back/src/app.module.ts` | **MODIFY.** Import AuthModule, AdminModule, ThrottlerModule |
| `back/src/main.ts` | **MODIFY.** Register cookie-parser middleware, bind global guards/filters, configure ThrottlerModule |

### CORS Update

The existing CORS config in `main.ts` already has `credentials: true`. **Additionally**, the `origin` must be explicitly set to the frontend domain (e.g., `https://gameplate.com`), NOT `*`. Browsers reject cookies when `Access-Control-Allow-Origin: *` and `credentials: true` are combined.

### Rate Limiting Configuration

Using `@nestjs/throttler`:
- Global default: 100 req/min per IP
- Auth endpoints override:
  - `POST /auth/register`: 3 per email per hour (custom throttle decorator)
  - `POST /auth/login`: 5 per email per hour (custom throttle decorator)
  - `POST /auth/resend-verification`: 3 per email per hour (custom throttle decorator)
  - `POST /auth/refresh`: 30 per IP per minute
- Admin endpoints: 30 req/min per IP

> **Note:** Email-based throttling is implemented via a custom Throttler guard that uses the request body email as the tracker key. IP-based throttling uses the request IP.

### Security Headers

> **Deferred:** `helmet` and security headers (HSTS, CSP, X-Frame-Options) are explicitly deferred to a future infrastructure task. See [Key Design Decisions](#key-design-decisions).

---

## Phase 6: Frontend — Dependencies & Config

### Install dependencies
```bash
cd front && npm add @mui/material @emotion/react @emotion/styled @mui/icons-material axios js-cookie react-hook-form @hookform/resolvers && npm add -D @types/js-cookie
```

### Files to create/modify

| File | Purpose |
|------|---------|
| `front/src/lib/env.ts` | **MODIFY.** Add `NEXT_PUBLIC_AUTH_STATUS_COOKIE_NAME` (default `"auth_status"`) |
| `front/src/lib/theme.ts` | MUI theme configuration with game-appropriate colors |

---

## Phase 7: Frontend — Auth Types & Validation

| File | Purpose |
|------|---------|
| `front/src/lib/auth/types.ts` | `User` ({ id, email, nickname, firstName, lastName, role, isEmailVerified }), `AuthState`, `LoginCredentials`, `RegisterCredentials`, `ResendVerificationData`, `LoginConfirmData`, `VerifyEmailConfirmData` |
| `front/src/lib/auth/validation.ts` | Zod schemas: `loginSchema` (email only), `registerSchema` (firstName, lastName, dateOfBirth, email, nickname, nickname 3-30 chars alphanumeric + underscore), `resendVerificationSchema`, `tokenConfirmSchema` |

> **Removed:** `password-validation.ts`, `forgotPasswordSchema`, `resetPasswordSchema` — no passwords.

---

## Phase 8: Frontend — API Client & Auth Context

| File | Purpose |
|------|---------|
| `front/src/lib/api/client.ts` | Axios instance: baseURL from env, `withCredentials: true`. Request interceptor: attach Bearer token from memory. Response interceptor: on 401 → queue requests, call `/auth/refresh`, retry all queued. On refresh failure (including reuse detection 401) → clear state, redirect to `/login`. |
| `front/src/lib/api/auth.ts` | `login(email)` → request magic link, `confirmLogin(token)` → POST /login/confirm, `register(data)` → create account, `logout()`, `logoutAll()`, `refreshToken()`, `resendVerification(email)`, `me()`, `confirmVerifyEmail(token)` |
| `front/src/lib/api/errors.ts` | `AuthError` base class, `InvalidCredentialsError`, `TokenExpiredError`, `AccountNotVerifiedError`, `EmailExistsError`, `TokenReuseDetectedError` |
| `front/src/lib/auth/AuthContext.tsx` | `AuthProvider` + `useAuth` hook. State: user, isAuthenticated, isLoading, accessToken (in memory). On mount: check auth_status cookie → call `/me`. Methods: login, confirmLogin, register, logout, logoutAll. Integrates cross-tab sync. |
| `front/src/lib/auth/cookies.ts` | `setAuthStatusCookie()`, `clearAuthStatusCookie()`, `hasAuthStatusCookie()`. Uses `js-cookie` library. |
| `front/src/lib/auth/useAuth.ts` | Re-export of `useAuth` from context with runtime safety check (throws if used outside provider) |
| `front/src/lib/auth/useRedirectIfAuth.ts` | Hook for guest routes: redirect to `/` if already authenticated |
| `front/src/lib/auth/sync.ts` | `BroadcastChannel`-based cross-tab auth sync. Events: LOGIN, LOGOUT, LOGOUT_ALL. Fallback: `localStorage` event for older browsers. |

### Axios Interceptor Detail

The interceptor must handle concurrent 401s:
1. First 401 → start refresh, queue all other 401s
2. Refresh succeeds → retry all queued requests with new token
3. Refresh fails (including reuse detection) → reject all queued requests, clear auth state, redirect to `/login`
4. Use a `Promise` variable to prevent duplicate refresh calls

---

## Phase 9: Frontend — Auth Pages (MUI)

| File | Purpose |
|------|---------|
| `front/src/app/(auth)/layout.tsx` | Shared auth layout: centered card with game logo/branding, MUI `Container` + `Paper` |
| `front/src/app/(auth)/login/page.tsx` | Login page with `useRedirectIfAuth()`. Shows email input + submit. After submit → "Check your email" state with countdown timer. |
| `front/src/components/auth/LoginForm.tsx` | MUI form: email, submit button, loading state, error alert, links to register. No password field. After successful submit → show "Check your email for a magic link" with 60-second countdown before allowing resend. |
| `front/src/app/(auth)/confirm-login/page.tsx` | Magic link confirmation page. Reads `token` from query param. Shows "Confirm Login" button. Calls `POST /auth/login/confirm` on click. |
| `front/src/app/(auth)/register/page.tsx` | Register page with `useRedirectIfAuth()` |
| `front/src/components/auth/RegisterForm.tsx` | MUI form: firstName, lastName, dateOfBirth (date picker), email, nickname (with uniqueness check), submit button, loading state, error alert. After submit → "Check your email to verify your account." |
| `front/src/app/(auth)/confirm-verification/page.tsx` | Email verification confirmation page. Reads `token` from query param. Shows "Verify Email" button. Calls `POST /auth/verify-email/confirm` on click. |
| `front/src/app/(auth)/verify-email/page.tsx` | Handles verification redirect errors (`?error=expired`, `?error=already_used`). |
| `front/src/components/auth/AuthGuard.tsx` | Client-side guard: show `LoadingScreen` while loading, render children if authenticated, redirect if not |
| `front/src/components/LoadingScreen.tsx` | MUI `CircularProgress` centered full-screen |
| `front/src/components/ToastProvider.tsx` | MUI `Snackbar` + `Alert` provider for success/error notifications |

> **Removed pages/components:** `forgot-password/page.tsx`, `reset-password/page.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `PasswordStrengthIndicator.tsx` — no passwords.

### Root Layout Update

| File | Purpose |
|------|---------|
| `front/src/app/layout.tsx` | **MODIFY.** Wrap children with: `AppRouterCacheProvider` (MUI Next.js), `ThemeProvider`, `CssBaseline`, `AuthProvider`, `ToastProvider` |

### Game Page Update

| File | Purpose |
|------|---------|
| `front/src/app/page.tsx` | **MODIFY.** Wrap `PhaserGame` in `AuthGuard`. Pass user info to game via props/callbacks. |

---

## Phase 10: Frontend — Middleware & Route Protection

| File | Purpose |
|------|---------|
| `front/src/middleware.ts` | Next.js middleware for route protection |

**Middleware logic:**
```
1. Check if request path matches protected route pattern (/ and future game routes)
2. If protected AND no auth_status cookie → redirect to /login?redirect=<original_path>
3. Check if request path matches guest route (/login, /register, /verify-email, /confirm-login, /confirm-verification)
4. If guest AND has auth_status cookie → redirect to /
5. All other routes (including /api/v1/*) → pass through
```

**Important:** The `auth_status` cookie is NOT httpOnly, so Next.js middleware (Edge runtime) can read it via `request.cookies.get('auth_status')`. It contains no PII — just the string `"authenticated"`.

---

## Phase 11: Testing

### Backend Tests

| File | Scope |
|------|-------|
| `back/src/modules/auth/services/auth.service.spec.ts` | Register (generic 200, no enumeration), login (request magic link, generic 200), confirm magic link (device binding, nonce check), confirm verify email (activate + auto-login), logout (cookie-based, no JWT required), logout-all (revokes all tokens), resend verification |
| `back/src/modules/auth/services/token.service.spec.ts` | Generate access token (with jti), verify (with blocklist), rotate refresh token, reuse detection (revokes all), revoke all for user, blacklist by jti |
| `back/src/modules/auth/services/magic-link.service.spec.ts` | Create, validate preview, validate consumption, mark used, revoke, cleanup expired tokens |
| `back/src/modules/admin/services/admin.service.spec.ts` | List users, role updates, status toggle |
| `back/test/auth.e2e-spec.ts` | Full flow: register → verify email → auto-login → access protected → refresh → logout → token reuse fails → magic link device binding fails on wrong device → logout-all terminates session |
| `back/test/admin.e2e-spec.ts` | Admin access allowed, non-admin rejected, user CRUD |
| `back/test/utils/test-database.ts` | Test DB setup/teardown with TypeORM |
| `back/test/utils/auth-test-utils.ts` | `createTestUser()`, `getAccessToken()`, `getRefreshToken()`, `getMagicLinkToken()` |
| `back/test/factories/user.factory.ts` | Test user data factory |

> **Removed tests:** `password.service.spec.ts`, `lockout.service.spec.ts` — no passwords or lockout. `jwt-refresh.strategy.spec.ts` — refresh tokens are opaque.

### Frontend Tests

| File | Scope |
|------|-------|
| `front/src/lib/auth/AuthContext.test.tsx` | Auth state, login/logout/logoutAll, session restore, token refresh, reuse detection redirect |
| `front/src/lib/api/client.test.ts` | Axios interceptors, 401 refresh queue, concurrent requests, reuse detection handling |
| `front/src/lib/auth/validation.test.ts` | Register schema (nickname rules, DOB format), login schema |
| `front/src/components/auth/LoginForm.test.tsx` | Email validation, submission, "check your email" state, countdown |
| `front/src/components/auth/RegisterForm.test.tsx` | Field validation, nickname format, submission, success state |
| `front/src/middleware.test.ts` | Route protection: protected without cookie → redirect, guest with cookie → redirect |

---

## Implementation Order

| Step | Phase | Description |
|------|-------|-------------|
| 1 | Backend P1 | Install deps, update ConfigService, create email module |
| 2 | Backend P2 | Update User entity (remove password, add profile fields), create RefreshToken & MagicLinkToken entities, set up TypeORM CLI, generate migrations |
| 3 | Backend P3 | Create all auth DTOs, interfaces, services (auth, token, magic-link), strategies, guards, decorators, controller, module |
| 4 | Backend P4 | Create admin module |
| 5 | Backend P5 | Wire up global guards, filters, throttler, update app.module and main.ts, configure CORS origin |
| 6 | Backend P11 | Write backend unit tests |
| 7 | Backend P11 | Write backend E2E tests |
| 8 | Frontend P6 | Install deps, update env, create MUI theme |
| 9 | Frontend P7 | Create types, validation schemas |
| 10 | Frontend P8 | Create API client, auth context, hooks |
| 11 | Frontend P9 | Create auth pages and components (login, register, confirmation pages — no password forms) |
| 12 | Frontend P10 | Create middleware |
| 13 | Frontend P11 | Write frontend tests |

---

## Verification

1. **Backend:** `cd back && npm test` — all unit and E2E tests pass
2. **Frontend:** `cd front && npm test` — all component and unit tests pass
3. **Lint:** `make lint` — no errors
4. **Typecheck:** `make typecheck` — no errors
5. **Manual auth flow:** Register → verify email → auto-login → access protected route → refresh token → logout → verify token revoked
6. **Manual magic link flow:** Enter email → receive link → click from same device → see confirmation page → confirm → logged in. Click from different device → error.
7. **Manual pre-fetch test:** Paste magic link in Slack/Discord (which unfurls) → verify token is NOT consumed → user can still click and log in.
8. **Manual admin flow:** Login as admin → list users → change role → deactivate user
9. **Security checks:** Verify httpOnly cookie is set, access token never in localStorage, middleware blocks unauthenticated access, rate limiting works, magic link single-use enforced, device binding works, refresh token reuse revokes all sessions
10. **Edge cases:** Verify concurrent 401s result in single refresh call, verify cross-tab logout works, verify page refresh restores session, verify expired magic link redirects with error, verify logout works with expired access token

---

## Architecture & Trade-offs

### 1. Passwordless Magic Link vs. Password-Based Authentication

**Context:** The original plan used traditional email/password authentication with bcrypt hashing, password strength validation, account lockout, and forgot/reset password flows.

**Decision:** Replace passwords entirely with magic link authentication.

**Why:**
- Eliminates password breaches, credential stuffing, and brute-force attacks
- Removes the need for password reset flows, reducing UI complexity
- Users cannot forget passwords they do not have
- Aligns with modern security best practices (FIDO Alliance, NIST SP 800-63B discourages knowledge-based auth)

**Trade-offs:**

| Pros | Cons |
|------|------|
| No password database to breach | Hard dependency on email deliverability |
| No forgot-password UI/flow | Slower login (requires opening email client) |
| No account lockout needed | Users without email access are locked out |
| Reduced attack surface | Magic links can be intercepted if email is compromised |
| Better UX for casual gamers | Higher email infrastructure cost |

**Mitigations for cons:**
- Device binding prevents forwarded magic links from working
- Rate limiting prevents email spam abuse
- Login notification emails alert users to unauthorized access
- Short expiry (15min) limits the attack window
- Two-step confirmation prevents email pre-fetchers from consuming links

**Alternative considered:** One-time passcodes (OTP) sent via email. Rejected because magic links are one-click login vs. copy-paste friction, and the link format naturally supports our device-binding security model.

---

### 2. Two-Step Magic Link Confirmation

**Context:** Email clients (Gmail, Outlook, Slack, Discord) and security scanners pre-fetch URLs for link preview and malware scanning. A single-step `GET` endpoint that immediately consumes the token and sets cookies breaks when pre-fetched.

**Decision:** Convert magic link and verification flows to a two-step process: `GET` validates a preview and redirects to a confirmation page; `POST` consumes the token and establishes the session.

**Why:** Pre-fetchers issue `GET` requests, not `POST`s. The token remains valid until the user explicitly confirms.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Completely defeats pre-fetchers | Adds one extra click for the user |
| Works with all email clients | Slightly more complex frontend (confirmation pages) |
| Token is only consumed on intentional user action | |

**Alternative considered:** Bot heuristics (User-Agent filtering). Rejected because it is unreliable and creates a false-positive arms race.

---

### 3. Device-Bound Magic Links vs. Universal Magic Links

**Context:** Magic links sent via email could theoretically be clicked from any device. If a user forwards their email or their inbox is compromised, an attacker could log in.

**Decision:** Bind magic link login tokens to the requesting device via a `login_attempt` cookie containing a signed nonce. The magic link URL includes this nonce, and the backend verifies it matches the cookie on click.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Prevents email forwarding attacks | User cannot request on mobile and click on desktop |
| Prevents inbox compromise from leading to account takeover | Slightly more complex implementation |
| Adds defense-in-depth without user friction | Cookie must be present (browser must accept cookies) |

**Mitigation for cons:**
- Verification links (registration) are intentionally NOT device-bound, since users often register on one device and check email on another. The verification link auto-logs the user in on the clicking device, which then establishes its own session.
- Clear error messaging: "This login link is invalid or expired. Please request a new one."
- `login_attempt` cookie uses `SameSite=Lax` (not Strict) so it is sent on top-level navigations from email clients while still being unreadable by third-party sites.

**Alternative considered:** IP address binding. Rejected because mobile users frequently change IPs (cellular/WiFi switching), causing false positives.

---

### 4. Verification Link Auto-Login vs. Redirect to Login Page

**Context:** After a user clicks their email verification link, they could be redirected to the login page to manually request a magic link, or they could be automatically logged in.

**Decision:** Auto-login upon successful verification confirmation. The backend sets auth cookies and redirects to `/`.

**Why:** Frictionless onboarding — one click from email to game.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Frictionless onboarding — one click from email to game | User may not realize they are logged in |
| Reduces drop-off between registration and first session | If verification link is leaked, attacker gains session |

**Mitigation for cons:**
- Verification links are single-use and short-lived (15min)
- Two-step confirmation prevents pre-fetch consumption
- Welcome email sent after verification confirms account activation
- No sensitive actions (like admin functions) are available to newly registered users by default

**Alternative considered:** Redirect to `/login` after verification. Rejected because it adds an unnecessary step to the user journey for a game where quick onboarding is critical.

---

### 5. Access Token in Memory vs. localStorage

**Context:** JWT access tokens must be stored somewhere accessible to the frontend for attaching to API requests.

**Decision:** Store access tokens in React state (JavaScript memory) only. Never use localStorage or sessionStorage.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Immune to XSS token theft | Token lost on page refresh (requires refresh token round-trip) |
| Follows OWASP recommendations for SPAs | Cannot persist across browser sessions without refresh cookie |

**Mitigation for cons:**
- Refresh token (httpOnly cookie) silently restores the session on page load
- `auth_status` cookie enables middleware to know a session *might* exist before the refresh call completes

**Alternative considered:** localStorage for access token. Rejected because any XSS vulnerability would expose the token indefinitely. The game uses Phaser which may load third-party assets; memory-only storage is a critical defense.

---

### 6. `auth_status` Cookie vs. Access Token in Middleware

**Context:** Next.js middleware runs in the Edge runtime, which cannot access JavaScript memory where the access token lives.

**Decision:** Use a separate non-httpOnly `auth_status` cookie containing only the string `"authenticated"`.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Enables server-side route protection | Cookie can be read by JavaScript (XSS could tamper with it) |
| No PII or tokens in the cookie | Middleware only knows "probably authenticated," not definitively |
| Simple boolean check is fast in Edge runtime | False positive: cookie exists but refresh token is expired/revoked |

**Mitigation for cons:**
- `auth_status` contains NO token or user data — tampering only causes a harmless redirect
- Client-side `AuthGuard` performs the definitive auth check via `/me` API call
- Cookie is SameSite=Lax (not Strict) so it is sent on top-level navigations, enabling middleware to work on direct URL access

**Alternative considered:** Encode a JWT in the `auth_status` cookie. Rejected because it increases cookie size, exposes claims to JavaScript, and the Edge runtime cannot verify signatures without crypto overhead.

---

### 7. In-Memory Token Blocklist vs. Redis

**Context:** When a user logs out, their access token is still valid until its natural expiry (15min). A blocklist is needed to reject revoked tokens immediately.

**Decision:** Use an in-memory `Map` keyed by `jti` with TTL for the MVP. Plan for Redis in production.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Zero infrastructure dependency | Blocklist lost on server restart |
| Extremely fast lookups (nanoseconds) | Not shared across multiple server instances |
| Simple to implement and test | Memory usage grows with concurrent users |

**Mitigation for cons:**
- Access tokens expire in 15min, so a server restart only exposes a small window
- For production scale, Redis is the planned upgrade path (the `addToBlacklist` and `isTokenBlacklisted` interfaces are abstracted to support this)

**Alternative considered:** No blocklist, rely solely on refresh token rotation. Rejected because immediate logout is a user expectation and a security requirement (e.g., "log out all devices" feature).

---

### 8. Opaque Refresh Tokens vs. JWT Refresh Tokens

**Context:** Refresh tokens can be implemented as JWTs (self-validating, stateless verification) or opaque random strings (require database lookup).

**Decision:** Use opaque refresh tokens: cryptographically random 64-byte strings, SHA-256 hashed in the database.

**Why:** Opaque tokens naturally support rotation, revocation, and reuse detection without the complexity of JWT `jti` tracking. The cookie size is smaller than a JWT. The database lookup is already required for rotation/revocation checks.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Natural fit with rotation and revocation table | Requires DB lookup per refresh (already required by rotation logic) |
| Smaller cookie size than a JWT | |
| Easier to implement reuse detection | |
| No JWT signature verification complexity | |

**Alternative considered:** JWT refresh tokens with `jti` tracking in the database. Rejected because it combines the downsides of both approaches: larger cookies, signature verification overhead, AND still requires DB lookups for revocation.

---

### 9. Refresh Token Reuse Detection

**Context:** If an attacker steals a refresh token, and the legitimate user later refreshes (rotating the token), the attacker can still use the stolen old token if it is within the 7-day window.

**Decision:** If a revoked/expired refresh token is presented to `/auth/refresh`, immediately **revoke ALL refresh tokens for that user** and return `401 Unauthorized`. Force the user to re-authenticate with a magic link.

**Why:** This is "refresh token rotation with reuse detection." It detects token theft because the only way a revoked token reappears is if someone other than the legitimate client is using it.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Detects and contains refresh token theft automatically | False positive if a user has multiple tabs and a race condition occurs (mitigated by request queuing on the frontend) |
| Limits blast radius of a stolen refresh token to one use | User must re-authenticate with magic link (slight UX friction) |

**Mitigation for cons:**
- Frontend Axios interceptor queues concurrent requests, preventing race conditions that could trigger false-positive reuse detection.
- Re-authentication is a one-time friction event in the rare case of detected theft.

---

### 10. Separate `magic_link_tokens` Table vs. Extending `refresh_tokens`

**Context:** Both magic link tokens and refresh tokens are hashed, time-bound secrets associated with users.

**Decision:** Create a dedicated `magic_link_tokens` table separate from `refresh_tokens`.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Clean separation of concerns (session tokens vs. one-time auth tokens) | One extra table to maintain |
| Different lifecycle: magic links are 15min/single-use; refresh tokens are 7 days/rotated | Slightly more complex queries |
| Supports multiple token types (magic_link, verification) without overloading refresh token semantics | |
| Easier to audit and debug token issues | |

**Alternative considered:** Add a `type` column to `refresh_tokens` and store everything there. Rejected because refresh tokens have properties (rotation, replacement chains) that do not apply to magic links, leading to nullable columns and confusing semantics.

---

### 11. Email-Based Rate Limiting

**Context:** Rate limiting can be applied per-IP, per-email, or both.

**Decision:** Rate limit auth endpoints per-email (login: 5/hr, register: 3/hr, resend-verification: 3/hr). Apply a per-IP limit (30/min) to the `/refresh` endpoint. A global default (100 req/min per IP) applies as a backstop.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Prevents abuse of a single email address | Attackers can probe many different emails from one IP |
| No false positives for shared NAT/corporate networks | No protection against distributed enumeration |
| Simpler to implement and explain to users | |

**Mitigation for cons:**
- Generic error messages prevent enumeration feedback
- Magic links are device-bound, so even if an attacker probes an email, they cannot use the link
- Global IP default (100 req/min) still applies as a backstop

**Alternative considered:** 3 per email + 10 per IP per hour. Rejected because shared IPs (offices, universities) would cause legitimate users to be blocked.

---

### 12. Profile Immutability vs. Editable Profiles

**Context:** Users may want to change their nickname, date of birth, or name after registration.

**Decision:** Profile fields (firstName, lastName, dateOfBirth, nickname) are immutable after registration.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Simpler data model — no update endpoints needed | Users cannot fix typos or update names |
| Nickname uniqueness is guaranteed at creation time | Poor UX if user regrets their nickname |
| Prevents age manipulation (DOB cannot be changed to bypass restrictions) | Support burden for "I made a mistake" requests |

**Mitigation for cons:**
- Clear messaging during registration: "This information cannot be changed later."
- Admin can manually update fields if necessary (admin module provides this capability)

**Alternative considered:** Allow edits with uniqueness validation. Rejected to keep the MVP simple and because nickname/DOB are foundational identity attributes for a gaming platform.

---

### 13. No Password Reset Flow

**Context:** Traditional password-based systems require forgot-password and reset-password flows. Since we are passwordless, these do not apply.

**Decision:** Remove forgot-password and reset-password entirely.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Reduced UI complexity (2 fewer pages, 2 fewer forms) | If email is compromised, attacker can request magic links |
| Reduced backend complexity (no reset tokens) | No self-service account recovery if email is lost |

**Mitigation for cons:**
- Device binding prevents magic links from working on attacker's device
- Login notification emails alert the legitimate user to unauthorized access
- Account can be deactivated by admin if compromised

**Alternative considered:** Keep password reset as a fallback. Rejected because it reintroduces the exact attack surface we are eliminating by going passwordless.

---

### 14. Cookie SameSite Strategy

**Context:** Cookies can have `SameSite=Strict`, `Lax`, or `None`. This affects when cookies are sent in cross-site contexts.

**Decision:**
- `refresh_token`: `SameSite=Strict`, path `/api/v1/auth`
- `auth_status`: `SameSite=Lax`, path `/`
- `login_attempt`: `SameSite=Lax`, path `/api/v1/auth`

**Rationale:**
- `refresh_token` is Strict because it should only be sent when the user is actively on our domain. It never needs to be sent on cross-site navigation.
- `auth_status` is Lax because Next.js middleware must read it when the user navigates directly to a protected URL (e.g., bookmark or external link). A Strict cookie would not be sent on that first navigation.
- `login_attempt` is Lax (changed from Strict) because the magic link callback is initiated from an email client (cross-site top-level navigation). A Strict cookie would not be sent, breaking the device-binding check. The security boundary is the nonce signature, not SameSite.

**Trade-off:** Lax `auth_status` and `login_attempt` are slightly more vulnerable to CSRF-style attacks where a malicious site redirects to ours. However, `auth_status` contains no token or actionable data, and `login_attempt` requires a valid signed nonce.

---

### 15. Email as Immutable Identifier

**Context:** Email is used as the sole login identifier and is stored in the JWT payload.

**Decision:** Email cannot be changed after registration (implied by profile immutability and lack of email update endpoint).

**Trade-offs:**

| Pros | Cons |
|------|------|
| Simple and stable identifier | Users cannot update their email if they lose access |
| All tokens reference a stable `sub` (user ID), not email | Users with changed emails must create new accounts |

**Mitigation for cons:**
- Admin module can update email if necessary (future feature)
- OAuth login (future) can link multiple emails to one account

**Alternative considered:** Allow email changes with token invalidation. Rejected for MVP complexity.

---

### 16. Log Out All Devices

**Context:** A user may want to terminate all active sessions across all devices (e.g., after noticing suspicious activity).

**Decision:** Provide `POST /auth/logout-all` which requires a valid JWT, revokes all refresh tokens for the user, and blacklists the current access token `jti`.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Gives users control over all active sessions | Immediately invalidates all sessions, including the current one |
| Critical security feature for account compromise response | Requires re-authentication on all devices |

---

### 17. No Age Verification

**Context:** The registration DTO collects `dateOfBirth`. A game platform often requires COPPA (13+) or GDPR (16+) compliance.

**Decision:** No server-side age validation is implemented for the MVP.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Simpler registration form and validation | Potential regulatory risk depending on jurisdiction |
| No false positives from date parsing edge cases | No enforcement of age-gated content |

**Mitigation:** Age validation may be added in a future phase if required by legal or platform requirements. The `dateOfBirth` field is still collected and stored for future use.

---

### 18. No Admin Audit Logging

**Context:** The admin module allows privileged actions (role changes, account deactivation) that should be auditable.

**Decision:** Admin actions are not logged to an audit table for the MVP.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Simpler implementation, no additional table | No forensic trail for admin actions |
| Faster admin endpoints | Cannot detect or investigate malicious admin activity |

**Mitigation:** Admin audit logging is planned as a future enhancement. In the interim, admin actions are limited to trusted personnel.

---

### 19. SHA-256 Token Hashing

**Context:** Magic link tokens and refresh tokens must be stored hashed before persistence. Bcrypt is unsuitable for tokens that require deterministic lookup by hash.

**Decision:** Use **SHA-256** for hashing magic link tokens and refresh tokens before database storage.

**Why:** SHA-256 is fast and deterministic, enabling O(1) hash lookups. Tokens are cryptographically random 64-byte strings, so rainbow table attacks are infeasible. Bcrypt's salt would prevent deterministic lookup, which is required for token validation.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Fast, deterministic lookups | Not suitable for human-generated passwords (but tokens are random) |
| Native Node.js support (no extra dependency) | |

---

### 20. Security Headers Deferred

**Context:** Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) are a baseline requirement for web applications.

**Decision:** `helmet` middleware and security headers are explicitly deferred to a future infrastructure task.

**Why:** The current priority is core authentication functionality. Security headers will be added in a dedicated hardening pass.

**Trade-offs:**

| Pros | Cons |
|------|------|
| Faster MVP delivery | Missing clickjacking protection (X-Frame-Options) |
| No CSP conflicts with Phaser asset loading during initial development | Missing MIME-sniffing protection (X-Content-Type-Options) |
| | No HSTS enforcement |

**Mitigation:** The application runs over HTTPS in production. A follow-up task will configure `helmet` with a CSP appropriate for Phaser and the game's asset sources.

---

### 21. Threat Model Summary

The following attacks are considered and mitigated:

| Threat | Mitigation |
|--------|------------|
| **Credential stuffing** | Eliminated — no passwords exist |
| **Brute force** | Rate limiting on all auth endpoints |
| **Magic link interception** | Device binding via `login_attempt` cookie; two-step confirmation |
| **Token replay** | Single-use tokens marked `usedAt` on POST confirmation |
| **XSS token theft** | Access token in memory only; refresh token httpOnly |
| **CSRF** | `SameSite=Strict` on sensitive cookies; JWT in Authorization header |
| **Email enumeration** | Generic 200 response and message on registration/login |
| **Session hijacking** | Refresh token rotation with reuse detection; IP/userAgent logging for audit |
| **Token forgery** | Cryptographically random 64-byte tokens, stored SHA-256 hashed |
| **Account takeover via email compromise** | Login notification emails; device binding; two-step confirmation |
| **Pre-fetch consumption** | GET endpoints only preview; POST endpoints consume |
| **Refresh token theft** | Reuse detection revokes all tokens for the user |
| **Blacklisted token reuse** | In-memory `jti` blocklist with TTL |
| **Deactivated user access** | Refresh endpoint checks `isActive` and `isEmailVerified` |

---

## Key Design Decisions

1. **Magic link authentication** — Passwordless. User enters email, receives a one-time link, clicks to log in. No passwords to forget or breach.
2. **Two-step confirmation** — GET endpoints preview the token and redirect to a confirmation page. POST endpoints consume the token. Prevents email pre-fetchers from breaking login.
3. **Device-bound magic links** — The `login_attempt` cookie (15min, httpOnly, SameSite=Lax) contains a signed nonce. The magic link URL includes this nonce. The backend verifies the nonce on both GET (preview) and POST (confirmation). Clicking from a different device fails.
4. **Opaque refresh tokens** — Refresh tokens are cryptographically random 64-byte strings, SHA-256 hashed in the database. Not JWTs. Validated by hash lookup.
5. **Refresh token reuse detection** — Presenting a revoked refresh token triggers revocation of ALL refresh tokens for that user. Forces re-authentication.
6. **Permissive verification links** — Registration verification links are NOT device-bound (no `login_attempt` cookie check). They prove email ownership. Two-step confirmation still applies.
7. **Auto-login on verification** — After clicking "Verify Email" on the confirmation page, the user is automatically logged in and redirected to `/`.
8. **`auth_status` cookie** — Non-httpOnly, SameSite=Lax, value=`"authenticated"`. Contains no PII or tokens. Enables Next.js middleware route protection since the access token is in JS memory (inaccessible to Edge runtime).
9. **Access token `jti` claim** — Every JWT access token includes a unique UUIDv4 `jti`. Blacklisting is O(1) by `jti`.
10. **Registration does not auto-login immediately** — User must verify their email first. After confirming the verification link, they are automatically logged in.
11. **Email enumeration protection** — On registration and login, return identical `200 OK` response regardless of whether the email exists. No "already registered" notice email is sent.
12. **Logout via refresh cookie** — `POST /logout` does not require a valid JWT. It reads the `refresh_token` cookie, revokes it, and clears cookies. An optional `Authorization` header allows blacklisting the access token `jti`.
13. **`POST /auth/logout-all`** — Revokes all refresh tokens for the authenticated user and blacklists their current access token `jti`.
14. **Token blocklist** — In-memory Map keyed by `jti` with TTL for MVP. Redis-ready for production.
15. **Rate limiting** — `@nestjs/throttler` with: login 5/hr per email, register 3/hr per email, resend verification 3/hr per email, refresh 30/min per IP. Global default: 100 req/min per IP.
16. **Profile immutability** — First name, last name, date of birth, and nickname cannot be changed after registration. Nickname must be unique across the platform.
17. **Email verification enforcement** — `VerifiedEmailGuard` exists but is NOT applied globally. Available for selective use later. Email verification is enforced at login time (magic links rejected for unverified accounts) and during refresh.
18. **OAuth extensibility** — `OAuthService` is a stub. Future Google OAuth adds a `GoogleStrategy` without touching core auth logic.
19. **MUI everywhere** — Per user preference, MUI is the UI library across the entire frontend.
20. **Module naming** — Keep `modules/users/` (plural). Auth goes in `modules/auth/`.
21. **Error format** — NestJS default format only: `{ statusCode, message, error }`. No custom error codes.
22. **Game auth** — Phaser communicates with backend through React shell. React's Axios interceptor handles auth headers.
23. **TypeORM migrations** — Full CLI setup with `data-source.ts`, migration scripts in package.json, and documented workflow.
24. **JWT payload** — `{ sub, email, role, type, jti, iss, iat, exp }`. No PII beyond email.
25. **Frontend session restore** — On page load, check `auth_status` cookie → call `GET /me` → if 401, try `POST /auth/refresh` → if that fails (including reuse detection), clear state.
26. **Login notification emails** — Every successful magic link login triggers a security email to the user with IP and timestamp.
27. **Welcome email** — First-time email verification triggers a welcome email confirming the account is active.
28. **SHA-256 token hashing** — Magic link tokens and opaque refresh tokens are hashed with SHA-256 before database storage.
29. **No age verification** — Server-side age validation is not implemented for the MVP.
30. **No admin audit logging** — Admin actions are not logged to an audit table for the MVP.
31. **Security headers deferred** — `helmet` and security headers (HSTS, CSP) are deferred to a future hardening task.
32. **Fresh database assumption** — This plan assumes a fresh database with no existing password-based users. No migration strategy for legacy password hashes is provided.
