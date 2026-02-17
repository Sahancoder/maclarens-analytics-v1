---
description: Run full stack in Docker with hot reload (DB, Redis, Backend, Frontend, Mailpit)
---

# Local Development Workflow (Full Docker)

All services run in Docker containers with hot reload enabled.

## Prerequisites

- Docker Desktop must be running

## Steps

// turbo-all

1. Stop any existing Docker containers and clean up

```powershell
docker compose -f infra/docker/docker-compose.dev.yml down
```

2. Build and start ALL services

```powershell
docker compose -f infra/docker/docker-compose.dev.yml up --build -d
```

3. Wait for services to be healthy, then verify

```powershell
Start-Sleep -Seconds 10; docker compose -f infra/docker/docker-compose.dev.yml ps
```

4. Verify backend health

```powershell
Start-Sleep -Seconds 5; curl http://localhost:8000/health
```

5. Tail logs (optional, opens in new terminal)

```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "docker compose -f 'c:\Users\Sahan\Desktop\maclarens-analytics-v1\infra\docker\docker-compose.dev.yml' logs -f backend frontend"
```

## Service URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs
- GraphQL: http://localhost:8000/graphql
- Mailpit: http://localhost:8025
- PostgreSQL: localhost:5433 (user: postgres, pass: postgres)
- Redis: localhost:6379

## Hot Reload

- **Frontend**: Edit files in `apps/frontend/` → Next.js auto-reloads in the container
- **Backend**: Edit files in `apps/api/src/` → Uvicorn auto-reloads in the container

## Stopping

```powershell
docker compose -f infra/docker/docker-compose.dev.yml down
```

## Full Reset (wipe DB & volumes)

```powershell
docker compose -f infra/docker/docker-compose.dev.yml down -v
```

## Env files

- Docker env: `infra/docker/.env` → AUTH_MODE, Azure AD credentials
- Backend env vars are set in docker-compose.dev.yml (DATABASE_URL uses container DNS)
- Frontend env vars are set in docker-compose.dev.yml (BACKEND_URL=http://backend:8000)
