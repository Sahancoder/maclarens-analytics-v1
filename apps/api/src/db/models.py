"""
SQLAlchemy models for McLarens Analytics (analytics schema).

The codebase still imports legacy names (User, Company, Report, FinancialMonthly, etc.),
so this module provides compatibility aliases and hybrid properties while mapping to the
current text-ID schema.
"""
from __future__ import annotations

from datetime import datetime, timezone
import enum
import uuid


def _utcnow():
    """Timezone-aware UTC timestamp for column defaults."""
    return datetime.now(timezone.utc)

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    cast,
    func,
    literal,
    select,
)
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import DeclarativeBase, relationship, synonym


class Base(DeclarativeBase):
    pass


# ============================================================
# Enums
# ============================================================


class UserRole(str, enum.Enum):
    FINANCE_OFFICER = "Finance Officer"
    FINANCE_DIRECTOR = "Finance Director"
    ADMIN = "Admin"
    MD = "MD"  # formerly CEO


UserRoleEnum = UserRole


class Scenario(str, enum.Enum):
    ACTUAL = "Actual"
    BUDGET = "Budget"


class ReportStatus(str, enum.Enum):
    DRAFT = "Draft"
    SUBMITTED = "Submitted"
    APPROVED = "Approved"
    REJECTED = "Rejected"


class NotificationType(str, enum.Enum):
    REPORT_SUBMITTED = "report_submitted"
    REPORT_APPROVED = "report_approved"
    REPORT_REJECTED = "report_rejected"
    COMMENT_ADDED = "comment_added"
    SYSTEM = "system"


class FiscalCycle(str, enum.Enum):
    DECEMBER = "december"  # Jan - Dec
    MARCH = "march"        # Apr - Mar


class FiscalStartMonth(int, enum.Enum):
    JANUARY = 1
    APRIL = 4


class EmailStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


# ============================================================
# Master Tables
# ============================================================


class RoleMaster(Base):
    __tablename__ = "role_master"
    __table_args__ = {"schema": "analytics"}

    role_id = Column(Integer, primary_key=True, autoincrement=False)
    role_name = Column(Text, nullable=False)

    user_company_roles = relationship("UserCompanyRoleMap", back_populates="role")


class UserMaster(Base):
    __tablename__ = "user_master"
    __table_args__ = {"schema": "analytics"}

    user_id = Column(Text, primary_key=True)
    # DB column is citext for case-insensitive email matching; Text is compatible
    user_email = Column(Text, nullable=False, unique=True)  # maps to citext in DB
    first_name = Column(Text, nullable=True)
    last_name = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_date = Column(DateTime(timezone=True), nullable=False)
    modified_date = Column(DateTime(timezone=True), nullable=False)

    company_maps = relationship("UserCompanyMap", back_populates="user")
    role_maps = relationship("UserCompanyRoleMap", back_populates="user")

    id = synonym("user_id")
    email = synonym("user_email")

    @property
    def name(self) -> str:
        fn = (self.first_name or "").strip()
        ln = (self.last_name or "").strip()
        full = f"{fn} {ln}".strip()
        return full or self.user_email

    @property
    def role(self):
        cr = getattr(self, "current_role", None)
        if cr is None:
            return None
        # Direct match
        for member in UserRole:
            if member.value == cr or member.name == cr:
                return member
        # Legacy/Alias mapping
        role_map = {
            "SYSTEM_ADMIN": UserRole.ADMIN,
            "admin": UserRole.ADMIN,
            "Admin": UserRole.ADMIN,
            
            "Finance Officer": UserRole.FINANCE_OFFICER,
            "DATA_OFFICER": UserRole.FINANCE_OFFICER,
            
            "Finance Director": UserRole.FINANCE_DIRECTOR,
            "COMPANY_DIRECTOR": UserRole.FINANCE_DIRECTOR,
            
            "MD": UserRole.MD,
            "CEO": UserRole.MD,
            "MANAGING_DIRECTOR": UserRole.MD,
        }
        return role_map.get(cr)

    @property
    def company_id(self):
        companies = getattr(self, "accessible_companies", None)
        if companies:
            return companies[0]
        return getattr(self, "_company_id", None)

    @company_id.setter
    def company_id(self, value):
        self._company_id = value

    @property
    def cluster_id(self):
        return getattr(self, "_cluster_id", None)

    @cluster_id.setter
    def cluster_id(self, value):
        self._cluster_id = value

    created_at = synonym("created_date")
    updated_at = synonym("modified_date")


class ClusterMaster(Base):
    __tablename__ = "cluster_master"
    __table_args__ = {"schema": "analytics"}

    cluster_id = Column(Text, primary_key=True)
    cluster_name = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_date = Column(DateTime(timezone=True), nullable=False)
    modified_date = Column(DateTime(timezone=True), nullable=False)

    companies = relationship("CompanyMaster", back_populates="cluster")

    id = synonym("cluster_id")
    name = synonym("cluster_name")
    code = synonym("cluster_id")
    created_at = synonym("created_date")
    updated_at = synonym("modified_date")

    @property
    def description(self):
        return None

    @hybrid_property
    def fiscal_cycle(self):
        return FiscalCycle.DECEMBER

    @fiscal_cycle.expression
    def fiscal_cycle(cls):
        return literal(FiscalCycle.DECEMBER.value)


class CompanyMaster(Base):
    __tablename__ = "company_master"
    __table_args__ = {"schema": "analytics"}

    company_id = Column(Text, primary_key=True)
    cluster_id = Column(Text, ForeignKey("analytics.cluster_master.cluster_id"), nullable=False)
    company_name = Column(Text, nullable=False)
    fin_year_start_month = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_date = Column(DateTime(timezone=True), nullable=False)
    modified_date = Column(DateTime(timezone=True), nullable=False)

    cluster = relationship("ClusterMaster", back_populates="companies")
    user_maps = relationship("UserCompanyMap", back_populates="company")
    role_maps = relationship("UserCompanyRoleMap", back_populates="company")

    id = synonym("company_id")
    name = synonym("company_name")
    code = synonym("company_id")
    fy_start_month = synonym("fin_year_start_month")
    created_at = synonym("created_date")
    updated_at = synonym("modified_date")

    @property
    def currency(self):
        return "LKR"


class UserCompanyMap(Base):
    __tablename__ = "user_company_map"
    __table_args__ = {"schema": "analytics"}

    user_id = Column(Text, ForeignKey("analytics.user_master.user_id"), primary_key=True)
    company_id = Column(Text, ForeignKey("analytics.company_master.company_id"), primary_key=True)
    is_active = Column(Boolean, nullable=False, default=True)
    assigned_date = Column(Date, nullable=True)

    user = relationship("UserMaster", back_populates="company_maps")
    company = relationship("CompanyMaster", back_populates="user_maps")


class UserCompanyRoleMap(Base):
    __tablename__ = "user_company_role_map"
    __table_args__ = {"schema": "analytics"}

    user_id = Column(Text, ForeignKey("analytics.user_master.user_id"), primary_key=True)
    company_id = Column(Text, ForeignKey("analytics.company_master.company_id"), primary_key=True)
    role_id = Column(Integer, ForeignKey("analytics.role_master.role_id"), primary_key=True)
    is_active = Column(Boolean, nullable=False, default=True)

    user = relationship("UserMaster", back_populates="role_maps")
    company = relationship("CompanyMaster", back_populates="role_maps")
    role = relationship("RoleMaster", back_populates="user_company_roles")


# ============================================================
# Period / Metric / Status Masters
# ============================================================


class PeriodMaster(Base):
    __tablename__ = "period_master"
    __table_args__ = {"schema": "analytics"}

    period_id = Column(Integer, primary_key=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)


class MetricMaster(Base):
    __tablename__ = "metric_master"
    __table_args__ = {"schema": "analytics"}

    metric_id = Column(Integer, primary_key=True)
    metric_name = Column(Text, nullable=False)
    metric_category = Column(Text, nullable=True)


class StatusMaster(Base):
    __tablename__ = "status_master"
    __table_args__ = {"schema": "analytics"}

    status_id = Column(Integer, primary_key=True)
    status_name = Column(Text, nullable=False)


# ============================================================
# Financial Data
# ============================================================


class FinancialFact(Base):
    __tablename__ = "financial_fact"
    __table_args__ = {"schema": "analytics"}

    company_id = Column(Text, ForeignKey("analytics.company_master.company_id"), primary_key=True)
    period_id = Column(Integer, ForeignKey("analytics.period_master.period_id"), primary_key=True)
    metric_id = Column(Integer, ForeignKey("analytics.metric_master.metric_id"), primary_key=True)
    actual_budget = Column(Text, primary_key=True)
    amount = Column(Numeric, nullable=True)

    company = relationship("CompanyMaster")
    metric = relationship("MetricMaster")
    period = relationship("PeriodMaster")


class FinancialMonthly(Base):
    """
    Read model over analytics.financial_monthly_view.
    """
    __tablename__ = "financial_monthly_view"
    __table_args__ = {"schema": "analytics"}

    company_id = Column(Text, primary_key=True)
    period_id = Column(Integer, primary_key=True)
    scenario = Column(Text, primary_key=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)

    revenue_lkr = Column(Numeric, nullable=True)
    gp = Column(Numeric, nullable=True)
    gp_margin = Column(Numeric, nullable=True)
    other_income = Column(Numeric, nullable=True)
    personal_exp = Column(Numeric, nullable=True)
    admin_exp = Column(Numeric, nullable=True)
    selling_exp = Column(Numeric, nullable=True)
    finance_exp = Column(Numeric, nullable=True)
    depreciation = Column(Numeric, nullable=True)
    total_overhead = Column(Numeric, nullable=True)
    provisions = Column(Numeric, nullable=True)
    exchange_gl = Column(Numeric, nullable=True)
    pbt_before_non_ops = Column(Numeric, nullable=True)
    pbt_after_non_ops = Column(Numeric, nullable=True)
    non_ops_exp = Column(Numeric, nullable=True)
    non_ops_income = Column(Numeric, nullable=True)
    np_margin = Column(Numeric, nullable=True)
    ebit = Column(Numeric, nullable=True)
    ebitda = Column(Numeric, nullable=True)
    exchange_rate = Column(Numeric, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)

    @hybrid_property
    def id(self):
        return f"{self.company_id}_{self.year}_{self.month}_{self.scenario}"

    @id.expression
    def id(cls):
        return (
            cls.company_id
            + literal("_")
            + cast(cls.year, String)
            + literal("_")
            + cast(cls.month, String)
            + literal("_")
            + cls.scenario
        )

    @property
    def updated_at(self):
        return self.created_at


FinancialMonthlyView = FinancialMonthly
FinancialData = FinancialMonthly


class FinancialPnL(Base):
    """
    Read model over analytics.vw_financial_pnl.
    Pivoted view that joins actual + budget rows side-by-side with _actual/_budget suffixes.
    Used by services that need both scenarios in one row (dashboards, exports, rankings).
    """
    __tablename__ = "vw_financial_pnl"
    __table_args__ = {"schema": "analytics"}

    company_id = Column(Text, primary_key=True)
    period_id = Column(Integer, primary_key=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)

    # Actual columns
    revenue_lkr_actual = Column(Numeric, nullable=True)
    gp_actual = Column(Numeric, nullable=True)
    gp_margin_actual = Column(Numeric, nullable=True)
    other_income_actual = Column(Numeric, nullable=True)
    personal_exp_actual = Column(Numeric, nullable=True)
    admin_exp_actual = Column(Numeric, nullable=True)
    selling_exp_actual = Column(Numeric, nullable=True)
    finance_exp_actual = Column(Numeric, nullable=True)
    depreciation_actual = Column(Numeric, nullable=True)
    total_overheads_actual = Column(Numeric, nullable=True)
    provisions_actual = Column(Numeric, nullable=True)
    exchange_gl_actual = Column(Numeric, nullable=True)
    pbt_before_actual = Column(Numeric, nullable=True)
    pbt_after_actual = Column(Numeric, nullable=True)
    non_ops_exp_actual = Column(Numeric, nullable=True)
    non_ops_income_actual = Column(Numeric, nullable=True)
    np_margin_actual = Column(Numeric, nullable=True)
    ebit_computed_actual = Column(Numeric, nullable=True)
    ebitda_computed_actual = Column(Numeric, nullable=True)

    # Budget columns
    revenue_lkr_budget = Column(Numeric, nullable=True)
    gp_budget = Column(Numeric, nullable=True)
    gp_margin_budget = Column(Numeric, nullable=True)
    other_income_budget = Column(Numeric, nullable=True)
    personal_exp_budget = Column(Numeric, nullable=True)
    admin_exp_budget = Column(Numeric, nullable=True)
    selling_exp_budget = Column(Numeric, nullable=True)
    finance_exp_budget = Column(Numeric, nullable=True)
    depreciation_budget = Column(Numeric, nullable=True)
    total_overheads_budget = Column(Numeric, nullable=True)
    provisions_budget = Column(Numeric, nullable=True)
    exchange_gl_budget = Column(Numeric, nullable=True)
    pbt_before_budget = Column(Numeric, nullable=True)
    pbt_after_budget = Column(Numeric, nullable=True)
    non_ops_exp_budget = Column(Numeric, nullable=True)
    non_ops_income_budget = Column(Numeric, nullable=True)
    np_margin_budget = Column(Numeric, nullable=True)
    ebit_computed_budget = Column(Numeric, nullable=True)
    ebitda_computed_budget = Column(Numeric, nullable=True)

    exchange_rate = Column(Numeric, nullable=True)

    company = relationship("CompanyMaster", foreign_keys=[company_id],
                           primaryjoin="FinancialPnL.company_id == CompanyMaster.company_id",
                           viewonly=True, lazy="joined")


# ============================================================
# Workflow (financial_workflow)
# ============================================================


class Report(Base):
    __tablename__ = "financial_workflow"
    __table_args__ = {"schema": "analytics"}

    company_id = Column(Text, ForeignKey("analytics.company_master.company_id"), primary_key=True)
    period_id = Column(Integer, ForeignKey("analytics.period_master.period_id"), primary_key=True)
    status_id = Column(Integer, ForeignKey("analytics.status_master.status_id"), nullable=False)

    submitted_by = Column(Text, nullable=True)
    submitted_date = Column(DateTime(timezone=True), nullable=True)
    actual_comment = Column(Text, nullable=True)
    budget_comment = Column(Text, nullable=True)
    approved_by = Column(Text, nullable=True)
    approved_date = Column(DateTime(timezone=True), nullable=True)
    rejected_by = Column(Text, nullable=True)
    rejected_date = Column(DateTime(timezone=True), nullable=True)
    reject_reason = Column(Text, nullable=True)

    company = relationship("CompanyMaster", lazy="joined")
    period_ref = relationship("PeriodMaster", lazy="joined")
    status_ref = relationship("StatusMaster", lazy="joined")

    @hybrid_property
    def id(self):
        return f"{self.company_id}_{self.period_id}"

    @id.expression
    def id(cls):
        return cls.company_id + literal("_") + cast(cls.period_id, String)

    @hybrid_property
    def year(self):
        if self.period_ref:
            return self.period_ref.year
        return None

    @year.expression
    def year(cls):
        return (
            select(PeriodMaster.year)
            .where(PeriodMaster.period_id == cls.period_id)
            .correlate_except(PeriodMaster)
            .scalar_subquery()
        )

    @hybrid_property
    def month(self):
        if self.period_ref:
            return self.period_ref.month
        return None

    @month.expression
    def month(cls):
        return (
            select(PeriodMaster.month)
            .where(PeriodMaster.period_id == cls.period_id)
            .correlate_except(PeriodMaster)
            .scalar_subquery()
        )

    @hybrid_property
    def status(self):
        status_map = {
            1: ReportStatus.DRAFT,
            2: ReportStatus.SUBMITTED,
            3: ReportStatus.APPROVED,
            4: ReportStatus.REJECTED,
        }
        return status_map.get(self.status_id, ReportStatus.DRAFT)

    @status.setter
    def status(self, value):
        if isinstance(value, ReportStatus):
            value = value.value
        status_map = {
            ReportStatus.DRAFT.value: 1,
            ReportStatus.SUBMITTED.value: 2,
            ReportStatus.APPROVED.value: 3,
            ReportStatus.REJECTED.value: 4,
        }
        if isinstance(value, str):
            self.status_id = status_map.get(value, self.status_id)

    @status.expression
    def status(cls):
        return (
            select(StatusMaster.status_name)
            .where(StatusMaster.status_id == cls.status_id)
            .correlate_except(StatusMaster)
            .scalar_subquery()
        )

    submitted_at = synonym("submitted_date")
    approved_at = synonym("approved_date")
    rejected_at = synonym("rejected_date")
    fo_comment = synonym("actual_comment")
    rejection_reason = synonym("reject_reason")

    @hybrid_property
    def reviewed_at(self):
        return self.approved_date or self.rejected_date

    @reviewed_at.expression
    def reviewed_at(cls):
        return func.coalesce(cls.approved_date, cls.rejected_date)

    @hybrid_property
    def created_at(self):
        return self.submitted_date

    @created_at.expression
    def created_at(cls):
        return cls.submitted_date

    @hybrid_property
    def updated_at(self):
        return self.approved_date or self.rejected_date or self.submitted_date

    @updated_at.expression
    def updated_at(cls):
        return func.coalesce(cls.approved_date, cls.rejected_date, cls.submitted_date)


FinancialWorkflow = Report


# ============================================================
# Optional / Legacy Tables (stubs used by routers/services)
# ============================================================


class ReportComment(Base):
    __tablename__ = "report_comments"
    __table_args__ = {"schema": "analytics", "extend_existing": True}

    id = Column(Text, primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(Text, nullable=True)
    report_company_id = Column(Text, nullable=True)
    report_period_id = Column(Integer, nullable=True)
    user_id = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)


class ReportStatusHistory(Base):
    __tablename__ = "report_status_history"
    __table_args__ = {"schema": "analytics", "extend_existing": True}

    id = Column(Text, primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(Text, nullable=True)
    report_company_id = Column(Text, nullable=True)
    report_period_id = Column(Integer, nullable=True)
    from_status = Column(Text, nullable=True)
    to_status = Column(Text, nullable=True)
    changed_by = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {"schema": "analytics", "extend_existing": True}

    id = Column(Text, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Text, nullable=True)
    type = Column(Text, nullable=True)
    title = Column(Text, nullable=True)
    message = Column(Text, nullable=True)
    link = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)


class EmailOutbox(Base):
    __tablename__ = "email_outbox"
    __table_args__ = {"schema": "analytics", "extend_existing": True}

    id = Column(Text, primary_key=True, default=lambda: str(uuid.uuid4()))
    to_email = Column(Text, nullable=False)
    to_name = Column(Text, nullable=True)
    subject = Column(Text, nullable=False)
    body_text = Column(Text, nullable=True)
    body_html = Column(Text, nullable=True)
    status = Column(Text, nullable=False, default=EmailStatus.PENDING.value)
    attempts = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=3)
    last_error = Column(Text, nullable=True)
    related_type = Column(Text, nullable=True)
    related_id = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    sent_at = Column(DateTime(timezone=True), nullable=True)


class FxRate(Base):
    __tablename__ = "fx_rates"
    __table_args__ = {"schema": "analytics", "extend_existing": True}

    id = Column(Text, primary_key=True, default=lambda: str(uuid.uuid4()))
    date = Column(Date, nullable=False)
    currency = Column(Text, nullable=False, default="USD")
    rate = Column(Numeric, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = {"schema": "analytics", "extend_existing": True}

    id = Column(Text, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Text, nullable=True)
    action = Column(Text, nullable=False)
    entity_type = Column(Text, nullable=True)
    entity_id = Column(Text, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)


# ============================================================
# Compatibility Aliases
# ============================================================


User = UserMaster
Company = CompanyMaster
Cluster = ClusterMaster
CompanyUserRole = UserCompanyRoleMap

