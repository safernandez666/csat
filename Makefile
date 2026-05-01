.PHONY: help build up down logs dev-backend dev-frontend test

help: ## Show this help
	@echo "CSAT — Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build Docker images
	docker compose build

up: ## Start all services in background
	docker compose up -d

down: ## Stop all services
	docker compose down

logs: ## Follow logs
	docker compose logs -f

dev-backend: ## Run backend locally (requires venv)
	cd backend && python run.py

dev-frontend: ## Run frontend locally (requires npm install)
	cd frontend && npm run dev

test: ## Run ship-safe security audit
	npx ship-safe audit .
