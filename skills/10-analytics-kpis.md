# Skill: Analytics & KPIs (FD + MD)

## Goal

Compute and visualize YTD KPIs and comparisons vs last year.

## KPI definitions (example)

- YTD GP Margin = sum(GP)/sum(Revenue)
- YTD GP = sum(GP)
- YTD PBT Before = sum(PBT Before Non-Ops)
- PBT Achievement = YTD PBT Before / YTD Budget PBT Before (if budget exists)

## GraphQL operations

- directorKpis(companyId, fy, toMonth)
- companyRank(companyId, fy, toMonth)
- mdOverview(fy, toMonth)
- mdClusterDrilldown(clusterId, fy, toMonth)

## Data rule

Use only approved/submitted-to-md reports for analytics (configure rule).

## Acceptance checks

- KPIs match DB stored metrics
- vs LY computed using previous FY same months
- Rankings stable and permissioned
