# Skill: API Auth + RBAC (Entra JWT + DB roles/assignments)

## Goal

API validates identity and enforces authorization.

## Tasks

1. Token validation strategy

- Preferred: validate Entra JWT using issuer/audience/JWKS

2. Load user from DB by `entra_oid`
3. Enforce:
   - is_active
   - has roles
4. RBAC helpers:
   - require_role(ADMIN/FO/FD/MD)
   - require_company_assignment(company_id, FO or FD)

## Acceptance checks

- Valid token + assigned role passes
- Valid token but not in DB blocks (403)
- FO cannot access FD mutations
- FD cannot access companies not assigned
