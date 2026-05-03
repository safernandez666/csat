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

push-backend: ## Build and push multi-platform backend image to Docker Hub
	cd backend && docker buildx build --builder multiarch --platform linux/amd64,linux/arm64 -t safernandez666/csat-backend:latest --push .

push-frontend: ## Build and push multi-platform frontend image to Docker Hub
	cd frontend && docker buildx build --builder multiarch --platform linux/amd64,linux/arm64 -t safernandez666/csat-frontend:latest --push .

push-all: push-backend push-frontend ## Build and push both images to Docker Hub
