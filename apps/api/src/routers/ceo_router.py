"""
CEO/MD Dashboard Router
Read-only endpoints for executive-level analytics and reporting

Endpoints:
- GET /ceo/dashboard                     - Main dashboard summary
- GET /ceo/monthly/{year}/{month}        - Selected month P&L summary
- GET /ceo/ytd/{year}                    - YTD aggregates
- GET /ceo/clusters                      - Cluster-level summary
- GET /ceo/clusters/{cluster_id}         - Cluster drill-down
- GET /ceo/companies/{company_id}        - Company detail
- GET /ceo/rankings/{year}/{month}       - Performance rankings
- GET /ceo/trends                        - Historical trends
"""
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from src.db.models import (
    User, Company, Cluster, Report, ReportStatus,
    FinancialMonthly, Scenario
)
from src.security.middleware import (
    get_db, get_current_active_user, require_ceo
)
from src.security.permissions import has_permission, Permission

router = APIRouter(prefix="/ceo", tags=["CEO Dashboard"])


# ============ RESPONSE MODELS ============

class FinancialSummary(BaseModel):
    """Aggregated financial summary"""
    revenue_lkr: float
    revenue_usd: float
    gp: float
    gp_margin_pct: float
    total_overheads: float
    pbt_before: float
    pbt_after: float
    np_margin_pct: float
    ebit: float
    ebitda: float
    # Breakdown
    personal_exp: float
    admin_exp: float
    selling_exp: float
    finance_exp: float
    depreciation: float
    other_income: float
    provisions: float
    exchange_gl: float
    non_ops_exp: float
    non_ops_income: float


class BudgetComparison(BaseModel):
    """Actual vs Budget comparison"""
    actual: FinancialSummary
    budget: Optional[FinancialSummary]
    variance: Optional[Dict[str, Any]]
    achievement_pct: Optional[float]  # PBT Achievement %


class CompanySummary(BaseModel):
    """Company-level summary"""
    id: str
    name: str
    code: str
    cluster_id: str
    cluster_name: str
    currency: str
    financials: Optional[BudgetComparison]
    report_status: Optional[str]
    has_data: bool


class ClusterSummary(BaseModel):
    """Cluster-level summary"""
    id: str
    name: str
    code: str
    company_count: int
    companies_reporting: int
    financials: Optional[BudgetComparison]
    companies: Optional[List[CompanySummary]]


class CEODashboard(BaseModel):
    """Main CEO dashboard response"""
    period: str  # "January 2025" or "YTD 2025"
    year: int
    month: Optional[int]
    is_ytd: bool
    # Group-level aggregates
    group_summary: BudgetComparison
    # Cluster breakdown
    clusters: List[ClusterSummary]
    # KPIs
    total_companies: int
    companies_reporting: int
    companies_approved: int
    reporting_rate_pct: float
    # Exchange rate (avg)
    avg_exchange_rate: float


class RankingEntry(BaseModel):
    """Ranking entry for a company"""
    rank: int
    company_id: str
    company_name: str
    company_code: str
    cluster_name: str
    metric_value: float
    metric_formatted: str
    variance_pct: Optional[float]
    is_favorable: bool


class RankingsResponse(BaseModel):
    """Performance rankings"""
    period: str
    metric: str
    rankings: List[RankingEntry]


class TrendDataPoint(BaseModel):
    """Single trend data point"""
    year: int
    month: int
    period: str
    value: float


class TrendSeries(BaseModel):
    """Trend series for a metric"""
    metric: str
    data: List[TrendDataPoint]


class TrendsResponse(BaseModel):
    """Historical trends"""
    company_id: Optional[str]
    company_name: Optional[str]
    period_range: str
    series: List[TrendSeries]


# ============ HELPER FUNCTIONS ============

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]


def compute_financials(records: List[FinancialMonthly]) -> Optional[FinancialSummary]:
    """Aggregate financial records into summary"""
    if not records:
        return None
    
    # Sum all numeric fields
    total = {
        'revenue_lkr': 0.0,
        'gp': 0.0,
        'other_income': 0.0,
        'personal_exp': 0.0,
        'admin_exp': 0.0,
        'selling_exp': 0.0,
        'finance_exp': 0.0,
        'depreciation': 0.0,
        'provisions': 0.0,
        'exchange_gl': 0.0,
        'non_ops_exp': 0.0,
        'non_ops_income': 0.0,
        'exchange_rate_sum': 0.0,
        'count': 0
    }
    
    for r in records:
        total['revenue_lkr'] += r.revenue_lkr or 0
        total['gp'] += r.gp or 0
        total['other_income'] += r.other_income or 0
        total['personal_exp'] += r.personal_exp or 0
        total['admin_exp'] += r.admin_exp or 0
        total['selling_exp'] += r.selling_exp or 0
        total['finance_exp'] += r.finance_exp or 0
        total['depreciation'] += r.depreciation or 0
        total['provisions'] += r.provisions or 0
        total['exchange_gl'] += r.exchange_gl or 0
        total['non_ops_exp'] += r.non_ops_exp or 0
        total['non_ops_income'] += r.non_ops_income or 0
        total['exchange_rate_sum'] += r.exchange_rate or 1
        total['count'] += 1
    
    # Calculate averages and derived metrics
    avg_fx = total['exchange_rate_sum'] / total['count'] if total['count'] > 0 else 1
    revenue_usd = total['revenue_lkr'] / avg_fx if avg_fx > 0 else 0
    gp_margin = (total['gp'] / total['revenue_lkr'] * 100) if total['revenue_lkr'] > 0 else 0
    total_overheads = (
        total['personal_exp'] + total['admin_exp'] + 
        total['selling_exp'] + total['finance_exp'] + total['depreciation']
    )
    pbt_before = (
        total['gp'] + total['other_income'] - total_overheads + 
        total['provisions'] + total['exchange_gl']
    )
    pbt_after = pbt_before - total['non_ops_exp'] + total['non_ops_income']
    np_margin = (pbt_before / total['revenue_lkr'] * 100) if total['revenue_lkr'] > 0 else 0
    ebit = pbt_before + total['finance_exp']
    ebitda = ebit + total['depreciation']
    
    return FinancialSummary(
        revenue_lkr=total['revenue_lkr'],
        revenue_usd=revenue_usd,
        gp=total['gp'],
        gp_margin_pct=round(gp_margin, 2),
        total_overheads=total_overheads,
        pbt_before=pbt_before,
        pbt_after=pbt_after,
        np_margin_pct=round(np_margin, 2),
        ebit=ebit,
        ebitda=ebitda,
        personal_exp=total['personal_exp'],
        admin_exp=total['admin_exp'],
        selling_exp=total['selling_exp'],
        finance_exp=total['finance_exp'],
        depreciation=total['depreciation'],
        other_income=total['other_income'],
        provisions=total['provisions'],
        exchange_gl=total['exchange_gl'],
        non_ops_exp=total['non_ops_exp'],
        non_ops_income=total['non_ops_income']
    )


def compute_variance(actual: FinancialSummary, budget: FinancialSummary) -> Dict[str, Any]:
    """Calculate variance between actual and budget"""
    if not actual or not budget:
        return None
    
    def calc_var(actual_val, budget_val, favorable_if_higher=True):
        diff = actual_val - budget_val
        pct = ((actual_val / budget_val) - 1) * 100 if budget_val != 0 else 0
        favorable = diff >= 0 if favorable_if_higher else diff <= 0
        return {
            "actual": actual_val,
            "budget": budget_val,
            "difference": diff,
            "percentage": round(pct, 2),
            "favorable": favorable
        }
    
    return {
        "revenue_lkr": calc_var(actual.revenue_lkr, budget.revenue_lkr, True),
        "gp": calc_var(actual.gp, budget.gp, True),
        "gp_margin": calc_var(actual.gp_margin_pct, budget.gp_margin_pct, True),
        "total_overheads": calc_var(actual.total_overheads, budget.total_overheads, False),
        "pbt_before": calc_var(actual.pbt_before, budget.pbt_before, True),
        "pbt_after": calc_var(actual.pbt_after, budget.pbt_after, True),
        "np_margin": calc_var(actual.np_margin_pct, budget.np_margin_pct, True),
        "ebit": calc_var(actual.ebit, budget.ebit, True),
        "ebitda": calc_var(actual.ebitda, budget.ebitda, True),
    }


def compute_achievement(actual: FinancialSummary, budget: FinancialSummary) -> Optional[float]:
    """Calculate PBT achievement percentage"""
    if not actual or not budget or budget.pbt_before == 0:
        return None
    return round((actual.pbt_before / budget.pbt_before) * 100, 2)


async def get_approved_company_ids(
    db: AsyncSession, 
    year: int, 
    month: Optional[int] = None
) -> List[str]:
    """Get company IDs with approved reports for period"""
    query = select(Report.company_id).where(
        and_(
            Report.year == year,
            Report.status == ReportStatus.APPROVED
        )
    )
    if month:
        query = query.where(Report.month == month)
    
    result = await db.execute(query)
    return [row[0] for row in result.all()]


# ============ ENDPOINTS ============

@router.get("/dashboard", response_model=CEODashboard)
async def get_ceo_dashboard(
    year: int = Query(default=None, description="Year (default: current)"),
    month: Optional[int] = Query(default=None, ge=1, le=12, description="Month (default: current)"),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Main CEO dashboard with group-level P&L summary.
    Only includes data from APPROVED reports.
    """
    # Check permission
    if not has_permission(user, Permission.VIEW_ANALYTICS):
        raise HTTPException(status_code=403, detail="Not authorized to view analytics")
    
    # Default to current period
    now = datetime.utcnow()
    year = year or now.year
    month = month or now.month
    
    # Get all clusters
    clusters_result = await db.execute(
        select(Cluster).where(Cluster.is_active == True).order_by(Cluster.name)
    )
    clusters = clusters_result.scalars().all()
    
    # Get all active companies
    companies_result = await db.execute(
        select(Company).where(Company.is_active == True)
    )
    companies = companies_result.scalars().all()
    
    # Get approved report company IDs
    approved_ids = await get_approved_company_ids(db, year, month)
    
    # Get actual data for approved companies only
    actual_query = select(FinancialMonthly).where(
        and_(
            FinancialMonthly.year == year,
            FinancialMonthly.month == month,
            FinancialMonthly.scenario == Scenario.ACTUAL,
            FinancialMonthly.company_id.in_(approved_ids) if approved_ids else False
        )
    )
    actual_result = await db.execute(actual_query)
    actual_records = actual_result.scalars().all()
    
    # Get budget data
    budget_query = select(FinancialMonthly).where(
        and_(
            FinancialMonthly.year == year,
            FinancialMonthly.month == month,
            FinancialMonthly.scenario == Scenario.BUDGET
        )
    )
    budget_result = await db.execute(budget_query)
    budget_records = budget_result.scalars().all()
    
    # Compute group-level summary
    group_actual = compute_financials(actual_records)
    group_budget = compute_financials(budget_records)
    
    if not group_actual:
        group_actual = FinancialSummary(
            revenue_lkr=0, revenue_usd=0, gp=0, gp_margin_pct=0,
            total_overheads=0, pbt_before=0, pbt_after=0, np_margin_pct=0,
            ebit=0, ebitda=0, personal_exp=0, admin_exp=0, selling_exp=0,
            finance_exp=0, depreciation=0, other_income=0, provisions=0,
            exchange_gl=0, non_ops_exp=0, non_ops_income=0
        )
    
    group_variance = compute_variance(group_actual, group_budget) if group_budget else None
    group_achievement = compute_achievement(group_actual, group_budget)
    
    group_summary = BudgetComparison(
        actual=group_actual,
        budget=group_budget,
        variance=group_variance,
        achievement_pct=group_achievement
    )
    
    # Build cluster summaries
    cluster_summaries = []
    for cluster in clusters:
        cluster_companies = [c for c in companies if c.cluster_id == cluster.id]
        cluster_approved = [cid for cid in approved_ids if any(c.id == cid for c in cluster_companies)]
        
        cluster_actual_records = [r for r in actual_records if r.company_id in [c.id for c in cluster_companies]]
        cluster_budget_records = [r for r in budget_records if r.company_id in [c.id for c in cluster_companies]]
        
        cluster_actual = compute_financials(cluster_actual_records)
        cluster_budget = compute_financials(cluster_budget_records)
        cluster_variance = compute_variance(cluster_actual, cluster_budget) if cluster_actual and cluster_budget else None
        cluster_achievement = compute_achievement(cluster_actual, cluster_budget)
        
        cluster_financials = None
        if cluster_actual:
            cluster_financials = BudgetComparison(
                actual=cluster_actual,
                budget=cluster_budget,
                variance=cluster_variance,
                achievement_pct=cluster_achievement
            )
        
        cluster_summaries.append(ClusterSummary(
            id=str(cluster.id),
            name=cluster.name,
            code=cluster.code,
            company_count=len(cluster_companies),
            companies_reporting=len(cluster_approved),
            financials=cluster_financials,
            companies=None  # Don't include company details in main dashboard
        ))
    
    # Calculate avg exchange rate
    avg_fx = 1.0
    if actual_records:
        fx_sum = sum(r.exchange_rate or 1 for r in actual_records)
        avg_fx = fx_sum / len(actual_records)
    
    # Compute reporting metrics
    total_companies = len(companies)
    companies_approved = len(approved_ids)
    
    # Count companies with submitted+ status
    reporting_query = await db.execute(
        select(func.count(func.distinct(Report.company_id))).where(
            and_(
                Report.year == year,
                Report.month == month,
                Report.status.in_([ReportStatus.SUBMITTED, ReportStatus.APPROVED])
            )
        )
    )
    companies_reporting = reporting_query.scalar() or 0
    
    reporting_rate = (companies_reporting / total_companies * 100) if total_companies > 0 else 0
    
    return CEODashboard(
        period=f"{MONTH_NAMES[month]} {year}",
        year=year,
        month=month,
        is_ytd=False,
        group_summary=group_summary,
        clusters=cluster_summaries,
        total_companies=total_companies,
        companies_reporting=companies_reporting,
        companies_approved=companies_approved,
        reporting_rate_pct=round(reporting_rate, 1),
        avg_exchange_rate=round(avg_fx, 2)
    )


@router.get("/ytd/{year}", response_model=CEODashboard)
async def get_ytd_summary(
    year: int,
    through_month: Optional[int] = Query(default=None, ge=1, le=12, description="Through month"),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    YTD (Year-to-Date) financial summary.
    Aggregates all months from January (or FY start) through specified month.
    Only includes data from APPROVED reports.
    """
    if not has_permission(user, Permission.VIEW_ANALYTICS):
        raise HTTPException(status_code=403, detail="Not authorized to view analytics")
    
    # Default through current month
    now = datetime.utcnow()
    through_month = through_month or (now.month if year == now.year else 12)
    
    # Get clusters and companies
    clusters_result = await db.execute(
        select(Cluster).where(Cluster.is_active == True).order_by(Cluster.name)
    )
    clusters = clusters_result.scalars().all()
    
    companies_result = await db.execute(
        select(Company).where(Company.is_active == True)
    )
    companies = companies_result.scalars().all()
    
    # Get approved company IDs for YTD (any month approved counts)
    approved_ids = await get_approved_company_ids(db, year)
    
    # Get YTD actual data
    actual_query = select(FinancialMonthly).where(
        and_(
            FinancialMonthly.year == year,
            FinancialMonthly.month <= through_month,
            FinancialMonthly.scenario == Scenario.ACTUAL,
            FinancialMonthly.company_id.in_(approved_ids) if approved_ids else False
        )
    )
    actual_result = await db.execute(actual_query)
    actual_records = actual_result.scalars().all()
    
    # Get YTD budget data
    budget_query = select(FinancialMonthly).where(
        and_(
            FinancialMonthly.year == year,
            FinancialMonthly.month <= through_month,
            FinancialMonthly.scenario == Scenario.BUDGET
        )
    )
    budget_result = await db.execute(budget_query)
    budget_records = budget_result.scalars().all()
    
    # Compute group summary
    group_actual = compute_financials(actual_records)
    group_budget = compute_financials(budget_records)
    
    if not group_actual:
        group_actual = FinancialSummary(
            revenue_lkr=0, revenue_usd=0, gp=0, gp_margin_pct=0,
            total_overheads=0, pbt_before=0, pbt_after=0, np_margin_pct=0,
            ebit=0, ebitda=0, personal_exp=0, admin_exp=0, selling_exp=0,
            finance_exp=0, depreciation=0, other_income=0, provisions=0,
            exchange_gl=0, non_ops_exp=0, non_ops_income=0
        )
    
    group_variance = compute_variance(group_actual, group_budget) if group_budget else None
    group_achievement = compute_achievement(group_actual, group_budget)
    
    group_summary = BudgetComparison(
        actual=group_actual,
        budget=group_budget,
        variance=group_variance,
        achievement_pct=group_achievement
    )
    
    # Build cluster summaries
    cluster_summaries = []
    for cluster in clusters:
        cluster_companies = [c for c in companies if c.cluster_id == cluster.id]
        cluster_actual_records = [r for r in actual_records if r.company_id in [c.id for c in cluster_companies]]
        cluster_budget_records = [r for r in budget_records if r.company_id in [c.id for c in cluster_companies]]
        
        cluster_actual = compute_financials(cluster_actual_records)
        cluster_budget = compute_financials(cluster_budget_records)
        cluster_variance = compute_variance(cluster_actual, cluster_budget) if cluster_actual and cluster_budget else None
        cluster_achievement = compute_achievement(cluster_actual, cluster_budget)
        
        cluster_financials = None
        if cluster_actual:
            cluster_financials = BudgetComparison(
                actual=cluster_actual,
                budget=cluster_budget,
                variance=cluster_variance,
                achievement_pct=cluster_achievement
            )
        
        # Count unique companies reporting in YTD
        reporting_company_ids = set(r.company_id for r in cluster_actual_records)
        
        cluster_summaries.append(ClusterSummary(
            id=str(cluster.id),
            name=cluster.name,
            code=cluster.code,
            company_count=len(cluster_companies),
            companies_reporting=len(reporting_company_ids),
            financials=cluster_financials,
            companies=None
        ))
    
    # Calculate avg exchange rate
    avg_fx = 1.0
    if actual_records:
        fx_sum = sum(r.exchange_rate or 1 for r in actual_records)
        avg_fx = fx_sum / len(actual_records)
    
    total_companies = len(companies)
    companies_approved = len(set(r.company_id for r in actual_records))
    
    return CEODashboard(
        period=f"YTD {year} (Jan-{MONTH_NAMES[through_month]})",
        year=year,
        month=through_month,
        is_ytd=True,
        group_summary=group_summary,
        clusters=cluster_summaries,
        total_companies=total_companies,
        companies_reporting=companies_approved,
        companies_approved=companies_approved,
        reporting_rate_pct=round((companies_approved / total_companies * 100) if total_companies > 0 else 0, 1),
        avg_exchange_rate=round(avg_fx, 2)
    )


@router.get("/clusters/{cluster_id}", response_model=ClusterSummary)
async def get_cluster_detail(
    cluster_id: str,
    year: int = Query(default=None),
    month: Optional[int] = Query(default=None, ge=1, le=12),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get cluster detail with company breakdown"""
    if not has_permission(user, Permission.VIEW_ANALYTICS):
        raise HTTPException(status_code=403, detail="Not authorized to view analytics")
    
    now = datetime.utcnow()
    year = year or now.year
    month = month or now.month
    
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
            and_(
                Company.cluster_id == cluster_id,
                Company.is_active == True
            )
        ).order_by(Company.name)
    )
    companies = companies_result.scalars().all()
    
    # Get approved IDs
    approved_ids = await get_approved_company_ids(db, year, month)
    
    # Build company summaries
    company_summaries = []
    cluster_actual_records = []
    cluster_budget_records = []
    
    for company in companies:
        # Get actual
        actual_result = await db.execute(
            select(FinancialMonthly).where(
                and_(
                    FinancialMonthly.company_id == company.id,
                    FinancialMonthly.year == year,
                    FinancialMonthly.month == month,
                    FinancialMonthly.scenario == Scenario.ACTUAL
                )
            )
        )
        actual = actual_result.scalar_one_or_none()
        
        # Get budget
        budget_result = await db.execute(
            select(FinancialMonthly).where(
                and_(
                    FinancialMonthly.company_id == company.id,
                    FinancialMonthly.year == year,
                    FinancialMonthly.month == month,
                    FinancialMonthly.scenario == Scenario.BUDGET
                )
            )
        )
        budget = budget_result.scalar_one_or_none()
        
        # Get report status
        report_result = await db.execute(
            select(Report).where(
                and_(
                    Report.company_id == company.id,
                    Report.year == year,
                    Report.month == month
                )
            )
        )
        report = report_result.scalar_one_or_none()
        
        # Only include approved data in cluster totals
        has_data = company.id in approved_ids and actual is not None
        if has_data:
            cluster_actual_records.append(actual)
        if budget:
            cluster_budget_records.append(budget)
        
        # Build company financials
        company_financials = None
        if actual:
            company_actual = compute_financials([actual])
            company_budget = compute_financials([budget]) if budget else None
            company_variance = compute_variance(company_actual, company_budget) if company_budget else None
            company_achievement = compute_achievement(company_actual, company_budget)
            
            company_financials = BudgetComparison(
                actual=company_actual,
                budget=company_budget,
                variance=company_variance,
                achievement_pct=company_achievement
            )
        
        company_summaries.append(CompanySummary(
            id=str(company.id),
            name=company.name,
            code=company.code,
            cluster_id=str(company.cluster_id),
            cluster_name=cluster.name,
            currency=company.currency if hasattr(company, 'currency') else "LKR",
            financials=company_financials,
            report_status=report.status.value if report else None,
            has_data=has_data
        ))
    
    # Compute cluster totals
    cluster_actual = compute_financials(cluster_actual_records)
    cluster_budget = compute_financials(cluster_budget_records)
    cluster_variance = compute_variance(cluster_actual, cluster_budget) if cluster_actual and cluster_budget else None
    cluster_achievement = compute_achievement(cluster_actual, cluster_budget)
    
    cluster_financials = None
    if cluster_actual:
        cluster_financials = BudgetComparison(
            actual=cluster_actual,
            budget=cluster_budget,
            variance=cluster_variance,
            achievement_pct=cluster_achievement
        )
    
    return ClusterSummary(
        id=str(cluster.id),
        name=cluster.name,
        code=cluster.code,
        company_count=len(companies),
        companies_reporting=len([c for c in company_summaries if c.has_data]),
        financials=cluster_financials,
        companies=company_summaries
    )


@router.get("/rankings/{year}/{month}", response_model=RankingsResponse)
async def get_performance_rankings(
    year: int,
    month: int,
    metric: str = Query(default="pbt_before", description="Metric to rank by"),
    limit: int = Query(default=10, ge=1, le=50),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get company performance rankings by specified metric.
    Only includes approved reports.
    
    Metrics: revenue_lkr, gp, gp_margin, pbt_before, np_margin, ebitda
    """
    if not has_permission(user, Permission.VIEW_ANALYTICS):
        raise HTTPException(status_code=403, detail="Not authorized to view analytics")
    
    valid_metrics = ["revenue_lkr", "gp", "gp_margin", "pbt_before", "np_margin", "ebitda"]
    if metric not in valid_metrics:
        raise HTTPException(status_code=400, detail=f"Invalid metric. Use one of: {valid_metrics}")
    
    # Get approved IDs
    approved_ids = await get_approved_company_ids(db, year, month)
    
    if not approved_ids:
        return RankingsResponse(
            period=f"{MONTH_NAMES[month]} {year}",
            metric=metric,
            rankings=[]
        )
    
    # Get actual data for approved companies
    actual_result = await db.execute(
        select(FinancialMonthly).where(
            and_(
                FinancialMonthly.year == year,
                FinancialMonthly.month == month,
                FinancialMonthly.scenario == Scenario.ACTUAL,
                FinancialMonthly.company_id.in_(approved_ids)
            )
        )
    )
    actuals = actual_result.scalars().all()
    
    # Build ranking data
    ranking_data = []
    for actual in actuals:
        # Get company and cluster
        company_result = await db.execute(
            select(Company).where(Company.id == actual.company_id)
        )
        company = company_result.scalar_one_or_none()
        if not company:
            continue
        
        cluster_result = await db.execute(
            select(Cluster).where(Cluster.id == company.cluster_id)
        )
        cluster = cluster_result.scalar_one_or_none()
        
        # Get budget for variance
        budget_result = await db.execute(
            select(FinancialMonthly).where(
                and_(
                    FinancialMonthly.company_id == actual.company_id,
                    FinancialMonthly.year == year,
                    FinancialMonthly.month == month,
                    FinancialMonthly.scenario == Scenario.BUDGET
                )
            )
        )
        budget = budget_result.scalar_one_or_none()
        
        # Calculate metric value
        summary = compute_financials([actual])
        if not summary:
            continue
        
        if metric == "revenue_lkr":
            value = summary.revenue_lkr
            formatted = f"LKR {value/1e6:.1f}M"
        elif metric == "gp":
            value = summary.gp
            formatted = f"LKR {value/1e6:.1f}M"
        elif metric == "gp_margin":
            value = summary.gp_margin_pct
            formatted = f"{value:.1f}%"
        elif metric == "pbt_before":
            value = summary.pbt_before
            formatted = f"LKR {value/1e6:.1f}M"
        elif metric == "np_margin":
            value = summary.np_margin_pct
            formatted = f"{value:.1f}%"
        elif metric == "ebitda":
            value = summary.ebitda
            formatted = f"LKR {value/1e6:.1f}M"
        else:
            value = summary.pbt_before
            formatted = f"LKR {value/1e6:.1f}M"
        
        # Calculate variance vs budget
        variance_pct = None
        is_favorable = True
        if budget:
            budget_summary = compute_financials([budget])
            if budget_summary:
                actual_val = getattr(summary, metric.replace("_pct", ""), 0) if not metric.endswith("margin") else value
                budget_val = getattr(budget_summary, metric.replace("_pct", ""), 0) if not metric.endswith("margin") else getattr(budget_summary, f"{metric}_pct", 0)
                if budget_val != 0:
                    variance_pct = round(((actual_val / budget_val) - 1) * 100, 1)
                    is_favorable = variance_pct >= 0
        
        ranking_data.append({
            "company_id": str(company.id),
            "company_name": company.name,
            "company_code": company.code,
            "cluster_name": cluster.name if cluster else "Unknown",
            "value": value,
            "formatted": formatted,
            "variance_pct": variance_pct,
            "is_favorable": is_favorable
        })
    
    # Sort by value (descending for most metrics)
    reverse = True
    if metric in ["total_overheads"]:  # Lower is better
        reverse = False
    
    ranking_data.sort(key=lambda x: x["value"], reverse=reverse)
    
    # Build response
    rankings = []
    for i, data in enumerate(ranking_data[:limit]):
        rankings.append(RankingEntry(
            rank=i + 1,
            company_id=data["company_id"],
            company_name=data["company_name"],
            company_code=data["company_code"],
            cluster_name=data["cluster_name"],
            metric_value=data["value"],
            metric_formatted=data["formatted"],
            variance_pct=data["variance_pct"],
            is_favorable=data["is_favorable"]
        ))
    
    return RankingsResponse(
        period=f"{MONTH_NAMES[month]} {year}",
        metric=metric,
        rankings=rankings
    )


@router.get("/trends", response_model=TrendsResponse)
async def get_trends(
    company_id: Optional[str] = None,
    metrics: str = Query(default="revenue_lkr,gp,pbt_before", description="Comma-separated metrics"),
    year_from: int = Query(default=None),
    year_to: int = Query(default=None),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get historical trends for specified metrics.
    If company_id is provided, shows company-level trends.
    Otherwise, shows group-level aggregate trends.
    """
    if not has_permission(user, Permission.VIEW_ANALYTICS):
        raise HTTPException(status_code=403, detail="Not authorized to view analytics")
    
    now = datetime.utcnow()
    year_to = year_to or now.year
    year_from = year_from or year_to - 1  # Default 2 years
    
    metric_list = [m.strip() for m in metrics.split(",")]
    
    # Build query
    query = select(FinancialMonthly).where(
        and_(
            FinancialMonthly.year >= year_from,
            FinancialMonthly.year <= year_to,
            FinancialMonthly.scenario == Scenario.ACTUAL
        )
    ).order_by(FinancialMonthly.year, FinancialMonthly.month)
    
    company_name = None
    if company_id:
        query = query.where(FinancialMonthly.company_id == company_id)
        company_result = await db.execute(
            select(Company).where(Company.id == company_id)
        )
        company = company_result.scalar_one_or_none()
        company_name = company.name if company else None
    
    result = await db.execute(query)
    records = result.scalars().all()
    
    # Group by period
    period_data: Dict[str, List[FinancialMonthly]] = {}
    for r in records:
        key = f"{r.year}-{r.month:02d}"
        if key not in period_data:
            period_data[key] = []
        period_data[key].append(r)
    
    # Build series for each metric
    series_list = []
    for metric in metric_list:
        data_points = []
        for period_key in sorted(period_data.keys()):
            records_in_period = period_data[period_key]
            summary = compute_financials(records_in_period)
            if summary:
                year_val = int(period_key.split("-")[0])
                month_val = int(period_key.split("-")[1])
                
                # Get metric value
                if metric == "gp_margin":
                    value = summary.gp_margin_pct
                elif metric == "np_margin":
                    value = summary.np_margin_pct
                else:
                    value = getattr(summary, metric, 0)
                
                data_points.append(TrendDataPoint(
                    year=year_val,
                    month=month_val,
                    period=f"{MONTH_NAMES[month_val][:3]} {year_val}",
                    value=value
                ))
        
        series_list.append(TrendSeries(
            metric=metric,
            data=data_points
        ))
    
    return TrendsResponse(
        company_id=company_id,
        company_name=company_name,
        period_range=f"{year_from} - {year_to}",
        series=series_list
    )
