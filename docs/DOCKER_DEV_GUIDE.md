# Docker Development Environment Guide

One-command local development with **Next.js 14 + FastAPI + PostgreSQL 16 + Mailpit**.

---

## 🚀 Quick Start

```bash
# From project root
cd infra/docker
docker compose -f docker-compose.dev.yml up --build
```

Wait for all services to be healthy (about 30-60 seconds on first run).

---

## 🌐 Service URLs

| Service          | URL                           | Purpose                     |
| ---------------- | ----------------------------- | --------------------------- |
| **Frontend**     | http://localhost:3000         | Next.js application         |
| **Backend API**  | http://localhost:8000         | FastAPI (direct access)     |
| **Backend Docs** | http://localhost:8000/docs    | Swagger UI                  |
| **GraphQL**      | http://localhost:8000/graphql | GraphQL Playground          |
| **Mailpit UI**   | http://localhost:8025         | View sent emails            |
| **PostgreSQL**   | localhost:5432                | Database (use psql/pgAdmin) |
| **Redis**        | localhost:6379                | Cache (use redis-cli)       |

---

## 🔄 API Proxy Architecture

```
Browser Request:  GET http://localhost:3000/api/health
                  ↓ (Next.js rewrites)
Docker Internal:  GET http://backend:8000/health
                  ↓
Response flows back through Next.js to browser
```

**Why proxy through Next.js?**

- ✅ No CORS configuration needed
- ✅ Browser sees same-origin requests
- ✅ Simpler authentication token handling
- ✅ Works identically in development and production

---

## 📧 Test Email Flow

### Step 1: Start all services

```bash
docker compose -f docker-compose.dev.yml up --build
```

### Step 2: Send a test email via cURL

```bash
curl -X POST http://localhost:8000/dev/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "subject": "Hello", "body": "Test message from McLarens!"}'
```

### Step 3: View in Mailpit

Open http://localhost:8025 - you'll see the email in the inbox!

### Step 4: Test via frontend proxy

```bash
curl -X POST http://localhost:3000/dev/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "subject": "Via Proxy", "body": "This went through Next.js!"}'
```

---

## 🔧 Environment Variables

### Backend (set in docker-compose.dev.yml)

| Variable       | Value                            | Purpose                     |
| -------------- | -------------------------------- | --------------------------- |
| `DATABASE_URL` | `postgresql+asyncpg://...@db`    | Uses `db` service DNS name  |
| `REDIS_URL`    | `redis://redis:6379`             | Uses `redis` service name   |
| `SMTP_HOST`    | `mailpit`                        | Uses `mailpit` service name |
| `SMTP_PORT`    | `1025`                           | Mailpit SMTP port           |
| `AUTH_MODE`    | `dev`                            | Bypasses Microsoft login    |
| `CORS_ORIGINS` | `["http://localhost:3000", ...]` | Allowed origins             |

### Frontend (set in docker-compose.dev.yml)

| Variable              | Value                           | Purpose                  |
| --------------------- | ------------------------------- | ------------------------ |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/graphql` | Client-side GraphQL URL  |
| `BACKEND_URL`         | `http://backend:8000`           | Server-side proxy target |

---

## 🔍 Service DNS Names (Inside Docker)

**Important:** Inside containers, `localhost` refers to the container itself, not your host machine!

| Service Name | What It Resolves To  | Example Usage                     |
| ------------ | -------------------- | --------------------------------- |
| `db`         | PostgreSQL container | `DATABASE_URL=...@db:5432/...`    |
| `backend`    | FastAPI container    | `BACKEND_URL=http://backend:8000` |
| `frontend`   | Next.js container    | (rarely needed)                   |
| `mailpit`    | Mailpit container    | `SMTP_HOST=mailpit`               |
| `redis`      | Redis container      | `REDIS_URL=redis://redis:6379`    |

### ❌ Common Mistake

```yaml
# WRONG - localhost doesn't work inside containers!
DATABASE_URL: postgresql://...@localhost:5432/...

# CORRECT - use service name
DATABASE_URL: postgresql://...@db:5432/...
```

---

## 🔨 Useful Commands

### Start all services

```bash
docker compose -f docker-compose.dev.yml up --build
```

### Start in background (detached)

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

### View logs

```bash
# All services
docker compose -f docker-compose.dev.yml logs -f

# Specific service
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend
```

### Check service status

```bash
docker compose -f docker-compose.dev.yml ps
```

### Stop all services

```bash
docker compose -f docker-compose.dev.yml down
```

### Full reset (removes volumes/data)

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up --build
```

### Rebuild specific service

```bash
docker compose -f docker-compose.dev.yml up --build backend
```

### Run database only (for local dev without Docker frontend/backend)

```bash
docker compose -f docker-compose.dev.yml up db redis mailpit
```

Then run locally:

```bash
# Terminal 1: Backend
cd apps/api
uvicorn src.main:app --reload

# Terminal 2: Frontend
cd apps/frontend
npm run dev
```

---

## 🐛 Troubleshooting

### "Connection refused to backend"

1. Check if services are healthy:
   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```
2. Check backend logs:

   ```bash
   docker logs maclarens-backend
   ```

3. Wait for healthchecks to pass (especially database)

### "Database not ready" / "Connection refused to postgres"

The backend waits for database healthcheck. If issues persist:

```bash
# Check DB status
docker logs maclarens-db

# Try restarting just the DB
docker compose -f docker-compose.dev.yml restart db
```

### "Email not showing in Mailpit"

1. Verify SMTP settings in backend logs
2. Check the endpoint response:
   ```bash
   curl http://localhost:8000/dev/send-test-email \
     -H "Content-Type: application/json" \
     -d '{"to":"test@example.com","subject":"Test","body":"Hello"}'
   ```
3. If `smtp_host` shows something other than `mailpit`, check environment variables

### "Frontend hot reload not working"

1. Ensure volumes are mounted correctly in docker-compose.dev.yml
2. Try rebuilding:
   ```bash
   docker compose -f docker-compose.dev.yml up --build frontend
   ```

### "Port already in use"

Stop any local services using the same ports:

```bash
# Check what's using port 3000, 8000, 5432, etc.
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# Or kill existing Docker containers
docker ps
docker stop <container_id>
```

---

## 📁 File Structure

```
maclarens-analytics-v1/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   └── main.py          # FastAPI app with /dev/send-test-email
│   │   ├── Dockerfile.dev       # Dev Dockerfile with hot reload
│   │   └── requirements.txt     # Python dependencies
│   └── frontend/
│       ├── lib/
│       │   └── api.ts           # TypeScript API client
│       ├── next.config.js       # API rewrites configuration
│       ├── Dockerfile           # Production Dockerfile
│       └── Dockerfile.dev       # Dev Dockerfile with hot reload
└── infra/
    └── docker/
        └── docker-compose.dev.yml  # This environment
```

---

## ✅ Verification Checklist

After running `docker compose up --build`:

- [ ] All containers show "healthy" in `docker compose ps`
- [ ] http://localhost:3000 loads the frontend
- [ ] http://localhost:8000/docs shows Swagger UI
- [ ] http://localhost:8000/health returns `{"status":"healthy"}`
- [ ] http://localhost:3000/api/health returns same (proxied)
- [ ] http://localhost:8025 shows Mailpit UI
- [ ] Test email appears in Mailpit after sending via API
