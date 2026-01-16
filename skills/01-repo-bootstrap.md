# Skill: Repo Bootstrap (Monorepo)

## Goal

Create a clean monorepo layout with consistent tooling and env management.

## Target structure

mclarens-analytics/

- apps/frontend (Next.js 14)
- apps/api (FastAPI)
- infra/docker
- docs
- skills

## Tasks

1. Initialize git repo, add .gitignore for Node/Python/Docker
2. Create workspace scripts (optional)
3. Add formatting:
   - Frontend: eslint, prettier
   - API: ruff + black
4. Add env templates:
   - apps/frontend/.env.example
   - apps/api/.env.example
   - infra/docker/.env.example
5. Add root README + docs stubs

## Acceptance checks

- `npm run dev` works in frontend
- `uvicorn src.main:app --reload` works in api
- env examples exist and no secrets committed
