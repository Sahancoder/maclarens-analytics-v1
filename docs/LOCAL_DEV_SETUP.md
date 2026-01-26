# Local Development Setup (No Docker)

Complete guide to run **Frontend + Backend + PostgreSQL** locally without Docker.

---

## 📋 Prerequisites

### 1️⃣ PostgreSQL

**Install PostgreSQL 15 or 16:**

**Windows:**
- Download from: https://www.postgresql.org/download/windows/
- During installation:
  - Port: `5432`
  - Username: `postgres`
  - Password: (choose a secure password)
- Add to PATH: `C:\Program Files\PostgreSQL\16\bin`

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Optional DB Tools:**
- pgAdmin (bundled with Windows installer)
- DBeaver: https://dbeaver.io/
- TablePlus: https://tableplus.com/

---

### 2️⃣ Python 3.11+

**Windows:**
- Download from: https://www.python.org/downloads/
- ✅ Check "Add Python to PATH" during installation

**macOS:**
```bash
brew install python@3.11
```

**Linux:**
```bash
sudo apt install python3.11 python3.11-venv python3-pip
```

Verify:
```bash
python --version  # Should show 3.11+
```

---

### 3️⃣ Node.js 18+

**Windows/macOS:**
- Download from: https://nodejs.org/ (LTS version recommended)

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify:
```bash
node --version  # Should show v18 or v20
npm --version
```

---

## 🗄️ Database Setup

### Create the database

**Option 1: Using psql command line**

```bash
psql -U postgres
```

Then run:
```sql
CREATE DATABASE maclarens_analytics;
CREATE USER finance_user WITH PASSWORD 'finance_pass';
GRANT ALL PRIVILEGES ON DATABASE maclarens_analytics TO finance_user;

-- Grant schema permissions (PostgreSQL 15+)
\c maclarens_analytics
GRANT ALL ON SCHEMA public TO finance_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO finance_user;
```

Exit:
```sql
\q
```

**Option 2: Using pgAdmin GUI**

1. Open pgAdmin
2. Right-click "Databases" → "Create" → "Database"
3. Database name: `maclarens_analytics`
4. Owner: Create new role `finance_user` with password `finance_pass`

---

## 🔧 Backend Setup (FastAPI)

### 1. Navigate to backend directory

```bash
cd apps/api
```

### 2. Create virtual environment

**Windows:**
```bash
python -m venv .venv
.venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

You should see `(.venv)` in your terminal prompt.

### 3. Install dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Create `.env` file

Create `apps/api/.env`:

```env
# Database
DATABASE_URL=postgresql+asyncpg://finance_user:finance_pass@localhost:5432/maclarens_analytics

# Redis (optional - only needed if you use caching features)
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=local-dev-super-secret-key-change-in-production-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Auth Mode
AUTH_MODE=dev

# Email (Mailpit for local testing)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@maclarens.local
SMTP_USE_TLS=false

# App Configuration
DEBUG=true
ENVIRONMENT=development
LOG_LEVEL=INFO

# CORS
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]

# Azure (optional - only for Microsoft Entra ID auth)
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
```

### 5. Run database migrations

```bash
alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade -> abc123, initial schema
INFO  [alembic.runtime.migration] Running upgrade abc123 -> def456, add users table
...
```

### 6. (Optional) Seed database with test data

If you have seed scripts:

```bash
python seed_standalone.py
```

### 7. Start the backend server

```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

✅ Backend running at:
- API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs
- GraphQL: http://localhost:8000/graphql

---

## 📧 Email Setup (Local)

For local development, use **Mailpit** to catch emails without sending real emails.

### Install Mailpit

**Windows:**
```powershell
# Using Scoop
scoop install mailpit

# Or download binary from:
# https://github.com/axllent/mailpit/releases
```

**macOS:**
```bash
brew install mailpit
```

**Linux:**
```bash
# Download latest release
wget https://github.com/axllent/mailpit/releases/download/v1.12.0/mailpit-linux-amd64.tar.gz
tar -xzf mailpit-linux-amd64.tar.gz
sudo mv mailpit /usr/local/bin/
```

### Run Mailpit

```bash
mailpit
```

✅ Mailpit running at:
- SMTP Server: `localhost:1025` (configured in backend `.env`)
- Web UI: http://localhost:8025

All emails sent by the backend will appear in the Mailpit inbox.

---

## 🎨 Frontend Setup (Next.js)

### 1. Navigate to frontend directory

```bash
cd apps/frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env.local` file

Create `apps/frontend/.env.local`:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=local-nextauth-secret-min-32-characters-random-string

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:8000/graphql

# Auth Mode (matches backend)
NEXT_PUBLIC_AUTH_MODE=dev

# Microsoft Entra ID (optional - only if using Azure AD)
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
```

### 4. Start the frontend

```bash
npm run dev
```

✅ Frontend running at:
- http://localhost:3000

---

## 🚀 Quick Start Scripts

Use the provided PowerShell scripts for easy startup:

### Start Backend
```powershell
.\start-api.ps1
```

### Start Frontend
```powershell
.\start-frontend.ps1
```

### Start Everything
```powershell
# Terminal 1: Backend
.\start-api.ps1

# Terminal 2: Frontend
.\start-frontend.ps1

# Terminal 3: Mailpit
mailpit
```

---

## 🔧 Common Issues & Solutions

### ❌ "psql: command not found"

**Fix:** Add PostgreSQL to PATH

**Windows:**
```powershell
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"
```

**Permanent fix:** Edit System Environment Variables → Path → Add PostgreSQL bin folder

---

### ❌ Port 5432 already in use

Another PostgreSQL instance is running.

**Windows:**
```powershell
# Check running Postgres
Get-Process postgres

# Stop service
Stop-Service postgresql-x64-16
```

**macOS/Linux:**
```bash
# Check what's using port 5432
sudo lsof -i :5432

# Stop PostgreSQL
brew services stop postgresql@16  # macOS
sudo systemctl stop postgresql    # Linux
```

---

### ❌ "ModuleNotFoundError" in Python

Virtual environment not activated.

**Activate venv:**
```bash
# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate
```

---

### ❌ Frontend can't reach backend (404 errors)

1. Verify backend is running: http://localhost:8000/docs
2. Check Next.js rewrite config in [next.config.js](../apps/frontend/next.config.js)
3. Verify `NEXT_PUBLIC_API_URL=http://localhost:8000` in frontend `.env.local`

---

### ❌ CORS errors

The Next.js rewrite config should prevent CORS issues. If you still see them:

1. Check backend `.env`: `CORS_ORIGINS=["http://localhost:3000"]`
2. Restart both servers
3. Clear browser cache

---

### ❌ Database connection failed

**Check connection string:**
```bash
# Test connection
psql -U finance_user -h localhost -d maclarens_analytics
```

**Verify .env:**
```env
DATABASE_URL=postgresql+asyncpg://finance_user:finance_pass@localhost:5432/maclarens_analytics
```

**Grant permissions:**
```sql
-- Connect as postgres superuser
psql -U postgres -d maclarens_analytics

-- Grant all permissions
GRANT ALL PRIVILEGES ON DATABASE maclarens_analytics TO finance_user;
GRANT ALL ON SCHEMA public TO finance_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO finance_user;
```

---

## 📝 Daily Development Workflow

**1. Start PostgreSQL**
   - Windows: Runs as service (automatic)
   - macOS: `brew services start postgresql@16`
   - Linux: `sudo systemctl start postgresql`

**2. Start Mailpit** (Terminal 1)
```bash
mailpit
```

**3. Start Backend** (Terminal 2)
```bash
cd apps/api
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # macOS/Linux
uvicorn src.main:app --reload --port 8000
```

**4. Start Frontend** (Terminal 3)
```bash
cd apps/frontend
npm run dev
```

**5. Open Browser**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/docs
   - Email Inbox: http://localhost:8025

---

## 🧪 Testing Setup

### Backend Tests

```bash
cd apps/api
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pytest
```

### Frontend Tests

```bash
cd apps/frontend
npm test
```

---

## 📊 Database Management

### View migrations history

```bash
cd apps/api
alembic history
```

### Create new migration

```bash
alembic revision --autogenerate -m "description of changes"
```

### Rollback migration

```bash
alembic downgrade -1  # Rollback one migration
```

### Reset database

```bash
alembic downgrade base  # Remove all migrations
alembic upgrade head    # Reapply all migrations
```

---

## 🔐 Development Authentication

With `AUTH_MODE=dev`, the backend provides simplified authentication:

**Test credentials:**
- Username: `admin@maclarens.com`
- Password: (set during seeding or check seed scripts)

**Skip Microsoft Entra ID** during local development.

---

## 📦 VS Code Setup (Optional)

Recommended extensions:

- **Python** (Microsoft)
- **Pylance** (Microsoft)
- **ESLint** (Dirk Baeumer)
- **Prettier** (Prettier)
- **PostgreSQL** (Chris Kolkman)

Create `.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/apps/api/.venv/bin/python",
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## 🆘 Need Help?

If you encounter issues:

1. Check logs in terminal for error messages
2. Verify all environment variables in `.env` files
3. Ensure all services are running (Postgres, Backend, Frontend, Mailpit)
4. Check [Common Issues](#-common-issues--solutions) section above

---

**✅ You're all set!** Happy coding! 🚀
