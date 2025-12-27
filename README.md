# MacLarens Analytics

A comprehensive analytics platform with role-based dashboards for data officers, directors, CEOs, and administrators.

## Project Structure

- **apps/frontend** - Next.js application with App Router
- **apps/api** - FastAPI GraphQL backend
- **packages/** - Shared logic and contracts
- **infra/** - Infrastructure and deployment configs
- **docs/** - Project documentation
- **scripts/** - Automation scripts

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15+

### Local Development

1. Clone the repository
2. Copy environment files:
   ```bash
   cp .env.example .env
   cp infra/docker/env.example infra/docker/.env
   ```
3. Start services:
   ```bash
   docker-compose -f infra/docker/docker-compose.yml up -d
   ```
4. Run database migrations:
   ```bash
   ./scripts/migrate.sh
   ```
5. Seed the database:
   ```bash
   python scripts/seed_db.py
   ```

### Frontend

```bash
cd apps/frontend
npm install
npm run dev
```

### API

```bash
cd apps/api
pip install -r requirements.txt
uvicorn src.main:app --reload
```

## Architecture
## High-Level Architecture

## Repository Layout

### apps/
#### frontend/
- app/
  - (auth)/
  - data-officer/
  - director/
  - ceo/
  - admin/
- components/
- graphql/
- hooks/
- lib/
- styles/
- public/

#### api/
- src/
  - graphql/
    - schema
    - resolvers
    - permissions
  - services/
  - domain/
  - repositories/
  - db/
  - security/
  - config/
  - utils/

### packages/
- graphql-contracts/
- constants/

### infra/
- docker/
- azure/

### docs/
- architecture
- workflows
- database
- deployment
- security

### scripts/
- seed_db
- migrate

### .github/
- workflows/



## License
See [docs/architecture.md](docs/architecture.md) for detailed architecture documentation.

## License

Proprietary - All rights reserved.
