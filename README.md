# Gameplate

> **Note:** "Gameplate" is a placeholder name (gameplay + template) until the game is officially named.

A 2D web game built with Next.js, NestJS, and Phaser.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Initial Setup](#initial-setup)
  - [Database Setup](#database-setup)
- [Available Commands](#available-commands)
- [Architecture](#architecture)
- [Development Workflow](#development-workflow)
- [CI/CD](#cicd)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [Working with AI Agents](#working-with-ai-agents)
- [Documentation](#documentation)
- [License](#license)

## Overview

This repository contains the complete development environment for our browser-based game, featuring:

- **Frontend**: Next.js with React and Phaser 3 for game rendering
- **Backend**: NestJS API with PostgreSQL database
- **Tooling**: Node.js runtime, Biome for linting/formatting, Docker for local development
- **CI/CD**: GitHub Actions for automated testing and deployment

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
| Registry | [GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) | - | - |
| CI/CD | [GitHub Actions](https://github.com/features/actions) | - | [Actions Docs](https://docs.github.com/en/actions) |
| Deployment | [Coolify](https://coolify.io/) | - | [Coolify Docs](https://coolify.io/docs/) |

## Project Structure

```
.
├── front/                      # Next.js application
│   ├── src/
│   │   ├── app/                # App router (pages and layouts)
│   │   ├── components/         # React components
│   │   ├── lib/                # Utility functions and helpers
│   │   └── game/               # Phaser 3 game domain
│   ├── public/                 # Static assets (images, fonts)
│   └── package.json            # Frontend dependencies
├── back/                       # NestJS API
│   ├── src/                    # Source code
│   │   ├── core/               # Global config, database, health checks
│   │   ├── modules/            # Feature modules (auth, game, progression, ...)
│   │   └── main.ts             # Application entry point
│   └── package.json            # Backend dependencies
├── .github/workflows/          # CI/CD pipelines
│   ├── ci.yml                  # PR validation (typecheck, lint, build, test)
│   ├── cd-staging.yml          # Auto-deploy to staging on push to develop
│   └── cd-production.yml       # Manual production deployment
├── compose.development.yaml    # Local development stack
├── compose.staging.yaml        # Staging stack (Coolify)
├── compose.production.yaml     # Production stack (Coolify)
├── Makefile                    # Common development commands
├── nginx/                      # Reverse proxy configuration
│   ├── nginx.development.conf.template
│   ├── nginx.staging.conf.template
│   └── nginx.production.conf.template
├── AGENTS.md                   # AI agent collaboration guidelines
├── CONTRIBUTING.md             # Development workflow guide
├── ARCHITECTURE.md             # System architecture and API contracts
└── docs/                       # Additional documentation
```

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v24+)
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Git

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd gameplate

# Install dependencies
npm ci

# Set up environment variables
cp .env.example .env
# Edit .env with your local configuration

# Set up developer tooling
npm run prepare  # Installs pre-commit hooks

# Start development environment
make up
```

The development stack includes:

- **Frontend** (Next.js): <http://localhost:3000>
- **Backend** (NestJS): <http://localhost:3001>
- **PostgreSQL**: localhost:5432

### Database Setup

```bash
# Run pending TypeORM migrations
make db-migrate

# Generate a new migration (run inside Docker back container)
make db-migrate-generate NAME=MigrationName
```

## Available Commands

### Development

| Command | Description |
|---------|-------------|
| `make up` | Start local development environment with hot reload (Docker) |
| `make local-all` | Start front and back locally via Turbo (no Docker) |
| `make down` | Stop development containers |
| `make clean` | Stop containers and remove volumes |
| `make deep-clean` | Full cleanup including images |

### Code Quality

| Command | Description |
|---------|-------------|
| `make lint` | Run Biome linting and formatting checks |
| `make test` | Run test suites |
| `npm run lint:fix` | Fix auto-fixable linting issues |

### Build

| Command | Description |
|---------|-------------|
| `make development-build` | Build all development Docker images |
| `make production-build` | Build production nginx image |

### Database

| Command | Description |
|---------|-------------|
| `make db-migrate` | Run pending TypeORM migrations |
| `make db-migrate-generate` | Generate a new migration (`NAME=MigrationName`) |

### Debug

| Command | Description |
|---------|-------------|
| `make logs` | View container logs |
| `make development-logs` | View development container logs |
| `make development-shell-front` | Shell into front container |
| `make development-shell-back` | Shell into back container |

## Architecture

### System Overview

```mermaid
flowchart LR
    Client["Client (Browser)"] --> nginx["nginx (Reverse Proxy)"]
    nginx --> Front["Next.js (Frontend)"]
    Front --> Back["NestJS (Backend API)"]
    Back --> DB["PostgreSQL (Database)"]

    style Client fill:#e1f5fe
    style nginx fill:#fff3e0
    style Front fill:#e8f5e9
    style Back fill:#fce4ec
    style DB fill:#f3e5f5
```

### Frontend Architecture

- **Next.js App Router**: File-based routing with React Server Components
- **Phaser Integration**: Game scenes rendered via Phaser 3 canvas, encapsulated in `src/game/`
- **State Management**: React hooks and context for UI state; Zustand planned for complex game state
- **Styling**: Material UI (MUI) v9 with Emotion for CSS-in-JS
- **Analytics**: PostHog for product analytics and session replay

### Backend Architecture

- **NestJS Modules**: Feature-based module organization (9 domains)
- **API Design**: RESTful endpoints with DTO validation using `class-validator`
- **Database**: TypeORM with PostgreSQL; migrations managed via TypeORM CLI
- **Authentication**: Passwordless magic-link authentication with JWT access tokens and opaque refresh tokens
- **Observability**: PostHog for backend event tracking and error monitoring

## Development Workflow

1. **Create a branch** from `master`:

   ```bash
   git checkout -b feat/42-game-scene
   ```

2. **Make changes** following the code standards

3. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):

   ```bash
   git commit -m "feat(front): add player movement system"
   ```

4. **Push and open PR** to `master`

5. **Merge** after CI passes and review approval

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for detailed guidelines.

## CI/CD

This project uses GitHub Actions for continuous integration and Coolify for deployment.

- **CI**: Every Pull Request triggers typecheck, lint, build, and test checks via `.github/workflows/ci.yml`
- **CD Staging**: Pushes to the `develop` branch automatically build and push images to GitHub Container Registry (GHCR), then trigger staging deployment via Coolify webhook (`.github/workflows/cd-staging.yml`)
- **CD Production**: Production deployment is **manual** via `workflow_dispatch` on `.github/workflows/cd-production.yml`. Images are built from `master` and deployed to production Coolify.

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for detailed CI/CD pipeline information.

## Environment Variables

### Development

Development environment variables are pre-configured in `compose.development.yaml`. Copy `.env.example` to `.env` for any local overrides.

### Production

Configure these in your deployment platform:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `POSTGRES_USER` | Database username | Yes |
| `POSTGRES_PASSWORD` | Database password | Yes |
| `POSTGRES_DB` | Database name | Yes |

## Contributing

We welcome contributions from all squad members! Please read our [Contributing Guide](./docs/CONTRIBUTING.md) for:

- Detailed setup instructions
- Branch naming conventions
- Commit message standards
- Code review process
- Troubleshooting common issues

## Working with AI Agents

This project uses AI agents to accelerate development. See [AGENTS.md](./AGENTS.md) for:

- What agents can and cannot do
- Guidelines for AI-assisted development
- Quality checks for AI-generated code
- Escalation paths

## Documentation

- [CONTRIBUTING.md](./docs/CONTRIBUTING.md) — Development workflow and standards
- [AGENTS.md](./AGENTS.md) — AI agent collaboration guidelines
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System architecture, domain model, and API contracts

## License

Private - All rights reserved.
