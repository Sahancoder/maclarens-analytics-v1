-- ==========================================================
-- Views - Pivot FACT table to Columnar for easier query
-- ==========================================================

-- Primary view expected by backend models/routers.
CREATE OR REPLACE VIEW analytics.financial_monthly_view AS
SELECT
  ff.company_id,
  ff.period_id,
  pm.year,
  pm.month,
  ff.actual_budget AS scenario,
  COALESCE(MAX(CASE WHEN ff.metric_id = 1 THEN ff.amount END), 0) AS revenue_lkr,
  COALESCE(MAX(CASE WHEN ff.metric_id = 2 THEN ff.amount END), 0) AS gp,
  COALESCE(MAX(CASE WHEN ff.metric_id = 3 THEN ff.amount END), 0) AS gp_margin,
  COALESCE(MAX(CASE WHEN ff.metric_id = 4 THEN ff.amount END), 0) AS other_income,
  COALESCE(MAX(CASE WHEN ff.metric_id = 5 THEN ff.amount END), 0) AS personal_exp,
  COALESCE(MAX(CASE WHEN ff.metric_id = 6 THEN ff.amount END), 0) AS admin_exp,
  COALESCE(MAX(CASE WHEN ff.metric_id = 7 THEN ff.amount END), 0) AS selling_exp,
  COALESCE(MAX(CASE WHEN ff.metric_id = 8 THEN ff.amount END), 0) AS finance_exp,
  COALESCE(MAX(CASE WHEN ff.metric_id = 9 THEN ff.amount END), 0) AS depreciation,
  COALESCE(MAX(CASE WHEN ff.metric_id = 10 THEN ff.amount END), 0) AS total_overhead,
  COALESCE(MAX(CASE WHEN ff.metric_id = 11 THEN ff.amount END), 0) AS provisions,
  COALESCE(MAX(CASE WHEN ff.metric_id = 12 THEN ff.amount END), 0) AS exchange_gl,
  COALESCE(MAX(CASE WHEN ff.metric_id = 13 THEN ff.amount END), 0) AS pbt_before_non_ops,
  COALESCE(MAX(CASE WHEN ff.metric_id = 14 THEN ff.amount END), 0) AS pbt_after_non_ops,
  COALESCE(MAX(CASE WHEN ff.metric_id = 15 THEN ff.amount END), 0) AS non_ops_exp,
  COALESCE(MAX(CASE WHEN ff.metric_id = 16 THEN ff.amount END), 0) AS non_ops_income,
  COALESCE(MAX(CASE WHEN ff.metric_id = 17 THEN ff.amount END), 0) AS np_margin,
  COALESCE(MAX(CASE WHEN ff.metric_id = 18 THEN ff.amount END), 0) AS ebit,
  COALESCE(MAX(CASE WHEN ff.metric_id = 19 THEN ff.amount END), 0) AS ebitda,
  1.0::numeric AS exchange_rate,
  NOW() AS created_at
FROM analytics.financial_fact ff
JOIN analytics.period_master pm ON ff.period_id = pm.period_id
GROUP BY ff.company_id, ff.period_id, pm.year, pm.month, ff.actual_budget;

-- Backward-compatible legacy view names.
CREATE OR REPLACE VIEW analytics.vw_financial_monthly AS
SELECT * FROM analytics.financial_monthly_view;

CREATE OR REPLACE VIEW analytics.vw_financial_pnl AS
WITH actuals AS (
  SELECT * FROM analytics.financial_monthly_view WHERE scenario = 'Actual'
),
budgets AS (
  SELECT * FROM analytics.financial_monthly_view WHERE scenario = 'Budget'
)
SELECT
  COALESCE(a.company_id, b.company_id) AS company_id,
  COALESCE(a.period_id, b.period_id) AS period_id,
  COALESCE(a.year, b.year) AS year,
  COALESCE(a.month, b.month) AS month,
  a.revenue_lkr AS revenue_lkr_actual,
  a.gp AS gp_actual,
  a.gp_margin AS gp_margin_actual,
  a.other_income AS other_income_actual,
  a.personal_exp AS personal_exp_actual,
  a.admin_exp AS admin_exp_actual,
  a.selling_exp AS selling_exp_actual,
  a.finance_exp AS finance_exp_actual,
  a.depreciation AS depreciation_actual,
  a.total_overhead AS total_overheads_actual,
  a.provisions AS provisions_actual,
  a.exchange_gl AS exchange_gl_actual,
  a.pbt_before_non_ops AS pbt_before_actual,
  a.pbt_after_non_ops AS pbt_after_actual,
  a.non_ops_exp AS non_ops_exp_actual,
  a.non_ops_income AS non_ops_income_actual,
  a.np_margin AS np_margin_actual,
  a.ebit AS ebit_computed_actual,
  a.ebitda AS ebitda_computed_actual,
  b.revenue_lkr AS revenue_lkr_budget,
  b.gp AS gp_budget,
  b.gp_margin AS gp_margin_budget,
  b.other_income AS other_income_budget,
  b.personal_exp AS personal_exp_budget,
  b.admin_exp AS admin_exp_budget,
  b.selling_exp AS selling_exp_budget,
  b.finance_exp AS finance_exp_budget,
  b.depreciation AS depreciation_budget,
  b.total_overhead AS total_overheads_budget,
  b.provisions AS provisions_budget,
  b.exchange_gl AS exchange_gl_budget,
  b.pbt_before_non_ops AS pbt_before_budget,
  b.pbt_after_non_ops AS pbt_after_budget,
  b.non_ops_exp AS non_ops_exp_budget,
  b.non_ops_income AS non_ops_income_budget,
  b.np_margin AS np_margin_budget,
  b.ebit AS ebit_computed_budget,
  b.ebitda AS ebitda_computed_budget,
  1.0::numeric AS exchange_rate
FROM actuals a
FULL OUTER JOIN budgets b
  ON a.company_id = b.company_id
 AND a.period_id = b.period_id;

