"""
SQLAlchemy Database Models for McLarens Analytics
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, 
    ForeignKey, Text, Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum


class Base(DeclarativeBase):
    pass


class UserRole(str, enum.Enum):
    DATA_OFFICER = "data_officer"
    COMPANY_DIRECTOR = "company_director"
    ADMIN = "admin"
    CEO = "ceo"


class ReportStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


class FiscalCycle(str, enum.Enum):
    DECEMBER = "december"
    MARCH = "march"


# ============ MASTER DATA ============

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("clusters.id"), nullable=True)
    azure_oid = Column(String(255), nullable=True, unique=True)  # Microsoft Entra ID Object ID
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    company = relationship("Company", back_populates="users")
    cluster = relationship("Cluster", back_populates="users")


class Cluster(Base):
    __tablename__ = "clusters"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    code = Column(String(20), nullable=False, unique=True)
    fiscal_cycle = Column(SQLEnum(FiscalCycle), default=FiscalCycle.DECEMBER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    companies = relationship("Company", back_populates="cluster")
    users = relationship("User", back_populates="cluster")


class Company(Base):
    __tablename__ = "companies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False, unique=True)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("clusters.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    cluster = relationship("Cluster", back_populates="companies")
    users = relationship("User", back_populates="company")
    reports = relationship("Report", back_populates="company")
    financials = relationship("FinancialData", back_populates="company")


# ============ TRANSACTIONAL DATA ============

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    status = Column(SQLEnum(ReportStatus), default=ReportStatus.DRAFT)
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    company = relationship("Company", back_populates="reports")
    comments = relationship("ReportComment", back_populates="report")
    
    __table_args__ = (
        Index('idx_report_company_period', 'company_id', 'year', 'month'),
    )


class ReportComment(Base):
    __tablename__ = "report_comments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    report = relationship("Report", back_populates="comments")


# ============ FINANCIAL FACTS (Excel P&L Template Aligned) ============

class FinancialData(Base):
    """
    Financial data model matching Excel P&L Template exactly.
    All monetary values are stored in LKR unless otherwise noted.
    """
    __tablename__ = "financial_data"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    
    # Exchange Rate (Monthly average)
    exchange_rate = Column(Float, default=1.0)  # LKR to USD
    
    # ========== RAW INPUT FIELDS (Actual) ==========
    # Revenue
    revenue_lkr_actual = Column(Float, default=0)
    
    # Gross Profit
    gp_actual = Column(Float, default=0)
    
    # Other Income
    other_income_actual = Column(Float, default=0)
    
    # Expense Breakdown
    personal_exp_actual = Column(Float, default=0)      # Personal Related Expenses
    admin_exp_actual = Column(Float, default=0)         # Admin & Establishment Expenses
    selling_exp_actual = Column(Float, default=0)       # Selling & Distribution Expenses
    finance_exp_actual = Column(Float, default=0)       # Finance Expenses
    depreciation_actual = Column(Float, default=0)      # Depreciation
    
    # Adjustments
    provisions_actual = Column(Float, default=0)        # Provisions (Write-back)/Write-off
    exchange_gl_actual = Column(Float, default=0)       # Exchange Gain/Loss
    
    # Non-Operating Items
    non_ops_exp_actual = Column(Float, default=0)       # Non Operating Expenses (NRV/Forex/Impair)
    non_ops_income_actual = Column(Float, default=0)    # Non Operating Income
    
    # ========== RAW INPUT FIELDS (Budget) ==========
    # Revenue
    revenue_lkr_budget = Column(Float, default=0)
    
    # Gross Profit
    gp_budget = Column(Float, default=0)
    
    # Other Income
    other_income_budget = Column(Float, default=0)
    
    # Expense Breakdown
    personal_exp_budget = Column(Float, default=0)
    admin_exp_budget = Column(Float, default=0)
    selling_exp_budget = Column(Float, default=0)
    finance_exp_budget = Column(Float, default=0)
    depreciation_budget = Column(Float, default=0)
    
    # Adjustments
    provisions_budget = Column(Float, default=0)
    exchange_gl_budget = Column(Float, default=0)
    
    # Non-Operating Items
    non_ops_exp_budget = Column(Float, default=0)
    non_ops_income_budget = Column(Float, default=0)
    
    # ========== LEGACY FIELDS (for backward compatibility) ==========
    revenue_actual = Column(Float, default=0)   # Maps to revenue_lkr_actual
    cost_actual = Column(Float, default=0)      # Maps to total_overheads
    pbt_actual = Column(Float, default=0)       # Maps to pbt_before
    ebitda_actual = Column(Float, default=0)    # Computed
    revenue_budget = Column(Float, default=0)
    cost_budget = Column(Float, default=0)
    pbt_budget = Column(Float, default=0)
    ebitda_budget = Column(Float, default=0)
    
    # Metadata
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    company = relationship("Company", back_populates="financials")
    
    __table_args__ = (
        Index('idx_financial_company_period', 'company_id', 'year', 'month'),
        Index('idx_financial_period', 'year', 'month'),
    )
    
    # ========== COMPUTED PROPERTIES (Match Excel Formulas) ==========
    
    @property
    def revenue_usd_actual(self) -> float:
        """Revenue(USD) = Revenue(LKR) / exchange_rate"""
        if self.exchange_rate and self.exchange_rate > 0:
            return self.revenue_lkr_actual / self.exchange_rate
        return 0
    
    @property
    def revenue_usd_budget(self) -> float:
        if self.exchange_rate and self.exchange_rate > 0:
            return self.revenue_lkr_budget / self.exchange_rate
        return 0
    
    @property
    def gp_margin_actual(self) -> float:
        """GP Margin = GP / Revenue(LKR)"""
        if self.revenue_lkr_actual and self.revenue_lkr_actual != 0:
            return self.gp_actual / self.revenue_lkr_actual
        return 0
    
    @property
    def gp_margin_budget(self) -> float:
        if self.revenue_lkr_budget and self.revenue_lkr_budget != 0:
            return self.gp_budget / self.revenue_lkr_budget
        return 0
    
    @property
    def total_overheads_actual(self) -> float:
        """Total Overheads = Sum of 5 expense categories (NOT including Other Income)"""
        return (
            self.personal_exp_actual +
            self.admin_exp_actual +
            self.selling_exp_actual +
            self.finance_exp_actual +
            self.depreciation_actual
        )
    
    @property
    def total_overheads_budget(self) -> float:
        return (
            self.personal_exp_budget +
            self.admin_exp_budget +
            self.selling_exp_budget +
            self.finance_exp_budget +
            self.depreciation_budget
        )
    
    @property
    def pbt_before_actual(self) -> float:
        """PBT Before Non Ops = GP + Other Income - Total Overheads + Provisions + Exchange"""
        return (
            self.gp_actual +
            self.other_income_actual -
            self.total_overheads_actual +
            self.provisions_actual +
            self.exchange_gl_actual
        )
    
    @property
    def pbt_before_budget(self) -> float:
        return (
            self.gp_budget +
            self.other_income_budget -
            self.total_overheads_budget +
            self.provisions_budget +
            self.exchange_gl_budget
        )
    
    @property
    def np_margin_actual(self) -> float:
        """NP Margin = PBT Before Non Ops / Revenue(LKR)"""
        if self.revenue_lkr_actual and self.revenue_lkr_actual != 0:
            return self.pbt_before_actual / self.revenue_lkr_actual
        return 0
    
    @property
    def np_margin_budget(self) -> float:
        if self.revenue_lkr_budget and self.revenue_lkr_budget != 0:
            return self.pbt_before_budget / self.revenue_lkr_budget
        return 0
    
    @property
    def pbt_after_actual(self) -> float:
        """PBT After Non Ops = PBT Before - Non Ops Expenses + Non Ops Income"""
        return self.pbt_before_actual - self.non_ops_exp_actual + self.non_ops_income_actual
    
    @property
    def pbt_after_budget(self) -> float:
        return self.pbt_before_budget - self.non_ops_exp_budget + self.non_ops_income_budget
    
    @property
    def ebit_computed_actual(self) -> float:
        """EBIT = PBT Before + Finance Expenses"""
        return self.pbt_before_actual + self.finance_exp_actual
    
    @property
    def ebit_computed_budget(self) -> float:
        return self.pbt_before_budget + self.finance_exp_budget
    
    @property
    def ebitda_computed_actual(self) -> float:
        """EBITDA = PBT Before + Finance Expenses + Depreciation"""
        return self.pbt_before_actual + self.finance_exp_actual + self.depreciation_actual
    
    @property
    def ebitda_computed_budget(self) -> float:
        return self.pbt_before_budget + self.finance_exp_budget + self.depreciation_budget


# ============ AUDIT & NOTIFICATIONS ============

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    link = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
