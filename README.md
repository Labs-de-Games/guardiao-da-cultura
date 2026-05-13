# Gameplate

> **Note:** "Gameplate" is a placeholder name (gameplay + template) until the game is officially named.

A 2D web game built with Next.js, NestJS, and Phaser.

## Overview

This repository contains the complete development environment for our browser-based game, featuring:

- **Frontend**: Next.js with React and Phaser 3 for game rendering
- **Backend**: NestJS API with PostgreSQL database
- **Tooling**: Bun runtime, Biome for linting/formatting, Docker for local development
- **CI/CD**: GitHub Actions for automated testing and deployment

## Tech Stack

| Layer | Technology | Version | Documentation |
|-------|------------|---------|---------------|
| Runtime | [Bun](https://bun.sh/) | latest | [Bun Docs](https://bun.sh/docs) |
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
│   ├── app/                    # App router (pages and layouts)
│   ├── components/             # React components
│   ├── lib/                    # Utility functions and helpers
│   ├── public/                 # Static assets (images, fonts)
│   └── package.json            # Frontend dependencies
├── back/                       # NestJS API
│   ├── src/                    # Source code
│   │   ├── modules/            # Feature modules
│   │   ├── common/             # Shared utilities, guards, filters
│   │   └── main.ts             # Application entry point
│   └── package.json            # Backend dependencies
├── .github/workflows/          # CI/CD pipelines
│   ├── ci.yml                  # PR validation (lint, build, test)
│   └── cd.yml                  # Deployment to production
├── compose.base.yaml           # Shared Docker service definitions
├── compose.development.yaml    # Local development stack
├── compose.production.yaml     # Production stack (Coolify)
├── Makefile                    # Common development commands
├── nginx/                      # Reverse proxy configuration
│   ├── nginx.dev.conf          # Development nginx config
│   └── nginx.prod.conf         # Production nginx config
├── AGENTS.md                   # AI agent collaboration guidelines
├── CONTRIBUTING.md             # Development workflow guide
└── docs/                       # Additional documentation
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Git

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd gameplate

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your local configuration

# Set up developer tooling
bun run prepare  # Installs pre-commit hooks

# Start development environment
make dev
```

The development stack includes:

- **Frontend** (Next.js): <http://localhost:3000>
- **Backend** (NestJS): <http://localhost:3001>
- **PostgreSQL**: localhost:5432

### Database Setup (Optional)

> **Note:** Database migrations and seed data setup will be documented here once implemented.

```bash
# Run database migrations (placeholder)
# make db-migrate

# Seed database with initial data (placeholder)
# make db-seed
```

## Available Commands

### Development

| Command | Description |
|---------|-------------|
| `make dev` | Start local development environment with hot reload |
| `make down` | Stop development containers |
| `make clean` | Stop containers and remove volumes |
| `make fclean` | Full cleanup including images |

### Code Quality

| Command | Description |
|---------|-------------|
| `make lint` | Run Biome linting and formatting checks |
| `make test` | Run test suites |
| `bun run lint --write` | Fix auto-fixable linting issues |
| `bun test --watch` | Run tests in watch mode |

### Build

| Command | Description |
|---------|-------------|
| `make build-front` | Build frontend Docker image |
| `make build-back` | Build backend Docker image |
| `make build-prod` | Build production images for validation |

### Database

| Command | Description |
|---------|-------------|
| `make db-migrate` | Run database migrations (placeholder) |
| `make db-seed` | Seed database with initial data (placeholder) |
| `make db-reset` | Reset database (placeholder) |

### Debug

| Command | Description |
|---------|-------------|
| `make logs` | View container logs |
| `make logs-front` | View frontend logs only |
| `make logs-back` | View backend logs only |

## Architecture

### System Overview

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Client    │──────▶│    nginx    │──────▶│   Next.js   │
│  (Browser)  │      │   (Proxy)   │      │   (Front)   │
└─────────────┘      └─────────────┘      └──────┬──────┘
                                                  │
                                                  ▼
                                           ┌─────────────┐
                                           │   NestJS    │
                                           │   (Back)    │
                                           └──────┬──────┘
                                                  │
                                                  ▼
                                           ┌─────────────┐
                                           │  PostgreSQL │
                                           │  (Database) │
                                           └─────────────┘
```

### Frontend Architecture

- **Next.js App Router**: File-based routing with React Server Components
- **Phaser Integration**: Game scenes rendered via Phaser 3 canvas
- **State Management**: React hooks and context for UI state
- **Styling**: CSS modules and Tailwind CSS

### Backend Architecture

- **NestJS Modules**: Feature-based module organization
- **API Design**: RESTful endpoints with DTO validation
- **Database**: TypeORM with PostgreSQL
- **Authentication**: JWT-based auth (planned)

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

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## CI/CD

This project uses GitHub Actions for continuous integration and Coolify for deployment.

- **CI**: Every Pull Request triggers lint, build, and test checks
- **CD**: Merges to `master` automatically build and push images to GitHub Container Registry (GHCR), then trigger deployment via Coolify webhook

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed CI/CD pipeline information.

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

We welcome contributions from all squad members! Please read our [Contributing Guide](./CONTRIBUTING.md) for:

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

- [CONTRIBUTING.md](./CONTRIBUTING.md) — Development workflow and standards
- [AGENTS.md](./AGENTS.md) — AI agent collaboration guidelines

## License

Private - All rights reserved.
