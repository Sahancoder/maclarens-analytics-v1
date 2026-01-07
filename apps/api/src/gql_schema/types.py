"""
GraphQL Types for McLarens Analytics
Matches Excel P&L Template structure
"""
import strawberry
from typing import Optional, List
from datetime import datetime
from enum import Enum


@strawberry.enum
class UserRoleEnum(Enum):
    DATA_OFFICER = "data_officer"
    COMPANY_DIRECTOR = "company_director"
    ADMIN = "admin"
    CEO = "ceo"


@strawberry.enum
class ReportStatusEnum(Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


# ============ USER TYPES ============

@strawberry.type
class UserType:
    id: str
    email: str
    name: str
    role: UserRoleEnum
    company_id: Optional[str] = None
    cluster_id: Optional[str] = None
    is_active: bool
    created_at: datetime


@strawberry.type
class AuthPayload:
    token: str
    user: UserType


# ============ CLUSTER & COMPANY TYPES ============

@strawberry.type
class ClusterType:
    id: str
    name: str
    code: str
    is_active: bool
    company_count: int = 0


@strawberry.type
class CompanyType:
    id: str
    name: str
    code: str
    cluster_id: str
    cluster_name: str
    is_active: bool


# ============ FINANCIAL TYPES ============

@strawberry.type
class FinancialMetrics:
    actual: float
    budget: float
    variance: float
    variance_percent: float
    achievement_percent: float


@strawberry.type
class ClusterPerformance:
    cluster_id: str
    cluster_name: str
    cluster_code: str
    monthly: FinancialMetrics
    ytd: FinancialMetrics
    remarks: Optional[str] = None


@strawberry.type
class CompanyPerformance:
    company_id: str
    company_name: str
    company_code: str
    cluster_name: str
    monthly: FinancialMetrics
    ytd: FinancialMetrics


@strawberry.type
class GroupKPIs:
    total_actual: float
    total_budget: float
    total_variance: float
    variance_percent: float
    group_health_index: float
    pbt_vs_prior_year: float
    ebitda_margin: float
    cash_position: float


@strawberry.type
class TopPerformer:
    rank: int
    name: str
    achievement_percent: float
    variance: float


@strawberry.type
class RiskCluster:
    cluster_name: str
    severity: str  # high, medium, low
    variance_percent: float
    classification: str  # structural, seasonal, one-off, external


@strawberry.type
class AlertItem:
    id: str
    title: str
    severity: str
    timestamp: datetime


@strawberry.type
class ForecastData:
    month: str
    actual: Optional[float]
    budget: float
    forecast: float


@strawberry.type
class ClusterForecast:
    cluster_name: str
    current_ytd: float
    projected_year_end: float
    budget: float
    variance_percent: float


# ============ P&L TYPES (Excel Template Aligned) ============

@strawberry.type
class PLLineItem:
    """Individual P&L line item with actual and budget"""
    actual: float
    budget: float
    variance: float
    variance_percent: float


@strawberry.type
class CompanyPnL:
    """Full P&L for a company matching Excel template"""
    company_id: str
    company_name: str
    company_code: str
    year: int
    month: int
    exchange_rate: float
    
    # Revenue
    revenue_usd: PLLineItem
    revenue_lkr: PLLineItem
    
    # GP
    gp: PLLineItem
    gp_margin_actual: float
    gp_margin_budget: float
    
    # Other Income
    other_income: PLLineItem
    
    # Expense Breakdown
    personal_exp: PLLineItem
    admin_exp: PLLineItem
    selling_exp: PLLineItem
    finance_exp: PLLineItem
    depreciation: PLLineItem
    
    # Total Overheads (Computed)
    total_overheads: PLLineItem
    
    # Adjustments
    provisions: PLLineItem
    exchange_gl: PLLineItem
    
    # PBT Before Non Ops (Computed)
    pbt_before: PLLineItem
    np_margin_actual: float
    np_margin_budget: float
    
    # Non-Operating Items
    non_ops_exp: PLLineItem
    non_ops_income: PLLineItem
    
    # PBT After Non Ops (Computed)
    pbt_after: PLLineItem
    
    # EBIT & EBITDA (Computed)
    ebit: PLLineItem
    ebitda: PLLineItem


@strawberry.type
class ClusterPnLSummary:
    """Aggregated P&L for a cluster"""
    cluster_id: str
    cluster_name: str
    company_count: int
    
    revenue_lkr_actual: float
    revenue_lkr_budget: float
    gp_actual: float
    gp_budget: float
    gp_margin_actual: float
    
    total_overheads_actual: float
    total_overheads_budget: float
    
    pbt_before_actual: float
    pbt_before_budget: float
    pbt_variance: float
    pbt_variance_percent: float
    np_margin_actual: float
    
    ebit_actual: float
    ebit_budget: float
    ebitda_actual: float
    ebitda_budget: float


# ============ REPORT TYPES ============

@strawberry.type
class ReportType:
    id: str
    company_id: str
    company_name: str
    year: int
    month: int
    status: ReportStatusEnum
    submitted_at: Optional[datetime]
    approved_at: Optional[datetime]
    rejection_reason: Optional[str]


@strawberry.type
class ReportComment:
    id: str
    user_name: str
    content: str
    created_at: datetime


# ============ ADMIN TYPES ============

@strawberry.type
class DashboardStats:
    total_users: int
    new_users_this_month: int
    active_companies: int
    inactive_companies: int
    total_clusters: int
    pending_reports: int


@strawberry.type
class AuditLogType:
    id: str
    user_email: Optional[str]
    action: str
    entity_type: str
    entity_id: Optional[str]
    details: Optional[str]
    created_at: datetime


@strawberry.type
class NotificationType:
    id: str
    title: str
    message: str
    is_read: bool
    link: Optional[str]
    created_at: datetime


# ============ CEO DASHBOARD TYPES ============

@strawberry.type
class CEODashboardData:
    group_kpis: GroupKPIs
    top_performers: List[TopPerformer]
    bottom_performers: List[TopPerformer]
    risk_clusters: List[RiskCluster]
    recent_alerts: List[AlertItem]
    cluster_performance: List[ClusterPerformance]


@strawberry.type
class ScenarioResult:
    scenario_name: str
    projected_pbt: float
    projected_revenue: float
    impact_percent: float


# ============ INPUT TYPES ============

@strawberry.input
class LoginInput:
    email: str
    password: str


@strawberry.input
class CreateUserInput:
    email: str
    password: str
    name: str
    role: UserRoleEnum
    company_id: Optional[str] = None
    cluster_id: Optional[str] = None


@strawberry.input
class UpdateUserInput:
    name: Optional[str] = None
    role: Optional[UserRoleEnum] = None
    is_active: Optional[bool] = None


@strawberry.input
class CreateClusterInput:
    name: str
    code: str


@strawberry.input
class CreateCompanyInput:
    name: str
    code: str
    cluster_id: str


@strawberry.input
class FinancialDataInput:
    """Legacy input - use PnLDataInput for full P&L data entry"""
    company_id: str
    year: int
    month: int
    revenue_actual: float
    cost_actual: float
    pbt_actual: float
    ebitda_actual: float
    revenue_budget: float
    cost_budget: float
    pbt_budget: float
    ebitda_budget: float


@strawberry.input
class PnLDataInput:
    """
    Full P&L data input matching Excel template.
    All monetary values should be in LKR unless otherwise noted.
    """
    company_id: str
    year: int
    month: int
    
    # Exchange Rate
    exchange_rate: float = 1.0
    
    # Revenue (LKR)
    revenue_lkr_actual: float = 0
    revenue_lkr_budget: float = 0
    
    # Gross Profit
    gp_actual: float = 0
    gp_budget: float = 0
    
    # Other Income
    other_income_actual: float = 0
    other_income_budget: float = 0
    
    # Expense Breakdown
    personal_exp_actual: float = 0
    personal_exp_budget: float = 0
    admin_exp_actual: float = 0
    admin_exp_budget: float = 0
    selling_exp_actual: float = 0
    selling_exp_budget: float = 0
    finance_exp_actual: float = 0
    finance_exp_budget: float = 0
    depreciation_actual: float = 0
    depreciation_budget: float = 0
    
    # Adjustments
    provisions_actual: float = 0
    provisions_budget: float = 0
    exchange_gl_actual: float = 0
    exchange_gl_budget: float = 0
    
    # Non-Operating Items
    non_ops_exp_actual: float = 0
    non_ops_exp_budget: float = 0
    non_ops_income_actual: float = 0
    non_ops_income_budget: float = 0


@strawberry.input
class ScenarioInput:
    revenue_change_percent: float = 0
    cost_change_percent: float = 0
    fx_impact_percent: float = 0
    budget_adjustment_percent: float = 0
