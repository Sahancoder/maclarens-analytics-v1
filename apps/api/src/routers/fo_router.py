"""
Finance Officer (FO/Data Officer) Router
Endpoints for entering actual financial data and managing reports

Endpoints:
- GET  /fo/companies              - Get assigned company(ies)
- GET  /fo/user-clusters          - Get clusters for logged-in user
- GET  /fo/user-companies         - Get companies for user within a cluster
- GET  /fo/check-period           - Check if data entry is allowed (22-day rule)
- GET  /fo/periods                - Get available periods for entry
- GET  /fo/reports                - My Reports list (all statuses)
- POST /fo/reports                - Create/get draft report for period
- GET  /fo/reports/{id}           - Get report details with financials
- PUT  /fo/reports/{id}/financials - Save actual financial data (auto-save)
- POST /fo/reports/{id}/submit    - Submit report to FD
- GET  /fo/budget/{company_id}/{year}/{month} - Get budget for comparison
- GET  /fo/budget-data/{company_id}/{year}/{month} - Get budget from financial_fact
- POST /fo/save-actuals           - Save actual data to financial_fact + workflow
"""
from datetime import datetime, date, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Literal

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, distinct, update as sa_update, func
from sqlalchemy.dialects.postgresql import insert

from src.db.models import (
    User, UserRole, Company, Cluster, Report, ReportStatus, ReportComment,
    FinancialMonthly, Scenario, ReportStatusHistory,
    UserCompanyRoleMap, CompanyMaster, ClusterMaster, UserMaster,
    PeriodMaster, FinancialFact, FinancialWorkflow
)
from src.config.constants import MetricID, StatusID, RoleID
from src.security.middleware import (
    get_db, get_current_active_user, require_fo,
    verify_company_access
)
from src.security.permissions import can_access_company, get_accessible_company_ids
from src.services.company_service import CompanyService
from src.services.workflow_service import WorkflowService

router = APIRouter(prefix="/fo", tags=["Finance Officer"])


# ============ REQUEST/RESPONSE MODELS ============

class CompanyInfo(BaseModel):
    id: str
    name: str
    code: str
    cluster_name: Optional[str] = None
    fy_start_month: int
    currency: str


class PeriodInfo(BaseModel):
    year: int
    month: int
    month_name: str
    has_budget: bool
    has_actual: bool
    report_status: Optional[str] = None
    report_id: Optional[str] = None


class FinancialDataInput(BaseModel):
    """Input model for saving actual financial data"""
    exchange_rate: float = Field(default=1.0, ge=0)
    revenue_lkr: float = Field(default=0)
    gp: float = Field(default=0)
    other_income: float = Field(default=0)
    personal_exp: float = Field(default=0)
    admin_exp: float = Field(default=0)
    selling_exp: float = Field(default=0)
    finance_exp: float = Field(default=0)
    depreciation: float = Field(default=0)
    provisions: float = Field(default=0)
    exchange_gl: float = Field(default=0)
    non_ops_exp: float = Field(default=0)
    non_ops_income: float = Field(default=0)
    # FO Comment/Analysis
    fo_comment: Optional[str] = None


class FinancialDataResponse(BaseModel):
    """Financial data with computed fields"""
    id: str
    company_id: str
    year: int
    month: int
    scenario: str
    exchange_rate: float
    revenue_lkr: float
    revenue_usd: float  # Computed
    gp: float
    gp_margin: float  # Computed
    other_income: float
    personal_exp: float
    admin_exp: float
    selling_exp: float
    finance_exp: float
    depreciation: float
    total_overheads: float  # Computed
    provisions: float
    exchange_gl: float
    pbt_before: float  # Computed
    np_margin: float  # Computed
    non_ops_exp: float
    non_ops_income: float
    pbt_after: float  # Computed
    ebit: float  # Computed
    ebitda: float  # Computed
    updated_at: Optional[datetime] = None


class ReportSummary(BaseModel):
    """Report summary for list view"""
    id: str
    company_id: str
    company_name: str
    company_code: str
    year: int
    month: int
    month_name: str
    status: str
    fo_comment: Optional[str]
    submitted_at: Optional[datetime]
    reviewed_at: Optional[datetime]
    rejection_reason: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]


class ReportDetail(BaseModel):
    """Full report detail with financials and budget comparison"""
    id: str
    company_id: str
    company_name: str
    company_code: str
    year: int
    month: int
    status: str
    fo_comment: Optional[str]
    rejection_reason: Optional[str]
    actual: Optional[FinancialDataResponse]
    budget: Optional[FinancialDataResponse]
    comments: List[dict]
    created_at: datetime
    updated_at: Optional[datetime]
    submitted_at: Optional[datetime]


class CreateReportRequest(BaseModel):
    """Request to create or get draft for a period"""
    company_id: str
    year: int
    month: int = Field(..., ge=1, le=12)


class SubmitReportRequest(BaseModel):
    """Request to submit report"""
    fo_comment: Optional[str] = None


class MyReportsResponse(BaseModel):
    reports: List[ReportSummary]
    total: int


# ============ HELPER FUNCTIONS ============

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]


def build_financial_response(fm: FinancialMonthly) -> FinancialDataResponse:
    """Convert FinancialMonthly to response with computed fields"""
    # Compute fields
    revenue_usd = fm.revenue_lkr / fm.exchange_rate if fm.exchange_rate and fm.exchange_rate > 0 else 0
    gp_margin = fm.gp / fm.revenue_lkr if fm.revenue_lkr and fm.revenue_lkr != 0 else 0
    total_overheads = fm.personal_exp + fm.admin_exp + fm.selling_exp + fm.finance_exp + fm.depreciation
    pbt_before = fm.gp + fm.other_income - total_overheads + fm.provisions + fm.exchange_gl
    np_margin = pbt_before / fm.revenue_lkr if fm.revenue_lkr and fm.revenue_lkr != 0 else 0
    pbt_after = pbt_before - fm.non_ops_exp + fm.non_ops_income
    ebit = pbt_before + fm.finance_exp
    ebitda = pbt_before + fm.finance_exp + fm.depreciation
    
    return FinancialDataResponse(
        id=str(fm.id),
        company_id=str(fm.company_id),
        year=fm.year,
        month=fm.month,
        scenario=fm.scenario.value if hasattr(fm.scenario, 'value') else str(fm.scenario),
        exchange_rate=fm.exchange_rate,
        revenue_lkr=fm.revenue_lkr,
        revenue_usd=revenue_usd,
        gp=fm.gp,
        gp_margin=gp_margin,
        other_income=fm.other_income,
        personal_exp=fm.personal_exp,
        admin_exp=fm.admin_exp,
        selling_exp=fm.selling_exp,
        finance_exp=fm.finance_exp,
        depreciation=fm.depreciation,
        total_overheads=total_overheads,
        provisions=fm.provisions,
        exchange_gl=fm.exchange_gl,
        pbt_before=pbt_before,
        np_margin=np_margin,
        non_ops_exp=fm.non_ops_exp,
        non_ops_income=fm.non_ops_income,
        pbt_after=pbt_after,
        ebit=ebit,
        ebitda=ebitda,
        updated_at=fm.updated_at
    )


async def get_or_create_actual(
    db: AsyncSession,
    company_id: str,
    year: int,
    month: int,
    user_id: str
) -> Optional[FinancialMonthly]:
    """Get existing actual entry from the view, creating FinancialFact rows if needed.

    FinancialMonthly maps to a VIEW (financial_monthly_view) which is read-only.
    Writes must go through the underlying FinancialFact table.
    """
    # Check if actual row already exists in the view
    result = await db.execute(
        select(FinancialMonthly).where(
            and_(
                FinancialMonthly.company_id == company_id,
                FinancialMonthly.year == year,
                FinancialMonthly.month == month,
                FinancialMonthly.scenario == Scenario.ACTUAL
            )
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    # Look up period_id
    period_result = await db.execute(
        select(PeriodMaster).where(
            and_(PeriodMaster.year == year, PeriodMaster.month == month)
        )
    )
    period = period_result.scalar_one_or_none()
    if not period:
        return None

    # Create zero-value FinancialFact rows for all metrics
    for mid in [
        MetricID.REVENUE, MetricID.GP, MetricID.GP_MARGIN,
        MetricID.OTHER_INCOME, MetricID.PERSONAL_EXP, MetricID.ADMIN_EXP,
        MetricID.SELLING_EXP, MetricID.FINANCE_EXP, MetricID.DEPRECIATION,
        MetricID.TOTAL_OVERHEAD, MetricID.PROVISIONS, MetricID.EXCHANGE_VARIANCE,
        MetricID.PBT_BEFORE_NON_OPS, MetricID.PBT_AFTER_NON_OPS,
        MetricID.NON_OPS_EXP, MetricID.NON_OPS_INCOME,
        MetricID.NP_MARGIN, MetricID.EBIT, MetricID.EBITDA,
    ]:
        db.add(FinancialFact(
            company_id=company_id,
            period_id=period.period_id,
            metric_id=int(mid),
            actual_budget=Scenario.ACTUAL.value,
            amount=0,
        ))
    await db.flush()

    # Read back from view
    view_result = await db.execute(
        select(FinancialMonthly).where(
            and_(
                FinancialMonthly.company_id == company_id,
                FinancialMonthly.year == year,
                FinancialMonthly.month == month,
                FinancialMonthly.scenario == Scenario.ACTUAL
            )
        )
    )
    return view_result.scalar_one_or_none()


async def get_or_create_report(
    db: AsyncSession,
    company_id: str,
    year: int,
    month: int,
    user_id: str
) -> Report:
    """Get existing or create new draft report"""
    result = await db.execute(
        select(Report).where(
            and_(
                Report.company_id == company_id,
                Report.year == year,
                Report.month == month
            )
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        return existing
    
    # Create new draft
    report = Report(
        company_id=company_id,
        year=year,
        month=month,
        status=ReportStatus.DRAFT,
        submitted_by=user_id,
        created_at=datetime.utcnow()
    )
    db.add(report)
    
    # Create initial status history
    history = ReportStatusHistory(
        report_id=report.id,
        from_status=None,
        to_status=ReportStatus.DRAFT,
        changed_by=user_id,
        created_at=datetime.utcnow()
    )
    db.add(history)
    
    await db.flush()
    return report


# ============ ENDPOINTS ============

@router.get("/companies", response_model=List[CompanyInfo])
async def get_my_companies(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get companies the FO is assigned to"""
    accessible = await get_accessible_company_ids(db, user)
    
    if accessible is None:
        # Admin/CEO - shouldn't use this endpoint but return all
        companies = await CompanyService.get_all_companies(db)
    elif len(accessible) == 0:
        return []
    else:
        result = await db.execute(
            select(Company).where(Company.id.in_(accessible))
        )
        companies = result.scalars().all()

    cluster_ids = {c.cluster_id for c in companies if getattr(c, "cluster_id", None)}
    cluster_name_by_id = {}
    if cluster_ids:
        cluster_result = await db.execute(
            select(Cluster.id, Cluster.name).where(Cluster.id.in_(cluster_ids))
        )
        cluster_name_by_id = {cid: cname for cid, cname in cluster_result.all()}
    
    return [
        CompanyInfo(
            id=str(c.id),
            name=c.name,
            code=c.code,
            cluster_name=cluster_name_by_id.get(c.cluster_id),
            fy_start_month=c.fy_start_month if hasattr(c, 'fy_start_month') else 1,
            currency=c.currency if hasattr(c, 'currency') else "LKR"
        )
        for c in companies if c.is_active
    ]


@router.get("/periods/{company_id}", response_model=List[PeriodInfo])
async def get_available_periods(
    company_id: str,
    year: Optional[int] = None,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get available periods for data entry.
    Shows which periods have budget, actual, and report status.
    """
    # Verify access
    if not await can_access_company(db, user, company_id):
        raise HTTPException(status_code=403, detail="Access denied to this company")
    
    # Default to current year and previous year
    if year is None:
        year = datetime.utcnow().year
    
    periods = []
    
    for month in range(1, 13):
        # Check for budget
        budget_result = await db.execute(
            select(FinancialMonthly.id).where(
                and_(
                    FinancialMonthly.company_id == company_id,
                    FinancialMonthly.year == year,
                    FinancialMonthly.month == month,
                    FinancialMonthly.scenario == Scenario.BUDGET
                )
            )
        )
        has_budget = budget_result.scalar_one_or_none() is not None
        
        # Check for actual
        actual_result = await db.execute(
            select(FinancialMonthly.id).where(
                and_(
                    FinancialMonthly.company_id == company_id,
                    FinancialMonthly.year == year,
                    FinancialMonthly.month == month,
                    FinancialMonthly.scenario == Scenario.ACTUAL
                )
            )
        )
        has_actual = actual_result.scalar_one_or_none() is not None
        
        # Check for report
        report_result = await db.execute(
            select(Report).where(
                and_(
                    Report.company_id == company_id,
                    Report.year == year,
                    Report.month == month
                )
            )
        )
        report = report_result.scalar_one_or_none()
        
        periods.append(PeriodInfo(
            year=year,
            month=month,
            month_name=MONTH_NAMES[month],
            has_budget=has_budget,
            has_actual=has_actual,
            report_status=report.status.value if report and hasattr(report.status, 'value') else (str(report.status) if report else None),
            report_id=str(report.id) if report else None
        ))
    
    return periods


@router.get("/reports", response_model=MyReportsResponse)
async def get_my_reports(
    status_filter: Optional[str] = None,
    year: Optional[int] = None,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all reports for the FO's assigned companies"""
    accessible = await get_accessible_company_ids(db, user)
    
    query = select(Report).join(Company)
    
    if accessible is not None:
        if len(accessible) == 0:
            return MyReportsResponse(reports=[], total=0)
        query = query.where(Report.company_id.in_(accessible))
    
    if status_filter:
        try:
            status = ReportStatus(status_filter)
            query = query.where(Report.status == status)
        except ValueError:
            pass
    
    if year:
        query = query.where(Report.year == year)
    
    query = query.order_by(Report.year.desc(), Report.month.desc())
    
    result = await db.execute(query)
    reports = result.scalars().all()
    
    report_summaries = []
    for report in reports:
        # Get company info
        company_result = await db.execute(
            select(Company).where(Company.id == report.company_id)
        )
        company = company_result.scalar_one_or_none()
        
        report_summaries.append(ReportSummary(
            id=str(report.id),
            company_id=str(report.company_id),
            company_name=company.name if company else "Unknown",
            company_code=company.code if company else "",
            year=report.year,
            month=report.month,
            month_name=MONTH_NAMES[report.month],
            status=report.status.value if hasattr(report.status, 'value') else str(report.status),
            fo_comment=report.fo_comment,
            submitted_at=report.submitted_at,
            reviewed_at=report.reviewed_at,
            rejection_reason=report.rejection_reason,
            created_at=report.created_at,
            updated_at=report.updated_at
        ))
    
    return MyReportsResponse(reports=report_summaries, total=len(report_summaries))


@router.post("/reports", response_model=ReportSummary)
async def create_or_get_report(
    request: CreateReportRequest,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new draft report or get existing for a period"""
    # Verify access
    if not await can_access_company(db, user, request.company_id):
        raise HTTPException(status_code=403, detail="Access denied to this company")
    
    # Get or create
    report = await get_or_create_report(
        db,
        request.company_id,
        request.year,
        request.month,
        user.id
    )
    
    # Also ensure actual entry exists
    await get_or_create_actual(
        db,
        request.company_id,
        request.year,
        request.month,
        user.id
    )
    
    await db.commit()
    await db.refresh(report)
    
    # Get company
    company = await CompanyService.get_company_by_id(db, request.company_id)
    
    return ReportSummary(
        id=str(report.id),
        company_id=str(report.company_id),
        company_name=company.name if company else "Unknown",
        company_code=company.code if company else "",
        year=report.year,
        month=report.month,
        month_name=MONTH_NAMES[report.month],
        status=report.status.value if hasattr(report.status, 'value') else str(report.status),
        fo_comment=report.fo_comment,
        submitted_at=report.submitted_at,
        reviewed_at=report.reviewed_at,
        rejection_reason=report.rejection_reason,
        created_at=report.created_at,
        updated_at=report.updated_at
    )


@router.get("/reports/{report_id}", response_model=ReportDetail)
async def get_report_detail(
    report_id: str,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full report detail with actual and budget data"""
    # Get report
    result = await db.execute(
        select(Report).where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Verify access
    if not await can_access_company(db, user, report.company_id):
        raise HTTPException(status_code=403, detail="Access denied to this report")
    
    # Get company
    company = await CompanyService.get_company_by_id(db, str(report.company_id))
    
    # Get actual
    actual_result = await db.execute(
        select(FinancialMonthly).where(
            and_(
                FinancialMonthly.company_id == report.company_id,
                FinancialMonthly.year == report.year,
                FinancialMonthly.month == report.month,
                FinancialMonthly.scenario == Scenario.ACTUAL
            )
        )
    )
    actual = actual_result.scalar_one_or_none()
    
    # Get budget
    budget_result = await db.execute(
        select(FinancialMonthly).where(
            and_(
                FinancialMonthly.company_id == report.company_id,
                FinancialMonthly.year == report.year,
                FinancialMonthly.month == report.month,
                FinancialMonthly.scenario == Scenario.BUDGET
            )
        )
    )
    budget = budget_result.scalar_one_or_none()
    
    # Get comments
    comments_result = await db.execute(
        select(ReportComment).where(ReportComment.report_id == report_id)
        .order_by(ReportComment.created_at)
    )
    comments = comments_result.scalars().all()
    
    comments_list = []
    for c in comments:
        # Get commenter
        user_result = await db.execute(select(User).where(User.id == c.user_id))
        commenter = user_result.scalar_one_or_none()
        comments_list.append({
            "id": str(c.id),
            "user_name": commenter.name if commenter else "Unknown",
            "content": c.content,
            "is_system": c.is_system if hasattr(c, 'is_system') else False,
            "created_at": c.created_at.isoformat() if c.created_at else None
        })
    
    return ReportDetail(
        id=str(report.id),
        company_id=str(report.company_id),
        company_name=company.name if company else "Unknown",
        company_code=company.code if company else "",
        year=report.year,
        month=report.month,
        status=report.status.value if hasattr(report.status, 'value') else str(report.status),
        fo_comment=report.fo_comment,
        rejection_reason=report.rejection_reason,
        actual=build_financial_response(actual) if actual else None,
        budget=build_financial_response(budget) if budget else None,
        comments=comments_list,
        created_at=report.created_at,
        updated_at=report.updated_at,
        submitted_at=report.submitted_at
    )


@router.put("/reports/{report_id}/financials", response_model=FinancialDataResponse)
async def save_actual_financials(
    report_id: str,
    data: FinancialDataInput,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Save actual financial data for a report.
    This is the main data entry endpoint - supports auto-save.
    Only allowed when report is in DRAFT or REJECTED status.
    """
    # Get report
    result = await db.execute(
        select(Report).where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Verify access
    if not await can_access_company(db, user, report.company_id):
        raise HTTPException(status_code=403, detail="Access denied to this report")
    
    # Check status - can only edit DRAFT or REJECTED
    if report.status not in (ReportStatus.DRAFT, ReportStatus.REJECTED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit report in {report.status.value} status. Report must be in draft or rejected status."
        )
    
    # Look up period_id
    period_result = await db.execute(
        select(PeriodMaster).where(
            and_(PeriodMaster.year == report.year, PeriodMaster.month == report.month)
        )
    )
    period = period_result.scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail="Period not found")

    # Map input fields to metric IDs and upsert into FinancialFact
    metric_values = {
        MetricID.REVENUE: data.revenue_lkr,
        MetricID.GP: data.gp,
        MetricID.OTHER_INCOME: data.other_income,
        MetricID.PERSONAL_EXP: data.personal_exp,
        MetricID.ADMIN_EXP: data.admin_exp,
        MetricID.SELLING_EXP: data.selling_exp,
        MetricID.FINANCE_EXP: data.finance_exp,
        MetricID.DEPRECIATION: data.depreciation,
        MetricID.PROVISIONS: data.provisions,
        MetricID.EXCHANGE_VARIANCE: data.exchange_gl,
        MetricID.NON_OPS_EXP: data.non_ops_exp,
        MetricID.NON_OPS_INCOME: data.non_ops_income,
    }

    # Compute derived metrics
    total_overhead = data.personal_exp + data.admin_exp + data.selling_exp + data.finance_exp + data.depreciation
    pbt_before = (data.gp + data.other_income) - total_overhead + data.provisions + data.exchange_gl
    pbt_after = pbt_before + data.non_ops_income - data.non_ops_exp
    gp_margin = (data.gp / data.revenue_lkr * 100) if data.revenue_lkr != 0 else 0
    np_margin = (pbt_before / data.revenue_lkr * 100) if data.revenue_lkr != 0 else 0
    ebit = pbt_before + data.finance_exp
    ebitda = ebit + data.depreciation

    metric_values[MetricID.GP_MARGIN] = gp_margin
    metric_values[MetricID.TOTAL_OVERHEAD] = total_overhead
    metric_values[MetricID.PBT_BEFORE_NON_OPS] = pbt_before
    metric_values[MetricID.PBT_AFTER_NON_OPS] = pbt_after
    metric_values[MetricID.NP_MARGIN] = np_margin
    metric_values[MetricID.EBIT] = ebit
    metric_values[MetricID.EBITDA] = ebitda

    for metric_id, amount in metric_values.items():
        existing_fact = await db.execute(
            select(FinancialFact).where(
                and_(
                    FinancialFact.company_id == report.company_id,
                    FinancialFact.period_id == period.period_id,
                    FinancialFact.metric_id == int(metric_id),
                    FinancialFact.actual_budget == Scenario.ACTUAL.value,
                )
            )
        )
        fact = existing_fact.scalar_one_or_none()
        if fact:
            fact.amount = amount
        else:
            db.add(FinancialFact(
                company_id=report.company_id,
                period_id=period.period_id,
                metric_id=int(metric_id),
                actual_budget=Scenario.ACTUAL.value,
                amount=amount,
            ))

    # Update FO comment on report
    if data.fo_comment is not None:
        report.fo_comment = data.fo_comment

    await db.commit()

    # Read back from the view
    view_result = await db.execute(
        select(FinancialMonthly).where(
            and_(
                FinancialMonthly.company_id == report.company_id,
                FinancialMonthly.year == report.year,
                FinancialMonthly.month == report.month,
                FinancialMonthly.scenario == Scenario.ACTUAL
            )
        )
    )
    actual = view_result.scalar_one_or_none()
    if not actual:
        raise HTTPException(status_code=500, detail="Failed to read back saved data")

    return build_financial_response(actual)


@router.post("/reports/{report_id}/submit")
async def submit_report(
    report_id: str,
    request: Optional[SubmitReportRequest] = None,
    background_tasks: BackgroundTasks = None,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit report to Finance Director for review.
    
    This transitions the report from DRAFT to SUBMITTED.
    Directors will be notified via in-app notification and email.
    """
    # Get report
    result = await db.execute(
        select(Report).where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Verify access
    if not await can_access_company(db, user, report.company_id):
        raise HTTPException(status_code=403, detail="Access denied to this report")
    
    # Check status
    if report.status not in (ReportStatus.DRAFT, ReportStatus.REJECTED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit report in {report.status.value} status"
        )
    
    # Check that actual data exists
    actual_result = await db.execute(
        select(FinancialMonthly).where(
            and_(
                FinancialMonthly.company_id == report.company_id,
                FinancialMonthly.year == report.year,
                FinancialMonthly.month == report.month,
                FinancialMonthly.scenario == Scenario.ACTUAL
            )
        )
    )
    actual = actual_result.scalar_one_or_none()
    
    if not actual:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit report without entering actual financial data"
        )
    
    # Validate - at least revenue should be entered
    if actual.revenue_lkr == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter at least revenue data before submitting"
        )
    
    # Update FO comment if provided
    if request and request.fo_comment:
        report.fo_comment = request.fo_comment
    
    # Use workflow service to submit
    workflow_result = await WorkflowService.submit_report(
        db=db,
        report_id=report_id,
        user_id=str(user.id),
        background_tasks=background_tasks
    )
    
    if not workflow_result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=workflow_result.get("error", "Failed to submit report")
        )
    
    return {
        "success": True,
        "message": "Report submitted successfully",
        "report_id": report_id,
        "new_status": "submitted",
        "directors_notified": workflow_result.get("directors_notified", [])
    }


@router.get("/budget/{company_id}/{year}/{month}", response_model=Optional[FinancialDataResponse])
async def get_budget_for_period(
    company_id: str,
    year: int,
    month: int,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get budget data for a specific period (for comparison)"""
    # Verify access
    if not await can_access_company(db, user, company_id):
        raise HTTPException(status_code=403, detail="Access denied to this company")
    
    result = await db.execute(
        select(FinancialMonthly).where(
            and_(
                FinancialMonthly.company_id == company_id,
                FinancialMonthly.year == year,
                FinancialMonthly.month == month,
                FinancialMonthly.scenario == Scenario.BUDGET
            )
        )
    )
    budget = result.scalar_one_or_none()
    
    if not budget:
        return None
    
    return build_financial_response(budget)


# ============ NEW ENDPOINTS - DB-CONNECTED DROPDOWNS & DATA ENTRY ============

# --- Request/Response Models ---

class ClusterInfo(BaseModel):
    cluster_id: str
    cluster_name: str


class UserCompanyInfo(BaseModel):
    company_id: str
    company_name: str
    cluster_id: str
    fin_year_start_month: Optional[int] = None


class PeriodCheckResponse(BaseModel):
    allowed: bool
    message: str
    end_date: Optional[str] = None
    days_exceeded: Optional[int] = None


class BudgetFactResponse(BaseModel):
    """Budget amounts keyed by metric_id from financial_fact"""
    company_id: str
    period_id: int
    year: int
    month: int
    metrics: Dict[int, float]  # metric_id -> amount


class SaveActualsRequest(BaseModel):
    """Request to save actual data to financial_fact + financial_workflow"""
    company_id: str
    year: int
    month: int
    # Metric values (metric_id -> amount)
    revenue: float = 0
    gp: float = 0
    other_income: float = 0
    personal_exp: float = 0
    admin_exp: float = 0
    selling_exp: float = 0
    finance_exp: float = 0
    depreciation: float = 0
    provisions: float = 0
    exchange_gl: float = 0
    non_ops_exp: float = 0
    non_ops_income: float = 0
    comment: Optional[str] = None
    is_submit: bool = False  # True = Submit (status_id=2), False = Save Draft (status_id=1)


# --- Metric field mapping ---
METRIC_FIELD_MAP = {
    MetricID.REVENUE: "revenue",
    MetricID.GP: "gp",
    MetricID.OTHER_INCOME: "other_income",
    MetricID.PERSONAL_EXP: "personal_exp",
    MetricID.ADMIN_EXP: "admin_exp",
    MetricID.SELLING_EXP: "selling_exp",
    MetricID.FINANCE_EXP: "finance_exp",
    MetricID.DEPRECIATION: "depreciation",
    MetricID.PROVISIONS: "provisions",
    MetricID.EXCHANGE_VARIANCE: "exchange_gl",
    MetricID.NON_OPS_EXP: "non_ops_exp",
    MetricID.NON_OPS_INCOME: "non_ops_income",
}


# --- 1. Cluster Dropdown ---

@router.get("/user-clusters", response_model=List[ClusterInfo])
async def get_user_clusters(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get clusters for the logged-in user.
    Joins: user_master -> user_company_role_map -> company_master -> cluster_master
    Filters: user_id match, is_active=True in all tables.
    """
    stmt = (
        select(
            ClusterMaster.cluster_id,
            ClusterMaster.cluster_name,
        )
        .select_from(UserMaster)
        .join(
            UserCompanyRoleMap,
            and_(
                UserMaster.user_id == UserCompanyRoleMap.user_id,
                UserCompanyRoleMap.is_active == True,
            ),
        )
        .join(
            CompanyMaster,
            and_(
                UserCompanyRoleMap.company_id == CompanyMaster.company_id,
                CompanyMaster.is_active == True,
            ),
        )
        .join(
            ClusterMaster,
            and_(
                CompanyMaster.cluster_id == ClusterMaster.cluster_id,
                ClusterMaster.is_active == True,
            ),
        )
        .where(
            and_(
                UserMaster.user_id == user.user_id,
                UserMaster.is_active == True,
            )
        )
        .distinct()
        .order_by(ClusterMaster.cluster_name)
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        ClusterInfo(cluster_id=r.cluster_id, cluster_name=r.cluster_name)
        for r in rows
    ]


# --- 2. Company Dropdown (filtered by cluster) ---

@router.get("/user-companies", response_model=List[UserCompanyInfo])
async def get_user_companies(
    cluster_id: Optional[str] = None,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get companies for the logged-in user, optionally filtered by cluster.
    Joins: user_master -> user_company_role_map -> company_master
    Filters: user_id match, is_active=True in user_master, user_company_role_map, company_master.
    """
    stmt = (
        select(
            CompanyMaster.company_id,
            CompanyMaster.company_name,
            CompanyMaster.cluster_id,
            CompanyMaster.fin_year_start_month,
        )
        .select_from(UserMaster)
        .join(
            UserCompanyRoleMap,
            and_(
                UserMaster.user_id == UserCompanyRoleMap.user_id,
                UserCompanyRoleMap.is_active == True,
            ),
        )
        .join(
            CompanyMaster,
            and_(
                UserCompanyRoleMap.company_id == CompanyMaster.company_id,
                CompanyMaster.is_active == True,
            ),
        )
        .where(
            and_(
                UserMaster.user_id == user.user_id,
                UserMaster.is_active == True,
            )
        )
    )

    if cluster_id:
        stmt = stmt.where(CompanyMaster.cluster_id == cluster_id)

    stmt = stmt.distinct().order_by(CompanyMaster.company_name)

    result = await db.execute(stmt)
    rows = result.all()

    return [
        UserCompanyInfo(
            company_id=r.company_id,
            company_name=r.company_name,
            cluster_id=r.cluster_id,
            fin_year_start_month=r.fin_year_start_month,
        )
        for r in rows
    ]


# --- 3. Period Warning (22-day rule) ---

@router.get("/check-period", response_model=PeriodCheckResponse)
async def check_period_entry(
    year: int,
    month: int,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Check if data entry is allowed for a given month/year.
    Looks up period_master for (month, year), gets end_date.
    If current_date - end_date > 22 days, data entry is NOT allowed.
    """
    stmt = select(PeriodMaster).where(
        and_(
            PeriodMaster.month == month,
            PeriodMaster.year == year,
        )
    )
    result = await db.execute(stmt)
    period = result.scalar_one_or_none()

    if not period:
        return PeriodCheckResponse(
            allowed=False,
            message=f"No period found for {month}/{year}",
        )

    today = date.today()
    end_dt = period.end_date
    if isinstance(end_dt, datetime):
        end_dt = end_dt.date()

    delta = (today - end_dt).days

    if delta > 22:
        return PeriodCheckResponse(
            allowed=False,
            message="Cannot enter the data for this period. The 22-day window after the period end date has been exceeded.",
            end_date=str(end_dt),
            days_exceeded=delta - 22,
        )

    return PeriodCheckResponse(
        allowed=True,
        message="Data entry is allowed for this period.",
        end_date=str(end_dt),
        days_exceeded=0,
    )


# --- 4. Budget from financial_fact ---

@router.get("/budget-data/{company_id}/{year}/{month}", response_model=Optional[BudgetFactResponse])
async def get_budget_from_fact(
    company_id: str,
    year: int,
    month: int,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get budget data from financial_fact table.
    Joins period_master + financial_fact + company_master.
    Filters: company_id, year/month -> period_id, actual_budget='budget'.
    Returns metric_id -> amount mapping.
    """
    if not await can_access_company(db, user, company_id):
        raise HTTPException(status_code=403, detail="Access denied to this company")

    # Get period_id
    period_stmt = select(PeriodMaster).where(
        and_(PeriodMaster.year == year, PeriodMaster.month == month)
    )
    period_result = await db.execute(period_stmt)
    period = period_result.scalar_one_or_none()

    if not period:
        return None

    # Get budget rows from financial_fact
    fact_stmt = select(FinancialFact).where(
        and_(
            FinancialFact.company_id == company_id,
            FinancialFact.period_id == period.period_id,
            FinancialFact.actual_budget == "budget",
        )
    )
    fact_result = await db.execute(fact_stmt)
    facts = fact_result.scalars().all()

    if not facts:
        return None

    metrics = {}
    for f in facts:
        metrics[f.metric_id] = float(f.amount) if f.amount is not None else 0.0

    return BudgetFactResponse(
        company_id=company_id,
        period_id=period.period_id,
        year=year,
        month=month,
        metrics=metrics,
    )


# --- 5. Save Actuals to financial_fact + financial_workflow ---

@router.post("/save-actuals")
async def save_actual_data(
    data: SaveActualsRequest,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Save actual data to financial_fact table and update financial_workflow.

    For each metric field, upserts into financial_fact with actual_budget='actual'.
    Updates financial_workflow:
      - status_id = 2 (Submitted) if is_submit=True, else 1 (Draft)
      - submitted_by = current user email
      - submitted_date = current datetime
      - actual_comment = user comment
    """
    if not await can_access_company(db, user, data.company_id):
        raise HTTPException(status_code=403, detail="Access denied to this company")

    # Get period_id
    period_stmt = select(PeriodMaster).where(
        and_(PeriodMaster.year == data.year, PeriodMaster.month == data.month)
    )
    period_result = await db.execute(period_stmt)
    period = period_result.scalar_one_or_none()

    if not period:
        raise HTTPException(status_code=404, detail=f"No period found for {data.month}/{data.year}")

    # Build metric values from request fields
    metric_values = {
        MetricID.REVENUE: data.revenue,
        MetricID.GP: data.gp,
        MetricID.OTHER_INCOME: data.other_income,
        MetricID.PERSONAL_EXP: data.personal_exp,
        MetricID.ADMIN_EXP: data.admin_exp,
        MetricID.SELLING_EXP: data.selling_exp,
        MetricID.FINANCE_EXP: data.finance_exp,
        MetricID.DEPRECIATION: data.depreciation,
        MetricID.PROVISIONS: data.provisions,
        MetricID.EXCHANGE_VARIANCE: data.exchange_gl,
        MetricID.NON_OPS_EXP: data.non_ops_exp,
        MetricID.NON_OPS_INCOME: data.non_ops_income,
    }

    # Also calculate and store derived metrics
    total_overhead = data.personal_exp + data.admin_exp + data.selling_exp + data.finance_exp + data.depreciation
    pbt_before = (data.gp + data.other_income) - total_overhead + data.provisions + data.exchange_gl
    pbt_after = pbt_before + data.non_ops_income - data.non_ops_exp
    gp_margin = (data.gp / data.revenue * 100) if data.revenue != 0 else 0
    np_margin = (pbt_before / data.revenue * 100) if data.revenue != 0 else 0
    ebit = pbt_before + data.finance_exp
    ebitda = ebit + data.depreciation

    metric_values[MetricID.GP_MARGIN] = gp_margin
    metric_values[MetricID.TOTAL_OVERHEAD] = total_overhead
    metric_values[MetricID.PBT_BEFORE_NON_OPS] = pbt_before
    metric_values[MetricID.PBT_AFTER_NON_OPS] = pbt_after
    metric_values[MetricID.NP_MARGIN] = np_margin
    metric_values[MetricID.EBIT] = ebit
    metric_values[MetricID.EBITDA] = ebitda

    # Upsert each metric into financial_fact
    for metric_id, amount in metric_values.items():
        existing_stmt = select(FinancialFact).where(
            and_(
                FinancialFact.company_id == data.company_id,
                FinancialFact.period_id == period.period_id,
                FinancialFact.metric_id == int(metric_id),
                FinancialFact.actual_budget == "actual",
            )
        )
        existing_result = await db.execute(existing_stmt)
        existing = existing_result.scalar_one_or_none()

        if existing:
            existing.amount = amount
        else:
            new_fact = FinancialFact(
                company_id=data.company_id,
                period_id=period.period_id,
                metric_id=int(metric_id),
                actual_budget="actual",
                amount=amount,
            )
            db.add(new_fact)

    # Upsert financial_workflow
    wf_stmt = select(FinancialWorkflow).where(
        and_(
            FinancialWorkflow.company_id == data.company_id,
            FinancialWorkflow.period_id == period.period_id,
        )
    )
    wf_result = await db.execute(wf_stmt)
    workflow = wf_result.scalar_one_or_none()

    now = datetime.utcnow()
    target_status = StatusID.SUBMITTED if data.is_submit else StatusID.DRAFT

    if workflow:
        workflow.status_id = int(target_status)
        workflow.submitted_by = user.user_email
        workflow.submitted_date = now
        if data.comment is not None:
            workflow.actual_comment = data.comment
    else:
        workflow = FinancialWorkflow(
            company_id=data.company_id,
            period_id=period.period_id,
            status_id=int(target_status),
            submitted_by=user.user_email,
            submitted_date=now,
            actual_comment=data.comment,
        )
        db.add(workflow)

    await db.commit()

    action = "submitted" if data.is_submit else "saved as draft"
    return {
        "success": True,
        "message": f"Actual data {action} successfully",
        "company_id": data.company_id,
        "period_id": period.period_id,
        "status_id": int(target_status),
        "metrics_saved": len(metric_values),
    }


# ============================================================
# ACTUAL ENTRY API CONTRACT (v2)
# Exact request/response models for frontend integration
# ============================================================


class ActualEntryClusterOption(BaseModel):
    cluster_id: str
    cluster_name: str


class ActualEntryClusterDropdownResponse(BaseModel):
    items: List[ActualEntryClusterOption]


class ActualEntryCompanyOption(BaseModel):
    company_id: str
    company_name: str
    cluster_id: str


class ActualEntryCompanyDropdownResponse(BaseModel):
    items: List[ActualEntryCompanyOption]


class ActualEntryBudgetFetchResponse(BaseModel):
    company_id: str
    company_name: str
    period_id: int
    year: int
    month: int
    metric_id: int
    actual_budget: Literal["BUDGET"] = "BUDGET"
    amount: Optional[Decimal] = None


class ActualEntryMetricAmountIn(BaseModel):
    metric_id: int = Field(..., ge=1)
    amount: Decimal


class ActualEntrySaveRequest(BaseModel):
    company_id: str = Field(min_length=1, max_length=20)
    year: int = Field(..., ge=2000, le=2100)
    month: int = Field(..., ge=1, le=12)
    metrics: List[ActualEntryMetricAmountIn] = Field(min_length=1)
    actual_comment: Optional[str] = Field(default=None, max_length=2000)


class ActualEntrySaveDraftResponse(BaseModel):
    company_id: str
    period_id: int
    status_id: Literal[1]
    status_name: Literal["DRAFT"]
    saved_metrics: int
    updated_at: datetime


class ActualEntrySubmitResponse(BaseModel):
    company_id: str
    period_id: int
    status_id: Literal[2]
    status_name: Literal["SUBMITTED"]
    submitted_by: str
    submitted_date: datetime
    saved_metrics: int


def _ensure_finance_officer_or_admin(user: UserMaster) -> None:
    allowed = {int(RoleID.FINANCIAL_OFFICER), int(RoleID.SYSTEM_ADMIN)}
    if getattr(user, "current_role_id", None) not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Finance Officer or Admin access required",
        )


async def _ensure_fo_company_access(
    db: AsyncSession,
    user: UserMaster,
    company_id: str,
) -> None:
    stmt = (
        select(UserCompanyRoleMap.company_id)
        .join(
            CompanyMaster,
            and_(
                UserCompanyRoleMap.company_id == CompanyMaster.company_id,
                CompanyMaster.is_active == True,
            ),
        )
        .where(
            and_(
                UserCompanyRoleMap.user_id == user.user_id,
                UserCompanyRoleMap.company_id == company_id,
                UserCompanyRoleMap.is_active == True,
                UserCompanyRoleMap.role_id.in_(
                    [int(RoleID.FINANCIAL_OFFICER), int(RoleID.SYSTEM_ADMIN)]
                ),
            )
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied to company {company_id}",
        )


async def _get_period_with_guard(
    db: AsyncSession,
    year: int,
    month: int,
) -> PeriodMaster:
    period_result = await db.execute(
        select(PeriodMaster).where(
            and_(
                PeriodMaster.year == year,
                PeriodMaster.month == month,
            )
        )
    )
    period = period_result.scalar_one_or_none()
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No period found for month={month}, year={year}",
        )

    days_after_end = (date.today() - period.end_date).days
    if days_after_end > 22:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot enter the data this period",
        )

    return period


async def _save_actual_entry(
    db: AsyncSession,
    user: UserMaster,
    payload: ActualEntrySaveRequest,
    target_status_id: int,
) -> tuple[int, int, datetime]:
    _ensure_finance_officer_or_admin(user)
    await _ensure_fo_company_access(db, user, payload.company_id)
    period = await _get_period_with_guard(db, payload.year, payload.month)

    metric_values = {int(item.metric_id): item.amount for item in payload.metrics}
    if not metric_values:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one metric value is required",
        )

    now = datetime.now(timezone.utc)

    try:
        for metric_id, amount in metric_values.items():
            upsert_fact = (
                insert(FinancialFact)
                .values(
                    company_id=payload.company_id,
                    period_id=period.period_id,
                    metric_id=metric_id,
                    actual_budget="ACTUAL",
                    amount=amount,
                )
                .on_conflict_do_update(
                    index_elements=[
                        FinancialFact.company_id,
                        FinancialFact.period_id,
                        FinancialFact.metric_id,
                        FinancialFact.actual_budget,
                    ],
                    set_={"amount": amount},
                )
            )
            await db.execute(upsert_fact)

        workflow_insert = insert(FinancialWorkflow).values(
            company_id=payload.company_id,
            period_id=period.period_id,
            status_id=target_status_id,
            submitted_by=user.user_email if target_status_id == int(StatusID.SUBMITTED) else None,
            submitted_date=now if target_status_id == int(StatusID.SUBMITTED) else None,
            actual_comment=payload.actual_comment,
        )

        workflow_updates = {
            "status_id": target_status_id,
            "actual_comment": payload.actual_comment,
        }
        if target_status_id == int(StatusID.SUBMITTED):
            workflow_updates["submitted_by"] = user.user_email
            workflow_updates["submitted_date"] = now

        workflow_upsert = workflow_insert.on_conflict_do_update(
            index_elements=[FinancialWorkflow.company_id, FinancialWorkflow.period_id],
            set_=workflow_updates,
        )
        await db.execute(workflow_upsert)
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    return period.period_id, len(metric_values), now


@router.get(
    "/actual-entry/clusters",
    response_model=ActualEntryClusterDropdownResponse,
)
async def get_actual_entry_clusters(
    user: UserMaster = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    _ensure_finance_officer_or_admin(user)

    stmt = (
        select(ClusterMaster.cluster_id, ClusterMaster.cluster_name)
        .select_from(UserMaster)
        .join(
            UserCompanyRoleMap,
            and_(
                UserMaster.user_id == UserCompanyRoleMap.user_id,
                UserCompanyRoleMap.is_active == True,
                UserCompanyRoleMap.role_id.in_(
                    [int(RoleID.FINANCIAL_OFFICER), int(RoleID.SYSTEM_ADMIN)]
                ),
            ),
        )
        .join(
            CompanyMaster,
            and_(
                UserCompanyRoleMap.company_id == CompanyMaster.company_id,
                CompanyMaster.is_active == True,
            ),
        )
        .join(
            ClusterMaster,
            and_(
                CompanyMaster.cluster_id == ClusterMaster.cluster_id,
                ClusterMaster.is_active == True,
            ),
        )
        .where(
            and_(
                UserMaster.user_id == user.user_id,
                UserMaster.is_active == True,
            )
        )
        .distinct()
        .order_by(ClusterMaster.cluster_name)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return ActualEntryClusterDropdownResponse(
        items=[
            ActualEntryClusterOption(
                cluster_id=row.cluster_id,
                cluster_name=row.cluster_name,
            )
            for row in rows
        ]
    )


@router.get(
    "/actual-entry/companies",
    response_model=ActualEntryCompanyDropdownResponse,
)
async def get_actual_entry_companies(
    cluster_id: Optional[str] = None,
    user: UserMaster = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    _ensure_finance_officer_or_admin(user)

    stmt = (
        select(
            CompanyMaster.company_id,
            CompanyMaster.company_name,
            CompanyMaster.cluster_id,
        )
        .select_from(UserMaster)
        .join(
            UserCompanyRoleMap,
            and_(
                UserMaster.user_id == UserCompanyRoleMap.user_id,
                UserCompanyRoleMap.is_active == True,
                UserCompanyRoleMap.role_id.in_(
                    [int(RoleID.FINANCIAL_OFFICER), int(RoleID.SYSTEM_ADMIN)]
                ),
            ),
        )
        .join(
            CompanyMaster,
            and_(
                UserCompanyRoleMap.company_id == CompanyMaster.company_id,
                CompanyMaster.is_active == True,
            ),
        )
        .where(
            and_(
                UserMaster.user_id == user.user_id,
                UserMaster.is_active == True,
            )
        )
    )
    if cluster_id:
        stmt = stmt.where(CompanyMaster.cluster_id == cluster_id)

    stmt = stmt.distinct().order_by(CompanyMaster.company_name)
    result = await db.execute(stmt)
    rows = result.all()
    return ActualEntryCompanyDropdownResponse(
        items=[
            ActualEntryCompanyOption(
                company_id=row.company_id,
                company_name=row.company_name,
                cluster_id=row.cluster_id,
            )
            for row in rows
        ]
    )


@router.get(
    "/actual-entry/budget",
    response_model=ActualEntryBudgetFetchResponse,
)
async def get_actual_entry_budget(
    company_id: str,
    year: int,
    month: int,
    metric_id: int = 1,
    user: UserMaster = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    _ensure_finance_officer_or_admin(user)
    await _ensure_fo_company_access(db, user, company_id)

    stmt = (
        select(
            FinancialFact.company_id,
            CompanyMaster.company_name,
            FinancialFact.period_id,
            PeriodMaster.year,
            PeriodMaster.month,
            FinancialFact.metric_id,
            FinancialFact.actual_budget,
            FinancialFact.amount,
        )
        .join(PeriodMaster, FinancialFact.period_id == PeriodMaster.period_id)
        .join(CompanyMaster, FinancialFact.company_id == CompanyMaster.company_id)
        .where(
            and_(
                FinancialFact.company_id == company_id,
                PeriodMaster.year == year,
                PeriodMaster.month == month,
                FinancialFact.metric_id == metric_id,
                func.upper(FinancialFact.actual_budget) == "BUDGET",
                CompanyMaster.is_active == True,
            )
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget data not found for the selected company/period/metric",
        )

    return ActualEntryBudgetFetchResponse(
        company_id=row.company_id,
        company_name=row.company_name,
        period_id=row.period_id,
        year=row.year,
        month=row.month,
        metric_id=row.metric_id,
        actual_budget="BUDGET",
        amount=row.amount,
    )


@router.post(
    "/actual-entry/draft",
    response_model=ActualEntrySaveDraftResponse,
)
async def save_actual_entry_draft(
    payload: ActualEntrySaveRequest,
    user: UserMaster = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    period_id, saved_metrics, updated_at = await _save_actual_entry(
        db=db,
        user=user,
        payload=payload,
        target_status_id=int(StatusID.DRAFT),
    )

    return ActualEntrySaveDraftResponse(
        company_id=payload.company_id,
        period_id=period_id,
        status_id=1,
        status_name="DRAFT",
        saved_metrics=saved_metrics,
        updated_at=updated_at,
    )


@router.post(
    "/actual-entry/submit",
    response_model=ActualEntrySubmitResponse,
)
async def submit_actual_entry(
    payload: ActualEntrySaveRequest,
    user: UserMaster = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    period_id, saved_metrics, submitted_at = await _save_actual_entry(
        db=db,
        user=user,
        payload=payload,
        target_status_id=int(StatusID.SUBMITTED),
    )

    return ActualEntrySubmitResponse(
        company_id=payload.company_id,
        period_id=period_id,
        status_id=2,
        status_name="SUBMITTED",
        submitted_by=user.user_email,
        submitted_date=submitted_at,
        saved_metrics=saved_metrics,
    )
