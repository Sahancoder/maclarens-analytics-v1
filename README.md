# MacLarens Analytics

A comprehensive analytics platform for financial reporting and management, featuring role-based dashboards for Data Officers, Finance Directors, CEOs, and Administrators.

## 🏗 Architecture

- **Frontend**: Next.js 14 (App Router)
- **Backend**: FastAPI (Python 3.11)
- **Database**: PostgreSQL 16
- **Email**: Mailpit (local) / SMTP (prod)
- **Infrastructure**: Docker Compose

---

## 🚀 Quick Start (Recommended)

The easiest way to run the entire project is using **Docker**. This ensures all dependencies (Database, Redis, Mailpit) are configured correctly.

### 1. Start the Stack

```powershell
cd infra/docker
docker compose -f docker-compose.dev.yml up --build
```

### 2. Access Services

| Service             | URL                                                      | Default Creds         |
| ------------------- | -------------------------------------------------------- | --------------------- |
| **Frontend**        | [http://localhost:3000](http://localhost:3000)           | Dev Mode (Auto-login) |
| **Backend API**     | [http://localhost:8000/docs](http://localhost:8000/docs) | -                     |
| **Mailpit (Email)** | [http://localhost:8025](http://localhost:8025)           | -                     |
| **Database**        | localhost:5432                                           | user: `maclarens`     |

---

## 🧪 Quality Gates & Testing

We maintain strict quality gates for logic, security, and performance.

### Run All Tests (Dockerized)

Run this script to build the backend and execute the full test suite:

```powershell
.\run_tests_docker.ps1
```

**Includes:**

- ✅ **FY Logic**: Verifies transitions between Jan-Dec and Apr-Mar fiscal years.
- ✅ **Workflows**: Tests Submit → Approve/Reject cycles.
- ✅ **Security**: Checks for IDOR, Role Misuse, and invalid payloads.
- ✅ **Performance**: Checks for N+1 queries and missing database indexes.

---

## 💻 Local Development Options

### Option 1: Hybrid (Recommended for Windows)

Run infrastructure in Docker, apps natively (faster hot-reload):

1. **Start Infrastructure Only** (DB, Redis, Mailpit):

   ```powershell
   cd infra/docker
   docker compose -f docker-compose.dev.yml up -d db redis mailpit
   ```

2. **Start Backend** (Terminal 1):

   ```powershell
   .\start-api.ps1
   ```

3. **Start Frontend** (Terminal 2):
   ```powershell
   .\start-frontend.ps1
   ```

### Option 2: Completely Local (No Docker)

Run everything natively on your machine:

**Quick Start:**

```powershell
# Windows
.\setup-database.ps1
.\start-local-dev.ps1
```

```bash
# macOS/Linux
./scripts/setup-database.sh
./scripts/start-local-dev.sh
```

**Requirements:**
- PostgreSQL 15+ installed and running
- Python 3.11+ installed
- Node.js 18+ installed
- Mailpit installed (optional, for email testing)

**Detailed Guide:** [📖 Local Development Setup](QUICK_START.md)

---

## 📚 Documentation

### Getting Started
- [🚀 Quick Start Guide](QUICK_START.md) - 5-minute local setup (no Docker)
- [📋 Local Dev Checklist](docs/LOCAL_DEV_CHECKLIST.md) - Step-by-step verification
- [📖 Complete Local Setup](docs/LOCAL_DEV_SETUP.md) - Detailed installation guide

### Development Guides
- [🐳 Docker Development Guide](docs/DOCKER_DEV_GUIDE.md) - Docker setup & troubleshooting
- [✅ Quality Gates Guide](docs/EPIC10_QUALITY_GATES.md) - Testing strategy
- [🔄 Migration Guide](docs/EPIC9_MIGRATION_GUIDE.md) - Mock data to API migration
