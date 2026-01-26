# MacLarens Analytics - Local Development Quick Start

**Fast setup guide for running locally without Docker** 🚀

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] **PostgreSQL 15+** installed and running
- [ ] **Python 3.11+** installed
- [ ] **Node.js 18+** installed
- [ ] **Mailpit** installed (optional, for email testing)

---

## 🚀 One-Command Setup

### Windows (PowerShell)

```powershell
# 1. Set up database
.\setup-database.ps1

# 2. Start all services
.\start-local-dev.ps1
```

### macOS/Linux

```bash
# 1. Set up database
chmod +x scripts/setup-database.sh
./scripts/setup-database.sh

# 2. Start all services
chmod +x scripts/start-local-dev.sh
./scripts/start-local-dev.sh
```

---

## ⚡ Manual Setup (5 minutes)

### 1. Database Setup

```bash
# Create database and user
psql -U postgres

CREATE DATABASE maclarens_analytics;
CREATE USER finance_user WITH PASSWORD 'finance_pass';
GRANT ALL PRIVILEGES ON DATABASE maclarens_analytics TO finance_user;
\c maclarens_analytics
GRANT ALL ON SCHEMA public TO finance_user;
\q
```

### 2. Backend Setup

```bash
cd apps/api

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate
# Activate (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env and update DATABASE_URL if needed

# Run migrations
alembic upgrade head

# Start backend
uvicorn src.main:app --reload --port 8000
```

**✅ Backend running at http://localhost:8000/docs**

### 3. Frontend Setup

```bash
cd apps/frontend

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local
# Edit .env.local if needed

# Start frontend
npm run dev
```

**✅ Frontend running at http://localhost:3000**

### 4. Email Testing (Optional)

```bash
# Install Mailpit
# Windows: scoop install mailpit
# macOS: brew install mailpit
# Linux: Download from github.com/axllent/mailpit/releases

# Start Mailpit
mailpit
```

**✅ Email UI at http://localhost:8025**

---

## 🌐 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main application |
| **Backend API** | http://localhost:8000 | API base |
| **Swagger Docs** | http://localhost:8000/docs | Interactive API docs |
| **GraphQL** | http://localhost:8000/graphql | GraphQL playground |
| **Mailpit** | http://localhost:8025 | Email inbox |

---

## 📁 Environment Files

### Backend (.env)

Location: `apps/api/.env`

```env
DATABASE_URL=postgresql+asyncpg://finance_user:finance_pass@localhost:5432/maclarens_analytics
AUTH_MODE=dev
SMTP_HOST=localhost
SMTP_PORT=1025
JWT_SECRET=your-secret-key-here
DEBUG=true
```

### Frontend (.env.local)

Location: `apps/frontend/.env.local`

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_MODE=dev
```

---

## 🔧 Common Commands

### Database

```bash
# Run migrations
cd apps/api && alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# Rollback one migration
alembic downgrade -1

# Reset database
alembic downgrade base && alembic upgrade head
```

### Backend

```bash
# Start backend
cd apps/api
.venv\Scripts\activate  # or source .venv/bin/activate
uvicorn src.main:app --reload --port 8000

# Run tests
pytest

# Seed data
python seed_standalone.py
```

### Frontend

```bash
# Start frontend
cd apps/frontend
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

---

## 🐛 Troubleshooting

### "psql: command not found"

Add PostgreSQL to PATH:
```powershell
# Windows
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"
```

### Database connection failed

Check credentials and ensure PostgreSQL is running:
```bash
# Test connection
psql -U finance_user -d maclarens_analytics

# If fails, check service
# Windows: services.msc → postgresql-x64-16
# macOS: brew services list
# Linux: sudo systemctl status postgresql
```

### Port already in use

**Backend (8000):**
```powershell
# Windows
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process

# macOS/Linux
lsof -ti:8000 | xargs kill
```

**Frontend (3000):**
```powershell
# Windows
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# macOS/Linux
lsof -ti:3000 | xargs kill
```

### Frontend can't connect to backend

1. Verify backend is running: http://localhost:8000/docs
2. Check CORS settings in `apps/api/.env`
3. Verify rewrites in `apps/frontend/next.config.js`

---

## 📚 Full Documentation

For detailed setup instructions, see:
- [Complete Local Dev Guide](docs/LOCAL_DEV_SETUP.md)
- [Database Schema](docs/database.md)
- [Authentication Guide](docs/auth-migration-guide.md)
- [Docker Guide](docs/DOCKER_DEV_GUIDE.md) (alternative)

---

## 🆘 Need Help?

Check the logs for error messages:

**Backend logs:** Terminal where you ran `uvicorn`
**Frontend logs:** Terminal where you ran `npm run dev`
**PostgreSQL logs:** Check PostgreSQL data directory

Still stuck? Check [Common Issues](docs/LOCAL_DEV_SETUP.md#-common-issues--solutions)

---

**Happy coding!** 🎉
