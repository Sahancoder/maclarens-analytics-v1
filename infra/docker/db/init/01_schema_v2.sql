-- ==========================================================
-- Maclarens Analytics - PostgreSQL Schema (analytics)
-- Matches NEWMaster_Data_Sheet.xlsm column/ID formats
-- ==========================================================

CREATE SCHEMA IF NOT EXISTS analytics;
CREATE EXTENSION IF NOT EXISTS citext;

-- =========================
-- MASTER TABLES
-- =========================
CREATE TABLE IF NOT EXISTS analytics.cluster_master (
  cluster_id      text PRIMARY KEY,
  cluster_name    text NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_date    timestamptz NOT NULL DEFAULT now(),
  modified_date   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.company_master (
  company_id           text PRIMARY KEY,
  cluster_id           text NOT NULL REFERENCES analytics.cluster_master(cluster_id),
  company_name         text NOT NULL,
  fin_year_start_month int,
  is_active            boolean NOT NULL DEFAULT true,
  created_date         timestamptz NOT NULL DEFAULT now(),
  modified_date        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_cluster_id ON analytics.company_master(cluster_id);

CREATE TABLE IF NOT EXISTS analytics.role_master (
  role_id   int PRIMARY KEY,
  role_name text NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics.user_master (
  user_id       text PRIMARY KEY,
  user_email    citext UNIQUE NOT NULL,
  first_name    text,
  last_name     text,
  is_active     boolean NOT NULL DEFAULT true,
  created_date  timestamptz NOT NULL DEFAULT now(),
  modified_date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.user_company_map (
  user_id       text NOT NULL REFERENCES analytics.user_master(user_id),
  company_id    text NOT NULL REFERENCES analytics.company_master(company_id),
  is_active     boolean NOT NULL DEFAULT true,
  assigned_date date,
  PRIMARY KEY (user_id, company_id)
);

CREATE TABLE IF NOT EXISTS analytics.user_company_role_map (
  user_id    text NOT NULL REFERENCES analytics.user_master(user_id),
  company_id text NOT NULL REFERENCES analytics.company_master(company_id),
  role_id    int  NOT NULL REFERENCES analytics.role_master(role_id),
  is_active  boolean NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, company_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_ucrm_user_id ON analytics.user_company_role_map(user_id);
CREATE INDEX IF NOT EXISTS idx_ucrm_company_id ON analytics.user_company_role_map(company_id);

-- =========================
-- PERIOD + METRIC + STATUS
-- =========================
CREATE TABLE IF NOT EXISTS analytics.period_master (
  period_id  int PRIMARY KEY,
  month      int NOT NULL CHECK (month BETWEEN 1 AND 12),
  year       int NOT NULL,
  start_date date NOT NULL,
  end_date   date NOT NULL,
  UNIQUE (year, month)
);

CREATE TABLE IF NOT EXISTS analytics.metric_master (
  metric_id       int PRIMARY KEY,
  metric_name     text NOT NULL,
  metric_category text
);

CREATE TABLE IF NOT EXISTS analytics.status_master (
  status_id   int PRIMARY KEY,
  status_name text NOT NULL
);

-- =========================
-- FACT + WORKFLOW
-- =========================
CREATE TABLE IF NOT EXISTS analytics.financial_fact (
  company_id    text NOT NULL REFERENCES analytics.company_master(company_id),
  period_id     int  NOT NULL REFERENCES analytics.period_master(period_id),
  metric_id     int  NOT NULL REFERENCES analytics.metric_master(metric_id),
  actual_budget text NOT NULL,
  amount        numeric,
  PRIMARY KEY (company_id, period_id, metric_id, actual_budget)
);
CREATE INDEX IF NOT EXISTS idx_fact_company_period ON analytics.financial_fact(company_id, period_id);
CREATE INDEX IF NOT EXISTS idx_fact_metric_id ON analytics.financial_fact(metric_id);

CREATE TABLE IF NOT EXISTS analytics.financial_workflow (
  company_id      text NOT NULL REFERENCES analytics.company_master(company_id),
  period_id       int  NOT NULL REFERENCES analytics.period_master(period_id),
  status_id       int  NOT NULL REFERENCES analytics.status_master(status_id),
  submitted_by    text,
  submitted_date  timestamptz,
  actual_comment  text,
  budget_comment  text,
  approved_by     text,
  approved_date   timestamptz,
  rejected_by     text,
  rejected_date   timestamptz,
  reject_reason   text,
  PRIMARY KEY (company_id, period_id)
);
CREATE INDEX IF NOT EXISTS idx_fw_status_id ON analytics.financial_workflow(status_id);

-- =========================
-- SUPPORTING TABLES (used by routers/services)
-- =========================
CREATE TABLE IF NOT EXISTS analytics.report_comments (
  id                text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  report_id         text,
  report_company_id text,
  report_period_id  int,
  user_id           text REFERENCES analytics.user_master(user_id),
  content           text,
  is_system         boolean DEFAULT false,
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rc_report_id ON analytics.report_comments(report_id);

CREATE TABLE IF NOT EXISTS analytics.report_status_history (
  id                text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  report_id         text,
  report_company_id text,
  report_period_id  int,
  from_status       text,
  to_status         text,
  changed_by        text,
  reason            text,
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rsh_report_id ON analytics.report_status_history(report_id);

CREATE TABLE IF NOT EXISTS analytics.notifications (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    text REFERENCES analytics.user_master(user_id),
  type       text,
  title      text,
  message    text,
  link       text,
  is_read    boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user_id ON analytics.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_is_read ON analytics.notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS analytics.email_outbox (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  to_email     text NOT NULL,
  to_name      text,
  subject      text NOT NULL,
  body_text    text,
  body_html    text,
  status       text NOT NULL DEFAULT 'pending',
  attempts     int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  last_error   text,
  related_type text,
  related_id   text,
  created_at   timestamptz DEFAULT now(),
  sent_at      timestamptz
);

CREATE TABLE IF NOT EXISTS analytics.fx_rates (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date       date NOT NULL,
  currency   text NOT NULL DEFAULT 'USD',
  rate       numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.audit_logs (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     text,
  action      text NOT NULL,
  entity_type text,
  entity_id   text,
  details     text,
  ip_address  text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.report_export_history (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  exported_at   timestamptz NOT NULL DEFAULT now(),
  exported_by   text NOT NULL,
  export_format text NOT NULL,
  file_name     text NOT NULL,
  cluster_id    text NOT NULL,
  cluster_name  text NOT NULL,
  company_id    text NOT NULL,
  company_name  text NOT NULL,
  year          int NOT NULL,
  month         int NOT NULL CHECK (month BETWEEN 1 AND 12),
  period_label  text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reh_exported_at ON analytics.report_export_history(exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_reh_exported_by ON analytics.report_export_history(exported_by);
CREATE INDEX IF NOT EXISTS idx_reh_company_period ON analytics.report_export_history(company_id, year, month);

-- Helper: period code from year+month (zero-padded)
CREATE OR REPLACE FUNCTION analytics.make_period_code(p_year int, p_month int)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_year::text || lpad(p_month::text, 2, '0'))::int;
$$;
