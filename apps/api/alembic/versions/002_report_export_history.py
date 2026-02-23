"""Add report export history table

Revision ID: 002_report_export_history
Revises: 001_initial_schema
Create Date: 2026-02-23
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "002_report_export_history"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS analytics")
    op.execute(
        """
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
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_reh_exported_at ON analytics.report_export_history(exported_at DESC)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_reh_exported_by ON analytics.report_export_history(exported_by)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_reh_company_period ON analytics.report_export_history(company_id, year, month)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS analytics.report_export_history")

