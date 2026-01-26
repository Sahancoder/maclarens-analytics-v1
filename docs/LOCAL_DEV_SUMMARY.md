# Local Development Setup - Summary

**✅ Complete! You now have everything needed to run MacLarens Analytics locally without Docker.**

---

## 📁 Files Created

### Documentation
1. **[QUICK_START.md](../QUICK_START.md)** - Fast 5-minute setup guide
2. **[docs/LOCAL_DEV_SETUP.md](LOCAL_DEV_SETUP.md)** - Complete detailed guide with troubleshooting
3. **[docs/LOCAL_DEV_CHECKLIST.md](LOCAL_DEV_CHECKLIST.md)** - Step-by-step verification checklist

### Scripts (Windows)
4. **[setup-database.ps1](../setup-database.ps1)** - Automated PostgreSQL database setup
5. **[start-local-dev.ps1](../start-local-dev.ps1)** - Start all services (backend + frontend + mailpit)

### Scripts (macOS/Linux)
6. **[scripts/setup-database.sh](../scripts/setup-database.sh)** - Automated PostgreSQL database setup
7. **[scripts/start-local-dev.sh](../scripts/start-local-dev.sh)** - Start all services

### Configuration Templates
8. **[apps/api/.env.example](../apps/api/.env.example)** - Enhanced with detailed comments
9. **[apps/frontend/.env.local.example](../apps/frontend/.env.local.example)** - Enhanced with detailed comments

### Updated Files
10. **[README.md](../README.md)** - Added local development options section

---

## 🚀 Quick Start Reference

### Windows

```powershell
# One-time setup
.\setup-database.ps1

# Daily development
.\start-local-dev.ps1
```

### macOS/Linux

```bash
# One-time setup
chmod +x scripts/setup-database.sh scripts/start-local-dev.sh
./scripts/setup-database.sh

# Daily development
./scripts/start-local-dev.sh
```

### Manual Setup

```bash
# 1. Create database
psql -U postgres
CREATE DATABASE maclarens_analytics;
CREATE USER finance_user WITH PASSWORD 'finance_pass';
GRANT ALL PRIVILEGES ON DATABASE maclarens_analytics TO finance_user;
\q

# 2. Backend setup
cd apps/api
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn src.main:app --reload --port 8000

# 3. Frontend setup (new terminal)
cd apps/frontend
npm install
cp .env.local.example .env.local
npm run dev

# 4. Email testing (optional, new terminal)
mailpit
```

---

## 🌐 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Main application |
| Backend API | http://localhost:8000 | API root |
| Swagger Docs | http://localhost:8000/docs | Interactive API documentation |
| GraphQL Playground | http://localhost:8000/graphql | GraphQL interface |
| Mailpit (Email) | http://localhost:8025 | Local email testing inbox |

---

## 📋 Prerequisites

### Required Software

- **PostgreSQL 15/16**
  - Windows: https://www.postgresql.org/download/windows/
  - macOS: `brew install postgresql@16`
  - Linux: `sudo apt install postgresql`

- **Python 3.11+**
  - Windows/macOS: https://www.python.org/downloads/
  - Linux: `sudo apt install python3.11 python3.11-venv`

- **Node.js 18+**
  - All platforms: https://nodejs.org/

### Optional but Recommended

- **Mailpit** (email testing)
  - Windows: `scoop install mailpit`
  - macOS: `brew install mailpit`
  - Linux: Download from https://github.com/axllent/mailpit/releases

---

## 🔑 Key Configuration

### Backend (.env)

```env
DATABASE_URL=postgresql+asyncpg://finance_user:finance_pass@localhost:5432/maclarens_analytics
AUTH_MODE=dev
SMTP_HOST=localhost
SMTP_PORT=1025
JWT_SECRET=your-secret-key-min-32-chars
DEBUG=true
CORS_ORIGINS=["http://localhost:3000"]
```

### Frontend (.env.local)

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-min-32-chars
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_MODE=dev
```

---

## 🛠️ Common Commands

### Database Management

```bash
# View migrations
alembic history

# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Development

```bash
# Backend tests
cd apps/api
pytest

# Frontend dev
cd apps/frontend
npm run dev

# Frontend build
npm run build

# Frontend lint
npm run lint
```

---

## 🐛 Troubleshooting Quick Reference

### PostgreSQL not found
```powershell
# Windows - Add to PATH
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"
```

### Virtual environment activation
```bash
# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate
```

### Port conflicts
```powershell
# Windows - Kill process on port 8000
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process

# macOS/Linux
lsof -ti:8000 | xargs kill
```

### Database connection test
```bash
psql -U finance_user -d maclarens_analytics -c "SELECT current_database();"
```

---

## 📖 Documentation Map

```
README.md                          ← Start here (overview)
  ├── QUICK_START.md              ← Fast 5-minute setup
  │
  ├── docs/
  │   ├── LOCAL_DEV_SETUP.md      ← Complete detailed guide
  │   ├── LOCAL_DEV_CHECKLIST.md  ← Verification checklist
  │   ├── DOCKER_DEV_GUIDE.md     ← Docker alternative
  │   └── database.md             ← Schema documentation
  │
  └── scripts/
      ├── setup-database.ps1      ← Windows DB setup
      ├── start-local-dev.ps1     ← Windows startup
      ├── setup-database.sh       ← Linux/macOS DB setup
      └── start-local-dev.sh      ← Linux/macOS startup
```

---

## ✅ Next Steps

1. **Choose your platform**: Windows, macOS, or Linux
2. **Install prerequisites**: PostgreSQL, Python, Node.js
3. **Run setup script**: `setup-database.ps1` or `setup-database.sh`
4. **Start development**: `start-local-dev.ps1` or `start-local-dev.sh`
5. **Verify setup**: Check [LOCAL_DEV_CHECKLIST.md](LOCAL_DEV_CHECKLIST.md)

---

## 🎯 Development Workflow

### Daily Routine

1. **Start services**
   - Option A: `./start-local-dev.ps1` (automated)
   - Option B: Manual terminals (backend, frontend, mailpit)

2. **Develop**
   - Backend: Edit Python files, server auto-reloads
   - Frontend: Edit React/TypeScript, page auto-refreshes
   - Database: Use migrations for schema changes

3. **Test**
   - Backend: `pytest`
   - Frontend: Browser testing
   - Email: Check Mailpit inbox

4. **Stop services**
   - Press `Ctrl+C` in each terminal
   - Or close terminal windows

---

## 🆘 Support

If you encounter issues:

1. Check **[LOCAL_DEV_SETUP.md](LOCAL_DEV_SETUP.md)** - Common Issues section
2. Verify **[LOCAL_DEV_CHECKLIST.md](LOCAL_DEV_CHECKLIST.md)** - All items checked
3. Review logs in each terminal for error messages
4. Check service health:
   - PostgreSQL: `psql -U postgres -c "SELECT version();"`
   - Backend: http://localhost:8000/health
   - Frontend: http://localhost:3000

---

## 🎉 You're All Set!

Your local development environment is ready. Happy coding! 🚀

**Key Resources:**
- [QUICK_START.md](../QUICK_START.md) - Quick reference
- [LOCAL_DEV_SETUP.md](LOCAL_DEV_SETUP.md) - Full guide
- [LOCAL_DEV_CHECKLIST.md](LOCAL_DEV_CHECKLIST.md) - Verification
