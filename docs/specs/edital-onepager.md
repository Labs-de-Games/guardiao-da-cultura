# Onepager — Requisitos mínimos do Dashboard Institucional (edital)

**Status: interim.** The real onepager document was not found in the repository
(`grep -ril onepager` returns nothing) and was not otherwise available at the time this file was
committed. This file exists so the funnel definition — the artifact an auditor judges — is
versioned next to the code that computes it, instead of living only in a chat history.

**Action required:** replace the interim funnel list below with the source onepager's actual
wording as soon as it is available, and remove this status note.

## Funnel steps (interim — ASSUMPTION, not yet confirmed)

Derived from issue #741's own ordered acceptance list, internally consistent with #741 and #742.
**Must be confirmed in #739 before #742's Q4 is frozen.**

1. `landing_page_viewed`
2. `play_clicked`
3. `gameplay_started`
4. `chapter_1_started`
5. `quiz_started`
6. `quiz_completed`
7. `chapter_1_completed`

> **Superseded (issue #807):** the shipped funnel does not use this exact
> list. `chapter_1_started`/`chapter_1_completed` only ever covered
> level 1, so #807 replaced steps 4–7 with one dynamic `level_completed`
> step per level in `LEVEL_REGISTRY` (currently 3 levels, so 6 steps
> total today). See `EVENTS.md`'s "Funil canônico do edital" section and
> `front/src/lib/edital/server/queries.ts`'s `getFunnelSteps()` for the
> actual, current list. This section is left as-is below since it's the
> historical assumption this epic started from, not a description of
> what shipped.

## 8 cards, in order

Not derivable from repository evidence — the onepager's exact card list and order is the single
largest evidence gap noted in the discovery doc (§1). **Blocked** until the source document is
provided. Do not guess a card list here; #745 cannot be objectively marked done without it.

## `EDITAL_PERIOD_START`

**Mechanism landed (step 5); actual date still not recorded.** `front/src/lib/edital/server/period.ts`
reads `EDITAL_PERIOD_START` from the environment (`front/src/lib/env-server.ts`) as an ISO date
string (e.g. `2026-04-01`), and clamps every date range — `today`/`7d`/`30d`/`custom`'s `from`, and
`all-time`'s lower bound — to never resolve earlier than it. This is deliberately **config, not a
code constant**: the value can only be honestly known once issue #740 (identity foundation) has
actually deployed to production, since every event before that date is analytically unusable
(churned anonymous ids, no attribution, no reliable step 1).

**Until that deploy date is recorded, the variable stays unset, which means:**
- `today`/`7d`/`30d`/`custom` ranges are unclamped (no lower bound enforced).
- `all-time` falls back to the Unix epoch (`new Date(0)`) — the exact "full scan" risk this
  constant exists to prevent. **This is a known, live gap, not a hypothetical:** as long as
  `EDITAL_PERIOD_START` is unset in the deployed environment, an `all-time` request has no
  ClickHouse-side lower bound at all.

**Action required before production launch:** once #740 ships, record its actual deploy date as
`EDITAL_PERIOD_START` in the Coolify/`.env` runtime for both staging and production, and update this
section with that date and the rationale for it (e.g. "set to 2026-XX-XX, #740's deploy date, per
deploy log / release tag"). Do not guess or backdate this value — an honest "not set yet" is safer
than a wrong constant that silently mis-scopes every all-time query with no signal anything is
wrong.

## Attribution model

**Event property, not person property.** `person_profiles` is configured `identified_only`
(verified fact, discovery §3.1), which rules out person properties for anonymous players. Every
canonical event must therefore carry `campaign_source` (and related attribution fields) directly on
the event row. This decision is locked going into #741/#742 so the four query builders are not
rewritten after the fact.

---

## Spike #739 — technical questions

### (a) Is `windowFunnel` available in HogQL on this project?

**Blocked — not verifiable from this environment.** Answering requires running a query against the
actual PostHog project (personal `phx_` key, live account). No PostHog account access was available
during this pass. Action: run the query from discovery §6 ("Useful experiments") by hand in
PostHog's SQL editor and paste the output here, before #742's Q4 is written against a real
assumption.

Fallback if unavailable, recorded for reference: `uniqExactIf` + a clamp — proves "steps reached",
not "in order"; would change #745's screen-2 copy accordingly.

### (b) What are the Query API rate limits on the current plan?

**Blocked — not verifiable from this environment.** Requires the `curl` probe from #743 (step 1 of
the implementation plan) against the live PostHog account with the `phx_` key. Action: capture the
response headers/limits from that probe and record them here.

### (c) Does NextAuth v5 run on Next 16.2.9?

**Partially answered — package-level compatibility confirmed, live Edge/middleware test still
outstanding.**

- Repository's pinned Next.js version, verified in `package-lock.json:8857`: **16.2.9** (matches
  discovery §6's "front/package.json for the resolved Next version" instruction).
- `next-auth@5.0.0-beta.32` (npm registry, latest v5 beta at time of check) declares
  `peerDependencies.next: "^14.0.0-0 || ^15.0.0 || ^16.0.0"` — Next 16 is within its declared
  support range. This is real evidence the package **claims** compatibility; it is not proof that
  `auth()` works inside an Edge middleware bundle on this exact version, which discovery correctly
  calls out as the thing that actually needs testing.
- **Still required before treating (c) as fully answered:** stand up a throwaway NextAuth v5 route
  on a branch of this repo (or a minimal Next 16.2.9 reproduction) and confirm `auth()` resolves
  inside `middleware.ts` with an Edge-safe config split (`auth.config.ts` vs `auth.ts`, per
  discovery §5.5). Not done in this pass — no NextAuth dependency exists in the repo yet
  (`package-lock.json` confirms 0 hits for `next-auth`/`@auth/core`), so this is new work, not a
  regression check.
- **Fallback under consideration if the Edge/middleware test fails:** keep the existing magic-link
  service behind a `Credentials` provider instead of adding NextAuth v5 + OAuth — reuses a service
  that already does 64-byte tokens and SHA-256 at rest, adds no OAuth surface, and would make #747
  mostly redundant (discovery §6).

### (d) What is `EDITAL_PERIOD_START`?

See the dedicated section above — the mechanism (env-driven clamp in `period.ts`) landed in
implementation-plan step 5. The actual date value is still not recorded: it is circular with #740
and can only be set once #740's deploy date is known.

---

## Next steps to close this file out

1. Obtain the real onepager text and replace the interim funnel list and the missing 8-card list.
2. Run the `windowFunnel` query and the rate-limit probe against the live PostHog account; paste
   results into (a) and (b) above.
3. Stand up the throwaway NextAuth v5 + Next 16.2.9 middleware smoke test; record the verdict in
   (c) above.
4. Once all four are closed, remove this file's "interim" status note.
