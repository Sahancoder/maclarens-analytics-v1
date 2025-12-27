# McLarens Analytics - Dev/Production Hybrid Architecture

This document explains the feature switch architecture that allows seamless transition between development and production modes.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  AUTH_MODE=dev → Local Login Page                                       │ │
│  │  AUTH_MODE=entra → Microsoft MSAL Login                                 │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ GraphQL
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                              BACKEND (FastAPI)                               │
│  ┌─────────────────────┐     ┌─────────────────────┐                        │
│  │    Auth Service     │     │  Workflow Service   │                        │
│  │  ┌───────────────┐  │     │  ┌───────────────┐  │                        │
│  │  │ DEV: JWT Auth │  │     │  │ DB + Audit    │  │                        │
│  │  │ ENTRA: Azure  │  │     │  │ Notifications │  │                        │
│  │  └───────────────┘  │     │  │ Email (async) │  │                        │
│  └─────────────────────┘     │  └───────────────┘  │                        │
│                               └──────────┬──────────┘                        │
│                                          │                                   │
│  ┌───────────────────────────────────────▼─────────────────────────────────┐ │
│  │                        Email Provider                                    │ │
│  │  ┌─────────────┐   ┌─────────────┐   ┌──────────────┐                   │ │
│  │  │   MailHog   │   │   Resend    │   │ MS Graph API │                   │ │
│  │  │   (SMTP)    │   │   (API)     │   │  Mail.Send   │                   │ │
│  │  │    DEV      │   │  Simple Prod │   │  Enterprise  │                   │ │
│  │  └─────────────┘   └─────────────┘   └──────────────┘                   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Feature Switches

### 1. Auth Mode (`AUTH_MODE`)

| Value   | Description                        | Use Case             |
| ------- | ---------------------------------- | -------------------- |
| `dev`   | Local JWT authentication           | Development, testing |
| `entra` | Microsoft Entra ID (Azure AD) MSAL | Production, staging  |

### 2. Email Provider (`EMAIL_PROVIDER`)

| Value      | Description                   | Use Case                 |
| ---------- | ----------------------------- | ------------------------ |
| `disabled` | No emails sent (logging only) | Debugging, unit tests    |
| `mailhog`  | Local SMTP to MailHog         | Development, E2E testing |
| `resend`   | Resend API                    | Simple production        |
| `graph`    | Microsoft Graph API Mail.Send | Enterprise production    |

### 3. Email Master Switch (`EMAIL_ENABLED`)

- `true` - Email sending active (via configured provider)
- `false` - All emails disabled (logged only)

---

## Quick Start (Development)

### 1. Start Docker Services

```bash
cd infra/docker
docker-compose -f docker-compose.dev.yml up -d
```

This starts:

- **PostgreSQL** - `localhost:5432`
- **Redis** - `localhost:6379`
- **MailHog** - SMTP: `localhost:1025`, Web UI: `http://localhost:8025`

### 2. Run API (local, without Docker)

```bash
cd apps/api
cp .env.dev .env  # Use dev settings
uvicorn src.main:app --reload --port 8000
```

### 3. Run Frontend

```bash
cd apps/frontend
npm run dev
```

### 4. Test Email Flow

1. Submit a report as Data Officer
2. Open MailHog: http://localhost:8025
3. Verify email appears in inbox

---

## Health Check Endpoints

| Endpoint             | Description                             |
| -------------------- | --------------------------------------- |
| `GET /health`        | Quick check - API running               |
| `GET /health/db`     | Database connection status              |
| `GET /health/email`  | Email provider status                   |
| `GET /health/redis`  | Redis connection status                 |
| `GET /health/full`   | Complete system health (all components) |
| `GET /health/config` | Current configuration (non-sensitive)   |

### Example: Full Health Check

```bash
curl http://localhost:8000/health/full
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2024-12-27T12:00:00.000000",
  "environment": "development",
  "auth_mode": "dev",
  "checks": {
    "database": { "status": "healthy", "provider": "postgresql" },
    "redis": { "status": "healthy", "url": "redis://localhost:6379" },
    "email": {
      "status": "healthy",
      "provider": "mailhog",
      "email_enabled": true
    }
  }
}
```

---

## Switching Phases

### Phase 1: Development (Current)

```env
AUTH_MODE=dev
EMAIL_ENABLED=true
EMAIL_PROVIDER=mailhog
```

✅ Test complete workflow locally
✅ Verify emails in MailHog
✅ No external dependencies

### Phase 2: Add Entra Auth (Keep MailHog)

```env
AUTH_MODE=entra
EMAIL_ENABLED=true
EMAIL_PROVIDER=mailhog

AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
```

✅ Test real Microsoft login
✅ Email still goes to MailHog (safe)
✅ Verify RBAC works

### Phase 3: Full Production

```env
AUTH_MODE=entra
EMAIL_ENABLED=true
EMAIL_PROVIDER=graph

AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
GRAPH_SENDER_EMAIL=notifications@yourdomain.com
```

✅ Real Microsoft login
✅ Real email via Graph API
✅ Production ready

---

## Azure App Registration Requirements

### For `AUTH_MODE=entra`

1. **Authentication**

   - Platform: Single-page application
   - Redirect URIs:
     - `http://localhost:3000/auth/callback` (dev)
     - `https://your-domain.com/auth/callback` (prod)

2. **App Roles** (Recommended)
   - `System_Admin`
   - `Data_Officer`
   - `Company_Director`
   - `CEO`

### For `EMAIL_PROVIDER=graph`

1. **API Permissions** (Application, not Delegated)

   - `Mail.Send` - Microsoft Graph

2. **Admin Consent**

   - Required for `Mail.Send` permission

3. **Sender Mailbox**
   - Create shared mailbox or use a user mailbox
   - Set as `GRAPH_SENDER_EMAIL`

---

## Notification Flow

Every workflow action (submit/reject/approve) follows this pattern:

```
1. Update Report Status    ─┐
2. Create Audit Log        │ Same DB Transaction
3. Create Notification Row ─┘
4. COMMIT
5. Send Email (async)      ← Background task, won't fail workflow
```

**Benefits:**

- If email fails, notification still exists
- User can see notification in-app
- Email can be retried later
- Audit trail is always complete

---

## Environment Files

| File                          | Purpose                            |
| ----------------------------- | ---------------------------------- |
| `.env.example`                | Documentation of all options       |
| `apps/api/.env.dev`           | Development configuration          |
| `apps/api/.env.prod.template` | Production template (copy to .env) |

---

## Testing Checklist

### Before Going Live

- [ ] Health check shows all services green: `/health/full`
- [ ] Can login as each role (Data Officer, Director, Admin, CEO)
- [ ] Submit report → Director gets notification email
- [ ] Approve report → Data Officer gets notification email
- [ ] Reject report → Data Officer gets notification email with reason
- [ ] Notifications appear in-app for each user
- [ ] Audit logs are created for each action
- [ ] CEO dashboard shows approved reports

### Production Readiness

- [ ] `AUTH_MODE=entra` - Real Microsoft login works
- [ ] `EMAIL_PROVIDER=graph` - Emails send via Graph API
- [ ] All secrets stored securely (Azure Key Vault, etc.)
- [ ] CORS configured for production domain
- [ ] Health endpoint monitored
