# McLarens Analytics Platform

> **Enterprise Financial Analytics & Reporting System**
> Multi-portal platform for consolidated P&L reporting, budget management, and strategic financial oversight across company clusters.

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![Python](https://img.shields.io/badge/python-3.11-blue)
![Next.js](https://img.shields.io/badge/next.js-14.2-black)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue)
![License](https://img.shields.io/badge/license-proprietary-red)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Role-Based Portals](#role-based-portals)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Authentication](#authentication)
- [Email Service](#email-service)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Monitoring & System Health](#monitoring--system-health)
- [Security](#security)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Operational Runbook](#operational-runbook)
- [Contributing](#contributing)

---

## Overview

McLarens Analytics is a **multi-tenant financial analytics platform** purpose-built for McLarens Group. It consolidates Profit & Loss data across multiple companies and clusters, providing role-specific dashboards for data entry, approval workflows, strategic oversight, and system administration.

### Key Capabilities

| Capability                          | Description                                                        |
| ----------------------------------- | ------------------------------------------------------------------ |
| **Multi-Company P&L Consolidation** | Aggregate financial data across companies, clusters, and the group |
| **Dual Fiscal Year Support**        | Jan–Dec and Apr–Mar fiscal cycles per company                      |
| **Budget vs Actual Tracking**       | Monthly and YTD variance analysis with achievement percentages     |
| **Workflow Engine**                 | Draft → Submit → Approve/Reject cycle with audit trail             |
| **Role-Based Access Control**       | Four distinct portals with granular permissions                    |
| **Real-Time Dashboards**            | Strategic KPIs, cluster contributions, performance rankings        |
| **Excel/PDF Export**                | Financial summaries with professional formatting                   |
| **Audit Logging**                   | Complete trail of all user actions with IP tracking                |
| **System Health Monitoring**        | Live status of database, Redis, email, and API services            |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│                     https://app.domain.com                       │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 14)                        │
│                        Container App #1                           │
│                                                                  │
│  • App Router (Server + Client Components)                       │
│  • NextAuth (Microsoft Entra ID / Dev mode)                      │
│  • API Proxy: /api/* → Backend                                   │
│  • GraphQL Client (Apollo)                                       │
│  • TailwindCSS + Recharts                                        │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP (internal)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                             │
│                       Container App #2                            │
│                                                                  │
│  • REST API (/auth, /admin, /fo, /fd, /md, /ceo)                 │
│  • GraphQL API (Strawberry)                                      │
│  • JWT Authentication + Entra ID Token Validation                │
│  • SQLAlchemy 2.0 Async ORM                                     │
│  • Alembic Migrations                                            │
│  • Rate Limiting Middleware                                      │
│  • Audit Logging Middleware (IP capture via context vars)         │
└──────────┬──────────────────────┬──────────────┬─────────────────┘
           │                      │              │
           ▼                      ▼              ▼
┌──────────────────┐  ┌─────────────────┐  ┌──────────────────────┐
│   PostgreSQL 16  │  │    Redis 7      │  │   Email Service      │
│   (analytics     │  │    (caching,    │  │   (Mailpit/ACS/      │
│    schema)       │  │     rate-limit) │  │    Resend/SendGrid)  │
└──────────────────┘  └─────────────────┘  └──────────────────────┘
```

### Request Flow

1. **Browser** → Next.js frontend (SSR + CSR)
2. **Next.js** rewrites `/api/*` requests to the backend (no CORS issues)
3. **Backend** validates JWT (app-issued or Entra ID token)
4. **Backend** queries PostgreSQL via async SQLAlchemy
5. **Backend** caches hot data in Redis, enforces rate limits
6. **Backend** writes audit logs for every state-changing operation (with client IP)
7. **Responses** flow back through the same chain

---

## Tech Stack

### Frontend

| Technology    | Version | Purpose                                 |
| ------------- | ------- | --------------------------------------- |
| Next.js       | 14.2    | React framework (App Router, SSR)       |
| React         | 18.3    | UI library                              |
| TypeScript    | 5.4     | Type safety                             |
| TailwindCSS   | 3.4     | Utility-first CSS                       |
| NextAuth.js   | 4.24    | Authentication (Entra ID + credentials) |
| Apollo Client | 3.10    | GraphQL data fetching                   |
| Recharts      | 2.12    | Data visualization                      |
| Lucide React  | 0.378   | Icon library                            |
| date-fns      | 3.6     | Date utilities                          |

### Backend

| Technology                | Version | Purpose                        |
| ------------------------- | ------- | ------------------------------ |
| FastAPI                   | 0.111   | Async Python API framework     |
| Uvicorn                   | 0.29    | ASGI server                    |
| SQLAlchemy                | 2.0.30  | Async ORM (asyncpg driver)     |
| Strawberry                | 0.228   | GraphQL schema & resolvers     |
| Pydantic                  | 2.7     | Data validation & settings     |
| Alembic                   | 1.13    | Database migrations            |
| python-jose               | 3.3     | JWT encoding/decoding          |
| Redis                     | 5.0     | Caching & rate limit backend   |
| aiosmtplib                | 3.0     | Async SMTP for Mailpit/MailHog |
| openpyxl                  | 3.1     | Excel report generation        |
| reportlab                 | 4.2     | PDF generation                 |
| azure-communication-email | 1.0     | Azure email integration        |
| Resend                    | 0.8     | Resend email provider          |

### Infrastructure

| Technology       | Version     | Purpose                             |
| ---------------- | ----------- | ----------------------------------- |
| PostgreSQL       | 16 (Alpine) | Primary database                    |
| Redis            | 7 (Alpine)  | Cache + rate limiting store         |
| Docker + Compose | Latest      | Containerized development           |
| Mailpit          | Latest      | Local email testing (SMTP + Web UI) |

---

## Role-Based Portals

The platform serves **four distinct user roles**, each with a dedicated portal and dashboard:

| Role                       | Portal URL          | Role ID | Responsibilities                                                           |
| -------------------------- | ------------------- | ------- | -------------------------------------------------------------------------- |
| **Finance Officer (FO)**   | `/finance-officer`  | 1       | Data entry (actuals), submit monthly P&L reports                           |
| **Finance Director (FD)**  | `/finance-director` | 2       | Review & approve/reject reports, company analytics, export                 |
| **System Administrator**   | `/system-admin`     | 3       | User management, cluster/company CRUD, audit logs, system health           |
| **Managing Director (MD)** | `/md`               | 4       | Strategic overview, cluster contribution, performance rankings, risk radar |

### Access Control Matrix

| Feature                  | FO  | FD           | Admin | MD  |
| ------------------------ | --- | ------------ | ----- | --- |
| View own company data    | ✅  | ✅           | ✅    | ✅  |
| Enter actuals/budgets    | ✅  | —            | ✅    | —   |
| Submit reports           | ✅  | —            | ✅    | —   |
| Approve/reject reports   | —   | ✅           | ✅    | —   |
| View all companies       | —   | ✅ (cluster) | ✅    | ✅  |
| Export reports           | —   | ✅           | ✅    | ✅  |
| Manage users/companies   | —   | —            | ✅    | —   |
| View audit logs          | —   | —            | ✅    | —   |
| System health monitoring | —   | —            | ✅    | —   |
| Strategic dashboards     | —   | —            | —     | ✅  |

---

## Local Development

### Prerequisites

- **Docker Desktop** (Windows/macOS) or **Docker Engine + Compose** (Linux)
- **Git**

### Quick Start (Docker — Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/maclarens-analytics-v1.git
cd maclarens-analytics-v1

# 2. Copy environment files
cp infra/docker/.env.example infra/docker/.env

# 3. Start all services (DB, Redis, Mailpit, Backend, Frontend)
docker compose -f infra/docker/docker-compose.dev.yml up --build

# 4. Run database migrations
docker compose -f infra/docker/docker-compose.dev.yml exec backend alembic upgrade head

# 5. Seed sample data (optional)
docker compose -f infra/docker/docker-compose.dev.yml exec backend python seed_standalone.py
```

### Service URLs (Local)

| Service                | URL                           | Notes                               |
| ---------------------- | ----------------------------- | ----------------------------------- |
| **Frontend**           | http://localhost:3000         | Next.js with hot reload             |
| **Backend API**        | http://localhost:8000         | FastAPI with auto-reload            |
| **API Docs (Swagger)** | http://localhost:8000/docs    | Interactive API documentation       |
| **GraphQL Playground** | http://localhost:8000/graphql | Strawberry GraphQL IDE              |
| **Mailpit Web UI**     | http://localhost:8025         | Email testing inbox                 |
| **PostgreSQL**         | `localhost:5433`              | User: `postgres` / Pass: `postgres` |
| **Redis**              | `localhost:6379`              | No auth (dev only)                  |

### Environment Variables (Local Docker)

Edit `infra/docker/.env`:

```env
# Auth: 'dev' for local, 'entra' for Azure AD
AUTH_MODE=dev

# Microsoft Entra ID (only needed if AUTH_MODE=entra)
AZURE_AD_CLIENT_ID=
AZURE_AD_TENANT_ID=
AZURE_AD_CLIENT_SECRET=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=changeme_dev_secret_1234567890

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=maclarens_analytics

# Dev login passwords
ADMIN_PASSWORD=admin123
DIRECTOR_PASSWORD=director123
```

### Common Docker Commands

```bash
# Start services
docker compose -f infra/docker/docker-compose.dev.yml up -d

# View logs
docker compose -f infra/docker/docker-compose.dev.yml logs -f backend
docker compose -f infra/docker/docker-compose.dev.yml logs -f frontend

# Restart after code changes (hot reload covers most, but sometimes needed)
docker compose -f infra/docker/docker-compose.dev.yml restart backend frontend

# Run migrations
docker compose -f infra/docker/docker-compose.dev.yml exec backend alembic upgrade head

# Generate new migration
docker compose -f infra/docker/docker-compose.dev.yml exec backend alembic revision --autogenerate -m "description"

# Stop all services
docker compose -f infra/docker/docker-compose.dev.yml down

# Full reset (destroy data volumes)
docker compose -f infra/docker/docker-compose.dev.yml down -v
```

### Getting Started

- [🚀 Quick Start Guide](QUICK_START.md) - 5-minute local setup
- [📋 Local Dev Checklist](docs/LOCAL_DEV_CHECKLIST.md) - Step-by-step verification
- [📖 Complete Local Setup](docs/LOCAL_DEV_SETUP.md) - Detailed installation guide
- [🔄 CI/CD & Deployment Guide](docs/CICD_GUIDE.md) - Automation & Azure pipelines

### Development Guides

### Native Development (Without Docker)

See [📖 Local Development Setup](docs/LOCAL_DEV_SETUP.md) for running services natively.

```bash
# Backend
cd apps/api
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000

# Frontend
cd apps/frontend
npm install
npm run dev
```

---

## Production Deployment

### Recommended Architecture: Azure Container Apps

This is the enterprise-grade deployment path — no Kubernetes management overhead, fully managed scaling, and native Azure integration.

```
┌─────────────────────────────────────────────────────────────────┐
│                     AZURE RESOURCE GROUP                         │
│                  rg-mclarens-analytics-prod                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           Container Apps Environment                     │    │
│  │                                                         │    │
│  │  ┌─────────────────┐     ┌──────────────────────┐       │    │
│  │  │  ca-frontend    │────▶│   ca-backend         │       │    │
│  │  │  (Next.js)      │     │   (FastAPI)          │       │    │
│  │  │                 │     │                      │       │    │
│  │  │  Public ingress │     │  Internal ingress    │       │    │
│  │  │  Custom domain  │     │  (private)           │       │    │
│  │  │  Managed TLS    │     │                      │       │    │
│  │  └─────────────────┘     └──────────┬───────────┘       │    │
│  │                                     │                    │    │
│  └─────────────────────────────────────┼────────────────────┘    │
│                                        │                         │
│  ┌─────────────────────┐  ┌────────────┴──────────┐              │
│  │  Azure Cache for    │  │  Azure Database for   │              │
│  │  Redis              │  │  PostgreSQL           │              │
│  │  (Standard C1)      │  │  (Flexible Server)    │              │
│  │                     │  │  (Burstable B2s)      │              │
│  │  Private endpoint   │  │  Private endpoint     │              │
│  └─────────────────────┘  └───────────────────────┘              │
│                                                                  │
│  ┌───────────────────┐  ┌──────────────────────────┐             │
│  │  Azure Key Vault  │  │  Azure Container         │             │
│  │  (secrets)        │  │  Registry (ACR)          │             │
│  └───────────────────┘  └──────────────────────────┘             │
│                                                                  │
│  ┌───────────────────────────────────────┐                       │
│  │  Microsoft Entra ID                   │                       │
│  │  (App Registration for SSO)           │                       │
│  └───────────────────────────────────────┘                       │
│                                                                  │
│  ┌───────────────────────────────────────┐                       │
│  │  Monitoring                           │                       │
│  │  • Log Analytics Workspace            │                       │
│  │  • Application Insights               │                       │
│  │  • Alerts + Action Groups             │                       │
│  └───────────────────────────────────────┘                       │
│                                                                  │
│  ┌───────────────────────────────────────┐                       │
│  │  Email Service                        │                       │
│  │  (ACS Email / SendGrid / Resend)      │                       │
│  └───────────────────────────────────────┘                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Azure Resource Checklist

| Category       | Resource                       | SKU / Tier              | Purpose                             |
| -------------- | ------------------------------ | ----------------------- | ----------------------------------- |
| **Compute**    | Container Apps Environment     | Consumption             | Hosts frontend + backend containers |
|                | Container App: `ca-frontend`   | 0.5 vCPU / 1 Gi         | Next.js SSR                         |
|                | Container App: `ca-backend`    | 1 vCPU / 2 Gi           | FastAPI + workers                   |
| **Data**       | Azure Database for PostgreSQL  | Flexible, Burstable B2s | Primary database                    |
|                | Azure Cache for Redis          | Standard C1 (6 GB)      | Caching + rate limiting             |
| **Registry**   | Azure Container Registry       | Basic                   | Docker image storage                |
| **Secrets**    | Azure Key Vault                | Standard                | Secrets + certificates              |
| **Identity**   | Entra ID App Registration      | —                       | SSO authentication                  |
| **Email**      | Azure Communication Services   | —                       | Transactional email                 |
| **DNS**        | Azure DNS Zone (or Cloudflare) | —                       | Domain management                   |
| **Monitoring** | Log Analytics Workspace        | —                       | Centralized logging                 |
|                | Application Insights           | —                       | APM + tracing                       |
|                | Alert Rules + Action Groups    | —                       | Incident notification               |

### Production Environment Variables

```env
# ─── Core ───
ENVIRONMENT=production
DEBUG=false

# ─── Database (Managed PostgreSQL) ───
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>.postgres.database.azure.com:5432/maclarens_analytics?ssl=require

# ─── Cache (Managed Redis) ───
REDIS_URL=rediss://:<access-key>@<host>.redis.cache.windows.net:6380/0

# ─── Authentication ───
AUTH_MODE=entra
JWT_SECRET=<generated-256-bit-secret>
AZURE_AD_TENANT_ID=<your-tenant-id>
AZURE_AD_CLIENT_ID=<your-client-id>
AZURE_AD_CLIENT_SECRET=<your-client-secret>

# ─── Frontend ───
NEXTAUTH_URL=https://app.yourdomain.com
NEXTAUTH_SECRET=<generated-secret>
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/graphql

# ─── Email ───
EMAIL_ENABLED=true
EMAIL_PROVIDER=azure_email
AZURE_EMAIL_CONNECTION_STRING=endpoint=https://<acs-resource>.communication.azure.com/;accesskey=<key>
AZURE_EMAIL_SENDER=DoNotReply@<your-acs-domain>.azurecomm.net

# ─── CORS ───
CORS_ORIGINS=["https://app.yourdomain.com"]
```

### CI/CD Pipeline (GitHub Actions → Azure)

```yaml
# .github/workflows/deploy.yml (simplified)
name: Build & Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to Azure Container Registry
        uses: azure/docker-login@v1
        with:
          login-server: ${{ secrets.ACR_LOGIN_SERVER }}
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Build & Push Backend
        run: |
          docker build -t ${{ secrets.ACR_LOGIN_SERVER }}/mclarens-backend:${{ github.sha }} ./apps/api
          docker push ${{ secrets.ACR_LOGIN_SERVER }}/mclarens-backend:${{ github.sha }}

      - name: Build & Push Frontend
        run: |
          docker build -t ${{ secrets.ACR_LOGIN_SERVER }}/mclarens-frontend:${{ github.sha }} ./apps/frontend
          docker push ${{ secrets.ACR_LOGIN_SERVER }}/mclarens-frontend:${{ github.sha }}

      - name: Deploy to Container Apps
        uses: azure/container-apps-deploy-action@v1
        with:
          resource-group: rg-mclarens-analytics-prod
          # ... container app configuration
```

### Domain & HTTPS

1. **Purchase domain** (e.g. `mclarens-analytics.com`)
2. **Configure DNS** (Azure DNS or Cloudflare):
   - `app.mclarens-analytics.com` → Frontend Container App
   - `api.mclarens-analytics.com` → Backend Container App (optional if using internal ingress)
3. **Enable managed TLS certificates** in Container Apps (automatic with custom domains)

### Networking Options

| Setup                    | Frontend        | Backend                  | DB + Redis       | Security Level |
| ------------------------ | --------------- | ------------------------ | ---------------- | -------------- |
| **Simple Public**        | Public HTTPS    | Public HTTPS + CORS lock | Private endpoint | Medium         |
| **Secure (Recommended)** | Public HTTPS    | Internal ingress only    | Private endpoint | High           |
| **Full VNet**            | VNet-integrated | VNet-integrated          | Private endpoint | Enterprise     |

---

## Authentication

### Dual Auth Mode

The platform supports two authentication modes, controlled by the `AUTH_MODE` environment variable:

#### Dev Mode (`AUTH_MODE=dev`)

- Email + password login (passwords defined in environment)
- No external identity provider required
- Suitable for local development and testing

#### Entra Mode (`AUTH_MODE=entra`)

- Microsoft Entra ID (Azure AD) single sign-on
- NextAuth handles the OAuth 2.0 / OIDC flow
- Backend validates tokens using Entra's public signing keys

### Entra ID Setup

1. **Create App Registration** in Azure Portal → Microsoft Entra ID
2. **Platform**: Web
3. **Redirect URI**: `https://app.yourdomain.com/api/auth/callback/azure-ad`
4. **Generate Client Secret** (note expiration)
5. **API Permissions**: `User.Read` (delegated)
6. **Configure** `AZURE_AD_CLIENT_ID`, `AZURE_AD_TENANT_ID`, `AZURE_AD_CLIENT_SECRET`

See [📖 Azure AD Setup Guide](AZURE_AD_SETUP_GUIDE.md) for detailed instructions.

### Token Flow

```
Browser → NextAuth → Entra ID → Authorization Code
NextAuth → Entra ID → Access Token + ID Token
NextAuth → Backend  → /auth/microsoft-login (exchanges Entra token for app JWT)
App JWT  → Bearer token in all subsequent API requests
Backend  → Validates JWT claims (sub, role_id, portal, companies)
```

---

## Email Service

The platform supports multiple email providers via the `EMAIL_PROVIDER` setting:

| Provider                         | Setting Value | Use Case                                                       |
| -------------------------------- | ------------- | -------------------------------------------------------------- |
| **Disabled**                     | `disabled`    | No emails sent                                                 |
| **Mailpit**                      | `mailpit`     | Local development (SMTP `localhost:1025`, UI `localhost:8025`) |
| **MailHog**                      | `mailhog`     | Legacy local dev (compatible with Mailpit)                     |
| **Azure Communication Services** | `azure_email` | Production (Azure-native)                                      |
| **Resend**                       | `resend`      | Production (developer-friendly)                                |
| **Microsoft Graph**              | `graph`       | Production (requires Graph API permissions)                    |

### Email Use Cases

- User invitation notifications
- Report submission confirmations
- Approval/rejection notifications
- Password reset (when applicable)
- System alerts

---

## Database Schema

The application uses the `analytics` schema in PostgreSQL with the following core tables:

### Master Tables

| Table            | Purpose                                                          |
| ---------------- | ---------------------------------------------------------------- |
| `role_master`    | User roles (FO=1, FD=2, Admin=3, MD=4)                           |
| `user_master`    | User accounts (email, name, active status)                       |
| `cluster_master` | Company clusters/groups                                          |
| `company_master` | Individual companies with fiscal year config                     |
| `period_master`  | Year/month periods                                               |
| `metric_master`  | Financial metrics (Revenue, GP, PBT, etc — 19 metrics)           |
| `status_master`  | Workflow statuses (Draft=1, Submitted=2, Approved=3, Rejected=4) |

### Mapping & Data Tables

| Table                    | Purpose                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `user_company_map`       | User ↔ Company access mapping                                  |
| `user_company_role_map`  | User ↔ Company ↔ Role assignments                              |
| `financial_fact`         | Raw financial data (company × period × metric × actual/budget) |
| `financial_monthly_view` | Pivoted read view for monthly P&L                              |
| `vw_financial_pnl`       | Actual vs Budget side-by-side view                             |
| `financial_workflow`     | Report submission/approval workflow                            |

### Operational Tables

| Table                   | Purpose                                   |
| ----------------------- | ----------------------------------------- |
| `audit_logs`            | All user actions with IP address tracking |
| `report_comments`       | FD/FO comments on reports                 |
| `report_status_history` | Complete workflow state transitions       |
| `notifications`         | In-app notification queue                 |
| `email_outbox`          | Email sending queue with retry            |
| `report_export_history` | Track who exported what and when          |
| `fx_rates`              | Exchange rate history                     |

### Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description_of_change"

# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View current revision
alembic current

# View migration history
alembic history
```

---

## API Reference

### REST Endpoints

| Prefix              | Auth Required | Description                                   |
| ------------------- | ------------- | --------------------------------------------- |
| `GET /health/*`     | No            | System health checks                          |
| `POST /auth/*`      | No            | Authentication (login, Microsoft login)       |
| `GET/POST /admin/*` | Admin         | User, cluster, company, assignment management |
| `GET/POST /fo/*`    | FO            | Finance Officer data entry and submission     |
| `GET/POST /fd/*`    | FD            | Finance Director review and approval          |
| `GET /md/*`         | MD            | Managing Director strategic dashboards        |
| `GET /ceo/*`        | MD            | CEO-level analytics (alias)                   |
| `GET/POST /graphql` | Varies        | GraphQL endpoint for complex queries          |
| `GET /export/*`     | Auth          | Financial report export (Excel/PDF)           |

### Key Admin Endpoints

```
GET    /admin/dashboard          → Dashboard stats
GET    /admin/activity           → Audit logs (with pagination)
GET    /admin/roles              → Available roles
GET    /admin/clusters           → List clusters
POST   /admin/clusters           → Create cluster
PATCH  /admin/clusters/:id       → Update cluster
GET    /admin/companies          → List companies (paginated)
POST   /admin/companies          → Create company
GET    /admin/users              → List users (paginated)
POST   /admin/users              → Create user
PATCH  /admin/users/:id          → Update user
POST   /admin/assignments        → Assign user to company with role
POST   /admin/budget/entry       → Submit budget data
POST   /admin/actual/entry       → Submit actual data
```

### Health Check Endpoints

```
GET /health          → Quick API liveness check
GET /health/db       → PostgreSQL connectivity + latency
GET /health/redis    → Redis connectivity
GET /health/email    → Email provider status
GET /health/full     → Complete system health (all components)
GET /health/config   → Non-sensitive configuration summary
```

---

## Monitoring & System Health

### Built-In Health Checks

The `/health/full` endpoint returns real-time status for all components:

```json
{
  "status": "healthy",
  "components": {
    "database": { "status": "healthy", "latency_ms": 12 },
    "redis": { "status": "healthy", "latency_ms": 3 },
    "email": { "status": "healthy", "provider": "mailpit" },
    "api": { "status": "healthy", "version": "1.0.0" }
  },
  "timestamp": "2026-02-23T06:00:00Z"
}
```

### Azure Monitoring Setup (Production)

#### Application Insights

- Enable for the backend Container App
- Tracks: request latency, failure rates, dependency calls, exceptions
- Automatic: request tracing, SQL query timing, Redis call tracking

#### Recommended Alert Rules

| Alert              | Condition                                 | Severity         |
| ------------------ | ----------------------------------------- | ---------------- |
| API 5xx Spike      | `requests/failed > 10` in 5 min           | Critical (Sev 1) |
| High Latency       | `requests/duration > 5000ms` avg in 5 min | Warning (Sev 2)  |
| Container Restarts | `restartCount > 3` in 15 min              | Critical (Sev 1) |
| DB CPU High        | `cpu_percent > 85%` for 10 min            | Warning (Sev 2)  |
| DB Storage High    | `storage_percent > 85%`                   | Warning (Sev 2)  |
| Redis Memory High  | `usedmemory > 80%`                        | Warning (Sev 2)  |
| Health Check Fail  | `GET /health` returns non-200             | Critical (Sev 1) |

#### Dashboard Widgets (Azure Monitor Workbook)

- API availability (uptime %)
- P95 response time
- Request volume (RPM)
- Error rate
- Database connection pool utilization
- Redis hit/miss ratio
- Active users (from audit logs)

### Audit Logging

Every state-changing operation is logged to `analytics.audit_logs`:

```sql
SELECT * FROM analytics.audit_logs
ORDER BY created_at DESC
LIMIT 20;
```

Fields captured:

- `user_id` — Who performed the action
- `action` — Action type (e.g., `USER_CREATED`, `REPORT_APPROVED`, `BUDGET_SUBMITTED`)
- `entity_type` — What was affected (user, company, cluster, report, budget)
- `entity_id` — Specific entity ID
- `details` — Human-readable description
- `ip_address` — Client IP (captured via middleware)
- `created_at` — Timestamp (UTC)

---

## Security

### Authentication & Authorization

- **JWT tokens** with `HS256` signing (production: use strong secret via Key Vault)
- **Role-based middleware**: `require_admin`, `require_fo`, `require_fd`, `require_ceo`
- **Portal enforcement**: JWT `portal` claim must match the route's expected portal
- **Company access control**: Users can only access companies they are assigned to
- **Admin bypass**: System Admins (role_id=3) can access all portals and companies

### API Security

- **Rate limiting**: 100 requests/minute per client (configurable)
- **CORS**: Strict origin allowlist
- **Input validation**: Pydantic models on all endpoints
- **SQL injection protection**: SQLAlchemy parameterized queries
- **XSS protection**: React auto-escaping + CSP headers

### Infrastructure Security (Production)

- **Private endpoints** for PostgreSQL and Redis (no public internet access)
- **Managed TLS certificates** (HTTPS everywhere)
- **Key Vault** for secrets management (no secrets in environment variables)
- **VNet integration** for Container Apps (optional)
- **Audit trail** for all administrative actions

### Security Headers (Recommended)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

---

## Testing

### Run the Full Test Suite

```bash
# Inside the backend container
docker compose -f infra/docker/docker-compose.dev.yml exec backend pytest

# Or natively
cd apps/api
pytest -v
```

### Test Coverage

| Category              | Tests | What They Verify                                  |
| --------------------- | ----- | ------------------------------------------------- |
| **Fiscal Year Logic** | ✅    | Jan–Dec and Apr–Mar transitions, YTD calculations |
| **Workflow Engine**   | ✅    | Draft → Submit → Approve/Reject state machine     |
| **Security**          | ✅    | IDOR prevention, role misuse, invalid payloads    |
| **Performance**       | ✅    | N+1 query detection, missing indexes              |
| **API Endpoints**     | ✅    | Status codes, response shapes, error handling     |

---

## Project Structure

````
maclarens-analytics-v1/
├── apps/
│   ├── api/                          # Backend (FastAPI)
│   │   ├── src/
│   │   │   ├── config/               # Settings, constants
│   │   │   ├── db/                   # Models, session, migrations
│   │   │   ├── gql_schema/           # GraphQL schema (Strawberry)
│   │   │   ├── routers/              # REST API routers
│   │   │   │   ├── admin_router.py   # System admin CRUD + audit
│   │   │   │   ├── admin_reports_router.py
│   │   │   │   ├── auth_router.py    # Login, Microsoft login
│   │   │   │   ├── fo_router.py      # Finance Officer endpoints
│   │   │   │   ├── fd_router.py      # Finance Director endpoints
│   │   │   │   ├── md_router.py      # MD dashboard endpoints
│   │   │   │   ├── ceo_router.py     # CEO analytics endpoints
│   │   │   │   └── notifications_router.py
│   │   │   ├── security/             # Auth middleware, permissions, audit
│   │   │   │   ├── middleware.py      # JWT validation, role enforcement
│   │   │   │   ├── audit_context.py   # IP capture middleware
│   │   │   │   ├── permissions.py     # Permission definitions
│   │   │   │   └── rate_limit.py      # Rate limiting
│   │   │   └── services/             # Business logic services
│   │   │       ├── auth_service.py    # Token generation, Entra validation
│   │   │       ├── health_service.py  # System health checks
│   │   │       ├── email_provider.py  # Multi-provider email factory
│   │   │       ├── export_service.py  # Excel/PDF generation
│   │   │       └── budget_import_service.py
│   │   ├── alembic/                  # Database migrations
│   │   ├── tests/                    # Pytest test suite
│   │   ├── requirements.txt
│   │   ├── Dockerfile                # Production image
│   │   └── Dockerfile.dev            # Development image (with hot reload)
│   │
│   └── frontend/                     # Frontend (Next.js 14)
│       ├── app/                      # App Router pages
│       │   ├── login/                # Authentication pages
│       │   ├── system-admin/         # Admin portal
│       │   │   └── (dashboard)/      # Admin dashboard group
│       │   │       ├── dashboard/    # System health, activity, stats
│       │   │       ├── audit/        # Audit logs viewer
│       │   │       ├── users/        # User management
│       │   │       ├── companies/    # Company management
│       │   │       └── clusters/     # Cluster management
│       │   ├── finance-officer/      # FO portal
│       │   ├── finance-director/     # FD portal
│       │   └── md/                   # MD portal
│       ├── components/               # Reusable React components
│       ├── lib/
│       │   ├── api-client.ts         # Typed REST API client
│       │   └── role-routing.ts       # Role-based navigation logic
│       ├── hooks/                    # Custom React hooks
│       ├── styles/                   # Global CSS
│       ├── next.config.js            # API proxy rewrites
│       ├── middleware.ts             # NextAuth route protection
│       ├── Dockerfile                # Production image
│       └── Dockerfile.dev            # Development image
│
├── infra/
│   └── docker/
│       ├── docker-compose.dev.yml    # Full dev stack (5 services)
│       ├── docker-compose.yml        # Production compose (reference)
│       ├── .env.example              # Environment template
│       └── db/
│           ├── init/                 # Database initialization SQL
│           └── seed/                 # Seed data (CSV + SQL)
│
├── docs/                             # Extended documentation
│   ├── CICD_GUIDE.md                 # CI/CD & Automation (Azure)
│   ├── LOCAL_DEV_CHECKLIST.md        # Step-by-step verification
│   ├── deployment.md                 # Infrastructure overview
│   ├── architecture.md               # Backend/Frontend detail
│   ├── database.md                   # Schema & ERD
│   ├── security.md                   # Auth & Middleware detail
│   └── workflows.md                  # Business logic workflows
│
├── scripts/                          # Utility scripts
├── .github/
│   └── workflows/                    # GitHub Actions pipelines
│
├── AZURE_AD_SETUP_GUIDE.md          # Entra ID configuration guide
├── QUICK_START.md                    # 5-minute local setup
└── README.md                         # ← You are here

---

## 📚 Documentation

### Core Guides
- [🚀 Quick Start Guide](QUICK_START.md) - 5-minute local setup
- [🔄 CI/CD & Deployment Guide](docs/CICD_GUIDE.md) - Automation & Azure pipelines
- [� Local Dev Setup](docs/LOCAL_DEV_SETUP.md) - Detailed installation guide (without Docker)

### Technical Reference
- [🏗️ Architecture Overview](docs/architecture.md)
- [🗄️ Database Schema](docs/database.md)
- [🛡️ Security & Auth](docs/security.md)
- [🔄 Business Workflows](docs/workflows.md)

---

## Operational Runbook

### Scenario: Database Migration in Production

```bash
# 1. Take a snapshot of the database (Azure Portal or CLI)
az postgres flexible-server backup create ...

# 2. Run migration
az containerapp exec --name ca-backend --resource-group rg-mclarens-analytics-prod \
  --command "alembic upgrade head"

# 3. Verify
az containerapp exec --name ca-backend --resource-group rg-mclarens-analytics-prod \
  --command "alembic current"
````

### Scenario: Rollback a Bad Deployment

```bash
# 1. Identify the last good image tag
az acr repository show-tags --name mclacr --repository mclarens-backend --orderby time_desc

# 2. Update the container app to the previous image
az containerapp update --name ca-backend \
  --resource-group rg-mclarens-analytics-prod \
  --image mclacr.azurecr.io/mclarens-backend:<previous-tag>
```

### Scenario: User Locked Out

```sql
-- Check user status
SELECT user_id, user_email, is_active FROM analytics.user_master
WHERE user_email = 'user@example.com';

-- Reactivate user
UPDATE analytics.user_master SET is_active = true, modified_date = NOW()
WHERE user_email = 'user@example.com';

-- Check their role assignments
SELECT u.user_email, c.company_name, r.role_name, m.is_active
FROM analytics.user_company_role_map m
JOIN analytics.user_master u ON u.user_id = m.user_id
JOIN analytics.company_master c ON c.company_id = m.company_id
JOIN analytics.role_master r ON r.role_id = m.role_id
WHERE u.user_email = 'user@example.com';
```

### Scenario: Performance Investigation

```sql
-- Check recent slow audit log entries
SELECT action, entity_type, created_at, details
FROM analytics.audit_logs
ORDER BY created_at DESC LIMIT 50;

-- Check report submission backlog
SELECT s.status_name, COUNT(*)
FROM analytics.financial_workflow w
JOIN analytics.status_master s ON s.status_id = w.status_id
GROUP BY s.status_name;
```

---

## Contributing

### Development Workflow

1. Create a feature branch from `main`
2. Make changes with proper commit messages
3. Ensure all tests pass: `pytest -v`
4. Ensure frontend builds: `npm run build`
5. Submit a pull request with description of changes
6. Code review required before merge

### Commit Convention

```
feat: add cluster contribution analysis dashboard
fix: resolve fiscal year boundary calculation
refactor: extract email provider factory pattern
docs: update deployment guide for Azure Container Apps
test: add FY transition edge case tests
```

### Code Quality Standards

- **Backend**: Type hints on all functions, Pydantic models for all request/response shapes
- **Frontend**: TypeScript strict mode, typed API client
- **Database**: All schema changes via Alembic migrations (never manual DDL)
- **Security**: All endpoints behind appropriate auth middleware
- **Audit**: All state-changing operations must call `_audit()`

---

## License

This software is proprietary to McLarens Group. Unauthorized distribution or reproduction is prohibited.

---

_Built with precision for enterprise financial analytics._
