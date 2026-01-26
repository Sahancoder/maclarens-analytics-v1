"""
Finance Officer (FO/Data Officer) Router
Endpoints for entering actual financial data and managing reports

Endpoints:
- GET  /fo/companies              - Get assigned company(ies)
- GET  /fo/periods                - Get available periods for entry
- GET  /fo/reports                - My Reports list (all statuses)
- POST /fo/reports                - Create/get draft report for period
- GET  /fo/reports/{id}           - Get report details with financials
- PUT  /fo/reports/{id}/financials - Save actual financial data (auto-save)
- POST /fo/reports/{id}/submit    - Submit report to FD
- GET  /fo/budget/{company_id}/{year}/{month} - Get budget for comparison
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from src.db.models import (
    User, UserRole, Company, Report, ReportStatus, ReportComment,
    FinancialMonthly, Scenario, ReportStatusHistory
)
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
    company_id: UUID,
    year: int,
    month: int,
    user_id: UUID
) -> FinancialMonthly:
    """Get existing or create new actual financial entry"""
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
    
    # Create new
    actual = FinancialMonthly(
        company_id=company_id,
        year=year,
        month=month,
        scenario=Scenario.ACTUAL,
        exchange_rate=1.0,
        revenue_lkr=0,
        gp=0,
        other_income=0,
        personal_exp=0,
        admin_exp=0,
        selling_exp=0,
        finance_exp=0,
        depreciation=0,
        provisions=0,
        exchange_gl=0,
        non_ops_exp=0,
        non_ops_income=0,
        imported_by=user_id,
        imported_at=datetime.utcnow(),
        version=1,
        created_at=datetime.utcnow()
    )
    db.add(actual)
    await db.flush()
    return actual


async def get_or_create_report(
    db: AsyncSession,
    company_id: UUID,
    year: int,
    month: int,
    user_id: UUID
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
    
    return [
        CompanyInfo(
            id=str(c.id),
            name=c.name,
            code=c.code,
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
    if not await can_access_company(db, user, UUID(company_id)):
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
                    FinancialMonthly.company_id == UUID(company_id),
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
                    FinancialMonthly.company_id == UUID(company_id),
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
                    Report.company_id == UUID(company_id),
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
    if not await can_access_company(db, user, UUID(request.company_id)):
        raise HTTPException(status_code=403, detail="Access denied to this company")
    
    # Get or create
    report = await get_or_create_report(
        db,
        UUID(request.company_id),
        request.year,
        request.month,
        user.id
    )
    
    # Also ensure actual entry exists
    await get_or_create_actual(
        db,
        UUID(request.company_id),
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
        select(Report).where(Report.id == UUID(report_id))
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
        select(ReportComment).where(ReportComment.report_id == UUID(report_id))
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
        select(Report).where(Report.id == UUID(report_id))
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
    
    # Get or create actual
    actual = await get_or_create_actual(
        db, report.company_id, report.year, report.month, user.id
    )
    
    # Update all fields
    actual.exchange_rate = data.exchange_rate
    actual.revenue_lkr = data.revenue_lkr
    actual.gp = data.gp
    actual.other_income = data.other_income
    actual.personal_exp = data.personal_exp
    actual.admin_exp = data.admin_exp
    actual.selling_exp = data.selling_exp
    actual.finance_exp = data.finance_exp
    actual.depreciation = data.depreciation
    actual.provisions = data.provisions
    actual.exchange_gl = data.exchange_gl
    actual.non_ops_exp = data.non_ops_exp
    actual.non_ops_income = data.non_ops_income
    actual.updated_at = datetime.utcnow()
    
    # Update FO comment on report
    if data.fo_comment is not None:
        report.fo_comment = data.fo_comment
        report.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(actual)
    
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
        select(Report).where(Report.id == UUID(report_id))
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
    if not await can_access_company(db, user, UUID(company_id)):
        raise HTTPException(status_code=403, detail="Access denied to this company")
    
    result = await db.execute(
        select(FinancialMonthly).where(
            and_(
                FinancialMonthly.company_id == UUID(company_id),
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
