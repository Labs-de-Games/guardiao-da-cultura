# Technical Discovery — Epic #738: Dashboard do Edital (per-institution metrics via PostHog)

**This is a discovery document, not an implementation plan to execute blindly.** It ends with a
recommended sequence, but its purpose is to let you make an informed decision about the overall
approach before any code is written.

Legend used throughout: **FACT** = verified in this repository at the cited `file:line`.
**ASSUMPTION** = my inference, not verified. **OPINION** = my judgement, argued.

---

## Context — why this initiative exists

The onepager *"Requisitos mínimos do Dashboard Institucional"* sets the real target: prove to the
Rouanet grant that **5.000 unique users entered gameplay**, at roughly R$1,00 per reportable user,
**with no player login** — any friction before gameplay directly raises acquisition cost. The
current `/institution` dashboard satisfies none of the document's 12 acceptance criteria: its
headline card is literally *"Login concluído"* (`front/src/app/institution/page.tsx:130`), the
metric the document forbids, and it is fed by a global, tenant-blind in-memory aggregation of the
whole `game_event` table.

The initiative turns `/institution` into four screens behind NextAuth, fed by PostHog HogQL from
Next.js route handlers, where each institution sees only the players who arrived through its own
`?utm_institution=<slug>` link, with scope applied server-side from the session.

**Decisions taken during discovery, which this document follows:**
1. The legacy fabricated-analytics cleanup **stays in #748** as the issues specify; the exposure
   window is recorded as an accepted risk (§7).
2. A personal `phx_` PostHog key **already exists**; #743 is wiring plus a verification probe, not
   key issuance.
3. The missing onepager remains open; the recommendation is in §1.1.

---

## 1. Issue hierarchy (verified, not inferred)

Source of truth: GitHub GraphQL `issue(738).subIssues` — the real sub-issue relation, not title
matching. `trackedIssues` and `trackedInIssues` are both empty, so #738 has no parent and there is
no second hierarchy level. Every sub-issue reports `subIssues.totalCount = 0`.

```
#738  Dashboard do Edital — métricas por instituição via PostHog        [OPEN] epic, enhancement
├── #739  [SPIKE] windowFunnel, Query API rate limits, NextAuth v5 on Next 16   [OPEN] spike
├── #740  Identity foundation: distinct_id churn, lost landing_page_viewed      [OPEN] bug, task
├── #741  Dual-emit of the onepager's canonical events                          [OPEN] task
├── #742  HogQL query layer in Next.js: route handlers, cache, CSV export       [OPEN] task
├── #743  Env/infra: PostHog personal key in Coolify + NextAuth secrets         [OPEN] task
├── #744  NextAuth.js for institution accounts and per-institution scope        [OPEN] enhancement, task
├── #745  Front dashboard: summary, funnel, report/export                       [OPEN] task
├── #746  Per-institution campaign link generator                               [OPEN] task
├── #747  NextAuth: email + password provider                                   [OPEN] task
└── #748  Cleanup: analytics mocks, duplicate controller, documentation         [OPEN] documentation, refactor
```

**What I could and could not access.** All 11 issues were fully readable. **Every issue has zero
comments**, including the SPIKE #739 — so none of its four questions is answered anywhere. No
linked PRs, no milestone, no assignees, and no other open issue in the repository references the
epic. The onepager itself is **not in the repository** (`grep -ril onepager` returns nothing), so
its 12 acceptance criteria, the exact 7 funnel steps and the reporting-period start date are only
knowable through the issue bodies. That is the single largest evidence gap in this discovery.

### 1.1 Recommendation on the missing onepager

**Commit the onepager into the repository (as `docs/specs/edital-onepager.md`) and make it a
prerequisite of #739, before any instrumentation is written.** Reasoning, not preference:

- The funnel definition *is* the deliverable. #742's Q4 (`windowFunnel` over 7 steps) and #745's
  "8 cards in onepager order" are literally unimplementable and un-reviewable without it — #745
  cannot be objectively marked done today.
- It is the artifact an auditor judges. A number whose definition lives only in a chat history is
  not defensible; a number whose definition is versioned next to the code that computes it is.
- It costs one commit, and it converts three "open questions" into settled constants.

**Interim, so work is not blocked:** the 7 steps can be derived from #741's own ordered acceptance
list — `landing_page_viewed → play_clicked → gameplay_started → chapter_1_started → quiz_started →
quiz_completed → chapter_1_completed`. That is internally consistent with #741 and #742, but it is
an **ASSUMPTION** and must be confirmed in #739 before #742's Q4 is frozen.

---

## 2. Dependency graph as declared, and as it really is

Declared in #738:

```
#743 ─┐                     #740 ─┬─▶ #741
#739 ─┴─▶ #742 ─┬─▶ #745 ─┬─▶ #746      #748 last
                └─▶ #744 ─┴─▶ #747
```
Declared critical path: `#743 → #742 → #745`.

**Corrections (OPINION, grounded in the facts of §3):**

1. **#742 depends on #741, and the graph does not show it.** Q1–Q4 query `play_clicked`,
   `gameplay_started`, `chapter_1_*`, `quiz_answered`, `session_finished`,
   `critical_error_occurred`. **FACT:** none of those names exists anywhere in `front/` or `back/`
   today. #742 is writable against fixtures but unverifiable until #741 is in production — and
   "the dashboard shows zeros" is indistinguishable from "the query is wrong".
2. **The `#742 → #744` arrow is backwards for the half that matters.** `lib/edital/server/**`
   needs no session. The route handlers cannot exist without one, because the slug comes from the
   session and an unlinked account must be rejected. **Split #742 into #742a (pure lib +
   `/api/edital/health`, unblocked) and #742b (the five data routes, blocked on #744).**
3. **#739 gates far more than #742.** Question (c) — NextAuth v5 on Next 16.2.9 — gates #744,
   #742b, #745 and #747. A "no" reshapes four issues.
4. **#739(d) is circular with #740.** `EDITAL_PERIOD_START` can only honestly be the #740 deploy
   date, because #740 changes `distinct_id` semantics and everything before it is analytically
   unusable. Answer (a)(b)(c) now; defer (d) until #740's deploy date is known.
5. **#741 depends on #740 more than "constants only".** Without `before_send`, canonical events
   ship with no institution attribution, and PostHog cannot backfill event properties
   retroactively — a second tranche of permanently unattributable data.
6. **#746 contradicts #742.** #746 requires a table of origins *with user counts*; #742 states the
   API surface has no campaign parameter. Both are satisfiable — one `/api/edital/campaigns` route
   returning a breakdown **for the caller's own slug only**, with the breakdown in the response
   body and no parameter in the request — but it must be written down or #742 ships the wrong shape.
7. **#748 overlaps #745** on deleting `institution/settings/page.tsx`. Give it to #745.
8. **The real critical path** is `#739(a,c) + onepager → #740 → #741 → [deploy + data-accrual
   window] → #744 → #742b → #745`, with #743 as a parallel prerequisite of the first front deploy.
   The unpriced item is the **data-accrual window**: after #740/#741 ship you need real traffic
   before any query can be validated.

**Genuinely parallelisable now:** #743 (nothing blocks it); #739(a)(b)(c) alongside #740;
#742a alongside #741; #746's pure `origins.ts` as soon as #740 fixes the UTM contract; all of
#745's chrome (`DashboardState`, `useAsyncData`, `HeroMetric`, `RateCard`, `CsvExportButton`, the
`FilterBar`/`FunnelChart` widening) against frozen client-safe types; #747 entirely, after #744.

---

## 3. Current state, verified in the repository

Every row is a **FACT** at the cited location. Where an issue's text is contradicted, it is marked.

### 3.1 Instrumentation and identity
| Claim in the epic | Reality |
|---|---|
| `posthog.init()` runs only after awaiting a network fetch | TRUE — `PostHogProvider.tsx:65` `await fetchBootstrap()`, then `:81 posthog.init(...)`. Endpoint `/api/v1/posthog/bootstrap` (`:30-31`) |
| `landing_page_viewed` is dropped on every cold load | TRUE — captured at `PlayLanding.tsx:15` inside a child `useEffect(...,[])`; posthog-js **1.390.2** (`package-lock.json:9588`) drops pre-init captures. `landing_page_dwell_time` (`:18`) rides the effect cleanup, which is also unreliable on real navigations |
| Front never sends a distinct_id; backend accepts one | TRUE — the fetch sends only `{credentials:"include"}` (`:32-34`); backend `posthog.controller.ts:20` `@Query("distinct_id")`, `:26` `user?.id ?? distinctIdQuery ?? randomUUID()`, response is exactly `{distinctId, featureFlags}` — no `isIdentified` (`:21-24,41-44`) |
| `person_profiles` is `identified_only`, so player attribution must live in event properties | TRUE — never configured anywhere, and `posthog.identify` runs only for logged-in staff (`AuthContext.tsx:111,122,163`). Decision 4 is correct |
| `handleLoadingError` is empty | TRUE, at `PhaserGame.tsx:97` (not `:94`). `Game.ts:229-235` dispatches a DOM `phaser-loading-error` straight into that no-op, so **asset failures are captured nowhere** |
| `session_finished` / `critical_error_occurred` do not exist | TRUE. But `game_load_failed` **is** captured (`PhaserGame.tsx:181`, one-shot via `gameLoadFailedSentRef:179`), so the gap is asset-load and quiz-data failures, not boot failure. `QuizManager.ts:83-93` emits no analytics at all |
| `before_send` is used nowhere | TRUE — zero hits in `front/src`. `posthogStub.ts` stubs only `capture/identify/reset/captureException/get_session_id/get_distinct_id/register` |
| 44 capture call sites | **ISSUE WRONG (harmless)** — 43 `posthog.capture` + 3 `captureException`; **31 are in `front/src/game/**`** and import the posthog-js singleton directly, bypassing both the provider and `PostHogStub`. `Game.ts:1658` and `:2102` even use dynamic event names |
| `gp_anonymous_player_id` cookie exists to fall back to | **ISSUE WRONG** — no such cookie anywhere. What exists: `gp_distinct_id` and `gp_guest_play` (`PostHogProvider.tsx:15-24`), both client-written and **session-scoped (no `Max-Age`)**, so they die on browser close; plus `gp_fallback_guest_id` in **localStorage** (`guestSession.ts:1,30,36-50`) |
| `game.controller.ts` falls back to `randomUUID()` | TRUE and worse: the guest id arrives as the **client-settable header** `x-guest-id` (`:18`) that the front never sends, and `sendBeacon` **cannot set headers** (`analyticsApi.ts:22-31`). So every beacon-delivered `session.end` gets a fresh UUID |
| Epic line numbers | Consistently 3–30 lines stale (`:133 StartGame`, `:178-190` catch, `:226` dep array, `Game.ts:687-697` SHUTDOWN, `:699 game_started`, `game-ui-store.ts:570`). **119 commits landed since the epic was filed**, none touching analytics — every deletion and edit must be grep-verified, not line-verified |

Three findings the issues miss entirely:
- **`AnalyticsSystem.setupAbandonmentTracking` (`:43-59`) never removes its `beforeunload`
  listener**, and `Game.ts:570-572` runs it in `create()`. `LevelCinematic.ts:102` restarts the
  GAME scene per level, so listeners accumulate and `GAME_STARTED`/`SESSION_END` fire **once per
  level, not once per session** (`Game.ts:688`). #741's single-fire guard for `session_finished`
  must therefore be session-scoped, not per-instance, or the count inflates by level count.
- **posthog-js already captures campaign parameters automatically**, and supports
  `custom_campaign_params` for a non-standard key like `utm_institution`. That gives *last-touch*
  for free; #740's hand-rolled module is needed only for the *first-touch* rule.
- **The landing is the Next app itself.** `nginx/nginx.production.conf.template` serves `front` at
  `/` and `back` at `/api/v1/`, and #746's link is `https://guardiaodacultura.42.rio/?utm_institution=…`
  — the app's own `/` route. **There is no cross-domain first-touch problem.** In production the
  API is same-origin; in local dev it is cross-origin (`localhost:3000` vs `:3001`), which is what
  decides the identity mechanism in §5.

### 3.2 Query layer and configuration
| Claim | Reality |
|---|---|
| `env.ts` has only a `clientSchema`, no server env validation | **ISSUE WRONG** — `front/src/lib/env-server.ts` already exists with a lazy zod `serverSchema`, `getServerEnv()`, a `resetServerEnv()` test hook and a `serverEnv.server` getter (commit `5c92cdd6`). #742 must **extend** it |
| `front/src/app/api/**` has no route handlers | **ISSUE WRONG** — `front/src/app/api/tts/synthesize/route.ts` exists, already using `serverEnv` + zod, with a co-located `route.test.ts` that shows the required shape (`@jest-environment node` docblock, `TextEncoder` polyfill, `jest.mock("@/lib/env-server")`). Front jest is jsdom by default (`front/jest.config.ts:8`), so **every #742 route test needs that docblock** |
| No new npm dependency | **ISSUE WRONG** — `server-only` is absent from `package-lock.json` and is **not** a dependency of `next@16.2.9` (`package-lock.json:8856-8886`). #742 needs it added (≈1 KB), or the boundary must be enforced another way. `next-auth`/`@auth/core` (#744) and `argon2` (#747) are also absent |
| `.env.example` ships the write key | TRUE — `:71 POSTHOG_API_KEY=phc_…`, `:72 POSTHOG_HOST=https://us.i.posthog.com` (ingestion host). Backend uses them via `posthog-node` (`posthog.service.ts:14-16`, `config.service.ts:21-22`), so #748's "never share getters between the write and read paths" is coherent |
| Replica count (#743's open question) | **ANSWERED: one.** No `replicas:` and no `env_file:` in any of the three compose files. The front service is capped at 0.5 cpu / 512 M (`compose.production.yaml:118-126`). The module cache in #742 is therefore process-global — but that cap is why its size ceiling matters, and why argon2 memory cost in #747 must be sized against it |
| **Gap in no issue** | Compose **enumerates** front env explicitly and passes PostHog vars to the **back service only** (`compose.production.yaml:100-101` vs the front block `:91-99`). **Coolify configuration alone is inert** — the front `environment:` list in all three compose files must gain the new vars. The working precedent is `RESPONSIVEVOICE_API_KEY`, already a front runtime secret at `:99`, which also proves no build arg is needed |
| **Gap in no issue** | #743's variable list omits **`AUTH_TRUST_HOST`**, which NextAuth v5 needs behind the nginx proxy (`X-Forwarded-Proto` is set at `nginx.production.conf.template:41`) |
| No date library, no MUI date pickers | TRUE — `front/package.json` has no date-fns/dayjs/luxon and MUI v9 without `x-date-pickers`; `America/Sao_Paulo` appears nowhere. #742's `period.ts` must use `Intl` math and #745's custom range must use plain `type="date"` inputs |

### 3.3 Backend baseline (what the epic replaces)
- `analytics.service.ts:53-61` loads **all** matching `game_event` rows into memory, filtered only
  by `timestamp` + `type`, with **no tenant dimension**; `ALL_TIME` has no lower bound (`:193-203`).
- **`game_event` has no index beyond the primary key** (`game-event.entity.ts`,
  `1777927558352-InitialMigration.ts:11`) while that is exactly the hot filter.
- The metrics are substring guesses: `isChapter1Event:298-324`, `extractChapterNumber:251-268`
  (12 key aliases plus a loose `/(\d+)/`), `matchBadgeKey:373-393` (silently drops unknown badges).
  `averageSessionTime:478-532` pairs `GAME_STARTED`→`SESSION_END` in minutes and drops unclosed
  sessions — which, given §3.1's per-level restart, means it measures levels, not sessions.
- Internally minted badge events never reach `game_event` (`badges.service.ts:114` emits only
  `"badge.earned"`, not `"game.event"`), yet badge rates are computed from that table (`:172-186`).
- `analytics.controller.ts:18-83` returns **hardcoded fake per-student data** (`"GamerPro"`,
  `"Lucas12"`, invented classes) behind `@Roles(Institution, Admin)`, with no constructor (`:13-17`).
  Its two front wrappers have **zero call sites** — #748 is correct (`front/src/lib/api/analytics.ts:73,80`).
- `dashboard.controller.ts` duplicates `dashboard/metrics.controller.ts` (3-line diff) and is dead
  surface; the front calls only `/metrics` (`institution/page.tsx:58`).
- TypeORM, `synchronize` off (`data-source.ts:32`), migrations
  `back/src/core/database/migrations/<epochMs>-<Name>.ts` with hand-written round timestamps
  (latest `1780000000006`) run via `npm run migration:run` / `make db-migrate`. **#744 and #747
  each add a migration — assign the timestamps up front or they collide.**
- `cookie-parser` is global (`main.ts:28`); CORS is an allowlist with `credentials: true` (`:38-43`);
  `ValidationPipe` uses `forbidNonWhitelisted: true` (`:31-35`), so every new DTO must whitelist
  each field or return 400.

### 3.4 Auth
- No `next-auth`, no `jose`. `User` (`user.entity.ts:12-50`) has no password and no
  `institutionSlug`. Auth is magic-link only (`magic-link.service.ts`: 64-byte token, SHA-256 at
  rest, 15-minute TTL). **No OAuth of any kind in `back/src`** (0 grep hits), so #744's
  `/auth/oauth/upsert` is entirely new.
- `middleware.ts:4,36-45` treats the **non-httpOnly, JS-set** `auth_status` cookie
  (`front/src/lib/auth/cookies.ts:6-13`) as proof of authentication and **checks no role**. The
  matcher already covers `/institution/:path*` (`:68`), so #745's "middleware does not change"
  holds. Note `middleware.ts:4` hardcodes the cookie name while the client reads it from
  `env.client.authStatusCookieName` — a latent mismatch. Also `PROTECTED_ROUTES` is `[]` (`:7`),
  making the block at `:47-51` dead, and **`/game` is not matched at all**.
- **The live hole (accepted risk, per your decision):** any public registrant can self-assign the
  institution role — `register.dto.ts:50-58` `@IsIn([Role.Institution])`, `auth.service.ts:119`.
  `RolesGuard` (`roles.guard.ts:17-31`) does membership only, and there is **no backend
  InstitutionGuard** — it exists only client-side (`InstitutionGuard.tsx:13`). So today an open
  institution signup already reads real **global** `/metrics` plus the fabricated per-student
  endpoints. See §7 for the consequence during #744's coexistence window.
- `ThrottlerModule` is configured (`app.module.ts:41-48`) but `ThrottlerGuard` is **not** an
  `APP_GUARD` (`:51-54`), so `@Throttle` on `/auth/refresh` and admin is inert. **But
  `@ThrottleByEmail` works**, because that decorator attaches `EmailThrottlerGuard` itself
  (`throttle-by-email.decorator.ts:5-8`) — the pattern #747 should copy already exists.

### 3.5 Front dashboard
- Three files only. `institution/page.tsx` (265 lines): target constants `:16-28`, hand-rolled
  `useEffect` + `let cancelled` fetch `:52-79`, and a **terminal error state** — `error` is never
  cleared and the early return at `:91-100` unmounts `FilterBar`, so one transient failure bricks
  the page for its lifetime. No `Suspense`, no tests.
- `institution/layout.tsx:28-31` has 2 nav entries; `settings/page.tsx` is a 69-line dead
  placeholder binding "Nome da Instituição" to `user?.firstName` (`:37-42`).
- `KPICard.tsx:3-9` already has optional `target`/`status` and a `subtitle` — reusable as claimed.
  `FilterBar.tsx:3-6,19-21` has 3 hardcoded options, no `custom`, and `dateRange` typed as a bare
  `string`. **`FunnelStep` is a local, non-exported interface** at `FunnelChart.tsx:3-6` carrying
  only `{label, value}` — #745 calling it a component to extend is a mis-description; the work is
  export-and-widen.
- **Zero tests** under `front/src/app/institution/**` or `front/src/components/dashboard/**`. No
  generic fetch hook exists anywhere. `QuizManager.test.ts:9-15` mocks `../../lib/env` with a
  **stale flat shape** (`env.NEXT_PUBLIC_*`) while `env.ts` exports `{client: …}` — that mock is
  silently inert, and #741 extends that exact file.

### 3.6 Documentation reality
- `EVENTS.md:155-157`: the landing events carry **no properties at all** today.
- `EVENTS.md:170` claims `game_load_failed` covers `loading_stage: asset_load` from
  "`PhaserGame.tsx`, `Game.ts` (asset `loaderror`)". **The doc is wrong** — #748's fix is justified.
- `docs/specs/posthog-implementation-plan.md:172` states verbatim *"Never use a personal API key in
  application code."* #742 contradicts standing project doctrine, which is precisely why #748 must
  amend that line rather than leave the contradiction standing. That 895-line spec never mentions
  HogQL or the Query API at all.
- `docs/handoff/en/05-deploy.md:164-166` lists what Coolify holds and does **not** include a
  personal key. You have stated the `phx_` key exists, so treat this doc as stale and correct it.
- `docs/EPIC-analytics-dashboard.md` is a **previous** epic whose still-open pendency #1 is "emit
  `event.logged` for critical errors" — the same work as part of #741. Two epics own one task and
  neither references the other; converge them or it gets implemented twice.
- Four analytics stacks coexist: PostHog, the Postgres pipeline, Contentsquare and Google Ads gtag
  (`front/src/app/layout.tsx:37-53`). They will report different numbers.

---

## 4. Consolidated technical context

**Problem.** Three independent failures compound. (1) *No attribution exists* — nothing in the
codebase reads `utm_*`, so no per-institution number can be computed at all. (2) *Identity churns*
— the anonymous `distinct_id` is re-minted on every cold load, so "unique users" is inflated by an
unknown, irrecoverable factor, and every day without the fix adds more. (3) *The funnel's first
step is silently discarded* on every cold load, and it is the denominator of the entry rate.
Layered on top, the current dashboard reports a forbidden metric from a tenant-blind global
aggregation, and one authenticated endpoint serves fabricated per-student data.

**Desired state.** PostHog is the single source of truth for the edital. Every event carries
`anonymous_player_id`, `campaign_source` (first-touch), `session_id` and `chapter_id`. Institution
accounts authenticate through NextAuth; the slug is derived server-side from the session and is a
required, non-optional parameter of every query builder; an unlinked account short-circuits before
any upstream call. Four screens read cached HogQL through same-origin route handlers, every rate is
reported as `{value, numerator, denominator}`, and the CSV the evaluator receives comes from the
same code path that rendered the screen.

**Architecture of the target flow.**
```
browser ──NextAuth session cookie──▶ /api/edital/* (Next route handler, same origin)
                                          │ auth() → session → slug (never a request parameter)
                                          │ zod-validated dateRange only
                                          │ module cache + single-flight
                                          │ personal phx_ key, server-only
                                          ▼
                                     PostHog Query API  (refresh: "blocking")
```

**Potential impact.** Front: `PostHogProvider`, `middleware.ts`, `env-server.ts`, `PlayLanding`,
`PhaserGame`, `Game.ts` (2354 lines, 4 touch points), `QuizManager`, `AnalyticsSystem`,
`game-ui-store`, `BadgeSystem`, `PersistenceBridge`, three error boundaries, the whole
`app/institution/**` tree and `components/dashboard/**`. Back: `posthog.controller`,
`game.controller`, a new auth endpoint, `User` plus two migrations, and the deletions in #748.
Infra: three compose files, `.env.example`, three docs. Data: **no new analytics tables** — two
nullable `User` columns only.

**Risks.** Ranked, with mitigations, in §7.

**Open questions.** The 7 funnel steps and 8 cards (§1.1); `EDITAL_PERIOD_START`; whether
attribution is an event or a person property (§6); the `error_code` enum; what the dashboard shows
for **unattributed** players — those who arrive with no `utm_institution` at all, who count toward
the global 5.000 but belong to no institution; the `CAMPAIGN_ORIGINS` taxonomy; what "one full
reporting cycle" means in days for #748; and #747's account-linking policy.

---

## 5. Recommended solution

### 5.1 Identity — the one place I depart from the issue text
**Recommendation:** make the durable anonymous id a **server-set cookie with an explicit
`Max-Age`**, and send it to the bootstrap endpoint **both** as a cookie and as the existing
`?distinct_id=` query parameter, with backend precedence
`user?.id ?? cookie ?? validated query ?? randomUUID()`.

Why both, rather than either alone:
- **The cookie alone breaks in local development.** Production proxies `/api/v1/` same-origin
  through nginx, so cookies flow; local dev is `localhost:3000` → `:3001`, cross-site, where a
  `SameSite=Lax` cookie is not sent on XHR. The query parameter is environment-independent.
- **The query parameter alone cannot fix `sendBeacon`.** `analyticsApi.ts:22-31` uses `sendBeacon`
  for `session.end`, which cannot set headers — but does send cookies. So the cookie is what makes
  #740's "cheap bonus" (`game.controller.ts` fallback) actually work. **Promote that bonus to
  required**; it is the only fix for beacon attribution and it also repairs the legacy
  `averageSessionTime`.
- **Cookie-first precedence closes the hole the query parameter opens.** `bootstrap` is `@Public()`,
  so an unvalidated query parameter lets any caller assert any identity and read that person's
  feature flags. Validating format and length (#740 already asks for ≤200 chars) plus preferring
  the cookie reduces that to a low-severity flag-enumeration surface.
- Keep `gp_fallback_guest_id` (localStorage) as a **one-time migration seed** into the cookie,
  never the reverse — it cannot exist before hydration, so it can never be the source of truth for
  the first capture.
- **Delete the session-scoped `gp_distinct_id` write** (`PostHogProvider.tsx:21-24`): a client
  writer on a session cookie is the churn amplifier.

**ASSUMPTION to validate:** whether the cookie is set in `middleware.ts` (runs before any JS,
strongest option — but requires adding `/game/:path*` to the matcher and keeping the Edge bundle
free of NextAuth's heavy provider imports) or in the provider on first load (simpler, one render
later). I lean to middleware; confirm against #739(c)'s Edge findings.

### 5.2 Fix the lost `landing_page_viewed` structurally
Move `posthog.init()` out of the awaited fetch: init synchronously on provider mount, bootstrapped
with the cookie's id and `featureFlags: {}`, then apply the bootstrap result afterwards via
`register` / feature-flag reload. The only options that genuinely need flags at init time are
`record_sessions_percent` and `record_canvas`; a conservative default for one pageview is a
non-issue, whereas losing funnel step 1 is the metric the grant is judged on. This removes the race
rather than narrowing it. Also move `landing_page_dwell_time` off the effect cleanup onto
`pagehide` / `visibilitychange`.

### 5.3 Property injection — `register()` plus `before_send`, for different jobs
`register()` in `loaded:` for the stable properties, `before_send` as the total, never-throwing
backstop that stamps anything missing. **This is the only design that reaches the 31 game-code call
sites that import the singleton directly** — the issue's rejection of a capture wrapper is right,
for a reason it does not state. Do **not** use `before_send` to rename or fan out events: it cannot
return two events, and silent rewriting makes PostHog's live-events view useless exactly when you
need it for verification. Dual-emit stays explicit at the call site, and the first-touch rule
belongs in the report methodology.

### 5.4 Query layer
Extend `front/src/lib/env-server.ts` (do not invent a parallel pattern) with four **optional**
fields so the app boots unconfigured and `/api/edital/health` reports `configured: false`. Mirror
`app/api/tts/synthesize/route.ts` for structure and its `route.test.ts` for the test preamble. Add
the `server-only` package and put `import "server-only"` at the top of `env-server.ts` itself —
that upgrades the existing runtime throw to a build-time error for the key that is already there.

Two refinements to #742 (**OPINION**):
- **Split the types.** A `types.ts` under a `server-only` boundary cannot be imported by #745's
  client components. Ship a client-safe `front/src/lib/edital/types.ts` (DTOs plus the `dateRange`
  union shared with the zod schema) and keep only internals under `server/`. As written, #745 would
  duplicate the types or break the build.
- **Make the scope un-bypassable by type, not by review.** An opaque branded `Scope` type
  producible only by `resolveScope(session)`, taken as the first parameter of every builder, means
  a handler that tries to pass `searchParams.get("slug")` fails to compile. That is strictly
  stronger than #742's "required non-optional param" and costs one type alias.
- Keep the module cache **plus** single-flight, and write down in the code that its correctness
  does not depend on replica count (one today, `compose.production.yaml`); `refresh: "blocking"`
  is what actually sustains load.

### 5.5 Auth and tenancy
Follow #744, with three additions: split `auth.config.ts` (Edge-safe, used by middleware) from
`auth.ts` (full, with providers) or the middleware build fails; give `/auth/oauth/upsert` a
constant-time secret compare plus an email-domain allowlist, because it is an endpoint that creates
institution-role users; and define route ownership explicitly — NextAuth owns `/institution/*`,
legacy owns admin — or the two cookies will fight in `middleware.ts`.

### 5.6 Front
Build the chrome first (`DashboardState`, a ~25-line `useAsyncData` with `AbortController`,
`HeroMetric`, `RateCard`, `CsvExportButton`) against the frozen client-safe types, before #742b
exists. `useAsyncData` must **clear** the error on retry and keep `FilterBar` mounted — that is the
real bug in `institution/page.tsx:52-100`, not a cosmetic one. Widen `FilterBar` to a typed
`DateRange` union with a **server-clamped** custom range (an unbounded custom range re-creates the
full-scan problem `EDITAL_PERIOD_START` exists to prevent), and export-and-widen `FunnelStep` to
carry absolute counts — the auditor's number is a count, not a rate. Plain `fetch` with
`credentials: "include"`, not `apiClient`, is correct: `apiClient` injects a Bearer and a
force-logout interceptor (`client.ts:50-79,108-113`) that would fight the NextAuth cookie.

### 5.7 Alternatives considered, and why they lose
| Choice | Alternatives | Why the recommendation wins |
|---|---|---|
| HogQL in Next route handlers | NestJS module; PostHog's own dashboards/shared insights | The Nest option needs a service token or a session bridge between NextAuth and Nest — exactly the seam where tenancy bugs live — and doubles review surface for four screens. PostHog dashboards cannot express "scope from session, never from a parameter", because a shared link *is* a client-side parameter; that fails locked decision 1 structurally. Deciding factor: query and auth sharing one process and one type system is what makes the compile-time scope guard possible |
| Cookie + query parameter for identity | Query parameter only (the epic); cookie only; stop the front overriding the persisted id | Query-only cannot fix `sendBeacon` and leaves an unauthenticated identity-assertion surface as the primary path. Cookie-only breaks in cross-origin local dev. "Stop overriding" is necessary but insufficient — on a true first visit there is nothing persisted and the backend still mints a UUID |
| Init before the fetch | Pre-init queue; fire the event after init resolves; keep the await and add flags later | A queue re-implements posthog-js's own and becomes dead weight. Firing after init is still racy on a fast bounce and skews the step-1→step-2 timestamp by network latency, corrupting the funnel's timing dimension |
| `before_send` + explicit dual-emit | Capture wrapper only; `before_send` only | Wrapper-only requires 43 edits, still misses library-internal events (`$pageview`, `$web_vitals`, `$dead_click`, `$exception`), and is bypassable by importing the singleton — which 31 sites already do. `before_send`-only cannot fan one event into two and makes renames invisible during debugging |
| Add `server-only` and keep `env-server.ts` | Rely on `env-server.ts`'s lazy throw alone | The lazy throw is a **runtime** guard; a client bundle would happily import the module and only fail when the getter runs. The entire security argument for putting a personal key in the front package rests on a **build-time** poison pill |

**Testing strategy.** Highest-value suite first: iterate every query builder and assert each emits
an institution predicate — so a new unscoped query fails CI — paired with a route test asserting a
forged `?slug=` never reaches the outbound body, and one asserting an unlinked session makes
**zero** upstream `fetch` calls. Then: `hogql` (bearer header, body shape, 429→`retryAfter`, abort,
key never in an error message), `period` (São Paulo civil-day boundaries at 00:30 and 23:30 local,
`all-time` clamped), `metrics` (`safeRate(0,0)`, clamp to 1, single-flight, cache expiry,
monotonic funnel), `csv` (assert the literal `EF BB BF` prefix, `;`, decimal comma), a funnel-
definition snapshot test whose job is to make changing the audit definition a reviewed act, and
`before_send` totality against malformed input. **Fix the stale env mock as a line item of #741**
(`QuizManager.test.ts:9-15`), with a guard test asserting the real module's `{client: …}` shape, so
drift breaks one obvious test instead of quietly disabling mocks. No E2E framework exists — do not
introduce one; substitute a written staging checklist walking all 7 steps in PostHog's live-events
view plus a day-one reconciliation against a manual HogQL run.

---

## 6. The SPIKE (#739), treated as a spike

**Technical questions it must answer.** (a) Is `windowFunnel` available in HogQL on this project?
(b) What are the Query API rate limits on the current plan? (c) Does NextAuth v5 run on Next
16.2.9? (d) What is `EDITAL_PERIOD_START`?

**Hypotheses to validate.** That `windowFunnel` is permitted (if not, screen 2 becomes "steps
reached", which changes #745's copy and #742's Q4); that the rate limit is high enough for a 5-minute
TTL on a single replica; that NextAuth v5 runs on Next 16 with an Edge-safe config split; that the
period can start at the #740 deploy date.

**What to investigate in the codebase.** `front/package.json` / `package-lock.json:8856` for the
resolved Next version; `front/src/middleware.ts` for what the Edge bundle would have to import;
`compose.*.yaml` for the replica count (already answered: one); `nginx/nginx.production.conf.template`
for the proxy read timeout, because #742's 25-second abort must be reachable through it.

**Alternatives and trade-offs.** For (a): `windowFunnel` gives strict ordering and monotonicity —
the first thing an evaluator checks — versus `uniqExactIf` + a clamp, which is portable and simple
but only proves "reached", not "in order". For (c): NextAuth v5 versus staying with the existing
magic-link service behind a `Credentials` provider — the latter reuses a service that already does
64-byte tokens and SHA-256 at rest, adds no OAuth surface, and would make #747 mostly redundant;
worth pricing before committing to Google.

**Useful experiments.** Run Q1 and the funnel subquery by hand in PostHog's SQL editor and keep the
output as the reconciliation baseline. Run #743's `curl` probe. Stand up a throwaway NextAuth v5
route on a Next 16 branch and confirm `auth()` works inside middleware.

**Decisions in other issues that depend on the outcome.** (a) → #742's Q4 and #745's screen 2
labelling. (b) → #742's TTL default and #741's dual-emit volume budget. (c) → the entire shape of
#744, #742b, #745, #747. (d) → #742's `period.ts` and the honest start of the reportable window.

**Two additions I would make to the spike (OPINION).** First, **it must also produce the onepager,
the 7 steps and the 8 cards** (§1.1) — without them #742's Q4 and #745 are unimplementable, which
makes #739 as filed under-scoped for its own purpose. Second, **a fifth question that matters more
than (b): is the institution filter an event property or a person property?** #742's Q1 filters
`properties.campaign_source`, which requires the slug on every event row; `register()` persists
super properties in localStorage, so it survives sessions on the same device but not across devices
and not for a returning visitor who arrives on a bare URL. Person properties are ruled out by
`identified_only` (§3.1), which is *why* the event-property model is right — but that reasoning
should be recorded as a spike answer, because discovering it after #742 is written means rewriting
all four queries. **Do not implement the final solution inside the spike**; its output is a comment
plus committed constants.

---

## 7. Risks, ranked

| Risk | Mitigation |
|---|---|
| **The number is not defensible to an auditor.** It counts anonymous browser identifiers. | Publish the exact HogQL and window with every export. Report unique ids **and** sessions and the delta. State the known biases in the export footer: undercount from ad blockers, undercount from the pre-fix instrumentation gap, overcount from shared devices and cache clearing. Never present one unqualified number. #742's `{value, numerator, denominator}` rule is the right instinct — extend it to the headline count |
| **Irrecoverable history.** Pre-#740 events have churned ids, no attribution and no step 1. | Say it plainly to stakeholders now: the reportable window opens on the #740 deploy date. Ship #740 first, alone, as the epic already insists. `game_event` can produce a **global floor** for sanity-checking only — it has no tenant dimension |
| **Four analytics stacks will disagree.** | Declare PostHog the sole source of truth in writing (#748), and show **no** Postgres-derived figure on the new screens — which means removing the `/metrics` call at `institution/page.tsx:58`, not layering on top of it. Two numbers on two screens is how a report gets rejected |
| **The legacy self-assignable institution role stays open through #744's coexistence window** (your accepted risk). | Document it explicitly as accepted, and keep the window short. Concretely: while two auth systems coexist, the weaker one defines the actual security posture — a forged `auth_status` cookie plus a self-assigned role reaches global `/metrics` and the fabricated `/analytics/*` until #748 lands. If the window will exceed a few weeks, revisit |
| **A ClickHouse full scan on the single 0.5-cpu / 512-M replica** is an availability risk, not just latency. | Mandatory `timestamp` floor in every query, explicit `LIMIT`, the 25-second abort verified against the nginx read timeout, a row cap on CSV, and a server-side clamp on custom ranges |
| **`import "server-only"` is claimed but not available.** | Add the dependency, or drop the claim and enforce the boundary with a test. Do not leave it ambiguous — the key-in-the-front-package argument depends on it. Keep #742's acceptance check `grep -r "phx_" front/.next/static/` |
| **Dual-emit doubles event volume** against unknown plan limits. | Answer #739(b) first; keep intermediate quizzes excluded as the issue specifies, and document that exclusion in `EVENTS.md` or the first person to reconcile `quiz_answered` against `quiz_answer_submitted` files a bug |
| **`session_finished` inflation.** SHUTDOWN fires per level (§3.1). | Session-scoped single-fire guard, `pagehide` + `visibilitychange` alongside `beforeunload`, and remove the accumulating listener |
| **The `event.logged severity:"critical"` mirror writes into an unindexed `game_event`** while #748 keeps that dashboard as the fallback. | Fold a `(timestamp, type)` index migration into #741. A "keep as fallback" promise on a table with no index and an unbounded `ALL_TIME` scan is not sound |
| **Migration timestamp collision** between #744 and #747 (hand-written round numbers). | Assign both numbers before either is authored |
| **LGPD.** A durable pseudonymous cookie is new. | Document it in the privacy notice; keep it out of every export (aggregates only, per decision 1); confirm the existing consent surface covers it — I did **not** verify a consent banner exists, and that should be checked |
| **Registry-as-TypeScript means a deploy per institution** (decision 6). | Acceptable at this scale; make the cost visible in `origins.ts`, and gate the links screen so an unlinked account sees an explicit "awaiting linkage" state rather than an empty dashboard it could mistake for zero players |

---

## 8. Implementation plan

Each step lists what, why, dependencies, files, tests and completion criteria. **Nothing here is
executed yet.** For the fully expanded, task-by-task version of each step (ordered subtasks,
code-level notes, complete test lists), see
`docs/specs/implementation-plan-738-dashboard-edital.md`.

**0. Commit the onepager + answer #739(a)(b)(c).** *Why:* the funnel definition is the deliverable
and question (c) can reshape four issues. *Files:* `docs/specs/edital-onepager.md`, a comment on
#739. *Done when:* the 7 steps with their event mapping and the 8 cards in order are in the repo;
`windowFunnel` is proven or refuted by a pasted query; a NextAuth-on-Next-16 verdict is backed by a
tested version pair; the attribution model is recorded as "event property" with its rationale.

**1. #743 — env and infra.** *Why:* zero dependencies, on the critical path, and it needs compose
edits nobody scoped; finding that out late blocks the first deploy. *Files:* the front
`environment:` block in all three compose files (plus `AUTH_OAUTH_UPSERT_TOKEN` on the back block),
`.env.example`, `docs/handoff/en/05-deploy.md:164-166`. *Reuse:* `RESPONSIVEVOICE_API_KEY`
(`compose.production.yaml:99`) is the exact precedent. *Tests:* `env-server` boots with all four
unset; a CI grep for `phx_` in `front/.next/static/**`. *Done when:* the `curl` probe from #743
returns 200 with the `phx_` key and fails with the `phc_` key; every variable is present in the
right service block of all three files; none is `NEXT_PUBLIC_*` and none is a Docker build arg;
`AUTH_TRUST_HOST` is included; the replica count (1) is recorded on the issue.

**2. #740 — identity foundation.** *Why:* every later metric is unattributable without it and it
resets the data clock, so it must precede the reportable window. *Dependencies:* step 0's
attribution answer. *Files:* `PostHogProvider.tsx`, `middleware.ts`, new
`lib/posthog/{eventContext,beforeSend}.ts`, new `lib/edital/{anonymousPlayer,campaign,events}.ts`,
`back/.../posthog.controller.ts`, `game.controller.ts`, `PhaserGame.tsx`, `posthogStub.ts`.
*Tests:* as §5.7, plus a `PostHogProvider` test (none exists today). *Done when:* two consecutive
browser sessions produce **one** PostHog person; three hard reloads leave `distinct_id` unchanged
with one `anonymous_player_created`; a `$pageview`, a `game/**` capture and `landing_page_viewed`
all carry the slug and `campaign_source` with no capture wrapper; a later visit with a different
`utm_source` does not overwrite first-touch; returning to `/` with no query parameter still carries
`campaign_source`; the stub path still runs with the key unset; the durable cookie exists and
`game.controller.ts` reads it when `x-guest-id` is absent.

**3. #741 — canonical dual-emit (+ the `game_event` index + the stale env-mock fix).** *Why:*
#742's queries name events that do not exist yet; shipping this promptly opens the data window
earlier. *Dependencies:* #740 (real, not "constants only"), step 0's step list. *Files:*
`PhaserGame.tsx:97,181`, `Game.ts:229-235,687-699`, `AnalyticsSystem.ts`, `QuizManager.ts:83-93`
and the level-1 branches, `game-ui-store.ts:570`, `BadgeSystem.ts:95`, `PersistenceBridge.ts:105`,
the three error boundaries, `EVENTS.md`, one migration. *Done when:* a full playthrough shows the 7
steps in order in live events; `gameplay_started` fires exactly once under StrictMode;
`session_finished` fires exactly once per session across `pagehide`, tab close and SHUTDOWN,
including on iOS Safari; renaming the level-1 tilemap produces
`critical_error_occurred{error_code:"asset_load_failed", is_blocking:true}`; a blocking error also
writes a `game_event` row with `severity:"critical"`; legacy events are unchanged; the
`QuizManager.test.ts` env mock matches `{client: …}`.

**4. #742a — pure query lib + `/api/edital/health`.** *Why:* needs neither auth nor data, and
freezing `safeRate`/`period`/the client-safe types unblocks #745's chrome during the data window.
*Files:* `lib/edital/server/{hogql,queries,metrics,period,csv}.ts`, client-safe
`lib/edital/types.ts`, `env-server.ts`, `app/api/edital/health/route.ts`, `package.json`
(`server-only`). *Done when:* health returns `configured:false` with nothing set and the app boots;
a test fails if any generated HogQL contains `uniq(` without `Exact` or lacks an institution
predicate; every rate is `{value,numerator,denominator}` with `value ≤ 1`; the CSV's `EF BB BF`
prefix is asserted byte-wise; two concurrent identical calls produce one upstream POST.

**5. #739(d) → `EDITAL_PERIOD_START`.** *Why:* only answerable once #740's deploy date is known.
*Done when:* it lands as a tested constant in `period.ts` and `all-time` provably never queries
before it.

**6. #744 — NextAuth and tenancy.** *Why:* it is the slug source and the tenancy boundary; both
#742b and #745 hang off it. *Files:* `front/src/auth.ts` + `auth.config.ts` (Edge split),
`app/api/auth/[...nextauth]/route.ts`, `middleware.ts`, a new back upsert endpoint,
`user.entity.ts` + migration. *Done when:* a hand-forged `auth_status` cookie no longer grants
`/institution`; a `player` session reaches neither screen nor API; two accounts on different slugs
see only their own numbers; a forged `?campaign=` is provably ignored because the parameter does not
exist; an account with `institutionSlug = null` renders the empty state and produces **zero**
upstream PostHog calls in the server log; the migration runs and reverts via `make db-migrate`; the
seed script for the first slugs is documented as the known manual step.

**7. #742b — the five session-gated route handlers.** *Why:* with both a session and real events in
place, the queries are verifiable end-to-end instead of against fixtures. *Done when:* Q1 run by
hand in PostHog returns **exactly** the endpoint's number; 5 requests in 10 s produce one upstream
query; 401 without a session; `report.csv` opens correctly in Excel pt-BR.

**8. #745 — the three screens.** *Why:* consumes frozen DTOs and a real session; its chrome was
built in step 4's window. *Done when:* the 8 cards render in documented order; the funnel is
monotonically non-increasing across 7 steps; `HeroMetric` matches the hand-run Q1 exactly; an API
error offers a retry that **clears** the error and keeps `FilterBar` mounted; no `*_TARGETS`
constant remains; `/institution/settings` is gone with no dangling nav link (this issue owns that
deletion, not #748).

**9. #746 — campaign links.** *Why:* attribution only works if links in the wild carry the
parameter, so the earlier real links exist, the more data accrues before the deadline — arguably its
pure `origins.ts` should jump to step 4. *Blocked on:* the `/api/edital/campaigns` breakdown shape
(§2.6). *Done when:* a generated link, opened in a clean profile and played, appears under that
campaign end-to-end; unknown slugs render the raw slug; the page emits zero PostHog events
(asserted).

**10. #747 — password provider.** *Why:* additive, fully parallel after #744, on no critical path.
*Done when:* a `null` `passwordHash` never authenticates; login rate limiting is enforced by a real
guard and a test trips it (copy `throttle-by-email.decorator.ts:5-8`); argon2 parameters are
documented against the 512-M container limit; wrong password and unknown email are
indistinguishable in status, body and rough timing; the linking policy is decided, written down and
tested in both directions.

**11. #748 — cleanup and docs.** *Why:* nothing is removed before its replacement is proven in
production. *Done when:* `/analytics/aggregated` and `/analytics/classes` return 404; `tsc
--noEmit` passes with no orphan imports; `/metrics` still works and is served by
`metrics.controller.ts`; `analytics.service.ts`/`dashboard.service.ts` are confirmed to still have
live callers or reclassified as dead; `EVENTS.md:170` is corrected;
`docs/specs/posthog-implementation-plan.md:172` carries the server-only exception; the four-stack
reality and PostHog-as-source-of-truth are recorded; `docs/EPIC-analytics-dashboard.md`'s
`event.logged` pendency is closed with a pointer to #741. **Verify every deletion by grep, not by
the issue's line numbers** — they are stale.

**Why this order.** It is accrual-first and UI-last. The only genuinely irreversible cost in this
epic is time spent collecting unusable data, so the two instrumentation PRs come before anything
that displays a number; the definition of the number is committed before the instrumentation that
implements it; the unblocked infra work runs in parallel rather than sitting behind the spike; the
query library is built during the unavoidable data-accrual window; auth precedes the routes that
depend on a session; and the deletions happen only after the replacement has survived a real
reporting cycle.

---

## Verification, end to end

1. `npm run typecheck && npm run lint && npm test` at the root (turbo, both workspaces).
2. `make db-migrate` up and `migration:revert` down for each new migration.
3. Local: `/?utm_institution=escola-teste`, then three hard reloads — confirm in PostHog live
   events that `distinct_id` is stable, that `landing_page_viewed` arrives with the full property
   set, and that `anonymous_player_created` fired once.
4. A full playthrough, checking the 7 steps in order, then close the tab and confirm
   `session_finished` with a plausible `duration_seconds` — repeat on iOS Safari.
5. Rename the level-1 tilemap and confirm `critical_error_occurred{is_blocking:true}`.
6. `curl` the Query API probe from #743 in both environments.
7. Run Q1 by hand in PostHog's SQL editor and diff it against `/api/edital/summary`,
   `HeroMetric` and the CSV — all four must agree.
8. Log in as two institutions on different slugs and confirm isolation, then confirm the unlinked
   account produces zero upstream PostHog calls in the server log.
9. `grep -r "phx_" front/.next/static/` must return nothing.
10. Open the exported CSV in Excel pt-BR: intact accents, one value per column.
