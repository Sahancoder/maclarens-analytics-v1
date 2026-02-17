# QA Bugs & Vulnerabilities Report

Date: February 13, 2026  
Project: `maclarens-analytics-v1`

## 1. Scope

This QA pass covered:
- Backend API route behavior and auth controls
- Frontend runtime availability
- Container connectivity checks
- Dependency vulnerability scan (Python)
- Dependency vulnerability indicators (Node/Next.js)

## 2. Tools and Checks Run

- Runtime/API checks with `Invoke-WebRequest`
- Container checks with `docker compose ps`, `docker logs`, `docker exec`
- Python dependency audit with `pip-audit`
- Static source review for auth/risk paths

## 3. Environment Notes

- Frontend currently not serving (`http://localhost:3000` times out) due Next.js SWC load failure.
- Network/proxy interception is present for npm endpoints (requests redirected to `192.168.0.25/UserCheck/...`), which also breaks `npm audit`.

## 4. Executive Summary

High-risk items are present:
- Unauthenticated sensitive endpoints (export + dev email sender)
- Broken Microsoft login endpoint (returns 500)
- Dev login route active without auth mode guard
- Weak default auth settings in code defaults
- Multiple backend dependency vulnerabilities (13 findings across 6 packages)
- Frontend is currently unavailable (white screen/timeouts)

## 5. Detailed Findings

### F-01: Unauthenticated financial export endpoints
Severity: Critical  
Area: Backend auth/authorization  
Evidence:
- `apps/api/src/main.py:241` (`/export/financial-summary`) has no auth dependency.
- `apps/api/src/main.py:268` (`/export/available-periods`) has no auth dependency.
- Runtime check: `GET /export/available-periods => 200` without token.

Impact:
- Any unauthenticated caller can access financial export metadata/files.

Fix:
- Add role/permission dependency checks (for example admin/MD/FD only).
- Return `401/403` for unauthenticated/unauthorized requests.

---

### F-02: Unauthenticated dev email sender endpoint
Severity: Critical  
Area: Backend abuse surface  
Evidence:
- `apps/api/src/main.py:285` (`/dev/send-test-email`) has no auth or environment gating.
- Runtime check: `POST /dev/send-test-email => 200` without token.

Impact:
- Open mail relay behavior (spam abuse, reputational risk, incident noise).

Fix:
- Restrict endpoint to dev environment only (`settings.environment == "development"`).
- Add admin auth dependency and rate limiting.
- Disable entirely in production builds.

---

### F-03: Microsoft login endpoint is non-functional (500)
Severity: High  
Area: Auth reliability  
Evidence:
- `apps/api/src/routers/auth_router.py:42` route exists.
- `apps/api/src/routers/auth_router.py:66` contains `pass`.
- Runtime check: `POST /auth/microsoft-login => 500`.

Impact:
- Production Entra login path is broken.

Fix:
- Implement real token verification + user lookup flow.
- Return typed error responses (`401/403`) instead of unhandled `500`.
- Add tests for valid token, invalid token, and unprovisioned users.

---

### F-04: Dev login route exposed without auth-mode guard
Severity: High  
Area: Authentication bypass risk  
Evidence:
- `apps/api/src/routers/auth_router.py:68` defines `/auth/login/dev`.
- No check for `settings.auth_mode == dev`.

Impact:
- If deployed with this route enabled, email-only login can be abused.

Fix:
- Hard-gate route:
  - If `auth_mode != dev`, return `404` or `403`.
- Optionally mount dev routes only in development startup path.

---

### F-05: Weak/insecure defaults in settings
Severity: High  
Area: Security configuration  
Evidence:
- `apps/api/src/config/settings.py:35` default JWT secret is static.
- `apps/api/src/config/settings.py:72` default `debug=True`.
- `apps/api/src/config/settings.py:32` default auth mode is `dev`.

Impact:
- Dangerous defaults increase risk of insecure deployment.

Fix:
- Remove insecure defaults for production-sensitive values.
- Fail startup if required secrets are missing in non-dev environments.
- Default `debug=False`, `auth_mode=entra` for non-local profiles.

---

### F-06: Frontend unavailable (white screen / timeout)
Severity: High  
Area: Availability  
Evidence:
- `http://localhost:3000` times out.
- `docker inspect` shows high restart count (`RestartCount=81` observed).
- `docker logs maclarens-frontend` shows:
  - `Failed to load SWC binary for linux/x64`
  - attempted loading `@next/swc-linux-x64-gnu` / `musl` not installed.

Impact:
- UI is down; system unusable for end users.

Fix:
- Rebuild frontend image cleanly with valid `node_modules` for target platform.
- Remove manually injected invalid SWC directories.
- Ensure package install succeeds in Docker build and locks align with image OS/libc.

---

### F-07: Backend container dependency drift from requirements
Severity: Medium  
Area: Reproducibility / patch compliance  
Evidence:
- `apps/api/requirements.txt` pins:
  - `strawberry-graphql==0.228.0` (`:3`)
  - `python-multipart==0.0.9` (`:12`)
  - `starlette` transitively newer via FastAPI chain
- Running backend container currently has older versions:
  - `strawberry-graphql==0.217.0`
  - `python-multipart==0.0.6`
  - `starlette==0.35.1`

Impact:
- Scans/fixes against repo may not match runtime; vulnerable versions may remain deployed.

Fix:
- Rebuild backend image without stale cache.
- Validate installed versions inside container match lock/pins after rebuild.

---

### F-08: Backend dependency vulnerabilities (pip-audit)
Severity: High  
Area: Supply chain security  
Evidence:
- `pip-audit` result: **13 vulnerabilities in 6 packages**.
- Key vulnerable packages:
  - `strawberry-graphql` (`apps/api/requirements.txt:3`)
  - `python-jose` (`apps/api/requirements.txt:8`)
  - `python-multipart` (`apps/api/requirements.txt:12`)
  - `requests` (transitive)
  - `starlette` (transitive)
  - `ecdsa` (no fix currently available)

Notable advisories:
- `strawberry-graphql`: `CVE-2024-47082`, `CVE-2025-22151`
- `python-jose`: `CVE-2024-33663`, `CVE-2024-33664`
- `python-multipart`: `CVE-2024-53981`, `CVE-2026-24486`
- `requests`: `CVE-2024-35195`, `CVE-2024-47081`
- `starlette`: `CVE-2024-47874`, `CVE-2025-54121`

Fix:
- Upgrade direct dependencies to patched versions.
- Re-run `pip-audit` after upgrades.
- For `ecdsa` (no fixed version), assess compensating controls and potential replacement.

---

### F-09: Known vulnerable Next.js version in lockfile
Severity: High  
Area: Frontend dependency risk  
Evidence:
- `apps/frontend/package-lock.json:9755` includes:
  - `"deprecated": "This version has a security vulnerability..."`
  - Current `next` is `14.2.3` (`:9752`).

Impact:
- Frontend includes a known vulnerable Next.js release.

Fix:
- Upgrade `next` and `eslint-config-next` to a patched version.
- Rebuild and regression test auth, middleware rewrites, and dashboard pages.

---

### F-10: Dev-mode helper returns hardcoded `True`
Severity: Medium  
Area: Security logic correctness  
Evidence:
- `apps/api/src/security/middleware.py:101`:
  - `def is_dev_mode() -> bool: return True`

Impact:
- Future guard logic using this helper will be incorrect and may enable dev behavior in non-dev.

Fix:
- Replace with settings-based logic:
  - `return settings.auth_mode == AuthMode.DEV` or environment profile checks.

---

### F-11: QA process gaps (no backend tests, no configured frontend lint)
Severity: Medium  
Area: Test quality  
Evidence:
- `docker exec maclarens-backend pytest -q` => `no tests ran`
- `npm run lint` prompts interactive setup (ESLint not configured), not CI-safe.

Impact:
- Regression and security defects can ship without automated gate.

Fix:
- Add baseline backend tests (auth, permission, export route protection).
- Commit ESLint config for frontend and run non-interactively in CI.

## 6. Connectivity/Mismatch Check (Frontend/Backend/DB/Redis)

Status:
- `frontend -> backend`: reachable inside Docker network (`http://backend:8000/health` OK).
- `backend -> db`: connection OK.
- `backend -> redis`: connection OK.

Conclusion:
- Service network wiring is correct.
- Primary runtime blocker is frontend build/runtime dependency state (SWC + package resolution), not backend/db connectivity.

## 7. Prioritized Remediation Plan

### Immediate (same day)
1. Protect `/export/*` and `/dev/send-test-email` with auth + env guard.
2. Disable `/auth/login/dev` outside dev mode.
3. Fix `/auth/microsoft-login` implementation to avoid 500.
4. Rebuild frontend image cleanly to restore `localhost:3000`.

### Short term (1-3 days)
1. Upgrade vulnerable Python and Next.js dependencies.
2. Rebuild containers and verify runtime versions match repo pins.
3. Add smoke tests for auth and critical endpoints.

### Medium term (this sprint)
1. Add CI gates:
   - `pip-audit`
   - `npm audit` (from network where audit endpoint is accessible)
   - unit/integration tests
2. Enforce secure config policy (no weak defaults in production).

## 8. Suggested Fix Commands

```bash
# Rebuild backend and frontend cleanly
docker compose -f infra/docker/docker-compose.dev.yml build --no-cache backend frontend
docker compose -f infra/docker/docker-compose.dev.yml up -d backend frontend

# Verify backend runtime package versions
docker exec maclarens-backend python -m pip list | grep -E "strawberry-graphql|python-jose|python-multipart|starlette|requests"

# Run backend vulnerability scan (host)
python -m pip_audit -r apps/api/requirements.txt

# Check frontend health after rebuild
docker logs --tail 100 maclarens-frontend
curl -I http://localhost:3000
```

## 9. Known Limitations of This QA Run

- `npm audit` could not complete due network/proxy interception returning HTML instead of JSON.
- Frontend lint is not currently configured in a non-interactive way.
- Backend currently has no executable test suite in repository.

