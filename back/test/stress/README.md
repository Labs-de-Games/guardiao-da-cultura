# Backend Stress Tests

Stress testing suite for the NestJS REST API using [k6](https://k6.io/).

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) installed (`make stress-install`)
- Docker environment running (`make dev` or `make docker-all`)
- Database running and migrations applied
- Test data seeded

## Quick Start

```bash
# 1. Install k6
make stress-install

# 2. Start the environment
make dev

# 3. Seed test data (200 users by default)
make stress-seed

# 4. Run the primary stress test (game events)
make stress-test

# 5. Cleanup test data
make stress-clean
```

By default, seed connects to `postgres://postgres:postgres@localhost:5432/template`.
Override with `DATABASE_URL` env var.

## Seed Options

```bash
# Seed 500 users
make stress-seed ARGS="--users=500"

# Or directly:
bun run back/test/stress/helpers/seed.ts --users=1000
```

## Running Scenarios

Each scenario can be run individually:

```bash
cd back

# Scenario 1: Game events (critical path)
k6 run test/stress/scenarios/01_game_events.stress.js

# Scenario 2: Read endpoints (scores, progression, badges)
k6 run test/stress/scenarios/02_scores_read.stress.js

# Scenario 3: Auth rate limit verification
k6 run test/stress/scenarios/03_auth_rate_limit.stress.js

# Scenario 4: Mixed workflow (events + reads)
k6 run test/stress/scenarios/04_mixed_workflow.stress.js

# Scenario 5: No-auth baseline (measure auth overhead)
NO_AUTH=true k6 run test/stress/scenarios/05_no_auth_baseline.stress.js
```

### Custom Base URL

```bash
BASE_URL=http://localhost:3001 k6 run test/stress/scenarios/01_game_events.stress.js
```

### HTML Reports

```bash
k6 run --out html=reports/report.html test/stress/scenarios/01_game_events.stress.js
k6 run --out json=reports/report.json test/stress/scenarios/01_game_events.stress.js
```

## Scenarios Overview

| # | File | Endpoints | Load Profile | Thresholds |
|---|------|-----------|--------------|------------|
| 1 | `01_game_events.stress.js` | `POST /api/v1/events` | 50 → 200 → 500 → 1000 VUs (15 min) | p95 < 500ms, err < 1%, > 100 rps |
| 2 | `02_scores_read.stress.js` | `GET /scores/:userId`, `GET /progression/:userId`, `GET /badges/:userId` | 100 → 500 → 2000 VUs (10 min) | p95 < 200ms, err < 1% |
| 3 | `03_auth_rate_limit.stress.js` | `POST /auth/refresh` | 50 VUs burst (20s) | p95 < 500ms, verify 429 |
| 4 | `04_mixed_workflow.stress.js` | Events + reads (full session) | 50 → 200 → 500 VUs (10 min) | p95 < 800ms, err < 1% |
| 5 | `05_no_auth_baseline.stress.js` | `POST /api/v1/events` (no JWT) | 50 → 200 → 500 → 1000 VUs (10 min) | p95 < 500ms, err < 1% |

## Directory Structure

```
back/test/stress/
├── helpers/
│   ├── seed.ts              # Creates test users + JWT tokens + sample badges
│   └── cleanup.ts           # Removes all test data
├── scenarios/
│   ├── 01_game_events.stress.js
│   ├── 02_scores_read.stress.js
│   ├── 03_auth_rate_limit.stress.js
│   ├── 04_mixed_workflow.stress.js
│   └── 05_no_auth_baseline.stress.js
├── data/
│   ├── payloads.json        # Sample event payload templates
│   └── tokens.json          # Generated JWT tokens (gitignored)
├── reports/                 # k6 HTML/JSON output (gitignored)
└── README.md
```

## Architecture Notes

### Auth Strategy

The game uses magic-link auth (email-based). Stress tests **bypass** the full auth flow
by using pre-generated JWT tokens from the seed script. This avoids:
- Rate limiting on auth endpoints (3-5 req/hr per email)
- Email service calls
- Magic link token creation overhead

### Event Processing Flow

```
POST /api/v1/events → Zod validation → EventEmitter → DB writes
                                                    ├── AnalyticsService (INSERT GameEvent)
                                                    ├── ProgressionService (UPSERT UserProgress)
                                                    └── BadgesService (conditional upsert)
```

The response returns immediately after validation + emission; DB writes happen
asynchronously via event listeners. Under load, the bottleneck is typically
the database connection pool and TypeORM write operations.

### Rate Limits

| Endpoint | Limit | Scope |
|----------|-------|-------|
| All endpoints (default) | 100 req/min | Global IP |
| `POST /auth/refresh` | 30 req/min | Global IP |
| `POST /auth/register` | 3 req/hr | Per email |
| `POST /auth/login` | 5 req/hr | Per email |
| `POST /auth/resend-verification` | 3 req/hr | Per email |

## Success Criteria / SLAs

| Metric | Target | Critical |
|--------|--------|----------|
| P95 latency (event ingestion) | < 500ms | Yes |
| P99 latency (event ingestion) | < 1s | Yes |
| Error rate (all endpoints) | < 1% | Yes |
| Sustained throughput | > 100 events/sec | Yes |
| P95 latency (read endpoints) | < 200ms | No |
| Correct 429 on rate limit | 100% | Yes |
| Zero crashes at 1,000 concurrent VUs | Pass | Target |

## Interpreting Results

Look for these key metrics in k6 output:
- **http_req_duration** — response latency (p50, p95, p99)
- **http_req_failed** — percentage of failed requests
- **http_reqs** — throughput (requests per second)
- **vus** — number of virtual users at each stage

If thresholds are breached:
- p95 > 500ms on events: Check DB connection pool size, query performance
- Error rate > 1%: Check for 429 (rate limit) or 5xx (server errors)
- Low throughput: Check CPU/memory, connection limits

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `k6: command not found` | Run `make stress-install` or install manually |
| Connection refused | Ensure `make dev` is running and port 3001 is exposed |
| `ECONNREFUSED` on DB | Check `DATABASE_URL` env var matches your Docker setup |
| All requests return 401 | Tokens expired — re-run `make stress-seed` |
| Rate limit failures | Wait 1 min for global throttle to reset, or restart the backend |
| Empty response data | Run seed with larger `--users` count |
