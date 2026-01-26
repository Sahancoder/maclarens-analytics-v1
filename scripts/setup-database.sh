#!/bin/bash

# ============================================================================
# MacLarens Analytics - Database Setup Script (Linux/macOS)
# ============================================================================
# This script sets up the PostgreSQL database for local development
# ============================================================================

set -e  # Exit on error

# Configuration
DB_NAME="${1:-maclarens_analytics}"
DB_USER="${2:-finance_user}"
DB_PASSWORD="${3:-finance_pass}"
POSTGRES_USER="postgres"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================"
echo "MacLarens Analytics - Database Setup"
echo -e "======================================${NC}"
echo ""

echo -e "${YELLOW}Configuration:${NC}"
echo -e "  ${GRAY}Database: $DB_NAME${NC}"
echo -e "  ${GRAY}User: $DB_USER${NC}"
echo -e "  ${GRAY}Password: $DB_PASSWORD${NC}"
echo ""

# ============================================================================
# 1. Check PostgreSQL
# ============================================================================
echo -e "${YELLOW}[1/5] Checking PostgreSQL...${NC}"

if command -v psql &> /dev/null; then
    PG_VERSION=$(psql -U $POSTGRES_USER -c "SELECT version();" -t 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
        echo -e "  ${GRAY}Version: $(echo $PG_VERSION | xargs)${NC}"
    else
        echo -e "${RED}✗ PostgreSQL connection failed${NC}"
        echo -e "${YELLOW}Please ensure PostgreSQL is running and accessible${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ psql command not found${NC}"
    echo -e "${YELLOW}Please install PostgreSQL:${NC}"
    echo -e "  ${GRAY}macOS: brew install postgresql@16${NC}"
    echo -e "  ${GRAY}Ubuntu: sudo apt install postgresql${NC}"
    exit 1
fi

# ============================================================================
# 2. Check if database exists
# ============================================================================
echo ""
echo -e "${YELLOW}[2/5] Checking if database exists...${NC}"

DB_EXISTS=$(psql -U $POSTGRES_USER -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>&1)

if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${YELLOW}⚠ Database '$DB_NAME' already exists${NC}"
    read -p "Do you want to drop and recreate it? (y/N): " response
    
    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        echo -e "  ${YELLOW}Dropping database...${NC}"
        psql -U $POSTGRES_USER -c "DROP DATABASE IF EXISTS $DB_NAME;" > /dev/null 2>&1
        echo -e "${GREEN}✓ Database dropped${NC}"
    else
        echo -e "  ${GRAY}Skipping database creation${NC}"
        SKIP_DB_CREATION=1
    fi
fi

# ============================================================================
# 3. Create database user
# ============================================================================
echo ""
echo -e "${YELLOW}[3/5] Creating database user...${NC}"

USER_EXISTS=$(psql -U $POSTGRES_USER -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>&1)

if [ "$USER_EXISTS" = "1" ]; then
    echo -e "  ${GRAY}User '$DB_USER' already exists${NC}"
    echo -e "  ${YELLOW}Updating password...${NC}"
    psql -U $POSTGRES_USER -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" > /dev/null 2>&1
    echo -e "${GREEN}✓ User password updated${NC}"
else
    psql -U $POSTGRES_USER -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ User '$DB_USER' created${NC}"
    else
        echo -e "${RED}✗ Failed to create user${NC}"
        exit 1
    fi
fi

# ============================================================================
# 4. Create database
# ============================================================================
echo ""
echo -e "${YELLOW}[4/5] Creating database...${NC}"

if [ -z "$SKIP_DB_CREATION" ]; then
    psql -U $POSTGRES_USER -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database '$DB_NAME' created${NC}"
    else
        echo -e "${RED}✗ Failed to create database${NC}"
        exit 1
    fi
else
    echo -e "  ${GRAY}Skipped (database exists)${NC}"
fi

# ============================================================================
# 5. Grant permissions
# ============================================================================
echo ""
echo -e "${YELLOW}[5/5] Granting permissions...${NC}"

psql -U $POSTGRES_USER <<EOF > /dev/null 2>&1
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Permissions granted${NC}"
else
    echo -e "${YELLOW}⚠ Some permissions may have failed (this is often OK)${NC}"
fi

# ============================================================================
# 6. Test connection
# ============================================================================
echo ""
echo -e "${YELLOW}Testing connection...${NC}"

TEST_RESULT=$(psql -U $DB_USER -d $DB_NAME -c "SELECT current_database(), current_user;" -t 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Connection test successful${NC}"
    echo -e "  ${GRAY}$(echo $TEST_RESULT | xargs)${NC}"
else
    echo -e "${RED}✗ Connection test failed${NC}"
    echo -e "  ${RED}Error: $TEST_RESULT${NC}"
    exit 1
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${CYAN}======================================"
echo "✓ Database setup complete!"
echo -e "======================================${NC}"
echo ""
echo -e "${NC}Database connection string:${NC}"
echo -e "  ${CYAN}postgresql+asyncpg://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  ${GRAY}1. Update apps/api/.env with the connection string above${NC}"
echo -e "  ${GRAY}2. Run migrations: cd apps/api && alembic upgrade head${NC}"
echo -e "  ${GRAY}3. (Optional) Seed data: python seed_standalone.py${NC}"
echo ""
