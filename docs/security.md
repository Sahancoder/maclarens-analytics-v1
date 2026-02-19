# 🔐 Security Architecture

## Overview

McLarens Analytics employs a **Defense in Depth** strategy, combining strong authentication, strict Role-Based Access Control (RBAC), and data isolation policies.

## 🛡️ Authentication (Hybrid)

The system supports two authentication modes, configured via `AUTH_MODE` env var:

### 1. Production: Microsoft Entra ID (Azure AD)

- **Protocol**: OpenID Connect (OIDC) / OAuth 2.0.
- **Flow**: Frontend acquires token via MSAL -> Backend validates token signature & claims.
- **Verification**: Backend verifies `iss`, `aud`, and `exp` claims against the Azure Tenant.

### 2. Development: Custom JWT

- **Mechanism**: Local email/password login.
- **Token**: HMAC-SHA256 signed JWTs.
- **Purpose**: Allows offline development without Azure dependencies.

## 👤 Authorization (RBAC)

Access is denied by default. Permissions are granted via roles:

| Role                 | Access Scope                                                                                           |
| :------------------- | :----------------------------------------------------------------------------------------------------- |
| **Finance Officer**  | RW access to **own company's** drafts only. Read-only access to historical reports.                    |
| **Finance Director** | RW access to reviews for **assigned clusters**. Read-only access to all reports in cluster.            |
| **MD**               | Global Read-only access.                                                                               |
| **Admin**            | Full access to System Configuration (Users, Companies, Clusters). No access to financial data editing. |

## 🔒 Data Security

### 1. Row-Level Isolation

- Users are linked to specific `company_id` or `cluster_id`.
- API endpoints filter all queries by these IDs.
- **Prevention**: Prevents Insecure Direct Object Reference (IDOR) attacks. An FO cannot view/edit another FO's report even by guessing the ID.

### 2. Input Validation

- All inputs are validated using **Pydantic v2** schemas.
- Strict type checking prevents injection attacks.

### 3. Audit Logging

- Critical actions are logged to the `audit_logs` table:
  - Login events.
  - Report status changes (Submission, Approval, Rejection).
  - User/Company administrative changes.

## 🌐 Network Security (Azure)

- **Container Apps**: Running in a secure environment.
- **Database**: PostgreSQL Flexible Server configured with firewall rules to allow access only from internal Azure services.
- **TLS**: All data in transit is encrypted via TLS 1.2+.
