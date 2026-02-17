SELECT COUNT(*) AS fact_rows FROM analytics.financial_fact;
SELECT COUNT(*) AS metric_null_rows FROM analytics.financial_fact WHERE metric_id IS NULL; -- should be 0
SELECT COUNT(*) AS metric_11_rows FROM analytics.financial_fact WHERE metric_id = 11;
SELECT COUNT(*) AS workflow_rows FROM analytics.financial_workflow;
