# McLarens Analytics API

FastAPI + GraphQL backend for the McLarens Analytics platform.

## Tech Stack

- **FastAPI** - Modern Python web framework
- **Strawberry GraphQL** - GraphQL library for Python
- **SQLAlchemy** - Async ORM with PostgreSQL
- **PostgreSQL** - Primary database
- **Redis** - Caching layer

## Quick Start

### With Docker (Recommended)

```bash
# From project root
cd infra/docker
docker-compose -f docker-compose.dev.yml up --build
```

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
.\venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env

# Run the server
uvicorn src.main:app --reload --port 8000
```

## API Endpoints

- **GraphQL Playground**: http://localhost:8000/graphql
- **Health Check**: http://localhost:8000/health
- **API Docs**: http://localhost:8000/docs

## Database Seeding

```bash
# With Docker
docker exec maclarens-api python -m src.db.seed

# Local
python -m src.db.seed
```

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Data Officer | sahanhettiarachchi275@gmail.com | 1234 |
| Company Director | sahanviranga18@gmail.com | 5678 |
| Admin | hmsvhettiarachchi@std.foc.sab.ac.lk | 91011 |
| CEO | oxysusl@gmail.com | 121314 |

## Project Structure

```
src/
├── config/          # Settings and configuration
├── db/              # Database models and session
├── graphql/         # GraphQL schema and resolvers
│   └── resolvers/   # Query and mutation resolvers
├── services/        # Business logic layer
├── security/        # Authentication and authorization
└── main.py          # FastAPI application entry
```

## GraphQL Queries

### Authentication
```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    token
    user { id email name role }
  }
}
```

### Analytics
```graphql
query ClusterPerformance($year: Int!, $month: Int!) {
  clusterPerformance(year: $year, month: $month) {
    clusterName
    monthly { actual budget variance achievementPercent }
    ytd { actual budget variance achievementPercent }
  }
}
```
