# Skill: Database Schema + Migrations (PostgreSQL + Alembic)

## Goal

Implement schema + migrations for:

- users, roles, assignments
- clusters, companies, periods
- actual_reports + actual_metrics (immutable submit)
- budget_reports + budget_metrics
- notifications, report_comments, audit_logs

## Tasks

1. Define SQLAlchemy async models
2. Setup Alembic:
   - env.py for async engine
   - versions/ migrations
3. Add seed script:
   - create roles
   - create initial admin user (by entra oid + email)
4. Add indexes and constraints:
   - unique period (company, fy, month)
   - unique report version (period_id, version_no)

## Acceptance checks

- `alembic upgrade head` builds schema
- Basic seed inserts roles successfully
- constraints prevent duplicate periods
