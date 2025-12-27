# Approval Workflows

## Overview

MacLarens Analytics implements a multi-stage approval workflow for financial reports, ensuring proper review and sign-off at each organizational level.

## Workflow Stages

### 1. Data Entry (Draft)

**Actor**: Data Officer

- Create new reports with financial data
- Save drafts for later completion
- Edit and update draft reports
- Submit for director review

### 2. Director Review

**Actor**: Director

- Review submitted reports from companies in their cluster
- Validate data accuracy and completeness
- Approve to forward to CEO
- Reject with feedback for revision

### 3. CEO Approval

**Actor**: CEO

- Final review of reports
- Executive approval for finalization
- Reject for further review

### 4. Completed

**Status**: Approved

- Report is finalized and locked
- Data contributes to analytics dashboards
- Historical record maintained

## Workflow Diagram

```
┌──────────────┐     Submit      ┌──────────────┐
│    DRAFT     │───────────────▶│  SUBMITTED   │
└──────────────┘                 └──────┬───────┘
       ▲                                │
       │                         Director
       │ Reject                  Reviews
       │                                │
       │         ┌─────────────────────┬┘
       │         │                     │
       │         ▼                     ▼
       │    ┌──────────┐        ┌──────────────┐
       └────│ REJECTED │        │ UNDER_REVIEW │
            └──────────┘        └──────┬───────┘
                  ▲                    │
                  │              CEO Reviews
                  │                    │
                  │         ┌──────────┴──────────┐
                  │         │                     │
                  │         ▼                     ▼
                  │    ┌──────────┐        ┌──────────┐
                  └────│ REJECTED │        │ APPROVED │
                       └──────────┘        └──────────┘
```

## Status Definitions

| Status | Description |
|--------|-------------|
| DRAFT | Report is being prepared by Data Officer |
| SUBMITTED | Report submitted for director review |
| UNDER_REVIEW | Director approved, awaiting CEO review |
| APPROVED | Final approval granted, report is complete |
| REJECTED | Report rejected, returned for revision |

## Notifications

The system sends notifications at each workflow stage:

- **Submission**: Directors notified of pending review
- **Approval**: Author notified, next approver notified
- **Rejection**: Author notified with rejection reason
- **Deadline Reminders**: Sent before reporting deadlines

## Business Rules

1. Only draft reports can be edited
2. Reports cannot skip workflow stages
3. Rejection returns report to draft status
4. Approvers cannot approve their own reports
5. CEO can approve at any stage (emergency approval)
