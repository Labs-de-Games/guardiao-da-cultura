# Epic #796 — Open-source "Guardião da Cultura"

## Context

`Labs-de-Games/gameplate` is a private repo holding a Lei Rouanet–funded educational game about Brazilian art and culture. Epic #796 asks to turn it into a public, reusable, documented open-source project so developers and educators can run, study, modify and reuse it. Five sub-tasks already exist: #797 (T1 licensing/scope), #798 (T2 repo prep), #799 (T3 reproducible local run), #800 (T4 docs), #801 (T5 publish).

The repo today declares `Private - All rights reserved`, carries 2024 commits / ~85 MiB of pack, ships 61 MB of assets, and contains squad-internal runbooks with an internal admin hostname. The work is therefore less "write code" and more "state what may be redistributed and on what terms, prove nothing sensitive leaks, make a cold-start install work, document it, flip visibility."

### Decisions locked with the user

| Topic | Decision |
|---|---|
| Code license | **MIT** (assets licensed separately) |
| Repo strategy | **Same repo**, full history preserved, cleaned before the visibility flip |
| Release scope | **Full game, all levels** (museu MVP, Teatro Amazonas, São João de Campina Grande) |
| Artwork reproductions | **Cleared by the PO** — may ship publicly. The binding condition is that **credits must always be given** when the assets are used. |
| Freesound `Sampling+` audio | **Ship as-is**, flagged per file in `ASSETS-LICENSE.md` as not MIT-compatible |
| `docs/handoff/` | **Redact and keep the engineering documents**; squad process and deploy runbooks leave the public tree |
| Security reporting | **GitHub private vulnerability reporting**, no public email address |
| TTS with no key | Fall back to the browser's **`SpeechSynthesis`**, not silence |
| Institutional trademarks | Logos stay; `NOTICE` states the marks are **not licensed** and forks must remove them |
| Repository name | **Out of scope for now** — repo stays `Labs-de-Games/gameplate` |
| Security responder | **The PO** ([@anacarla-42](https://github.com/anacarla-42)) follows the GitHub advisory notifications |
| Release validation | **The PO** ([@anacarla-42](https://github.com/anacarla-42)) performs the clean-room walkthrough and validates the publication |
| `daily-team-status.lock.yml` | Removed **at the moment the repo goes public**, not before |
| `EMAIL_FROM` | `guardiaodacultura@42.rio` |
| Release admin | **The whole team** holds the rights to tag `v1.0.0` and flip visibility — not restricted to one person |

### What the PO's clearance changes

The artwork reproductions in `front/public/assets/artworks/` (56 files, 6.7 MB — Abdias Nascimento, Claudia Andujar, Edgard de Souza, and others credited in `front/src/ui/credits/creditsData.ts`) ship as-is. There is no asset-driven history rewrite, no placeholder-substitution build, and no blocking gate ahead of the visibility flip.

It converts the epic's hardest problem from a *rights* problem into an *attribution-durability* problem: the obligation travels with the assets, so anyone who forks, extracts, or reuses them must still credit the authors. That obligation has to be stated where a reuser will actually hit it, and it must be impossible to satisfy the code license while silently dropping the credits. Three consequences run through the plan below:

1. `LICENSE` (MIT) must explicitly *not* cover `front/public/assets/**`, so nobody infers MIT's "do anything, keep this one notice" terms apply to the artworks.
2. `ASSETS-LICENSE.md` carries attribution as a stated condition of use, per asset group.
3. `CREDITS.md` and the in-game credits screen (`creditsData.ts`) must not drift apart — they are the same obligation rendered twice.

---

## Task shape: definition vs. implementation

| Task | Nature | Branch |
|---|---|---|
| T1 #797 — scope & licensing | Decision + inventory artifact | none (doc + issue comments) |
| T2 #798 — repo hardening | Investigation + implementation | `chore/oss-repo-prep` |
| T3 #799 — reproducible local run | Verification + targeted fixes | `fix/oss-local-run` |
| T4 #800 — documentation | Implementation | `docs/oss-documentation` |
| T5 #801 — publish & validate | Ops: tag, flip visibility, validate | none |

**Recommendation on breaking down further: T1–T5 as they stand are enough.** Before the PO's clearance this was not true — #798 bundled a blocking history-rewrite decision with ordinary hardening work, and a contingency task was needed for the placeholder build. Both disappear with the artworks cleared. What remains in #798 is a single coherent unit of work, and every task now has one owner and one risk profile. Adding structure at this point would cost more coordination than it buys.

---

## T1 #797 — Define scope and licensing *(no branch)*

`creditsData.ts` is already ~90% of the required inventory (29 entries across 13 sections, several carrying license strings). Convert it into a decision matrix rather than starting from scratch.

**Build `docs/oss/asset-matrix.md`** — one row per asset group: path, credited author, source URL, declared license, redistribution verdict, attribution text required, evidence location.

Verdicts by tier:

- **Artwork reproductions** (`assets/artworks/`) — redistribute, **attribution mandatory**, per the PO's clearance. Each work listed individually by author and title, matching the "Obras de Arte" section of the credits screen.
- **Music and SFX** — mixed and needs per-file rows, not a blanket statement:
  - CC-BY (Guifrog `Attribution 3.0`, Kevin MacLeod `CC BY 4.0`, Moulaythami `CC BY 4.0` — `sound/music/level_3_cricket.ogg`, ["Cricket Ambience, Remix, A"](https://freesound.org/people/Moulaythami/sounds/536930/)) — attribution mandatory.
  - CC0 tracks — unrestricted, no obligation. Includes the two Kenney packs: [Interface Sounds](https://kenney.nl/assets/interface-sounds) (`sound/sfx/switch.ogg`) and [UI Audio](https://kenney.nl/assets/ui-audio) (`sound/sfx/light_bar_fix.ogg`).
  - Freesound `Sampling+` — noncommercial-leaning and **not** MIT-compatible. **Decided: ship as-is**, with per-file rows in `ASSETS-LICENSE.md` stating the Sampling+ terms so a commercial reuser is warned before reusing them.
- **Sprites from itch.io** — per-asset license; follow the #786 rat-sprite credit pattern for each. Confirmed so far: Carysaurus rat sprites, and Jan Schneider's [Color Switches](https://jan-schneider.itch.io/color-switches) (`misc/switch_light.png`) under **CC BY 4.0** — the author's terms are personal and commercial use provided credit is given, so attribution is mandatory.
- **ResponsiveVoice** — CC BY-NC-ND 4.0, NonCommercial, requires a paid key. See the T3 defect below; it should become optional rather than required.
- **Trademarks** — Governo Federal, Lei Rouanet, Ministério da Cultura, Galp, Bemobi, 42 Rio. Authorized for *this* project only, never for forks; not covered by the artwork clearance. **Decided: the logos stay in the public tree, and `NOTICE` carries an explicit clause stating the marks are not licensed for reuse and that a fork must remove them.**

**Licensing layout** (adopt the REUSE convention so the code/asset split is machine-checkable):

```
LICENSE                  MIT, code only
LICENSES/MIT.txt
LICENSES/CC-BY-4.0.txt
LICENSES/CC0-1.0.txt
ASSETS-LICENSE.md        per-asset terms and attribution conditions
CREDITS.md               human-facing, mirrors the in-game credits screen
NOTICE                   trademark carve-out for the institutional logos
```

`LICENSE` must state plainly that it covers source code only and that `front/public/assets/**` is governed by `ASSETS-LICENSE.md`.

Also set `"license": "MIT"` in the three `package.json` files, and rename the root package from its leftover template name `template-clone` to `guardiao-da-cultura`. The **repository** itself is not renamed — `Labs-de-Games/gameplate` stays as the public URL; revisit after publication if desired.

Four assets added during level 3 development were uncredited until now and are already reflected in `creditsData.ts`; they carry into `CREDITS.md` and `ASSETS-LICENSE.md` unchanged:

| Asset | Source | License | Credits section |
|---|---|---|---|
| `sound/music/level_3_cricket.ogg` | [Moulaythami — Cricket Ambience, Remix, A](https://freesound.org/people/Moulaythami/sounds/536930/) | CC BY 4.0 — attribution mandatory | Músicas |
| `sound/sfx/switch.ogg` | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | CC0 — no obligation | Efeitos Sonoros |
| `sound/sfx/light_bar_fix.ogg` | [Kenney — UI Audio](https://kenney.nl/assets/ui-audio) | CC0 — no obligation | Efeitos Sonoros |
| `misc/switch_light.png` | [Jan Schneider — Color Switches](https://jan-schneider.itch.io/color-switches) | CC BY 4.0 — attribution mandatory | Ícones |

Treat this as evidence that the inventory drifts as levels ship: T1 should sweep `front/public/assets/` against `creditsData.ts` for anything else added since the credits list was last touched, rather than trusting the list to be complete.

**Deliverables:** `docs/oss/asset-matrix.md`, the MIT decision recorded on #797, verdicts handed to T2/T4.

---

## T2 #798 — Repo hardening *(branch `chore/oss-repo-prep`)*

### Secret audit (do this first — it is the only remaining input to the history question)

Already verified by path scan: **no `.env`, keyfile, dump, or credential file has ever been tracked.** `git log --all --diff-filter=A` across all 2024 commits returns nothing matching. That eliminates the worst class of risk, but a path scan cannot see secrets inline in code, YAML or markdown.

1. Run a content-level scan over the full history — `gitleaks detect --log-opts="--all"` (not installed locally; use the Docker image), and `trufflehog git file://. --only-verified` as a second opinion.
2. Any live credential found: **rotate first**, then decide on history treatment. Rotation is mandatory whether or not the blob is rewritten — assume anything ever committed is compromised.
3. With the artworks cleared, a clean scan means **no history rewrite at all** and the full 2024-commit history publishes intact.
4. Separately, note that publishing history makes every past PR and issue body readable, and puts `docs/handoff/` into the public record.

### Internal infrastructure disclosure — confirmed, must be fixed

The Coolify admin panel hostname `coolify.guardiaodacultura.42.rio` appears in `docs/VERSIONING.md:51` and repeatedly in `docs/handoff/05-deploy.md` (lines 11, 199–218 also enumerate the secret names held there). No secret values leak, but publishing an internal admin panel hostname hands over attack surface for free. Redact from HEAD; a hostname in history is low severity and does not on its own justify a rewrite.

### `docs/handoff/` decision

Nine squad-internal documents (30-minute onboarding, board process, deploy runbook, communication rules, team rules). **Decided: keep the genuinely useful engineering documents after redacting the Coolify hostname; move squad process and deploy runbooks out of the public tree.** T2 lists which document falls on which side before moving anything.

Accepted consequence: because the full history publishes, every one of these documents stays readable in old commits regardless of what HEAD carries. The redaction reduces what a casual reader finds, not what a determined one can recover.

### CI hardening

Three workflows need attention before fork PRs can arrive:

- `.github/workflows/ci.yml` — already safe: no secrets, plain `pull_request` trigger, runs typecheck/lint/build/test. Keep as the contributor-facing gate.
- `cd-staging.yml` / `cd-production.yml` — hold `COOLIFY_TOKEN` and `COOLIFY_WEBHOOK_URL_*`. Add `if: github.repository == 'Labs-de-Games/gameplate'` and confirm neither uses `pull_request_target`, so a fork PR can never reach deploy.
- `daily-team-status.lock.yml` — 81 KB agentic workflow holding `OPENAI_API_KEY`, `CODEX_API_KEY`, `GH_AW_*`. Squad-internal automation with a large credential surface and no value to external contributors. **Decided: removed, but only at the moment the repo goes public** — the squad keeps the daily report running until then, so the deletion commit lands in T5 immediately before the visibility flip, not in T2. T2 only prepares the change.

Enable "Require approval for all outside collaborators" on Actions once public.

### `.env.example`

Already in reasonable shape — placeholder values throughout, `EMAIL_PROVIDER=mock`, `JWT_SECRET=change-me-in-production`. Needs only: comments marking ResponsiveVoice and PostHog as optional once T3 lands, and `EMAIL_FROM` set to `guardiaodacultura@42.rio`.

Then apply T1's outputs: add the license, credit and notice files to the tree.

---

## T3 #799 — Reproducible local run *(branch `fix/oss-local-run`)*

Good news on two of the three integrations — less work than the issue implies:

- **PostHog is already optional.** `front/src/lib/env.ts:7` declares `posthogKey` as `z.string().optional()`, and `front/src/lib/posthogStub.ts` provides a console-logging no-op wired through `PostHogProvider.tsx`. Needs verification with an empty key, not implementation.
- **Magic-link auth already works offline.** `EMAIL_PROVIDER=mock` logs the link to the console. Needs a documented walkthrough in T4.

**Real defect found — ResponsiveVoice is a hard requirement and will break cold-start installs.** `front/src/lib/env-server.ts:5` declares `responsivevoiceApiKey: z.string().min(1)`, so `front/src/app/api/tts/synthesize/route.ts:39` throws a zod parse error for any contributor without a key. Compounding it, ResponsiveVoice is CC BY-NC-ND (NonCommercial) and paid — an MIT-licensed game must not hard-depend on it. Fix: make the key optional, and when absent have `/api/tts/synthesize` degrade gracefully — return a documented "TTS unavailable" response and have the caller fall back to the browser's built-in `SpeechSynthesis`. **Decided: browser `SpeechSynthesis` is the fallback**, not silence, so a cold-start install still has audible narration. This is the single highest-value code change in the epic.

Remaining T3 work:

- Seed/fixture data so a fresh database reaches playable state. **Verified: badges alone suffice.** The only content-bearing seed is `1777927558353-SeedBadges.ts`; the DB tables are `user`, `user_progress`, `user_badge`, `badge` and `game_event` — all player state. Level content is static JSON under `front/public/assets/data/levels/level_0{1..5}/` (`quizzes.json`, `npcs.json`, `works.json`, `collectibles.json`, `intermediate-quizzes.json`), so `make db-migrate` is enough to reach a playable state.
- Validate the documented path end to end on a clean machine: `make setup` → `make development-up` → `make db-migrate` → play. Existing Makefile targets are the ones to verify, not replace.
- Record duration, every error hit, and every fix.

Acceptance requires the walkthrough be done by **someone other than the person who prepared the setup** — **the PO ([@anacarla-42](https://github.com/anacarla-42)) performs it** — with screenshots or video attached to #799.

---

## T4 #800 — Documentation *(branch `docs/oss-documentation`)*

Attribution durability is largely a documentation problem, so this task carries more of the PO's condition than its issue text suggests.

- `README.md` — retitle from the `Gameplate` placeholder to **Guardião da Cultura**, drop the "placeholder name" note, replace `## License → Private - All rights reserved` with the MIT-plus-separate-assets statement, and state the attribution requirement prominently rather than burying it in a linked file. Add purpose, feature list, known limitations, and an optional-integrations section (PostHog, ResponsiveVoice).
- `docs/CONTRIBUTING.md` (343 lines, currently squad-facing: "internal development workflow for team members") — rewrite for external contributors: issue reporting, fork-and-branch flow, the `commitlint` conventional-commit requirement, what CI runs, review expectations. Redact the Coolify deploy sections into a maintainer-only note. Carry a maintainer/ownership statement naming **[@anacarla-42](https://github.com/anacarla-42)** so contributors know who reviews and merges; mirror the same line in `README.md`.
- `docs/ARCHITECTURE.md` — verify it matches the real tree; the epic explicitly flags drift between docs and reality.
- New `SECURITY.md` — **GitHub private vulnerability reporting** (enable it on the repo before the flip; no email address exposed), naming **[@anacarla-42](https://github.com/anacarla-42)** as the responder. Enabling the setting is what makes the mention resolve to a working channel, so it must be done before the flip rather than after.
- New reuse guide covering where level and narrative content lives (`front/public/assets/data/levels/`, `front/src/game/data/LevelConfig.ts`) and how to adapt it — this is what makes the project actually reusable by educators, and it is the natural place to restate that adapted versions must keep the credits.
- Wire in `CREDITS.md` / `ASSETS-LICENSE.md` from T1, reusing the #786 itch.io credit pattern, and note in `creditsData.ts` that it and `CREDITS.md` must be updated together.

Drafting can start immediately; only the verified command list from T3 blocks completion.

---

## T5 #801 — Publish and validate *(no branch)*

1. Confirm T1–T4 closed.
2. Rotate any credential the T2 scan flagged; run the history rewrite **only** if the scan found something, and do it while the repo is still private (a rewrite after going public breaks every clone and fork). A clean scan means no rewrite.
3. Remove `.github/workflows/daily-team-status.lock.yml` — this is the last commit before the flip, so the squad keeps the daily report until the final moment.
4. Tag the candidate commit (`v1.0.0`, per `docs/VERSIONING.md`). Any team member can do this — the rights are shared, so agree beforehand who performs the run so nobody tags twice.
5. Flip repository visibility to public and enable GitHub private vulnerability reporting in the same pass. Same shared rights, same coordination.
6. Verify while logged out: repo, `LICENSE`, `ASSETS-LICENSE.md`, `CREDITS.md`, `NOTICE`, `README`, and the release page all load.
7. Clean-room install from the public tag, validated by **[@anacarla-42](https://github.com/anacarla-42)**; play entry → exploration → quiz → result on the reference level.
8. Post release links and evidence on #796; file non-critical findings as new issues.

---

## Verification

- **Licensing:** every path under `front/public/assets/` maps to a row in `asset-matrix.md` with a verdict and its required attribution text; `LICENSE` and `ASSETS-LICENSE.md` do not contradict each other on what MIT covers.
- **Attribution parity:** every entry in `creditsData.ts` appears in `CREDITS.md` and vice versa.
- **Secrets:** `gitleaks` and `trufflehog` both clean over `--all`; a logged-out browse of the public repo surfaces no internal hostname.
- **CI:** open a PR from a fork of a scratch mirror and confirm `ci.yml` runs while both `cd-*` workflows skip.
- **Cold start:** on a clean machine with no `.env` beyond `.env.example`, `git clone` → `cp .env.example .env` → `make setup` → `make development-up` → `make db-migrate` → register via the console-logged magic link → complete the reference level's quiz → score persists.
- **Degradation:** with `RESPONSIVEVOICE_API_KEY` and `NEXT_PUBLIC_POSTHOG_KEY` both empty, the full flow completes with no unhandled error.
- **Build gates:** `npm run typecheck && npm run lint && npm run build && npm run test` green, matching `ci.yml`.

---

## Immediate next steps

1. Draft `docs/oss/asset-matrix.md` from `creditsData.ts`.
2. Run the `gitleaks` / `trufflehog` history scan — it is the last input to the no-rewrite decision.
3. Start the ResponsiveVoice optionality fix; it blocks every clean-room install test in T3 and T5.
