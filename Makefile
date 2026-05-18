# Run 'make help' to see available commands

PROJECT_NAME = gameplate

.PHONY: dev-all dev-front dev-back docker-all docker-front docker-back lint test build-front build-back build-prod down clean fclean fclean-images sync install setup db-migrate db-migrate-generate help stress-install stress-seed stress-clean stress-test

# --- SETUP & INSTALLATION ---
install:
	@echo "Installing dependencies with Bun..."
	bun install --frozen-lockfile

setup: install
	@echo "Setup complete. You can now run:"
	@echo "  make dev-all     - Start local development (Turbo)"
	@echo "  make docker-all  - Start Docker development"

# --- NATIVE RUN (Bun/Turbo) ---
dev-all: install
	bun run dev

dev-front: install
	bun run dev --filter=front

dev-back: install
	bun run dev --filter=back

# --- DOCKER RUN ---
dev:
	docker compose -f compose.development.yaml up --build -d

docker-all:
	docker compose -f compose.base.yaml -f compose.development.yaml up --build

docker-front:
	docker compose -f compose.base.yaml -f compose.development.yaml up --build front

docker-back:
	docker compose -f compose.base.yaml -f compose.development.yaml up --build back

# --- QA & TESTS ---
lint:
	bun run lint

test:
	bun run test

# --- STRESS TESTS (k6) ---
stress-install:
	@echo "Installing k6..."
	@curl -fsSL "https://github.com/grafana/k6/releases/download/v2.0.0/k6-v2.0.0-linux-amd64.tar.gz" | tar xz -C /tmp
	@mkdir -p ~/.local/bin
	@mv /tmp/k6-v2.0.0-linux-amd64/k6 ~/.local/bin/k6
	@rm -rf /tmp/k6-v2.0.0-linux-amd64
	@echo "k6 installed to ~/.local/bin/k6"

stress-seed:
	cd back && bun run test/stress/helpers/seed.ts $(ARGS)

stress-clean:
	cd back && bun run test/stress/helpers/cleanup.ts

stress-test:
	@echo "Running stress tests..."
	cd back && k6 run test/stress/scenarios/01_game_events.stress.ts

build-front:
	docker compose -f compose.development.yaml build front

build-back:
	docker compose -f compose.development.yaml build back

build-prod:
	docker compose -f compose.production.yaml build

# --- SYNC ---
sync:
	@echo "Syncing node_modules..."
	@echo "Removing existing node_modules..."
	rm -rf node_modules front/node_modules back/node_modules
	@echo "Reinstalling with Bun..."
	bun install --frozen-lockfile
	@echo "Sync complete. node_modules are now aligned with host."

# --- DATABASE ---
db-migrate:
	@echo "Running TypeORM migrations inside back container..."
	docker compose -f compose.development.yaml exec back sh -c "cd /app/back && node_modules/.bin/typeorm-ts-node-commonjs migration:run -d src/core/database/data-source.ts"

db-migrate-generate:
	@if [ -z "$(NAME)" ]; then echo "Usage: make db-migrate-generate NAME=MigrationName"; exit 1; fi
	docker compose -f compose.development.yaml exec back sh -c "cd /app/back && node_modules/.bin/typeorm-ts-node-commonjs migration:generate -d src/core/database/data-source.ts src/core/database/migrations/$(NAME)"

# --- CLEANUP ---
down:
	docker compose -f compose.development.yaml down

clean:
	docker compose -f compose.development.yaml down -v

fclean: clean fclean-images
	@echo "Full cleanup completed for $(PROJECT_NAME)"

fclean-images:
	@echo "Removing $(PROJECT_NAME) project images"
	@docker images --format '{{.Repository}}:{{.Tag}}' | grep "$(PROJECT_NAME)" | xargs -r docker rmi -f 2>/dev/null || true
	@docker images --format '{{.Repository}}:{{.Tag}}' | grep "<none>" | xargs -r docker rmi -f 2>/dev/null || true
	@echo "Project images removed."

# --- HELP ---
help:
	@echo "Available commands:"
	@echo ""
	@echo "=== SETUP ==="
	@echo "  make setup       - Initial setup (install dependencies)"
	@echo "  make install     - Install dependencies with Bun"
	@echo "  make sync        - Reinstall node_modules (fix conflicts)"
	@echo ""
	@echo "=== Native Development (Bun/Turbo) ==="
	@echo "  make dev-all     - Run both front and back locally via Turbo"
	@echo "  make dev-front   - Run ONLY front locally"
	@echo "  make dev-back    - Run ONLY back locally"
	@echo ""
	@echo "=== Docker Development ==="
	@echo "  make dev         - Start all services in detached mode"
	@echo "  make docker-all  - Start all services via Docker Compose"
	@echo "  make docker-front- Start ONLY front via Docker"
	@echo "  make docker-back - Start ONLY back via Docker"
	@echo ""
	@echo "=== Production Builds ==="
	@echo "  make build-front - Build front Docker image"
	@echo "  make build-back  - Build back Docker image"
	@echo "  make build-prod  - Build production images"
	@echo ""
	@echo "=== Database ==="
	@echo "  make db-migrate           - Run pending TypeORM migrations in Docker"
	@echo "  make db-migrate-generate  - Generate new migration (NAME=MigrationName)"
	@echo ""
	@echo "=== QA & Tests ==="
	@echo "  make lint        - Run Biome (lint + format)"
	@echo "  make test        - Run tests via Turbo"
	@echo ""
	@echo "=== Stress Tests ==="
	@echo "  make stress-install - Install k6 load testing tool (requires curl)"
	@echo "  make stress-seed    - Seed stress test data (users + JWT tokens)"
	@echo "  make stress-clean   - Remove stress test data from database"
	@echo "  make stress-test    - Run stress tests (requires Docker environment running)"
	@echo ""
	@echo "=== Cleanup ==="
	@echo "  make down        - Stop Docker containers"
	@echo "  make clean       - Stop containers and remove volumes"
	@echo "  make fclean      - Full cleanup (containers, volumes, project images only)"
	@echo ""
	@echo "=== IMPORTANT NOTES ==="
	@echo "  - Use EITHER 'make dev-all' (local) OR 'make docker-all' (Docker)"
	@echo "  - If switching between them, run 'make sync' first"
	@echo "  - 'make build-front/back' are for production images only"
