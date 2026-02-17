-- ==========================================================
-- Seed (Docker init) - expects CSVs under:
--   /docker-entrypoint-initdb.d/seed/
-- ==========================================================

COPY analytics.role_master (role_id, role_name)
FROM '/docker-entrypoint-initdb.d/seed/role_master.csv'
WITH (FORMAT csv, HEADER true, NULL '');

COPY analytics.cluster_master (cluster_id, cluster_name, is_active, created_date, modified_date)
FROM '/docker-entrypoint-initdb.d/seed/cluster_master.csv'
WITH (FORMAT csv, HEADER true, NULL '');

CREATE TEMP TABLE stg_company_master (
  company_id text,
  cluster_id text,
  company_name text,
  fin_year_start_month text,
  is_active text,
  created_date text,
  modified_date text
);

COPY stg_company_master
FROM '/docker-entrypoint-initdb.d/seed/company_master.csv'
WITH (FORMAT csv, HEADER true, NULL '');

INSERT INTO analytics.company_master (
  company_id, cluster_id, company_name, fin_year_start_month, is_active, created_date, modified_date
)
SELECT
  company_id,
  cluster_id,
  company_name,
  CASE WHEN fin_year_start_month IS NULL OR fin_year_start_month = '' THEN NULL
       ELSE (fin_year_start_month::numeric)::int
  END,
  CASE
    WHEN lower(coalesce(is_active, '')) IN ('true', 't', '1', '1.0', 'yes') THEN true
    ELSE false
  END,
  created_date::timestamptz,
  modified_date::timestamptz
FROM stg_company_master;

CREATE TEMP TABLE stg_user_master (
  user_id text,
  user_email text,
  first_name text,
  last_name text,
  is_active text,
  created_date text,
  modified_date text
);

COPY stg_user_master
FROM '/docker-entrypoint-initdb.d/seed/user_master.csv'
WITH (FORMAT csv, HEADER true, NULL '');

INSERT INTO analytics.user_master (
  user_id, user_email, first_name, last_name, is_active, created_date, modified_date
)
SELECT
  user_id,
  CASE
    WHEN dup_seq = 1 THEN lower(user_email)
    ELSE regexp_replace(lower(user_email), '@', ('+' || dup_seq::text || '@'))
  END AS user_email,
  first_name,
  last_name,
  CASE
    WHEN lower(coalesce(is_active, '')) IN ('true', 't', '1', '1.0', 'yes') THEN true
    ELSE false
  END,
  created_date::timestamptz,
  modified_date::timestamptz
FROM (
  SELECT
    *,
    row_number() OVER (PARTITION BY lower(user_email) ORDER BY user_id) AS dup_seq
  FROM stg_user_master
) u;

COPY analytics.user_company_map (user_id, company_id, is_active, assigned_date)
FROM '/docker-entrypoint-initdb.d/seed/user_company_map.csv'
WITH (FORMAT csv, HEADER true, NULL '');

COPY analytics.user_company_role_map (user_id, company_id, role_id, is_active)
FROM '/docker-entrypoint-initdb.d/seed/user_company_role_map.csv'
WITH (FORMAT csv, HEADER true, NULL '');

-- Backfill: ensure every role-mapped user also has a user_company_map entry
INSERT INTO analytics.user_company_map (user_id, company_id, is_active, assigned_date)
SELECT DISTINCT user_id, company_id, true, CURRENT_DATE
FROM analytics.user_company_role_map
WHERE is_active = true
ON CONFLICT (user_id, company_id) DO NOTHING;

COPY analytics.period_master (period_id, month, year, start_date, end_date)
FROM '/docker-entrypoint-initdb.d/seed/period_master.csv'
WITH (FORMAT csv, HEADER true, NULL '');

COPY analytics.metric_master (metric_id, metric_name, metric_category)
FROM '/docker-entrypoint-initdb.d/seed/metric_master.csv'
WITH (FORMAT csv, HEADER true, NULL '');

COPY analytics.status_master (status_id, status_name)
FROM '/docker-entrypoint-initdb.d/seed/status_master.csv'
WITH (FORMAT csv, HEADER true, NULL '');

-- Financial Fact: stage -> insert with NULL->11 safety
CREATE TEMP TABLE stg_financial_fact (
  company_id    text,
  period_id     int,
  metric_id     int,
  actual_budget text,
  amount        text
);

COPY stg_financial_fact (company_id, period_id, metric_id, actual_budget, amount)
FROM '/docker-entrypoint-initdb.d/seed/financial_fact.csv'
WITH (FORMAT csv, HEADER true, NULL '');

INSERT INTO analytics.financial_fact (company_id, period_id, metric_id, actual_budget, amount)
SELECT
  company_id,
  period_id,
  COALESCE(metric_id, 11) AS metric_id,  -- ✅ rule: NULL => 11
  actual_budget,
  CASE
    WHEN amount IS NULL THEN NULL
    WHEN trim(amount) = '' THEN NULL
    WHEN trim(amount) IN ('-', '--', '- -', '-   ') THEN NULL
    ELSE replace(trim(amount), ',', '')::numeric
  END AS amount
FROM stg_financial_fact;

CREATE TEMP TABLE stg_financial_workflow (
  company_id text,
  period_id int,
  status_id int,
  submitted_by text,
  submitted_date text,
  actual_comment text,
  budget_comment text,
  approved_by text,
  approved_date text,
  rejected_by text,
  rejected_date text,
  reject_reason text
);

COPY stg_financial_workflow
FROM '/docker-entrypoint-initdb.d/seed/financial_workflow.csv'
WITH (FORMAT csv, HEADER true, NULL '');

INSERT INTO analytics.financial_workflow
(company_id, period_id, status_id, submitted_by, submitted_date, actual_comment, budget_comment,
 approved_by, approved_date, rejected_by, rejected_date, reject_reason)
SELECT DISTINCT ON (company_id, period_id)
  company_id,
  period_id,
  status_id,
  submitted_by,
  submitted_date::timestamptz,
  actual_comment,
  budget_comment,
  approved_by,
  approved_date::timestamptz,
  rejected_by,
  rejected_date::timestamptz,
  reject_reason
FROM stg_financial_workflow
ORDER BY company_id, period_id, submitted_date DESC NULLS LAST;
