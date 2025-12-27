# Deployment Guide

## Overview

MacLarens Analytics is deployed on Azure using Container Apps for the application tier and managed services for data storage.

## Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| Development | Local development | localhost:3000 |
| Staging | Pre-production testing | staging.maclarens.com |
| Production | Live environment | app.maclarens.com |

## Prerequisites

- Azure subscription
- Azure CLI installed
- Docker installed
- GitHub account (for CI/CD)

## Infrastructure Setup

### 1. Create Resource Group

```bash
az group create --name maclarens-rg --location eastus
```

### 2. Create Container Registry

```bash
az acr create \
  --name maclarensacr \
  --resource-group maclarens-rg \
  --sku Standard \
  --admin-enabled true
```

### 3. Create PostgreSQL Server

See [infra/azure/postgres.md](../infra/azure/postgres.md)

### 4. Create Container Apps Environment

See [infra/azure/container-apps.md](../infra/azure/container-apps.md)

### 5. Configure Front Door

See [infra/azure/front-door.md](../infra/azure/front-door.md)

## Deployment Process

### Build Images

```bash
# Build API image
docker build -t maclarensacr.azurecr.io/api:latest ./apps/api

# Build Frontend image
docker build -t maclarensacr.azurecr.io/frontend:latest ./apps/frontend

# Push images
az acr login --name maclarensacr
docker push maclarensacr.azurecr.io/api:latest
docker push maclarensacr.azurecr.io/frontend:latest
```

### Deploy to Container Apps

```bash
# Update API
az containerapp update \
  --name maclarens-api \
  --resource-group maclarens-rg \
  --image maclarensacr.azurecr.io/api:latest

# Update Frontend
az containerapp update \
  --name maclarens-frontend \
  --resource-group maclarens-rg \
  --image maclarensacr.azurecr.io/frontend:latest
```

## CI/CD Pipeline

GitHub Actions workflows automate the deployment process:

1. **CI (ci.yml)**: Runs on every PR
   - Lint and type check
   - Run unit tests
   - Build Docker images

2. **CD (cd.yml)**: Runs on merge to main
   - Build and push Docker images
   - Deploy to staging
   - Run smoke tests
   - Deploy to production (manual approval)

## Environment Variables

Configure these in Container Apps:

### API
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `AZURE_TENANT_ID` - Azure AD tenant
- `AZURE_CLIENT_ID` - Azure AD app client ID
- `API_SECRET_KEY` - API secret key

### Frontend
- `NEXT_PUBLIC_API_URL` - GraphQL API URL
- `NEXT_PUBLIC_AZURE_CLIENT_ID` - Azure AD client ID
- `NEXT_PUBLIC_AZURE_TENANT_ID` - Azure AD tenant

## Monitoring

- Azure Application Insights for APM
- Azure Monitor for infrastructure metrics
- Log Analytics for centralized logging
- Alerts configured for critical issues

## Rollback

```bash
# Rollback to previous revision
az containerapp revision list \
  --name maclarens-api \
  --resource-group maclarens-rg

az containerapp ingress traffic set \
  --name maclarens-api \
  --resource-group maclarens-rg \
  --revision-weight <previous-revision>=100
```
