# Deploy

## Environments

| Environment | Trigger | Images | Orchestrator |
|---|---|---|---|
| Local | `make up` | local build | Docker Compose |
| Staging | every merge into `develop`, automatic | GHCR `:develop` | Coolify |
| Production | manual, Run workflow on CD Production | GHCR `:master` | Coolify |

Coolify dashboard: http://coolify.guardiaodacultura.42.rio/

Production adds two services over staging: nginx as reverse proxy and
cloudflared for the Cloudflare tunnel. PostgreSQL runs as a compose service in
every environment.

## Pipeline

```mermaid
flowchart TB
    PR["PRs merged into develop"]
    Staging["Coolify staging"]
    Release["Release PR: develop into master"]
    Button["Run workflow on CD Production"]
    GHCR["GHCR: build and push"]
    Prod["Coolify production"]

    PR --> Staging
    PR --> Release --> Button --> GHCR --> Prod

    style Staging fill:#e8f5e9
    style GHCR fill:#fff3e0
    style Prod fill:#fce4ec
```

Work accumulates in `develop`. Every merged PR is a push to `develop`, and every
push to `develop` deploys staging. When the team closes a version, a release PR
takes all of `develop` into `master`. Only then does someone dispatch
production.

## Images

```
ghcr.io/labs-de-games/gameplate-front
ghcr.io/labs-de-games/gameplate-back
```

Each build produces an immutable tag with the short commit SHA plus a floating
tag. Compose files default to the floating tag:

```yaml
image: ghcr.io/labs-de-games/gameplate-front:${IMAGE_TAG:-master}
```

Both Dockerfiles are four stage builds using `turbo prune` to isolate the
workspace. Base image `node:24.15.0-alpine`. The build context is the monorepo
root, not the workspace directory.

## Production deploy

Manual only. `cd-production.yml` has `workflow_dispatch` as its only trigger.

### Before

- The release PR is already merged into `master`
- Changelog written in `docs/CHANGELOG.md`
- Inside a release window
- Someone available to watch
- Database backup taken

### Release windows

| Type | Days | Hours |
|---|---|---|
| Ordinary | Monday | 13:00 to 15:00 |
| Ordinary | Tuesday, Thursday | 13:00 to 19:00 |
| Major version | Thursday | 13:00 to 15:00 |
| Emergency | Any day, with approval | After validation, avoid end of day |

Never Friday. Never the day before a holiday. Never during high public exposure.

### Dispatch

Open the Actions tab, pick the **CD Production** workflow and click
**Run workflow** against `master`. The CLI equivalent:

```bash
gh workflow run cd-production.yml --ref master
```

The workflow builds both images, pushes them to GHCR tagged `master-<sha>` and
`master`, then calls the Coolify webhook. A run takes around six minutes.

The Coolify App also posts deploy status to the Discord notifications channel.
See [Communication](06-communication.md).

### After

- Exercise the main mechanics and user journeys
- Check infrastructure metrics
- Check PostHog for new errors
- Create the tag and GitHub release

## Rollback

Triggers, any one is enough:

- Total outage without fast diagnosis
- Critical flow failure
- Error rate above 5 percent after deploy

Procedure:

1. Pin `IMAGE_TAG` in Coolify to the previous immutable tag:
   `IMAGE_TAG=master-<previous-sha>`
2. If migrations ran, revert them:
   `npm run migration:revert --workspace=back`
   This reverts one migration per invocation. Run it once per migration in
   reverse order. Verify the revert does not drop data created since the deploy.
3. Notify team and stakeholders
4. Open a post mortem within 24 hours

## Incident response

1. Scope it. PostHog for frontend errors, Coolify logs for the backend.
2. Decide within 10 minutes: fix forward or roll back. Without a clear
   diagnosis, roll back. Diagnose with the system up.
3. Roll back using the procedure above.
4. Communicate even if the rollback worked.
5. Open an issue with the Bug Report template and the PostHog error link.
6. Post mortem within 24 hours, blameless.

Hotfix branches come from `master` and target `master`, because the fix must
reach production without waiting for the release cycle:

```bash
git checkout master && git pull
git checkout -b hotfix/v1.8.2
git push -u origin hotfix/v1.8.2
gh pr create --base master
```

After merging a hotfix into `master`, port the fix back into `develop` so it is
not lost in the next release.

Hotfixes still go through PR and CI. The only permitted exception is review
happening after merge, within 24 hours.

## Secrets

GitHub Actions, under Settings then Secrets and variables:

| Name | Kind |
|---|---|
| `COOLIFY_TOKEN` | secret |
| `COOLIFY_WEBHOOK_URL_STAGING` | secret |
| `COOLIFY_WEBHOOK_URL_PRODUCTION` | secret |
| `NEXT_PUBLIC_POSTHOG_KEY` | variable |
| `NEXT_PUBLIC_POSTHOG_HOST` | variable |

PostHog keys are variables, not secrets, because they ship in the browser bundle
regardless.

Coolify runtime holds `JWT_SECRET`, `MAGIC_LINK_SECRET`, `DATABASE_URL`,
Postgres and Gmail credentials, `POSTHOG_API_KEY`, `RESPONSIVEVOICE_API_KEY` and
`CLOUDFLARE_TUNNEL_TOKEN`.

`JWT_SECRET` and `MAGIC_LINK_SECRET` ship as `change-me-in-production` in
`.env.example`. They must be rotated values in staging and production.

`RESPONSIVEVOICE_API_KEY` is not passed by any CD workflow. It exists only in
the Coolify runtime. Check there first when text to speech fails.

## Who dispatches

All ten collaborators are admins and can dispatch a production deploy. In
practice the dispatch belongs to whoever ran the release.
