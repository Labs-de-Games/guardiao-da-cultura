# Contributing to Guardião da Cultura

Contributions are welcome — bug reports, fixes, new level content, translations,
accessibility improvements.

This guide is for anyone working on the project, whether or not you are on the
core team. [@anacarla-42](https://github.com/anacarla-42) maintains the
repository and reviews and merges pull requests.

For AI agent collaboration guidelines, see [AGENTS.md](../../AGENTS.md).

## Table of Contents

- [Before you start](#before-you-start)
- [Reporting an issue](#reporting-an-issue)
- [Getting the project running](#getting-the-project-running)
- [Commands](#commands)
- [Known limitations](#known-limitations)
- [Project structure](#project-structure)
- [The contribution flow](#the-contribution-flow)
  - [1. Fork and branch](#1-fork-and-branch)
  - [2. Make your changes](#2-make-your-changes)
  - [3. Commit messages](#3-commit-messages)
  - [4. Open a pull request](#4-open-a-pull-request)
  - [5. Review](#5-review)
- [What CI runs](#what-ci-runs)
- [Git hooks](#git-hooks)
- [Code standards](#code-standards)
- [Changing assets or credits](#changing-assets-or-credits)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

## Before you start

Two things are worth knowing up front.

**The asset rules are not the code rules.** The source code is MIT. Everything
under `front/public/assets/` is not — see
[`ASSETS-LICENSE.md`](../../ASSETS-LICENSE.md). If your contribution adds, removes
or changes an asset, read [Changing assets or credits](#changing-assets-or-credits)
before you open the pull request.

**The default branch for work is `develop`.** Branch from it, and open your pull
request against it. `master` receives release pull requests only.

## Reporting an issue

Open an issue, and include enough for someone else to see what you saw:

- What you did, what you expected, what happened.
- Which level and which part of it, if it is a gameplay bug.
- Browser and operating system.
- Console output or a screenshot, if there is one.

For a **security** problem, do not open an issue — follow
[`SECURITY.md`](../../SECURITY.md).

If you plan to work on something substantial, open an issue first so nobody
duplicates the effort.

## Getting the project running

You need Node.js 24+, Docker with Docker Compose, and Git. No API key, email
account or paid service is required.

```bash
git clone https://github.com/<your-username>/gameplate.git
cd gameplate

cp .env.example .env    # the defaults are a working local configuration
make setup              # dependencies and pre-commit hooks
make development-up     # start the stack
make db-migrate         # create the schema and seed the badges
```

Open <http://localhost:3000>. To log in, enter any email address — with
`EMAIL_PROVIDER=mock` the magic link is printed to the backend log rather than
emailed:

```bash
make development-logs
```

To run without Docker: `make local-all`.

If any of this does not work on a clean machine, that is a bug worth reporting.

Services:

- **Frontend** (Next.js): <http://localhost:3000>
- **Backend** (NestJS): <http://localhost:3001>
- **PostgreSQL**: localhost:5432
- **nginx** (reverse proxy): <http://localhost:80>

Level content lives in static JSON, so `make db-migrate` is all the database
setup a playable install needs. See [`CONTENT-REUSE.md`](./CONTENT-REUSE.md).

The optional integrations (ResponsiveVoice narration, PostHog analytics) are off
in `.env.example`, and the game runs fully without them. See
[`ARCHITECTURE.md`](./ARCHITECTURE.md#optional-integrations).

## Commands

### Development

| Command | Description |
|---------|-------------|
| `make setup` | Install dependencies and developer tooling |
| `make development-up` (alias `make up`) | Start the development stack with hot reload (Docker) |
| `make local-all` | Start front and back locally via Turbo (no Docker) |
| `make down` | Stop development containers |
| `make clean` | Stop containers and remove volumes |
| `make deep-clean` | Full cleanup including images |

### Code quality

| Command | Description |
|---------|-------------|
| `make lint` | Run Biome linting and formatting checks |
| `make test` | Run test suites |
| `make check` | Lint and test in one go |
| `npm run lint:fix` | Fix auto-fixable linting issues |

### Database

| Command | Description |
|---------|-------------|
| `make db-migrate` | Run pending TypeORM migrations |
| `make db-migrate-generate` | Generate a new migration (`NAME=MigrationName`) |

### Debug

| Command | Description |
|---------|-------------|
| `make development-logs` | Follow development container logs |
| `make development-ps` | List development containers |
| `make development-shell-front` | Shell into the front container |
| `make development-shell-back` | Shell into the back container |

## Known limitations

- **Portuguese only.** All narrative, quiz and UI copy is `pt-BR`. There is no
  localisation layer yet.
- **Desktop-first.** The game targets a keyboard and a reasonably wide viewport;
  touch controls are not implemented.
- **Four levels.** Levels 1–3 are map levels in `LEVEL_REGISTRY`
  (`front/src/game/data/LevelConfig.ts`). Level 4 is the final investigation
  screen, which is deliberately kept out of the registry (see
  `front/src/game/constants/Investigation.ts`). Which levels players can reach
  is set by `LEVEL_ENABLED` in `front/src/game/constants/FeatureFlags.ts`.
- **A few bundled sound and image assets are not free for commercial reuse.**
  They are listed individually in [`ASSETS-LICENSE.md`](../../ASSETS-LICENSE.md) §5.
- **Browser speech quality varies.** Without a ResponsiveVoice key, narration
  uses whatever `pt-BR` voice the visitor's browser and operating system
  provide. See [No narration](#troubleshooting).

## Project structure

```
.
├── front/                      # Next.js application
│   ├── src/
│   │   ├── app/                # App Router pages, layouts and API routes
│   │   ├── game/               # Phaser game domain (scenes, objects, systems)
│   │   ├── ui/                 # React HUD and panels layered over the canvas
│   │   └── lib/                # Utilities, env parsing, audio services
│   └── public/assets/          # Game assets — SEPARATE LICENCE, see ASSETS-LICENSE.md
│       └── data/levels/        # Level content: quizzes, NPCs, works, collectibles
├── back/                       # NestJS API
│   └── src/
│       ├── core/               # Config, database, health checks
│       └── modules/            # Feature modules (auth, game, progression, ...)
├── .github/workflows/          # CI/CD pipelines
├── compose.*.yaml              # Docker Compose stacks per environment
├── nginx/                      # Reverse proxy configuration
├── Makefile                    # Common development commands
└── docs/                       # Documentation
    ├── en/                     # English docs and notes
    └── pt-BR/                  # Brazilian Portuguese docs and notes
```

## The contribution flow

### 1. Fork and branch

External contributors work from a fork. Team members branch directly.

Branch from `develop`:

```bash
git checkout develop
git pull
git checkout -b feat/42-user-authentication
```

Naming:

- `feat/<id>-<description>` — new features
- `fix/<id>-<description>` — bug fixes
- `docs/<description>` — documentation
- `chore/<description>` — maintenance
- `refactor/<description>` — refactoring

The `<id>` is the issue number when there is one.

### 2. Make your changes

- Keep a branch focused on a single concern. A small, reviewable pull request is
  merged faster than a large one.
- Follow the surrounding code's style and patterns rather than introducing your
  own.
- Add or update tests for behaviour you change.
- Run `make check` (lint plus tests) before pushing.

### 3. Commit messages

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/).
This is enforced by `commitlint` in a git hook, so a malformed message is
rejected locally before it reaches CI.

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

**Scopes:** `front`, `back`, `infra`, `docs`, `ci`.

Examples:

```
feat(front): add phaser game scene loader
fix(back): correct JWT token expiration handling
docs(readme): update environment setup instructions
```

Write the description in the imperative, lower case, with no trailing period.

### 4. Open a pull request

1. Push your branch.
2. Open the pull request **against `develop`**.
3. Describe what changed and why. If it is a visible change, attach a screenshot
   or a short recording.
4. Link the issue it closes.
5. Make sure CI is green.

A pull request from a fork runs `ci.yml` only. The deployment workflows never
run for a fork.

### 5. Review

- A maintainer reviews and merges. Expect questions — they are about the code,
  not about you.
- Push follow-up commits rather than force-pushing over the review, so the
  reviewer can see what changed.
- Merges use "Squash and merge" or "Rebase and merge".
- Delete the branch after it merges.

## What CI runs

Every pull request triggers `.github/workflows/ci.yml`:

| Stage | Command |
|---|---|
| Typecheck | `npm run typecheck` |
| Lint | `make lint` |
| Build | `npm run build` |
| Test | `make test` |

All four must pass before a merge. You can run the same set locally:

```bash
npm run typecheck && npm run lint && npm run build && npm run test
```

Deployment is maintainer-only. Pushes to `develop` deploy to a staging
environment, and production is a manual dispatch from `master`; both run against
infrastructure that contributors do not have access to, and neither can be
triggered from a fork.

## Git hooks

Installed by `make setup` (which runs `npm run prepare`):

| Hook | What it does |
|---|---|
| pre-commit | `npm run typecheck`, then Biome on staged files via `lint-staged` |
| commit-msg | `commitlint` validates the message format |
| pre-push | runs the test suite |

To bypass them in an emergency — not recommended, and CI will still run:

```bash
git commit --no-verify -m "your message"
```

## Code standards

**Linting and formatting** use [Biome](https://biomejs.dev/):

```bash
make lint          # check
npm run lint:fix   # fix what can be fixed automatically
```

**Tests:**

```bash
make test                  # everything
cd front && npm test        # one workspace
```

**Types:** TypeScript strict mode. Avoid `any`. Define interfaces for API
contracts.

## Changing assets or credits

Assets carry obligations that code does not.

- **Adding a third-party asset.** Check its licence allows redistribution. Add
  it to `front/src/ui/credits/creditsData.ts`, to
  [`CREDITS.md`](../../CREDITS.md) and to
  [`ASSETS-LICENSE.md`](../../ASSETS-LICENSE.md) **in the same pull request**.
  Include the author, the source URL and the licence. A contribution that adds
  an uncredited asset will not be merged.
- **Avoid NonCommercial and no-derivatives licences.** They are incompatible
  with the rest of the project. If you cannot find a suitable free asset, say so
  in the pull request rather than shipping a restricted one quietly.
- **Do not add anything using the sponsor logos or marks.** They are not
  licensed — see [`NOTICE`](../../NOTICE).
- **`creditsData.ts` and `CREDITS.md` are the same obligation twice.** They must
  never drift apart.

Editing level content — quizzes, dialogue, the works on display — is covered in
[`CONTENT-REUSE.md`](./CONTENT-REUSE.md).

## Troubleshooting

**Docker**

```bash
make clean && make development-up       # reset containers and volumes
make deep-clean && make development-up  # also remove images
```

**Port conflicts** on 3000, 3001 or 5432: stop the conflicting service, or
change the mappings in `compose.development.yaml`.

**Dependencies**

```bash
rm -rf node_modules front/node_modules back/node_modules
npm ci
```

**No narration.** `RESPONSIVEVOICE_API_KEY` is optional. Leave it empty
(`RESPONSIVEVOICE_API_KEY=`, as in `.env.example`) and `/api/tts/synthesize`
answers `503`, so the game falls back to the browser's speech synthesis. Do not
use a placeholder value: any non-empty value is treated as a real key and
ResponsiveVoice rejects it, so the route answers `502` on every line.

The browser voice depends on the operating system and the browser, and it does
not always work out of the box. Some systems, notably Linux, need a speech engine
installed at the OS level, or the browser started with a specific flag or
setting, before any voice is available. To check, run this in the browser
console:

```js
speechSynthesis.getVoices();
```

An empty list, or one with no `pt-BR` voice, means narration will be silent —
that is the browser, not the game. Install or enable a speech engine for your
system and browser, then reload the page.

**The magic link never arrives.** With `EMAIL_PROVIDER=mock` no mail is sent at
all. Read the link from `make development-logs`.

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Phaser Documentation](https://phaser.io/docs/)
- [Biome Documentation](https://biomejs.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)
