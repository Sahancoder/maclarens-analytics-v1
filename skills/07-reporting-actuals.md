# Skill: Actual Reporting (FO)

## Goal

Draft/save/submit actuals with server-side calculations + versioning.

## Key rules

- Draft editable
- Submit locks report (immutable)
- Reject creates new version draft (copy last version)
- Calculations are server-side canonical

## GraphQL operations

- createActualDraft(companyId, fy, month)
- updateActualDraft(reportId, input)
- submitActual(reportId)
- createActualRevisionFrom(reportId) (new version after reject)
- officerActuals(status, filters)

## DB mapping

- periods (upsert)
- actual_reports (status/version/locked timestamps)
- actual_metrics (inputs + derived)
- audit_logs (events)

## Acceptance checks

- FO can create and save drafts
- Submit changes status + locks edits
- New version can be created after reject
