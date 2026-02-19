"""
MD (Managing Director) Dashboard Router
Advanced analytics with drilldowns for executive decision-making

Endpoints:
- GET /md/strategic-overview          - Group strategic overview (Month/YTD)
- GET /md/performers                   - Top/Bottom performers by PBT achievement
- GET /md/cluster-contribution         - Cluster contribution analysis
- GET /md/risk-radar                   - Risk radar by variance thresholds
- GET /md/drilldown/cluster/{id}       - Cluster to company drilldown
- GET /md/pbt-trend                    - PBT trend 2020 → current
- GET /md/performance-hierarchy        - Performance hierarchy with period selector
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from src.db.models import (
    Company, Cluster, Report, ReportStatus,
    FinancialMonthly, Scenario, User
)
from src.security.middleware import get_db, get_current_active_user
from src.security.permissions import has_permission, Permission

router = APIRouter(prefix="/md", tags=["MD Dashboard"])


# ============ ENUMS & MODELS ============

class ViewMode(str, Enum):
    MONTH = "month"
    YTD = "ytd"


class StrategicMetric(BaseModel):
    """A single metric with actual, budget, variance"""
    name: str
    actual: float
    budget: Optional[float]
    variance: Optional[float]
    variance_pct: Optional[float]
    achievement_pct: Optional[float]
    is_favorable: bool
    formatted_actual: str
    formatted_budget: Optional[str]
    prior_year: Optional[float] = None
    prior_year_variance_pct: Optional[float] = None


class StrategicOverview(BaseModel):
    """Group strategic overview response"""
    mode: str  # "month" or "ytd"
    period: str  # "January 2025" or "YTD 2025 (Jan-Oct)"
    year: int
    month: Optional[int]
    fy_start_month: int
    
    # Key metrics
    revenue: StrategicMetric
    gp: StrategicMetric
    gp_margin: StrategicMetric
    total_overhead: StrategicMetric
    pbt: StrategicMetric
    pbt_achievement: StrategicMetric
    
    # Exchange rate
    avg_exchange_rate: float
    
    # Reporting status
    companies_total: int
    companies_reporting: int
    companies_approved: int


class PerformerEntry(BaseModel):
    """Single performer entry"""
    rank: int
    company_id: str
    company_name: str
    company_code: str
    cluster_name: str
    pbt_actual: float
    pbt_budget: float
    achievement_pct: float
    variance: float
    formatted_pbt: str
    fiscal_cycle: Optional[str] = None  # "Jan-Dec" or "Apr-Mar"


class PerformersResponse(BaseModel):
    """Top/Bottom performers response"""
    mode: str
    period: str
    top_performers: List[PerformerEntry]
    bottom_performers: List[PerformerEntry]
    # YTD segments (for 4-segment breakdown)
    segments: Optional[List[Dict[str, Any]]] = None


class ClusterContribution(BaseModel):
    """Single cluster contribution"""
    cluster_id: str
    cluster_name: str
    cluster_code: str
    company_count: int
    companies_reporting: int
    
    # Financials
    revenue: float
    gp: float
    pbt: float
    
    # Contribution percentages
    revenue_contribution_pct: float
    gp_contribution_pct: float
    pbt_contribution_pct: float
    
    # Achievement
    pbt_budget: float
    pbt_achievement_pct: float


class ContributionResponse(BaseModel):
    """Cluster contribution analysis response"""
    mode: str
    period: str
    total_revenue: float
    total_gp: float
    total_pbt: float
    clusters: List[ClusterContribution]


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ClusterRisk(BaseModel):
    """Cluster risk assessment"""
    cluster_id: str
    cluster_name: str
    cluster_code: str
    risk_level: str
    risk_factors: List[str]
    
    # Key variance metrics
    revenue_variance_pct: float
    gp_margin_variance: float  # Absolute points
    pbt_variance_pct: float
    
    # Companies at risk
    companies_below_target: int
    companies_total: int


class RiskRadarResponse(BaseModel):
    """Risk radar response"""
    mode: str
    period: str
    overall_risk: str
    clusters: List[ClusterRisk]
    risk_thresholds: Dict[str, float]


class CompanyDrilldown(BaseModel):
    """Company detail in drilldown"""
    id: str
    name: str
    code: str
    
    # Financials
    revenue_actual: float
    revenue_budget: float
    gp_actual: float
    gp_budget: float
    gp_margin_actual: float
    gp_margin_budget: float
    pbt_actual: float
    pbt_budget: float
    
    # Variance
    revenue_variance_pct: float
    pbt_variance_pct: float
    pbt_achievement_pct: float
    
    # Status
    report_status: Optional[str]
    is_approved: bool


class ClusterDrilldownResponse(BaseModel):
    """Cluster drilldown response"""
    mode: str
    period: str
    cluster_id: str
    cluster_name: str
    cluster_code: str
    
    # Cluster totals
    total_revenue: float
    total_gp: float
    total_pbt: float
    avg_gp_margin: float
    pbt_achievement_pct: float
    
    # Companies
    companies: List[CompanyDrilldown]


class TrendDataPoint(BaseModel):
    """Single trend point"""
    year: int
    month: int
    period_label: str  # "Jan 2024"
    pbt_actual: float
    pbt_budget: Optional[float]
    achievement_pct: Optional[float]


class PBTTrendResponse(BaseModel):
    """PBT trend response"""
    company_id: Optional[str]
    company_name: Optional[str]
    cluster_id: Optional[str]
    cluster_name: Optional[str]
    start_year: int
    end_year: int
    data: List[TrendDataPoint]


class HierarchyCompany(BaseModel):
    """Company in hierarchy"""
    id: str
    name: str
    code: str
    pbt_actual: float
    pbt_budget: float
    achievement_pct: float
    gp_margin: float
    report_status: Optional[str]
    # YTD fields
    ytd_pbt_actual: float = 0
    ytd_pbt_budget: float = 0
    ytd_achievement_pct: float = 0
    fiscal_year_start_month: int = 1


class HierarchyCluster(BaseModel):
    """Cluster in hierarchy"""
    id: str
    name: str
    code: str
    pbt_actual: float
    pbt_budget: float
    achievement_pct: float
    company_count: int
    companies: List[HierarchyCompany]
    # YTD fields
    ytd_pbt_actual: float = 0
    ytd_pbt_budget: float = 0
    ytd_achievement_pct: float = 0


class CompanyDetailFinancials(BaseModel):
    """Full P&L details for a single company"""
    revenue_lkr: float = 0
    gp: float = 0
    gp_margin: float = 0
    other_income: float = 0
    personal_exp: float = 0
    admin_exp: float = 0
    selling_exp: float = 0
    finance_exp: float = 0
    depreciation: float = 0
    total_overhead: float = 0
    provisions: float = 0
    exchange_gl: float = 0
    pbt_before_non_ops: float = 0
    pbt_after_non_ops: float = 0
    non_ops_exp: float = 0
    non_ops_income: float = 0
    np_margin: float = 0
    ebit: float = 0
    ebitda: float = 0


class CompanyDetailResponse(BaseModel):
    """Full company detail for popup modal"""
    company_id: str
    company_name: str
    company_code: str
    cluster_name: str
    fiscal_year_start_month: int
    period: str
    year: int
    month: int
    monthly: CompanyDetailFinancials
    ytd: CompanyDetailFinancials
    ytd_label: str  # e.g. "Jan-Oct 2025"
    ytd_months: int  # e.g. 10
    # Budget ref
    monthly_budget_pbt: float = 0
    ytd_budget_pbt: float = 0
    monthly_achievement_pct: float = 0
    ytd_achievement_pct: float = 0
    # FD comments
    fd_comments: List[Dict[str, Any]] = []
    # Upload info
    uploaded_by: Optional[str] = None
    uploaded_at: Optional[str] = None
    report_status: Optional[str] = None


class PerformanceHierarchyResponse(BaseModel):
    """Performance hierarchy response"""
    mode: str
    period: str
    year: int
    month: int
    
    # Group totals
    group_pbt_actual: float
    group_pbt_budget: float
    group_achievement_pct: float
    
    # YTD group totals
    group_ytd_pbt_actual: float = 0
    group_ytd_pbt_budget: float = 0
    group_ytd_achievement_pct: float = 0
    
    # Hierarchy
    clusters: List[HierarchyCluster]


# ============ HELPER FUNCTIONS ============

def _f(v) -> float:
    """Convert Decimal/None to float safely."""
    return float(v) if v is not None else 0.0

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

SHORT_MONTH_NAMES = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]

# Risk thresholds
RISK_THRESHOLDS = {
    "low": 0,        # >= 90% achievement
    "medium": -10,   # >= 80% achievement
    "high": -20,     # >= 70% achievement
    "critical": -30  # < 70% achievement
}


def format_currency(value, in_millions: bool = True) -> str:
    """Format currency value"""
    v = float(value) if value is not None else 0.0
    if in_millions:
        return f"LKR {v/1e6:.1f}M"
    return f"LKR {v:,.0f}"


def format_percentage(value) -> str:
    """Format percentage"""
    v = float(value) if value is not None else 0.0
    return f"{v:.1f}%"


def calculate_variance(actual, budget) -> Dict[str, Any]:
    """Calculate variance metrics"""
    a = float(actual) if actual is not None else 0.0
    b = float(budget) if budget is not None else 0.0
    if b == 0:
        return {"variance": a, "variance_pct": 0, "achievement_pct": 0}
    
    variance = a - b
    variance_pct = ((a / b) - 1) * 100
    achievement_pct = (a / b) * 100
    
    return {
        "variance": variance,
        "variance_pct": round(variance_pct, 2),
        "achievement_pct": round(achievement_pct, 2)
    }


def get_risk_level(achievement_pct: float) -> str:
    """Determine risk level from achievement percentage"""
    if achievement_pct >= 90:
        return RiskLevel.LOW
    elif achievement_pct >= 80:
        return RiskLevel.MEDIUM
    elif achievement_pct >= 70:
        return RiskLevel.HIGH
    else:
        return RiskLevel.CRITICAL


async def get_approved_company_ids(
    db: AsyncSession, 
    year: int, 
    month: Optional[int] = None,
    months: Optional[List[int]] = None
) -> List[str]:
    """Get company IDs with approved reports"""
    query = select(Report.company_id).where(
        and_(
            Report.year == year,
            Report.status == ReportStatus.APPROVED
        )
    )
    if month:
        query = query.where(Report.month == month)
    elif months:
        query = query.where(Report.month.in_(months))
    
    result = await db.execute(query)
    return list(set(row[0] for row in result.all()))


async def get_financials_for_period(
    db: AsyncSession,
    year: int,
    months: List[int],
    scenario: Scenario,
    company_ids: Optional[List[str]] = None
) -> List[FinancialMonthly]:
    """Get financial records for a period"""
    query = select(FinancialMonthly).where(
        and_(
            FinancialMonthly.year == year,
            FinancialMonthly.month.in_(months),
            FinancialMonthly.scenario == scenario
        )
    )
    if company_ids is not None:
        if len(company_ids) == 0:
            return []
        query = query.where(FinancialMonthly.company_id.in_(company_ids))
    
    result = await db.execute(query)
    return result.scalars().all()


def aggregate_financials(records: List[FinancialMonthly]) -> Dict[str, float]:
    """Aggregate financial records"""
    if not records:
        return {
            "revenue": 0, "gp": 0, "other_income": 0,
            "personal_exp": 0, "admin_exp": 0, "selling_exp": 0,
            "finance_exp": 0, "depreciation": 0, "provisions": 0,
            "exchange_gl": 0, "non_ops_exp": 0, "non_ops_income": 0,
            "total_overhead": 0, "pbt": 0, "exchange_rate": 1, "count": 0
        }
    
    agg = {
        "revenue": float(sum(float(r.revenue_lkr or 0) for r in records)),
        "gp": float(sum(float(r.gp or 0) for r in records)),
        "other_income": float(sum(float(r.other_income or 0) for r in records)),
        "personal_exp": float(sum(float(r.personal_exp or 0) for r in records)),
        "admin_exp": float(sum(float(r.admin_exp or 0) for r in records)),
        "selling_exp": float(sum(float(r.selling_exp or 0) for r in records)),
        "finance_exp": float(sum(float(r.finance_exp or 0) for r in records)),
        "depreciation": float(sum(float(r.depreciation or 0) for r in records)),
        "provisions": float(sum(float(r.provisions or 0) for r in records)),
        "exchange_gl": float(sum(float(r.exchange_gl or 0) for r in records)),
        "non_ops_exp": float(sum(float(r.non_ops_exp or 0) for r in records)),
        "non_ops_income": float(sum(float(r.non_ops_income or 0) for r in records)),
        "exchange_rate": float(sum(float(r.exchange_rate or 1) for r in records)) / len(records),
        "count": len(records)
    }
    
    agg["total_overhead"] = (
        agg["personal_exp"] + agg["admin_exp"] + agg["selling_exp"] +
        agg["finance_exp"] + agg["depreciation"]
    )
    agg["pbt"] = (
        agg["gp"] + agg["other_income"] - agg["total_overhead"] +
        agg["provisions"] + agg["exchange_gl"]
    )
    
    return agg


def get_ytd_months(year: int, current_month: int, fy_start_month: int = 1) -> List[int]:
    """Get YTD months based on fiscal year start"""
    if fy_start_month == 1:
        # Calendar year
        return list(range(1, current_month + 1))
    else:
        # Fiscal year (e.g., April start)
        if current_month >= fy_start_month:
            # Same calendar year
            return list(range(fy_start_month, current_month + 1))
        else:
            # Spans two calendar years
            return list(range(fy_start_month, 13)) + list(range(1, current_month + 1))


# ============ ENDPOINTS ============

@router.get("/strategic-overview", response_model=StrategicOverview)
async def get_strategic_overview(
    mode: ViewMode = Query(default=ViewMode.MONTH),
    year: Optional[int] = None,
    month: Optional[int] = Query(default=None, ge=1, le=12),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    MD Group Strategic Overview.
    
    - Month mode: Single month actual vs budget
    - YTD mode: Fiscal year to date aggregates
    
    Only includes approved actuals.
    """
    if not has_permission(user, Permission.VIEW_ANALYTICS):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    now = datetime.utcnow()
    year = year or now.year
    month = month or now.month
    fy_start_month = 1  # Could be made company-specific
    
    # Determine months to include
    if mode == ViewMode.MONTH:
        months = [month]
        period = f"{MONTH_NAMES[month]} {year}"
    else:
        months = get_ytd_months(year, month, fy_start_month)
        period = f"YTD {year} ({SHORT_MONTH_NAMES[months[0]]}-{SHORT_MONTH_NAMES[months[-1]]})"
    
    # Get approved company IDs (for informational count only)
    approved_ids = await get_approved_company_ids(db, year, months=months)
    
    # Get actual and budget data – MD sees ALL companies, not just approved
    actual_records = await get_financials_for_period(
        db, year, months, Scenario.ACTUAL, None
    )
    budget_records = await get_financials_for_period(
        db, year, months, Scenario.BUDGET, None
    )
    
    # Get prior year data for comparison
    prior_year = year - 1
    prior_actual_records = await get_financials_for_period(
        db, prior_year, months, Scenario.ACTUAL, None
    )
    prior_agg = aggregate_financials(prior_actual_records)
    prior_gp_margin = (prior_agg["gp"] / prior_agg["revenue"] * 100) if prior_agg["revenue"] > 0 else 0
    
    # Aggregate
    actual_agg = aggregate_financials(actual_records)
    budget_agg = aggregate_financials(budget_records)
    
    # Calculate metrics
    def make_metric(name: str, actual: float, budget: float, higher_is_better: bool = True,
                    prior_year_val: Optional[float] = None) -> StrategicMetric:
        var = calculate_variance(actual, budget)
        is_favorable = var["variance"] >= 0 if higher_is_better else var["variance"] <= 0
        
        # Formatting
        if "margin" in name.lower() or "achievement" in name.lower():
            fmt_actual = format_percentage(actual)
            fmt_budget = format_percentage(budget) if budget else None
        else:
            fmt_actual = format_currency(actual)
            fmt_budget = format_currency(budget) if budget else None
        
        # Prior year variance
        py_var_pct = None
        if prior_year_val is not None and prior_year_val != 0:
            py_var_pct = round(((actual - prior_year_val) / abs(prior_year_val)) * 100, 1)
        
        return StrategicMetric(
            name=name,
            actual=actual,
            budget=budget if budget else None,
            variance=var["variance"] if budget else None,
            variance_pct=var["variance_pct"] if budget else None,
            achievement_pct=var["achievement_pct"] if budget else None,
            is_favorable=is_favorable,
            formatted_actual=fmt_actual,
            formatted_budget=fmt_budget,
            prior_year=prior_year_val,
            prior_year_variance_pct=py_var_pct
        )
    
    # GP Margin calculation
    actual_gp_margin = (actual_agg["gp"] / actual_agg["revenue"] * 100) if actual_agg["revenue"] > 0 else 0
    budget_gp_margin = (budget_agg["gp"] / budget_agg["revenue"] * 100) if budget_agg["revenue"] > 0 else 0
    
    # PBT Achievement
    pbt_achievement = calculate_variance(actual_agg["pbt"], budget_agg["pbt"])
    
    # Company counts
    companies_result = await db.execute(
        select(func.count(Company.id)).where(Company.is_active == True)
    )
    companies_total = companies_result.scalar() or 0
    companies_approved = len(approved_ids)
    
    reporting_result = await db.execute(
        select(func.count(func.distinct(Report.company_id))).where(
            and_(
                Report.year == year,
                Report.month.in_(months) if len(months) > 1 else Report.month == month,
                Report.status.in_([ReportStatus.SUBMITTED, ReportStatus.APPROVED])
            )
        )
    )
    companies_reporting = reporting_result.scalar() or 0
    
    return StrategicOverview(
        mode=mode.value,
        period=period,
        year=year,
        month=month if mode == ViewMode.MONTH else None,
        fy_start_month=fy_start_month,
        revenue=make_metric("Revenue", actual_agg["revenue"], budget_agg["revenue"],
                            prior_year_val=prior_agg["revenue"]),
        gp=make_metric("Gross Profit", actual_agg["gp"], budget_agg["gp"],
                        prior_year_val=prior_agg["gp"]),
        gp_margin=make_metric("GP Margin", actual_gp_margin, budget_gp_margin,
                              prior_year_val=prior_gp_margin),
        total_overhead=make_metric("Total Overhead", actual_agg["total_overhead"], budget_agg["total_overhead"],
                                   higher_is_better=False, prior_year_val=prior_agg["total_overhead"]),
        pbt=make_metric("PBT", actual_agg["pbt"], budget_agg["pbt"],
                        prior_year_val=prior_agg["pbt"]),
        pbt_achievement=make_metric(
            "PBT Achievement",
            pbt_achievement["achievement_pct"],
            100.0  # Target is 100%
        ),
        avg_exchange_rate=round(actual_agg["exchange_rate"], 2),
        companies_total=companies_total,
        companies_reporting=companies_reporting,
        companies_approved=companies_approved
    )


@router.get("/performers", response_model=PerformersResponse)
async def get_performers(
    mode: ViewMode = Query(default=ViewMode.MONTH),
    year: Optional[int] = None,
    month: Optional[int] = Query(default=None, ge=1, le=12),
    top_n: int = Query(default=5, ge=1, le=20),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Top and Bottom performers by PBT achievement.
    
    - Month: Top 5 + Bottom 5 by PBT achievement %
    - YTD: Same, with optional segment breakdown
    """
    if not has_permission(user, Permission.VIEW_ANALYTICS):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    now = datetime.utcnow()
    year = year or now.year
    month = month or now.month
    
    if mode == ViewMode.MONTH:
        months = [month]
        period = f"{MONTH_NAMES[month]} {year}"
    else:
        months = get_ytd_months(year, month, 1)
        period = f"YTD {year}"
    
    # Get financials per company – MD sees ALL companies
    actual_records = await get_financials_for_period(
        db, year, months, Scenario.ACTUAL, None
    )
    budget_records = await get_financials_for_period(
        db, year, months, Scenario.BUDGET, None
    )
    
    if not actual_records:
        return PerformersResponse(
            mode=mode.value,
            period=period,
            top_performers=[],
            bottom_performers=[]
        )
    
    # Group by company
    company_data: Dict[str, Dict[str, float]] = {}
    
    for record in actual_records:
        cid = record.company_id
        if cid not in company_data:
            company_data[cid] = {"actual_pbt": 0, "budget_pbt": 0}
        
        # Calculate PBT for this record
        overhead = _f(record.personal_exp) + _f(record.admin_exp) + \
                   _f(record.selling_exp) + _f(record.finance_exp) + _f(record.depreciation)
        pbt = _f(record.gp) + _f(record.other_income) - overhead + \
              _f(record.provisions) + _f(record.exchange_gl)
        
        company_data[cid]["actual_pbt"] += pbt
    
    for record in budget_records:
        cid = record.company_id
        if cid not in company_data:
            company_data[cid] = {"actual_pbt": 0.0, "budget_pbt": 0.0}
        
        overhead = _f(record.personal_exp) + _f(record.admin_exp) + \
                   _f(record.selling_exp) + _f(record.finance_exp) + _f(record.depreciation)
        pbt = _f(record.gp) + _f(record.other_income) - overhead + \
              _f(record.provisions) + _f(record.exchange_gl)
        
        company_data[cid]["budget_pbt"] += pbt
    
    # Calculate achievement and build entries
    entries = []
    for cid, data in company_data.items():
        if data["budget_pbt"] == 0:
            continue
        
        achievement = (data["actual_pbt"] / data["budget_pbt"]) * 100
        variance = data["actual_pbt"] - data["budget_pbt"]
        
        # Get company info
        company_result = await db.execute(
            select(Company).where(Company.id == cid)
        )
        company = company_result.scalar_one_or_none()
        if not company:
            continue
        
        # Get cluster
        cluster_result = await db.execute(
            select(Cluster).where(Cluster.id == company.cluster_id)
        )
        cluster = cluster_result.scalar_one_or_none()
        
        entries.append({
            "company_id": str(cid),
            "company_name": company.name,
            "company_code": company.code,
            "cluster_name": cluster.name if cluster else "Unknown",
            "pbt_actual": data["actual_pbt"],
            "pbt_budget": data["budget_pbt"],
            "achievement_pct": achievement,
            "variance": variance,
            "fiscal_cycle": "Jan-Dec" if (company.fin_year_start_month or 1) == 1 else "Apr-Mar"
        })
    
    # Sort by achievement
    entries.sort(key=lambda x: x["achievement_pct"], reverse=True)
    
    # Build response
    def build_performer(data: Dict, rank: int) -> PerformerEntry:
        return PerformerEntry(
            rank=rank,
            company_id=data["company_id"],
            company_name=data["company_name"],
            company_code=data["company_code"],
            cluster_name=data["cluster_name"],
            pbt_actual=data["pbt_actual"],
            pbt_budget=data["pbt_budget"],
            achievement_pct=round(data["achievement_pct"], 1),
            variance=data["variance"],
            formatted_pbt=format_currency(data["pbt_actual"]),
            fiscal_cycle=data.get("fiscal_cycle")
        )
    
    top_performers = [build_performer(e, i+1) for i, e in enumerate(entries[:top_n])]
    bottom_performers = [build_performer(e, i+1) for i, e in enumerate(entries[-top_n:][::-1])]
    
    return PerformersResponse(
        mode=mode.value,
        period=period,
        top_performers=top_performers,
        bottom_performers=bottom_performers
    )


@router.get("/cluster-contribution", response_model=ContributionResponse)
async def get_cluster_contribution(
    mode: ViewMode = Query(default=ViewMode.MONTH),
    year: Optional[int] = None,
    month: Optional[int] = Query(default=None, ge=1, le=12),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Cluster contribution analysis - revenue, GP, PBT contribution percentages"""
    if not has_permission(user, Permission.VIEW_ANALYTICS):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    now = datetime.utcnow()
    year = year or now.year
    month = month or now.month
    
    if mode == ViewMode.MONTH:
        months = [month]
        period = f"{MONTH_NAMES[month]} {year}"
    else:
        months = get_ytd_months(year, month, 1)
        period = f"YTD {year}"
    
    # Get actual records – MD sees ALL companies
    actual_records = await get_financials_for_period(
        db, year, months, Scenario.ACTUAL, None
    )
    budget_records = await get_financials_for_period(
        db, year, months, Scenario.BUDGET, None
    )
    
    # Get clusters
    clusters_result = await db.execute(
        select(Cluster).where(Cluster.is_active == True).order_by(Cluster.name)
    )
    clusters = clusters_result.scalars().all()
    
    # Get companies
    companies_result = await db.execute(
        select(Company).where(Company.is_active == True)
    )
    companies = companies_result.scalars().all()
    company_cluster_map = {c.id: c.cluster_id for c in companies}
    
    # Aggregate by cluster
    cluster_actuals: Dict[str, Dict[str, float]] = {}
    cluster_budgets: Dict[str, Dict[str, float]] = {}
    
    for record in actual_records:
        cluster_id = company_cluster_map.get(record.company_id)
        if not cluster_id:
            continue
        
        if cluster_id not in cluster_actuals:
            cluster_actuals[cluster_id] = {"revenue": 0, "gp": 0, "pbt": 0, "count": 0}
        
        overhead = _f(record.personal_exp) + _f(record.admin_exp) + \
                   _f(record.selling_exp) + _f(record.finance_exp) + _f(record.depreciation)
        pbt = _f(record.gp) + _f(record.other_income) - overhead + \
              _f(record.provisions) + _f(record.exchange_gl)
        
        cluster_actuals[cluster_id]["revenue"] += _f(record.revenue_lkr)
        cluster_actuals[cluster_id]["gp"] += _f(record.gp)
        cluster_actuals[cluster_id]["pbt"] += pbt
        cluster_actuals[cluster_id]["count"] += 1
    
    for record in budget_records:
        cluster_id = company_cluster_map.get(record.company_id)
        if not cluster_id:
            continue
        
        if cluster_id not in cluster_budgets:
            cluster_budgets[cluster_id] = {"pbt": 0.0}
        
        overhead = _f(record.personal_exp) + _f(record.admin_exp) + \
                   _f(record.selling_exp) + _f(record.finance_exp) + _f(record.depreciation)
        pbt = _f(record.gp) + _f(record.other_income) - overhead + \
              _f(record.provisions) + _f(record.exchange_gl)
        
        cluster_budgets[cluster_id]["pbt"] += pbt
    
    # Calculate totals
    total_revenue = sum(d["revenue"] for d in cluster_actuals.values())
    total_gp = sum(d["gp"] for d in cluster_actuals.values())
    total_pbt = sum(d["pbt"] for d in cluster_actuals.values())
    
    # Build response
    contributions = []
    for cluster in clusters:
        cluster_data = cluster_actuals.get(cluster.id, {"revenue": 0, "gp": 0, "pbt": 0, "count": 0})
        budget_data = cluster_budgets.get(cluster.id, {"pbt": 0})
        
        cluster_companies = [c for c in companies if c.cluster_id == cluster.id]
        
        contributions.append(ClusterContribution(
            cluster_id=str(cluster.id),
            cluster_name=cluster.name,
            cluster_code=cluster.code,
            company_count=len(cluster_companies),
            companies_reporting=cluster_data["count"],
            revenue=cluster_data["revenue"],
            gp=cluster_data["gp"],
            pbt=cluster_data["pbt"],
            revenue_contribution_pct=round((cluster_data["revenue"] / total_revenue * 100) if total_revenue > 0 else 0, 1),
            gp_contribution_pct=round((cluster_data["gp"] / total_gp * 100) if total_gp > 0 else 0, 1),
            pbt_contribution_pct=round((cluster_data["pbt"] / total_pbt * 100) if total_pbt > 0 else 0, 1),
            pbt_budget=budget_data["pbt"],
            pbt_achievement_pct=round((cluster_data["pbt"] / budget_data["pbt"] * 100) if budget_data["pbt"] > 0 else 0, 1)
        ))
    
    return ContributionResponse(
        mode=mode.value,
        period=period,
        total_revenue=total_revenue,
        total_gp=total_gp,
        total_pbt=total_pbt,
        clusters=contributions
    )


@router.get("/risk-radar", response_model=RiskRadarResponse)
async def get_risk_radar(
    mode: ViewMode = Query(default=ViewMode.MONTH),
    year: Optional[int] = None,
    month: Optional[int] = Query(default=None, ge=1, le=12),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Risk radar showing clusters by variance thresholds"""
    if not has_permission(user, Permission.VIEW_ANALYTICS):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    now = datetime.utcnow()
    year = year or now.year
    month = month or now.month
    
    if mode == ViewMode.MONTH:
        months = [month]
        period = f"{MONTH_NAMES[month]} {year}"
    else:
        months = get_ytd_months(year, month, 1)
        period = f"YTD {year}"
    
    # Get records – MD sees ALL companies
    actual_records = await get_financials_for_period(
        db, year, months, Scenario.ACTUAL, None
    )
    budget_records = await get_financials_for_period(
        db, year, months, Scenario.BUDGET, None
    )
    
    # Get clusters and companies
    clusters_result = await db.execute(
        select(Cluster).where(Cluster.is_active == True)
    )
    clusters = clusters_result.scalars().all()
    
    companies_result = await db.execute(
        select(Company).where(Company.is_active == True)
    )
    companies = companies_result.scalars().all()
    company_cluster_map = {c.id: c.cluster_id for c in companies}
    
    # Group records by company
    company_actuals: Dict[str, Dict[str, float]] = {}
    company_budgets: Dict[str, Dict[str, float]] = {}
    
    for r in actual_records:
        if r.company_id not in company_actuals:
            company_actuals[r.company_id] = {"revenue": 0.0, "gp": 0.0, "pbt": 0.0}
        overhead = _f(r.personal_exp) + _f(r.admin_exp) + _f(r.selling_exp) + \
                   _f(r.finance_exp) + _f(r.depreciation)
        pbt = _f(r.gp) + _f(r.other_income) - overhead + _f(r.provisions) + _f(r.exchange_gl)
        
        company_actuals[r.company_id]["revenue"] += _f(r.revenue_lkr)
        company_actuals[r.company_id]["gp"] += _f(r.gp)
        company_actuals[r.company_id]["pbt"] += pbt
    
    for r in budget_records:
        if r.company_id not in company_budgets:
            company_budgets[r.company_id] = {"revenue": 0.0, "gp": 0.0, "pbt": 0.0}
        overhead = _f(r.personal_exp) + _f(r.admin_exp) + _f(r.selling_exp) + \
                   _f(r.finance_exp) + _f(r.depreciation)
        pbt = _f(r.gp) + _f(r.other_income) - overhead + _f(r.provisions) + _f(r.exchange_gl)
        
        company_budgets[r.company_id]["revenue"] += _f(r.revenue_lkr)
        company_budgets[r.company_id]["gp"] += _f(r.gp)
        company_budgets[r.company_id]["pbt"] += pbt
    
    # Assess risk per cluster
    cluster_risks = []
    overall_risk_scores = []
    
    for cluster in clusters:
        cluster_companies = [c for c in companies if c.cluster_id == cluster.id]
        risk_factors = []
        
        # Aggregate cluster financials
        cluster_actual = {"revenue": 0, "gp": 0, "pbt": 0}
        cluster_budget = {"revenue": 0, "gp": 0, "pbt": 0}
        companies_below_target = 0
        
        for c in cluster_companies:
            if c.id in company_actuals:
                cluster_actual["revenue"] += company_actuals[c.id]["revenue"]
                cluster_actual["gp"] += company_actuals[c.id]["gp"]
                cluster_actual["pbt"] += company_actuals[c.id]["pbt"]
            if c.id in company_budgets:
                cluster_budget["revenue"] += company_budgets[c.id]["revenue"]
                cluster_budget["gp"] += company_budgets[c.id]["gp"]
                cluster_budget["pbt"] += company_budgets[c.id]["pbt"]
            
            # Check if company is below target
            if c.id in company_actuals and c.id in company_budgets:
                if company_budgets[c.id]["pbt"] > 0:
                    achievement = company_actuals[c.id]["pbt"] / company_budgets[c.id]["pbt"] * 100
                    if achievement < 90:
                        companies_below_target += 1
        
        # Calculate variances
        rev_var = ((cluster_actual["revenue"] / cluster_budget["revenue"]) - 1) * 100 if cluster_budget["revenue"] > 0 else 0
        
        actual_gp_margin = cluster_actual["gp"] / cluster_actual["revenue"] * 100 if cluster_actual["revenue"] > 0 else 0
        budget_gp_margin = cluster_budget["gp"] / cluster_budget["revenue"] * 100 if cluster_budget["revenue"] > 0 else 0
        gp_margin_var = actual_gp_margin - budget_gp_margin
        
        pbt_achievement = (cluster_actual["pbt"] / cluster_budget["pbt"] * 100) if cluster_budget["pbt"] > 0 else 0
        pbt_var = pbt_achievement - 100
        
        # Determine risk level
        risk_level = get_risk_level(pbt_achievement)
        overall_risk_scores.append(pbt_achievement)
        
        # Identify risk factors
        if rev_var < -10:
            risk_factors.append(f"Revenue shortfall ({rev_var:.1f}%)")
        if gp_margin_var < -2:
            risk_factors.append(f"GP margin compression ({gp_margin_var:.1f}pp)")
        if companies_below_target > 0:
            risk_factors.append(f"{companies_below_target} company(ies) below target")
        if pbt_var < -20:
            risk_factors.append(f"Significant PBT shortfall ({pbt_var:.1f}%)")
        
        if not risk_factors:
            risk_factors.append("On track")
        
        cluster_risks.append(ClusterRisk(
            cluster_id=str(cluster.id),
            cluster_name=cluster.name,
            cluster_code=cluster.code,
            risk_level=risk_level,
            risk_factors=risk_factors,
            revenue_variance_pct=round(rev_var, 1),
            gp_margin_variance=round(gp_margin_var, 1),
            pbt_variance_pct=round(pbt_var, 1),
            companies_below_target=companies_below_target,
            companies_total=len(cluster_companies)
        ))
    
    # Overall risk
    avg_achievement = sum(overall_risk_scores) / len(overall_risk_scores) if overall_risk_scores else 0
    overall_risk = get_risk_level(avg_achievement)
    
    return RiskRadarResponse(
        mode=mode.value,
        period=period,
        overall_risk=overall_risk,
        clusters=cluster_risks,
        risk_thresholds={"low": 90, "medium": 80, "high": 70, "critical": 70}
    )


@router.get("/drilldown/cluster/{cluster_id}", response_model=ClusterDrilldownResponse)
async def get_cluster_drilldown(
    cluster_id: str,
    mode: ViewMode = Query(default=ViewMode.MONTH),
    year: Optional[int] = None,
    month: Optional[int] = Query(default=None, ge=1, le=12),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Cluster to company drilldown with full financials"""
    if not has_permission(user, Permission.VIEW_ANALYTICS):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    now = datetime.utcnow()
    year = year or now.year
    month = month or now.month
    
    if mode == ViewMode.MONTH:
        months = [month]
        period = f"{MONTH_NAMES[month]} {year}"
    else:
        months = get_ytd_months(year, month, 1)
        period = f"YTD {year}"
    
    # Get cluster
    cluster_result = await db.execute(
        select(Cluster).where(Cluster.id == cluster_id)
    )
    cluster = cluster_result.scalar_one_or_none()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    # Get companies in cluster
    companies_result = await db.execute(
        select(Company).where(
            and_(Company.cluster_id == cluster_id, Company.is_active == True)
        ).order_by(Company.name)
    )
    companies = companies_result.scalars().all()
    
    # Get approved IDs
    approved_ids = await get_approved_company_ids(db, year, months=months)
    
    # Get financials
    company_ids = [c.id for c in companies]
    actual_records = await get_financials_for_period(
        db, year, months, Scenario.ACTUAL, company_ids
    )
    budget_records = await get_financials_for_period(
        db, year, months, Scenario.BUDGET, company_ids
    )
    
    # Group by company
    actuals_by_company: Dict[str, List[FinancialMonthly]] = {}
    budgets_by_company: Dict[str, List[FinancialMonthly]] = {}
    
    for r in actual_records:
        if r.company_id not in actuals_by_company:
            actuals_by_company[r.company_id] = []
        actuals_by_company[r.company_id].append(r)
    
    for r in budget_records:
        if r.company_id not in budgets_by_company:
            budgets_by_company[r.company_id] = []
        budgets_by_company[r.company_id].append(r)
    
    # Get report statuses
    report_statuses = {}
    for m in months:
        reports_result = await db.execute(
            select(Report).where(
                and_(
                    Report.company_id.in_(company_ids),
                    Report.year == year,
                    Report.month == m
                )
            )
        )
        for report in reports_result.scalars().all():
            report_statuses[report.company_id] = report.status.value
    
    # Build company drilldowns
    company_drilldowns = []
    cluster_totals = {"revenue": 0, "gp": 0, "pbt": 0, "budget_pbt": 0}
    
    for company in companies:
        actual_agg = aggregate_financials(actuals_by_company.get(company.id, []))
        budget_agg = aggregate_financials(budgets_by_company.get(company.id, []))
        
        actual_gp_margin = (actual_agg["gp"] / actual_agg["revenue"] * 100) if actual_agg["revenue"] > 0 else 0
        budget_gp_margin = (budget_agg["gp"] / budget_agg["revenue"] * 100) if budget_agg["revenue"] > 0 else 0
        
        rev_var = ((actual_agg["revenue"] / budget_agg["revenue"]) - 1) * 100 if budget_agg["revenue"] > 0 else 0
        pbt_var = ((actual_agg["pbt"] / budget_agg["pbt"]) - 1) * 100 if budget_agg["pbt"] > 0 else 0
        pbt_achievement = (actual_agg["pbt"] / budget_agg["pbt"] * 100) if budget_agg["pbt"] > 0 else 0
        
        report_status = report_statuses.get(company.id)
        is_approved = company.id in approved_ids
        
        company_drilldowns.append(CompanyDrilldown(
            id=str(company.id),
            name=company.name,
            code=company.code,
            revenue_actual=actual_agg["revenue"],
            revenue_budget=budget_agg["revenue"],
            gp_actual=actual_agg["gp"],
            gp_budget=budget_agg["gp"],
            gp_margin_actual=round(actual_gp_margin, 1),
            gp_margin_budget=round(budget_gp_margin, 1),
            pbt_actual=actual_agg["pbt"],
            pbt_budget=budget_agg["pbt"],
            revenue_variance_pct=round(rev_var, 1),
            pbt_variance_pct=round(pbt_var, 1),
            pbt_achievement_pct=round(pbt_achievement, 1),
            report_status=report_status,
            is_approved=is_approved
        ))
        
        if is_approved:
            cluster_totals["revenue"] += actual_agg["revenue"]
            cluster_totals["gp"] += actual_agg["gp"]
            cluster_totals["pbt"] += actual_agg["pbt"]
            cluster_totals["budget_pbt"] += budget_agg["pbt"]
    
    avg_gp_margin = (cluster_totals["gp"] / cluster_totals["revenue"] * 100) if cluster_totals["revenue"] > 0 else 0
    pbt_achievement = (cluster_totals["pbt"] / cluster_totals["budget_pbt"] * 100) if cluster_totals["budget_pbt"] > 0 else 0
    
    return ClusterDrilldownResponse(
        mode=mode.value,
        period=period,
        cluster_id=str(cluster.id),
        cluster_name=cluster.name,
        cluster_code=cluster.code,
        total_revenue=cluster_totals["revenue"],
        total_gp=cluster_totals["gp"],
        total_pbt=cluster_totals["pbt"],
        avg_gp_margin=round(avg_gp_margin, 1),
        pbt_achievement_pct=round(pbt_achievement, 1),
        companies=company_drilldowns
    )


@router.get("/pbt-trend", response_model=PBTTrendResponse)
async def get_pbt_trend(
    company_id: Optional[str] = None,
    cluster_id: Optional[str] = None,
    start_year: int = Query(default=2020),
    end_year: Optional[int] = None,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    PBT trend from 2020 to current for horizontal scroll UI.
    Can be filtered by company or cluster.
    """
    if not has_permission(user, Permission.VIEW_ANALYTICS):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    now = datetime.utcnow()
    end_year = end_year or now.year
    
    # Build query for actuals
    query = select(FinancialMonthly).where(
        and_(
            FinancialMonthly.year >= start_year,
            FinancialMonthly.year <= end_year,
            FinancialMonthly.scenario == Scenario.ACTUAL
        )
    ).order_by(FinancialMonthly.year, FinancialMonthly.month)
    
    budget_query = select(FinancialMonthly).where(
        and_(
            FinancialMonthly.year >= start_year,
            FinancialMonthly.year <= end_year,
            FinancialMonthly.scenario == Scenario.BUDGET
        )
    )
    
    company_name = None
    cluster_name = None
    
    if company_id:
        query = query.where(FinancialMonthly.company_id == company_id)
        budget_query = budget_query.where(FinancialMonthly.company_id == company_id)
        company_result = await db.execute(select(Company).where(Company.id == company_id))
        company = company_result.scalar_one_or_none()
        company_name = company.name if company else None
    elif cluster_id:
        # Get companies in cluster
        companies_result = await db.execute(
            select(Company.id).where(Company.cluster_id == cluster_id)
        )
        company_ids = [row[0] for row in companies_result.all()]
        if company_ids:
            query = query.where(FinancialMonthly.company_id.in_(company_ids))
            budget_query = budget_query.where(FinancialMonthly.company_id.in_(company_ids))
        
        cluster_result = await db.execute(select(Cluster).where(Cluster.id == cluster_id))
        cluster = cluster_result.scalar_one_or_none()
        cluster_name = cluster.name if cluster else None
    
    actual_result = await db.execute(query)
    actual_records = actual_result.scalars().all()
    
    budget_result = await db.execute(budget_query)
    budget_records = budget_result.scalars().all()
    
    # Group by year-month
    actuals_by_period: Dict[str, List[FinancialMonthly]] = {}
    budgets_by_period: Dict[str, float] = {}
    
    for r in actual_records:
        key = f"{r.year}-{r.month:02d}"
        if key not in actuals_by_period:
            actuals_by_period[key] = []
        actuals_by_period[key].append(r)
    
    for r in budget_records:
        key = f"{r.year}-{r.month:02d}"
        overhead = _f(r.personal_exp) + _f(r.admin_exp) + _f(r.selling_exp) + \
                   _f(r.finance_exp) + _f(r.depreciation)
        pbt = _f(r.gp) + _f(r.other_income) - overhead + _f(r.provisions) + _f(r.exchange_gl)
        
        if key not in budgets_by_period:
            budgets_by_period[key] = 0.0
        budgets_by_period[key] += pbt
    
    # Build data points
    data_points = []
    for period_key in sorted(actuals_by_period.keys()):
        records = actuals_by_period[period_key]
        year_val = int(period_key.split("-")[0])
        month_val = int(period_key.split("-")[1])
        
        # Calculate PBT
        total_pbt = 0
        for r in records:
            overhead = _f(r.personal_exp) + _f(r.admin_exp) + _f(r.selling_exp) + \
                       _f(r.finance_exp) + _f(r.depreciation)
            pbt = _f(r.gp) + _f(r.other_income) - overhead + _f(r.provisions) + _f(r.exchange_gl)
            total_pbt += pbt
        
        budget_pbt = budgets_by_period.get(period_key)
        achievement = (total_pbt / budget_pbt * 100) if budget_pbt and budget_pbt > 0 else None
        
        data_points.append(TrendDataPoint(
            year=year_val,
            month=month_val,
            period_label=f"{SHORT_MONTH_NAMES[month_val]} {year_val}",
            pbt_actual=total_pbt,
            pbt_budget=budget_pbt,
            achievement_pct=round(achievement, 1) if achievement else None
        ))
    
    return PBTTrendResponse(
        company_id=company_id,
        company_name=company_name,
        cluster_id=cluster_id,
        cluster_name=cluster_name,
        start_year=start_year,
        end_year=end_year,
        data=data_points
    )


@router.get("/performance-hierarchy", response_model=PerformanceHierarchyResponse)
async def get_performance_hierarchy(
    year: Optional[int] = None,
    month: Optional[int] = Query(default=None, ge=1, le=12),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Performance hierarchy with month/year selector.
    Shows Group → Clusters → Companies with PBT achievement.
    """
    if not has_permission(user, Permission.VIEW_ANALYTICS):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    now = datetime.utcnow()
    year = year or now.year
    month = month or now.month
    period = f"{MONTH_NAMES[month]} {year}"
    
    # Get clusters
    clusters_result = await db.execute(
        select(Cluster).where(Cluster.is_active == True).order_by(Cluster.name)
    )
    clusters = clusters_result.scalars().all()
    
    # Get companies
    companies_result = await db.execute(
        select(Company).where(Company.is_active == True)
    )
    companies = companies_result.scalars().all()
    
    # Get MONTHLY financials – MD sees ALL companies
    actual_records = await get_financials_for_period(
        db, year, [month], Scenario.ACTUAL, None
    )
    budget_records = await get_financials_for_period(
        db, year, [month], Scenario.BUDGET, None
    )
    
    # Get YTD financials (Jan-current month for simplicity; per-company FY handled below)
    all_ytd_months = list(range(1, month + 1))
    ytd_actual_records = await get_financials_for_period(
        db, year, all_ytd_months, Scenario.ACTUAL, None
    )
    ytd_budget_records = await get_financials_for_period(
        db, year, all_ytd_months, Scenario.BUDGET, None
    )
    
    # Group MONTHLY by company
    actuals_by_company: Dict[str, Dict[str, float]] = {}
    budgets_by_company: Dict[str, Dict[str, float]] = {}
    
    for r in actual_records:
        if r.company_id not in actuals_by_company:
            actuals_by_company[r.company_id] = {"gp": 0.0, "pbt": 0.0, "revenue": 0.0}
        
        overhead = _f(r.personal_exp) + _f(r.admin_exp) + _f(r.selling_exp) + \
                   _f(r.finance_exp) + _f(r.depreciation)
        pbt = _f(r.gp) + _f(r.other_income) - overhead + _f(r.provisions) + _f(r.exchange_gl)
        
        actuals_by_company[r.company_id]["revenue"] += _f(r.revenue_lkr)
        actuals_by_company[r.company_id]["gp"] += _f(r.gp)
        actuals_by_company[r.company_id]["pbt"] += pbt
    
    for r in budget_records:
        if r.company_id not in budgets_by_company:
            budgets_by_company[r.company_id] = {"pbt": 0.0}
        
        overhead = _f(r.personal_exp) + _f(r.admin_exp) + _f(r.selling_exp) + \
                   _f(r.finance_exp) + _f(r.depreciation)
        pbt = _f(r.gp) + _f(r.other_income) - overhead + _f(r.provisions) + _f(r.exchange_gl)
        budgets_by_company[r.company_id]["pbt"] += pbt
    
    # Group YTD by company (filter to correct FY months per company)
    ytd_actuals_raw: Dict[str, List] = {}
    ytd_budgets_raw: Dict[str, List] = {}
    for r in ytd_actual_records:
        if r.company_id not in ytd_actuals_raw:
            ytd_actuals_raw[r.company_id] = []
        ytd_actuals_raw[r.company_id].append(r)
    for r in ytd_budget_records:
        if r.company_id not in ytd_budgets_raw:
            ytd_budgets_raw[r.company_id] = []
        ytd_budgets_raw[r.company_id].append(r)
    
    # Build company FY lookup
    company_fy: Dict[str, int] = {c.id: (c.fin_year_start_month or 1) for c in companies}
    
    def calc_ytd_pbt(records_list, fy_start, current_month):
        """Sum PBT only for months in the company's fiscal YTD"""
        fy_months = get_ytd_months(year, current_month, fy_start)
        total = 0
        for r in records_list:
            if r.month in fy_months:
                overhead = _f(r.personal_exp) + _f(r.admin_exp) + _f(r.selling_exp) + \
                           _f(r.finance_exp) + _f(r.depreciation)
                pbt = _f(r.gp) + _f(r.other_income) - overhead + _f(r.provisions) + _f(r.exchange_gl)
                total += pbt
        return total
    
    # Get report statuses
    reports_result = await db.execute(
        select(Report).where(
            and_(Report.year == year, Report.month == month)
        )
    )
    report_statuses = {r.company_id: r.status.value for r in reports_result.scalars().all()}
    
    # Build hierarchy
    hierarchy_clusters = []
    group_actual = 0
    group_budget = 0
    group_ytd_actual = 0
    group_ytd_budget = 0
    
    for cluster in clusters:
        cluster_companies = [c for c in companies if c.cluster_id == cluster.id]
        company_entries = []
        cluster_actual = 0
        cluster_budget = 0
        cluster_ytd_actual = 0
        cluster_ytd_budget = 0
        
        for company in cluster_companies:
            actual_data = actuals_by_company.get(company.id, {"gp": 0, "pbt": 0, "revenue": 0})
            budget_data = budgets_by_company.get(company.id, {"pbt": 0})
            
            achievement = (actual_data["pbt"] / budget_data["pbt"] * 100) if budget_data["pbt"] > 0 else 0
            gp_margin = (actual_data["gp"] / actual_data["revenue"] * 100) if actual_data["revenue"] > 0 else 0
            
            # YTD per company (respecting fiscal year)
            fy_start = company_fy.get(company.id, 1)
            ytd_actual_pbt = calc_ytd_pbt(ytd_actuals_raw.get(company.id, []), fy_start, month)
            ytd_budget_pbt = calc_ytd_pbt(ytd_budgets_raw.get(company.id, []), fy_start, month)
            ytd_achv = (ytd_actual_pbt / ytd_budget_pbt * 100) if ytd_budget_pbt > 0 else 0
            
            company_entries.append(HierarchyCompany(
                id=str(company.id),
                name=company.name,
                code=company.code,
                pbt_actual=actual_data["pbt"],
                pbt_budget=budget_data["pbt"],
                achievement_pct=round(achievement, 1),
                gp_margin=round(gp_margin, 1),
                report_status=report_statuses.get(company.id),
                ytd_pbt_actual=ytd_actual_pbt,
                ytd_pbt_budget=ytd_budget_pbt,
                ytd_achievement_pct=round(ytd_achv, 1),
                fiscal_year_start_month=fy_start
            ))
            
            cluster_actual += actual_data["pbt"]
            cluster_budget += budget_data["pbt"]
            cluster_ytd_actual += ytd_actual_pbt
            cluster_ytd_budget += ytd_budget_pbt
        
        cluster_achievement = (cluster_actual / cluster_budget * 100) if cluster_budget > 0 else 0
        cluster_ytd_achievement = (cluster_ytd_actual / cluster_ytd_budget * 100) if cluster_ytd_budget > 0 else 0
        
        hierarchy_clusters.append(HierarchyCluster(
            id=str(cluster.id),
            name=cluster.name,
            code=cluster.code,
            pbt_actual=cluster_actual,
            pbt_budget=cluster_budget,
            achievement_pct=round(cluster_achievement, 1),
            company_count=len(cluster_companies),
            companies=company_entries,
            ytd_pbt_actual=cluster_ytd_actual,
            ytd_pbt_budget=cluster_ytd_budget,
            ytd_achievement_pct=round(cluster_ytd_achievement, 1)
        ))
        
        group_actual += cluster_actual
        group_budget += cluster_budget
        group_ytd_actual += cluster_ytd_actual
        group_ytd_budget += cluster_ytd_budget
    
    group_achievement = (group_actual / group_budget * 100) if group_budget > 0 else 0
    group_ytd_achievement = (group_ytd_actual / group_ytd_budget * 100) if group_ytd_budget > 0 else 0
    
    return PerformanceHierarchyResponse(
        mode=ViewMode.MONTH.value,
        period=period,
        year=year,
        month=month,
        group_pbt_actual=group_actual,
        group_pbt_budget=group_budget,
        group_achievement_pct=round(group_achievement, 1),
        group_ytd_pbt_actual=group_ytd_actual,
        group_ytd_pbt_budget=group_ytd_budget,
        group_ytd_achievement_pct=round(group_ytd_achievement, 1),
        clusters=hierarchy_clusters
    )


@router.get("/company-detail", response_model=CompanyDetailResponse)
async def get_company_detail(
    company_id: str = Query(...),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Full company financial detail for popup modal.
    Returns monthly P&L + YTD P&L + FD comments + upload info.
    """
    if not has_permission(user, Permission.VIEW_ANALYTICS):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    from src.db.models import UserMaster, PeriodMaster, ReportComment
    
    # Get company
    company_result = await db.execute(
        select(Company).where(Company.id == company_id)
    )
    company = company_result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get cluster
    cluster_result = await db.execute(
        select(Cluster).where(Cluster.id == company.cluster_id)
    )
    cluster = cluster_result.scalar_one_or_none()
    
    fy_start = company.fin_year_start_month or 1
    
    # Monthly financials
    monthly_actual = await get_financials_for_period(db, year, [month], Scenario.ACTUAL, [company_id])
    monthly_budget = await get_financials_for_period(db, year, [month], Scenario.BUDGET, [company_id])
    
    # YTD financials
    ytd_months = get_ytd_months(year, month, fy_start)
    ytd_actual = await get_financials_for_period(db, year, ytd_months, Scenario.ACTUAL, [company_id])
    ytd_budget = await get_financials_for_period(db, year, ytd_months, Scenario.BUDGET, [company_id])
    
    def build_detail(records) -> CompanyDetailFinancials:
        agg = aggregate_financials(records)
        revenue = agg["revenue"]
        gp = agg["gp"]
        gp_margin = (gp / revenue * 100) if revenue > 0 else 0
        pbt_before = agg["pbt"]
        pbt_after = pbt_before + agg["non_ops_income"] - agg["non_ops_exp"]
        np_margin = (pbt_before / revenue * 100) if revenue > 0 else 0
        ebit = pbt_before + agg["finance_exp"]
        ebitda = ebit + agg["depreciation"]
        return CompanyDetailFinancials(
            revenue_lkr=revenue,
            gp=gp,
            gp_margin=round(gp_margin, 1),
            other_income=agg["other_income"],
            personal_exp=agg["personal_exp"],
            admin_exp=agg["admin_exp"],
            selling_exp=agg["selling_exp"],
            finance_exp=agg["finance_exp"],
            depreciation=agg["depreciation"],
            total_overhead=agg["total_overhead"],
            provisions=agg["provisions"],
            exchange_gl=agg["exchange_gl"],
            pbt_before_non_ops=pbt_before,
            pbt_after_non_ops=pbt_after,
            non_ops_exp=agg["non_ops_exp"],
            non_ops_income=agg["non_ops_income"],
            np_margin=round(np_margin, 1),
            ebit=ebit,
            ebitda=ebitda
        )
    
    monthly_detail = build_detail(monthly_actual)
    ytd_detail = build_detail(ytd_actual)
    
    # Budget PBT
    m_budget_agg = aggregate_financials(monthly_budget)
    y_budget_agg = aggregate_financials(ytd_budget)
    m_achv = (monthly_detail.pbt_before_non_ops / m_budget_agg["pbt"] * 100) if m_budget_agg["pbt"] != 0 else 0
    y_achv = (ytd_detail.pbt_before_non_ops / y_budget_agg["pbt"] * 100) if y_budget_agg["pbt"] != 0 else 0
    
    # YTD label
    fy_month_names = [SHORT_MONTH_NAMES[m] for m in ytd_months]
    ytd_label = f"{fy_month_names[0]}–{fy_month_names[-1]} {year}" if fy_month_names else f"YTD {year}"
    
    # Get report/workflow info
    period_result = await db.execute(
        select(PeriodMaster).where(
            and_(PeriodMaster.year == year, PeriodMaster.month == month)
        )
    )
    period_row = period_result.scalar_one_or_none()
    
    fd_comments_list = []
    uploaded_by = None
    uploaded_at = None
    report_status_str = None
    
    if period_row:
        from src.db.models import Report as ReportModel
        report_result = await db.execute(
            select(ReportModel).where(
                and_(
                    ReportModel.company_id == company_id,
                    ReportModel.period_id == period_row.period_id
                )
            )
        )
        report = report_result.scalar_one_or_none()
        
        if report:
            report_status_str = report.status.value if report.status else None
            
            # Submitted by user
            if report.submitted_by:
                user_result = await db.execute(
                    select(UserMaster).where(UserMaster.user_id == report.submitted_by)
                )
                fo_user = user_result.scalar_one_or_none()
                if fo_user:
                    uploaded_by = fo_user.name
                else:
                    uploaded_by = report.submitted_by
            
            if report.submitted_date:
                uploaded_at = report.submitted_date.strftime("%Y-%m-%d %H:%M")
            
            # FD review comments
            if report.actual_comment:
                fd_comments_list.append({
                    "id": "actual",
                    "type": "actual",
                    "author": "Finance Director",
                    "message": report.actual_comment,
                    "timestamp": report.approved_date.strftime("%b %d, %Y • %I:%M %p") if report.approved_date else None
                })
            if report.budget_comment:
                fd_comments_list.append({
                    "id": "budget",
                    "type": "budget",
                    "author": "Finance Director",
                    "message": report.budget_comment,
                    "timestamp": report.approved_date.strftime("%b %d, %Y • %I:%M %p") if report.approved_date else None
                })
        
        # Also check report_comments table
        try:
            comments_result = await db.execute(
                select(ReportComment).where(
                    and_(
                        ReportComment.report_company_id == company_id,
                        ReportComment.report_period_id == period_row.period_id
                    )
                ).order_by(ReportComment.created_at.desc())
            )
            for comment in comments_result.scalars().all():
                # Get author name
                author_name = "System"
                if comment.user_id and not comment.is_system:
                    au_result = await db.execute(
                        select(UserMaster).where(UserMaster.user_id == comment.user_id)
                    )
                    au = au_result.scalar_one_or_none()
                    if au:
                        author_name = au.name
                
                fd_comments_list.append({
                    "id": str(comment.id),
                    "type": "comment",
                    "author": author_name,
                    "message": comment.content,
                    "timestamp": comment.created_at.strftime("%b %d, %Y • %I:%M %p") if comment.created_at else None
                })
        except Exception:
            pass  # Table may not exist
    
    return CompanyDetailResponse(
        company_id=str(company.id),
        company_name=company.name,
        company_code=company.code,
        cluster_name=cluster.name if cluster else "Unknown",
        fiscal_year_start_month=fy_start,
        period=f"{MONTH_NAMES[month]} {year}",
        year=year,
        month=month,
        monthly=monthly_detail,
        ytd=ytd_detail,
        ytd_label=ytd_label,
        ytd_months=len(ytd_months),
        monthly_budget_pbt=m_budget_agg["pbt"],
        ytd_budget_pbt=y_budget_agg["pbt"],
        monthly_achievement_pct=round(m_achv, 1),
        ytd_achievement_pct=round(y_achv, 1),
        fd_comments=fd_comments_list,
        uploaded_by=uploaded_by,
        uploaded_at=uploaded_at,
        report_status=report_status_str
    )
