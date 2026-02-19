# 🚀 Deployment Guide

## Overview

This application is designed to be deployed as a containerized microservices architecture on **Microsoft Azure**.

## ☁️ Azure Infrastructure

### 1. Core Resources

- **Azure Container Apps (ACA)**: Hosts the application containers (Serverless Containers).
  - **Frontend App**: Next.js container (Port 3000).
  - **Backend App**: FastAPI container (Port 8000).
- **Azure Database for PostgreSQL**: Fully managed Flexible Server (Production DB).
- **Azure Container Registry (ACR)**: Stores private Docker images.

### 2. External Services

- **Azure Communication Services (ACS)**: Handles transactional emails (Report status updates).
- **Redis (Optional)**: Can use Azure Cache for Redis or a sidecar container for session/caching.

## 🐳 Docker Strategy

### Frontend (`apps/frontend/Dockerfile`)

- Uses **Multi-stage build** to optimize image size.
- Builds Next.js in `standalone` mode.
- Injects environment variables (`NEXT_PUBLIC_API_URL`, etc.) at runtime.

### Backend (`apps/api/Dockerfile`)

- Base image: `python:3.11-slim`.
- Installs dependencies from `requirements.txt`.
- Runs with `uvicorn` for high-performance ASGI handling.

## 🔄 CI/CD Pipeline (GitHub Actions)

1.  **Build**: Triggered on push to `main`.
2.  **Test**: Runs unit tests (Pytest).
3.  **Push**: Builds Docker images and pushes to ACR.
4.  **Deploy**: Updates the Azure Container Apps revisions with the new image tags.

## 🔧 Environment Variables

### Backend

| Variable                        | Description                      |
| :------------------------------ | :------------------------------- |
| `DATABASE_URL`                  | PostgreSQL connection string.    |
| `AUTH_MODE`                     | `entra` (Prod) or `dev` (Local). |
| `AZURE_EMAIL_CONNECTION_STRING` | Connection key for ACS.          |

### Frontend

| Variable              | Description                                      |
| :-------------------- | :----------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Public URL for client-side fetches.              |
| `BACKEND_URL`         | Internal Docker DNS URL for server-side fetches. |
