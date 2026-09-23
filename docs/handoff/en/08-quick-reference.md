# Quick reference

## Command index

```bash
make up                    # Docker, everything
make local-all             # native, Turborepo
make down
make logs
make check                 # lint and test
make lint
make test
npm run lint:fix
npm run typecheck
make db-migrate
make db-migrate-generate NAME=Name
make clean                 # reset containers and volumes
make deep-clean            # reset everything
make sync                  # reinstall node_modules
make help
```

```bash
git checkout develop && git pull
git fetch origin && git rebase origin/develop

gh pr create --base develop
gh workflow run cd-production.yml --ref master
gh issue list --search "<term>" --state all --repo Labs-de-Games/gameplate
gh auth refresh -s read:project -s project
```

## Diagnostic table

| Symptom | Cause |
|---|---|
| CI did not run | PR is a draft |
| CI failed immediately | Typecheck. Run `npm run typecheck` |
| Board card did not move | Missing `Closes #N` in the PR body |
| Change absent from staging | The PR did not land in `develop` yet |
| Change absent from production | The release PR has not merged, or nobody ran CD Production |
| Env var had no effect | It is `NEXT_PUBLIC_`, baked at build time, rebuild the image |
| Text to speech broken in staging or production | `RESPONSIVEVOICE_API_KEY` exists only in Coolify runtime |
| Level data bleeding between levels | Phaser cache key not namespaced by `levelId` |
| NestJS DI failing after a refactor | An import was converted to `import type` |
| Docker build fails | Build context must be the monorepo root |

## Links

| What | Where |
|---|---|
| Repository | https://github.com/Labs-de-Games/gameplate |
| Board | https://github.com/orgs/Labs-de-Games/projects/1 |
| Actions | https://github.com/Labs-de-Games/gameplate/actions |
| Coolify | http://coolify.guardiaodacultura.42.rio/ |

## Versioned AI skills

Five skills live in `.agents/skills/`, pinned by hash in `skills-lock.json`:
`git-commit`, `nestjs-best-practices`, `next-best-practices`, `phaser-gamedev`
and `vercel-react-best-practices`.

The `.agents/skills/` choice follows the AGENTS.md convention, which is tool
agnostic.

Do not edit skill files. They are third party code. Put project specific rules
in `AGENTS.md`, which takes precedence.

Precedence order: nearest `AGENTS.md`, then `docs/CONTRIBUTING.md` and
`docs/ARCHITECTURE.md`, then skills.

`.github/workflows/daily-team-status.md` is an agentic workflow compiled by
`gh-aw`. It runs weekdays at 13:00 UTC, has read only permissions plus a
constrained `create-issue` output, and stops automatically four months after
creation.
