# PostHog: Self-Hosted vs Cloud — Trade-Off Analysis

## Executive Summary

**Recommendation: Use PostHog Cloud.**

For Gameplate — a 2D browser game in active development by a small squad — self-hosting PostHog introduces significant infrastructure overhead for marginal benefit. The Cloud free tier (1M events/month, 5K session replays/month) comfortably covers the current and near-term usage. The infrastructure cost alone of self-hosting exceeds what you'd pay for Cloud at moderate scale, and the operational burden diverts resources from building the game.

---

## Comparison Matrix

| Dimension | PostHog Cloud | PostHog Self-Hosted |
|-----------|---------------|---------------------|
| **Setup time** | 5 minutes (sign up, get API key) | 1–2 days (Docker Compose, env vars, networking) |
| **Infrastructure** | Zero — managed by PostHog | 8 Docker containers (web, worker, migrate, PostgreSQL, Redis, ClickHouse, Kafka, Zookeeper) |
| **Minimum RAM** | 0 (their servers) | 4 GB absolute minimum, 8 GB recommended for production |
| **Minimum CPU** | 0 | 2 cores minimum, 4+ recommended |
| **Disk** | 0 | 50 GB minimum, grows with event volume |
| **Ongoing maintenance** | None — automatic updates | 6–8 hours/month for a competent DevOps engineer; double that without DevOps experience |
| **Data retention** | 1 year (free), 7 years (paid) | Unlimited (you control the data) |
| **Data sovereignty** | US or EU hosting regions | Full control — data never leaves your server |
| **Feature parity** | Full — all features, latest updates | Lags behind Cloud by days to weeks; some features land in Cloud first |
| **Support** | Community (free), email (paid) | Community only — no official support for self-hosted |
| **Scaling** | Automatic | Manual — add resources, tune ClickHouse, manage Kafka partitions |
| **Upgrades** | Seamless, zero-downtim | Manual — pull new images, run migrations, pray nothing breaks |
| **Cost at 0–1M events/mo** | **$0** (free tier) | Server cost (~$40–80/mo on Hetzner/AWS) + engineering time |
| **Cost at 1–5M events/mo** | ~$0–50/mo (free tier covers first 1M) | Server cost (~$80–200/mo) + engineering time |
| **Cost at 5–20M events/mo** | ~$50–500/mo | Server cost (~$200–500/mo) + significant engineering time |
| **Session replay** | 5K recordings/mo free, then $0.005/recording | Included, but storage costs grow |
| **Feature flags** | 1M requests/mo free | Included, but you operate the infrastructure |
| **A/B testing** | Included (Bayesian stats engine) | Included |
| **Uptime SLA** | 99.9% (paid plans) | Whatever you provide — no SLA |
| **Security patches** | Automatic | Your responsibility |
| **Backup/recovery** | Managed | Your responsibility |

---

## Detailed Analysis

### 1. Infrastructure Footprint

Self-hosting PostHog adds **8 containers** to your Docker Compose stack:

```
posthog-web        → PostHog application server
posthog-worker     → Background job processor
posthog-migrate    → Runs DB migrations on startup
posthog-db         → PostgreSQL 15 (PostHog's own, separate from app DB)
posthog-redis      → Redis 7 (caching + queue)
posthog-clickhouse → ClickHouse (analytics column store)
posthog-kafka      → Apache Kafka (event streaming)
posthog-zookeeper → Zookeeper (Kafka dependency)
```

Your current stack has **4 containers** (front, back, postgres, nginx). Self-hosted PostHog **triples your container count** and **doubles your RAM requirements**.

**Current resource usage** (estimated):
- Frontend: ~256 MB
- Backend: ~256 MB
- PostgreSQL: ~128 MB
- Nginx: ~16 MB
- **Total: ~656 MB**

**With self-hosted PostHog** (estimated):
- ClickHouse: ~2 GB (minimum, grows with data)
- Kafka: ~1 GB
- Zookeeper: ~256 MB
- Redis: ~128 MB
- PostHog DB: ~256 MB
- PostHog web + worker: ~512 MB
- **Additional: ~4.2 GB**

Your Coolify server would need **at least 8 GB RAM** to run everything comfortably. If it currently has 4 GB, you'd need to upgrade or run PostHog on a separate machine.

### 2. Operational Complexity

Self-hosting PostHog means you own:

| Responsibility | Frequency | Effort |
|---------------|-----------|--------|
| ClickHouse disk monitoring | Weekly | 15 min |
| Kafka consumer lag monitoring | Weekly | 15 min |
| PostgreSQL backups | Daily | Automated, but you set it up |
| PostHog version upgrades | Monthly | 1–2 hours (migrations can be risky) |
| Security patching | As needed | 30 min per patch |
| Troubleshooting OOM kills | As needed | 1–4 hours per incident |
| ClickHouse partition management | Monthly | 30 min |
| Certificate renewal (SSL) | Every 90 days | Automated with Caddy, but you verify |

**Conservative estimate: 6–8 hours/month** for someone comfortable with Docker, Kafka, and ClickHouse. **Double or triple that** if your team doesn't have DevOps expertise.

PostHog's own documentation states: *"Self-hosting requires significant infrastructure expertise, ongoing maintenance, and manual updates, making it difficult to scale and keep secure."*

### 3. Cost Comparison

#### Scenario A: Early Stage (0–1K MAU)

| | PostHog Cloud | Self-Hosted |
|---|---|---|
| Events/mo | ~100K | ~100K |
| Cloud cost | **$0** (within free tier) | $40–80/mo server + 6–8 hrs engineering |
| Engineering cost | 0 | ~$600–1,200/mo (at $100/hr) |
| **Total** | **$0** | **$640–1,280/mo** |

#### Scenario B: Growth (1K–10K MAU)

| | PostHog Cloud | Self-Hosted |
|---|---|---|
| Events/mo | ~500K–1M | ~500K–1M |
| Cloud cost | **$0** (within free tier) | $80–200/mo server + 8–12 hrs engineering |
| Engineering cost | 0 | ~$800–1,200/mo |
| **Total** | **$0** | **$880–1,400/mo** |

#### Scenario C: Scale (10K+ MAU)

| | PostHog Cloud | Self-Hosted |
|---|---|---|
| Events/mo | ~2–5M | ~2–5M |
| Cloud cost | ~$50–170/mo | $200–500/mo server + 12–16 hrs engineering |
| Engineering cost | 0 | ~$1,200–1,600/mo |
| **Total** | **$50–170/mo** | **$1,400–2,100/mo** |

**PostHog Cloud is cheaper at every scale** when you account for engineering time. Self-hosting only makes financial sense if you have unused server capacity and a DevOps engineer with spare cycles.

### 4. Feature Parity & Updates

PostHog Cloud receives updates continuously. Self-hosted instances get the same code, but:

- **No tagged releases**: PostHog doesn't cut versioned releases for self-hosted. You pull `latest` and hope for the best, or pin to a specific commit SHA.
- **Feature lag**: New features land in Cloud first. Self-hosted users may wait days or weeks.
- **Migration risk**: Upgrading self-hosted PostHog requires running database migrations. These can fail, and there's no rollback guarantee.
- **No official support**: If something breaks, you're on your own. Community support (Discord, GitHub Issues) is best-effort.

### 5. Data Sovereignty

This is the **only legitimate reason to self-host**. If your organization has strict compliance requirements (e.g., data must never leave Brazil, or specific regulatory frameworks), self-hosting gives you full control.

For Gameplate — an educational game — this is unlikely to be a requirement. PostHog Cloud offers EU and US hosting regions, which covers most compliance needs.

### 6. Risk Assessment

| Risk | Cloud | Self-Hosted |
|------|-------|-------------|
| Service downtime | PostHog's problem (99.9% SLA) | Your problem |
| Data loss | Managed backups | Your backups, your responsibility |
| Security vulnerabilities | Patched automatically by PostHog | You must patch yourself |
| Scaling bottleneck | Auto-scales | Manual intervention required |
| Vendor lock-in | Low — PostHog is open-source, you can self-host later | N/A |
| Cost overruns | Billing limits available | Server + engineering costs can spiral |

---

## Decision Framework

### Choose PostHog Cloud if:

- You don't have a dedicated DevOps engineer
- Your event volume is under 1M/month (free tier)
- You want to ship features, not manage infrastructure
- You don't have strict data sovereignty requirements
- You want automatic updates and security patches
- You want session replay and feature flags working in 5 minutes

### Choose Self-Hosted PostHog if:

- You have strict data sovereignty or compliance requirements
- You have a DevOps engineer with Kafka/ClickHouse experience and spare capacity
- You're processing 20M+ events/month and Cloud costs become significant
- You need air-gapped deployment
- You want to customize the PostHog codebase itself

### For Gameplate specifically:

**PostHog Cloud is the clear choice.** Here's why:

1. **Small team, no DevOps**: The squad is building a game, not managing infrastructure. Adding 8 containers triples operational complexity.
2. **Early stage**: The game is in active development. Event volume is well within the free tier.
3. **Cost**: Cloud is free. Self-hosting costs $640+/month when accounting for engineering time.
4. **Speed to value**: Cloud integration takes hours. Self-hosting takes days of setup plus ongoing maintenance.
5. **Future flexibility**: If you ever need to self-host, PostHog is open-source. You can migrate later. The SDK integration code is identical either way.

---

## Migration Path (Cloud → Self-Hosted, if needed later)

If you start with Cloud and later decide to self-host:

1. The SDK integration code (`posthog-js`, `posthog-node`) is **identical** — only the `host` URL changes
2. Deploy self-hosted PostHog alongside Cloud
3. Send events to both instances in parallel for a transition period
4. Verify data parity, then switch the `host` URL
5. Decommission Cloud

This is the officially recommended migration path from PostHog's documentation.

---

## Recommendation

**Start with PostHog Cloud.** The integration plan remains the same — only the infrastructure phase changes. Instead of adding 8 Docker containers, you:

1. Sign up at posthog.com (5 minutes)
2. Create a project and copy the API keys
3. Set `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` in your `.env`
4. Set `POSTHOG_API_KEY` and `POSTHOG_HOST` in your backend `.env`
5. Proceed with Phases 2–5 of the integration plan as-is

The SDK code, provider components, feature flag helpers, and analytics forwarding are **identical regardless of hosting model**. The only difference is where the data goes.

If data sovereignty requirements emerge later, the migration path is well-documented and straightforward.
