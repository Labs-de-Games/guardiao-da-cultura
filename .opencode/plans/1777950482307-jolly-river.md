# Authentication & Authorization Implementation Plan

## Architecture Overview

**Token Strategy:** Access token (JWT, 15min) stored in JS memory + Refresh token (7d) stored in httpOnly/Secure/SameSite=Strict cookie with rotation on each use. A lightweight `auth_status` cookie (non-httpOnly, SameSite=Lax) enables Next.js middleware route protection.

**Auth Flow:**
1. Login/Register → backend returns access token in body + sets `refresh_token` & `auth_status` cookies
2. Frontend stores access token in React state (never localStorage)
3. Axios interceptor attaches Bearer token to all API requests
4. On 401 → interceptor calls `POST /auth/refresh` (cookie sent automatically) → new access token
5. On refresh failure → clear state, remove `auth_status` cookie, redirect to `/login`
6. Next.js middleware reads `auth_status` cookie for route protection (no sensitive data in this cookie)

**Page Load / Session Restore:**
1. AuthProvider mounts → checks for `auth_status` cookie
2. If present → calls `GET /auth/me` with any stored access token
3. If `/me` returns 401 → tries `POST /auth/refresh` (cookie sent automatically)
4. If refresh succeeds → store new access token, set user state
5. If refresh fails → clear all state, remove `auth_status` cookie

**Game Auth:** Phaser game communicates with backend through the React shell. The React shell's Axios interceptor handles auth headers. Phaser dispatches events → React shell makes API calls → returns data to Phaser.

---

## Phase 1: Backend — Dependencies & Config

### Install dependencies
```bash
cd back && bun add @nestjs/passport @nestjs/jwt @nestjs/throttler passport passport-jwt bcryptjs cookie-parser && bun add -D @types/passport-jwt @types/bcryptjs
```

### Files to create/modify

| File | Purpose |
|------|---------|
| `back/src/core/config/config.service.ts` | Add to Zod schema: `JWT_SECRET`, `JWT_EXPIRATION` (default "15m"), `JWT_ISSUER` (default "gameplate"), `REFRESH_SECRET`, `REFRESH_EXPIRATION` (default "7d"), `BCRYPT_SALT_ROUNDS` (default 12), `LOCKOUT_MAX_ATTEMPTS` (default 5), `LOCKOUT_DURATION_MIN` (default 5) |
| `back/.env.example` | Add all new env vars with defaults |
| `back/src/core/email/email.module.ts` | Email module with mock provider |
| `back/src/core/email/interfaces/email-service.interface.ts` | `IEmailService` interface: `sendVerificationEmail()`, `sendPasswordResetEmail()`, `sendAccountLockedEmail()` |
| `back/src/core/email/services/mock-email.service.ts` | Console.log implementation of IEmailService |
| `back/src/core/email/email.constants.ts` | DI token `EMAIL_SERVICE` |

### Environment variables to add
```
JWT_SECRET=change-me-in-production
JWT_EXPIRATION=15m
JWT_ISSUER=gameplate
REFRESH_SECRET=change-me-in-production
REFRESH_EXPIRATION=7d
BCRYPT_SALT_ROUNDS=12
LOCKOUT_MAX_ATTEMPTS=5
LOCKOUT_DURATION_MIN=5
```

---

## Phase 2: Backend — Database Schema & Migrations

### TypeORM CLI Setup

| File | Purpose |
|------|---------|
| `back/src/database/data-source.ts` | TypeORM DataSource config for CLI (used by migration commands) |
| `back/package.json` | Add scripts: `migration:generate`, `migration:run`, `migration:revert` |

### Entities

| File | Purpose |
|------|---------|
| `back/src/modules/users/enums/role.enum.ts` | `Role` enum: `Player = 'player'`, `Institution = 'institution'`, `Admin = 'admin'` |
| `back/src/modules/auth/enums/token-type.enum.ts` | `TokenType` enum: `Refresh = 'refresh'`, `Reset = 'reset'`, `Verification = 'verification'` |
| `back/src/modules/users/user.entity.ts` | **MODIFY EXISTING.** Add columns: `password` (string), `firstName` (string), `lastName` (string), `role` (Role enum, default Player), `isEmailVerified` (boolean, default false), `emailVerificationToken` (string, nullable), `emailVerificationTokenExpires` (Date, nullable), `passwordResetToken` (string, nullable), `passwordResetTokenExpires` (Date, nullable), `failedLoginAttempts` (number, default 0), `lockedUntil` (Date, nullable), `lastLoginAt` (Date, nullable) |
| `back/src/modules/auth/entities/refresh-token.entity.ts` | New entity: `id` (uuid), `token` (string, hashed), `user` (ManyToOne → User), `expiresAt` (Date), `revokedAt` (Date, nullable), `replacedByToken` (string, nullable), `createdAt` (Date), `userAgent` (string, nullable), `ipAddress` (string, nullable) |

### Migrations

| File | Purpose |
|------|---------|
| `back/src/database/migrations/<timestamp>_AddAuthFieldsToUser.ts` | Add all new user columns, backfill existing users with `role='player'`, `isActive=true` |
| `back/src/database/migrations/<timestamp>_CreateRefreshTokensTable.ts` | Create `refresh_tokens` table with FK to `users` |

### Module update

| File | Purpose |
|------|---------|
| `back/src/modules/users/users.module.ts` | **MODIFY EXISTING.** Add `UserService` provider, export it along with User repository |

---

## Phase 3: Backend — Auth Module

### DTOs

| File | Purpose |
|------|---------|
| `back/src/modules/auth/dto/register.dto.ts` | `username` (string), `email` (email format), `password` (strong: 8+ chars, uppercase, lowercase, number, special char), `firstName` (string), `lastName` (string) |
| `back/src/modules/auth/dto/login.dto.ts` | `email` (email format), `password` (string) |
| `back/src/modules/auth/dto/forgot-password.dto.ts` | `email` (email format) |
| `back/src/modules/auth/dto/reset-password.dto.ts` | `token` (string), `newPassword` (strong password) |
| `back/src/modules/auth/dto/verify-email.dto.ts` | `token` (string) |
| `back/src/modules/auth/dto/resend-verification.dto.ts` | `email` (email format) |
| `back/src/modules/auth/dto/auth-response.dto.ts` | `accessToken` (string), `user` ({ id, email, username, role, isEmailVerified }) |

### Interfaces

| File | Purpose |
|------|---------|
| `back/src/modules/auth/interfaces/jwt-payload.interface.ts` | `sub` (userId), `email`, `role` (Role), `type` ('access' \| 'refresh'), `iss`, `iat`, `exp` |
| `back/src/modules/auth/interfaces/request-with-user.interface.ts` | Express Request + `user` property |

### Services

| File | Purpose |
|------|---------|
| `back/src/modules/auth/services/auth.service.ts` | `register()` → create user + auto-login (return tokens), `login()` → validate credentials + check lockout + set tokens, `logout()` → revoke refresh token + blacklist access token + clear cookies, `verifyEmail()` → mark email verified, `forgotPassword()` → generate reset token + mock email, `resetPassword()` → validate token + update password + clear lockout, `resendVerificationEmail()` → regenerate token + mock email |
| `back/src/modules/auth/services/token.service.ts` | `generateAccessToken()` → JWT with {sub, email, role, type:'access', iss, iat, exp}, `generateRefreshToken()` → create RefreshToken entity (hashed), `verifyAccessToken()` → validate + check blocklist, `rotateRefreshToken()` → invalidate old + issue new, `revokeRefreshToken()` → mark revoked, `revokeAllUserTokens()` → revoke all for a user, `addToBlacklist()` → add to in-memory Map with TTL, `isTokenBlacklisted()` → check Map |
| `back/src/modules/auth/services/password.service.ts` | `hash()` → bcrypt with 12 rounds, `compare()` → bcrypt compare, `validateStrength()` → check 8+ chars, uppercase, lowercase, number, special char |
| `back/src/modules/auth/services/lockout.service.ts` | `recordFailedAttempt()` → increment counter, lock if >= 5 attempts (progressive: 5min → 15min → 60min), `isAccountLocked()` → check lockedUntil, `resetAttempts()` → clear on successful login |

### Strategies & Guards

| File | Purpose |
|------|---------|
| `back/src/modules/auth/strategies/jwt-access.strategy.ts` | Passport JWT strategy: extract from Authorization header, validate payload, check blocklist |
| `back/src/modules/auth/strategies/jwt-refresh.strategy.ts` | Passport JWT strategy: extract from `refresh_token` cookie, validate payload |
| `back/src/modules/auth/guards/jwt-auth.guard.ts` | Guard using jwt-access strategy |
| `back/src/modules/auth/guards/jwt-refresh.guard.ts` | Guard using jwt-refresh strategy |
| `back/src/modules/auth/guards/roles.guard.ts` | RBAC guard: check `@Roles()` metadata against `user.role` |
| `back/src/modules/auth/guards/verified-email.guard.ts` | Check `user.isEmailVerified`. **Exists but NOT applied globally — available for selective use later** |

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
| POST | /register | Public | 3/min | Register + auto-login |
| POST | /login | Public | 5/min | Login, set cookies |
| POST | /logout | JWT | — | Clear cookies, revoke tokens |
| POST | /refresh | Cookie | 20/min | Rotate refresh token |
| GET | /me | JWT | — | Get current user |
| GET | /verify-email/:token | Public | — | Verify email |
| POST | /resend-verification | Public | 3/min | Resend verification email |
| POST | /forgot-password | Public | 3/min | Request password reset |
| POST | /reset-password | Public | 3/min | Reset password with token |

### Cookie Configuration

| Cookie | httpOnly | Secure | SameSite | Path | Max-Age | Purpose |
|--------|----------|--------|----------|------|---------|---------|
| `refresh_token` | Yes | Yes | Strict | `/api/v1/auth` | 7 days | Refresh token (sent to /refresh, /logout) |
| `auth_status` | No | Yes | Lax | `/` | 7 days | Boolean flag for middleware route protection |

**auth_status cookie value:** `authenticated` (simple string, not JSON — no PII)

### JWT Access Token Payload

```json
{
  "sub": "uuid",
  "email": "user@example.com",
  "role": "player",
  "type": "access",
  "iss": "gameplate",
  "iat": 1234567890,
  "exp": 1234568790
}
```

---

## Phase 4: Backend — Admin Module

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

The existing CORS config in `main.ts` already has `credentials: true`. No changes needed for cookie-based auth — the `credentials: true` allows cookies to be sent cross-origin.

### Rate Limiting Configuration

Using `@nestjs/throttler`:
- Global default: 100 req/min
- Auth endpoints override: see rate limits in API table above
- Admin endpoints: 30 req/min

---

## Phase 6: Frontend — Dependencies & Config

### Install dependencies
```bash
cd front && bun add @mui/material @emotion/react @emotion/styled @mui/icons-material axios js-cookie react-hook-form @hookform/resolvers && bun add -D @types/js-cookie
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
| `front/src/lib/auth/types.ts` | `User` ({ id, email, username, role, isEmailVerified }), `AuthState`, `LoginCredentials`, `RegisterCredentials`, `ForgotPasswordData`, `ResetPasswordData` |
| `front/src/lib/auth/password-validation.ts` | `validatePassword()` → { isValid, errors[] }, `getPasswordStrength()` → 'weak' \| 'medium' \| 'strong'. Rules: 8+ chars, uppercase, lowercase, number, special char |
| `front/src/lib/auth/validation.ts` | Zod schemas: `loginSchema`, `registerSchema` (includes confirmPassword), `forgotPasswordSchema`, `resetPasswordSchema` |

---

## Phase 8: Frontend — API Client & Auth Context

| File | Purpose |
|------|---------|
| `front/src/lib/api/client.ts` | Axios instance: baseURL from env, `withCredentials: true`. Request interceptor: attach Bearer token from memory. Response interceptor: on 401 → queue requests, call `/auth/refresh`, retry all queued. On refresh failure → clear state, redirect to `/login`. |
| `front/src/lib/api/auth.ts` | `login()`, `register()`, `logout()`, `refreshToken()`, `forgotPassword()`, `resetPassword()`, `me()`, `verifyEmail()` |
| `front/src/lib/api/errors.ts` | `AuthError` base class, `InvalidCredentialsError`, `TokenExpiredError`, `AccountLockedError`, `EmailExistsError` |
| `front/src/lib/auth/AuthContext.tsx` | `AuthProvider` + `useAuth` hook. State: user, isAuthenticated, isLoading, accessToken (in memory). On mount: check auth_status cookie → call `/me`. Methods: login, register, logout. Integrates cross-tab sync. |
| `front/src/lib/auth/cookies.ts` | `setAuthStatusCookie()`, `clearAuthStatusCookie()`, `hasAuthStatusCookie()`. Uses `js-cookie` library. |
| `front/src/lib/auth/useAuth.ts` | Re-export of `useAuth` from context with runtime safety check (throws if used outside provider) |
| `front/src/lib/auth/useRedirectIfAuth.ts` | Hook for guest routes: redirect to `/` if already authenticated |
| `front/src/lib/auth/sync.ts` | `BroadcastChannel`-based cross-tab auth sync. Events: LOGIN, LOGOUT. Fallback: `localStorage` event for older browsers. |

### Axios Interceptor Detail

The interceptor must handle concurrent 401s:
1. First 401 → start refresh, queue all other 401s
2. Refresh succeeds → retry all queued requests with new token
3. Refresh fails → reject all queued requests, clear auth state, redirect to `/login`
4. Use a `Promise` variable to prevent duplicate refresh calls

---

## Phase 9: Frontend — Auth Pages (MUI)

| File | Purpose |
|------|---------|
| `front/src/app/(auth)/layout.tsx` | Shared auth layout: centered card with game logo/branding, MUI `Container` + `Paper` |
| `front/src/app/(auth)/login/page.tsx` | Login page with `useRedirectIfAuth()` |
| `front/src/components/auth/LoginForm.tsx` | MUI form: email, password (with visibility toggle), submit button, loading state, error alert, links to register/forgot-password |
| `front/src/app/(auth)/register/page.tsx` | Register page with `useRedirectIfAuth()` |
| `front/src/components/auth/RegisterForm.tsx` | MUI form: firstName, lastName, username, email, password (with strength indicator), confirmPassword, submit button, loading state, error alert |
| `front/src/app/(auth)/forgot-password/page.tsx` | Forgot password page |
| `front/src/components/auth/ForgotPasswordForm.tsx` | MUI form: email, submit, success state ("Check your email") |
| `front/src/app/(auth)/reset-password/page.tsx` | Reset password page (reads `?token=` from URL) |
| `front/src/components/auth/ResetPasswordForm.tsx` | MUI form: newPassword (with strength indicator), confirmPassword, submit, success state + link to login |
| `front/src/components/auth/PasswordStrengthIndicator.tsx` | Visual checklist: 8+ chars, uppercase, lowercase, number, special char. Color-coded strength bar. |
| `front/src/components/auth/AuthGuard.tsx` | Client-side guard: show `LoadingScreen` while loading, render children if authenticated, redirect if not |
| `front/src/components/LoadingScreen.tsx` | MUI `CircularProgress` centered full-screen |
| `front/src/components/ToastProvider.tsx` | MUI `Snackbar` + `Alert` provider for success/error notifications |

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
3. Check if request path matches guest route (/login, /register, /forgot-password, /reset-password)
4. If guest AND has auth_status cookie → redirect to /
5. All other routes (including /api/v1/*) → pass through
```

**Important:** The `auth_status` cookie is NOT httpOnly, so Next.js middleware (Edge runtime) can read it via `request.cookies.get('auth_status')`. It contains no PII — just the string `"authenticated"`.

---

## Phase 11: Testing

### Backend Tests

| File | Scope |
|------|-------|
| `back/src/modules/auth/services/auth.service.spec.ts` | Register (auto-login), login (credentials, lockout, unverified), logout, verify email, forgot/reset password |
| `back/src/modules/auth/services/token.service.spec.ts` | Generate, verify, rotate, revoke, blacklist |
| `back/src/modules/auth/services/password.service.spec.ts` | Hash, compare, strength validation |
| `back/src/modules/auth/services/lockout.service.spec.ts` | Failed attempts, progressive lockout, reset |
| `back/src/modules/admin/services/admin.service.spec.ts` | List users, role updates, status toggle |
| `back/test/auth.e2e-spec.ts` | Full flow: register → login → access protected → refresh → logout → token reuse fails |
| `back/test/admin.e2e-spec.ts` | Admin access allowed, non-admin rejected, user CRUD |
| `back/test/utils/test-database.ts` | Test DB setup/teardown with TypeORM |
| `back/test/utils/auth-test-utils.ts` | `createTestUser()`, `getAccessToken()`, `getRefreshToken()` |
| `back/test/factories/user.factory.ts` | Test user data factory |

### Frontend Tests

| File | Scope |
|------|-------|
| `front/src/lib/auth/AuthContext.test.tsx` | Auth state, login/logout, session restore, token refresh |
| `front/src/lib/api/client.test.ts` | Axios interceptors, 401 refresh queue, concurrent requests |
| `front/src/lib/auth/password-validation.test.ts` | All password rules, boundary cases |
| `front/src/components/auth/LoginForm.test.tsx` | Validation, submission, error display |
| `front/src/components/auth/RegisterForm.test.tsx` | Validation, password strength, submission |
| `front/src/middleware.test.ts` | Route protection: protected without cookie → redirect, guest with cookie → redirect |

---

## Implementation Order

| Step | Phase | Description |
|------|-------|-------------|
| 1 | Backend P1 | Install deps, update ConfigService, create email module |
| 2 | Backend P2 | Update User entity, create RefreshToken entity, set up TypeORM CLI, generate migrations |
| 3 | Backend P3 | Create all auth DTOs, interfaces, services, strategies, guards, decorators, controller, module |
| 4 | Backend P4 | Create admin module |
| 5 | Backend P5 | Wire up global guards, filters, throttler, update app.module and main.ts |
| 6 | Backend P11 | Write backend unit tests |
| 7 | Backend P11 | Write backend E2E tests |
| 8 | Frontend P6 | Install deps, update env, create MUI theme |
| 9 | Frontend P7 | Create types, validation schemas, password utils |
| 10 | Frontend P8 | Create API client, auth context, hooks |
| 11 | Frontend P9 | Create auth pages and components |
| 12 | Frontend P10 | Create middleware |
| 13 | Frontend P11 | Write frontend tests |

---

## Verification

1. **Backend:** `cd back && bun test` — all unit and E2E tests pass
2. **Frontend:** `cd front && bun test` — all component and unit tests pass
3. **Lint:** `make lint` — no errors
4. **Typecheck:** `make typecheck` — no errors
5. **Manual auth flow:** Register → auto-login → access protected route → refresh token → logout → verify token revoked
6. **Manual admin flow:** Login as admin → list users → change role → deactivate user
7. **Security checks:** Verify httpOnly cookie is set, access token never in localStorage, middleware blocks unauthenticated access, rate limiting works
8. **Edge cases:** Verify concurrent 401s result in single refresh call, verify cross-tab logout works, verify page refresh restores session

---

## Key Design Decisions

1. **auth_status cookie** — Non-httpOnly, SameSite=Lax, value=`"authenticated"`. Contains no PII or tokens. Enables Next.js middleware route protection since the access token is in JS memory (inaccessible to Edge runtime).
2. **Refresh cookie path** — Set to `/api/v1/auth` so it's sent to both `/auth/refresh` and `/auth/logout` (and any future auth endpoints).
3. **Auto-login after register** — User receives tokens immediately. Email verification is optional infrastructure, not enforced.
4. **Refresh token rotation** — Each use invalidates old token and issues new one. Reuse detection revokes entire token family.
5. **Token blocklist** — In-memory Map for MVP. Access tokens expire in 15min, so server restart only exposes a small window. Redis-ready for production.
6. **Rate limiting** — `@nestjs/throttler` with conservative limits: login 5/min, register 3/min, forgot-password 3/min, refresh 20/min.
7. **Account lockout** — Progressive: 5 failed attempts → 5min lock, then 15min, then 60min. Reset on successful login.
8. **Password policy** — 8+ chars, uppercase, lowercase, number, special char. Enforced on frontend (Zod) and backend (custom validator). bcrypt with 12 rounds.
9. **Email verification** — `VerifiedEmailGuard` exists but is NOT applied globally. Available for selective use on specific routes later.
10. **OAuth extensibility** — `OAuthService` is a stub. Future Google OAuth adds a `GoogleStrategy` without touching core auth logic.
11. **MUI everywhere** — Per user preference, MUI is the UI library across the entire frontend.
12. **Module naming** — Keep `modules/users/` (plural). Auth goes in `modules/auth/`.
13. **Error format** — NestJS default format only: `{ statusCode, message, error }`. No custom error codes.
14. **Game auth** — Phaser communicates with backend through React shell. React's Axios interceptor handles auth headers.
15. **TypeORM migrations** — Full CLI setup with `data-source.ts`, migration scripts in package.json, and documented workflow.
16. **JWT payload** — `{ sub, email, role, type, iss, iat, exp }`. No PII beyond email.
17. **Frontend session restore** — On page load, check `auth_status` cookie → call `GET /me` → if 401, try `POST /auth/refresh` → if that fails, clear state.
