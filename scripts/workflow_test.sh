#!/bin/bash
# McLarens Analytics - GraphQL Workflow Test Script (Bash)
# Version: 1.0
# Usage: ./workflow_test.sh

set -e

# Configuration
API="${API_URL:-http://localhost:8000/graphql}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
step() { echo -e "\n${YELLOW}▶️  $1${NC}"; }

# GraphQL helper
graphql() {
    local query="$1"
    local variables="${2:-{}}"
    local token="$3"
    
    local headers="-H 'Content-Type: application/json'"
    if [ -n "$token" ]; then
        headers="$headers -H 'Authorization: Bearer $token'"
    fi
    
    eval "curl -s -X POST '$API' $headers -d '{\"query\":\"$query\",\"variables\":$variables}'"
}

echo ""
echo "========================================"
echo "   McLarens Analytics - Workflow Test   "
echo "========================================"
echo ""

# 1. Health Check
step "1. Health Check"
health=$(curl -s -X POST "$API" \
    -H "Content-Type: application/json" \
    -d '{"query":"query { health }"}')

if echo "$health" | grep -q "healthy"; then
    success "API is healthy"
else
    error "API health check failed"
    exit 1
fi

# 2. Login
step "2. Login"
read -p "Enter email: " EMAIL
read -s -p "Enter password: " PASSWORD
echo ""

login_result=$(curl -s -X POST "$API" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"mutation Login(\$input: LoginInput!) { login(input: \$input) { token user { id email name role companyId } } }\",\"variables\":{\"input\":{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}}}")

TOKEN=$(echo "$login_result" | jq -r '.data.login.token // empty')
USER_ROLE=$(echo "$login_result" | jq -r '.data.login.user.role // empty')
USER_EMAIL=$(echo "$login_result" | jq -r '.data.login.user.email // empty')
COMPANY_ID=$(echo "$login_result" | jq -r '.data.login.user.companyId // empty')

if [ -n "$TOKEN" ]; then
    success "Logged in as: $USER_EMAIL (Role: $USER_ROLE)"
else
    error "Login failed"
    echo "$login_result" | jq
    exit 1
fi

# 3. Verify Session
step "3. Verify Session (me query)"
me_result=$(curl -s -X POST "$API" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query":"query { me { id email name role companyId } }"}')

me_email=$(echo "$me_result" | jq -r '.data.me.email // empty')
if [ -n "$me_email" ]; then
    success "Session verified: $me_email"
else
    error "Session verification failed"
fi

# 4. Create Report (if Data Officer)
if [ "$USER_ROLE" = "DATA_OFFICER" ] && [ -n "$COMPANY_ID" ]; then
    step "4. Create Report"
    
    create_result=$(curl -s -X POST "$API" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"mutation CreateReport(\$companyId: String!, \$year: Int!, \$month: Int!) { createReport(companyId: \$companyId, year: \$year, month: \$month) { id companyId year month status } }\",\"variables\":{\"companyId\":\"$COMPANY_ID\",\"year\":2025,\"month\":11}}")
    
    REPORT_ID=$(echo "$create_result" | jq -r '.data.createReport.id // empty')
    
    if [ -n "$REPORT_ID" ]; then
        success "Report created: $REPORT_ID"
        
        # 5. Submit Report
        step "5. Submit Report"
        submit_result=$(curl -s -X POST "$API" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"query\":\"mutation SubmitReport(\$id: String!) { submitReport(id: \$id) { id status submittedAt } }\",\"variables\":{\"id\":\"$REPORT_ID\"}}")
        
        status=$(echo "$submit_result" | jq -r '.data.submitReport.status // empty')
        if [ "$status" = "SUBMITTED" ]; then
            success "Report submitted successfully"
        else
            error "Submit failed"
            echo "$submit_result" | jq
        fi
    else
        error "Create report failed"
        echo "$create_result" | jq
    fi
fi

# 6. View Pending Reports (for Directors)
if [ "$USER_ROLE" = "COMPANY_DIRECTOR" ] || [ "$USER_ROLE" = "ADMIN" ] || [ "$USER_ROLE" = "CEO" ]; then
    step "6. View Pending Reports"
    
    pending_result=$(curl -s -X POST "$API" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"query":"query { pendingReports { id companyName year month status } }"}')
    
    count=$(echo "$pending_result" | jq '.data.pendingReports | length')
    success "Found $count pending reports"
    
    echo "$pending_result" | jq -r '.data.pendingReports[:3][] | "  - \(.companyName) | \(.year)-\(.month) | \(.status)"'
fi

# 7. CEO Dashboard (for CEO)
if [ "$USER_ROLE" = "CEO" ]; then
    step "7. CEO Dashboard"
    
    dashboard_result=$(curl -s -X POST "$API" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"query":"query CEODashboard($year: Int!, $month: Int!) { ceoDashboard(year: $year, month: $month) { groupKpis { totalActual totalBudget variancePercent groupHealthIndex } topPerformers { name achievementPercent } } }","variables":{"year":2025,"month":10}}')
    
    actual=$(echo "$dashboard_result" | jq -r '.data.ceoDashboard.groupKpis.totalActual // "N/A"')
    budget=$(echo "$dashboard_result" | jq -r '.data.ceoDashboard.groupKpis.totalBudget // "N/A"')
    variance=$(echo "$dashboard_result" | jq -r '.data.ceoDashboard.groupKpis.variancePercent // "N/A"')
    
    success "CEO Dashboard loaded"
    info "  Total Actual: $actual"
    info "  Total Budget: $budget"
    info "  Variance: $variance%"
fi

echo ""
echo "========================================"
echo "          Test Complete!                "
echo "========================================"
echo ""
