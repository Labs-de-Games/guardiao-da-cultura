# Run 'make help' to see available commands

.PHONY: dev lint test build-front build-back build-prod down clean fclean help

dev:
	docker compose -f compose.base.yaml -f compose.development.yaml up --build

lint:
	bun run lint

test:
	bun run test

build-front:
	docker compose -f compose.base.yaml -f compose.development.yaml build front

build-back:
	docker compose -f compose.base.yaml -f compose.development.yaml build back

build-prod:
	docker compose -f compose.base.yaml -f compose.production.yaml build

down:
	docker compose -f compose.base.yaml -f compose.development.yaml down

clean:
	docker compose -f compose.base.yaml -f compose.development.yaml down -v

fclean:
	docker compose -f compose.base.yaml -f compose.development.yaml down -v --rmi local
	docker system prune -f

help:
	@echo "Available commands:"
	@echo "  make dev         - Start local dev environment with hot reload"
	@echo "  make lint        - Run Biome (lint + format)"
	@echo "  make test        - Run tests via Bun"
	@echo "  make build-front - Build front Docker image (dev)"
	@echo "  make build-back  - Build back Docker image (dev)"
	@echo "  make build-prod  - Build production Docker images"
	@echo "  make down        - Stop dev environment"
	@echo "  make clean       - Stop dev environment and remove volumes"
	@echo "  make fclean      - Full cleanup including images and prune"
	@echo "  make help        - Show this help message"
