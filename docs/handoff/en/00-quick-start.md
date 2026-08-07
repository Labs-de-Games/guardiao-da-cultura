# Quick start

Clone to first Pull Request. Each block ends with a check. If the check fails,
fix it before continuing.

Requires Node 24 or later, Docker, Git and the `gh` CLI.

## 1. Understand the split

**Labs de Games** is the project. Its code lives in the `gameplate`
repository, a monorepo with two npm workspaces orchestrated by Turborepo.

| Path | Role | Stack |
|---|---|---|
| `front/` | Game and site | Next.js, React, Phaser 3 |
| `back/` | API and persistence | NestJS, TypeORM, PostgreSQL |

They communicate over HTTP only. There is no shared package.

Game logic runs client side. The backend handles persistence, analytics
aggregation and validation of state that cannot be trusted to the client. Put
new game mechanics in `front/src/game/`.

**Check:** you can state which side owns game logic.

## 2. Run it

```bash
git clone git@github.com:Labs-de-Games/gameplate.git
cd gameplate
npm ci
cp .env.example .env
make up
make db-migrate
```

Defaults in `.env.example` work for local development. No real secrets needed.

| Service | URL |
|---|---|
| Game | http://localhost:3000 |
| API | http://localhost:3001 |
| Database | localhost:5432 |

Recovery ladder when something breaks:

```bash
make clean && make up
make deep-clean && make up
make sync
```

**Check:** the game loads at http://localhost:3000.

## 3. Branch, commit, push

There are two permanent branches. **`develop` is where work integrates.**
`master` holds what is in production.

```bash
git checkout develop && git pull
git checkout -b fix/123-short-description
make check
git commit -m "fix(front): correct map marker ordering"
```

Branch pattern: `<type>/<issue-id>-<description>`.

Rebase onto `develop` before requesting review, since other PRs land while
yours is open:

```bash
git fetch origin && git rebase origin/develop
```

Commit format is Conventional Commits, enforced by a `commit-msg` hook.
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
Scopes: `front`, `back`, `infra`, `docs`, `ci`.
Description in English, lowercase, imperative, no trailing period.

**Check:** `make check` passes locally.

## 4. Open the PR

Target `develop`. CI does not run on draft PRs. Mark ready for review to
trigger it.

Required in the body:

1. A `## Why` section explaining the problem that existed before.
2. `Closes #N`. Board automations depend on this.
3. Video or before and after screenshots if the change is visual.

CI runs four sequential steps: typecheck, lint, build, test. A failure in the
first stops the rest.

**Check:** CI is green and the linked issue card moved to `In Code Review`
without manual action.

## 5. Know the deploy path

| Environment | Trigger |
|---|---|
| Local | `make up` |
| Staging | every merge into `develop`, automatic |
| Production | manual, Run workflow on CD Production |

Work accumulates in `develop`. Every merged PR is a push to `develop`, and every
push to `develop` deploys staging.

To ship, a release PR merges all of `develop` into `master`, titled
`release: merge develop into master (vX.Y.Z)`. Then someone opens the Actions
tab, picks the **CD Production** workflow and clicks **Run workflow** against
`master`.

```bash
gh workflow run cd-production.yml --ref master
```

That workflow builds the images, pushes them to GHCR and calls Coolify.

Release windows: Monday 13:00 to 15:00, Tuesday and Thursday 13:00 to 19:00.
Never Friday, never the day before a holiday.

Rollback trigger: error rate above 5 percent, total outage without fast
diagnosis, or critical flow failure.

**Check:** you can name the two steps between your PR being merged and the
change reaching production. They are the release PR and the manual dispatch.
