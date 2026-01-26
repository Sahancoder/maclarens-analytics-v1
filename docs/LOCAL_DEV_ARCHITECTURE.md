# Local Development Architecture

Visual reference for running MacLarens Analytics locally without Docker.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Computer                            │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │   Browser    │    │   Terminal   │    │   Terminal   │    │
│  │              │    │              │    │              │    │
│  │ localhost:   │    │   Backend    │    │   Frontend   │    │
│  │   3000       │    │   Python     │    │   Next.js    │    │
│  └──────┬───────┘    │ FastAPI      │    │              │    │
│         │            │ Port 8000    │    │   Port 3000  │    │
│         │            └──────┬───────┘    └──────┬───────┘    │
│         │                   │                   │            │
│         │                   │                   │            │
│         └───────────────────┼───────────────────┘            │
│                             │                                │
│         ┌───────────────────┼────────────────────┐           │
│         │                   │                    │           │
│    ┌────▼─────┐      ┌──────▼──────┐     ┌──────▼──────┐   │
│    │PostgreSQL│      │   Mailpit   │     │   (Redis)   │   │
│    │          │      │             │     │  [Optional] │   │
│    │  Port    │      │ SMTP: 1025  │     │  Port 6379  │   │
│    │  5432    │      │ UI:   8025  │     │             │   │
│    └──────────┘      └─────────────┘     └─────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow

### Frontend → Backend API Call

```
┌──────────┐                                    ┌──────────┐
│ Browser  │                                    │ Backend  │
│          │                                    │ FastAPI  │
│ :3000    │                                    │ :8000    │
└────┬─────┘                                    └────┬─────┘
     │                                               │
     │  1. User clicks button                        │
     │                                               │
     │  2. Fetch /api/graphql                        │
     ├──────────────────────────────────────────────►│
     │     (Next.js rewrites /api/* to :8000)        │
     │                                               │
     │                                     3. Query DB
     │                                               │
     │                                     ┌─────────▼────────┐
     │                                     │   PostgreSQL     │
     │                                     │   :5432          │
     │                                     └─────────┬────────┘
     │                                               │
     │  4. Return JSON response                      │
     │◄──────────────────────────────────────────────┤
     │                                               │
     │  5. Render UI                                 │
     │                                               │
```

**Key Points:**
- Next.js rewrites `/api/*` → `http://localhost:8000/*`
- No CORS issues (same-origin from browser perspective)
- Backend connects directly to PostgreSQL

---

## 📧 Email Flow

```
┌──────────┐                  ┌──────────┐                  ┌──────────┐
│ Backend  │                  │ Mailpit  │                  │ Browser  │
│ FastAPI  │                  │          │                  │          │
└────┬─────┘                  └────┬─────┘                  └────┬─────┘
     │                             │                             │
     │  1. Send email via SMTP     │                             │
     ├────────────────────────────►│                             │
     │     localhost:1025          │                             │
     │                             │                             │
     │  2. Email stored            │                             │
     │                             │                             │
     │                             │  3. User opens Mailpit UI   │
     │                             │◄────────────────────────────┤
     │                             │     http://localhost:8025   │
     │                             │                             │
     │                             │  4. Display inbox           │
     │                             ├────────────────────────────►│
     │                             │                             │
```

**Key Points:**
- Backend sends to `localhost:1025` (Mailpit SMTP)
- No real emails sent (perfect for testing)
- View all emails in web UI at `:8025`

---

## 🗄️ Database Connections

```
                    ┌────────────────────────────┐
                    │      PostgreSQL            │
                    │      Port 5432             │
                    │                            │
                    │  Database: maclarens_...   │
                    │  User: finance_user        │
                    └───────────┬────────────────┘
                                │
                    ┌───────────┼────────────┐
                    │           │            │
            ┌───────▼──────┐    │    ┌───────▼──────┐
            │   Backend    │    │    │   pgAdmin    │
            │   FastAPI    │    │    │   DBeaver    │
            │              │    │    │   TablePlus  │
            │  SQLAlchemy  │    │    │              │
            │  asyncpg     │    │    │  (GUI tools) │
            └──────────────┘    │    └──────────────┘
                                │
                        ┌───────▼──────┐
                        │   psql CLI   │
                        │              │
                        │  (Command    │
                        │   line)      │
                        └──────────────┘
```

**Connection String:**
```
postgresql+asyncpg://finance_user:finance_pass@localhost:5432/maclarens_analytics
```

---

## 📁 File Structure

```
maclarens-analytics-v1/
│
├── apps/
│   ├── api/                    ← Backend
│   │   ├── .venv/              ← Python virtual environment
│   │   ├── .env                ← Backend config (create from .env.example)
│   │   ├── src/
│   │   │   └── main.py         ← FastAPI entry point
│   │   ├── alembic/            ← Database migrations
│   │   └── requirements.txt    ← Python dependencies
│   │
│   └── frontend/               ← Frontend
│       ├── .env.local          ← Frontend config (create from .env.local.example)
│       ├── app/                ← Next.js pages
│       ├── components/         ← React components
│       ├── next.config.js      ← Next.js config (has rewrites)
│       └── package.json        ← Node dependencies
│
├── docs/
│   ├── LOCAL_DEV_SETUP.md      ← Full setup guide
│   ├── LOCAL_DEV_CHECKLIST.md  ← Verification checklist
│   └── LOCAL_DEV_SUMMARY.md    ← Summary & quick ref
│
├── scripts/
│   ├── setup-database.sh       ← Linux/macOS DB setup
│   └── start-local-dev.sh      ← Linux/macOS startup
│
├── setup-database.ps1          ← Windows DB setup
├── start-local-dev.ps1         ← Windows startup
├── start-api.ps1               ← Start backend only
├── start-frontend.ps1          ← Start frontend only
├── QUICK_START.md              ← Fast setup guide
└── README.md                   ← Project overview
```

---

## 🔀 Environment Variable Flow

### Backend (.env)

```
apps/api/.env
│
├─► DATABASE_URL ────────────► PostgreSQL connection
├─► SMTP_HOST/PORT ──────────► Mailpit connection
├─► JWT_SECRET ──────────────► Token signing
├─► AUTH_MODE ───────────────► dev/entra switch
└─► CORS_ORIGINS ────────────► Frontend URL allowlist
```

### Frontend (.env.local)

```
apps/frontend/.env.local
│
├─► NEXTAUTH_URL ────────────► Auth callback URL
├─► NEXTAUTH_SECRET ─────────► Session encryption
├─► NEXT_PUBLIC_API_URL ─────► Backend endpoint (browser)
└─► NEXT_PUBLIC_AUTH_MODE ───► dev/entra switch
```

---

## 🌊 Data Flow Example: User Login

```
1. User enters credentials
   Browser (localhost:3000)
   │
   ▼
2. POST /api/auth/login
   Next.js rewrites to Backend (localhost:8000)
   │
   ▼
3. Validate credentials
   Backend queries PostgreSQL (localhost:5432)
   │
   ▼
4. Generate JWT token
   Backend signs token with JWT_SECRET
   │
   ▼
5. Return token
   Backend → Next.js → Browser
   │
   ▼
6. Store in session
   Browser stores token (httpOnly cookie)
   │
   ▼
7. Subsequent requests
   Browser sends token in headers
   Backend validates and authorizes
```

---

## 🚦 Service Health Checks

### Quick Health Check Script

**Windows (PowerShell):**
```powershell
# Check all services
Write-Host "PostgreSQL:" -ForegroundColor Yellow
psql -U postgres -c "SELECT 1;" 2>&1

Write-Host "`nBackend:" -ForegroundColor Yellow
curl http://localhost:8000/health

Write-Host "`nFrontend:" -ForegroundColor Yellow
curl http://localhost:3000

Write-Host "`nMailpit:" -ForegroundColor Yellow
curl http://localhost:8025
```

**Linux/macOS (Bash):**
```bash
#!/bin/bash
echo "PostgreSQL:"
psql -U postgres -c "SELECT 1;"

echo -e "\nBackend:"
curl -s http://localhost:8000/health | jq

echo -e "\nFrontend:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

echo -e "\nMailpit:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:8025
```

---

## 🔄 Development Cycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Cycle                        │
└─────────────────────────────────────────────────────────────┘

1. Start Services
   ├─ PostgreSQL (auto-start or manual)
   ├─ Mailpit (terminal/background)
   ├─ Backend (terminal)
   └─ Frontend (terminal)
              │
              ▼
2. Develop
   ├─ Edit backend code (.py)
   │  └─ Uvicorn auto-reloads
   ├─ Edit frontend code (.tsx)
   │  └─ Next.js auto-refreshes
   └─ Database changes
      └─ Create migration, apply
              │
              ▼
3. Test
   ├─ Browser testing
   ├─ API testing (Swagger)
   ├─ GraphQL testing (Playground)
   └─ Email testing (Mailpit)
              │
              ▼
4. Debug
   ├─ Backend logs (terminal)
   ├─ Frontend logs (terminal + browser console)
   ├─ Database logs (PostgreSQL)
   └─ Network tab (browser DevTools)
              │
              ▼
5. Commit
   └─ Git commit changes
              │
              ▼
6. Stop Services
   └─ Ctrl+C in each terminal
```

---

## 💡 Tips & Best Practices

### Performance
- ✅ Backend hot-reload is fast with uvicorn
- ✅ Frontend HMR (Hot Module Replacement) works great
- ✅ No Docker overhead = faster startup

### Database
- ✅ Use migrations for all schema changes
- ✅ Seed data with scripts, not manual SQL
- ✅ Use pgAdmin/DBeaver for visual exploration

### Email Testing
- ✅ Mailpit catches all emails
- ✅ No risk of sending real emails
- ✅ Great for testing email templates

### Environment
- ✅ Keep .env files out of Git (.gitignore)
- ✅ Use .env.example as template
- ✅ Document all required variables

---

## 🔗 Port Reference

| Port | Service | Protocol | Access |
|------|---------|----------|--------|
| 3000 | Frontend | HTTP | http://localhost:3000 |
| 8000 | Backend API | HTTP | http://localhost:8000 |
| 8000 | Swagger Docs | HTTP | http://localhost:8000/docs |
| 8000 | GraphQL | HTTP | http://localhost:8000/graphql |
| 5432 | PostgreSQL | TCP | localhost:5432 |
| 1025 | Mailpit SMTP | SMTP | localhost:1025 |
| 8025 | Mailpit UI | HTTP | http://localhost:8025 |
| 6379 | Redis (optional) | TCP | localhost:6379 |

---

**Ready to start?** → [QUICK_START.md](../QUICK_START.md) 🚀
