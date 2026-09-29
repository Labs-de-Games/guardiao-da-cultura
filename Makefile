# =============================================================================
# Gameplate Makefile
# =============================================================================
# Run 'make help' to see available commands, or just 'make'.
# =============================================================================

# --- Project Configuration ---
PROJECT_NAME = gameplate

# --- Tooling Variables ---
DC         = docker compose
PKG        = npm
DC_DEV     = -f compose.development.yaml
DC_STAGING = -f compose.staging.yaml
DC_PROD    = -f compose.production.yaml

# --- Default Target ---
.DEFAULT_GOAL := help

# --- Phony Declarations ---
.PHONY: install setup sync local-all local-front local-back development-up development-front development-back development-down development-build development-build-front development-build-back development-logs development-ps development-shell-front development-shell-back development-restart staging-up staging-down staging-logs staging-ps staging-shell-front staging-shell-back production-up production-down production-logs production-ps production-shell-front production-shell-back production-build lint test check rulesets-apply rulesets-diff db-migrate db-migrate-generate clean deep-clean clean-images help up down logs

# =============================================================================
# Setup & Installation
# =============================================================================

install: ## Install dependencies
	@echo "Installing dependencies with $(PKG)..."
	@$(PKG) ci

setup: install ## Initial project setup
	@echo "Setup complete. You can now run:"
	@echo "  make up          - Start local development (Docker)"
	@echo "  make local-all   - Start local development (Turbo)"

sync: ## Reinstall node_modules (fix conflicts)
	@echo "Syncing node_modules..."
	@echo "Removing existing node_modules..."
	@rm -rf node_modules front/node_modules back/node_modules
	@echo "Reinstalling with $(PKG)..."
	@$(PKG) ci
	@echo "Sync complete. node_modules are now aligned with host."

# =============================================================================
# Native Development
# =============================================================================

local-all: install ## Run both front and back locally via Turbo
	@$(PKG) run dev

local-front: install ## Run ONLY front locally
	@$(PKG) run dev -- --filter=front

local-back: install ## Run ONLY back locally
	@$(PKG) run dev -- --filter=back

# =============================================================================
# Docker Development
# =============================================================================

development-up: ## Start all dev services (detached)
	@$(DC) $(DC_DEV) up --build -d

development-front: ## Start ONLY front via Docker
	@$(DC) $(DC_DEV) up --build front -d

development-back: ## Start ONLY back via Docker
	@$(DC) $(DC_DEV) up --build back -d

development-down: ## Stop dev containers
	@$(DC) $(DC_DEV) down

development-build: ## Build all dev images
	@$(DC) $(DC_DEV) build

development-build-front: ## Build front dev image
	@$(DC) $(DC_DEV) build front

development-build-back: ## Build back dev image
	@$(DC) $(DC_DEV) build back

development-logs: ## Follow dev container logs
	@$(DC) $(DC_DEV) logs -f

development-ps: ## List dev containers
	@$(DC) $(DC_DEV) ps

development-shell-front: ## Shell into front container
	@$(DC) $(DC_DEV) exec front sh

development-shell-back: ## Shell into back container
	@$(DC) $(DC_DEV) exec back sh

development-restart: ## Restart dev containers
	@$(DC) $(DC_DEV) restart

# =============================================================================
# Staging
# =============================================================================

staging-up: ## Start staging stack (pulls latest from GHCR)
	@$(DC) $(DC_STAGING) up -d --pull always

staging-down: ## Stop staging stack
	@$(DC) $(DC_STAGING) down

staging-logs: ## Follow staging logs
	@$(DC) $(DC_STAGING) logs -f

staging-ps: ## List staging containers
	@$(DC) $(DC_STAGING) ps

staging-shell-front: ## Shell into staging front container
	@$(DC) $(DC_STAGING) exec front sh

staging-shell-back: ## Shell into staging back container
	@$(DC) $(DC_STAGING) exec back sh

# =============================================================================
# Production
# =============================================================================

production-up: ## Start production stack (pulls latest from GHCR)
	@$(DC) $(DC_PROD) up -d --pull always

production-down: ## Stop production stack
	@$(DC) $(DC_PROD) down

production-logs: ## Follow production logs
	@$(DC) $(DC_PROD) logs -f

production-ps: ## List production containers
	@$(DC) $(DC_PROD) ps

production-shell-front: ## Shell into production front container
	@$(DC) $(DC_PROD) exec front sh

production-shell-back: ## Shell into production back container
	@$(DC) $(DC_PROD) exec back sh

production-build: ## Build nginx image for production
	@$(DC) $(DC_PROD) build

# =============================================================================
# QA & Tests
# =============================================================================

lint: ## Run Biome (lint + format)
	@$(PKG) run lint

test: ## Run tests via Turbo
	@$(PKG) run test

check: lint test ## Run lint and tests in one go

# =============================================================================
# Repository Settings (maintainers, needs admin rights)
# =============================================================================

rulesets-apply: ## Create or update branch rulesets from .github/rulesets/
	@./scripts/apply-rulesets.sh apply

rulesets-diff: ## Compare live branch rulesets with .github/rulesets/
	@./scripts/apply-rulesets.sh diff

# =============================================================================
# Database
# =============================================================================

db-migrate: ## Run pending TypeORM migrations in Docker
	@echo "Running TypeORM migrations inside back container..."
	@$(DC) $(DC_DEV) exec back sh -c "cd /app/back && npx typeorm-ts-node-commonjs migration:run -d src/core/database/data-source.ts"

db-migrate-generate: ## Generate new migration (NAME=MigrationName)
	@if [ -z "$(NAME)" ]; then echo "Usage: make db-migrate-generate NAME=MigrationName"; exit 1; fi
	@$(DC) $(DC_DEV) exec back sh -c "cd /app/back && npx typeorm-ts-node-commonjs migration:generate -d src/core/database/data-source.ts src/core/database/migrations/$(NAME)"

# =============================================================================
# Cleanup
# =============================================================================

clean: ## Stop containers and remove volumes
	@$(DC) $(DC_DEV) down -v

deep-clean: clean clean-images ## Full cleanup (containers, volumes, images)
	@echo "Deep cleanup completed for $(PROJECT_NAME)"

clean-images: ## Remove project Docker images
	@echo "Removing $(PROJECT_NAME) project images..."
	@docker images --format '{{.Repository}}:{{.Tag}}' | grep "$(PROJECT_NAME)" | xargs -r docker rmi -f 2>/dev/null || true
	@docker images --format '{{.Repository}}:{{.Tag}}' | grep "<none>" | xargs -r docker rmi -f 2>/dev/null || true
	@echo "Project images removed."

# =============================================================================
# Aliases
# =============================================================================

up: development-up ## Alias for development-up
down: development-down ## Alias for development-down
logs: development-logs ## Alias for development-logs

# =============================================================================
# Help
# =============================================================================

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-24s\033[0m %s\n", $$1, $$2}'
