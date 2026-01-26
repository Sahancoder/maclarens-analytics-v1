"""Initial schema - complete EPIC 1

Revision ID: 001
Revises: 
Create Date: 2026-01-22

Creates all tables for McLarens Analytics:
- clusters, companies (with fy_start_month)
- users, company_user_roles
- financial_monthly (ACTUAL/BUDGET scenarios)
- reports, report_comments, report_status_history
- notifications, email_outbox
- fx_rates, audit_logs
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============ ENUMS ============
    user_role = postgresql.ENUM('finance_officer', 'finance_director', 'admin', 'ceo', 
                                 name='userrole', create_type=True)
    report_status = postgresql.ENUM('draft', 'submitted', 'approved', 'rejected', 
                                     'correction_required', name='reportstatus', create_type=True)
    scenario = postgresql.ENUM('actual', 'budget', name='scenario', create_type=True)
    notification_type = postgresql.ENUM('report_submitted', 'report_approved', 'report_rejected',
                                         'comment_added', 'reminder', 'system', 
                                         name='notificationtype', create_type=True)
    email_status = postgresql.ENUM('pending', 'sent', 'failed', name='emailstatus', create_type=True)
    
    user_role.create(op.get_bind())
    report_status.create(op.get_bind())
    scenario.create(op.get_bind())
    notification_type.create(op.get_bind())
    email_status.create(op.get_bind())
    
    # ============ CLUSTERS ============
    op.create_table('clusters',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        sa.UniqueConstraint('name')
    )
    op.create_index('idx_cluster_code', 'clusters', ['code'])
    op.create_index('idx_cluster_active', 'clusters', ['is_active'])
    
    # ============ COMPANIES ============
    op.create_table('companies',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('cluster_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('fy_start_month', sa.Integer(), nullable=False, default=1),
        sa.Column('currency', sa.String(length=3), nullable=True, default='LKR'),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['cluster_id'], ['clusters.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        sa.CheckConstraint('fy_start_month >= 1 AND fy_start_month <= 12', name='ck_fy_start_month')
    )
    op.create_index('idx_company_code', 'companies', ['code'])
    op.create_index('idx_company_cluster', 'companies', ['cluster_id'])
    op.create_index('idx_company_active', 'companies', ['is_active'])
    
    # ============ USERS ============
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('data_officer', 'company_director', 'admin', 'ceo', 
                                   name='userrole', create_type=False), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('cluster_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('azure_oid', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id']),
        sa.ForeignKeyConstraint(['cluster_id'], ['clusters.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('azure_oid')
    )
    op.create_index('idx_user_email', 'users', ['email'])
    op.create_index('idx_user_role', 'users', ['role'])
    op.create_index('idx_user_company', 'users', ['company_id'])
    op.create_index('idx_user_azure_oid', 'users', ['azure_oid'])
    
    # ============ COMPANY USER ROLES ============
    op.create_table('company_user_roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.Enum('data_officer', 'company_director', 'admin', 'ceo',
                                   name='userrole', create_type=False), nullable=False),
        sa.Column('is_primary', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'company_id', 'role', name='uq_user_company_role')
    )
    op.create_index('idx_cur_user', 'company_user_roles', ['user_id'])
    op.create_index('idx_cur_company', 'company_user_roles', ['company_id'])
    
    # ============ FINANCIAL MONTHLY ============
    op.create_table('financial_monthly',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('scenario', sa.Enum('actual', 'budget', name='scenario', create_type=False), nullable=False),
        sa.Column('exchange_rate', sa.Float(), nullable=True, default=1.0),
        sa.Column('revenue_lkr', sa.Float(), nullable=True, default=0),
        sa.Column('gp', sa.Float(), nullable=True, default=0),
        sa.Column('other_income', sa.Float(), nullable=True, default=0),
        sa.Column('personal_exp', sa.Float(), nullable=True, default=0),
        sa.Column('admin_exp', sa.Float(), nullable=True, default=0),
        sa.Column('selling_exp', sa.Float(), nullable=True, default=0),
        sa.Column('finance_exp', sa.Float(), nullable=True, default=0),
        sa.Column('depreciation', sa.Float(), nullable=True, default=0),
        sa.Column('provisions', sa.Float(), nullable=True, default=0),
        sa.Column('exchange_gl', sa.Float(), nullable=True, default=0),
        sa.Column('non_ops_exp', sa.Float(), nullable=True, default=0),
        sa.Column('non_ops_income', sa.Float(), nullable=True, default=0),
        sa.Column('imported_at', sa.DateTime(), nullable=True),
        sa.Column('imported_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('version', sa.Integer(), nullable=True, default=1),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id']),
        sa.ForeignKeyConstraint(['imported_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id', 'year', 'month', 'scenario', 
                           name='uq_financial_monthly_company_period_scenario'),
        sa.CheckConstraint('month >= 1 AND month <= 12', name='ck_month_valid')
    )
    op.create_index('idx_fm_company_period', 'financial_monthly', ['company_id', 'year', 'month'])
    op.create_index('idx_fm_period', 'financial_monthly', ['year', 'month'])
    op.create_index('idx_fm_scenario', 'financial_monthly', ['scenario'])
    
    # ============ REPORTS ============
    op.create_table('reports',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('draft', 'submitted', 'approved', 'rejected',
                                     'correction_required', name='reportstatus', 
                                     create_type=False), nullable=True),
        sa.Column('submitted_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('reviewed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('fo_comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id']),
        sa.ForeignKeyConstraint(['submitted_by'], ['users.id']),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id', 'year', 'month', name='uq_report_company_period')
    )
    op.create_index('idx_report_company_period', 'reports', ['company_id', 'year', 'month'])
    op.create_index('idx_report_status', 'reports', ['status'])
    op.create_index('idx_report_submitted_by', 'reports', ['submitted_by'])
    
    # ============ REPORT COMMENTS ============
    op.create_table('report_comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('report_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_system', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_comment_report', 'report_comments', ['report_id'])
    
    # ============ REPORT STATUS HISTORY ============
    op.create_table('report_status_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('report_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('from_status', sa.Enum('draft', 'submitted', 'approved', 'rejected',
                                          'correction_required', name='reportstatus',
                                          create_type=False), nullable=True),
        sa.Column('to_status', sa.Enum('draft', 'submitted', 'approved', 'rejected',
                                        'correction_required', name='reportstatus',
                                        create_type=False), nullable=False),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id']),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_status_history_report', 'report_status_history', ['report_id'])
    op.create_index('idx_status_history_created', 'report_status_history', ['created_at'])
    
    # ============ NOTIFICATIONS ============
    op.create_table('notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.Enum('report_submitted', 'report_approved', 'report_rejected',
                                   'comment_added', 'reminder', 'system',
                                   name='notificationtype', create_type=False), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=True, default=False),
        sa.Column('link', sa.String(length=500), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_notification_user', 'notifications', ['user_id'])
    op.create_index('idx_notification_unread', 'notifications', ['user_id', 'is_read'])
    op.create_index('idx_notification_created', 'notifications', ['created_at'])
    
    # ============ EMAIL OUTBOX ============
    op.create_table('email_outbox',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('to_email', sa.String(length=255), nullable=False),
        sa.Column('to_name', sa.String(length=255), nullable=True),
        sa.Column('subject', sa.String(length=500), nullable=False),
        sa.Column('body_html', sa.Text(), nullable=False),
        sa.Column('body_text', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'sent', 'failed', 
                                     name='emailstatus', create_type=False), nullable=True),
        sa.Column('attempts', sa.Integer(), nullable=True, default=0),
        sa.Column('last_attempt', sa.DateTime(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('related_type', sa.String(length=50), nullable=True),
        sa.Column('related_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_email_status', 'email_outbox', ['status'])
    op.create_index('idx_email_pending', 'email_outbox', ['status', 'created_at'])
    
    # ============ FX RATES ============
    op.create_table('fx_rates',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('from_currency', sa.String(length=3), nullable=False),
        sa.Column('to_currency', sa.String(length=3), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('rate', sa.Float(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('from_currency', 'to_currency', 'year', 'month',
                           name='uq_fx_rate_currencies_period')
    )
    op.create_index('idx_fx_rate_period', 'fx_rates', ['year', 'month'])
    
    # ============ AUDIT LOGS ============
    op.create_table('audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.String(length=100), nullable=True),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_audit_user', 'audit_logs', ['user_id'])
    op.create_index('idx_audit_action', 'audit_logs', ['action'])
    op.create_index('idx_audit_entity', 'audit_logs', ['entity_type', 'entity_id'])
    op.create_index('idx_audit_created', 'audit_logs', ['created_at'])


def downgrade() -> None:
    # Drop tables in reverse order (respecting FK constraints)
    op.drop_table('audit_logs')
    op.drop_table('fx_rates')
    op.drop_table('email_outbox')
    op.drop_table('notifications')
    op.drop_table('report_status_history')
    op.drop_table('report_comments')
    op.drop_table('reports')
    op.drop_table('financial_monthly')
    op.drop_table('company_user_roles')
    op.drop_table('users')
    op.drop_table('companies')
    op.drop_table('clusters')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS emailstatus')
    op.execute('DROP TYPE IF EXISTS notificationtype')
    op.execute('DROP TYPE IF EXISTS scenario')
    op.execute('DROP TYPE IF EXISTS reportstatus')
    op.execute('DROP TYPE IF EXISTS userrole')
