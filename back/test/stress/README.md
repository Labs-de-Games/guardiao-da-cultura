# Backend Stress Tests

Stress testing suite for the NestJS REST API using [k6](https://k6.io/).

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) installed (`make stress-install`)
- Docker environment running (`make dev` or `make docker-all`)
- Database seeded with test data (`make stress-seed`)

## Running

```bash
# 1. Install k6
make stress-install

# 2. Start the environment
make dev

# 3. Seed test data
make stress-seed

# 4. Run stress tests
make stress-test

# 5. Cleanup
make stress-clean
```

## Scenarios

| # | File | Endpoint | Description |
|---|------|----------|-------------|
| 1 | `scenarios/01_game_events.stress.ts` | `POST /api/v1/events` | Game event ingestion (critical path) |

## Structure

```
back/test/stress/
├── helpers/          # Seed and cleanup scripts
├── scenarios/        # k6 test scenarios
├── data/             # Payload templates and generated tokens
└── reports/          # k6 output (gitignored)
```

## Success Criteria

| Metric | Target |
|--------|--------|
| P95 latency (event ingestion) | < 500ms |
| Error rate | < 1% |
| Sustained throughput | > 100 events/sec |
