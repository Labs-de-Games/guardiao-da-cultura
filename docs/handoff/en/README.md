# Labs de Games agent guide

Operating instructions for the `Labs-de-Games/gameplate` repository. Written for
AI agents and for humans driving them.

This guide does not replace the repository's reference documents in `docs/`.
Read those first when the two disagree.

## Precedence

1. `AGENTS.md` nearest to the file you are editing. Three exist: root, `front/`,
   `back/`.
2. `docs/CONTRIBUTING.md` and `docs/ARCHITECTURE.md`.
3. This guide.

## Pages

| Page | Covers |
|---|---|
| [Quick start](00-quick-start.md) | Clone to first PR in 30 minutes |
| [The project](01-the-project.md) | Stack, layout, architectural constraints |
| [Running locally](02-running-locally.md) | Commands, environment, failure modes |
| [Making a change](03-making-a-change.md) | Branch, commit, PR, CI, review |
| [Tasks and board](04-tasks-and-board.md) | Issue creation, board fields, automations |
| [Deploy](05-deploy.md) | Environments, release windows, rollback, secrets |
| [Communication](06-communication.md) | Discord channels and notification bots |
| [Rules](07-rules.md) | Merge criteria, safe zones, ask-first zones |
| [Quick reference](08-quick-reference.md) | Commands, links, diagnostics |

## Hard constraints

Violating any of these breaks the build, the runtime, or the team's process.

| Constraint | Why |
|---|---|
| Never use `import type` in `back/src/**` | Breaks NestJS dependency injection, which needs runtime metadata |
| Never bypass the EventBus between React and Phaser | Direct DOM access from a scene caused a production crash |
| Never namespace Phaser cache keys globally | Use `levelId` prefixes or level data leaks between levels |
| Never use `any` | `strict` is on and enforced by CI |
| Never mention AI in commit messages | No `Co-Authored-By`, no tool references |
| Never open a PR or push without explicit human confirmation | Merges are a team agreement, not an automated gate |
| Never edit `.agents/skills/**` | Third party code, pinned by hash in `skills-lock.json` |
| Always include `Closes #N` in a PR body | The board automations depend on it |
| Always branch from `develop` and target `develop` | `master` only receives the release PR |

## Ask-first zones

Stop and escalate to a human before editing:

```
back/src/core/database/migrations/
back/src/modules/*/entities/
.github/workflows/
nginx/
compose.*.yaml
.env.example
package.json          # root, front and back
```

## Safe zones

Edit autonomously:

```
front/src/components/
front/src/lib/
front/src/game/
back/src/modules/*/services/
back/src/modules/*/controllers/
back/src/modules/*/dto/
docs/
```
