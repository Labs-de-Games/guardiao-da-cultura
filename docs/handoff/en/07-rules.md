# Rules

Merge criteria, not suggestions.

## Ownership of the diff

A PR may only be opened by someone who can review and defend every line of it.

If the author cannot explain why a function exists, what happens when a
condition is false, or why an `await` is there, without opening the file, the PR
is closed. Not "changes requested". Closed.

This applies identically to hand written code, AI generated code and copied
code. Origin is irrelevant. The person opening the PR owns it.

## Visual changes require a demo

Every PR that changes anything visible in the game needs a demo section.

Counts as visual: React UI, Phaser scenes, objects and sprites, new or replaced
assets, animations and transitions, layout, z-index, scale, positioning, audio
with coupled visual feedback, and any player facing text.

The demo must be a short video or before and after screenshots. An "after" only
screenshot is not acceptable, because the reviewer cannot tell what changed.

If the change is only visible under a condition such as a specific level or a
feature flag, the demo must show how to reach it. PR 517 does this by adding a
debug shortcut that only exists in development.

Visual changes need two approvals: one technical, one design or product. The
board has a `Product & Design Review` column for this.

## Board discipline

- No work in progress without a card in `In Progress` with an assignee
- Move the card before starting, not after finishing
- `Priority` and `Effort` set before leaving `Refinement`
- Blocks communicated the same day, as an issue comment
- Minimum one update per business day on anything assigned to you
- Cards in `Done` are not revisited. Open a new issue referencing the old one
- Branches come from `develop` and PRs target `develop`. Only the release PR
  targets `master`

## Agent boundaries

### Safe zones, edit autonomously

```
front/src/components/
front/src/lib/
front/src/game/
back/src/modules/*/services/
back/src/modules/*/controllers/
back/src/modules/*/dto/
docs/
```

### Ask-first zones, stop and escalate

```
back/src/core/database/migrations/    affects production data
back/src/modules/*/entities/          requires migration planning
.github/workflows/                    affects every deploy
nginx/
compose.*.yaml
.env.example
package.json                          root, front and back
```

### Never

- Open a PR or push without explicit human confirmation
- Merge anything
- Change auth flows or secret handling
- Add a major dependency without approval
- Run destructive database operations
- Edit `.agents/skills/**`
- Add AI attribution to a commit message

### Escalation

| Situation | Action |
|---|---|
| Ambiguous requirement | Ask |
| Security implication | Stop and escalate |
| Breaking change | Flag in the PR description |
| Failing test | Attempt one fix, then escalate |
| Conflicting instructions | Ask a human to resolve |

## Code conventions

| Rule | Reason |
|---|---|
| No `any` | `strict` is on |
| No magic numbers | Constants belong in `front/src/game/constants/` |
| EventBus is the React and Phaser boundary | Direct access crashes the game shell |
| UI state lives in Zustand | Prevents scattered local state |
| Phaser cache keys namespaced by `levelId` | Global keys leaked data across levels |
| z-index comes from the central hierarchy | Do not invent values |
| No `import type` in `back/src/**` | Breaks NestJS dependency injection |

## Definition of done

- Implementation complete
- Tests passing, new tests for new behavior
- Review approved
- If visual: demo in the PR and design review approved
- Documentation updated when documented behavior changed
- PR merged, branch deleted
- Card in `Done`

Merged code is not done. Stale documentation means not done.

## Rejection triggers

- Large PR mixing unrelated changes
- Code that looks right but was never executed
- Missing error handling on a path that can fail
- Copy paste without adaptation
- Generated comments that do not match the code
- Visual change without a demo
- Missing `Closes #N` when an issue exists
