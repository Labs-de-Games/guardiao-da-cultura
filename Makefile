# Run 'make help' to see available commands

.PHONY: dev-all dev-front dev-back docker-all docker-front docker-back lint test build-front build-back build-prod down clean fclean help

# --- NATIVE RUN (Bun/Turbo) ---
dev-all:
	bun run dev

dev-front:
	bun run dev --filter=front

dev-back:
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

# --- DOCKER BUILD (Only builds images, doesn't run) ---
build-front:
	docker compose -f compose.development.yaml build front

build-back:
	docker compose -f compose.development.yaml build back

build-prod:
	docker compose -f compose.production.yaml build

# --- CLEANUP ---
down:
	docker compose -f compose.development.yaml down

clean:
	docker compose -f compose.development.yaml down -v

fclean:
	docker compose -f compose.development.yaml down -v --rmi local
	docker system prune -f

help:
	@echo "Available commands:"
	@echo ""
	@echo "--- Native Run (Bun/Turbo) ---"
	@echo "  make dev-all     - Run both front and back locally via Turbo"
	@echo "  make dev-front   - Run ONLY front locally"
	@echo "  make dev-back    - Run ONLY back locally"
	@echo ""
	@echo "--- Docker Run ---"
	@echo "  make dev         - Start all services in detached mode via dev compose"
	@echo "  make docker-all  - Start all services via Docker Compose"
	@echo "  make docker-front- Start ONLY front via Docker Compose"
	@echo "  make docker-back - Start ONLY back via Docker Compose"
	@echo ""
	@echo "--- QA & Tests ---"
	@echo "  make lint        - Run Biome (lint + format) via Turbo"
	@echo "  make test        - Run tests via Turbo"
	@echo ""
	@echo "--- Docker Build (No Run) ---"
	@echo "  make build-front - Build front Docker image (dev)"
	@echo "  make build-back  - Build back Docker image (dev)"
	@echo "  make build-prod  - Build production Docker images"
	@echo ""
	@echo "--- Cleanup ---"
	@echo "  make down        - Stop all Docker containers"
	@echo "  make clean       - Stop containers and remove volumes"
	@echo "  make fclean      - Full cleanup (images and prune)"
	@echo "  make help        - Show this help message"
