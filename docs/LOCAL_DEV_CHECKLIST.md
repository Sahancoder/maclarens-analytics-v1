# Local Development Setup Checklist

Use this checklist to ensure your local development environment is properly configured.

---

## 📋 Pre-Setup Checklist

### System Requirements

- [ ] **Operating System**: Windows 10/11, macOS 11+, or Linux (Ubuntu 20.04+)
- [ ] **RAM**: Minimum 8GB (16GB recommended)
- [ ] **Disk Space**: At least 5GB free

### Required Software

- [ ] **PostgreSQL 15 or 16** installed
  - Windows: Downloaded from postgresql.org
  - macOS: `brew install postgresql@16`
  - Linux: `sudo apt install postgresql`
  
- [ ] **Python 3.11+** installed
  - Verify: `python --version` or `python3 --version`
  
- [ ] **Node.js 18+** installed
  - Verify: `node --version`
  - npm also installed: `npm --version`

### Optional but Recommended

- [ ] **Mailpit** for email testing
  - Windows: `scoop install mailpit`
  - macOS: `brew install mailpit`
  - Linux: Download from GitHub releases
  
- [ ] **Git** for version control
  
- [ ] **VS Code** or preferred IDE

---

## 🗄️ Database Setup Checklist

### PostgreSQL Service

- [ ] PostgreSQL service is running
  - Windows: Check Services (services.msc)
  - macOS: `brew services list`
  - Linux: `sudo systemctl status postgresql`

### Database Creation

- [ ] Database `maclarens_analytics` created
- [ ] User `finance_user` created with password `finance_pass`
- [ ] Permissions granted to user
- [ ] Connection test successful

**Quick Test:**
```bash
psql -U finance_user -d maclarens_analytics -c "SELECT current_database();"
```

**Expected Output:** `maclarens_analytics`

---

## 🐍 Backend Setup Checklist

### Environment Setup

- [ ] Virtual environment created at `apps/api/.venv`
- [ ] Virtual environment activated
- [ ] Dependencies installed from `requirements.txt`
- [ ] `.env` file created (copied from `.env.example`)

### Configuration

- [ ] `DATABASE_URL` updated in `.env` if needed
- [ ] `JWT_SECRET` is a strong random string (32+ characters)
- [ ] `AUTH_MODE` set to `dev`
- [ ] SMTP settings configured (Mailpit defaults OK)
- [ ] `CORS_ORIGINS` includes `http://localhost:3000`

### Database Migrations

- [ ] Alembic migrations run successfully
  ```bash
  cd apps/api
  source .venv/bin/activate  # or .venv\Scripts\activate on Windows
  alembic upgrade head
  ```

### Test Backend

- [ ] Backend starts without errors
  ```bash
  uvicorn src.main:app --reload --port 8000
  ```
  
- [ ] Swagger docs accessible at http://localhost:8000/docs
- [ ] GraphQL playground accessible at http://localhost:8000/graphql
- [ ] Health check endpoint returns 200: http://localhost:8000/health

---

## 🎨 Frontend Setup Checklist

### Environment Setup

- [ ] Node modules installed
  ```bash
  cd apps/frontend
  npm install
  ```
  
- [ ] `.env.local` file created (copied from `.env.local.example`)

### Configuration

- [ ] `NEXTAUTH_URL` set to `http://localhost:3000`
- [ ] `NEXTAUTH_SECRET` is a strong random string (32+ characters)
- [ ] `NEXT_PUBLIC_API_URL` set to `http://localhost:8000`
- [ ] `NEXT_PUBLIC_AUTH_MODE` matches backend (`dev`)

### Test Frontend

- [ ] Frontend starts without errors
  ```bash
  npm run dev
  ```
  
- [ ] Application accessible at http://localhost:3000
- [ ] No console errors in browser developer tools
- [ ] API requests successfully proxied to backend

---

## 📧 Email Setup Checklist (Optional)

### Mailpit Installation

- [ ] Mailpit installed and available in PATH
- [ ] Mailpit starts successfully: `mailpit`
- [ ] SMTP server running on port 1025
- [ ] Web UI accessible at http://localhost:8025

### Backend Configuration

- [ ] `SMTP_HOST=localhost` in `apps/api/.env`
- [ ] `SMTP_PORT=1025` in `apps/api/.env`
- [ ] `SMTP_USE_TLS=false` in `apps/api/.env`

### Test Email

- [ ] Send test email from backend
- [ ] Email appears in Mailpit inbox

---

## 🔗 Integration Testing Checklist

### Basic Connectivity

- [ ] Frontend can reach backend (no CORS errors)
- [ ] GraphQL queries work from frontend
- [ ] API calls return expected responses

### Authentication Flow

- [ ] Login page loads
- [ ] Can create test user (if seeded)
- [ ] Login successful with valid credentials
- [ ] JWT token stored correctly
- [ ] Protected routes work after login

### Database Operations

- [ ] Can query data from database
- [ ] Can create new records
- [ ] Can update existing records
- [ ] Can delete records
- [ ] Transactions work correctly

---

## 🧪 Optional: Data Seeding

### Seed Scripts

- [ ] Seed script exists: `apps/api/seed_standalone.py`
- [ ] Seed script runs successfully
- [ ] Database populated with test data

**Run Seed:**
```bash
cd apps/api
source .venv/bin/activate
python seed_standalone.py
```

---

## ✅ Final Verification

### All Services Running

Start all services and verify:

1. **PostgreSQL**
   - [ ] Service running
   - [ ] Accepting connections on port 5432

2. **Mailpit** (optional)
   - [ ] Running in background or separate terminal
   - [ ] Web UI accessible

3. **Backend API**
   - [ ] Running on port 8000
   - [ ] Swagger docs work
   - [ ] GraphQL playground works
   - [ ] Health check passes

4. **Frontend**
   - [ ] Running on port 3000
   - [ ] Pages load correctly
   - [ ] No console errors
   - [ ] Can communicate with backend

### Quick Test Matrix

| Test | URL | Expected Result | Status |
|------|-----|-----------------|--------|
| Frontend Home | http://localhost:3000 | Page loads | [ ] |
| Backend Docs | http://localhost:8000/docs | Swagger UI loads | [ ] |
| GraphQL | http://localhost:8000/graphql | Playground loads | [ ] |
| Health Check | http://localhost:8000/health | {"status": "ok"} | [ ] |
| Mailpit UI | http://localhost:8025 | Inbox UI loads | [ ] |

---

## 🐛 Common Issues

### Issue: psql not found

**Solution:**
- Add PostgreSQL bin to PATH
- Windows: `C:\Program Files\PostgreSQL\16\bin`
- Restart terminal after adding to PATH

### Issue: Python module not found

**Solution:**
- Ensure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`

### Issue: Port already in use

**Solution:**
```bash
# Windows
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process

# macOS/Linux
lsof -ti:8000 | xargs kill
```

### Issue: Database connection refused

**Solution:**
- Check PostgreSQL service is running
- Verify connection string in `.env`
- Test connection: `psql -U finance_user -d maclarens_analytics`

### Issue: Frontend 404 on API calls

**Solution:**
- Verify backend is running
- Check `next.config.js` rewrites configuration
- Ensure `NEXT_PUBLIC_API_URL` is correct

---

## 📊 Development Workflow

### Daily Startup Routine

1. [ ] Start PostgreSQL (auto-starts on Windows, manual on macOS/Linux)
2. [ ] Start Mailpit: `mailpit`
3. [ ] Start Backend: `./start-api.ps1` or `./scripts/start-api.sh`
4. [ ] Start Frontend: `./start-frontend.ps1` or `./scripts/start-frontend.sh`

### Or Use All-in-One Script

- [ ] Windows: `./start-local-dev.ps1`
- [ ] macOS/Linux: `./scripts/start-local-dev.sh`

---

## 🎓 Next Steps

Once everything is checked off:

1. [ ] Read [QUICK_START.md](../QUICK_START.md) for common commands
2. [ ] Review [docs/LOCAL_DEV_SETUP.md](LOCAL_DEV_SETUP.md) for detailed info
3. [ ] Check [docs/database.md](database.md) for schema documentation
4. [ ] Review [docs/auth-migration-guide.md](auth-migration-guide.md) for auth info

---

**✅ All checked? You're ready to start developing!** 🚀
