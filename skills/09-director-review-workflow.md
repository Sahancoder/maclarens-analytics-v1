# Skill: Finance Director Review Workflow

## Goal

FD reviews Actual + Budget and approves/rejects.

## GraphQL operations

- directorPending(companyId?, fy?, month?)
- directorReview(companyId, fy, month) -> returns actual+budget+variance
- approveActual(reportId, comment?)
- rejectActual(reportId, message, fields?)

## Rules

- FD can only reviews assigned companies
- Reject requires comment
- Approve marks approved; optional “submitToMd” step

## Acceptance checks

- FD sees pending list for only their companies
- FD can approve/reject
- Reject notifies FO and appears in FO rejected list
