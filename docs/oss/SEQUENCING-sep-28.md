# Sequencing Epic #796 around the Sep 28 development deadline

Companion to [`PLAN-open-source.md`](./PLAN-open-source.md). That document defines *what* the open-source work is; this one defines *when* each part may land, given that feature development on "Guardião da Cultura" continues until **28 September 2026**.

Neither `PLAN-open-source.md` nor [`AUDITORIA-triagem.md`](./AUDITORIA-triagem.md) is modified by this document.

## The constraint

Until Sep 28 the squad must keep doing one thing without disruption: create branches, commit, push, pull, open pull requests, pass CI, and deploy to Coolify through CD.

That is a narrow protected surface. Only four things can break it:

1. **Git history and refs** — anything that rewrites commits invalidates every existing branch and pull request.
2. **`.github/workflows/*`** — `ci.yml` gates every PR; `cd-staging.yml` deploys to Coolify on every push to `develop`; `cd-production.yml` is the manual production trigger.
3. **Commit tooling** — `.husky/*` and the commitlint configuration sit between a developer and a commit.
4. **Repository settings that gate merges** — branch protection, required checks, visibility.

Everything else in the epic — licences, credits, README, `docs/handoff/`, the ResponsiveVoice fix, the security backlog in `AUDITORIA-triagem.md` — touches none of those four and can land immediately.

Current state at the time of writing: 54 remote branches, three open pull requests (#810 edital dashboard, #803 level 3 memory-sequence minigame, #718 OWASP + SonarQube in CI), and the last twenty commits confined to `front/src` and `front/public`.

---

## Blocked until after Sep 28

| Action | Which surface it breaks |
|---|---|
| **Any `git filter-repo` or history rewrite** | Git refs. All 54 remote branches and the three open PRs would need a forced re-fetch, and the PRs would show phantom diffs or need reopening. `PLAN-open-source.md:111,116` already says no rewrite unless the secret scan finds a live credential, but `AUDITORIA-ESPECIALISTA-OPEN-SOURCE.md` §3.2 runs `filter-repo` **unconditionally**. That script must not be executed as written. |
| **Editing `cd-staging.yml` or `cd-production.yml`** | Continuous deployment to Coolify. `cd-staging.yml:4-6` fires on every push to `develop`, so a mistake in the `if: github.repository == 'Labs-de-Games/gameplate'` guard would stop staging deploys silently. This also covers pinning those workflows' actions by SHA (triagem 2.5) and moving `COOLIFY_TOKEN` into a GitHub Environment (triagem 2.6) — an Environment approval rule alone turns every deploy into a manual gate. |
| **Editing `ci.yml`** | Pull request merges. A blocking secret-scanning step (triagem 2.9) means one false positive blocks the final week's merges, and it collides with PR #718, which is already adding OWASP Dependency-Check and SonarQube to the same pipeline. SHA pinning here is lower risk but still buys nothing this week. |
| **Repository visibility flip and the launch tag** | Everything. `docs/VERSIONING.md:57-60` requires a `release/vX.Y.Z` branch with a code freeze, and `:9-15` allows a major release only on Thursday between 1pm and 3pm — before Sep 28 that is Thursday Sep 24 only, a freeze four days before the deadline. |

The same rule covers `.husky/*` and the commitlint configuration (`docs/CONTRIBUTING.md:139-177,259-273`), and any change to branch protection or required checks. Documenting that workflow in `CONTRIBUTING.md` is fine; changing the tooling itself is not.

These items should be prepared as branches now and merged after Sep 28.

## Clear to land before Sep 28

| Action | Note |
|---|---|
| All of T1 #797 — `docs/oss/asset-matrix.md`, `LICENSE`, `LICENSES/*`, `ASSETS-LICENSE.md`, `CREDITS.md`, `NOTICE` | New files; nothing in the build reads them |
| Root `package.json` rename and `"license": "MIT"` | Verified nil blast radius: `Makefile:8` hardcodes `PROJECT_NAME = gameplate`, Docker Compose derives its project name from the directory basename, all image tags are literals (`cd-staging.yml:11-12`), and turbo filters resolve the `front`/`back` **workspace** names. Only four occurrences of `template-clone` exist repo-wide, two of them in `package-lock.json` |
| Coolify hostname redaction at HEAD | Five tracked lines: `docs/VERSIONING.md:51`, `docs/handoff/05-deploy.md:11`, `docs/handoff/en/05-deploy.md:11`, `docs/handoff/08-referencia-rapida.md:62`, `docs/handoff/en/08-quick-reference.md:55` |
| `gitleaks` and `trufflehog` history scan | Read-only, and the last remaining input to the no-rewrite decision |
| Splitting `docs/handoff/` | Documentation only. Note that `PLAN-open-source.md:120` says "nine documents"; it is actually 10 Portuguese files, a 1:1 English mirror in `en/`, and `assets/img/` holding 10 screenshots of the private Kanban board, Actions runs and internal issues, which need reviewing one by one (triagem 6.4) |
| All T4 #800 documentation | `README.md`, `SECURITY.md`, `docs/CONTRIBUTING.md`, `docs/ARCHITECTURE.md`, the content-reuse guide |
| T3 ResponsiveVoice optionality | Four to six files, none of them on the level 3 development path |
| `.env.example` — `EMAIL_FROM`, optional-key comments | Example file only; no developer's existing `.env` changes |
| Removing the `daily-team-status` workflow set | No effect on git, CI or CD. `PLAN-open-source.md:130` defers it to T5 so the squad keeps the daily report, and the compiled workflow's own `stop_time` is 2026-10-05, so it expires a week after the deadline regardless |
| Triagem security backlog — global `ThrottlerGuard`, magic-link TOCTOU, development Postgres bind, nginx CSP and HSTS | Runtime behaviour, not the pipeline. One caution: the CSP proposed in `AUDITORIA` §4.4 omits `NEXT_PUBLIC_API_URL` from `connect-src`, so with the backend on a separate Coolify host every API call would fail in the deployed application. Fix the directive or defer that single item |

---

## Two defects in the original plan

Both are independent of the deadline and should be corrected in `PLAN-open-source.md` when it is next revised.

**The launch tag is wrong.** `PLAN-open-source.md:27,181` prescribes `v1.0.0`. The repository already ships `v1.2.0` through `v1.13.0`; `docs/VERSIONING.md:42` uses `v1.0.0` only as a *format example*. Tagging `v1.0.0` would create a tag below every existing tag in SemVer order and break the continuity the squad reads in `docs/CHANGELOG.md`. **The launch tag is `v1.14.0`.**

**The browser speech fallback already exists.** `PLAN-open-source.md:149` calls it "the single highest-value code change in the epic", but `front/src/lib/audio/AudioAccessibilityService.ts:82-106` already implements `speakNative()` — `pt-BR` voice selection, volume synchronisation, ducking of the game audio, and deduplication of concurrent utterances by request id — wired in at `:150-155` (audio element error) and `:160-164` (the fetch chain's catch). A missing API key today produces a 500 that trips the throw at `:129` and lands in that catch, so narration already degrades to the browser voice. The remaining work is making that path intentional and quiet — no 500, no console error, no wasted round trip per utterance — not building the fallback.

---

## Order of work before Sep 28

All of this lands on `develop` through normal pull requests. Every merge to `develop` triggers a staging deploy (`cd-staging.yml:4-6`); for the documentation-only pull requests that deploy is a no-op, which is exactly what makes them safe.

### Step 1 — T1 #797 licensing (documentation-only PR)

Build `docs/oss/asset-matrix.md` from `front/src/ui/credits/creditsData.ts` (29 entries across 13 sections), then sweep `front/public/assets/` for anything the credits list is missing. Write `LICENSE` (MIT, explicitly excluding `front/public/assets/**`), `LICENSES/MIT.txt`, `LICENSES/CC-BY-4.0.txt`, `LICENSES/CC0-1.0.txt`, `ASSETS-LICENSE.md`, `CREDITS.md` and `NOTICE`.

Keep the attribution-mandatory wording from the plan. Do not adopt the prohibitive clause in `AUDITORIA` §6.1 — it reverses the PO's clearance and defeats the epic's purpose, as recorded in `AUDITORIA-triagem.md:140-150`. The scope of the clearance and the final wording of `ASSETS-LICENSE.md` are the PO's decision.

### Step 2 — package metadata (one PR)

Rename the root package from `template-clone` to `guardiao-da-cultura` (`package.json:2`) and add `"license": "MIT"` to all three package.json files. Run `npm install --package-lock-only` and commit `package-lock.json` in the same commit, so the rename does not resurface later as a stray diff in an unrelated pull request. Expect one cold turbo rebuild, since `turbo.json:4-12` hashes package.json contents. The `.husky/pre-commit` hook routes `*.json` through `biome check --write`; matching the existing two-space formatting makes that a no-op.

### Step 3 — hostname redaction and secret scan

Redact the five tracked Coolify lines listed above. Run `gitleaks detect --log-opts="--all"` (via the Docker image; it is not installed locally) and `trufflehog git file://. --only-verified` as a second opinion. Note that `--entropy=true` is not a valid TruffleHog v3 flag.

If either tool finds a live credential, rotate it immediately and record the finding — but still do not rewrite history before Sep 28. Rotation is what closes the exposure; the rewrite is cosmetic by comparison and would cost the team every branch it has in flight.

### Step 4 — T3 ResponsiveVoice optionality (one PR)

- `front/src/lib/env-server.ts:5` — change `z.string().min(1)` to `.optional()`, mirroring the PostHog pattern at `front/src/lib/env.ts:7`.
- `front/src/app/api/tts/synthesize/route.ts:37-48` — return a documented "TTS unavailable" response before building the upstream parameters when no key is present, and wrap the `fetch` at `:48` in try/catch with an `AbortSignal` timeout (triagem 2.7).
- `front/src/app/api/tts/synthesize/route.test.ts:19-28` — the mock currently hardcodes a key, so the suite passes while real cold-start installs return 500. Add a no-key variant.
- `front/src/lib/audio/AudioAccessibilityService.ts:125-133` — treat the unavailable response as expected and fall through to `speakNative` without the `console.error`.
- `.env.example:20` — mark `RESPONSIVEVOICE_API_KEY` as optional.

Do not apply the 250-character cap or the sanitisation regex from `AUDITORIA` §4.1. The current limit is 5000 characters, and the regex rejects newlines and drops the `voice`, `rate` and `pitch` fields that the client sends at `AudioAccessibilityService.ts:117-122`.

### Step 5 — T4 #800 documentation (one PR)

Retitle `README.md` to "Guardião da Cultura", replace the private-rights licence section with the MIT-plus-separate-assets statement, and state the attribution requirement inline rather than only linking to it. Add `SECURITY.md` naming [@anacarla-42](https://github.com/anacarla-42) as the responder for GitHub private vulnerability reporting.

Rewrite `docs/CONTRIBUTING.md` for external contributors, and while there fix `:108` and `:182`, which still instruct contributors to branch from and open pull requests against `master`. Both the handoff guide (`docs/handoff/03-fazer-uma-mudanca.md:5-10,41-44`) and the actual git history say `develop`; `master` receives release pull requests only. Correct the unsupported "strict LGPD compliance" claim at `docs/ARCHITECTURE.md:50`, which would otherwise become a public assertion the code does not support (triagem 2.11). Add the content-reuse guide covering `front/public/assets/data/levels/` and `front/src/game/data/LevelConfig.ts`.

### Step 6 — optional this week

Splitting `docs/handoff/` and working the triagem security backlog are both safe but neither is urgent. If the handoff split is done now, review `docs/handoff/assets/img/` image by image before deciding what stays in the public tree.

### Prepared but not merged

The `if: github.repository == 'Labs-de-Games/gameplate'` guard for both `cd-*` workflows; the CI secret-scanning gate; action SHA pinning; and removal of the `daily-team-status` set — which is `daily-team-status.lock.yml` plus its source `daily-team-status.md`, the `shared/mood.md` import stub, and `.github/aw/`. `PLAN-open-source.md:130,180` names only the lock file.

## After Sep 28

Merge the prepared workflow pull requests one at a time, confirming a staging deploy still fires after each. Then perform the T5 run: tag `v1.14.0`, flip repository visibility, enable GitHub private vulnerability reporting, enable "Require approval for all outside collaborators" on Actions, and have the PO run the clean-room validation.

---

## Verification

The bar is that the squad's loop keeps working, so check it directly:

- After each merge to `develop`, `cd-staging.yml` completes and Coolify serves the new build.
- A throwaway pull request runs `ci.yml` and passes unchanged.
- `git fetch && git pull` on an existing feature branch produces no rebase or force-push prompt.
- A commit through `.husky/commit-msg` still passes commitlint.

Then the change-specific checks:

- `npm run typecheck && npm run lint && npm run build && npm run test` all green, matching `ci.yml:24-34`.
- After the package rename, `make development-up` brings the containers up under the same `gameplate_*` volume names, and `docker images | grep gameplate` still matches (`Makefile:179-180`).
- With `RESPONSIVEVOICE_API_KEY` unset, `/api/tts/synthesize` returns the documented unavailable response rather than a 500, and the speak icon in `DialoguePanel`, `LabelPanel` and `Quiz` still produces audible `pt-BR` narration with no console error.
- Every entry in `creditsData.ts` appears in `CREDITS.md` and vice versa, and every path under `front/public/assets/` maps to a row in `asset-matrix.md`.
- `gitleaks` and `trufflehog` both clean over `--all`.
