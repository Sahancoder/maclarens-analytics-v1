# Database Schema

## Overview

MacLarens Analytics uses PostgreSQL as the primary database, with a normalized schema designed for multi-tenant data isolation and efficient querying.

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Clusters  │──────<│  Companies  │──────<│    Users    │
└─────────────┘       └─────────────┘       └──────┬──────┘
                             │                     │
                             │                     │
                             ▼                     ▼
                      ┌─────────────┐       ┌──────────────┐
                      │   Reports   │──────<│  Approvals   │
                      └─────────────┘       └──────────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │ Audit Logs  │
                      └─────────────┘
```

## Tables

### clusters

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Cluster name |
| code | VARCHAR(50) | Unique code |
| description | TEXT | Description |
| region | VARCHAR(100) | Geographic region |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

### companies

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Company name |
| code | VARCHAR(50) | Unique code |
| cluster_id | UUID | FK to clusters |
| address | TEXT | Address |
| contact_email | VARCHAR(255) | Contact email |
| contact_phone | VARCHAR(50) | Contact phone |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

### users

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Email (unique) |
| name | VARCHAR(255) | Full name |
| role | VARCHAR(50) | User role |
| company_id | UUID | FK to companies |
| cluster_id | UUID | FK to clusters |
| azure_oid | VARCHAR(255) | Azure AD Object ID |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |
| last_login | TIMESTAMP | Last login time |

### reports

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | VARCHAR(255) | Report title |
| status | VARCHAR(50) | Workflow status |
| data | JSONB | Report data |
| author_id | UUID | FK to users |
| company_id | UUID | FK to companies |
| rejection_reason | TEXT | Rejection reason |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |
| submitted_at | TIMESTAMP | Submission time |

### report_approvals

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| report_id | UUID | FK to reports |
| approver_id | UUID | FK to users |
| status | VARCHAR(50) | Approval status |
| comments | TEXT | Approver comments |
| approved_at | TIMESTAMP | Approval time |
| created_at | TIMESTAMP | Creation time |

### audit_logs

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to users |
| action | VARCHAR(100) | Action performed |
| resource_type | VARCHAR(100) | Resource type |
| resource_id | UUID | Resource ID |
| details | JSONB | Additional details |
| ip_address | VARCHAR(50) | Client IP |
| user_agent | VARCHAR(500) | User agent |
| timestamp | TIMESTAMP | Event time |

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_company ON reports(company_id);
CREATE INDEX idx_reports_author ON reports(author_id);
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

## Migrations

Use Alembic for database migrations:

```bash
# Create migration
alembic revision --autogenerate -m "description"

# Run migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```
