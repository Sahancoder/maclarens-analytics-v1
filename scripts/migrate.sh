#!/bin/bash

# Database Migration Script
# Run Alembic migrations for the API database

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$SCRIPT_DIR/../apps/api"

echo "=== MacLarens Analytics Database Migration ==="
echo ""

# Change to API directory
cd "$API_DIR"

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
elif [ -d ".venv" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
fi

# Check for required environment variable
if [ -z "$DATABASE_URL" ]; then
    echo "Warning: DATABASE_URL not set, using default"
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maclarens_analytics"
fi

# Run migrations
echo "Running database migrations..."
echo ""

case "${1:-upgrade}" in
    upgrade)
        echo "Upgrading database to latest version..."
        alembic upgrade head
        ;;
    downgrade)
        echo "Downgrading database by one revision..."
        alembic downgrade -1
        ;;
    revision)
        if [ -z "$2" ]; then
            echo "Error: Please provide a migration message"
            echo "Usage: ./migrate.sh revision \"migration message\""
            exit 1
        fi
        echo "Creating new migration: $2"
        alembic revision --autogenerate -m "$2"
        ;;
    current)
        echo "Current database revision:"
        alembic current
        ;;
    history)
        echo "Migration history:"
        alembic history
        ;;
    *)
        echo "Usage: ./migrate.sh [upgrade|downgrade|revision|current|history]"
        echo ""
        echo "Commands:"
        echo "  upgrade   - Upgrade database to latest version (default)"
        echo "  downgrade - Downgrade database by one revision"
        echo "  revision  - Create new migration (requires message)"
        echo "  current   - Show current revision"
        echo "  history   - Show migration history"
        exit 1
        ;;
esac

echo ""
echo "Migration complete!"
