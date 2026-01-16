# Skill: Frontend Pages + Apollo Mapping

## Goal

Implement Next.js pages and wire them to GraphQL.

## Core pages

FO:

- /officer/actual-entry
- /officer/drafts
- /officer/rejected
- /officer/notifications

FD:

- /director/dashboard
- /director/review-reports
- /director/company-analytics
- /director/notifications

ADMIN:

- /admin/dashboard
- /admin/users
- /admin/companies
- /admin/clusters
- /admin/budget-entry
- /admin/budget-drafts
- /admin/audit-logs
- /admin/settings

MD:

- /md/overview
- /md/cluster/[id]

## Mapping pattern

- On app boot: run `me` query
- Determine allowed sidebar items based on roles
- All selects (cluster/company) use `me.assignments` (no free browsing)

## Acceptance checks

- Each page loads with a single GraphQL query where possible
- Mutations refetch relevant lists
- UI prevents editing locked items (but backend enforces anyway)
