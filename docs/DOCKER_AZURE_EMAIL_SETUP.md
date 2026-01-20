# McLarens Analytics - Docker Setup with Azure Email

## Prerequisites

1. **Docker Desktop** - Must be installed and running
2. **Azure Communication Services** - Email service configured (see below)

---

## Quick Start

### Step 1: Configure Azure Email Credentials

Edit the `.env` file in the project root and set your Azure Communication Services credentials:

```bash
# .env
EMAIL_PROVIDER=azure_email
AZURE_EMAIL_CONNECTION_STRING=endpoint=https://your-acs-resource.communication.azure.com/;accesskey=your-access-key
AZURE_EMAIL_SENDER=DoNotReply@your-domain.azurecomm.net
```

### Step 2: Start All Services

```powershell
# Navigate to project root
cd c:\Users\Sahan\Desktop\maclarens-analytics-v1

# Start with Azure Email configuration
docker compose -f infra/docker/docker-compose.azure.yml up -d --build
```

### Step 3: Access the Application

| Service                | URL                           |
| ---------------------- | ----------------------------- |
| **Frontend**           | http://localhost:3000         |
| **Backend API**        | http://localhost:8000         |
| **GraphQL Playground** | http://localhost:8000/graphql |

---

## Azure Communication Services Setup

### Step 1: Create Resources in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for **"Communication Services"**
3. Click **Create** and fill in:
   - Subscription: Your Azure subscription
   - Resource Group: Create new or use existing
   - Resource Name: `maclarens-acs`
   - Data Location: Choose your region

### Step 2: Add Email Service

1. In your ACS resource, go to **Email** > **Domains**
2. Click **Add domain**
3. Choose **Azure managed domain** (free) OR add a custom domain
4. Wait for domain verification

### Step 3: Get Connection String

1. Go to **Settings** > **Keys**
2. Copy the **Connection string** (Primary or Secondary)

### Step 4: Get Sender Address

1. Go to **Email** > **Provision domains**
2. Copy the **From** address (e.g., `DoNotReply@xxxxxxxx-xxxx-xxxx.azurecomm.net`)

---

## Docker Compose Files

| File                       | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| `docker-compose.azure.yml` | **Production-like** - Uses Azure Email                 |
| `docker-compose.dev.yml`   | **Development** - Uses MailHog for local email testing |
| `docker-compose.yml`       | Full stack without email                               |

---

## Services Started

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐    ┌───────────────┐    ┌────────────┐  │
│  │   Frontend    │    │   Backend     │    │ PostgreSQL │  │
│  │   Next.js     │◄──►│   FastAPI     │◄──►│   15-alpine│  │
│  │   :3000       │    │   :8000       │    │   :5432    │  │
│  └───────────────┘    └───────────────┘    └────────────┘  │
│                              │                              │
│                              │                              │
│                       ┌──────▼──────┐                       │
│                       │    Redis    │                       │
│                       │  7-alpine   │                       │
│                       │   :6379     │                       │
│                       └─────────────┘                       │
│                                                             │
│                              │                              │
│                       ┌──────▼──────┐                       │
│                       │    Azure    │                       │
│                       │  Email ACS  │                       │
│                       │  (External) │                       │
│                       └─────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Useful Commands

```powershell
# View running containers
docker compose -f infra/docker/docker-compose.azure.yml ps

# View logs
docker compose -f infra/docker/docker-compose.azure.yml logs -f

# View API logs only
docker compose -f infra/docker/docker-compose.azure.yml logs -f api

# Stop all services
docker compose -f infra/docker/docker-compose.azure.yml down

# Rebuild and restart
docker compose -f infra/docker/docker-compose.azure.yml up -d --build

# Reset database (delete volumes)
docker compose -f infra/docker/docker-compose.azure.yml down -v
```

---

## Troubleshooting

### Docker not starting?

1. Ensure Docker Desktop is running (check system tray)
2. Try restarting Docker Desktop

### Email not sending?

1. Check `AZURE_EMAIL_CONNECTION_STRING` is set correctly
2. Verify sender address is verified in Azure Portal
3. Check API logs: `docker compose logs api`

### Database connection error?

1. Wait 30 seconds after starting containers
2. Check PostgreSQL container: `docker compose logs postgres`

### Frontend can't connect to API?

1. Check CORS settings in `.env`
2. Ensure API is running: `docker compose ps`

---

## Development with MailHog (Alternative)

If you prefer local email testing without Azure:

```powershell
# Use the dev compose file
docker compose -f infra/docker/docker-compose.dev.yml up -d --build
```

Access MailHog UI: http://localhost:8025

---

## Environment Variables Reference

| Variable                        | Description             | Example                        |
| ------------------------------- | ----------------------- | ------------------------------ |
| `EMAIL_PROVIDER`                | Email service to use    | `azure_email`                  |
| `AZURE_EMAIL_CONNECTION_STRING` | ACS connection string   | `endpoint=...;accesskey=...`   |
| `AZURE_EMAIL_SENDER`            | Verified sender address | `DoNotReply@xxx.azurecomm.net` |
| `EMAIL_ENABLED`                 | Enable/disable emails   | `true`                         |
| `SENDER_EMAIL`                  | Fallback sender email   | `no-reply@maclarens.local`     |

