# MacLarens Analytics

A comprehensive analytics platform for financial reporting and management, featuring role-based dashboards for Data Officers, Finance Directors, CEOs, and Administrators.

## 🏗 Architecture

- **Frontend**: Next.js 14 (App Router)
- **Backend**: FastAPI (Python 3.11)
- **Database**: PostgreSQL 16
- **Email**: Mailpit (local) / SMTP (prod)

---

## 🚀 Quick Start

Run everything natively on your machine:

**Checklist:**

- [ ] PostgreSQL 15+ installed and running
- [ ] Python 3.11+ installed
- [ ] Node.js 18+ installed
- [ ] Mailpit installed (optional, for email testing)

**Start Instructions:**

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

**Detailed Guide:** [📖 Local Development Setup](QUICK_START.md)

---

## 🧪 Quality Gates & Testing

We maintain strict quality gates for logic, security, and performance.

### Run All Tests

To run the full test suite, ensure your backend environment is set up and run:

```powershell
cd apps/api
pytest
```

**Includes:**

- ✅ **FY Logic**: Verifies transitions between Jan-Dec and Apr-Mar fiscal years.
- ✅ **Workflows**: Tests Submit → Approve/Reject cycles.
- ✅ **Security**: Checks for IDOR, Role Misuse, and invalid payloads.
- ✅ **Performance**: Checks for N+1 queries and missing database indexes.

---

## 📚 Documentation

### Getting Started

- [🚀 Quick Start Guide](QUICK_START.md) - 5-minute local setup
- [📋 Local Dev Checklist](docs/LOCAL_DEV_CHECKLIST.md) - Step-by-step verification
- [📖 Complete Local Setup](docs/LOCAL_DEV_SETUP.md) - Detailed installation guide

### Development Guides

- [✅ Quality Gates Guide](docs/EPIC10_QUALITY_GATES.md) - Testing strategy
- [🔄 Migration Guide](docs/EPIC9_MIGRATION_GUIDE.md) - Mock data to API migration
