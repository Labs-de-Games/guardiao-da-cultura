# VPS Migration Runbook — Gameplate (production + staging)

## Context

Gameplate currently runs on an existing server managed by [Coolify](https://coolify.io/). Both environments (production and staging) are deployed the same way: GitHub Actions builds `front`/`back` images, pushes them to GHCR (`ghcr.io/labs-de-games/gameplate-{front,back}`), and then calls a Coolify webhook, which pulls the compose file and restarts the stack. Public traffic reaches the stack through a Cloudflare Tunnel (`cloudflared` container), so the host never exposes ports to the internet. PostgreSQL runs as a container inside the same compose stack, with data in a named Docker volume.

The goal is to move both environments to a new **Contabo** VPS with no application code changes. The approach keeps every moving part identical — same Coolify, same Cloudflare Tunnel ingress, same compose files — so the only things that change are the host, the Coolify webhook URLs stored as GitHub secrets, and the Cloudflare Tunnel connector location. Database data is carried over with `pg_dump` / `pg_restore`, which requires a short maintenance window per environment.

Two decisions worth stating up front:

- **Downtime is expected.** This runbook uses a dump/restore cutover, not live replication. Expect a few minutes of downtime per environment, dominated by dump + restore time.
- **TypeORM migrations are not automatic.** `back/src/core/database/data-source.ts` sets `synchronize: false` and there is no `migrationsRun`, and the runtime image (`back/Dockerfile`) starts with `node dist/main.js` only. Migrations must be run manually after the restore if the images being deployed are newer than the dumped schema. The `Makefile` only has a dev-targeted `db-migrate`; production needs the equivalent command run against the production container (see cutover step 7).

## What exists today (verified)

| Piece | Where | Notes |
|---|---|---|
| Production stack | `compose.production.yaml` | `cloudflared`, `nginx`, `front`, `back`, `postgres`; volume `postgres_data`; `NGINX_PORT` default `81` |
| Staging stack | `compose.staging.yaml` | Same services; volume **`postgres_data_staging_fix_20260610`**; `NGINX_PORT` default `82`; images tagged `develop` |
| Images | GHCR | `master` / `master-<sha>` for prod, `develop` / `develop-<sha>` for staging |
| Prod CD | `.github/workflows/cd-production.yml` | Manual `workflow_dispatch`; secrets `COOLIFY_WEBHOOK_URL_PRODUCTION`, `COOLIFY_TOKEN` |
| Staging CD | `.github/workflows/cd-staging.yml` | Auto on push to `develop`; secrets `COOLIFY_WEBHOOK_URL_STAGING`, `COOLIFY_TOKEN` |
| Ingress | `cloudflared` service | `command: tunnel run --token ${CLOUDFLARE_TUNNEL_TOKEN}` |
| Reverse proxy | `nginx/Dockerfile` + `nginx.{production,staging}.conf.template` | Built on the host from the repo; routes `/api/v1/` → `back`, `/` → `front`, `/health` → 200 |
| Migrations | `back/src/core/database/migrations/` | TypeORM, `migrationsTableName: "migrations"`, run manually |
| Env vars | `.env` on host / Coolify env editor | Full list in `.env.example` |

Note that `nginx` is **built on the host**, not pulled from GHCR. The new VPS therefore needs the repository checked out (Coolify does this automatically when the app is configured as a Git-based compose deployment) and enough resources to run a Docker build.

## Pre-cutover preparation (no downtime, do days before)

### 1. Order and provision the Contabo VPS

**Ordering (Contabo-specific):**

- Sizing floor from the compose `deploy.resources.limits`: production needs ~2 vCPU / 1.75 GB across its services, staging ~3 vCPU / 2.5 GB. Running both environments on one VPS wants **4+ vCPU / 8+ GB / 80+ GB disk**, plus headroom for Coolify itself (it recommends ~2 vCPU / 2 GB) and for Docker image builds. Contabo's entry Cloud VPS tiers comfortably cover this — pick the tier that meets those numbers in the current lineup rather than a specific product name, since Contabo renames tiers periodically.
- **Choose NVMe storage, not the cheaper SSD option, if both are offered.** Postgres is the latency-sensitive part of this stack and Contabo's basic SSD tier has noticeably lower IOPS. This is the one upgrade worth paying for here.
- **Region:** Contabo has no Brazilian region. For a Brazil-based audience pick a US East location (New York) as the closest, or an EU location if the current server is already in the EU and latency has been acceptable. Compare against where the app runs today so the move isn't a latency regression.
- **Order lead time is the big scheduling gotcha:** Contabo provisioning is not instant like DigitalOcean or Hetzner — new accounts often go through manual verification and setup can take hours, occasionally up to a business day. Paying by credit card/PayPal is faster than bank transfer. **Order the VPS at least several days before the intended cutover window.**
- Contabo bills a one-time setup fee on shorter contract terms; a longer term usually waives it. Worth checking before confirming, since this is meant to be a long-lived host.

**First login and hardening:**

- Contabo emails the root password once the server is ready; the panel is at `customer.contabo.com`, which also gives you a VNC console and rescue mode — useful if SSH is ever locked out.
- Install/reinstall with **Ubuntu 24.04 LTS** (Coolify's best-supported target) from the panel, and upload your SSH key during that step if the panel offers it.
- SSH in as root, change the emailed password immediately, then create a non-root sudo user, install your SSH key, and disable password auth and root login in `/etc/ssh/sshd_config` (`PermitRootLogin no`, `PasswordAuthentication no`), then `systemctl restart ssh`. Contabo IPs get constant SSH brute-force traffic, so key-only auth is not optional here.
- **Firewall: Contabo ships no host firewall enabled by default** — the VPS is fully exposed on first boot. Configure `ufw` yourself before installing anything else:

  ```bash
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow 22/tcp        # ideally: ufw allow from <your-ip> to any port 22
  ufw enable
  ```

  **Do not open 80/443** — Cloudflare Tunnel dials out, so no inbound web ports are needed. Coolify's dashboard on 8000 should also stay closed and be reached over an SSH tunnel (`ssh -L 8000:localhost:8000 user@vps`) or via its own tunnel hostname. Note that Docker's iptables rules can bypass `ufw` for published ports — the compose files publish `${NGINX_PORT}` (81/82) to the host, so verify from outside that those ports are actually unreachable:

  ```bash
  nmap -Pn -p 22,81,82,8000 <vps-ip>   # run from your machine, not the VPS
  ```

  If the newer Contabo panel-level firewall is available on your product, enable it too as defense in depth (it filters before traffic reaches the host, so it is not subject to the Docker/iptables caveat).
- Contabo images often ship with little or no swap. Add 2–4 GB so Docker builds (the `nginx` image is built on the host) don't OOM:

  ```bash
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ```

- Set the hostname and timezone, and enable unattended security upgrades.
- Optional but useful: Contabo's API / `cntb` CLI can script snapshots and reinstalls if you'd rather not click through the panel.

**Snapshots — use them as the rollback net.** Contabo includes a small number of snapshots per VPS. Take one **after** Coolify is installed and configured but **before** the first data restore. If the cutover goes wrong at the database step, reverting to that snapshot gives a clean, known-good host in minutes instead of a rebuild. Contabo snapshots have a limited retention window (they expire after a few weeks), so they are a cutover tool, not a backup strategy — that is what post-cutover step 1 is for.

### 2. Install Docker and Coolify on the VPS

- Coolify's install script (`curl -fsSL https://cdn.coolify.io/coolify/install.sh | bash`) installs Docker if missing and brings up the dashboard on port 8000.
- Log in, complete the onboarding, and register the VPS itself as the deployment server (localhost server).
- Match the Coolify major version on the old server if possible, so exported settings and compose behavior line up.

### 3. Record the current configuration from the old server

This is the highest-risk step to skip — most cutover failures are a missing env var.

- In the old Coolify dashboard, for **each** app (production and staging): copy the full environment variable list, the compose file path, the Git repo + branch, the webhook URL, and any custom pre/post-deploy commands.
- On the old host, also grab the on-disk `.env` if the stack is run from one: `cat /path/to/gameplate/.env`.
- Cross-check against `.env.example` so nothing is missed. Required for the stack to boot: `DATABASE_URL`, `JWT_SECRET`, `MAGIC_LINK_SECRET`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `CLOUDFLARE_TUNNEL_TOKEN`. Also carry over: `FRONTEND_URL`, `FRONTEND_API_URL`, `JWT_EXPIRATION`, `JWT_ISSUER`, `MAGIC_LINK_EXPIRATION_MIN`, `EMAIL_PROVIDER`, `EMAIL_FROM`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `POSTHOG_API_KEY`, `POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `RESPONSIVEVOICE_API_KEY`, `NGINX_PORT`, `IMAGE_TAG`.
- Store the values in a password manager, not in a chat or a plaintext file on either host.

### 4. Create the Coolify apps on the new VPS (do not deploy production yet)

- One app per environment, type "Docker Compose" backed by the GitHub repo, with the compose file set to `compose.production.yaml` / `compose.staging.yaml`.
- Paste the env vars recorded in step 3. Keep the staging volume name exactly `postgres_data_staging_fix_20260610` — the staging compose file references it and renaming it silently creates an empty database.
- Give Coolify access to GHCR so `pull_policy: always` works: add a registry credential using a GitHub PAT with `read:packages`, or run `docker login ghcr.io` on the VPS as the Docker user.
- Copy the new webhook URLs for each app — they are needed in cutover step 9.

### 5. Cloudflare Tunnel: decide connector strategy

The token in `CLOUDFLARE_TUNNEL_TOKEN` identifies a tunnel, and a tunnel can have several connectors running at once, with Cloudflare load-balancing between them. Two options:

- **Simplest (recommended):** reuse the same token on the new VPS. During any overlap both hosts serve traffic, which is only safe once the new host is fully healthy and pointed at the *same* data. Practically this means starting the new stack with the tunnel token blank or the `cloudflared` service stopped, then adding the token at cutover and stopping the old connector.
- **Cleaner isolation:** create a new tunnel per environment in the Cloudflare Zero Trust dashboard, point its public hostname at `http://nginx:80` on the new VPS, and swap the hostname's tunnel assignment at cutover. This gives an instant, revertible switch and avoids any split-brain window.

Either way, confirm the tunnel's public hostname → service mapping is `http://nginx:80` (the compose `cloudflared` shares both networks with `nginx`, which listens on 80 inside the container).

### 6. Dry run on staging

Do the full cutover sequence below for staging first, days before production. Staging is the rehearsal; every surprise found there is a surprise not found during the production window.

## Cutover (per environment — staging first, then production)

Do these in order. Steps 1–3 happen while the old stack is still serving; the maintenance window starts at step 4.

### 1. Announce the window

Post the expected duration to the status page or team channel.

### 2. Deploy the stack on the new VPS with `cloudflared` disabled

This lets the app boot and be validated without taking traffic. In Coolify, trigger a deploy of the app; then on the VPS stop just the tunnel container:

```bash
docker ps --format '{{.Names}}' | grep cloudflared
docker stop <cloudflared-container-name>
```

Confirm the rest is healthy — every service in the compose files has a healthcheck, so `docker ps` should show `(healthy)` for `nginx`, `front`, `back`, `postgres`:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
curl -sf http://127.0.0.1:${NGINX_PORT}/health          # expect "healthy"
curl -sf http://127.0.0.1:${NGINX_PORT}/api/v1/health   # backend through nginx
```

### 3. Verify the new empty database is reachable from `back`

The backend healthcheck passing already implies this, since `back` has `depends_on: postgres: service_healthy`.

### 4. Start the maintenance window: stop writes on the old server

Take the app down so the dump is consistent and no writes are lost after it. **Record the row counts first** (see step 7) so there is something to compare against.

```bash
# on the OLD host, in the project directory
docker compose -f compose.production.yaml stop cloudflared front back nginx
# leave postgres running for the dump
```

### 5. Dump the old database

```bash
# on the OLD host — find the postgres container name first
docker ps --format '{{.Names}}' | grep postgres

docker exec -t <old-postgres-container> \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-privileges \
  > gameplate-prod-$(date +%Y%m%d-%H%M).dump

ls -lh gameplate-prod-*.dump   # sanity check: not 0 bytes
```

`-Fc` (custom format) is what `pg_restore` consumes and it compresses. `--no-owner --no-privileges` avoids role-ownership errors when restoring into a fresh cluster.

### 6. Transfer the dump to the new VPS

Prefer host-to-host so the file never lands on a laptop:

```bash
scp gameplate-prod-*.dump user@NEW_VPS_IP:/tmp/
# or, if the old host can't reach the new one directly, relay via your machine:
#   scp user@OLD:~/gameplate-prod-*.dump . && scp gameplate-prod-*.dump user@NEW:/tmp/
sha256sum gameplate-prod-*.dump   # compare on both ends
```

### 7. Restore into the new VPS, then run migrations

```bash
# on the NEW VPS
docker ps --format '{{.Names}}' | grep postgres     # get the new postgres container name
docker cp /tmp/gameplate-prod-*.dump <new-postgres-container>:/tmp/db.dump

# stop the app so nothing writes mid-restore
docker stop <back-container> <front-container>

docker exec -t <new-postgres-container> \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges \
  --clean --if-exists /tmp/db.dump
```

`--clean --if-exists` makes the restore idempotent, so a failed attempt can be retried without recreating the volume. Expect harmless notices; a non-zero exit with only "does not exist, skipping" warnings is fine, real errors are not.

Then run any TypeORM migrations newer than the dumped schema (the runtime image has `dist/`, not `src/`, so use the compiled data source path):

```bash
docker start <back-container>
docker exec -w /app/back <back-container> \
  npx typeorm migration:show -d dist/core/database/data-source.js
docker exec -w /app/back <back-container> \
  npx typeorm migration:run -d dist/core/database/data-source.js
```

If `npx typeorm` is unavailable in the runtime image (it installs with `--omit=dev`, so the `typeorm` CLI may be missing), fall back to a throwaway container that has dev deps, pointed at the same `DATABASE_URL` and attached to the `backend` network:

```bash
docker run --rm -it --network <project>_backend -e DATABASE_URL="$DATABASE_URL" \
  -v "$PWD":/app -w /app node:24.15.0-alpine \
  sh -c "npm ci && cd back && npx typeorm-ts-node-commonjs migration:run -d src/core/database/data-source.ts"
```

Verify the data landed before cutting traffic over:

```bash
docker exec -t <new-postgres-container> psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'select count(*) from users;' -c 'select count(*) from user_progress;' \
  -c 'select name from migrations order by id desc limit 5;'
```

Row counts should match the old database.

### 8. Switch ingress to the new VPS

Order matters — stop the old connector first to avoid two hosts serving different databases:

```bash
# on the OLD host
docker compose -f compose.production.yaml stop cloudflared
```

Then, on the new VPS, set `CLOUDFLARE_TUNNEL_TOKEN` in the Coolify env editor (if it was left blank) and start the tunnel:

```bash
docker compose -f compose.production.yaml up -d cloudflared
docker logs -f <cloudflared-container>   # expect "Registered tunnel connection"
```

If you chose the separate-tunnel option in prep step 5, instead reassign the public hostname to the new tunnel in the Cloudflare Zero Trust dashboard — that is the revertible one-click switch.

### 9. Repoint CD at the new Coolify

In GitHub → Settings → Secrets and variables → Actions, update:

- `COOLIFY_WEBHOOK_URL_PRODUCTION` → new production app webhook
- `COOLIFY_WEBHOOK_URL_STAGING` → new staging app webhook
- `COOLIFY_TOKEN` → new API token from the new Coolify (Keys & Tokens → API Tokens, with Deploy permission)

No workflow file edits are needed: `.github/workflows/cd-production.yml` and `cd-staging.yml` read these secrets and hardcode nothing host-specific.

### 10. Smoke test through the public domain

Not just localhost:

- `curl -I https://<prod-domain>/health` → 200
- `curl -s https://<prod-domain>/api/v1/health` → healthy payload
- Load the app in a browser and complete a magic-link login end to end. This exercises `MAGIC_LINK_SECRET`, `FRONTEND_URL`, and the email provider config in one shot — the most common source of "everything is up but nobody can log in".
- Play through one game scene and confirm progress/score persist after a refresh (exercises `back` → Postgres writes).
- Confirm PostHog events arrive in the PostHog dashboard.
- Check `docker logs` on `back` and `front` for errors.

### 11. Verify CD works against the new host

Push a trivial commit to `develop` and confirm the staging workflow builds and that the new Coolify picks up the webhook and redeploys. For production, run the manual `workflow_dispatch` once.

## After cutover

1. **Set up backups on the new VPS before decommissioning anything.** The old server is the only backup until this exists. A nightly `pg_dump -Fc` to off-host storage (S3/R2/Backblaze) via cron, with a documented restore test, is the minimum. Coolify also has scheduled-backup support for Postgres services.
2. **Keep the old server powered on but stopped for 7–14 days.** Cheap insurance: it holds the last known-good database and configuration. Do not delete its volumes until backups on the new host have been restore-tested at least once.
3. **Keep the final dump file** archived off both hosts.
4. **Update the docs to match reality.** `README.md` (CI/CD and Environment Variables sections) and `docs/ARCHITECTURE.md` (Infrastructure) describe the deployment; if anything about the new host differs (Coolify version, VPS provider, backup process, the manual migration step), record it. Also worth adding: a production-safe `db-migrate` Makefile target, since only the dev one exists today.
5. **Decommission** the old server once the window has passed and backups are proven.

## Rollback

Rollback is fast as long as the old host is untouched. Per environment:

1. Stop `cloudflared` on the new VPS.
2. On the old host, `docker compose -f compose.production.yaml up -d` — full stack including its tunnel.
3. Revert the GitHub secrets to the old webhook URLs and token.
4. If the new host itself is the problem (bad restore, broken Docker state), restore the Contabo snapshot taken in prep step 1 and retry the cutover in the next window.

The one-way door is **writes accepted on the new host**. Once real users have written data to the new database, rolling back to the old host loses that data unless you dump the new database and restore it back. If the smoke tests in cutover step 10 fail, roll back immediately rather than debugging with live traffic on the new host.

## Risks and gotchas

| Risk | Mitigation |
|---|---|
| Missing env var → boot loop or broken login | Prep step 3 checklist, cross-checked against `.env.example`; staging dry run |
| Staging volume renamed → empty DB | Keep `postgres_data_staging_fix_20260610` verbatim in Coolify |
| Two tunnel connectors serving different databases | Stop old `cloudflared` *before* starting the new one, or use separate tunnels and swap the hostname |
| Migrations not run → runtime SQL errors on new columns | Cutover step 7: `migration:show` then `migration:run`; nothing is automatic in this stack |
| GHCR pull fails on new VPS (`pull_policy: always`) | Register a registry credential in Coolify or `docker login ghcr.io` before the window |
| nginx image build fails on the VPS (it is built, not pulled) | Confirm the repo checkout + build succeeds during prep step 4, not at cutover |
| Writes lost between dump and cutover | Stop `front`/`back` before the dump (cutover step 4); do not restart them on the old host afterward |
| Postgres version mismatch on restore | Both sides use `postgres:16-alpine`; confirm the old host isn't pinned differently before dumping |
| No backups on the new host | Post-cutover step 1, done before decommissioning |
| Contabo provisioning delay pushes the window | Order several days ahead; don't schedule the cutover until the VPS is actually reachable |
| Contabo VPS exposed on first boot (no default firewall) | Configure `ufw` before installing Coolify; verify from outside with `nmap`, since Docker can bypass `ufw` |
| Docker publishes `${NGINX_PORT}` (81/82) to the public interface | Confirm externally unreachable; traffic should only arrive via the Cloudflare Tunnel |
| Low disk IOPS on the cheaper Contabo SSD tier slows Postgres | Choose NVMe at order time |
| Latency regression (no Contabo region in Brazil) | Pick US East (New York) or match the current server's region; measure before committing |

## Verification summary

The migration is done when, for **both** environments:

- All compose services report `(healthy)` in `docker ps` on the new VPS.
- `https://<domain>/health` and `https://<domain>/api/v1/health` return 200 through the Cloudflare Tunnel.
- Magic-link login completes end to end.
- Row counts for `users`, `user_progress`, `user_score` match the pre-cutover old-host counts, and `select name from migrations` shows the expected latest migration.
- Game progress persists across a page refresh; PostHog receives events.
- A push to `develop` triggers `cd-staging.yml` and the new Coolify redeploys; `workflow_dispatch` on `cd-production.yml` does the same for production.
- A nightly off-host `pg_dump` exists and has been restore-tested once.
