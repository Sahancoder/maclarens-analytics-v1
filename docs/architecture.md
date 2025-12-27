# MacLarens Analytics Architecture

## Overview

MacLarens Analytics is a comprehensive analytics platform built with a modern microservices architecture, featuring role-based access control and multi-tenant support.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Azure Front Door                             │
│                    (Global Load Balancer + WAF)                      │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
    ┌─────────▼─────────┐         ┌──────────▼──────────┐
    │    Frontend       │         │       API           │
    │   (Next.js)       │────────▶│   (FastAPI)         │
    │ Container App     │ GraphQL │  Container App      │
    └───────────────────┘         └──────────┬──────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
          ┌─────────▼─────────┐   ┌─────────▼─────────┐   ┌──────────▼──────────┐
          │    PostgreSQL     │   │      Redis        │   │   Azure Entra ID    │
          │  Flexible Server  │   │   (Cache/Queue)   │   │   (Authentication)  │
          └───────────────────┘   └───────────────────┘   └─────────────────────┘
```

## Components

### Frontend (Next.js)

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **State Management**: Apollo Client
- **Authentication**: MSAL React (Azure AD)

### Backend API (FastAPI)

- **Framework**: FastAPI
- **GraphQL**: Strawberry GraphQL
- **Database**: SQLAlchemy + asyncpg
- **Authentication**: Azure Entra ID tokens

### Data Layer

- **Primary Database**: Azure PostgreSQL Flexible Server
- **Caching**: Azure Cache for Redis
- **Migrations**: Alembic

## Security

### Authentication Flow

1. User clicks "Sign in with Microsoft"
2. MSAL redirects to Azure AD login
3. User authenticates and grants consent
4. Azure AD returns access token
5. Frontend sends token with GraphQL requests
6. API validates token and extracts user claims

### Role-Based Access Control (RBAC)

| Role | Access Level |
|------|--------------|
| Data Officer | Own company data, create/submit reports |
| Director | Cluster-level data, approve reports |
| CEO | All data, executive dashboards |
| Admin | System administration |

## Data Flow

### Report Submission Workflow

```
Data Officer → Submit → Director Review → CEO Approval → Approved
                   ↓              ↓
                Rejected      Rejected
```

## Scalability

- Horizontal scaling via Container Apps
- Database read replicas for analytics queries
- Redis caching for frequently accessed data
- CDN for static assets
