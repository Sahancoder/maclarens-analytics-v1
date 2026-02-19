# 🏗️ System Architecture

## Overview

McLarens Analytics is a modern, full-stack financial reporting platform designed to streamline the specific data collection and approval workflows of the McLarens Group. It replaces legacy Excel-based processes with a secure, web-based application.

## 🧩 Technology Stack

### Frontend (Client)

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query (Server State), Zustand (Client State)
- **API Client**: Custom typed fetch wrapper (`api-client.ts`)

### Backend (Server)

- **Framework**: FastAPI (Python 3.11)
- **Database ORM**: SQLAlchemy (Async)
- **Schema Validation**: Pydantic v2
- **API Style**: REST + GraphQL (Strawberry)
- **Task Queue**: Background tasks (FastAPI `BackgroundTasks`)

### Infrastructure

- **Containerization**: Docker & Docker Compose
- **Cloud Provider**: Microsoft Azure
- **Compute**: Azure Container Apps (ACA)
- **Database**: Azure Database for PostgreSQL (Flexible Server)
- **Cache**: Redis (Azure Cache for Redis)
- **Email**: Azure Communication Services (ACS) / Microsoft Graph

## 🔄 Data Flow

1.  **User Interaction**: Users interact with the Next.js frontend.
2.  **API Requests**: Frontend calls endpoints via `/api/*` (proxied to Backend).
3.  **Authentication Layer**:
    - **Dev Mode**: Custom JWT auth.
    - **Production**: Microsoft Entra ID (Azure AD) OIDC flow.
4.  **Service Layer**: FastAPI routers delegate business logic to specialized Services (`ReportService`, `AuthService`, `NotificationService`).
5.  **Data Access**: Services interact with PostgreSQL via SQLAlchemy models.
6.  **Notifications**: System events trigger Email/In-App notifications via background tasks.

## 🔐 Security Architecture

- **Hybrid Authentication**: Supports both local JWT (dev) and Azure AD (prod).
- **RBAC**: Role-Based Access Control enforced at the API route level.
  - **Finance Officer (FO)**: Data entry, Draft management.
  - **Finance Director (FD)**: Review, Approval/Rejection.
  - **MD**: Read-only high-level dashboards.
  - **Admin**: System configuration and user management.
- **Data Isolation**: Row-Level Security logic ensures users only see companies assigned to them.
