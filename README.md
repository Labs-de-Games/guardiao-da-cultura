# Guardião da Cultura

A 2D browser game about Brazilian art and culture. You play an investigator who
walks through cultural spaces — Inhotim, the Teatro Amazonas, the São João
festival in Campina Grande — restoring works that have been damaged or
misplaced, talking to the people who work there, and answering quizzes about
what you find.

It was produced with public incentive funding under the Brazilian **Lei
Rouanet**, and it is published as open source so developers and educators can
run it, study it, adapt it and reuse its content.

> ### Using the game's assets? You must keep the credits.
>
> The source code is MIT. The **assets are not**. The artworks reproduced in this
> game — works by Abdias Nascimento, Claudia Andujar, Edgard de Souza and others
> — were cleared for publication on the binding condition that **credit is
> always given**, and the original assets produced by the team are CC BY 4.0,
> which carries the same obligation.
>
> If your fork, build or extraction includes anything from
> `front/public/assets/`, carry the credits from [`CREDITS.md`](./CREDITS.md)
> somewhere your users can reach. Shipping `LICENSE` alone does not satisfy it.
> The full terms are in [`ASSETS-LICENSE.md`](./ASSETS-LICENSE.md), and the
> sponsor logos are not licensed at all — see [`NOTICE`](./NOTICE).

**Maintainer:** [@anacarla-42](https://github.com/anacarla-42) reviews and merges
contributions, and is the responder for security reports.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Optional Integrations](#optional-integrations)
- [Known Limitations](#known-limitations)
- [Available Commands](#available-commands)
- [Architecture](#architecture)
- [Reusing the Content](#reusing-the-content)
- [Contributing](#contributing)
- [Security](#security)
- [Working with AI Agents](#working-with-ai-agents)
- [Documentation](#documentation)
- [License](#license)

## Overview

- **Three levels** — a museum (Inhotim), the Teatro Amazonas, and the São João
  festival in Campina Grande — each with its own map, narrative, puzzles and
  quiz content. The first two are complete; the third is still being built out.
- **Exploration and puzzles** — restore damaged works, find collectibles, move
  objects, solve the light and band minigames.
- **Progression** — badges, stars and per-level scoring, persisted per player.
- **Accessibility** — narrated dialogue and labels, with a browser speech
  fallback that needs no API key.
- **Passwordless login** — magic-link authentication; locally the link is
  printed to the console, so no email provider is needed.

Technically it is a Next.js frontend with the game itself rendered by Phaser 3,
a NestJS API over PostgreSQL, and a React HUD layered over the game canvas.

## Tech Stack

| Layer | Technology | Version | Documentation |
|-------|------------|---------|---------------|
| Runtime | [Node.js](https://nodejs.org/) | 24+ | [Node.js Docs](https://nodejs.org/docs/) |
| Frontend | [Next.js](https://nextjs.org/) | 14+ | [Next.js Docs](https://nextjs.org/docs) |
| Frontend | [React](https://react.dev/) | 18+ | [React Docs](https://react.dev/) |
| Game Engine | [Phaser 3](https://phaser.io/) | 3.70+ | [Phaser Docs](https://phaser.io/docs/) |
| Backend | [NestJS](https://nestjs.com/) | 10+ | [NestJS Docs](https://docs.nestjs.com/) |
| Database | [PostgreSQL](https://www.postgresql.org/) | 16 | [PostgreSQL Docs](https://www.postgresql.org/docs/) |
| Linting | [Biome](https://biomejs.dev/) | latest | [Biome Docs](https://biomejs.dev/) |
| CI/CD | [GitHub Actions](https://github.com/features/actions) | - | [Actions Docs](https://docs.github.com/en/actions) |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v24+)
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Git

### Cold start

Nothing below needs an API key, an email account or a paid service.

```bash
git clone https://github.com/Labs-de-Games/gameplate.git
cd gameplate

# The defaults in .env.example are a working local configuration
cp .env.example .env

# Install dependencies and set up the pre-commit hooks
make setup

# Start the full stack in Docker
make development-up

# Create the database schema and seed the badges
make db-migrate
```

Then open <http://localhost:3000>.

Services:

- **Frontend** (Next.js): <http://localhost:3000>
- **Backend** (NestJS): <http://localhost:3001>
- **PostgreSQL**: localhost:5432
- **nginx** (reverse proxy): <http://localhost:80>

### Logging in

Authentication is passwordless. With `EMAIL_PROVIDER=mock` — the default in
`.env.example` — no mail is sent; the magic link is printed to the backend
container's log instead:

```bash
make development-logs
```

Enter any email address on the login screen, copy the link from the log, and
open it.

### Useful while developing

```bash
make development-logs   # follow container logs
make down               # stop the stack
make clean              # stop and remove volumes
```

Level content lives in static JSON, so `make db-migrate` is all the database
setup a playable install needs. See [Reusing the Content](#reusing-the-content).

## Optional Integrations

Both are off by default in `.env.example` and the game runs fully without them.

| Integration | Variable | Without it |
|---|---|---|
| **ResponsiveVoice** (text-to-speech) | `RESPONSIVEVOICE_API_KEY` | `/api/tts/synthesize` reports itself unavailable and narration uses the browser's own `SpeechSynthesis`, in `pt-BR`. ResponsiveVoice is a paid, NonCommercial (CC BY-NC-ND) service, so the game deliberately does not depend on it. |
| **PostHog** (product analytics) | `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_API_KEY` | The frontend swaps in a console-logging stub and the backend skips event capture. No data leaves the machine. |

## Known Limitations

- **Portuguese only.** All narrative, quiz and UI copy is `pt-BR`. There is no
  localisation layer yet.
- **Desktop-first.** The game targets a keyboard and a reasonably wide viewport;
  touch controls are not implemented.
- **Level 3 is still in development** and levels 4 and 5 do not exist beyond a
  loading screen. See `LEVEL_REGISTRY` in
  `front/src/game/data/LevelConfig.ts` for the current state of each.
- **A few bundled sound and image assets are not free for commercial reuse.**
  They are listed individually in [`ASSETS-LICENSE.md`](./ASSETS-LICENSE.md) §5.
- **Browser speech quality varies.** Without a ResponsiveVoice key, narration
  uses whatever `pt-BR` voice the visitor's browser and operating system
  provide.

## Available Commands

### Development

| Command | Description |
|---------|-------------|
| `make setup` | Install dependencies and developer tooling |
| `make development-up` (alias `make up`) | Start the development stack with hot reload (Docker) |
| `make local-all` | Start front and back locally via Turbo (no Docker) |
| `make down` | Stop development containers |
| `make clean` | Stop containers and remove volumes |
| `make deep-clean` | Full cleanup including images |

### Code Quality

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

## Architecture

### System Overview

```mermaid
flowchart LR
    Client["Client (Browser)"] --> nginx["nginx (Reverse Proxy)"]
    nginx --> Front["Next.js (Frontend)"]
    Front --> Back["NestJS (Backend API)"]
    Back --> DB["PostgreSQL (Database)"]
    Front -.->|"Optional"| PostHog["PostHog"]
    Back -.->|"Optional"| PostHog

    style Client fill:#e1f5fe
    style nginx fill:#fff3e0
    style Front fill:#e8f5e9
    style Back fill:#fce4ec
    style DB fill:#f3e5f5
    style PostHog fill:#fff9c4
```

### Frontend

- **Next.js App Router**: file-based routing with React Server Components
- **Phaser integration**: game scenes rendered on a Phaser 3 canvas under `src/game/`
- **UI overlay layer**: HUD and modal panels rendered in React over the canvas, synchronised through a shared EventBus
- **State**: React hooks plus Zustand for game UI state
- **Styling**: Material UI with Emotion

### Backend

- **NestJS modules**: feature-based organisation
- **API**: REST endpoints with DTO validation via `class-validator`
- **Database**: TypeORM over PostgreSQL, migrations through the TypeORM CLI
- **Authentication**: passwordless magic link, JWT access tokens plus opaque refresh tokens

## Reusing the Content

The levels are data, not code. Quizzes, dialogue, collectibles and the works on
display live in JSON under `front/public/assets/data/levels/`, and the level
wiring lives in `front/src/game/data/LevelConfig.ts`. An educator can rewrite a
quiz or a museum's narrative without touching the game engine.

See [`docs/CONTENT-REUSE.md`](./docs/CONTENT-REUSE.md) for what each file does
and how to adapt it — including the part that is not optional: an adapted
version must keep the credits.

## Contributing

Contributions are welcome. Read [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md)
for the fork-and-branch flow, the conventional-commit requirement enforced by
`commitlint`, what CI runs, and what review looks like.

In short: branch from `develop`, open your pull request against `develop`, and
make sure typecheck, lint, build and test are green.

## Security

Report vulnerabilities through GitHub's private vulnerability reporting, not in
a public issue. See [`SECURITY.md`](./SECURITY.md).

## Working with AI Agents

This project uses AI agents in development. See [AGENTS.md](./AGENTS.md) for
what they may and may not do, and the quality checks applied to their output.

## Documentation

- [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) — contributor workflow and standards
- [`docs/CONTENT-REUSE.md`](./docs/CONTENT-REUSE.md) — adapting the levels, quizzes and narrative
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — system architecture, domain model and API contracts
- [`SECURITY.md`](./SECURITY.md) — reporting a vulnerability
- [`AGENTS.md`](./AGENTS.md) — AI agent collaboration guidelines
- [`CREDITS.md`](./CREDITS.md) — credits, mirroring the in-game screen
- [`ASSETS-LICENSE.md`](./ASSETS-LICENSE.md) — asset terms, per group
- [`NOTICE`](./NOTICE) — trademark carve-out and the obligations that travel with the assets

## License

**Source code: [MIT](./LICENSE).**

**Assets: not MIT.** Everything under `front/public/assets/` is governed by
[`ASSETS-LICENSE.md`](./ASSETS-LICENSE.md). Most of it requires attribution; a
few files are not free for commercial use. The institutional names and logos
(Governo Federal, Lei Rouanet, Ministério da Cultura, Galp, Bemobi, 42 Rio) are
trademarks and are not licensed — a fork must remove them. See
[`NOTICE`](./NOTICE).
