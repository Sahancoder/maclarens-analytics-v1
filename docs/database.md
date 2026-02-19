# 🗄️ Database Schema

## Overview

The application uses **PostgreSQL** as its primary data store, managed via **SQLAlchemy** (Async functionality). The schema is designed to handle hierarchical financial data, distinct user roles, and rigorous workflow states.

## 📝 Key Enums

| Enum                 | Values                                                   | Description                                                |
| :------------------- | :------------------------------------------------------- | :--------------------------------------------------------- |
| **UserRole**         | `Finance Officer`, `Finance Director`, `Admin`, `MD`     | Defines user permissions and dashboard access.             |
| **ReportStatus**     | `Draft`, `Submitted`, `Approved`, `Rejected`             | The lifecycle of a monthly financial report.               |
| **FiscalCycle**      | `DECEMBER` (Jan-Dec), `MARCH` (Apr-Mar)                  | Supports different financial year definitions per company. |
| **Scenario**         | `ACTUAL`, `BUDGET`                                       | distinguishes between realized values and planned targets. |
| **NotificationType** | `report_submitted`, `report_approved`, `report_rejected` | Categorizes system alerts.                                 |

## 📦 Core Entities

### 1. Master Data

- **User**: System users linked to Entra ID (in prod). Stores Role, Name, Email.
- **Company**: Legal entities. Linked to a `Cluster` and has a specific `FiscalCycle`.
- **Cluster**: Grouping of companies (e.g., "Maritime", "Logistics").

### 2. Financial Data

- **Report**: Represents a submission bundle for a specific `Company`, `Month`, and `Year`.
  - Tracks `status`, `submitted_by`, `approved_by`.
  - Contains `actual_comment` and `budget_comment`.
- **FinancialData**: The granular line items (Revenue, GP, Expenses, EBIT, etc.).
  - Linked to a `Report` or keyed by Company/Period.
  - Stores raw values for both `ACTUAL` and `BUDGET` scenarios.

### 3. System

- **Notification**: In-app alerts for users.
- **AuditLog**: Records sensitive actions (User creation, Report approval).

## 🛠️ Design Patterns

- **Soft Delete**: Critical tables support soft deletion (`is_active` flags) rather than physical removal.
- **Audit Trails**: All status changes in reports are logged to `ReportHistory`.
- **Hybrid Properties**: Advanced SQLAlchemy features are used for calculated fields (e.g., formatting dates, computing margins).
