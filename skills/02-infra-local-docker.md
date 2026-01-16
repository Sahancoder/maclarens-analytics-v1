# Skill: Local Infrastructure (Docker Compose)

## Goal

Spin up PostgreSQL + Redis locally with one command.

## Requirements

- Docker + Docker Compose installed

## Tasks

1. Create `infra/docker/docker-compose.yml` with:
   - postgres:15+
   - redis:7+
   - volumes for persistence
   - healthchecks
2. Create `infra/docker/.env.example`
3. Document quickstart commands

## Acceptance checks

- `docker-compose -f infra/docker/docker-compose.yml up -d`
- Postgres is reachable from API container or host
- Redis is reachable from API
