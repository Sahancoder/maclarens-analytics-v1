# GraphQL API Test Scripts

> **Version:** 1.0  
> **Last Updated:** 2025-12-27  
> **Schema Match:** Verified against actual Strawberry GraphQL schema

---

## 🔧 Setup

### Environment Variables

```bash
# API Endpoint
API="http://localhost:8000/graphql"

# Tokens (replace with actual JWT tokens)
DATA_OFFICER_TOKEN="PASTE_DATA_OFFICER_TOKEN"
DIRECTOR_TOKEN="PASTE_DIRECTOR_TOKEN"
CEO_TOKEN="PASTE_CEO_TOKEN"
ADMIN_TOKEN="PASTE_ADMIN_TOKEN"
```

---

## 📋 Complete Workflow Test (Bash/Git Bash)

### 1️⃣ Login (Data Officer)

```bash
curl -s -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation Login($input: LoginInput!) { login(input: $input) { token user { id email name role } } }",
    "variables": {
      "input": {
        "email": "officer@company.com",
        "password": "yourpassword"
      }
    }
  }' | jq

# ➡️ Copy the token from response and set:
# DATA_OFFICER_TOKEN="<token_from_response>"
```

### 2️⃣ Verify Session (Who Am I)

```bash
curl -s -X POST "$API" \
  -H "Authorization: Bearer $DATA_OFFICER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query Me { me { id email name role companyId clusterId isActive } }"
  }' | jq
```

### 3️⃣ Create Draft Report (Data Officer)

```bash
curl -s -X POST "$API" \
  -H "Authorization: Bearer $DATA_OFFICER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation CreateReport($companyId: String!, $year: Int!, $month: Int!) { createReport(companyId: $companyId, year: $year, month: $month) { id companyId companyName year month status } }",
    "variables": {
      "companyId": "YOUR_COMPANY_ID",
      "year": 2025,
      "month": 11
    }
  }' | jq

# ➡️ Copy the report ID from response
# REPORT_ID="<id_from_response>"
```

### 4️⃣ Submit Report (Data Officer)

```bash
REPORT_ID="PUT_REPORT_ID_HERE"

curl -s -X POST "$API" \
  -H "Authorization: Bearer $DATA_OFFICER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation SubmitReport(\$id: String!) { submitReport(id: \$id) { id status submittedAt } }\",
    \"variables\": {
      \"id\": \"$REPORT_ID\"
    }
  }" | jq
```

### 5️⃣ View Pending Reports (Director)

```bash
curl -s -X POST "$API" \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query PendingReports { pendingReports { id companyId companyName year month status submittedAt } }"
  }' | jq
```

### 6️⃣ Reject Report with Reason (Director)

```bash
curl -s -X POST "$API" \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation RejectReport(\$id: String!, \$reason: String!) { rejectReport(id: \$id, reason: \$reason) { id status rejectionReason } }\",
    \"variables\": {
      \"id\": \"$REPORT_ID\",
      \"reason\": \"Revenue figure seems off. Please re-check invoice postings.\"
    }
  }" | jq
```

### 7️⃣ Add Comment (Data Officer Response)

```bash
curl -s -X POST "$API" \
  -H "Authorization: Bearer $DATA_OFFICER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation AddComment(\$reportId: String!, \$content: String!) { addReportComment(reportId: \$reportId, content: \$content) }\",
    \"variables\": {
      \"reportId\": \"$REPORT_ID\",
      \"content\": \"Corrected revenue; re-checking GL export and resubmitting.\"
    }
  }" | jq
```

### 8️⃣ Re-submit Report (Data Officer)

```bash
curl -s -X POST "$API" \
  -H "Authorization: Bearer $DATA_OFFICER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation SubmitReport(\$id: String!) { submitReport(id: \$id) { id status submittedAt } }\",
    \"variables\": {
      \"id\": \"$REPORT_ID\"
    }
  }" | jq
```

### 9️⃣ Approve Report (Director)

```bash
curl -s -X POST "$API" \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation ApproveReport(\$id: String!) { approveReport(id: \$id) { id status approvedAt } }\",
    \"variables\": {
      \"id\": \"$REPORT_ID\"
    }
  }" | jq
```

---

## 📊 CEO Dashboard Queries

### Group KPIs

```bash
curl -s -X POST "$API" \
  -H "Authorization: Bearer $CEO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GroupKPIs($year: Int!, $month: Int!) { groupKpis(year: $year, month: $month) { totalActual totalBudget totalVariance variancePercent groupHealthIndex pbtVsPriorYear ebitdaMargin cashPosition } }",
    "variables": { "year": 2025, "month": 10 }
  }' | jq
```

### Cluster Performance

```bash
curl -s -X POST "$API" \
  -H "Authorization: Bearer $CEO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query ClusterPerf($year: Int!, $month: Int!) { clusterPerformance(year: $year, month: $month) { clusterId clusterName clusterCode monthly { actual budget variance variancePercent achievementPercent } ytd { actual budget variance variancePercent achievementPercent } } }",
    "variables": { "year": 2025, "month": 10 }
  }' | jq
```

### Full CEO Dashboard (Single Request)

```bash
curl -s -X POST "$API" \
  -H "Authorization: Bearer $CEO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query CEODashboard($year: Int!, $month: Int!) { ceoDashboard(year: $year, month: $month) { groupKpis { totalActual totalBudget totalVariance variancePercent groupHealthIndex } topPerformers { rank name achievementPercent variance } bottomPerformers { rank name achievementPercent variance } riskClusters { clusterName severity variancePercent classification } clusterPerformance { clusterName monthly { actual budget achievementPercent } ytd { actual budget achievementPercent } } } }",
    "variables": { "year": 2025, "month": 10 }
  }' | jq
```

### Top & Bottom Performers

```bash
# Top Performers
curl -s -X POST "$API" \
  -H "Authorization: Bearer $CEO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query TopPerf($year: Int!, $month: Int!, $limit: Int!) { topPerformers(year: $year, month: $month, limit: $limit) { rank name achievementPercent variance } }",
    "variables": { "year": 2025, "month": 10, "limit": 5 }
  }' | jq

# Bottom Performers
curl -s -X POST "$API" \
  -H "Authorization: Bearer $CEO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query BottomPerf($year: Int!, $month: Int!, $limit: Int!) { bottomPerformers(year: $year, month: $month, limit: $limit) { rank name achievementPercent variance } }",
    "variables": { "year": 2025, "month": 10, "limit": 5 }
  }' | jq
```

### Risk Clusters

```bash
curl -s -X POST "$API" \
  -H "Authorization: Bearer $CEO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query RiskClusters($year: Int!, $month: Int!) { riskClusters(year: $year, month: $month) { clusterName severity variancePercent classification } }",
    "variables": { "year": 2025, "month": 10 }
  }' | jq
```

---

## 📈 Analytics & Financial Data

### Save Financial Data

```bash
curl -s -X POST "$API" \
  -H "Authorization: Bearer $DATA_OFFICER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation SaveFinancial($input: FinancialDataInput!) { saveFinancialData(input: $input) }",
    "variables": {
      "input": {
        "companyId": "YOUR_COMPANY_ID",
        "year": 2025,
        "month": 11,
        "revenueActual": 15000000,
        "costActual": 9000000,
        "pbtActual": 6000000,
        "ebitdaActual": 7500000,
        "revenueBudget": 14000000,
        "costBudget": 8500000,
        "pbtBudget": 5500000,
        "ebitdaBudget": 7000000
      }
    }
  }' | jq
```

### Company Performance (Within Cluster)

```bash
curl -s -X POST "$API" \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query CompanyPerf($clusterId: String!, $year: Int!, $month: Int!) { companyPerformance(clusterId: $clusterId, year: $year, month: $month) { companyId companyName companyCode clusterName monthly { actual budget variance achievementPercent } ytd { actual budget variance achievementPercent } } }",
    "variables": { "clusterId": "YOUR_CLUSTER_ID", "year": 2025, "month": 10 }
  }' | jq
```

### Scenario Analysis

```bash
curl -s -X POST "$API" \
  -H "Authorization: Bearer $CEO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query RunScenario($year: Int!, $month: Int!, $input: ScenarioInput!) { runScenario(year: $year, month: $month, input: $input) { scenarioName projectedPbt projectedRevenue impactPercent } }",
    "variables": {
      "year": 2025,
      "month": 10,
      "input": {
        "revenueChangePercent": 5,
        "costChangePercent": -2,
        "fxImpactPercent": 0,
        "budgetAdjustmentPercent": 0
      }
    }
  }' | jq
```

---

## 🔐 Health Check

```bash
curl -s -X POST "$API" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { health }"}' | jq
```

---

## ✅ Expected Response Patterns

| Operation       | Success Indicator                                       |
| --------------- | ------------------------------------------------------- |
| `login`         | Returns `token` + `user` object                         |
| `me`            | Returns user with valid `role`                          |
| `createReport`  | Returns report with `status: DRAFT`                     |
| `submitReport`  | Returns `status: SUBMITTED`, `submittedAt` not null     |
| `rejectReport`  | Returns `status: REJECTED`, `rejectionReason` populated |
| `approveReport` | Returns `status: APPROVED`, `approvedAt` not null       |
| `ceoDashboard`  | Returns all nested objects with numeric values          |

---

## 🐛 Troubleshooting

| Error                | Solution                                      |
| -------------------- | --------------------------------------------- |
| `Not authenticated`  | Token expired or missing - re-login           |
| `Variable not found` | Check variable names match schema (camelCase) |
| `null` response      | Check if resource exists, verify permissions  |
| `CORS error`         | Only for browser - cURL should work           |
