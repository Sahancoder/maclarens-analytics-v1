# Azure Container Apps Deployment

## Overview

MacLarens Analytics uses Azure Container Apps for hosting both the frontend and API services.

## Architecture

- **Container Apps Environment**: Single environment for all services
- **Frontend Container App**: Next.js application
- **API Container App**: FastAPI GraphQL backend
- **Managed Identity**: For secure service-to-service communication

## Setup

### Prerequisites

1. Azure CLI installed
2. Azure subscription with Container Apps enabled
3. Azure Container Registry (ACR)

### Create Container Apps Environment

```bash
az containerapp env create \
  --name maclarens-env \
  --resource-group maclarens-rg \
  --location eastus
```

### Deploy API

```bash
az containerapp create \
  --name maclarens-api \
  --resource-group maclarens-rg \
  --environment maclarens-env \
  --image $ACR_NAME.azurecr.io/maclarens-api:latest \
  --target-port 8000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1Gi
```

### Deploy Frontend

```bash
az containerapp create \
  --name maclarens-frontend \
  --resource-group maclarens-rg \
  --environment maclarens-env \
  --image $ACR_NAME.azurecr.io/maclarens-frontend:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 5 \
  --cpu 0.5 \
  --memory 1Gi
```

## Environment Variables

Configure the following environment variables for each container app:

### API
- `DATABASE_URL`
- `REDIS_URL`
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`

### Frontend
- `NEXT_PUBLIC_API_URL`

## Scaling

Container Apps automatically scales based on HTTP traffic. Configure scaling rules:

```bash
az containerapp update \
  --name maclarens-api \
  --resource-group maclarens-rg \
  --scale-rule-name http-rule \
  --scale-rule-type http \
  --scale-rule-http-concurrency 100
```
