# Skill: Azure Deployment

## Goal

Deploy frontend + api + postgres + redis securely.

## Steps

1. Provision resources:

- Azure Postgres Flexible Server
- Azure Cache for Redis
- API hosting: Container Apps or App Service
- Frontend: Static Web Apps or App Service
- Key Vault

2. Configure app settings:

- DB URL, Redis URL
- Resend key
- NextAuth secrets + Entra creds

3. CI/CD

- Build frontend and deploy
- Build API image and deploy
- Run migrations in controlled step

## Acceptance checks

- Health endpoint works
- GraphQL works from frontend domain
- Secrets are not stored in repo
