# 🔄 CI/CD & Automation Guide

This document provides a detailed overview of the automation pipelines used in the McLarens Analytics platform, covering continuous integration, security scanning, and automated deployment to **Microsoft Azure**.

---

## 🏗️ Pipeline Overview

The project uses **GitHub Actions** for all automation. We have two primary workflows:

### 1. `ci.yml` (Continuous Integration)

- **Triggers**: Every Pull Request to `main` or `develop`, and every push to `develop`.
- **Purpose**: Validation and Quality Assurance.
- **Jobs**:
  - **Frontend**: Lints code, checks TypeScript types, and performs a test build.
  - **Backend**: Runs the full `pytest` suite against real PostgreSQL and Redis service containers.
  - **Docker**: Verifies that both Frontend and Backend `Dockerfiles` build successfully.

### 2. `deploy.yml` (Continuous Deployment)

- **Triggers**: Push to `main` or manual trigger via **Workflow Dispatch**.
- **Purpose**: Automated production deployment.
- **Flow**: CI Gate → Build & Push (ACR) → Deploy Backend → Run Migrations → Deploy Frontend → Smoke Tests.

---

## 🔑 Required GitHub Secrets

To enable these pipelines, the following secrets must be configured in your GitHub repository (**Settings > Secrets and variables > Actions**):

### ☁️ Azure Infrastructure Credentials

| Secret Name             | Description                  | CLI Command to Generate                                                                                    |
| :---------------------- | :--------------------------- | :--------------------------------------------------------------------------------------------------------- |
| `AZURE_CREDENTIALS`     | Service Principal JSON       | `az ad sp create-for-rbac --role contributor --scopes /subscriptions/{ID}/resourceGroups/{RG} --json-auth` |
| `ACR_LOGIN_SERVER`      | Azure Container Registry URL | `mclacr.azurecr.io`                                                                                        |
| `ACR_USERNAME`          | ACR Admin Username           | Found in ACR > Access Keys                                                                                 |
| `ACR_PASSWORD`          | ACR Admin Password           | Found in ACR > Access Keys                                                                                 |
| `AZURE_RESOURCE_GROUP`  | Name of your Resource Group  | e.g. `rg-mclarens-analytics`                                                                               |
| `AZURE_SUBSCRIPTION_ID` | Your Azure Subscription ID   | `az account show --query id -o tsv`                                                                        |

### 🔐 Application Secrets (Runtime)

| Secret Name         | Description                                                |
| :------------------ | :--------------------------------------------------------- |
| `DATABASE_URL`      | Production PostgreSQL connection string (asyncpg)          |
| `REDIS_URL`         | Production Redis connection string (rediss://)             |
| `JWT_SECRET`        | Secret key for signing app-level JWTs                      |
| `NEXTAUTH_SECRET`   | Secret key for NextAuth sessions                           |
| `PRODUCTION_DOMAIN` | The base domain of your app (e.g. `analytics.mclarens.lk`) |

### 🆔 Identity & Email

| Secret Name                     | Description                                               |
| :------------------------------ | :-------------------------------------------------------- |
| `AZURE_AD_CLIENT_ID`            | Microsoft Entra ID Application Client ID                  |
| `AZURE_AD_TENANT_ID`            | Microsoft Entra ID Tenant ID                              |
| `AZURE_AD_CLIENT_SECRET`        | Microsoft Entra ID Application Client Secret              |
| `AZURE_EMAIL_CONNECTION_STRING` | (Optional) Azure Communication Services connection string |
| `AZURE_EMAIL_SENDER`            | (Optional) Verified ACS sender address                    |

---

## 🚀 Deployment Workflow Details

### 1. CI Gate

The deployment will **fail fast** if the unit tests do not pass. This ensures that broken code never reaches the registry.

### 2. Versioned Docker Builds

Images are tagged with both `:latest` and a unique identifier combining the branch name, short commit SHA, and a timestamp (e.g., `mcl-backend:main-a1b2c3d4-20240223`).

### 3. Database Migrations

The pipeline automatically runs `alembic upgrade head` on the **Backend Container App** immediately after the backend image is updated but _before_ the frontend is deployed. This prevents "New Frontend → Old Schema" mismatches.

### 4. Zero-Downtime Deployment

Azure Container Apps handles the rollout using **Revisions**. The pipeline ensures the new version is "Healthy" before routing traffic to it.

### 5. Post-Deployment Smoke Tests

After successful rollout, the pipeline performs a series of automated `curl` requests to:

- Verify `/health/full` returns `"status": "healthy"`.
- Verify the Auth API is reachable.
- Verify the API root metadata is correct.

---

## 🛠️ Local Testing of Pipelines

To test these workflows locally without pushing to GitHub, you can use [**act**](https://github.com/nektos/act).

```bash
# Run the CI pipeline locally
act -W .github/workflows/ci.yml
```

---

## 🚨 Troubleshooting

### "CI Gate Failed"

- Check the **GitHub Actions logs**. Usually, this is due to a failing test in `apps/api/tests/`.
- Ensure your local environment matches the CI environment (Python 3.11, Node 20).

### "Deployment Succeeded but Site is Down"

- Check **Container App System Logs** in the Azure Portal.
- Common causes:
  - Incorrect `DATABASE_URL` or `REDIS_URL`.
  - Key Vault access denied (if used).
  - Failed database migration (check `alembic` logs).

### "Frontend can't talk to Backend"

- Verify `NEXT_PUBLIC_API_URL` secret is set correctly.
- Check CORS settings in `apps/api/src/main.py`. The `CORS_ORIGINS` must include the production domain.
