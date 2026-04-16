# AGENTS Governance

This document defines how AI agents collaborate on this repository. It establishes boundaries, responsibilities, and workflows for human-AI cooperation.

## Purpose

AI agents accelerate development by handling scaffolding, configuration, and repetitive tasks. They do not replace human judgment for architecture decisions, security reviews, or product direction.

## Repository Scope

This is a **starter template** for 2D web games with the following constraints:

- `front/` and `back/` must remain in bootstrap/base state
- No product domain implementation (auth, game logic, etc.)
- No PR preview environment configuration
- Focus on infrastructure, tooling, and documentation

## Agent Responsibilities

### What Agents Can Do

| Category | Examples |
|----------|----------|
| **Scaffolding** | Generate boilerplate components, modules, tests |
| **Configuration** | Update Docker, CI/CD, linting configs |
| **Refactoring** | Rename variables, extract functions, simplify code |
| **Documentation** | Update README, add JSDoc, write guides |
| **Automation** | Scripts, Makefile targets, GitHub Actions |
| **Formatting** | Apply Biome fixes, organize imports |

### What Agents Cannot Do

| Category | Examples |
|----------|----------|
| **Architecture** | Change project structure, add new services |
| **Security** | Modify auth flows, JWT handling, secrets management |
| **Business Logic** | Implement game mechanics, user workflows |
| **Dependencies** | Add new major dependencies without approval |
| **Destructive Ops** | Database migrations, production data changes |

## Decision Matrix

```
┌─────────────────────────────────────────────────────────────┐
│  Task Type          │  Agent Action    │  Human Review      │
├─────────────────────────────────────────────────────────────┤
│  Fix lint errors    │  Apply directly  │  PR review only      │
│  Update docs        │  Apply directly  │  PR review only      │
│  Refactor code      │  Suggest in PR   │  Required            │
│  Add dependencies   │  Ask first       │  Required            │
│  Change architecture│  Not allowed     │  Human only          │
│  Security changes   │  Not allowed     │  Human only          │
└─────────────────────────────────────────────────────────────┘
```

## Workflow Guidelines

### Branch Strategy

1. Create short-lived branches from `master`:

   ```bash
   git checkout -b docs/readme-improvements
   git checkout -b chore/update-dependencies
   git checkout -b fix/lint-errors
   ```

2. Keep changes atomic and focused

3. Open PR with clear description of what and why

### Commit Standards

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Scopes: `front`, `back`, `infra`, `docs`, `ci`

Examples:

```
feat(front): add phaser game scene
fix(back): correct database connection string
docs(readme): update quickstart instructions
chore(ci): add test coverage reporting
```

### Communication

When working with agents:

1. **Be specific** - "Update README" → "Add troubleshooting section for Docker port conflicts"
2. **Provide context** - Reference related issues, PRs, or documentation
3. **Iterate** - Review agent output and provide feedback
4. **Verify** - Test changes before merging

## Security & Compliance

### Secrets Management

- **Never** commit secrets, tokens, or credentials
- Use environment variables (`.env` files, not committed)
- Store production secrets in GitHub/Coolify secret managers
- Rotate credentials if accidentally exposed

### Code Quality

- All code must pass `make lint`
- All code must pass `make test`
- PRs require green CI before merge
- No force pushes to `master`

## Escalation Paths

When agents encounter:

| Situation | Action |
|-----------|--------|
| Unclear requirements | Ask human for clarification |
| Security implications | Stop and escalate to human |
| Breaking changes | Flag in PR description |
| Test failures | Attempt fix once, then escalate |
| Conflicting instructions | Ask human to resolve |

## Future Evolution

When bootstrap is stable, this document may expand to include:

- **Agent roles by area**: `front-agent`, `back-agent`, `infra-agent`
- **Approval policies**: Auto-merge criteria for low-risk changes
- **Release checklist**: Pre-deployment validation steps
- **Performance budgets**: Bundle size limits, test coverage thresholds

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [docs/SPEC.md](./docs/SPEC.md) - Technical specification
- [README.md](./README.md) - Project overview
