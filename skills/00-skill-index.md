# McLarens Analytics.io — Agent Skill Index

This folder contains modular “skills” for building the system end-to-end.

## Skills

1. 01-repo-bootstrap.md — Create monorepo, folders, env, lint, formatting
2. 02-infra-local-docker.md — Docker compose for Postgres + Redis, env templates
3. 03-database-schema-migrations.md — PostgreSQL schema + Alembic migrations
4. 04-api-foundation-fastapi-strawberry.md — FastAPI + Strawberry GraphQL base
5. 05-auth-nextauth-entra.md — NextAuth Entra login + token handling
6. 06-api-auth-rbac.md — API token validation + RBAC + company assignments
7. 07-reporting-actuals.md — Actuals draft/save/submit/versioning
8. 08-reporting-budgets.md — Budgets draft/save/submit/versioning
9. 09-director-review-workflow.md — Director pending queue + approve/reject + variance
10. 10-analytics-kpis.md — YTD + LY comparisons + rankings
11. 11-notifications-email.md — Notifications DB + Resend email events
12. 12-frontend-apollo-pages.md — Apollo client, routes, forms, dashboards
13. 13-admin-console.md — Users/roles/companies/clusters/assignments/audit logs
14. 14-testing-quality.md — Unit/integration tests, contract tests, seeding
15. 15-azure-deployment.md — Azure infra mapping + CI/CD checklist
16. 16-security-hardening.md — Guardrails, rate limits, secrets, audit, OWASP basics

## Global constraints

- Authentication via Entra ID (NextAuth).
- Authorization always enforced in API via DB roles + assignments.
- Submitted reports immutable; corrections create new versions.
- Derived metrics are server-calculated canonical truth.
- Notifications are DB-backed; emails mirror DB events.
