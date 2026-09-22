# Implementation Status — Epic #738: Dashboard do Edital

This document was originally a forward-looking execution plan (one step per issue, written before
any of the work started). All 12 sub-issues (#739–#748, plus #807 and #808, added after this plan
was written) have since shipped on `feat/dashboard-edital`. This revision replaces the plan with a
**status record**: what each step actually became, verified against the code on this branch, not
what was proposed.

Renamed from `implementation-plan-738-dashboard-edital.md` to drop the issue number from the
filename (the epic is #738 either way; the number added nothing findable that the content and
directory don't already give).

Legend: ✅ shipped as planned · 🔁 shipped, materially different from the plan · ➕ shipped, not in
the original plan at all.

---

## What shipped beyond the original 10 issues

Two sub-issues were added mid-epic, after the ordering below was written, and are folded into the
relevant steps:

- **#807** — per-turma (per-class) campaign links and per-phase metrics. Adds a real backend
  `CampaignLink` entity/table (`back/src/modules/campaign-links/`) beyond the plan's "registry as
  TypeScript, no table" design for institution-level origins — turma links are dynamic and
  user-created, so they need persistence the static registry doesn't.
- **#808** — a public, unauthenticated aggregate dashboard (`front/src/app/public-dashboard/page.tsx`,
  `front/src/app/api/public/dashboard/route.ts`) for external reporting to the Rouanet program,
  reusing the query/cache layer built in step 4 but with its own sibling query builders
  (`globalQueries.ts`, `globalMetrics.ts`) that never take a `Scope` — aggregate-across-everyone by
  design, never per-institution.

A third addition, not tracked under any of the original issue numbers: **institution password
registration now sends a real confirmation email** (magic-link-style, mirroring the old deleted
player flow) before the account can log in, plus a matching password-reset email — both using a
shared branded HTML template. This closed a gap where `PasswordAuthService.register` originally
marked accounts verified immediately with no email step at all.

---

## Step 0 — Onepager + #739(a)(b)(c) answers — ✅ done

`docs/specs/edital-onepager.md` exists, with the 7-step funnel and `EDITAL_PERIOD_START` both
recorded. The three spike questions were answered and are reflected in what was actually built:

- **(a) `windowFunnel`**: implemented with an explicit fallback path — `queries.ts` uses
  `uniqExactIf` per event name for Q1-style aggregates and `windowFunnel` for the ordered funnel,
  with the fallback rationale recorded in code comments.
- **(b) Query API rate limits**: resolved by the module cache + single-flight design in step 4/7,
  not by a hard rate-limit number — the mitigation was built regardless of the exact limit.
- **(c) NextAuth v5 on Next 16.2.9**: confirmed working. `front/src/auth.ts` / `auth.config.ts`
  ship the Edge/Node split exactly as planned, on Next 16.2.9, with Credentials + Google providers.

Attribution model (event property, not person property) shipped as decided — see `campaign.ts`,
`origins.ts`, and the `campaign_source`/`turma_source` properties threaded through every event.

---

## Step 1 — #743: env and infra — ✅ done

All three compose files (`compose.development.yaml`, `compose.staging.yaml`,
`compose.production.yaml`) carry `AUTH_TRUST_HOST` and `AUTH_OAUTH_UPSERT_TOKEN`. `.env.example`
documents `POSTHOG_PERSONAL_API_KEY` (the `phx_` personal key, distinct from the `phc_` write key),
`AUTH_TRUST_HOST`, and `AUTH_OAUTH_UPSERT_TOKEN`. `docs/specs/posthog-implementation-plan.md` was
amended with the server-only personal-key exception the plan called for. Replica count (1) and its
implication for the module cache are recorded in code comments in `metrics.ts`, not left as a
standalone issue note.

---

## Step 2 — #740: identity foundation — ✅ done

`front/src/lib/edital/anonymousPlayer.ts` implements the durable-cookie identity described in the
plan: server-set cookie via `middleware.ts` (not the provider — the plan's own leaning was
confirmed and taken), explicit `Max-Age`, one-time migration seed from the legacy
`gp_fallback_guest_id` localStorage value, never the reverse. `PostHogProvider.tsx` and
`beforeSend.ts`/`eventContext.ts` (`front/src/lib/posthog/`) implement init-timing and
`before_send` as a total, never-throwing backstop — matching the plan's explicit rule against using
it to rename or fan out events. `back/src/modules/game/game.controller.ts` and
`back/src/modules/posthog/posthog.controller.ts` carry the cookie-precedence fallback.

---

## Step 3 — #741: canonical dual-emit — ✅ done

`EVENTS.md` documents all 7 canonical events (`play_clicked` through `chapter_1_completed`) as
live, dual-emitted alongside their legacy counterparts, with the legacy/canonical mapping table
explicit about intentional differences (e.g. `gameplay_started` fires once per session via
`captureOncePerSession`, where the legacy `game_started` still fires once per level).
`critical_error_occurred` is wired to `Game.ts`'s real asset `loaderror` (the plan's "fix the
no-op `handleLoadingError`" task) and mirrors into `game_event` with `severity: "critical"`.

The `game_event(timestamp, type)` index migration was folded in as planned
(`1780000000007-AddGameEventTimestampTypeIndex.ts`) — 🔁 with one correction made during this
epic's own review pass: the original migration used a plain `CREATE INDEX`, which would have
locked writes on a large table; it now uses `CREATE INDEX CONCURRENTLY` with
`transaction = false`.

---

## Step 4 — #742a: pure query lib + `/api/edital/health` — ✅ done

`front/src/lib/env-server.ts` carries the four (now more — turma/campaign-links/public-dashboard
additions grew this) optional PostHog/query fields behind `import "server-only"`, as a build-time
guarantee. `front/src/lib/edital/server/{hogql,queries,metrics,period,csv}.ts` and the client-safe
`front/src/lib/edital/types.ts` all exist. The branded, un-forgeable `Scope` type shipped exactly as
specified — every query builder takes `Scope` as its first argument, producible only via
`resolveScope(session)`.

🔁 One deviation from the plan: the module cache didn't stay a single per-request cache — it grew
a companion `rows.ts` (`rowsToLevelMap`) and `numeric.ts` (`toNumber`) helper module, and a parallel
`levels.ts` constant, once the same per-level aggregation pattern was needed by both the
institution-scoped and the later public-dashboard (#808) query paths — extracted during this
epic's own cleanup pass rather than duplicated three times.

---

## Step 5 — #739(d): `EDITAL_PERIOD_START` — 🔁 done, more general than planned

Implemented as **read from environment** (`front/src/lib/env-server.ts`'s `editalPeriodStart`
field), not as a hardcoded constant the way the plan phrased it ("record the #740 deploy date...
wire the constant"). `period.ts`'s `all-time` clamp reads it at request time; when unset, `all-time`
has no lower bound (documented and tested in `period.test.ts`) rather than defaulting to a
hardcoded date — a more defensive choice than the plan called for, since it means an unset value
fails safe (unclamped, matching "we genuinely don't know yet") instead of silently using a wrong
baked-in date.

---

## Step 6 — #744: NextAuth and tenancy — ✅ done, 🔁 no coexistence window

`auth.ts`/`auth.config.ts` split as planned. `back/src/modules/auth/controllers/oauth-upsert.controller.ts`
implements the upsert endpoint behind `OAuthUpsertTokenGuard` (constant-time token compare via
`timingSafeEqual`, fails closed if the token isn't configured). Migrations added
`institutionSlug`/`institutionName`/`passwordHash` columns to `User`. `resolveScope(session)` is
the only legal path to a `Scope` (`front/src/lib/edital/server/scope.ts`).

🔁 The plan anticipated an "accepted-risk coexistence window" between the old self-assignable
`register.dto.ts` role and the new NextAuth tenancy. That entire old auth system
(`AuthController`, `AuthService`, `register.dto.ts`, the whole `(auth)` route group) was **deleted
outright** rather than left coexisting — so the coexistence-window risk never materialized; there
was no window.

---

## Step 7 — #742b: the five session-gated route handlers — 🔁 done, six routes not five

All routes take `Scope` from `resolveScope(session)`, never a request parameter — verified
directly in `routeGuard.ts`'s own doc comment ("`?slug=`/`?campaign=` are not read anywhere in this
file, or anywhere downstream"). Routes shipped: `summary`, `funnel`, `report`, `report.csv`,
`campaigns`, plus `links`/`links/[id]` for campaign-link CRUD (not in the original five, but the
same session-gated pattern). ClickHouse-scan mitigations (row cap on CSV, mandatory date-range
floor) are in place.

🔁 One gap found and fixed during this epic's own review: `summary`, `report`, `funnel`,
`campaigns`, and `report.csv` originally had no `try`/`catch` around their `Promise.all` HogQL
calls — a query failure surfaced as an unhandled 500 instead of a clean error response. Fixed to
match the pattern `links`/`links/[id]` already used correctly.

---

## Step 8 — #745: the three screens — ✅ done, plus a fourth (public dashboard, #808)

`institution/page.tsx` (Resumo Executivo), `institution/funnel/page.tsx`, and
`institution/report/page.tsx` all ship, using `useAsyncData` (with the retry-clears-error fix the
plan called for) and a typed `DateRange` union (not the bare `string` the plan found). `FunnelStep`
carries an optional absolute `count`, as planned. The forbidden "Login concluído" metric and any
`*_TARGETS` constant are gone; `/institution/settings` was deleted along with its nav link.

➕ `front/src/app/public-dashboard/page.tsx` (#808) is a fourth screen the plan never anticipated —
a public, unauthenticated aggregate view for the Rouanet reporting requirement, sharing the same
`Section`/`DataTable`/`KPICard` component family but its own page-local components
(`PublicKpiCard`, `PublicSectionHeading`) documented in-code as intentionally divergent from the
shared ones.

---

## Step 9 — #746: campaign links — 🔁 done, with a real backend added later (#807)

`front/src/lib/edital/origins.ts` ships the static institution-origin registry as planned
(TypeScript, no table). `institution/links/page.tsx` is the generator UI, emitting zero PostHog
events as required.

🔁 What the plan didn't anticipate: **#807** later required per-turma (per-class) links that
institutions create dynamically at runtime — the static registry can't hold those. A real
`CampaignLink` entity/table/module (`back/src/modules/campaign-links/`) was added specifically for
this, behind the same server-to-server trust boundary as the OAuth-upsert endpoint. The two systems
coexist deliberately: `origins.ts` for the fixed institution-level registry, the DB table for
per-turma links institutions generate themselves.

---

## Step 10 — #747: password provider — ✅ done, plus a missing piece added after

`back/src/modules/auth/services/password.service.ts` uses argon2id at OWASP-minimum parameters
(`m=19456, t=2, p=1`), documented against the container memory cap. `PasswordAuthService.login`
returns an indistinguishable generic error for wrong-password and unknown-email. Rate limiting uses
the same `@ThrottleByEmail` pattern the plan specified (confirmed: the generic `ThrottlerGuard` is
still not registered as a global `APP_GUARD` in `app.module.ts` — this is intentional per #742's
own note that per-route throttling is sufficient at institution-account scale, not an oversight).

🔁 **Gap found and closed after the fact, not part of the original #747 scope**: registration
originally marked `isEmailVerified: true` immediately, with no confirmation email at all —
mirroring nothing from the old (deleted) player flow. This was fixed to match what the old system
used to do: `register` now creates the account unverified, sends a real confirmation email (magic
link, 15-minute expiry, same `MagicLinkService`/`IEmailService` used elsewhere), and a new
`email-verification` NextAuth Credentials provider both verifies the account and logs the
institution straight into `/institution` when the link is clicked — `login` now refuses unverified
accounts. Both the registration-confirmation and password-reset emails use a shared branded HTML
template matching the product's Figma design (dark header with crest logo, gold pill button,
Lei Rouanet footer line) rather than the generic "42 Rio" template the rest of the app's emails
still use.

---

## Step 11 — #748: cleanup and docs — ✅ done

`analytics.controller.ts` and `dashboard.controller.ts` (the hardcoded-fake-data and duplicate
controllers) are deleted. The dead front wrapper `front/src/lib/api/analytics.ts` is deleted.
`EVENTS.md` corrects the `game_load_failed`/asset-load claim as planned.
`docs/specs/posthog-implementation-plan.md` carries the server-only personal-key exception. The
four-coexisting-analytics-stacks note (PostHog, Postgres pipeline, Contentsquare, Google Ads gtag)
is recorded in `EVENTS.md`, declaring PostHog the sole source of truth for the edital.

---

## Known gaps, as of this revision

Carried over from this epic's own end-of-epic review, not resolved by any step above:

- **`middleware.ts`**: the login redirect sets a `?redirect=` param that the login page didn't
  originally read (users always landed on `/institution` regardless of where they were bounced
  from) — fixed, with an open-redirect guard restricting the accepted value to `/institution/*`.
- **`next-auth.d.ts`**: `Session.user.id`/`role` were typed as always-present despite being set
  conditionally in the `session` callback — corrected to optional, matching what every real
  consumer already defensively checked for.
- **Migration `CREATE INDEX CONCURRENTLY`** (step 3) and the **`try`/`catch` gap** across five
  edital routes (step 7) — both listed above, both fixed on this branch before merge.
- **No test coverage exists yet** for `public-dashboard/page.tsx` (#808) — flagged, not yet closed.

---

## Verification, end to end

Reused from the original plan — still the canonical E2E gate, run against the actual system today:

1. `npm run typecheck && npm run lint && npm test` at the root (turbo, both workspaces).
2. `make db-migrate` up and `migration:revert` down for each new migration.
3. Local: `/?utm_institution=escola-teste`, then three hard reloads — confirm in PostHog live
   events that `distinct_id` is stable, that `landing_page_viewed` arrives with the full property
   set, and that `anonymous_player_created` fired once.
4. A full playthrough, checking the 7 steps in order, then close the tab and confirm
   `session_finished` with a plausible `duration_seconds` — repeat on iOS Safari.
5. Rename the level-1 tilemap and confirm `critical_error_occurred{is_blocking:true}`.
6. `curl` the Query API probe in both environments with the `phx_` key.
7. Run Q1 by hand in PostHog's SQL editor and diff it against `/api/edital/summary`, the overview
   page, and the CSV export — all must agree.
8. Log in as two institutions on different slugs and confirm isolation; confirm an unlinked account
   produces zero upstream PostHog calls in the server log.
9. `grep -r "phx_" front/.next/static/` must return nothing.
10. Open the exported CSV in Excel pt-BR: intact accents, one value per column.
11. Register a new institution account, confirm the verification email arrives (or, in local dev
    with `EMAIL_PROVIDER=mock`, that the link is logged), click it, and confirm it lands
    authenticated on `/institution`.
