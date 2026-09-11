# Implementation Plan — Epic #738: Dashboard do Edital

This is the execution companion to `docs/specs/discovery-738-dashboard-edital.md`. The discovery
doc is the source of truth for **why** — verified facts, risks, alternatives rejected and why. This
doc is **how** — one step per issue, in build order, with a task breakdown, exact files, tests and
a "done when" gate. Every claim here traces back to a specific section of the discovery doc; where
the discovery doc records an open question, this doc says so rather than inventing a value.

Legend: **[disc §X]** cites the discovery-doc section a task/file/test is pulled from.

---

## Ordering and dependencies

Declared critical path in #738 was `#743 → #742 → #745`. Discovery corrected it **[disc §2]**:

```
real critical path:
#739(a,c) + onepager → #740 → #741 → [deploy + data-accrual window] → #744 → #742b → #745
                                                                                          #746 (parallel, needs #740's UTM contract)
#743 ─────────────────────────────────────────────────────────────────────────(parallel prereq of first front deploy)
#742a ── parallel alongside #741 (pure lib, no auth, no real events needed to write it)
#747 ── entirely after #744, off critical path
#748 ── last, after a real reporting cycle has proven the replacement
```

Corrections baked into the step order below **[disc §2.1–.8]**:
1. #742 depends on #741 (queries name events that don't exist yet) — so #742a (pure lib) is
   separated from #742b (the five data routes), and #742b is placed after both #741 and #744.
2. The `#742 → #744` arrow is backwards for #742b: the route handlers need a session before they
   can exist (slug comes from session, unlinked accounts must be rejected pre-upstream-call).
3. #739 gates #744, #742b, #745, #747 via question (c) — NextAuth v5 on Next 16.2.9.
4. #739(d) (`EDITAL_PERIOD_START`) is circular with #740 — it can only be answered once #740's
   deploy date is known, so it's its own step (step 5), not bundled into step 0.
5. #741 depends on #740 for real (not "constants only") — without `before_send`, canonical events
   ship unattributed and PostHog cannot backfill retroactively.
6. #746 needs one `/api/edital/campaigns` route returning a breakdown for the caller's own slug —
   write this into #742b's scope explicitly (see step 7), or #742 ships the wrong shape.
7. #748 and #745 both touch `institution/settings/page.tsx` deletion — assigned to #745 (step 8).
8. Genuinely parallelisable now, independent of the numbered steps: #743 (step 1, nothing blocks
   it); #739(a)(b)(c) alongside #740; #742a alongside #741; #746's pure `origins.ts` as soon as
   #740 fixes the UTM contract; all of #745's chrome against frozen client-safe types; #747
   entirely, after #744.

---

## Step 0 — Onepager + #739(a)(b)(c) answers

**Why / dependencies.** The funnel definition is the deliverable the epic is judged on — #742's Q4
and #745's card order are unimplementable and unreviewable without it **[disc §1.1]**. No
dependencies; this is the first thing to do. Question (c) (NextAuth v5 on Next 16.2.9) can reshape
four downstream issues **[disc §2.3]**, so it belongs here too, not deferred into #744.

**Task breakdown.**
1. Commit the onepager itself into the repo, sourced from the real "Requisitos mínimos do Dashboard
   Institucional" document, as `docs/specs/edital-onepager.md` **[disc §1.1]**. If the real onepager
   text cannot be obtained in time, use the interim ordered list derived from #741's own acceptance
   criteria as a placeholder, marked explicitly as an ASSUMPTION pending confirmation: `landing_page_viewed
   → play_clicked → gameplay_started → chapter_1_started → quiz_started → quiz_completed →
   chapter_1_completed` **[disc §1.1]**. Do not treat the interim list as final without sign-off.
2. Answer #739(a): is `windowFunnel` available in HogQL on this project? Paste a working query
   against a fixture/test project as proof. If not available, record the fallback (`uniqExactIf` +
   clamp, "steps reached" instead of strict ordering) and flag the change in scope for #742's Q4
   and #745's screen-2 copy **[disc §6]**.
3. Answer #739(b): Query API rate limits on the current plan — run the `curl` probe planned for
   #743 (step 1) early enough to get this number; record whether a 5-minute TTL on one replica is
   sustainable **[disc §6]**.
4. Answer #739(c): does NextAuth v5 run on Next 16.2.9? Stand up a throwaway NextAuth v5 route on a
   Next 16 branch, confirm `auth()` works inside middleware with an Edge-safe config split. If the
   answer is "no" or "risky", record the fallback seriously considered in discovery: keep the
   existing magic-link service behind a `Credentials` provider instead of adding OAuth, which would
   make #747 largely redundant **[disc §6]**.
5. Record the attribution-model decision as a spike answer, not an implementation detail discovered
   later: institution attribution is an **event property** (`campaign_source` on every event row),
   not a person property — forced by `person_profiles: identified_only` **[disc §6, §3.1]**. Write
   this down now so #742's four queries are not rewritten after the fact.
6. Do **not** implement the final solution inside this step — output is a comment on #739 plus the
   committed onepager and constants, nothing executable **[disc §6]**.

**Files to create/modify.**
- Create: `docs/specs/edital-onepager.md`.
- Modify: a comment on GitHub issue #739 recording answers (a)(b)(c) and the attribution-model
  decision.

**Tests.** None (this step produces no code) — the check is the pasted `windowFunnel` query output
and the working NextAuth-v5-on-Next-16 branch as evidence, not an automated test **[disc §6, §8]**.

**Done when.** The 7 steps with their event-name mapping and the 8 cards in order are committed;
`windowFunnel` is proven or refuted by a pasted query; a NextAuth-on-Next-16 verdict is backed by a
tested version pair (not a guess); the attribution model is recorded as "event property" with its
rationale **[disc §8, step 0]**.

**Open questions carried in.** `EDITAL_PERIOD_START` is explicitly deferred to step 5, not answered
here **[disc §2.4]**. The `error_code` enum and the `CAMPAIGN_ORIGINS` taxonomy remain open past
this step **[disc §4]**.

---

## Step 1 — #743: env and infra

**Why / dependencies.** Zero dependencies, on the critical path as a parallel prerequisite of the
first front deploy; the compose edits it needs are unscoped in the issue text, and finding that out
late blocks deploy **[disc §8, step 1]**.

**Task breakdown.**
1. Add the front `environment:` block entries to all three compose files (currently PostHog vars go
   to the back service only, per `compose.production.yaml:100-101` vs the front block `:91-99`
   **[disc §3.2]**) — this is a gap no issue currently names.
2. Follow the exact precedent already in the repo: `RESPONSIVEVOICE_API_KEY` at
   `compose.production.yaml:99` is a front runtime secret with no build arg needed — copy that
   pattern, don't invent a new one **[disc §3.2]**.
3. Add `AUTH_TRUST_HOST` to the variable list — omitted from #743 as filed, but required by
   NextAuth v5 behind the nginx proxy, which already sets `X-Forwarded-Proto`
   (`nginx.production.conf.template:41`) **[disc §3.2]**.
4. Add `AUTH_OAUTH_UPSERT_TOKEN` to the **back** compose block (needed by #744's upsert endpoint).
5. Update `.env.example` with the new variables (mirroring the existing `POSTHOG_API_KEY`/
   `POSTHOG_HOST` entries at `:71-72` **[disc §3.2]**).
6. Correct `docs/handoff/en/05-deploy.md:164-166`, which lists what Coolify holds and omits the
   personal key — the `phx_` key already exists per project decision, so the doc is stale
   **[disc §3.6]**.
7. Record the replica count (already answered: **one** — no `replicas:` and no `env_file:` in any
   compose file **[disc §3.2]**) on the #743 issue, since it constrains #742's module-cache design
   and #747's argon2 memory cost against the 0.5-cpu/512-M container cap.
8. Run the `curl` probe against the PostHog Query API with the `phx_` key in both environments to
   verify it actually works — this is the "wiring plus verification", not key issuance, per the
   locked decision **[Context, decision 2]**.

**Files to create/modify.**
- Modify: `compose.yaml`, `compose.production.yaml`, and the third compose file (staging/dev,
  whichever exists) — front `environment:` block in each, plus back block for
  `AUTH_OAUTH_UPSERT_TOKEN`.
- Modify: `.env.example`.
- Modify: `docs/handoff/en/05-deploy.md:164-166`.

**Tests.**
- `env-server` boots with all four new optional fields unset (extends the existing lazy-zod
  pattern in `front/src/lib/env-server.ts` — see step 4) **[disc §3.2, §5.4]**.
- CI grep: `grep -r "phx_" front/.next/static/**` must return nothing, proving the personal key
  never lands in a client bundle **[disc §7, "server-only" risk row]**.

**Done when.** The `curl` probe from #743 returns 200 with the `phx_` key and fails with the
`phc_` key; every variable is present in the right service block of all three compose files; none
is `NEXT_PUBLIC_*` and none is a Docker build arg; `AUTH_TRUST_HOST` is included; the replica count
(1) is recorded on the issue **[disc §8, step 1]**.

**Open questions carried in.** None specific to this step — it is fully specified by discovery.

---

## Step 2 — #740: identity foundation

**Why / dependencies.** Every later metric is unattributable without it, and it resets the data
clock — the reportable window can only open on this step's deploy date, so it must ship before
#741 and before any real data accrual **[disc §8, step 2; §7 "Irrecoverable history" risk]**.
Depends on step 0's attribution-model answer (event property, not person property).

**Task breakdown.**
1. **Fix the lost `landing_page_viewed` structurally, not by narrowing the race.** Move
   `posthog.init()` out of the awaited `fetchBootstrap()` call — init synchronously on provider
   mount using the durable cookie's id and `featureFlags: {}`, then apply the bootstrap result
   afterward via `register()` / feature-flag reload. Only `record_sessions_percent` and
   `record_canvas` genuinely need flags at init time, and a conservative default for one pageview
   is a non-issue compared to losing funnel step 1 **[disc §5.2]**.
2. Move `landing_page_dwell_time` off the `useEffect` cleanup (unreliable on real navigations) onto
   `pagehide` / `visibilitychange` **[disc §5.2, §3.1]**.
3. **Identity: server-set cookie with explicit `Max-Age`, sent both as cookie and as the existing
   `?distinct_id=` query parameter**, backend precedence `user?.id ?? cookie ?? validated query ??
   randomUUID()` **[disc §5.1]**. Rationale to preserve in code comments: cookie-only breaks in
   cross-origin local dev (`localhost:3000` → `:3001`); query-only cannot fix `sendBeacon` (cannot
   set headers, but does send cookies) **[disc §5.1, §3.1]**.
4. Validate the query-parameter identity's format and length (≤200 chars, per #740's own ask) and
   prefer the cookie — this closes most of the flag-enumeration surface opened by `bootstrap` being
   `@Public()` **[disc §5.1]**.
5. Promote the `game.controller.ts` distinct-id fallback from "cheap bonus" to **required**: this
   is the only fix for beacon attribution (the guest id currently arrives via the client-settable
   `x-guest-id` header, which `sendBeacon` never sends) and it also repairs the legacy
   `averageSessionTime` metric **[disc §5.1, §3.1]**.
6. Keep `gp_fallback_guest_id` (localStorage) as a **one-time migration seed** into the new cookie,
   never the reverse — it can't exist before hydration, so it can never be the source of truth for
   the first capture **[disc §5.1]**.
7. **Delete** the session-scoped `gp_distinct_id` write at `PostHogProvider.tsx:21-24` — a client
   writer on a session-scoped cookie is the churn amplifier **[disc §5.1, §3.1]**.
8. Decide and implement where the durable cookie is set — middleware (`middleware.ts`, runs before
   any JS, strongest option, but requires adding `/game/:path*` to the matcher and keeping the Edge
   bundle free of NextAuth's heavy provider imports) or the provider on first load (simpler, one
   render later). Discovery leans middleware; confirm against #739(c)'s Edge findings from step 0
   before committing **[disc §5.1, marked ASSUMPTION to validate]**.
9. Use posthog-js's built-in `custom_campaign_params` for a non-standard key like
   `utm_institution` to get **last-touch** attribution for free — the hand-rolled module in #740 is
   needed only for the **first-touch** rule on top of that **[disc §3.1, "three findings the issues
   miss"]**.
10. Confirm there is no cross-domain first-touch problem in production (front and back share origin
    behind nginx) — the identity mechanism differs only in local dev, where it's cross-origin
    **[disc §3.1]**.
11. `before_send` groundwork: implement it as the total, never-throwing backstop that stamps
    anything missing (used fully in #741, but the module/hook needs to exist here since #740 owns
    identity/property injection). Do **not** use `before_send` to rename or fan out events
    **[disc §5.3]**.

**Files to create/modify.**
- Modify: `front/src/components/PostHogProvider.tsx` (init timing, cookie writes at `:15-24`,
  init call at `:65/:81`).
- Modify: `front/src/middleware.ts` (cookie-setting, matcher, Edge-bundle import discipline).
- Create: `front/src/lib/posthog/eventContext.ts`, `front/src/lib/posthog/beforeSend.ts`.
- Create: `front/src/lib/edital/anonymousPlayer.ts`, `front/src/lib/edital/campaign.ts`,
  `front/src/lib/edital/events.ts`.
- Modify: `back/src/modules/posthog/posthog.controller.ts` (cookie precedence, query validation).
- Modify: `back/.../game.controller.ts` (required distinct-id fallback, read durable cookie when
  `x-guest-id` absent).
- Modify: `front/src/game/PhaserGame.tsx` (bootstrap/init sequencing touch points).
- Modify: `front/src/lib/posthogStub.ts` (keep stub path working with the new init sequencing).

**Tests.**
- New `PostHogProvider` test (none exists today) covering: init happens before bootstrap resolves;
  `landing_page_viewed` is captured even when the fetch is slow/fails; cookie precedence order.
- Route/unit test on `posthog.controller.ts` precedence: `user?.id ?? cookie ?? validated query ??
  randomUUID()`, including rejecting a malformed/oversized query `distinct_id`.
- `game.controller.ts` test: with `x-guest-id` absent, the durable cookie is used, not a fresh
  `randomUUID()`.
- `custom_campaign_params` config test for `utm_institution` last-touch capture.
- `before_send` totality test against malformed/missing-property input **[disc §5.7]**.

**Done when.** Two consecutive browser sessions produce **one** PostHog person; three hard reloads
leave `distinct_id` unchanged with one `anonymous_player_created`; a `$pageview`, a `game/**`
capture and `landing_page_viewed` all carry the slug and `campaign_source` with no capture wrapper;
a later visit with a different `utm_source` does not overwrite first-touch; returning to `/` with
no query parameter still carries `campaign_source`; the stub path still runs with the key unset;
the durable cookie exists and `game.controller.ts` reads it when `x-guest-id` is absent
**[disc §8, step 2]**.

**Open questions carried in.** Middleware-vs-provider cookie placement is explicitly an ASSUMPTION
pending #739(c) confirmation from step 0 **[disc §5.1]**.

---

## Step 3 — #741: canonical dual-emit (+ `game_event` index + stale env-mock fix)

**Why / dependencies.** #742's queries name events that don't exist yet (`play_clicked`,
`gameplay_started`, `chapter_1_*`, `quiz_answered`, `session_finished`, `critical_error_occurred` —
none exist in `front/` or `back/` today, per grep **[disc §2.1]**). Shipping this promptly opens
the data-accrual window earlier. Depends on #740 being real (not "constants only" — without
`before_send`, canonical events ship unattributed and PostHog cannot backfill retroactively
**[disc §2.5]**) and on step 0's step list.

**Task breakdown.**
1. Emit the 7 canonical events from step 0's list at the correct call sites, dual-emitting
   alongside existing legacy events (never renaming/replacing at the `before_send` layer — dual-
   emit stays explicit at the call site, per discovery's rejection of using `before_send` for
   fan-out **[disc §5.3]**).
2. Fix `handleLoadingError`, currently a no-op at `PhaserGame.tsx:97` (not `:94` as the epic states
   — **verify by grep, not by the epic's line numbers**, since 119 commits have landed since filing
   with none touching analytics **[disc §3.1]**). `Game.ts:229-235` dispatches a DOM
   `phaser-loading-error` straight into that no-op today — wire it to
   `critical_error_occurred{error_code, is_blocking}`.
3. Instrument `QuizManager.ts:83-93`, which currently emits no analytics at all, for
   `quiz_started`/`quiz_completed` (and `quiz_answered` per the dual-emit list, excluding
   intermediate quizzes as the issue specifies — document that exclusion in `EVENTS.md` so nobody
   later reconciles `quiz_answered` against `quiz_answer_submitted` as a false bug **[disc §7]**).
4. **Session-scope the `session_finished` single-fire guard**, not per-instance. `AnalyticsSystem
   .setupAbandonmentTracking` (`:43-59`) never removes its `beforeunload` listener, and
   `Game.ts:570-572` runs it in `create()`; `LevelCinematic.ts:102` restarts the GAME scene per
   level, so `GAME_STARTED`/`SESSION_END` fire once per level today, not once per session
   (`Game.ts:688`) — a per-instance guard would still inflate the count by level count
   **[disc §3.1, "three findings the issues miss"; §7 "session_finished inflation" risk]**.
5. Fire `session_finished` on `pagehide` **and** `visibilitychange`, alongside `beforeunload`, and
   remove the accumulating listener (see task 4) — needed for iOS Safari, which doesn't reliably
   fire `beforeunload` **[disc §7]**.
6. Verify `game_load_failed` (already captured, one-shot via `gameLoadFailedSentRef:179`,
   `PhaserGame.tsx:181`) is not double-emitted once the new `critical_error_occurred` path exists —
   the gap discovery identifies is asset-load and quiz-data failures, not boot failure
   **[disc §3.1]**.
7. Fold a `(timestamp, type)` index migration into this issue's migration — `game_event` currently
   has no index beyond the primary key while that's the hot filter, and #748 is keeping this table
   as a fallback dashboard; an unindexed table with an unbounded `ALL_TIME` scan is not a sound
   fallback **[disc §3.3, §7 "event.logged mirror" risk]**.
8. Correct `EVENTS.md:170`, which wrongly claims `game_load_failed` covers `loading_stage:
   asset_load` from `PhaserGame.tsx`/`Game.ts` asset `loaderror` **[disc §3.6]**.
9. **Fix the stale env mock as a line item of this issue**: `QuizManager.test.ts:9-15` mocks
   `../../lib/env` with a stale flat shape (`env.NEXT_PUBLIC_*`) while `env.ts` exports
   `{client: …}` — the mock is silently inert. Add a guard test asserting the real module's
   `{client: …}` shape so future drift breaks one obvious test instead of quietly disabling mocks
   **[disc §3.5, §5.7]**.
10. Converge with the previous epic: `docs/EPIC-analytics-dashboard.md`'s still-open pendency #1
    ("emit `event.logged` for critical errors") is the same work as this issue — close it with a
    pointer to #741 rather than letting two epics implement it twice **[disc §3.6]**.

**Files to create/modify.**
- Modify: `front/src/game/PhaserGame.tsx:97,181`.
- Modify: `front/src/game/Game.ts:229-235,687-699` (verify by grep, line numbers are stale).
- Modify: `front/src/game/systems/AnalyticsSystem.ts` (listener lifecycle, session-scoped guard).
- Modify: `front/src/game/systems/QuizManager.ts:83-93` and level-1 branches.
- Modify: `front/src/store/game-ui-store.ts:570` (verify by grep).
- Modify: `front/src/game/systems/BadgeSystem.ts:95`.
- Modify: `front/src/game/PersistenceBridge.ts:105`.
- Modify: the three front error boundaries (locate by grep for `componentDidCatch`/error-boundary
  pattern, not by stale line numbers).
- Modify: `front/src/game/QuizManager.test.ts:9-15` (env mock fix).
- Modify: `EVENTS.md:170` and the landing-events property table at `:155-157`.
- Create: one migration for the `(timestamp, type)` index on `game_event`
  (`back/src/core/database/migrations/<epochMs>-AddGameEventIndex.ts`; assign the timestamp now,
  before #744/#747's migrations are authored, to avoid collision **[disc §3.3, §7]**).

**Tests.**
- Full-playthrough integration/manual check: 7 canonical events fire in order in PostHog live
  events.
- StrictMode double-fire test: `gameplay_started` fires exactly once under React StrictMode.
- Session-scope test: `session_finished` fires exactly once per session across `pagehide`, tab
  close and SHUTDOWN — including a scenario replaying the per-level scene restart from
  `LevelCinematic.ts:102` to prove no inflation.
- Asset-failure test: renaming/breaking the level-1 tilemap produces
  `critical_error_occurred{error_code:"asset_load_failed", is_blocking:true}`.
- DB test: a blocking error also writes a `game_event` row with `severity:"critical"`.
- Regression test: legacy events are unchanged (dual-emit doesn't replace anything).
- `QuizManager.test.ts` guard test asserting the real `env.ts` `{client: …}` shape.
- Migration test: index migration runs and reverts via `make db-migrate` / `migration:revert`.

**Done when.** A full playthrough shows the 7 steps in order in live events; `gameplay_started`
fires exactly once under StrictMode; `session_finished` fires exactly once per session across
`pagehide`, tab close and SHUTDOWN, including on iOS Safari; renaming the level-1 tilemap produces
`critical_error_occurred{error_code:"asset_load_failed", is_blocking:true}`; a blocking error also
writes a `game_event` row with `severity:"critical"`; legacy events are unchanged; the
`QuizManager.test.ts` env mock matches `{client: …}` **[disc §8, step 3]**.

**Open questions carried in.** The `error_code` enum is not fully specified by discovery — define
its values as part of this step's design work, not as a later retrofit **[disc §4]**.

---

## Step 4 — #742a: pure query lib + `/api/edital/health`

**Why / dependencies.** Needs neither auth nor real data, so it can run in parallel with #741;
freezing `safeRate`/`period`/client-safe types here unblocks #745's chrome during the data-accrual
window **[disc §8, step 4]**. No hard dependency beyond step 0's attribution-model decision.

**Task breakdown.**
1. **Extend, don't parallel-invent**, `front/src/lib/env-server.ts` — it already has a lazy zod
   `serverSchema`, `getServerEnv()`, `resetServerEnv()` test hook and `serverEnv.server` getter
   (commit `5c92cdd6`) **[disc §3.2, §5.4]**. Add the four new PostHog/query-layer fields as
   **optional**, so the app boots unconfigured.
2. Add the `server-only` package (absent from `package-lock.json`, not a transitive dep of
   `next@16.2.9`) and put `import "server-only"` at the top of `env-server.ts` itself — this
   upgrades the existing runtime throw for the key that's already there into a build-time error
   **[disc §3.2, §5.4, §7 "server-only claimed but not available" risk]**.
3. Mirror `front/src/app/api/tts/synthesize/route.ts` for route-handler structure and its
   `route.test.ts` for the test preamble (`@jest-environment node` docblock, `TextEncoder`
   polyfill, `jest.mock("@/lib/env-server")`) — front jest is jsdom by default
   (`front/jest.config.ts:8`), so every #742 route test needs that docblock **[disc §3.2]**.
4. Build `/api/edital/health/route.ts` reporting `configured: false` when the four fields are
   unset, `configured: true` otherwise — no upstream call either way.
5. **Split the types**: ship a client-safe `front/src/lib/edital/types.ts` (DTOs plus the
   `dateRange` union shared with the zod schema) so #745's client components don't have to import
   anything under the `server-only` boundary; keep only internals under `server/` **[disc §5.4]**.
6. **Make scope un-bypassable by type, not by review**: an opaque branded `Scope` type producible
   only by `resolveScope(session)`, taken as the first parameter of every query builder — a handler
   passing `searchParams.get("slug")` must fail to compile. This is stronger than #742's original
   "required non-optional param" **[disc §5.4]**. (`resolveScope` itself lands with #744 in step 6;
   here, define the `Scope` type and builder signatures against it.)
7. Build `hogql.ts` (bearer header, body shape, timeout/abort, 429 → `retryAfter`, key never
   surfaced in an error message).
8. Build `period.ts` using `Intl` date math for São Paulo civil-day boundaries — no date-fns/dayjs/
   luxon exists in the repo and MUI v9 ships without `x-date-pickers` **[disc §3.2]**.
9. Build `metrics.ts` with `safeRate(numerator, denominator)` returning `{value, numerator,
   denominator}`, clamped to `value ≤ 1`, and monotonic-funnel helpers.
10. Build `csv.ts`: `EF BB BF` BOM prefix, `;` delimiter, decimal comma (Excel pt-BR).
11. Keep the module cache **plus single-flight**, with a code comment recording that correctness
    does not depend on replica count (confirmed as 1 in step 1) — `refresh: "blocking"` is what
    actually sustains load under concurrent identical requests **[disc §5.4]**.

**Files to create/modify.**
- Create: `front/src/lib/edital/server/hogql.ts`, `queries.ts`, `metrics.ts`, `period.ts`, `csv.ts`.
- Create: `front/src/lib/edital/types.ts` (client-safe).
- Modify: `front/src/lib/env-server.ts` (four new optional fields, `import "server-only"`).
- Create: `front/src/app/api/edital/health/route.ts` and its `route.test.ts`.
- Modify: `front/package.json` (add `server-only`).

**Tests.**
- Health route test: `configured: false` with nothing set, and the app still boots.
- HogQL-generation test: fails CI if any generated query contains `uniq(` without `Exact`, or lacks
  an institution predicate (this is discovery's "highest-value suite first" recommendation
  **[disc §5.7]**).
- `metrics.ts` unit tests: `safeRate(0,0)`, clamp to 1, monotonic funnel ordering.
- `period.ts` unit tests: São Paulo civil-day boundaries at 00:30 and 23:30 local time, `all-time`
  clamped (clamp value itself pending step 5's `EDITAL_PERIOD_START`).
- `csv.ts` test: assert the literal `EF BB BF` prefix byte-wise, `;` delimiter, decimal comma.
- Single-flight test: two concurrent identical calls to a builder produce one upstream POST.
- Route test (once builders exist): a forged `?slug=` in `searchParams` never reaches the outbound
  body — provable here because the `Scope` type makes it a compile error, not just a runtime check.

**Done when.** Health returns `configured:false` with nothing set and the app boots; a test fails
if any generated HogQL contains `uniq(` without `Exact` or lacks an institution predicate; every
rate is `{value,numerator,denominator}` with `value ≤ 1`; the CSV's `EF BB BF` prefix is asserted
byte-wise; two concurrent identical calls produce one upstream POST **[disc §8, step 4]**.

**Open questions carried in.** `EDITAL_PERIOD_START`'s actual value is not set here — `period.ts`'s
`all-time` clamp ships with a placeholder wired to step 5's constant, not a hardcoded date
**[disc §2.4]**.

---

## Step 5 — #739(d): `EDITAL_PERIOD_START`

**Why / dependencies.** Only honestly answerable once #740's deploy date is known — everything
before that date is analytically unusable (churned ids, no attribution, no step 1)
**[disc §2.4, §8 step 5]**.

**Task breakdown.**
1. Record the #740 deploy date (from step 2's actual ship date) as `EDITAL_PERIOD_START`.
2. Wire the constant into `period.ts` (built in step 4) so `all-time` provably never queries before
   it.
3. Update the risk note in `docs/specs/edital-onepager.md` or wherever step 0 recorded the funnel
   steps, so the reportable window's start date is visible next to the metric definition, not
   buried in a commit message **[disc §7 "Irrecoverable history" risk]**.

**Files to create/modify.**
- Modify: `front/src/lib/edital/server/period.ts` (constant wiring).
- Modify: `docs/specs/edital-onepager.md` (record the date and rationale).

**Tests.**
- `period.ts` test: a query for a date range starting before `EDITAL_PERIOD_START` is clamped to
  start at the constant, never earlier.

**Done when.** It lands as a tested constant in `period.ts` and `all-time` provably never queries
before it **[disc §8, step 5]**.

**Open questions carried in.** None — this step exists specifically to close the open question from
step 0/§2.4.

---

## Step 6 — #744: NextAuth and tenancy

**Why / dependencies.** It is the slug source and tenancy boundary; both #742b and #745 hang off
it. Depends on step 0's #739(c) verdict (NextAuth v5 on Next 16.2.9) **[disc §8, step 6]**.

**Task breakdown.**
1. Split `auth.config.ts` (Edge-safe, used by middleware) from `auth.ts` (full config, with
   providers) — otherwise the middleware build fails **[disc §5.5]**.
2. Build `/auth/oauth/upsert` on the backend — entirely new, since there's no OAuth of any kind in
   `back/src` today (0 grep hits) **[disc §3.4]**. Give it a constant-time secret compare plus an
   email-domain allowlist, because it's an endpoint that creates institution-role users
   **[disc §5.5]**.
3. Add `institutionSlug` (nullable) and a password-hash column groundwork to `User`
   (`user.entity.ts:12-50` currently has neither) via a migration — assign this migration's
   timestamp now, alongside #747's, to avoid collision (both are hand-written round timestamps;
   latest existing is `1780000000006`) **[disc §3.3, §7 "migration timestamp collision" risk]**.
4. Implement `resolveScope(session)` producing the branded `Scope` type defined in step 4 — the
   only legal way to obtain a `Scope` for the query builders.
5. Define route ownership explicitly: NextAuth owns `/institution/*`, legacy auth owns admin — or
   the two cookies fight in `middleware.ts` **[disc §5.5]**.
6. Fix the `middleware.ts:4` hardcoded cookie-name vs `env.client.authStatusCookieName` mismatch
   while touching this file, and note (don't necessarily fix in this step, but record) that
   `PROTECTED_ROUTES` is `[]` making an existing dead-code block at `:47-51`, and that `/game` is
   not matched at all **[disc §3.4]**.
7. Document the accepted-risk coexistence window: while both auth systems coexist, the weaker one
   (self-assignable institution role via `register.dto.ts:50-58` `@IsIn([Role.Institution])`, no
   backend `InstitutionGuard`) defines the real security posture. Keep the window short and record
   it as accepted per the locked project decision **[disc §7 "legacy self-assignable role" risk,
   §3.4]**.
8. Seed script for the first institution slugs — document as the known manual step, not automated
   in this issue.

**Files to create/modify.**
- Create: `front/src/auth.ts`, `front/src/auth.config.ts`.
- Create: `front/src/app/api/auth/[...nextauth]/route.ts`.
- Modify: `front/src/middleware.ts` (route ownership split, cookie-name fix).
- Create: back upsert endpoint (`back/src/modules/auth/oauth-upsert.controller.ts` or module-
  consistent path — follow existing `back/src/modules/auth/` conventions).
- Modify: `back/.../user.entity.ts` (+ migration for `institutionSlug` and password-hash columns).
- Create: `front/src/lib/edital/server/resolveScope.ts`.

**Tests.**
- A hand-forged `auth_status` cookie no longer grants `/institution`.
- A `player`-role session reaches neither the screen nor the API.
- Two accounts on different slugs see only their own numbers (isolation test).
- A forged `?campaign=` query parameter is provably ignored because the parameter doesn't exist in
  any route signature.
- An account with `institutionSlug = null` renders the empty state and produces **zero** upstream
  PostHog calls, verified in a server-log assertion.
- Migration test: runs and reverts via `make db-migrate`.

**Done when.** A hand-forged `auth_status` cookie no longer grants `/institution`; a `player`
session reaches neither screen nor API; two accounts on different slugs see only their own numbers;
a forged `?campaign=` is provably ignored because the parameter does not exist; an account with
`institutionSlug = null` renders the empty state and produces **zero** upstream PostHog calls in the
server log; the migration runs and reverts via `make db-migrate`; the seed script for the first
slugs is documented as the known manual step **[disc §8, step 6]**.

**Open questions carried in.** #747's account-linking policy is not decided here — it's #747's own
open question, carried forward to step 10 **[disc §4]**.

---

## Step 7 — #742b: the five session-gated route handlers

**Why / dependencies.** With both a session (step 6) and real events (step 3) in place, queries are
verifiable end-to-end instead of against fixtures **[disc §8, step 7]**.

**Task breakdown.**
1. Build the five data routes on top of #742a's builders (step 4), each taking the branded `Scope`
   from `resolveScope(session)` (step 6) as first parameter — never a request parameter.
2. Implement Q1–Q4 exactly as named in the epic: `play_clicked`, `gameplay_started`,
   `chapter_1_*`, `quiz_answered`, `session_finished`, `critical_error_occurred` — all now real
   events as of step 3 **[disc §2.1]**.
3. Implement the sixth route the graph correction requires: **`/api/edital/campaigns`**, returning
   a breakdown of origins with user counts **for the caller's own slug only**, breakdown in the
   response body, no parameter in the request — resolves the #746-vs-#742 contradiction identified
   in discovery **[disc §2.6]**.
4. Zod-validate the `dateRange` query parameter only; every other scope value comes from the
   session, never from the request.
5. Wire in the module cache + single-flight from step 4, with `refresh: "blocking"`.
6. Enforce the ClickHouse-scan risk mitigations: mandatory `timestamp` floor in every query,
   explicit `LIMIT`, a 25-second abort verified against the nginx read timeout, a row cap on CSV,
   and a server-side clamp on custom date ranges **[disc §7 "ClickHouse full scan" risk]**.

**Files to create/modify.**
- Create: `front/src/app/api/edital/summary/route.ts`, `funnel/route.ts`, `report/route.ts`,
  `csv/route.ts` (or equivalent naming matching #745's screen needs), `campaigns/route.ts`.
- Each with a co-located `route.test.ts` following the `tts/synthesize` preamble pattern.

**Tests.**
- Route test: a forged `?slug=` never reaches the outbound body (compile-time via `Scope`, plus a
  runtime regression test).
- Route test: an unlinked session makes **zero** upstream `fetch` calls.
- Load test: 5 requests in 10 seconds produce **one** upstream query (single-flight proof).
- 401 test: no session → 401, no upstream call.
- Manual reconciliation: Q1 run by hand in PostHog returns **exactly** the endpoint's number.
- CSV test: `report.csv` opens correctly in Excel pt-BR (accents intact, one value per column).
- Abort test: the 25-second abort is reachable through the nginx proxy's read timeout, not silently
  truncated earlier.

**Done when.** Q1 run by hand in PostHog returns **exactly** the endpoint's number; 5 requests in
10 s produce one upstream query; 401 without a session; `report.csv` opens correctly in Excel
pt-BR **[disc §8, step 7]**.

**Open questions carried in.** The `CAMPAIGN_ORIGINS` taxonomy is still open going into this step
for the `/api/edital/campaigns` route — define the initial taxonomy here if #746's `origins.ts`
hasn't landed it first (see step 9) **[disc §4]**.

---

## Step 8 — #745: the three screens

**Why / dependencies.** Consumes frozen DTOs (step 4) and a real session (step 6); its chrome was
built during the data-accrual window **[disc §8, step 8]**.

**Task breakdown.**
1. Build chrome ahead of #742b where possible, against the frozen client-safe types from step 4:
   `DashboardState`, a ~25-line `useAsyncData` hook with `AbortController`, `HeroMetric`,
   `RateCard`, `CsvExportButton` **[disc §5.6]**.
2. Fix the real bug in `institution/page.tsx:52-100`: `useAsyncData` must **clear** the error on
   retry and keep `FilterBar` mounted — today the early return at `:91-100` unmounts `FilterBar` on
   any transient failure, bricking the page for its lifetime **[disc §3.5, §5.6]**.
3. Widen `FilterBar` (`FilterBar.tsx:3-6,19-21`, currently 3 hardcoded options, `dateRange` typed
   as a bare `string`) to a typed `DateRange` union with a **server-clamped** custom range — an
   unbounded custom range re-creates the full-scan problem `EDITAL_PERIOD_START` exists to prevent
   **[disc §5.6, §7]**.
4. Export and widen `FunnelStep` (currently a local, non-exported interface at
   `FunnelChart.tsx:3-6` carrying only `{label, value}`) to carry absolute counts — the auditor's
   number is a count, not a rate **[disc §3.5, §5.6]**.
5. Use plain `fetch` with `credentials: "include"`, not `apiClient` — `apiClient` injects a Bearer
   token and a force-logout interceptor (`client.ts:50-79,108-113`) that would fight the NextAuth
   cookie **[disc §5.6]**.
6. Reuse `KPICard.tsx:3-9` as-is (already has optional `target`/`status` and `subtitle`)
   **[disc §3.5]**.
7. Remove any `*_TARGETS` constant and the forbidden "Login concluído" headline metric
   (`institution/page.tsx:130`) — replace with the 8 cards in the onepager's documented order from
   step 0.
8. Remove the `/metrics` call at `institution/page.tsx:58` entirely — don't layer PostHog numbers
   on top of the Postgres-derived ones; PostHog is the sole source of truth per #748's mandate, and
   two numbers on two screens is how a report gets rejected **[disc §7 "four analytics stacks will
   disagree" risk]**.
9. Delete `/institution/settings/page.tsx` (69-line dead placeholder) and its nav link — this issue
   owns that deletion, not #748, per the graph correction in §2.7 **[disc §2.7]**.

**Files to create/modify.**
- Modify: `front/src/app/institution/page.tsx` (full rewrite of the fetch/error/render logic).
- Modify: `front/src/app/institution/layout.tsx:28-31` (nav entries).
- Delete: `front/src/app/institution/settings/page.tsx`.
- Modify: `front/src/components/dashboard/FilterBar.tsx`, `FunnelChart.tsx`.
- Reuse unmodified: `front/src/components/dashboard/KPICard.tsx`.
- Create: `front/src/lib/edital/client/useAsyncData.ts`, `DashboardState.ts`.
- Create: `front/src/components/dashboard/HeroMetric.tsx`, `RateCard.tsx`, `CsvExportButton.tsx`.

**Tests.**
- `useAsyncData` test: error clears on retry, `FilterBar` stays mounted through an error state.
- Funnel monotonicity test: values are non-increasing across the 7 steps.
- `HeroMetric` reconciliation test against a hand-run Q1 value.
- Snapshot test on the funnel/card-order definition — makes changing the audit definition a
  reviewed act, per discovery's testing-strategy recommendation **[disc §5.7]**.
- Card-order test: 8 cards render in the onepager's documented order.
- Regression test: no `*_TARGETS` constant remains anywhere in the dashboard tree.
- Nav test: `/institution/settings` route and nav link are both gone with no dangling link.

**Done when.** The 8 cards render in documented order; the funnel is monotonically non-increasing
across 7 steps; `HeroMetric` matches the hand-run Q1 exactly; an API error offers a retry that
**clears** the error and keeps `FilterBar` mounted; no `*_TARGETS` constant remains;
`/institution/settings` is gone with no dangling nav link **[disc §8, step 8]**.

**Open questions carried in.** What the dashboard shows for **unattributed** players (arrived with
no `utm_institution`, count toward the global 5.000 but belong to no institution) is not resolved
by discovery — decide and document this screen state as part of this step, don't ship silently
without it **[disc §4]**.

---

## Step 9 — #746: campaign links

**Why / dependencies.** Attribution only works if links in the wild carry the parameter — the
earlier real links exist, the more data accrues before the deadline. Its pure `origins.ts` should
ideally jump earlier (parallel with step 4), once #740 fixes the UTM contract; the route dependency
below is what actually gates the full feature **[disc §2.8, §8 step 9]**. Blocked on the
`/api/edital/campaigns` breakdown shape from step 7.

**Task breakdown.**
1. Build `origins.ts` as a registry-as-TypeScript (accepted per the locked project decision that a
   deploy per institution is acceptable at this scale) — make the deploy-per-institution cost
   visible in the file itself, as a comment **[disc §7 "Registry-as-TypeScript" risk]**.
2. Generate links in the form `https://guardiaodacultura.42.rio/?utm_institution=<slug>` — the
   app's own `/` route, same-origin in production, so there is no cross-domain first-touch problem
   to solve here **[disc §3.1]**.
3. Gate the links screen so an unlinked account sees an explicit "awaiting linkage" state, not an
   empty dashboard that could be mistaken for zero players **[disc §7]**.
4. Render unknown slugs as the raw slug (no silent drop, no crash).
5. Ensure the links-generator page itself emits **zero** PostHog events — it's an internal tool
   page, not part of the funnel.
6. Consume the `/api/edital/campaigns` breakdown (step 7) to show origins with user counts.

**Files to create/modify.**
- Create: `front/src/lib/edital/origins.ts`.
- Create/modify: the campaign-link generator page under `front/src/app/institution/**` (exact path
  per #746's issue text — links screen).

**Tests.**
- End-to-end manual check: a generated link, opened in a clean browser profile and played, appears
  under that campaign.
- Unknown-slug test: renders the raw slug, doesn't crash or drop silently.
- Zero-event test: the links-generator page itself emits no PostHog captures (asserted, not just
  assumed).

**Done when.** A generated link, opened in a clean profile and played, appears under that campaign
end-to-end; unknown slugs render the raw slug; the page emits zero PostHog events (asserted)
**[disc §8, step 9]**.

**Open questions carried in.** The `CAMPAIGN_ORIGINS` taxonomy — if not already settled in step 7,
it must be finalized here before `origins.ts` is considered done **[disc §4]**.

---

## Step 10 — #747: password provider

**Why / dependencies.** Additive, fully parallel after #744 (step 6), on no critical path
**[disc §8, step 10]**. Depends on #739(c)'s verdict from step 0 — if NextAuth v5 doesn't pan out
and the fallback (magic-link behind a `Credentials` provider) is chosen instead, this issue's scope
shrinks or becomes redundant **[disc §6]**.

**Task breakdown.**
1. Add a `passwordHash` column to `User` via the migration timestamp reserved in step 6 (assigned
   up front alongside #744's, to avoid collision) **[disc §3.3, §7]**.
2. Ensure a `null` `passwordHash` never authenticates (explicit guard, not implicit falsy check).
3. Copy the existing `@ThrottleByEmail` pattern (`throttle-by-email.decorator.ts:5-8`), which
   already works because the decorator attaches `EmailThrottlerGuard` itself — note that the
   generic `ThrottlerGuard` is **not** wired as an `APP_GUARD`
   (`app.module.ts:41-48,51-54`), so `@Throttle` alone would be inert; `@ThrottleByEmail` is the
   pattern that actually enforces a limit **[disc §3.4]**.
4. Size argon2 parameters against the 512-M container memory cap confirmed in step 1
   (`compose.production.yaml:118-126`) **[disc §3.2, §3.3]**.
5. Make wrong-password and unknown-email responses indistinguishable in status, body, and rough
   timing (standard timing-attack mitigation for login endpoints).
6. Decide and document the account-linking policy (open question carried from step 6) — test it in
   both directions (linking an existing magic-link account to a password, and vice versa).

**Files to create/modify.**
- Modify: `back/.../user.entity.ts` (+ migration for `passwordHash`).
- Create: password-provider auth module/service (`back/src/modules/auth/password/**`, following
  existing `back/src/modules/auth/` structure).
- Reuse: `back/.../throttle-by-email.decorator.ts` pattern.

**Tests.**
- A `null` `passwordHash` never authenticates.
- Login rate limiting is enforced by a real guard — a test trips it, copying the
  `throttle-by-email.decorator.ts` test pattern.
- argon2 parameters documented and tested against the 512-M container limit (memory-cost assertion
  or a comment plus a manual load check).
- Wrong password vs unknown email: indistinguishable status, body, and rough timing (a timing test
  with reasonable tolerance).
- Account-linking test in both directions.
- Migration test: runs and reverts.

**Done when.** A `null` `passwordHash` never authenticates; login rate limiting is enforced by a
real guard and a test trips it (copy `throttle-by-email.decorator.ts:5-8`); argon2 parameters are
documented against the 512-M container limit; wrong password and unknown email are
indistinguishable in status, body and rough timing; the linking policy is decided, written down and
tested in both directions **[disc §8, step 10]**.

**Open questions carried in.** None remaining after this step resolves the linking policy.

---

## Step 11 — #748: cleanup and docs

**Why / dependencies.** Nothing is removed before its replacement is proven in production — this
step runs only after a real reporting cycle has validated the new dashboard **[disc §8, step 11]**.

**Task breakdown.**
1. Delete `analytics.controller.ts` (`/analytics/aggregated`, `/analytics/classes` — hardcoded fake
   per-student data behind `@Roles(Institution, Admin)`, zero front call sites already confirmed
   **[disc §3.3]**).
2. Delete the dead front wrappers at `front/src/lib/api/analytics.ts:73,80` (zero call sites).
3. Delete `dashboard.controller.ts` (a 3-line-diff duplicate of `dashboard/metrics.controller.ts`,
   dead surface — the front calls only `/metrics` at `institution/page.tsx:58`, and step 8 already
   removed that call, so confirm `/metrics` still has a legitimate caller or is itself reclassified
   as dead) **[disc §3.3]**.
4. **Verify every deletion by grep, not by the issue's line numbers** — 119 commits have landed
   since the epic was filed with none touching analytics, so every cited line is 3–30 lines stale
   **[disc §3.1, §8 step 11]**.
5. Confirm `analytics.service.ts`/`dashboard.service.ts` still have live callers elsewhere, or
   reclassify and remove as dead code.
6. Correct `EVENTS.md:170` (already flagged in step 3 — confirm it's actually fixed, not just
   flagged).
7. Amend `docs/specs/posthog-implementation-plan.md:172`, which states verbatim "Never use a
   personal API key in application code" — #742 contradicts this standing doctrine; add the
   server-only exception explicitly rather than leaving the contradiction standing **[disc §3.6]**.
8. Record the four-coexisting-analytics-stacks reality (PostHog, Postgres pipeline, Contentsquare,
   Google Ads gtag — `front/src/app/layout.tsx:37-53`) and declare PostHog the sole source of truth
   for the edital in writing **[disc §3.6, §7]**.
9. Close `docs/EPIC-analytics-dashboard.md`'s open `event.logged` pendency with a pointer to #741
   (already implemented there in step 3) **[disc §3.6]**.
10. Correct `docs/handoff/en/05-deploy.md:164-166` if step 1's edit didn't already land it (cross-
    check, don't duplicate work).
11. Define "one full reporting cycle" in days for this issue's own gating condition — an open
    question discovery flags with no answer **[disc §4]**.

**Files to create/modify.**
- Delete: `back/.../analytics.controller.ts`.
- Modify or delete: `back/.../dashboard.controller.ts`.
- Modify: `front/src/lib/api/analytics.ts` (remove dead wrappers at `:73,80`).
- Modify: `EVENTS.md`, `docs/specs/posthog-implementation-plan.md:172`,
  `docs/handoff/en/05-deploy.md`, `docs/EPIC-analytics-dashboard.md`.

**Tests.**
- `/analytics/aggregated` and `/analytics/classes` return 404.
- `tsc --noEmit` passes with no orphan imports.
- `/metrics` still works and is served by `metrics.controller.ts` (if still live) — or is proven to
  have zero callers and is removed too.
- Full test suite (`npm run typecheck && npm run lint && npm test`) passes after every deletion.

**Done when.** `/analytics/aggregated` and `/analytics/classes` return 404; `tsc --noEmit` passes
with no orphan imports; `/metrics` still works and is served by `metrics.controller.ts`;
`analytics.service.ts`/`dashboard.service.ts` are confirmed to still have live callers or
reclassified as dead; `EVENTS.md:170` is corrected;
`docs/specs/posthog-implementation-plan.md:172` carries the server-only exception; the four-stack
reality and PostHog-as-source-of-truth are recorded; `docs/EPIC-analytics-dashboard.md`'s
`event.logged` pendency is closed with a pointer to #741 **[disc §8, step 11]**.

**Open questions carried in.** "One full reporting cycle" length in days must be defined by this
step, not assumed — discovery leaves it open **[disc §4]**.

---

## Verification, end to end

Reused verbatim from the discovery doc — one canonical E2E gate for both documents:

1. `npm run typecheck && npm run lint && npm test` at the root (turbo, both workspaces).
2. `make db-migrate` up and `migration:revert` down for each new migration.
3. Local: `/?utm_institution=escola-teste`, then three hard reloads — confirm in PostHog live
   events that `distinct_id` is stable, that `landing_page_viewed` arrives with the full property
   set, and that `anonymous_player_created` fired once.
4. A full playthrough, checking the 7 steps in order, then close the tab and confirm
   `session_finished` with a plausible `duration_seconds` — repeat on iOS Safari.
5. Rename the level-1 tilemap and confirm `critical_error_occurred{is_blocking:true}`.
6. `curl` the Query API probe from #743 in both environments.
7. Run Q1 by hand in PostHog's SQL editor and diff it against `/api/edital/summary`, `HeroMetric`
   and the CSV — all four must agree.
8. Log in as two institutions on different slugs and confirm isolation, then confirm the unlinked
   account produces zero upstream PostHog calls in the server log.
9. `grep -r "phx_" front/.next/static/` must return nothing.
10. Open the exported CSV in Excel pt-BR: intact accents, one value per column.
