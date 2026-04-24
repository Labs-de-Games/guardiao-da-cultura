# Development Guide

This document describes the internal development workflow for team members working on this project.

For AI agent collaboration guidelines, see [AGENTS.md](./AGENTS.md).

## Getting Started

### Prerequisites

Ensure you have the following installed:

- Bun (latest version)
- Docker and Docker Compose
- Git

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd gameplate

# Install dependencies
bun install

# Start development environment
make dev
```

The development stack includes:

- **Frontend** (Next.js): <http://localhost:3000>
- **Backend** (NestJS): <http://localhost:3001>
- **PostgreSQL**: localhost:5432

## Development Workflow

### 1. Branch Creation

Create short-lived branches from `master` using descriptive names:

```bash
# Feature branch
git checkout -b feat/42-user-authentication

# Bug fix branch
git checkout -b fix/login-error-handling

# Documentation branch
git checkout -b docs/api-endpoints

# Chore/maintenance branch
git checkout -b chore/update-dependencies
```

Branch naming conventions:

- `feat/<id>-<description>` — New features
- `fix/<id>-<description>` — Bug fixes
- `docs/<description>` — Documentation updates
- `chore/<description>` — Maintenance tasks
- `refactor/<description>` — Code refactoring

### 2. Making Changes

- Keep changes atomic and focused on a single concern
- Follow existing code style and patterns
- Run `make lint` before committing
- Run `make test` to verify tests pass

### 3. Commit Messages

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation changes
- `style` — Code style changes (formatting, semicolons, etc.)
- `refactor` — Code refactoring
- `test` — Adding or updating tests
- `chore` — Maintenance tasks

**Scopes:**

- `front` — Frontend changes
- `back` — Backend changes
- `infra` — Infrastructure/Docker changes
- `docs` — Documentation changes
- `ci` — CI/CD changes

**Examples:**

```
feat(front): add phaser game scene loader
fix(back): correct JWT token expiration handling
docs(readme): update environment setup instructions
refactor(front): extract game loop into separate hook
chore(ci): add test coverage reporting
```

### 4. Pull Request Process

1. Push your branch to the remote
2. Open a Pull Request to `master`
3. Ensure CI checks pass (lint, build, test)
4. Request review from team members
5. Address feedback and update PR
6. Merge using "Squash and merge" or "Rebase and merge"

### 5. Post-Merge

- Delete your branch after merging
- Verify deployment succeeds
- Monitor for any issues

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and Coolify for continuous deployment.

### Continuous Integration (CI)

Every Pull Request triggers the following checks:

| Stage | Description |
|-------|-------------|
| **Lint** | Run Biome linting and formatting checks (`make lint`) |
| **Build** | Validate frontend and backend builds (`bun run build`) |
| **Test** | Execute test suites (`make test`) |

All checks must pass before merging.

### Continuous Deployment (CD)

Merges to `master` automatically trigger deployment:

1. GitHub webhook notifies Coolify
2. Coolify pulls latest code
3. Production containers are rebuilt and redeployed
4. Health checks verify deployment success

### Git Hooks

Git hooks are configured to ensure code quality at different stages:

**Pre-commit:**
- **typecheck**: Validates TypeScript types across the project
- **lint-staged**: Runs Biome only on staged files (faster than full-repo lint)

**Pre-push:**
- **test**: Runs the test suite before pushing to remote

**Commit message:**
- **commit-msg**: Validates commit message format using commitlint

To bypass hooks in emergencies (not recommended):

```bash
git commit --no-verify -m "your message"
```

## Code Standards

### Linting and Formatting

This project uses Biome for linting and formatting:

```bash
# Check linting
make lint

# Fix auto-fixable issues
bun run lint --write
```

Pre-commit hooks use lint-staged to run Biome only on staged files.

### Testing

```bash
# Run all tests
make test

# Run tests in watch mode (during development)
bun test --watch
```

### Type Safety

- Use TypeScript strict mode
- Avoid `any` types
- Define interfaces for API contracts

## Environment Variables

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
```

Required variables for local development are pre-configured in `compose.development.yaml`.

## Troubleshooting

### Docker Issues

```bash
# Reset development environment
make clean
make dev

# Full reset (removes images)
make fclean
make dev
```

### Port Conflicts

If ports 3000, 3001, or 5432 are already in use:

1. Stop conflicting services, or
2. Modify port mappings in `compose.development.yaml`

### Dependency Issues

```bash
# Clean install
rm -rf node_modules front/node_modules back/node_modules
rm -rf bun.lockb front/bun.lockb back/bun.lockb
bun install
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Phaser 3 Documentation](https://phaser.io/docs/)
- [Bun Documentation](https://bun.sh/docs)
- [Biome Documentation](https://biomejs.dev/)

## Questions?

Reach out to the team lead or check the [AGENTS.md](./AGENTS.md) for AI agent collaboration guidelines.
