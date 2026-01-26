"""
SQLAlchemy Database Models for McLarens Analytics
Updated for EPIC 1 - Complete schema with all required tables
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, 
    ForeignKey, Text, Enum as SQLEnum, Index, UniqueConstraint,
    CheckConstraint
)
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import enum


class Base(DeclarativeBase):
    pass


# ============ ENUMS ============

class UserRole(str, enum.Enum):
    """User roles in the system"""
    FINANCE_OFFICER = "finance_officer"       # FO - Finance Officer
    FINANCE_DIRECTOR = "finance_director"  # FD - Finance Director
    ADMIN = "admin"                     # System Admin
    CEO = "ceo"                         # MD - Managing Director


class ReportStatus(str, enum.Enum):
    """Report workflow status"""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    CORRECTION_REQUIRED = "correction_required"


class Scenario(str, enum.Enum):
    """Financial data scenario type"""
    ACTUAL = "actual"
    BUDGET = "budget"


class FiscalStartMonth(int, enum.Enum):
    """Fiscal year start month (1=Jan, 4=Apr, etc.)"""
    JANUARY = 1
    FEBRUARY = 2
    MARCH = 3
    APRIL = 4
    MAY = 5
    JUNE = 6
    JULY = 7
    AUGUST = 8
    SEPTEMBER = 9
    OCTOBER = 10
    NOVEMBER = 11
    DECEMBER = 12


class NotificationType(str, enum.Enum):
    """Notification types for categorization"""
    REPORT_SUBMITTED = "report_submitted"
    REPORT_APPROVED = "report_approved"
    REPORT_REJECTED = "report_rejected"
    COMMENT_ADDED = "comment_added"
    REMINDER = "reminder"
    SYSTEM = "system"


class EmailStatus(str, enum.Enum):
    """Email outbox status"""
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


# ============ MASTER DATA ============

class Cluster(Base):
    """
    Cluster - Groups of companies (e.g., Regional clusters)
    """
    __tablename__ = "clusters"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    code = Column(String(20), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    companies = relationship("Company", back_populates="cluster", lazy="dynamic")
    users = relationship("User", back_populates="cluster", lazy="dynamic")
    
    __table_args__ = (
        Index('idx_cluster_code', 'code'),
        Index('idx_cluster_active', 'is_active'),
    )


class Company(Base):
    """
    Company - Individual business entity with FY configuration
    """
    __tablename__ = "companies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False, unique=True)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("clusters.id"), nullable=False)
    
    # Fiscal Year configuration (1-12, where 1=Jan, 4=Apr)
    fy_start_month = Column(Integer, default=1, nullable=False)
    
    # Additional metadata
    currency = Column(String(3), default="LKR")  # ISO 4217
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cluster = relationship("Cluster", back_populates="companies")
    users = relationship("User", back_populates="company", lazy="dynamic")
    reports = relationship("Report", back_populates="company", lazy="dynamic")
    financial_monthly = relationship("FinancialMonthly", back_populates="company", lazy="dynamic")
    
    __table_args__ = (
        Index('idx_company_code', 'code'),
        Index('idx_company_cluster', 'cluster_id'),
        Index('idx_company_active', 'is_active'),
        Index('idx_company_name', 'name'),
        CheckConstraint('fy_start_month >= 1 AND fy_start_month <= 12', name='ck_fy_start_month'),
    )


class User(Base):
    """
    User - System user with role and company/cluster assignment
    """
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # Nullable for SSO users
    name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    
    # Assignment (nullable for Admin/CEO who don't need specific assignment)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("clusters.id"), nullable=True)
    
    # Microsoft Entra ID integration
    azure_oid = Column(String(255), nullable=True, unique=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="users")
    cluster = relationship("Cluster", back_populates="users")
    notifications = relationship("Notification", back_populates="user", lazy="dynamic")
    
    __table_args__ = (
        Index('idx_user_email', 'email'),
        Index('idx_user_role', 'role'),
        Index('idx_user_company', 'company_id'),
        Index('idx_user_azure_oid', 'azure_oid'),
    )


class CompanyUserRole(Base):
    """
    Many-to-many: User can be assigned to multiple companies
    (FD can review multiple companies)
    """
    __tablename__ = "company_user_roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    is_primary = Column(Boolean, default=False)  # Primary assignment
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('user_id', 'company_id', 'role', name='uq_user_company_role'),
        Index('idx_cur_user', 'user_id'),
        Index('idx_cur_company', 'company_id'),
    )


# ============ FINANCIAL DATA ============

class FinancialMonthly(Base):
    """
    Monthly financial data - ACTUAL or BUDGET scenario
    Matches Excel P&L Template structure
    """
    __tablename__ = "financial_monthly"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    scenario = Column(SQLEnum(Scenario), nullable=False)  # ACTUAL or BUDGET
    
    # Exchange Rate (Monthly average)
    exchange_rate = Column(Float, default=1.0)  # LKR to USD
    
    # ========== REVENUE ==========
    revenue_lkr = Column(Float, default=0)  # Revenue in LKR
    
    # ========== GROSS PROFIT ==========
    gp = Column(Float, default=0)  # Gross Profit
    
    # ========== OTHER INCOME ==========
    other_income = Column(Float, default=0)
    
    # ========== EXPENSE BREAKDOWN ==========
    personal_exp = Column(Float, default=0)      # Personal Related Expenses
    admin_exp = Column(Float, default=0)         # Admin & Establishment Expenses
    selling_exp = Column(Float, default=0)       # Selling & Distribution Expenses
    finance_exp = Column(Float, default=0)       # Finance Expenses
    depreciation = Column(Float, default=0)      # Depreciation
    
    # ========== ADJUSTMENTS ==========
    provisions = Column(Float, default=0)        # Provisions (Write-back)/Write-off
    exchange_gl = Column(Float, default=0)       # Exchange Gain/Loss
    
    # ========== NON-OPERATING ITEMS ==========
    non_ops_exp = Column(Float, default=0)       # Non Operating Expenses
    non_ops_income = Column(Float, default=0)    # Non Operating Income
    
    # ========== METADATA ==========
    imported_at = Column(DateTime, nullable=True)  # When budget was imported
    imported_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    version = Column(Integer, default=1)  # For tracking reimports
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="financial_monthly")
    
    __table_args__ = (
        # CRITICAL: Unique constraint prevents duplicate entries
        UniqueConstraint('company_id', 'year', 'month', 'scenario', 
                        name='uq_financial_monthly_company_period_scenario'),
        Index('idx_fm_company_period', 'company_id', 'year', 'month'),
        Index('idx_fm_period', 'year', 'month'),
        Index('idx_fm_scenario', 'scenario'),
        CheckConstraint('month >= 1 AND month <= 12', name='ck_month_valid'),
    )
    
    # ========== COMPUTED PROPERTIES ==========
    
    @property
    def revenue_usd(self) -> float:
        """Revenue(USD) = Revenue(LKR) / exchange_rate"""
        if self.exchange_rate and self.exchange_rate > 0:
            return self.revenue_lkr / self.exchange_rate
        return 0
    
    @property
    def gp_margin(self) -> float:
        """GP Margin = GP / Revenue(LKR)"""
        if self.revenue_lkr and self.revenue_lkr != 0:
            return self.gp / self.revenue_lkr
        return 0
    
    @property
    def total_overheads(self) -> float:
        """Total Overheads = Sum of 5 expense categories"""
        return (
            self.personal_exp +
            self.admin_exp +
            self.selling_exp +
            self.finance_exp +
            self.depreciation
        )
    
    @property
    def pbt_before(self) -> float:
        """PBT Before Non Ops = GP + Other Income - Total Overheads + Provisions + Exchange"""
        return (
            self.gp +
            self.other_income -
            self.total_overheads +
            self.provisions +
            self.exchange_gl
        )
    
    @property
    def np_margin(self) -> float:
        """NP Margin = PBT Before Non Ops / Revenue(LKR)"""
        if self.revenue_lkr and self.revenue_lkr != 0:
            return self.pbt_before / self.revenue_lkr
        return 0
    
    @property
    def pbt_after(self) -> float:
        """PBT After Non Ops = PBT Before - Non Ops Expenses + Non Ops Income"""
        return self.pbt_before - self.non_ops_exp + self.non_ops_income
    
    @property
    def ebit(self) -> float:
        """EBIT = PBT Before + Finance Expenses"""
        return self.pbt_before + self.finance_exp
    
    @property
    def ebitda(self) -> float:
        """EBITDA = PBT Before + Finance Expenses + Depreciation"""
        return self.pbt_before + self.finance_exp + self.depreciation


# ============ WORKFLOW / REPORTING ============

class Report(Base):
    """
    Report header - Represents a monthly submission from FO to FD
    """
    __tablename__ = "reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    status = Column(SQLEnum(ReportStatus), default=ReportStatus.DRAFT)
    
    # Submission info
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    
    # Approval info  
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # FO Comment/Analysis
    fo_comment = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="reports")
    comments = relationship("ReportComment", back_populates="report", lazy="dynamic")
    status_history = relationship("ReportStatusHistory", back_populates="report", 
                                  order_by="ReportStatusHistory.created_at", lazy="dynamic")
    
    __table_args__ = (
        UniqueConstraint('company_id', 'year', 'month', name='uq_report_company_period'),
        Index('idx_report_company_period', 'company_id', 'year', 'month'),
        Index('idx_report_status', 'status'),
        Index('idx_report_submitted_by', 'submitted_by'),
    )


class ReportComment(Base):
    """
    Comments on reports (from FO analysis or FD feedback)
    """
    __tablename__ = "report_comments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_system = Column(Boolean, default=False)  # System-generated comment
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    report = relationship("Report", back_populates="comments")
    
    __table_args__ = (
        Index('idx_comment_report', 'report_id'),
    )


class ReportStatusHistory(Base):
    """
    Audit trail of report status changes
    """
    __tablename__ = "report_status_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False)
    from_status = Column(SQLEnum(ReportStatus), nullable=True)  # Null for initial creation
    to_status = Column(SQLEnum(ReportStatus), nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=True)  # For rejections
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    report = relationship("Report", back_populates="status_history")
    
    __table_args__ = (
        Index('idx_status_history_report', 'report_id'),
        Index('idx_status_history_created', 'created_at'),
    )


# ============ NOTIFICATIONS & EMAIL ============

class Notification(Base):
    """
    In-app notifications for users
    """
    __tablename__ = "notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(SQLEnum(NotificationType), default=NotificationType.SYSTEM)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    link = Column(String(500), nullable=True)  # Link to related page
    extra_data = Column(JSONB, nullable=True)  # Additional data (report_id, etc.) - renamed from 'metadata'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    
    __table_args__ = (
        Index('idx_notification_user', 'user_id'),
        Index('idx_notification_unread', 'user_id', 'is_read'),
        Index('idx_notification_created', 'created_at'),
    )


class EmailOutbox(Base):
    """
    Email outbox for async email sending
    Emails are queued here and sent by a background worker
    """
    __tablename__ = "email_outbox"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    to_email = Column(String(255), nullable=False)
    to_name = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=False)
    body_html = Column(Text, nullable=False)
    body_text = Column(Text, nullable=True)  # Plain text fallback
    
    # Status tracking
    status = Column(SQLEnum(EmailStatus), default=EmailStatus.PENDING)
    attempts = Column(Integer, default=0)
    last_attempt = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Metadata
    related_type = Column(String(50), nullable=True)  # 'report', 'notification', etc.
    related_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_email_status', 'status'),
        Index('idx_email_pending', 'status', 'created_at'),
    )


# ============ FX RATES ============

class FxRate(Base):
    """
    Historical FX rates for currency conversion
    """
    __tablename__ = "fx_rates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_currency = Column(String(3), nullable=False, default="LKR")
    to_currency = Column(String(3), nullable=False, default="USD")
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    rate = Column(Float, nullable=False)  # 1 from_currency = rate to_currency
    source = Column(String(100), nullable=True)  # Where rate came from
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('from_currency', 'to_currency', 'year', 'month', 
                        name='uq_fx_rate_currencies_period'),
        Index('idx_fx_rate_period', 'year', 'month'),
    )


# ============ AUDIT LOG ============

class AuditLog(Base):
    """
    System-wide audit logging
    """
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(100), nullable=True)
    details = Column(JSONB, nullable=True)  # Changed to JSONB for better querying
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_audit_user', 'user_id'),
        Index('idx_audit_action', 'action'),
        Index('idx_audit_entity', 'entity_type', 'entity_id'),
        Index('idx_audit_created', 'created_at'),
    )


# ============ LEGACY COMPATIBILITY ============
# These are aliases for backward compatibility with existing code

FinancialData = FinancialMonthly  # Alias for old code
