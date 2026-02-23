"""Add ip_address column to audit_logs

Revision ID: 003_add_audit_logs_ip_address
Revises: 002_report_export_history
Create Date: 2026-02-23
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "003_add_audit_logs_ip_address"
down_revision: Union[str, None] = "002_report_export_history"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE analytics.audit_logs
        ADD COLUMN IF NOT EXISTS ip_address text
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE analytics.audit_logs
        DROP COLUMN IF EXISTS ip_address
        """
    )

