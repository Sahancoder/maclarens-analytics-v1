# McLarens Analytics - UAT Checklist

> **Version:** 1.0  
> **Last Updated:** 2025-12-27  
> **Environment:** UAT / Pre-Production

---

## 📋 Pre-UAT Requirements

| #   | Requirement                    | Status | Notes                           |
| --- | ------------------------------ | ------ | ------------------------------- |
| 1   | API Server running             | ⬜     | `uvicorn src.main:app --reload` |
| 2   | Database seeded with test data | ⬜     | Run migrations + seed script    |
| 3   | Frontend deployed/running      | ⬜     | `npm run dev` on port 3000      |
| 4   | Test user accounts created     | ⬜     | All 4 roles needed              |
| 5   | Entra ID (Azure AD) configured | ⬜     | If using SSO                    |

---

## 👤 Test User Matrix

| Role             | Email Pattern            | Permissions                                  |
| ---------------- | ------------------------ | -------------------------------------------- |
| Data Officer     | `officer@{company}.com`  | Create, Edit, Submit reports for own company |
| Company Director | `director@{company}.com` | Approve/Reject reports for own company       |
| Admin            | `admin@mclarens.com`     | Manage users, companies, clusters            |
| CEO              | `ceo@mclarens.com`       | View all dashboards, all companies           |

---

## 🔐 Authentication Tests

| #   | Test Case                                 | Expected Result                       | Pass/Fail |
| --- | ----------------------------------------- | ------------------------------------- | --------- |
| A1  | Login with valid credentials              | Token returned, user object populated | ⬜        |
| A2  | Login with invalid password               | Error message, no token               | ⬜        |
| A3  | Login with non-existent email             | Error message, no token               | ⬜        |
| A4  | Access protected route without token      | 401 Unauthorized                      | ⬜        |
| A5  | Access protected route with expired token | 401 Unauthorized                      | ⬜        |
| A6  | `me` query returns correct user           | Email, role, company match            | ⬜        |
| A7  | Logout invalidates session                | Subsequent requests fail              | ⬜        |
| A8  | SSO Login (Entra ID)                      | Redirects and returns token           | ⬜        |

---

## 📝 Report Workflow Tests

### Data Officer Flow

| #   | Test Case                         | Expected Result                              | Pass/Fail |
| --- | --------------------------------- | -------------------------------------------- | --------- |
| R1  | Create new report (Draft)         | Report created with `DRAFT` status           | ⬜        |
| R2  | Edit draft report values          | Values saved correctly                       | ⬜        |
| R3  | Submit report                     | Status changes to `SUBMITTED`, timestamp set | ⬜        |
| R4  | Cannot edit submitted report      | Error or UI disabled                         | ⬜        |
| R5  | View own reports list             | Only own company reports visible             | ⬜        |
| R6  | Respond to rejection with comment | Comment saved with timestamp                 | ⬜        |
| R7  | Re-submit after correction        | Status back to `SUBMITTED`                   | ⬜        |

### Director Flow

| #   | Test Case                       | Expected Result                         | Pass/Fail |
| --- | ------------------------------- | --------------------------------------- | --------- |
| D1  | View pending reports            | All `SUBMITTED` reports for own company | ⬜        |
| D2  | Approve report                  | Status → `APPROVED`, `approvedAt` set   | ⬜        |
| D3  | Reject report with reason       | Status → `REJECTED`, reason stored      | ⬜        |
| D4  | Cannot approve already approved | Error or UI disabled                    | ⬜        |
| D5  | View report comments thread     | All comments visible with timestamps    | ⬜        |

### Cross-Role Verification

| #   | Test Case                            | Expected Result                | Pass/Fail |
| --- | ------------------------------------ | ------------------------------ | --------- |
| X1  | Officer submits → Director sees it   | Report appears in pending list | ⬜        |
| X2  | Director rejects → Officer notified  | In-app notification created    | ⬜        |
| X3  | Director approves → Report immutable | No further edits possible      | ⬜        |
| X4  | Comments visible to both roles       | Thread shows all parties       | ⬜        |

---

## 📊 CEO Dashboard Tests

| #   | Test Case                              | Expected Result                    | Pass/Fail |
| --- | -------------------------------------- | ---------------------------------- | --------- |
| C1  | Group KPIs load correctly              | All metrics populated              | ⬜        |
| C2  | Cluster performance shows all clusters | Data matches approved reports      | ⬜        |
| C3  | Top performers ranked correctly        | Highest achievement % first        | ⬜        |
| C4  | Bottom performers ranked correctly     | Lowest achievement % first         | ⬜        |
| C5  | Risk clusters identified               | Negative variance flagged          | ⬜        |
| C6  | YTD calculations correct               | Sum of monthly actuals             | ⬜        |
| C7  | Variance % calculated correctly        | `(actual - budget) / budget * 100` | ⬜        |
| C8  | Month/Year filter works                | Data changes with selection        | ⬜        |

---

## 🛡️ Security & Authorization Tests

| #   | Test Case                            | Expected Result            | Pass/Fail |
| --- | ------------------------------------ | -------------------------- | --------- |
| S1  | Data Officer cannot approve          | Permission denied          | ⬜        |
| S2  | Director cannot access other company | No data returned           | ⬜        |
| S3  | Non-CEO cannot view CEO dashboard    | Permission denied          | ⬜        |
| S4  | Admin can manage all users           | Full CRUD access           | ⬜        |
| S5  | Company scope enforced in backend    | Resolver checks company_id | ⬜        |
| S6  | SQL injection attempt blocked        | Input sanitized            | ⬜        |
| S7  | XSS in comments prevented            | HTML escaped               | ⬜        |

---

## 📧 Notification Tests

| #   | Test Case                                | Expected Result                | Pass/Fail |
| --- | ---------------------------------------- | ------------------------------ | --------- |
| N1  | Report submitted → Director notification | In-app + email (if configured) | ⬜        |
| N2  | Report rejected → Officer notification   | In-app + email with reason     | ⬜        |
| N3  | Report approved → Officer notification   | In-app + email                 | ⬜        |
| N4  | Comment added → Other party notified     | In-app notification            | ⬜        |
| N5  | Mark notification as read                | `isRead` flag updated          | ⬜        |
| N6  | Unread count updates in UI               | Badge shows correct number     | ⬜        |

---

## 📈 Analytics & Reporting Tests

| #   | Test Case                      | Expected Result      | Pass/Fail |
| --- | ------------------------------ | -------------------- | --------- |
| AN1 | Financial data saved correctly | All fields persisted | ⬜        |
| AN2 | Monthly metrics aggregate      | Sum by month correct | ⬜        |
| AN3 | YTD metrics aggregate          | Rolling sum correct  | ⬜        |
| AN4 | Scenario analysis calculates   | Impact % correct     | ⬜        |
| AN5 | Forecast data populates charts | Data points match    | ⬜        |

---

## 🔄 Integration Tests

| #   | Test Case                                                    | Expected Result              | Pass/Fail |
| --- | ------------------------------------------------------------ | ---------------------------- | --------- |
| I1  | Full workflow: Create → Submit → Reject → Resubmit → Approve | All statuses correct         | ⬜        |
| I2  | Multiple reports same company/period                         | Handled correctly            | ⬜        |
| I3  | Concurrent edits (2 users)                                   | No data corruption           | ⬜        |
| I4  | Large dataset (100+ reports)                                 | Performance acceptable (<2s) | ⬜        |

---

## ✅ Sign-Off

| Role                 | Name | Date | Signature |
| -------------------- | ---- | ---- | --------- |
| QA Lead              |      |      |           |
| Dev Lead             |      |      |           |
| Product Owner        |      |      |           |
| Business Stakeholder |      |      |           |

---

## 📝 Notes / Issues Found

| #   | Issue Description | Severity | JIRA # | Status |
| --- | ----------------- | -------- | ------ | ------ |
| 1   |                   |          |        |        |
| 2   |                   |          |        |        |
| 3   |                   |          |        |        |
