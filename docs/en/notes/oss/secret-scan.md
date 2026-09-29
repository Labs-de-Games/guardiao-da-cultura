# Secret scan over the full history — T2 #798

This is the last remaining input to the history-rewrite decision for T2 of
the open-source epic (#796).

**Result: both scanners clean. No history rewrite is required.** The full commit
history publishes intact.

Re-run this scan immediately before the visibility flip; the record below only
covers commits that existed when it ran.

## When and what

- Date: 2026-09-22
- Branch scanned: `chore/oss-redact-hostname`, from `develop`
- Scope: `--all` refs, the complete history

## gitleaks

```
docker run --rm -v "$PWD:/repo" -w /repo zricethezav/gitleaks:latest \
  detect --source=/repo --log-opts="--all" --redact \
  --report-format=json --report-path=/repo/.gitleaks-report.json
```

2117 commits, 9.01 MB scanned. **18 findings, all false positives**, all under
the single `generic-api-key` heuristic rule:

| Finding | Location | Why it is not a secret |
|---|---|---|
| 9 × `key: "..."` | `front/src/game/data/LevelConfig.ts:361-393` | Phaser asset-registry keys. The rule fires on the literal token `key:`. |
| 8 × `MOUNTAINS_*_KEY = "..."` | `front/src/game/objects/Phase3Parallax.ts:5,6,309,310` (two commits) | Parallax texture keys. Same cause. |
| 1 × `accessToken: "eyJhbGciOiJIUzI1NiIs..."` | `back/src/modules/auth/controllers/auth.controller.ts:167` | A truncated placeholder inside an `@ApiOkResponse` Swagger example. Not a real token, and not decodable. |

## trufflehog

```
docker run --rm -v "$PWD:/repo" trufflesecurity/trufflehog:latest \
  git file:///repo --only-verified --json
```

13314 chunks, 9.73 MB, trufflehog v3.97.6.
**0 verified secrets, 0 unverified secrets.**

Note that `--entropy=true` is not a valid TruffleHog v3 flag, despite appearing
in some older guidance.

## Consequences

1. **No `git filter-repo`, no rewrite.** The rewrite in
   `AUDITORIA-ESPECIALISTA-OPEN-SOURCE.md` §3.2 runs unconditionally and must
   not be executed as written — it would invalidate every open branch and pull
   request for no security benefit.
2. **Nothing to rotate.** Rotation was conditional on a finding.
3. The earlier path-level scan already showed that no `.env`, keyfile, dump or
   credential file has ever been tracked. The content-level scan above closes
   the remaining gap, which a path scan cannot see: secrets inline in code, YAML
   or markdown.

## What the scanners do not cover

- Publishing the history makes every past pull request and issue body readable,
  and puts `docs/handoff/` into the public record. That is a disclosure
  question, not a credential one. `docs/handoff/` and `docs/screenshots/` are
  deleted at HEAD by #818; because no history rewrite is planned, both remain
  readable in old commits. That residual exposure is accepted — the directories
  hold squad process documentation, not credentials.
- The Coolify admin panel hostname was present at HEAD in five files, four of
  them inside `docs/handoff/`. Neither scanner flags a hostname. With that
  directory deleted, `docs/en/VERSIONING.md` is the only remaining occurrence, and
  it is redacted in the commit that carries this document. The hostname remains
  in history, which is low severity and does not on its own justify a rewrite.
