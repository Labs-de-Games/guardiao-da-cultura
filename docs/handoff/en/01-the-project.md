# The project

## Repository facts

| | |
|---|---|
| Repository | `Labs-de-Games/gameplate`, private |
| Integration branch | `develop`, receives every PR |
| Production branch | `master`, receives only the release PR |
| Package manager | npm workspaces |
| Runtime | Node 24.15.0, pinned in CI and Dockerfiles |
| Orchestrator | Turborepo |
| Registry | `ghcr.io/labs-de-games/gameplate-{front,back}` |

`front/bunfig.toml` exists but is dead weight from an abandoned attempt. Ignore
it. Do not treat bun as the package manager.

## Layout

```
gameplate/
├── front/          Next.js, React, Phaser
├── back/           NestJS, TypeORM
├── nginx/          reverse proxy templates per environment
├── docs/           canonical documentation
├── .github/        CI, CD, issue templates
├── .agents/skills/ pinned AI skills, do not edit
├── compose.*.yaml  one per environment
├── Makefile        command entry point
└── turbo.json      task pipeline
```

## Canonical documentation

Read these before changing behavior. They outrank this guide.

| File | Covers |
|---|---|
| `docs/ARCHITECTURE.md` | Architecture, domains, API contracts |
| `docs/CONTRIBUTING.md` | Development workflow |
| `docs/VERSIONING.md` | Release process, rollback |
| `EVENTS.md` | Analytics event catalog |
| `AGENTS.md` | Agent governance, safe and ask-first zones |

## Frontend

```
front/src/
├── app/          Next.js App Router
├── components/   React outside the game
├── lib/          API clients, auth, utilities
└── game/         Phaser domain
    ├── scenes/
    ├── objects/
    ├── mechanics/
    └── constants/
```

| Layer | Choice |
|---|---|
| Framework | Next.js App Router, standalone output |
| Engine | Phaser 3.90.0, pinned |
| UI | MUI v9 with Emotion |
| UI state | Zustand |
| Forms | react-hook-form with Zod |
| HTTP | Axios with interceptors |
| Analytics | posthog-js |

### React and Phaser boundary

The boundary is a typed EventBus. A React component must not reach into a Phaser
scene. A scene must not manipulate React DOM.

Breaking this caused a production crash: `PhaserGame` rendered React UI while
Phaser attached its canvas under the same `#game-container`, and both fought
over the node.

### Phaser cache

Namespace cache keys by `levelId`, for example `${levelId}__npcs`. Global keys
leak level data across levels.

## Backend

```
back/src/
├── core/      config, database, email, guards, health, logger
└── modules/   admin, analytics, auth, badges, game,
               posthog, progression, scoring, users
```

| Layer | Choice |
|---|---|
| Framework | NestJS with Express |
| Database | PostgreSQL 16 |
| ORM | TypeORM, CLI migrations |
| Auth | Passport JWT plus passwordless magic link |
| Logging | nestjs-pino |
| API docs | Swagger |

All endpoints are prefixed `/api/v1`. Contracts live in `docs/ARCHITECTURE.md`.

### Import type restriction

Do not convert imports to `import type` anywhere under `back/src/**`. NestJS
dependency injection reads runtime metadata and the conversion breaks it. The
Biome rule `style/useImportType` is disabled there deliberately.

## Architectural stance

From `docs/ARCHITECTURE.md`:

> The frontend does the heavy lifting. The backend was deliberately simplified
> and is limited to persistence, analytics aggregation for dashboards, and
> validation of global state that cannot be trusted to the client.

Default new game logic to the frontend.
