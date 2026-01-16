# Skill: Security Hardening

## Goal

Make the platform safe for production.

## Checklist

- Enforce RBAC at resolver/mutation level
- Validate company assignments for every report action
- Strict CORS allowlist
- Rate-limit auth endpoints (Redis)
- Store secrets in Key Vault
- Audit logs for all sensitive admin actions
- Prevent IDOR: never allow accessing report by id without scope check
- Lock submitted reports server-side
- Input validation (Pydantic v2) with numeric bounds
- Use prepared SQLAlchemy statements (default)
- Implement soft-delete or active flags carefully

## Acceptance checks

- Attempted cross-company access returns 403
- Locked report edits are rejected even if client tries
- Audit logs capture admin changes
