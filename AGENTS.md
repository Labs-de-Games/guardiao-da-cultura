# AGENTS Governance

This repository uses AI agents as development support.  
The goal is to accelerate operational tasks without replacing human review.

## Repository Scope

- This project is a starter template.
- `front` and `back` must remain in bootstrap base state.
- Do not implement product domain at this time.
- Do not configure PR preview environments for now.

## Agent Usage Principles

- Agents may suggest and apply low-risk technical changes.
- All relevant changes must go through PR and human review.
- Commits must follow Conventional Commits.
- Do not commit secrets, tokens, or credentials.

## Responsibilities

- Humans:
  - define scope
  - validate architecture
  - approve PRs
- Agents:
  - scaffolding
  - configuration adjustments
  - repetitive automation
  - operational documentation

## Current Limitations

- No implementation of business rules from `docs/SPEC.md`.
- No PR preview configuration.
- No additional OpenCode automation beyond what already exists in the repository.

## Recommended Workflow

1. Open issue with clear objective.
2. Create short branch from `main`.
3. Execute small and verifiable changes.
4. Open PR with objective description.
5. Validate CI before merge.

## Security and Compliance

- Never expose secrets in code, logs, or documentation.
- Keep sensitive variables only in provider secrets (GitHub/Coolify).
- Avoid destructive commands without explicit approval.

## Future Evolution

When bootstrap is stable, this file can be expanded with:

- agent roles by area (`front`, `back`, `infra`, `docs`)
- approval policies by change type
- release checklist
