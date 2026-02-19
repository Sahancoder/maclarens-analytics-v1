-- Populate financial_monthly_view from financial_fact (pivot metric rows → columns)
-- Normalizes scenario casing to UPPER (ACTUAL/BUDGET)

TRUNCATE analytics.financial_monthly_view;

INSERT INTO analytics.financial_monthly_view (
    company_id, period_id, scenario, year, month,
    revenue_lkr, gp, gp_margin, other_income, personal_exp,
    admin_exp, selling_exp, finance_exp, depreciation, total_overhead,
    provisions, exchange_gl, pbt_before_non_ops, pbt_after_non_ops,
    non_ops_exp, non_ops_income, np_margin, ebit, ebitda, exchange_rate, created_at
)
SELECT
    f.company_id,
    f.period_id,
    UPPER(f.actual_budget) as scenario,
    p.year,
    p.month,
    MAX(CASE WHEN f.metric_id = 1 THEN f.amount END)  as revenue_lkr,
    MAX(CASE WHEN f.metric_id = 2 THEN f.amount END)  as gp,
    MAX(CASE WHEN f.metric_id = 3 THEN f.amount END)  as gp_margin,
    MAX(CASE WHEN f.metric_id = 4 THEN f.amount END)  as other_income,
    MAX(CASE WHEN f.metric_id = 5 THEN f.amount END)  as personal_exp,
    MAX(CASE WHEN f.metric_id = 6 THEN f.amount END)  as admin_exp,
    MAX(CASE WHEN f.metric_id = 7 THEN f.amount END)  as selling_exp,
    MAX(CASE WHEN f.metric_id = 8 THEN f.amount END)  as finance_exp,
    MAX(CASE WHEN f.metric_id = 9 THEN f.amount END)  as depreciation,
    MAX(CASE WHEN f.metric_id = 10 THEN f.amount END) as total_overhead,
    MAX(CASE WHEN f.metric_id = 11 THEN f.amount END) as provisions,
    MAX(CASE WHEN f.metric_id = 12 THEN f.amount END) as exchange_gl,
    MAX(CASE WHEN f.metric_id = 13 THEN f.amount END) as pbt_before_non_ops,
    MAX(CASE WHEN f.metric_id = 14 THEN f.amount END) as pbt_after_non_ops,
    MAX(CASE WHEN f.metric_id = 15 THEN f.amount END) as non_ops_exp,
    MAX(CASE WHEN f.metric_id = 16 THEN f.amount END) as non_ops_income,
    MAX(CASE WHEN f.metric_id = 17 THEN f.amount END) as np_margin,
    MAX(CASE WHEN f.metric_id = 18 THEN f.amount END) as ebit,
    MAX(CASE WHEN f.metric_id = 19 THEN f.amount END) as ebitda,
    NULL as exchange_rate,
    NOW() as created_at
FROM analytics.financial_fact f
JOIN analytics.period_master p ON f.period_id = p.period_id
GROUP BY f.company_id, f.period_id, UPPER(f.actual_budget), p.year, p.month
ON CONFLICT (company_id, period_id, scenario) DO UPDATE SET
    year = EXCLUDED.year,
    month = EXCLUDED.month,
    revenue_lkr = EXCLUDED.revenue_lkr,
    gp = EXCLUDED.gp,
    gp_margin = EXCLUDED.gp_margin,
    other_income = EXCLUDED.other_income,
    personal_exp = EXCLUDED.personal_exp,
    admin_exp = EXCLUDED.admin_exp,
    selling_exp = EXCLUDED.selling_exp,
    finance_exp = EXCLUDED.finance_exp,
    depreciation = EXCLUDED.depreciation,
    total_overhead = EXCLUDED.total_overhead,
    provisions = EXCLUDED.provisions,
    exchange_gl = EXCLUDED.exchange_gl,
    pbt_before_non_ops = EXCLUDED.pbt_before_non_ops,
    pbt_after_non_ops = EXCLUDED.pbt_after_non_ops,
    non_ops_exp = EXCLUDED.non_ops_exp,
    non_ops_income = EXCLUDED.non_ops_income,
    np_margin = EXCLUDED.np_margin,
    ebit = EXCLUDED.ebit,
    ebitda = EXCLUDED.ebitda,
    created_at = EXCLUDED.created_at;
