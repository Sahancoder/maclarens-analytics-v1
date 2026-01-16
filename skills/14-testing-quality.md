# Skill: Testing & Quality

## Goal

Prevent regressions in auth, workflows, and calculations.

## Tests

API:

- RBAC tests (FO cannot approve; FD cannot edit draft)
- Workflow tests (submit locks; reject creates new version)
- Calculation tests (gp margin, totals, pbt)
- Analytics tests (YTD sums, vs LY)

Frontend:

- Basic route protection tests (optional)
- GraphQL contract tests (optional)

## Acceptance checks

- CI runs tests on PR
- Calculation changes require updated tests (no silent drift)
