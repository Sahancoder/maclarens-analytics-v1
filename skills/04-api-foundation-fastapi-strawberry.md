# Skill: API Foundation (FastAPI + Strawberry GraphQL)

## Goal

Create FastAPI app serving Strawberry GraphQL with async SQLAlchemy.

## Tasks

1. Setup FastAPI app:
   - /health
   - /graphql (Strawberry)
2. Setup DB session dependency (async)
3. Setup structured error handling:
   - map Forbidden/NotFound/Validation to GraphQL errors
4. Add Redis client wiring (optional now, used later)

## Acceptance checks

- Open /docs for health endpoint
- GraphQL endpoint responds to a trivial query
- DB session created per request
