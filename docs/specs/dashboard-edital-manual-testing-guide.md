# Manual Testing Guide — Dashboard do Edital (Epic #738)

> **Scope:** Epic #738 and its 12 sub-issues (#739–#748, #807, #808), shipped on
> `feat/dashboard-edital`: institution OAuth/password sign-in and onboarding,
> the PostHog identity foundation, the canonical funnel events, the HogQL
> query/cache layer, the institution dashboard (overview/funnel/report/links),
> per-turma campaign links, and the public aggregate dashboard.
> **Target Audience:** QA / reviewers validating this branch before merge.
> Mirrors the structure of `docs/specs/auth-manual-testing-guide.md`; read
> that guide first if you haven't tested the base auth system yet — this
> guide assumes the reader already knows how NextAuth sessions, cookies, and
> rate limiting work in this repo and focuses only on what's new here.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Backend API Testing](#backend-api-testing)
  - [1. OAuth Upsert & Onboarding](#1-oauth-upsert--onboarding)
  - [2. Password Registration & Confirmation Email](#2-password-registration--confirmation-email)
  - [3. Campaign Links CRUD](#3-campaign-links-crud)
  - [4. Health Probe](#4-health-probe)
- [Frontend Flow Testing](#frontend-flow-testing)
  - [1. Google OAuth Sign-In + Onboarding](#1-google-oauth-sign-in--onboarding)
  - [2. Password Registration Flow](#2-password-registration-flow)
  - [3. Institution Dashboard](#3-institution-dashboard)
  - [4. Campaign Links Page](#4-campaign-links-page)
  - [5. Public Dashboard](#5-public-dashboard)
  - [6. PostHog Instrumentation](#6-posthog-instrumentation)
  - [7. Full Funnel Playthrough](#7-full-funnel-playthrough)
- [Edge Cases & Error Scenarios](#edge-cases--error-scenarios)
- [Security Verification](#security-verification)
- [Cross-Institution Isolation](#cross-institution-isolation)
- [Rate Limiting & Caching](#rate-limiting--caching)
- [Troubleshooting](#troubleshooting)
- [Sign-Off Checklist](#sign-off-checklist)

## Prerequisites

- Node version matching `front/package.json` / `back/package.json` engines.
- Docker running (`make up`) or Turbo dev (`make local-all`).
- On branch `feat/dashboard-edital`, `npm install` run at the root.
- `make db-migrate` applied (new migration: `CreateCampaignLinkTable`, plus
  the `institutionName` column on `User`).
- A **Google Cloud OAuth client** (test credentials) if testing the Google
  sign-in path, or skip to the password-auth path if unavailable.
- A **PostHog project** with a personal API key (`phx_…`) if testing the
  query layer / dashboard numbers against live data. Without it, the app
  still boots — `/api/edital/health` reports `configured:false` and the
  dashboard renders its "not configured" empty states.
- Access to inspect outgoing emails (`EMAIL_PROVIDER=mock` logs the link to
  the backend console; a real SMTP/Resend provider requires an inbox).
- `.env` values to set (see `.env.example` for placeholders):

  ```
  AUTH_SECRET=
  AUTH_TRUST_HOST=true
  AUTH_GOOGLE_ID=
  AUTH_GOOGLE_SECRET=
  AUTH_OAUTH_UPSERT_TOKEN=
  BACKEND_INTERNAL_URL=http://back:3001
  POSTHOG_PERSONAL_API_KEY=
  POSTHOG_PROJECT_ID=
  POSTHOG_QUERY_HOST=https://us.posthog.com
  POSTHOG_QUERY_CACHE_TTL_MS=300000
  EDITAL_PERIOD_START=
  ```

  > **Note:** `POSTHOG_QUERY_HOST` is the **Query API host** (`us.posthog.com`
  > or `eu.posthog.com`), not the ingestion host used by the client-side
  > `NEXT_PUBLIC_POSTHOG_HOST`. Don't confuse the two when configuring.

## Environment Setup

> **Note:** the repo has no default `compose.yaml` — the dev stack lives in
> `compose.development.yaml`. Plain `docker compose …` commands fail with
> `no configuration file provided: not found` unless you pass
> `-f compose.development.yaml` (the `make` targets already do this). To
> avoid repeating the flag, run `export COMPOSE_FILE=compose.development.yaml`
> once per shell.

```bash
make up                                                    # builds and starts the dev stack (detached)
docker compose -f compose.development.yaml ps              # expect: nginx, front, back, postgres
make db-migrate                                            # runs inside the back container — stack must be up
docker compose -f compose.development.yaml logs -f back    # tail for OAuth/password auth requests
docker compose -f compose.development.yaml logs -f front   # tail for edital route handler errors
```

`make development-ps` and `make logs` (all services) are equivalent shortcuts.

Confirm `/api/edital/health` responds before testing anything else:

```bash
curl -s http://localhost:3000/api/edital/health | jq
# { "configured": true }   (or false, if PostHog env vars are unset)
```

## Backend API Testing

All backend endpoints below are under the `/api/v1` prefix. Endpoints in
§1 and §3 require the shared `x-oauth-upsert-token` header — they are
**not meant to be called directly by a browser**; the front proxies them
server-side. Curl them directly here to test the backend contract in
isolation, the same way `auth-manual-testing-guide.md` tests `/auth/*`.

> **Coverage gap:** as of this branch, none of `oauth-upsert.controller.ts`,
> `password-auth.controller.ts`, or the `campaign-links` module have
> `.spec.ts` files. The curl commands below are currently the **only**
> verification these endpoints get — treat this section as mandatory, not
> optional.

### 1. OAuth Upsert & Onboarding

#### 1.1 Upsert a new institution account (simulates Google sign-in)

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/oauth/upsert \
  -H "Content-Type: application/json" \
  -H "x-oauth-upsert-token: $AUTH_OAUTH_UPSERT_TOKEN" \
  -d '{"email":"escola-teste@example.com","firstName":"Escola","lastName":"Teste"}'
```

**Expected Response (200/201):** a user object with `role: "institution"`,
`institutionSlug: null`, `isEmailVerified: true`.

#### 1.2 Upsert without the shared token

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/oauth/upsert \
  -H "Content-Type: application/json" \
  -d '{"email":"x@example.com","firstName":"X","lastName":"Y"}'
```

**Expected Response (401/403):** rejected — `OAuthUpsertTokenGuard` fails
closed. If `AUTH_OAUTH_UPSERT_TOKEN` is unset in the backend's own env,
**every** call must be rejected, never silently allowed through.

#### 1.3 Upsert an email that already exists as a player account

**Expected Response (409 Conflict).** Verify the front surfaces this as
`/login?error=EmailConflict` with the message *"Este e-mail já está
cadastrado como conta de jogador..."*.

#### 1.4 Onboarding — set the institution name/slug

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/oauth/onboarding \
  -H "Content-Type: application/json" \
  -H "x-oauth-upsert-token: $AUTH_OAUTH_UPSERT_TOKEN" \
  -d '{"userId":"<uuid-from-1.1>","institutionName":"Escola Teste"}'
```

**Expected Response (200):** slug derived via `slugify("Escola Teste")` →
`escola-teste`. Repeat with the same name for a second user — expect a
disambiguated slug (`escola-teste-a1b2` or similar), not a collision error.

> **Security Check:** the front proxy (`/api/institution/onboarding`) must
> derive `userId` only from the trusted session, never trust a `userId` in
> the request body. Confirm by reading
> `front/src/app/api/institution/onboarding/route.ts`.

### 2. Password Registration & Confirmation Email

#### 2.1 Register a new institution account

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/password/register \
  -H "Content-Type: application/json" \
  -d '{"email":"nova-escola@example.com","password":"SenhaForte123!","institutionSlug":"nova-escola","nickname":"Nova Escola"}'
```

**Expected Response (200/201):** generic `{"message":"Check your email"}` —
no confirmation of whether the email was new or a duplicate.

**Verify in backend logs / mock email provider:** a confirmation email
(magic-link style, 15-minute expiry) was sent — this is new behavior on
this branch; the old flow auto-verified with no email step.

With `EMAIL_PROVIDER=mock` (the local default) nothing is actually emailed;
the link is printed to the backend console instead:

```bash
docker compose -f compose.development.yaml logs back | grep MockEmail
# or: docker logs gameplate-back-1 | grep MockEmail
```

Look for a line like:

```
[MockEmail] Verification to nova-escola@example.com: http://localhost/confirm-verification?token=<token>
```

#### 2.2 Consume the confirmation link

Copy the `token` query parameter from the `[MockEmail] Verification to …`
log line (see 2.1) and confirm it both
verifies **and logs in** in one call:

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/password/verify-email/confirm \
  -H "Content-Type: application/json" \
  -d '{"token":"<token>"}'
```

**Expected:** account now `isEmailVerified: true`, and the response/session
indicates an authenticated session was created.

#### 2.3 Register with an invalid `institutionSlug`

Try `institutionSlug: "Not Valid!"` — expect a 400 (must match
`/^[a-z0-9]+(-[a-z0-9]+)*$/`, ≤64 chars).

#### 2.4 Password reset

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/password/reset/request \
  -H "Content-Type: application/json" -d '{"email":"nova-escola@example.com"}'
```

With the mock provider, the reset link is logged under the **magic link**
label, not a dedicated reset label:

```bash
docker compose -f compose.development.yaml logs back | grep MockEmail
# [MockEmail] Magic link to nova-escola@example.com: http://localhost/reset-institution-password?token=<token>
```

Follow that link to `/reset-institution-password?token=…`, then:

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/password/reset/confirm \
  -H "Content-Type: application/json" \
  -d '{"token":"<token>","newPassword":"OutraSenha456!"}'
```

### 3. Campaign Links CRUD

All calls require `x-oauth-upsert-token` — these are backend-internal,
never called directly by the browser (front proxies via `/api/edital/links`,
tested in the Frontend section below).

#### 3.1 Create a campaign link

```bash
curl -s -X POST http://localhost:3001/api/v1/campaign-links \
  -H "Content-Type: application/json" \
  -H "x-oauth-upsert-token: $AUTH_OAUTH_UPSERT_TOKEN" \
  -d '{"institutionSlug":"escola-teste","source":"turma-3a"}'
```

**Expected (201):** `{id, institutionSlug, source, createdAt}`.

#### 3.2 List links for an institution

```bash
curl -s "http://localhost:3001/api/v1/campaign-links?institutionSlug=escola-teste" \
  -H "x-oauth-upsert-token: $AUTH_OAUTH_UPSERT_TOKEN"
```

#### 3.3 Delete a link belonging to a different institution

```bash
curl -s -X DELETE "http://localhost:3001/api/v1/campaign-links/<id>?institutionSlug=outra-escola" \
  -H "x-oauth-upsert-token: $AUTH_OAUTH_UPSERT_TOKEN"
```

**Expected (403):** ownership check rejects cross-institution delete.
Deleting a non-existent id returns 404.

#### 3.4 Duplicate source

Create the same `source` twice for the same `institutionSlug` — the front
proxy layer (`campaignLinks.ts`) should surface this as a 409 with message
*"Já existe um link com este nome de grupo/turma"*.

### 4. Health Probe

```bash
curl -s http://localhost:3000/api/edital/health | jq
```

**Expected:** `{configured: true}` when all three PostHog env vars
(`POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_QUERY_HOST`) are
set; `{configured: false}` if any is missing. This route makes **no**
upstream PostHog call — it's a cheap local check.

## Frontend Flow Testing

### 1. Google OAuth Sign-In + Onboarding

1. Navigate to `/login`, click "Entrar com Google".
2. Complete the Google consent screen with a test account.
3. **Expected:** if this is a brand-new email, land on
   `/institution/onboarding` (role is `institution` but `institutionSlug`
   is `null`).
4. Fill "Nome da instituição" → submit.
5. **Expected:** NextAuth session updates (`update({institutionSlug})`),
   redirect lands on `/institution`.
6. **Verify in DevTools:** Application → Cookies — a NextAuth session
   cookie is set; no `institutionSlug` leaks into the URL.
7. Sign out, sign back in with the same Google account.
8. **Expected:** since `institutionSlug` is now set, land directly on
   `/institution` — onboarding is not shown again.

### 2. Password Registration Flow

1. Navigate to `/register`, fill email/password/institution name.
2. **Expected:** generic success message, no auto-login.
3. Get the confirmation link. Locally (`EMAIL_PROVIDER=mock`) no email is
   sent — the link only appears in the backend logs:

   ```bash
   docker compose -f compose.development.yaml logs back | grep MockEmail
   # [MockEmail] Verification to <email>: http://localhost/confirm-verification?token=<token>
   ```

   With a real provider, check the inbox instead.
4. Open the link in the same browser.
5. **Expected:** account verified and the browser lands authenticated on
   `/institution` (or an onboarding step if no slug was captured at
   registration time).
6. **Password reset via UI:** request a reset from the login page, then grab
   the link the same way — it is logged as
   `[MockEmail] Magic link to <email>: http://localhost/reset-institution-password?token=<token>`.
   Open it, set a new password, and sign in with it.

### 3. Institution Dashboard

All four pages live under `/institution/*`, behind `InstitutionGuard` +
`middleware.ts` (role must be `institution`, slug must be set).

| Route | What to check |
|---|---|
| `/institution` | "Painel institucional" header, hero metric (`gameplay_started` count), KPI cards for sessões iniciadas / taxa de entrada / taxa de conclusão / tempo médio de sessão / progresso médio, a "Desempenho por fase" bar chart (quiz pass rate per level), and a `QuickRead` insights block. |
| `/institution/funnel` | "Progressão da jornada" — full acquisition-through-every-level funnel, plus an "Insights do funil" panel. Step labels for the 3 acquisition steps are human-readable pt-BR overrides (`STEP_LABELS`); level steps use the level's own title as sent by the server. |
| `/institution/report` | KPI cards — "Sessões iniciadas", "Tempo médio de sessão" (with median subtitle), "Taxa de conclusão" — plus a consolidated `DataTable` with per-phase quiz-approval breakdown, and a CSV export button. |
| `/institution/links` | Campaign Links CRUD — see §4 below. |

For each page:

1. Toggle every date-range preset: **Hoje**, **7 dias**, **30 dias**,
   **90 dias**, **Tudo**, **Personalizado** (custom picker, validates
   `from <= to`).
2. Apply a turma filter (`?turma=turma-3a` in the URL) and confirm the
   numbers narrow to that turma; clear it and confirm it falls back to
   institution-wide (a malformed/unknown turma value must **not** 400 —
   it silently falls back).
3. Confirm all filter state round-trips through the URL (reload the page
   with the same query string, confirm the same filters are pre-selected).
4. On `/institution/report`, click **Exportar CSV**:
   - Open the file in a spreadsheet app with pt-BR locale.
   - **Expected:** accented characters intact (UTF-8 BOM), `;` as the
     column delimiter, decimal commas (not dots) in numeric columns.

### 4. Campaign Links Page

`/institution/links`:

1. Enter a turma/group name in "Nome da turma/grupo" — the field validates
   live against `ORIGIN_SLUG_PATTERN` (`/^[a-z0-9]+(-[a-z0-9]+)*$/`:
   lowercase letters, digits, single hyphens, no leading/trailing hyphen).
2. Click "Criar link" → list refreshes, a tracking URL appears in the form
   `https://guardiaodacultura.42.rio/?utm_institution=<slug>&utm_source=<source>`.
3. Click the copy button → clipboard receives the URL, a confirmation
   snackbar appears.
4. Click delete on a link → confirm the dialog → link disappears from the
   list.
5. **Verify in DevTools Network tab:** no PostHog capture call fires while
   creating/copying/deleting a link on this page — link management is
   deliberately silent, unlike every other dashboard page.
6. Scroll to "Origens (últimos 30 dias)" — a **read-only** table, grouped
   by raw `utm_source`, institution-wide (not affected by the turma
   filter above — this is the older, static origins view, separate from
   the dynamic campaign-links table).

### 5. Public Dashboard

`/public-dashboard` — no login required.

1. Open in an incognito/logged-out browser session.
2. **Expected:** loads without any redirect to `/login`.
3. Confirm the URL never accepts a `?slug=` or `?turma=` parameter — this
   page is aggregate-across-every-institution by design, never
   per-institution.
4. Check the period presets available: only **7 dias / 30 dias / 90 dias /
   Tudo** — no "Hoje" or custom range (narrower than the institution
   dashboard, verify this is intentional, not a bug).
5. Confirm the annual-goal progress bar renders against
   `EDITAL_ANNUAL_PLAYER_GOAL`, the player-trend chart is monthly, and the
   origin-split table separates institutional vs. spontaneous traffic.
6. **No automated test exists for this page yet** — this manual pass is
   its only current coverage. Take extra care here.

### 6. PostHog Instrumentation

1. Clear cookies, visit `/?utm_institution=escola-teste&utm_source=turma-3a`.
2. **Verify in DevTools → Application → Cookies:** `gp_distinct_id` is set
   (Max-Age ≈400 days), and `gp_distinct_id_seeded` appears briefly
   (60s TTL) — only present right after the cookie is first minted.
3. **Verify in DevTools → Network**, filter your PostHog ingestion host:
   outgoing capture calls carry `anonymous_player_id`, `campaign_source`,
   `turma_source`, `session_id`, `device_type`, `event_name`,
   `event_timestamp` on every event — including internal PostHog events
   like `$pageview`.
4. Reload the same page **without** the `utm_*` params.
5. **Expected:** `campaign_source`/`turma_source` persist from the first
   visit (first-touch attribution — PostHog's `register()` won't
   overwrite an already-set super-property).
6. Try a poisoned slug, e.g. `?utm_institution=<script>` — confirm it's
   rejected/sanitized (must match `/^[a-z0-9]+(-[a-z0-9]+)*$/`, ≤100 chars)
   and does not get written as a super-property verbatim.
7. In the PostHog project's Live Events view, filter by your session's
   distinct_id and confirm the same properties appear server-side.
8. **Key leak check:**
   ```bash
   cd front && grep -r "phx_" .next/static/ ; echo "exit: $?"
   ```
   **Expected:** no matches (exit code 1) — the personal Query API key
   must never reach the browser bundle.

### 7. Full Funnel Playthrough

> **Correction:** an earlier draft of this section described a 7-step
> funnel ending in `chapter_1_started`/`chapter_1_completed`. That pair
> only ever covered level 1 and was **replaced** by issue #807 — see
> `front/src/lib/edital/server/queries.ts` (`getFunnelSteps()`), which
> explicitly warns against using `chapter_1_started`/`chapter_1_completed`
> "como base geral". The dashboard's actual funnel (`buildFunnelQuery`,
> feeding both `/institution/funnel` and the overview page) is:

| # | Step | Condition used by `queries.ts` | Where it fires |
|---|---|---|---|
| 1 | `landing_page_viewed` | `event = 'landing_page_viewed'` | `PlayLanding.tsx` |
| 2 | `play_clicked` | `event = 'play_clicked'` | `PlayLanding.tsx` (`handlePlay`) |
| 3 | `gameplay_started` | `event = 'gameplay_started'` | `Game.ts` `create()`, once per session (`captureOncePerSession`) |
| 4 | "Concluiu Fase 1" | `event = 'level_completed' AND level_number = 1` | `QuizManager.ts`, level 1 quiz success |
| 5 | "Concluiu Fase 2" | `event = 'level_completed' AND level_number = 2` | `QuizManager.ts`, level 2 quiz success |
| 6 | "Concluiu Fase 3" | `event = 'level_completed' AND level_number = 3` | `QuizManager.ts`, level 3 quiz success |

This list is **dynamic on `LEVEL_REGISTRY`** — if a 4th level ships, the
funnel gains a 7th step automatically; re-verify the step count matches
`LEVEL_REGISTRY`'s length whenever a level is added or removed.

Play through all 3 levels and confirm each `level_completed` step
increments only after that level's end-of-level quiz is passed (a failed
quiz emits `level_failed` instead and must **not** advance the funnel).

**Other real events to check, even though they don't feed the funnel
query directly** — these still matter for the legacy Postgres dashboard
(`game_event`) and for `chapter_id` context-setting used by `before_send`:

| Event | Still fires? | Feeds |
|---|---|---|
| `chapter_1_started` | Yes, level 1 only | `game_event` (legacy dashboard), sets `chapter_id` context |
| `chapter_1_completed` | Yes, level 1 only, after `quiz_completed` | `game_event` (legacy dashboard) |
| `quiz_started` / `quiz_completed` | Yes, every level's end-of-level quiz | Dual-emitted alongside `quiz_answered`/`quiz_answer_submitted`; not a funnel step itself |

Also confirm:

- Renaming/removing the level-1 tilemap asset locally causes
  `critical_error_occurred{error_code: "asset_load_failed", is_blocking: true}`
  to fire — and does **not** get miscounted under `game_load_failed`
  (that event covers only `player_id_resolution`/`module_import`/
  `phaser_init` stages).
- Close the tab mid-session — a `session_finished` event fires with a
  plausible `duration_seconds`.
- Repeat the playthrough on a second device/browser with the same
  `?utm_institution=` — confirm `turma_source`/`campaign_source` are
  consistent per browser, independent per device.

## Edge Cases & Error Scenarios

### OAuth email conflict

Sign in with Google using an email that already has a **player** account.
**Expected:** 409 from `/auth/oauth/upsert`, front redirects to
`/login?error=EmailConflict` with the Portuguese conflict message.

### Unlinked institution session

Manually clear `institutionSlug` on a test session (or intercept before
onboarding completes) and hit `/institution` directly.
**Expected:** redirected to `/institution/onboarding`; no PostHog Query
API call is made server-side for the unlinked state (check backend logs —
zero HogQL requests).

### Malformed turma/campaign slug in the URL

Visit `/institution/funnel?turma=Not_Valid!!`.
**Expected:** falls back to institution-wide data — **not** a 400 error.

### `EDITAL_PERIOD_START` unset

With this var unset (the current `.env.example` default), select
**Tudo** (all-time) on any dashboard page.
**Expected (known, documented gap):** the range's lower bound falls back
to the Unix epoch — effectively unbounded. This is expected behavior
until a real production deploy date is recorded in this variable; don't
file it as a new bug, but do confirm the dashboard doesn't error out.

### Query API caching / single-flight

Load `/institution` twice in quick succession (two tabs, same filters).
**Expected:** only one upstream HogQL call is made within the
`POSTHOG_QUERY_CACHE_TTL_MS` window (default 5 min) — verify via backend
logs or your PostHog project's own API-usage view, not by counting
network calls in the browser (both tabs call the front's own API route;
the cache lives server-side).

### Open-redirect guard

Try `/login?redirect=https://evil.example.com` and `/login?redirect=//evil.example.com`.
**Expected:** rejected by `safeRedirectTarget()` — only paths starting
with `/institution` are honored.

## Security Verification

### Cookie Flags

| Cookie | httpOnly | Secure | SameSite | Notes |
|---|---|---|---|---|
| `gp_distinct_id` | No (client-readable by design — read by posthog-js) | Yes (prod) | Lax | Max-Age ≈400 days |
| `gp_distinct_id_seeded` | No | Yes (prod) | Lax | 60s TTL, migration marker only |
| NextAuth session cookie | Yes | Yes (prod) | Lax | Standard NextAuth v5 behavior — see the auth guide |

### Shared-secret endpoints

- Confirm `x-oauth-upsert-token` uses a constant-time compare
  (`timingSafeEqual`) — check `OAuthUpsertTokenGuard`'s implementation,
  not just its behavior, since timing attacks aren't observable via curl
  alone.
- Confirm the backend refuses to boot (or fails every call) if
  `AUTH_OAUTH_UPSERT_TOKEN` is unset in a production-like environment —
  this must fail closed, never open.

### PostHog key isolation

Re-run the `grep -r "phx_" front/.next/static/` check from §6 above as
part of every release candidate build, not just once during development.

### Campaign-links ownership

Re-confirm §3.3 above (cross-institution delete → 403) — this is the only
place in the epic where one institution could otherwise read/mutate
another's data if the guard regressed.

## Cross-Institution Isolation

1. Create two institution accounts, A and B, each with their own turma
   links and gameplay traffic (use distinct `utm_institution` values).
2. Log in as A, view `/institution`, `/institution/funnel`,
   `/institution/report`, `/institution/links`.
3. **Expected:** every number and every listed link belongs to A only.
4. Log out, log in as B, repeat.
5. **Expected:** B never sees A's turma names, links, or metrics, and vice
   versa. Confirm this holds even when both institutions used the same
   turma **name** (e.g. both created a `"turma-3a"` link) — they must
   remain scoped by `institutionSlug`, not collide.
6. Confirm `/public-dashboard` is the **only** page where cross-institution
   aggregate numbers are expected to appear — everywhere else, isolation
   must hold.

## Rate Limiting & Caching

| Endpoint | Limit | Test Method |
|---|---|---|
| `POST /auth/password/register` | 3/hour per email | Loop the curl from §2.1 4x, expect 429 on the 4th |
| `POST /auth/password/login` | 5/15min per email | Loop wrong-password attempts, expect 429 |
| `POST /auth/password/reset/request` | 3/hour per email | Loop the curl from §2.4 |
| PostHog Query API (via `/api/edital/*`) | Server-enforced by PostHog itself (429 + `retry-after`) | Force many distinct filter combinations quickly; confirm the app surfaces a graceful error, not a crash |
| Query result cache | `POSTHOG_QUERY_CACHE_TTL_MS` (default 300000ms), max 200 entries | Repeated identical-filter loads within the TTL should not increase PostHog API call volume |

## Troubleshooting

### `/api/edital/health` reports `configured: false`

Check all three of `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`,
`POSTHOG_QUERY_HOST` are set in the **front** service's env — this is a
server-only key, distinct from the client-side `POSTHOG_API_KEY`.

### Confirmation email never arrives

Check `EMAIL_PROVIDER` — if `mock`, the link is logged to the backend
console, not actually emailed:

```bash
docker compose -f compose.development.yaml logs back | grep MockEmail
```

Confirmation links appear as `[MockEmail] Verification to …`; password-reset
links appear as `[MockEmail] Magic link to …`.

### CSV opens with garbled accents in Excel

Confirm the file starts with a UTF-8 BOM (`EF BB BF`) — if a browser
extension or intermediate tool stripped it, re-download directly.

### Dashboard numbers don't match a manual PostHog SQL query

Run the equivalent HogQL query by hand in the PostHog SQL editor,
using the same `commonPredicate` filters (`anonymous_player_id != ''`,
`campaign_source = '<slug>'`, timestamp window) as `queries.ts` builds —
a mismatch usually means a filter (turma, date clamp) isn't being applied
identically.

### `turma_source`/`campaign_source` never appears on events

Check first-touch stickiness didn't already lock in a different (or
empty) value from an earlier visit in the same browser — clear
`localStorage`/cookies and retry with the `?utm_*` params present on the
very first page load.

## Sign-Off Checklist

### OAuth & Onboarding

- [ ] Google sign-in creates a new institution account
- [ ] New account without a slug is redirected to `/institution/onboarding`
- [ ] Onboarding derives a unique slug from the institution name
- [ ] Email conflict (existing player account) surfaces `EmailConflict` on `/login`
- [ ] `x-oauth-upsert-token` fails closed when unset or mismatched

### Password Auth

- [ ] Registration sends a real confirmation email (not auto-verified)
- [ ] Confirmation link verifies and logs in in one step
- [ ] Login/register/reset all respect their rate limits
- [ ] Invalid `institutionSlug` format is rejected

### Campaign Links

- [ ] Create/list/delete works end-to-end via the `/institution/links` UI
- [ ] Slug validation matches `ORIGIN_SLUG_PATTERN`
- [ ] Duplicate `source` for the same institution returns 409
- [ ] Cross-institution delete is rejected (403/404)
- [ ] No PostHog events fire while managing links

### Institution Dashboard

- [ ] Overview, Funnel, and Report pages load with all date-range presets
- [ ] Turma filter narrows results; invalid turma falls back gracefully
- [ ] CSV export opens correctly in pt-BR Excel (BOM, `;`, decimal comma)
- [ ] Filter state round-trips through the URL on reload

### Public Dashboard

- [ ] Loads with no authentication required
- [ ] Shows aggregate numbers only, never per-institution breakdowns
- [ ] Only 7d/30d/90d/all-time presets are available

### PostHog Instrumentation

- [ ] `gp_distinct_id` cookie persists across reloads (~400 day Max-Age)
- [ ] First-touch `campaign_source`/`turma_source` stick across reloads without the param
- [ ] Poisoned/malformed UTM slugs are sanitized, not passed through raw
- [ ] `phx_` key never appears in the built front-end bundle

### Funnel Events

- [ ] All 3 acquisition steps (`landing_page_viewed`, `play_clicked`, `gameplay_started`) fire in order
- [ ] Each level's `level_completed` (with correct `level_number`) fires on quiz success, advancing the funnel step for that level
- [ ] Funnel step count matches `LEVEL_REGISTRY`'s length (3 acquisition + 1 per level)
- [ ] `gameplay_started` fires exactly once per session, not per level
- [ ] A failed end-of-level quiz emits `level_failed`, not `level_completed`, and does not advance the funnel
- [ ] `critical_error_occurred` fires on a forced asset-load failure
- [ ] `chapter_1_started`/`chapter_1_completed` still fire for level 1 (legacy `game_event` consumer) but are confirmed absent from the dashboard's own funnel query

### Security

- [ ] Shared-secret endpoints use constant-time comparison and fail closed
- [ ] Cross-institution isolation holds on every dashboard page except the public one
- [ ] Open-redirect guard rejects external `?redirect=` targets on `/login`

*End of Manual Testing Guide*
