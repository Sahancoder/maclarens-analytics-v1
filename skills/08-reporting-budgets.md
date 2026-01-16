# Skill: Budget Reporting (ADMIN)

## Goal

Admin creates budgets, same mechanics as actuals.

## GraphQL operations

- createBudgetDraft(companyId, fy, month)
- updateBudgetDraft(reportId, input)
- submitBudget(reportId)
- adminBudgetDrafts(status, filters)

## Acceptance checks

- Only ADMIN can create/update budgets
- Submit locks budgets
- Budget drafts show in “Budget Drafts” page
