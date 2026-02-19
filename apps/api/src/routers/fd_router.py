"""
Finance Director (FD/Company Director) Router
Endpoints for reviewing and approving/rejecting reports

Endpoints:
- GET  /fd/pending              - Pending review queue (SUBMITTED reports)
- GET  /fd/reports              - All reports for assigned companies
- GET  /fd/reports/{id}         - Get report detail with financials
- POST /fd/reports/{id}/approve - Approve report
- POST /fd/reports/{id}/reject  - Reject report with reason
- POST /fd/reports/{id}/comment - Add comment to report
- GET  /fd/dashboard            - Summary statistics for FD
"""
from datetime import datetime
from typing import Optional, List, Dict

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from src.db.models import (
    User, UserRole, Company, Report, ReportStatus, ReportComment,
    FinancialMonthly, Scenario, ReportStatusHistory, Notification, NotificationType,
    FinancialWorkflow, FinancialFact, CompanyMaster, ClusterMaster, PeriodMaster,
    UserCompanyRoleMap, UserMaster,
)
from src.config.constants import MetricID, StatusID, RoleID
from src.security.middleware import (
    get_db, get_current_active_user, require_fd
)
from src.security.permissions import (
    can_access_company, get_accessible_company_ids,
    has_permission, Permission
)
from src.services.company_service import CompanyService
from src.services.workflow_service import WorkflowService

router = APIRouter(prefix="/fd", tags=["Finance Director"])


# ============ REQUEST/RESPONSE MODELS ============

class PendingReportSummary(BaseModel):
    """Report summary for pending review queue"""
    id: str
    company_id: str
    company_name: str
    company_code: str
    cluster_name: Optional[str]
    year: int
    month: int
    month_name: str
    status: str
    submitted_by_name: str
    submitted_by_email: str
    submitted_at: datetime
    fo_comment: Optional[str]
    days_pending: int  # Days since submission


class ReportDetailFD(BaseModel):
    """Full report detail for FD review"""
    id: str
    company_id: str
    company_name: str
    company_code: str
    cluster_name: Optional[str]
    year: int
    month: int
    status: str
    fo_comment: Optional[str]
    submitted_by: Optional[dict]
    submitted_at: Optional[datetime]
    actual: Optional[dict]  # Financial data
    budget: Optional[dict]  # Budget for comparison
    variance: Optional[dict]  # Budget vs Actual variance
    comments: List[dict]
    status_history: List[dict]
    can_approve: bool
    can_reject: bool


class ApproveRequest(BaseModel):
    """Request to approve a report"""
    comment: Optional[str] = Field(None, description="Optional approval comment")


class RejectRequest(BaseModel):
    """Request to reject a report"""
    reason: str = Field(..., min_length=10, max_length=1000, 
                        description="Reason for rejection (required)")


class AddCommentRequest(BaseModel):
    """Request to add a comment"""
    content: str = Field(..., min_length=1, max_length=2000)


class FDDashboardStats(BaseModel):
    """Dashboard statistics for FD"""
    pending_review: int
    approved_this_month: int
    rejected_this_month: int
    total_companies: int
    companies_submitted: int
    companies_pending: int


class PendingReviewResponse(BaseModel):
    reports: List[PendingReportSummary]
    total: int


class ReportListResponse(BaseModel):
    reports: List[PendingReportSummary]
    total: int


# ============ HELPER FUNCTIONS ============

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]


async def build_financial_response(fm: FinancialMonthly) -> dict:
    """Convert FinancialMonthly to dict with computed fields"""
    if not fm:
        return None
    
    exchange_rate = fm.exchange_rate if fm.exchange_rate and fm.exchange_rate > 0 else 1
    revenue_usd = fm.revenue_lkr / exchange_rate
    gp_margin = fm.gp / fm.revenue_lkr if fm.revenue_lkr and fm.revenue_lkr != 0 else 0
    total_overheads = fm.personal_exp + fm.admin_exp + fm.selling_exp + fm.finance_exp + fm.depreciation
    pbt_before = fm.gp + fm.other_income - total_overheads + fm.provisions + fm.exchange_gl
    np_margin = pbt_before / fm.revenue_lkr if fm.revenue_lkr and fm.revenue_lkr != 0 else 0
    pbt_after = pbt_before - fm.non_ops_exp + fm.non_ops_income
    ebit = pbt_before + fm.finance_exp
    ebitda = pbt_before + fm.finance_exp + fm.depreciation
    
    return {
        "id": str(fm.id),
        "company_id": str(fm.company_id),
        "year": fm.year,
        "month": fm.month,
        "scenario": fm.scenario.value if hasattr(fm.scenario, 'value') else str(fm.scenario),
        "exchange_rate": fm.exchange_rate,
        "revenue_lkr": fm.revenue_lkr,
        "revenue_usd": revenue_usd,
        "gp": fm.gp,
        "gp_margin": gp_margin,
        "gp_margin_pct": round(gp_margin * 100, 2),
        "other_income": fm.other_income,
        "personal_exp": fm.personal_exp,
        "admin_exp": fm.admin_exp,
        "selling_exp": fm.selling_exp,
        "finance_exp": fm.finance_exp,
        "depreciation": fm.depreciation,
        "total_overheads": total_overheads,
        "provisions": fm.provisions,
        "exchange_gl": fm.exchange_gl,
        "pbt_before": pbt_before,
        "np_margin": np_margin,
        "np_margin_pct": round(np_margin * 100, 2),
        "non_ops_exp": fm.non_ops_exp,
        "non_ops_income": fm.non_ops_income,
        "pbt_after": pbt_after,
        "ebit": ebit,
        "ebitda": ebitda,
        "updated_at": fm.updated_at.isoformat() if fm.updated_at else None
    }


def calculate_variance(actual: dict, budget: dict) -> dict:
    """Calculate variance between actual and budget"""
    if not actual or not budget:
        return None
    
    variance = {}
    
    numeric_fields = [
        "revenue_lkr", "revenue_usd", "gp", "other_income",
        "personal_exp", "admin_exp", "selling_exp", "finance_exp",
        "depreciation", "total_overheads", "pbt_before", "pbt_after",
        "ebit", "ebitda"
    ]
    
    for field in numeric_fields:
        actual_val = actual.get(field, 0) or 0
        budget_val = budget.get(field, 0) or 0
        
        diff = actual_val - budget_val
        pct = ((actual_val / budget_val) - 1) * 100 if budget_val != 0 else 0
        
        variance[field] = {
            "actual": actual_val,
            "budget": budget_val,
            "difference": diff,
            "percentage": round(pct, 2),
            "favorable": diff >= 0 if field in ["revenue_lkr", "gp", "pbt_before", "pbt_after"] else diff <= 0
        }
    
    # Add margin comparisons
    actual_gp_margin = actual.get("gp_margin_pct", 0)
    budget_gp_margin = budget.get("gp_margin_pct", 0)
    variance["gp_margin"] = {
        "actual": actual_gp_margin,
        "budget": budget_gp_margin,
        "difference": actual_gp_margin - budget_gp_margin,
        "favorable": actual_gp_margin >= budget_gp_margin
    }
    
    return variance


async def get_submitter_info(db: AsyncSession, user_id: str) -> Optional[dict]:
    """Get submitter user info"""
    if not user_id:
        return None
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        return None
    
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, 'value') else str(user.role)
    }


# ============ ENDPOINTS ============


class FDCompanyInfo(BaseModel):
    """Company summary returned by GET /fd/companies"""
    id: str
    name: str
    code: str
    cluster_name: Optional[str] = None
    fy_start_month: int = 1
    currency: str = "LKR"


@router.get("/companies", response_model=List[FDCompanyInfo])
async def get_fd_companies(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return only the companies assigned to this Financial Director
    via user_company_role_map.  Each FD sees only their own companies.
    """
    # Get the list of company IDs mapped to this FD
    fd_company_ids = await _get_fd_company_ids(db, user.user_id if hasattr(user, 'user_id') else str(user.id))

    if not fd_company_ids:
        return []

    # Fetch full company records for those IDs
    result = await db.execute(
        select(CompanyMaster).where(
            and_(
                CompanyMaster.company_id.in_(fd_company_ids),
                CompanyMaster.is_active == True,
            )
        )
    )
    companies = result.scalars().all()

    # Resolve cluster names in one go
    cluster_ids = {c.cluster_id for c in companies if getattr(c, "cluster_id", None)}
    cluster_map: Dict[str, str] = {}
    if cluster_ids:
        cl_result = await db.execute(
            select(ClusterMaster.cluster_id, ClusterMaster.cluster_name)
            .where(ClusterMaster.cluster_id.in_(cluster_ids))
        )
        cluster_map = {cid: cname for cid, cname in cl_result.all()}

    return [
        FDCompanyInfo(
            id=str(c.company_id),
            name=c.company_name,
            code=c.company_code if hasattr(c, 'company_code') else "",
            cluster_name=cluster_map.get(c.cluster_id),
            fy_start_month=(c.fin_year_start_month or 1) if hasattr(c, 'fin_year_start_month') else 1,
            currency=(c.currency or "LKR") if hasattr(c, 'currency') else "LKR",
        )
        for c in companies
    ]


@router.get("/pending", response_model=PendingReviewResponse)
async def get_pending_reports(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all reports pending FD review.
    Only shows SUBMITTED reports for companies the FD has access to.
    """
    # Get accessible companies
    accessible = await get_accessible_company_ids(db, user)
    
    query = select(Report).join(Company).where(
        Report.status == ReportStatus.SUBMITTED
    ).order_by(Report.submitted_at.asc())  # Oldest first
    
    if accessible is not None:
        if len(accessible) == 0:
            return PendingReviewResponse(reports=[], total=0)
        query = query.where(Report.company_id.in_(accessible))
    
    result = await db.execute(query)
    reports = result.scalars().all()
    
    pending_reports = []
    now = datetime.utcnow()
    
    for report in reports:
        # Get company with cluster
        company_result = await db.execute(
            select(Company).where(Company.id == report.company_id)
        )
        company = company_result.scalar_one_or_none()
        
        # Get cluster name
        cluster_name = None
        if company and company.cluster_id:
            from src.db.models import Cluster
            cluster_result = await db.execute(
                select(Cluster).where(Cluster.id == company.cluster_id)
            )
            cluster = cluster_result.scalar_one_or_none()
            cluster_name = cluster.name if cluster else None
        
        # Get submitter
        submitter_name = "Unknown"
        submitter_email = ""
        if report.submitted_by:
            submitter_result = await db.execute(
                select(User).where(User.id == report.submitted_by)
            )
            submitter = submitter_result.scalar_one_or_none()
            if submitter:
                submitter_name = submitter.name
                submitter_email = submitter.email
        
        # Calculate days pending (handle offset-naive vs offset-aware datetimes)
        days_pending = 0
        if report.submitted_at:
            submitted = report.submitted_at
            if submitted.tzinfo is not None:
                submitted = submitted.replace(tzinfo=None)
            days_pending = (now - submitted).days
        
        pending_reports.append(PendingReportSummary(
            id=str(report.id),
            company_id=str(report.company_id),
            company_name=company.name if company else "Unknown",
            company_code=company.code if company else "",
            cluster_name=cluster_name,
            year=report.year,
            month=report.month,
            month_name=MONTH_NAMES[report.month],
            status=report.status.value if hasattr(report.status, 'value') else str(report.status),
            submitted_by_name=submitter_name,
            submitted_by_email=submitter_email,
            submitted_at=report.submitted_at,
            fo_comment=report.fo_comment,
            days_pending=days_pending
        ))
    
    return PendingReviewResponse(reports=pending_reports, total=len(pending_reports))


@router.get("/reports", response_model=ReportListResponse)
async def get_all_reports(
    status_filter: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    company_id: Optional[str] = None,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all reports for FD's assigned companies with optional filters"""
    accessible = await get_accessible_company_ids(db, user)
    
    query = select(Report).join(Company).order_by(Report.year.desc(), Report.month.desc())
    
    if accessible is not None:
        if len(accessible) == 0:
            return ReportListResponse(reports=[], total=0)
        query = query.where(Report.company_id.in_(accessible))
    
    if status_filter:
        try:
            status_enum = ReportStatus(status_filter)
            query = query.where(Report.status == status_enum)
        except ValueError:
            pass
    
    if year:
        query = query.where(Report.year == year)
    
    if month:
        query = query.where(Report.month == month)
    
    if company_id:
        query = query.where(Report.company_id == company_id)
    
    result = await db.execute(query)
    reports = result.scalars().all()
    
    report_list = []
    now = datetime.utcnow()
    
    for report in reports:
        company_result = await db.execute(
            select(Company).where(Company.id == report.company_id)
        )
        company = company_result.scalar_one_or_none()
        
        # Get cluster
        cluster_name = None
        if company and company.cluster_id:
            from src.db.models import Cluster
            cluster_result = await db.execute(
                select(Cluster).where(Cluster.id == company.cluster_id)
            )
            cluster = cluster_result.scalar_one_or_none()
            cluster_name = cluster.name if cluster else None
        
        # Get submitter
        submitter_name = "Unknown"
        submitter_email = ""
        if report.submitted_by:
            submitter_result = await db.execute(
                select(User).where(User.id == report.submitted_by)
            )
            submitter = submitter_result.scalar_one_or_none()
            if submitter:
                submitter_name = submitter.name
                submitter_email = submitter.email
        
        days_pending = 0
        if report.status == ReportStatus.SUBMITTED and report.submitted_at:
            submitted = report.submitted_at
            if submitted.tzinfo is not None:
                submitted = submitted.replace(tzinfo=None)
            days_pending = (now - submitted).days
        
        report_list.append(PendingReportSummary(
            id=str(report.id),
            company_id=str(report.company_id),
            company_name=company.name if company else "Unknown",
            company_code=company.code if company else "",
            cluster_name=cluster_name,
            year=report.year,
            month=report.month,
            month_name=MONTH_NAMES[report.month],
            status=report.status.value if hasattr(report.status, 'value') else str(report.status),
            submitted_by_name=submitter_name,
            submitted_by_email=submitter_email,
            submitted_at=report.submitted_at,
            fo_comment=report.fo_comment,
            days_pending=days_pending
        ))
    
    return ReportListResponse(reports=report_list, total=len(report_list))


@router.get("/reports/{report_id}", response_model=ReportDetailFD)
async def get_report_for_review(
    report_id: str,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full report detail for FD review"""
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
    
    # Get company with cluster
    company_result = await db.execute(
        select(Company).where(Company.id == report.company_id)
    )
    company = company_result.scalar_one_or_none()
    
    cluster_name = None
    if company and company.cluster_id:
        from src.db.models import Cluster
        cluster_result = await db.execute(
            select(Cluster).where(Cluster.id == company.cluster_id)
        )
        cluster = cluster_result.scalar_one_or_none()
        cluster_name = cluster.name if cluster else None
    
    # Get submitter info
    submitter_info = await get_submitter_info(db, report.submitted_by)
    
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
    actual_data = await build_financial_response(actual) if actual else None
    
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
    budget_data = await build_financial_response(budget) if budget else None
    
    # Calculate variance
    variance_data = calculate_variance(actual_data, budget_data) if actual_data and budget_data else None
    
    # Get comments
    comments_result = await db.execute(
        select(ReportComment).where(ReportComment.report_id == report_id)
        .order_by(ReportComment.created_at)
    )
    comments = comments_result.scalars().all()
    
    comments_list = []
    for c in comments:
        commenter_result = await db.execute(select(User).where(User.id == c.user_id))
        commenter = commenter_result.scalar_one_or_none()
        comments_list.append({
            "id": str(c.id),
            "user_id": str(c.user_id),
            "user_name": commenter.name if commenter else "Unknown",
            "user_role": commenter.role.value if commenter else None,
            "content": c.content,
            "is_system": c.is_system if hasattr(c, 'is_system') else False,
            "created_at": c.created_at.isoformat() if c.created_at else None
        })
    
    # Get status history
    history_result = await db.execute(
        select(ReportStatusHistory).where(ReportStatusHistory.report_id == report_id)
        .order_by(ReportStatusHistory.created_at)
    )
    history = history_result.scalars().all()
    
    history_list = []
    for h in history:
        changer_result = await db.execute(select(User).where(User.id == h.changed_by))
        changer = changer_result.scalar_one_or_none()
        history_list.append({
            "from_status": h.from_status.value if h.from_status else None,
            "to_status": h.to_status.value if hasattr(h.to_status, 'value') else str(h.to_status),
            "changed_by": changer.name if changer else "Unknown",
            "reason": h.reason,
            "created_at": h.created_at.isoformat() if h.created_at else None
        })
    
    # Determine permissions
    can_approve = report.status == ReportStatus.SUBMITTED and has_permission(user, Permission.APPROVE_REPORTS)
    can_reject = report.status == ReportStatus.SUBMITTED and has_permission(user, Permission.REJECT_REPORTS)
    
    return ReportDetailFD(
        id=str(report.id),
        company_id=str(report.company_id),
        company_name=company.name if company else "Unknown",
        company_code=company.code if company else "",
        cluster_name=cluster_name,
        year=report.year,
        month=report.month,
        status=report.status.value if hasattr(report.status, 'value') else str(report.status),
        fo_comment=report.fo_comment,
        submitted_by=submitter_info,
        submitted_at=report.submitted_at,
        actual=actual_data,
        budget=budget_data,
        variance=variance_data,
        comments=comments_list,
        status_history=history_list,
        can_approve=can_approve,
        can_reject=can_reject
    )


@router.post("/reports/{report_id}/approve")
async def approve_report(
    report_id: str,
    request: Optional[ApproveRequest] = None,
    background_tasks: BackgroundTasks = None,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Approve a submitted report.
    
    Transitions report from SUBMITTED to APPROVED.
    FO will be notified via in-app notification and email.
    """
    # Check permission
    if not has_permission(user, Permission.APPROVE_REPORTS):
        raise HTTPException(status_code=403, detail="Not authorized to approve reports")
    
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
    if report.status != ReportStatus.SUBMITTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve report in {report.status.value} status. Report must be submitted."
        )
    
    # Add approval comment if provided
    if request and request.comment:
        comment = ReportComment(
            report_id=report_id,
            user_id=user.id,
            content=f"**Approved:** {request.comment}",
            is_system=False,
            created_at=datetime.utcnow()
        )
        db.add(comment)
    
    # Create status history record
    history = ReportStatusHistory(
        report_id=report_id,
        from_status=ReportStatus.SUBMITTED,
        to_status=ReportStatus.APPROVED,
        changed_by=user.id,
        reason=request.comment if request else None,
        created_at=datetime.utcnow()
    )
    db.add(history)
    
    # Use workflow service
    workflow_result = await WorkflowService.approve_report(
        db=db,
        report_id=report_id,
        approver_id=str(user.id),
        background_tasks=background_tasks
    )
    
    if not workflow_result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=workflow_result.get("error", "Failed to approve report")
        )
    
    return {
        "success": True,
        "message": "Report approved successfully",
        "report_id": report_id,
        "new_status": "approved",
        "author_notified": workflow_result.get("author_notified")
    }


@router.post("/reports/{report_id}/reject")
async def reject_report(
    report_id: str,
    request: RejectRequest,
    background_tasks: BackgroundTasks = None,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reject a submitted report with a reason.
    
    Transitions report from SUBMITTED to REJECTED.
    FO will be notified and can edit and resubmit.
    """
    # Check permission
    if not has_permission(user, Permission.REJECT_REPORTS):
        raise HTTPException(status_code=403, detail="Not authorized to reject reports")
    
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
    if report.status != ReportStatus.SUBMITTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject report in {report.status.value} status. Report must be submitted."
        )
    
    # Create status history record
    history = ReportStatusHistory(
        report_id=report_id,
        from_status=ReportStatus.SUBMITTED,
        to_status=ReportStatus.REJECTED,
        changed_by=user.id,
        reason=request.reason,
        created_at=datetime.utcnow()
    )
    db.add(history)
    
    # Use workflow service
    workflow_result = await WorkflowService.reject_report(
        db=db,
        report_id=report_id,
        rejector_id=str(user.id),
        reason=request.reason,
        background_tasks=background_tasks
    )
    
    if not workflow_result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=workflow_result.get("error", "Failed to reject report")
        )
    
    return {
        "success": True,
        "message": "Report rejected",
        "report_id": report_id,
        "new_status": "rejected",
        "rejection_reason": request.reason,
        "author_notified": workflow_result.get("author_notified")
    }


@router.post("/reports/{report_id}/comment")
async def add_comment(
    report_id: str,
    request: AddCommentRequest,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a comment to a report"""
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
    
    # Create comment
    comment = ReportComment(
        report_id=report_id,
        user_id=user.id,
        content=request.content,
        is_system=False,
        created_at=datetime.utcnow()
    )
    db.add(comment)
    
    # Notify the FO if FD is commenting
    if report.submitted_by and user.id != report.submitted_by:
        notification = Notification(
            user_id=report.submitted_by,
            type=NotificationType.COMMENT_ADDED,
            title="New Comment on Report",
            message=f"{user.name} commented on your report for {report.month}/{report.year}",
            link=f"/finance-officer/reports/{report.id}",
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notification)
    
    await db.commit()
    await db.refresh(comment)
    
    return {
        "success": True,
        "comment_id": str(comment.id),
        "content": comment.content,
        "created_at": comment.created_at.isoformat()
    }


@router.get("/dashboard", response_model=FDDashboardStats)
async def get_fd_dashboard(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard statistics for FD"""
    accessible = await get_accessible_company_ids(db, user)
    
    # Base conditions
    company_filter = True
    if accessible is not None:
        if len(accessible) == 0:
            return FDDashboardStats(
                pending_review=0,
                approved_this_month=0,
                rejected_this_month=0,
                total_companies=0,
                companies_submitted=0,
                companies_pending=0
            )
        company_filter = Report.company_id.in_(accessible)
    
    # Count pending
    pending_result = await db.execute(
        select(func.count(Report.id)).where(
            and_(
                company_filter,
                Report.status == ReportStatus.SUBMITTED
            )
        )
    )
    pending_count = pending_result.scalar() or 0
    
    # Count approved this month
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)
    
    approved_result = await db.execute(
        select(func.count(Report.id)).where(
            and_(
                company_filter,
                Report.status == ReportStatus.APPROVED,
                Report.reviewed_at >= start_of_month
            )
        )
    )
    approved_count = approved_result.scalar() or 0
    
    # Count rejected this month
    rejected_result = await db.execute(
        select(func.count(Report.id)).where(
            and_(
                company_filter,
                Report.status == ReportStatus.REJECTED,
                Report.updated_at >= start_of_month
            )
        )
    )
    rejected_count = rejected_result.scalar() or 0
    
    # Total companies
    if accessible is None:
        total_companies_result = await db.execute(
            select(func.count(Company.id)).where(Company.is_active == True)
        )
    else:
        total_companies_result = await db.execute(
            select(func.count(Company.id)).where(
                and_(
                    Company.id.in_(accessible),
                    Company.is_active == True
                )
            )
        )
    total_companies = total_companies_result.scalar() or 0
    
    # Companies with submitted reports (current month)
    submitted_companies_result = await db.execute(
        select(func.count(func.distinct(Report.company_id))).where(
            and_(
                company_filter,
                Report.year == now.year,
                Report.month == now.month,
                Report.status.in_([ReportStatus.SUBMITTED, ReportStatus.APPROVED])
            )
        )
    )
    companies_submitted = submitted_companies_result.scalar() or 0
    
    # Companies still pending (have DRAFT or no report)
    companies_pending = total_companies - companies_submitted
    
    return FDDashboardStats(
        pending_review=pending_count,
        approved_this_month=approved_count,
        rejected_this_month=rejected_count,
        total_companies=total_companies,
        companies_submitted=companies_submitted,
        companies_pending=max(0, companies_pending)
    )


# ============================================================
# FD ACTUAL REVIEW: Submitted Actuals from financial_workflow
# ============================================================

_METRIC_ID_TO_FIELD: Dict[int, str] = {
    int(MetricID.REVENUE): "revenue",
    int(MetricID.GP): "gp",
    int(MetricID.GP_MARGIN): "gp_margin",
    int(MetricID.OTHER_INCOME): "other_income",
    int(MetricID.PERSONAL_EXP): "personal_exp",
    int(MetricID.ADMIN_EXP): "admin_exp",
    int(MetricID.SELLING_EXP): "selling_exp",
    int(MetricID.FINANCE_EXP): "finance_exp",
    int(MetricID.DEPRECIATION): "depreciation",
    int(MetricID.TOTAL_OVERHEAD): "total_overhead",
    int(MetricID.PROVISIONS): "provisions",
    int(MetricID.EXCHANGE_VARIANCE): "exchange_variance",
    int(MetricID.PBT_BEFORE_NON_OPS): "pbt_before_non_ops",
    int(MetricID.PBT_AFTER_NON_OPS): "pbt_after_non_ops",
    int(MetricID.NON_OPS_EXP): "non_ops_exp",
    int(MetricID.NON_OPS_INCOME): "non_ops_income",
    int(MetricID.NP_MARGIN): "np_margin",
    int(MetricID.EBIT): "ebit",
    int(MetricID.EBITDA): "ebitda",
}


class SubmittedActualItem(BaseModel):
    company_id: str
    company_name: str
    cluster_name: str
    period_id: int
    year: int
    month: int
    status: str
    actual_comment: Optional[str] = None
    budget_comment: Optional[str] = None
    submitted_by: Optional[str] = None
    submitted_date: Optional[datetime] = None
    actual_metrics: Dict[str, Optional[float]] = {}
    budget_metrics: Dict[str, Optional[float]] = {}
    ytd_actual_metrics: Dict[str, Optional[float]] = {}
    ytd_budget_metrics: Dict[str, Optional[float]] = {}
    fin_year_start_month: Optional[int] = None


class SubmittedActualsListResponse(BaseModel):
    reports: List[SubmittedActualItem]
    total: int


class FDApproveActualRequest(BaseModel):
    comment: Optional[str] = None


class FDRejectActualRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=2000)


class FDUpdateCommentsRequest(BaseModel):
    actual_comment: Optional[str] = None
    budget_comment: Optional[str] = None


class CompanyRankResponse(BaseModel):
    company_id: str
    company_name: str
    rank: int
    total_companies: int
    pbt_before_actual: Optional[float] = None
    year: int
    month: int


# ============================================================
# Company Analytics Response Models
# ============================================================


class MonthlyKPI(BaseModel):
    """Single month KPI tile: value + YoY comparison."""
    gp_margin: Optional[float] = None          # GP Margin % for selected month
    gp_margin_yoy: Optional[float] = None       # Change vs same month last year
    gp: Optional[float] = None                  # Gross Profit amount for selected month
    gp_yoy: Optional[float] = None              # Change vs same month last year
    pbt_before: Optional[float] = None          # PBT Before (operational) for selected month
    pbt_before_yoy: Optional[float] = None      # Change vs same month last year
    pbt_achievement: Optional[float] = None     # (Actual PBT / Budget PBT) * 100
    revenue: Optional[float] = None             # Revenue for selected month (used in calculations)


class YearlyKPI(BaseModel):
    """YTD KPI tile: value + YoY comparison across fiscal year to date."""
    ytd_gp_margin: Optional[float] = None       # YTD GP Margin %
    ytd_gp_margin_yoy: Optional[float] = None   # Change vs previous FY same period range
    ytd_gp: Optional[float] = None              # YTD Gross Profit
    ytd_gp_yoy: Optional[float] = None          # Change vs previous FY same period range
    ytd_pbt_before: Optional[float] = None      # YTD PBT Before
    ytd_pbt_before_yoy: Optional[float] = None  # Change vs previous FY same period range
    ytd_pbt_achievement: Optional[float] = None # (YTD Actual PBT / YTD Budget PBT) * 100
    ytd_revenue: Optional[float] = None         # YTD Revenue


class PBTComparisonItem(BaseModel):
    """Single period PBT Before vs After comparison."""
    label: str                                  # e.g. "Jan" or "2024"
    pbt_before: float = 0                       # PBT Before Non-Ops
    pbt_after: float = 0                        # PBT After Non-Ops


class PBTTrendItem(BaseModel):
    """Single point on the PBT Before monthly trend line."""
    label: str                                  # e.g. "Jan"
    month: int
    year: int
    pbt_before: float = 0


class ProfitabilityItem(BaseModel):
    """Single point on profitability margins chart."""
    label: str                                  # Month short name
    gp_margin: float = 0                        # GP Margin % for this month
    np_margin: float = 0                        # Net Profit Margin % (PBT Before / Revenue)


class ExpenseItem(BaseModel):
    """Single category in expense breakdown."""
    name: str                                   # Category name
    value: float = 0                            # Amount
    percentage: float = 0                       # Share of total %
    color: str = "#0b1f3a"                      # Chart colour


class PerformanceCard(BaseModel):
    """Monthly / Yearly performance summary card with Actual vs Budget."""
    actual_pbt: Optional[float] = None
    budget_pbt: Optional[float] = None
    achievement: Optional[float] = None         # (actual / budget) * 100


class CompanyAnalyticsResponse(BaseModel):
    """Full analytics payload for one company + selected period."""
    company_id: str
    company_name: str
    fin_year_start_month: int
    selected_year: int
    selected_month: int
    # Section 1 – Monthly KPIs (4 tiles)
    monthly_kpi: MonthlyKPI
    # Section 2 – Yearly / YTD KPIs (4 tiles)
    yearly_kpi: YearlyKPI
    # Section 3 – PBT Before vs After comparison bars (monthly list)
    pbt_comparison_monthly: List[PBTComparisonItem]
    pbt_comparison_yearly: List[PBTComparisonItem]
    # Section 4 – PBT Before monthly trend line
    pbt_trend: List[PBTTrendItem]
    # Section 5 – Profitability margins line chart
    profitability: List[ProfitabilityItem]
    # Section 6 – Expense breakdown pie chart
    expense_breakdown: List[ExpenseItem]
    # Section 7 – Performance card (monthly + yearly)
    performance_monthly: PerformanceCard
    performance_yearly: PerformanceCard
    # Available financial years for dropdown
    available_fy_labels: List[str]


async def _get_fd_company_ids(db: AsyncSession, user_id: str) -> List[str]:
    """Get company_ids accessible to this FD user via user_company_role_map."""
    stmt = (
        select(UserCompanyRoleMap.company_id)
        .where(
            and_(
                UserCompanyRoleMap.user_id == user_id,
                UserCompanyRoleMap.is_active == True,
            )
        )
        .distinct()
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]


async def _get_ytd_period_ids(
    db: AsyncSession,
    fin_year_start_month: int,
    report_year: int,
    report_month: int,
) -> List[int]:
    """
    Get period_ids from the company's fiscal year start to the report period.

    If report_month >= fin_year_start_month -> FY started this year
    Else -> FY started previous year
    """
    if fin_year_start_month is None:
        fin_year_start_month = 1

    if report_month >= fin_year_start_month:
        fy_start_year = report_year
    else:
        fy_start_year = report_year - 1

    if fy_start_year == report_year:
        condition = and_(
            PeriodMaster.year == report_year,
            PeriodMaster.month >= fin_year_start_month,
            PeriodMaster.month <= report_month,
        )
    else:
        condition = (
            (
                (PeriodMaster.year == fy_start_year)
                & (PeriodMaster.month >= fin_year_start_month)
            )
            | (
                (PeriodMaster.year == report_year)
                & (PeriodMaster.month <= report_month)
            )
        )

    result = await db.execute(
        select(PeriodMaster.period_id).where(condition)
    )
    return [row[0] for row in result.all()]


async def _get_ytd_metrics(
    db: AsyncSession,
    company_id: str,
    period_ids: List[int],
    scenario: str,
) -> Dict[str, Optional[float]]:
    """
    Sum FinancialFact.amount for all given period_ids, grouped by metric_id.
    Then recompute derived/percentage metrics from the raw sums.
    """
    if not period_ids:
        return {}

    rows = (
        await db.execute(
            select(
                FinancialFact.metric_id,
                func.sum(FinancialFact.amount).label("total"),
            )
            .where(
                FinancialFact.company_id == company_id,
                FinancialFact.period_id.in_(period_ids),
                func.upper(FinancialFact.actual_budget) == scenario.upper(),
            )
            .group_by(FinancialFact.metric_id)
        )
    ).all()

    raw: Dict[str, Optional[float]] = {}
    for metric_id, total in rows:
        field_name = _METRIC_ID_TO_FIELD.get(int(metric_id))
        if field_name:
            raw[field_name] = float(total) if total is not None else None

    # Recompute derived metrics from summed raw values
    revenue = raw.get("revenue") or 0
    gp = raw.get("gp") or 0
    other_income = raw.get("other_income") or 0
    personal_exp = raw.get("personal_exp") or 0
    admin_exp = raw.get("admin_exp") or 0
    selling_exp = raw.get("selling_exp") or 0
    finance_exp = raw.get("finance_exp") or 0
    depreciation = raw.get("depreciation") or 0
    provisions = raw.get("provisions") or 0
    exchange_variance = raw.get("exchange_variance") or 0
    non_ops_exp = raw.get("non_ops_exp") or 0
    non_ops_income = raw.get("non_ops_income") or 0

    total_overhead = personal_exp + admin_exp + selling_exp + finance_exp + depreciation
    pbt_before = gp + other_income - total_overhead + provisions + exchange_variance
    pbt_after = pbt_before - non_ops_exp + non_ops_income
    gp_margin = (gp / revenue * 100) if revenue != 0 else 0
    np_margin = (pbt_before / revenue * 100) if revenue != 0 else 0
    ebit = pbt_before + finance_exp
    ebitda = ebit + depreciation

    raw["total_overhead"] = total_overhead
    raw["pbt_before_non_ops"] = pbt_before
    raw["pbt_after_non_ops"] = pbt_after
    raw["gp_margin"] = gp_margin
    raw["np_margin"] = np_margin
    raw["ebit"] = ebit
    raw["ebitda"] = ebitda

    return raw


@router.get("/submitted-actuals", response_model=SubmittedActualsListResponse)
async def get_submitted_actuals(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all actual submissions with status_id=Submitted for companies
    accessible to the current FD user.
    """
    fd_companies = await _get_fd_company_ids(db, user.user_id)
    if not fd_companies:
        return SubmittedActualsListResponse(reports=[], total=0)

    rows = (
        await db.execute(
            select(
                FinancialWorkflow,
                CompanyMaster.company_name,
                ClusterMaster.cluster_name,
                PeriodMaster,
                CompanyMaster.fin_year_start_month,
            )
            .join(CompanyMaster, CompanyMaster.company_id == FinancialWorkflow.company_id)
            .join(ClusterMaster, ClusterMaster.cluster_id == CompanyMaster.cluster_id)
            .join(PeriodMaster, PeriodMaster.period_id == FinancialWorkflow.period_id)
            .where(
                and_(
                    FinancialWorkflow.company_id.in_(fd_companies),
                    FinancialWorkflow.status_id == int(StatusID.SUBMITTED),
                )
            )
            .order_by(FinancialWorkflow.submitted_date.desc())
        )
    ).all()

    reports: List[SubmittedActualItem] = []
    for workflow, company_name, cluster_name, period, fin_year_start_month in rows:
        # Get actual metrics
        actual_rows = (
            await db.execute(
                select(FinancialFact.metric_id, FinancialFact.amount).where(
                    FinancialFact.company_id == workflow.company_id,
                    FinancialFact.period_id == workflow.period_id,
                    func.upper(FinancialFact.actual_budget) == "ACTUAL",
                )
            )
        ).all()

        actual_data: Dict[str, Optional[float]] = {}
        for metric_id, amount in actual_rows:
            field_name = _METRIC_ID_TO_FIELD.get(int(metric_id))
            if field_name:
                actual_data[field_name] = float(amount) if amount is not None else None

        # Get budget metrics for comparison
        budget_rows = (
            await db.execute(
                select(FinancialFact.metric_id, FinancialFact.amount).where(
                    FinancialFact.company_id == workflow.company_id,
                    FinancialFact.period_id == workflow.period_id,
                    func.upper(FinancialFact.actual_budget) == "BUDGET",
                )
            )
        ).all()

        budget_data: Dict[str, Optional[float]] = {}
        for metric_id, amount in budget_rows:
            field_name = _METRIC_ID_TO_FIELD.get(int(metric_id))
            if field_name:
                budget_data[field_name] = float(amount) if amount is not None else None

        # YTD calculation using company's fiscal year start
        ytd_period_ids = await _get_ytd_period_ids(
            db,
            fin_year_start_month=fin_year_start_month,
            report_year=period.year,
            report_month=period.month,
        )
        ytd_actual_data = await _get_ytd_metrics(
            db, workflow.company_id, ytd_period_ids, "ACTUAL"
        )
        ytd_budget_data = await _get_ytd_metrics(
            db, workflow.company_id, ytd_period_ids, "BUDGET"
        )

        reports.append(
            SubmittedActualItem(
                company_id=workflow.company_id,
                company_name=company_name,
                cluster_name=cluster_name,
                period_id=workflow.period_id,
                year=period.year,
                month=period.month,
                status="Submitted",
                actual_comment=workflow.actual_comment,
                budget_comment=workflow.budget_comment,
                submitted_by=workflow.submitted_by,
                submitted_date=workflow.submitted_date,
                actual_metrics=actual_data,
                budget_metrics=budget_data,
                ytd_actual_metrics=ytd_actual_data,
                ytd_budget_metrics=ytd_budget_data,
                fin_year_start_month=fin_year_start_month,
            )
        )

    return SubmittedActualsListResponse(reports=reports, total=len(reports))


@router.post("/approve-actual/{company_id}/{period_id}")
async def approve_actual(
    company_id: str,
    period_id: int,
    request: Optional[FDApproveActualRequest] = None,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Approve a submitted actual report.
    Sets status_id=Approved, approved_by=current user email, approved_date=now.
    """
    fd_companies = await _get_fd_company_ids(db, user.user_id)
    if company_id not in fd_companies:
        raise HTTPException(status_code=403, detail="Access denied to this company")

    workflow = (
        await db.execute(
            select(FinancialWorkflow).where(
                and_(
                    FinancialWorkflow.company_id == company_id,
                    FinancialWorkflow.period_id == period_id,
                )
            )
        )
    ).scalar_one_or_none()

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if workflow.status_id != int(StatusID.SUBMITTED):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve: current status is not Submitted (status_id={workflow.status_id})",
        )

    now = datetime.utcnow()
    workflow.status_id = int(StatusID.APPROVED)
    workflow.approved_by = user.user_email
    workflow.approved_date = now

    # Notify the FO who submitted
    if workflow.submitted_by:
        # Find the user by email to create notification
        fo_user = (
            await db.execute(
                select(UserMaster).where(UserMaster.user_email == workflow.submitted_by)
            )
        ).scalar_one_or_none()

        if fo_user:
            # Get company name for notification
            company = (
                await db.execute(
                    select(CompanyMaster.company_name).where(
                        CompanyMaster.company_id == company_id
                    )
                )
            ).scalar_one_or_none()
            period = (
                await db.execute(
                    select(PeriodMaster).where(PeriodMaster.period_id == period_id)
                )
            ).scalar_one_or_none()

            company_name = company or company_id
            period_label = f"{period.month}/{period.year}" if period else str(period_id)

            notification = Notification(
                user_id=fo_user.user_id,
                type=NotificationType.REPORT_APPROVED,
                title="Actual Report Approved",
                message=f"Your actual report for {company_name} ({period_label}) has been approved by Finance Director.",
                link="/finance-officer/dashboard",
                is_read=False,
                created_at=now,
            )
            db.add(notification)

    await db.commit()

    return {
        "success": True,
        "message": "Actual report approved (submitted to MD)",
        "company_id": company_id,
        "period_id": period_id,
        "new_status": "Approved",
    }


@router.post("/reject-actual/{company_id}/{period_id}")
async def reject_actual(
    company_id: str,
    period_id: int,
    request: FDRejectActualRequest,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reject a submitted actual report and send it back to FO for correction.
    Sets status_id=Rejected, rejected_by, rejected_date, reject_reason.
    Creates a notification for the FO.
    """
    fd_companies = await _get_fd_company_ids(db, user.user_id)
    if company_id not in fd_companies:
        raise HTTPException(status_code=403, detail="Access denied to this company")

    workflow = (
        await db.execute(
            select(FinancialWorkflow).where(
                and_(
                    FinancialWorkflow.company_id == company_id,
                    FinancialWorkflow.period_id == period_id,
                )
            )
        )
    ).scalar_one_or_none()

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if workflow.status_id != int(StatusID.SUBMITTED):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject: current status is not Submitted (status_id={workflow.status_id})",
        )

    now = datetime.utcnow()
    workflow.status_id = int(StatusID.REJECTED)
    workflow.rejected_by = user.user_email
    workflow.rejected_date = now
    workflow.reject_reason = request.reason

    # Notify the FO who submitted
    if workflow.submitted_by:
        fo_user = (
            await db.execute(
                select(UserMaster).where(UserMaster.user_email == workflow.submitted_by)
            )
        ).scalar_one_or_none()

        if fo_user:
            company = (
                await db.execute(
                    select(CompanyMaster.company_name).where(
                        CompanyMaster.company_id == company_id
                    )
                )
            ).scalar_one_or_none()
            period = (
                await db.execute(
                    select(PeriodMaster).where(PeriodMaster.period_id == period_id)
                )
            ).scalar_one_or_none()

            company_name = company or company_id
            period_label = f"{period.month}/{period.year}" if period else str(period_id)

            notification = Notification(
                user_id=fo_user.user_id,
                type=NotificationType.REPORT_REJECTED,
                title="Actual Report Rejected",
                message=f"Your actual report for {company_name} ({period_label}) has been sent back for correction. Reason: {request.reason}",
                link="/finance-officer/rejected-reports",
                is_read=False,
                created_at=now,
            )
            db.add(notification)

    await db.commit()

    return {
        "success": True,
        "message": "Actual report rejected and sent back for correction",
        "company_id": company_id,
        "period_id": period_id,
        "new_status": "Rejected",
        "rejection_reason": request.reason,
    }


@router.put("/update-comments/{company_id}/{period_id}")
async def update_comments(
    company_id: str,
    period_id: int,
    request: FDUpdateCommentsRequest,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update actual_comment and/or budget_comment on a financial workflow."""
    fd_companies = await _get_fd_company_ids(db, user.user_id)
    if company_id not in fd_companies:
        raise HTTPException(status_code=403, detail="Access denied to this company")

    workflow = (
        await db.execute(
            select(FinancialWorkflow).where(
                and_(
                    FinancialWorkflow.company_id == company_id,
                    FinancialWorkflow.period_id == period_id,
                )
            )
        )
    ).scalar_one_or_none()

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if request.actual_comment is not None:
        workflow.actual_comment = request.actual_comment
    if request.budget_comment is not None:
        workflow.budget_comment = request.budget_comment

    await db.commit()

    return {
        "success": True,
        "message": "Comments updated",
        "company_id": company_id,
        "period_id": period_id,
    }


@router.get("/company-rank", response_model=CompanyRankResponse)
async def get_company_rank(
    company_id: str,
    year: int,
    month: int,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Rank the requested company among all FD-accessible companies
    based on monthly PBT Before actual data. Higher PBT = better rank.
    """
    fd_companies = await _get_fd_company_ids(db, user.user_id)
    if not fd_companies:
        raise HTTPException(status_code=404, detail="No accessible companies")

    if company_id not in fd_companies:
        raise HTTPException(status_code=403, detail="Access denied to this company")

    # Get period_id
    period_result = await db.execute(
        select(PeriodMaster.period_id).where(
            and_(PeriodMaster.year == year, PeriodMaster.month == month)
        )
    )
    period_id = period_result.scalar_one_or_none()
    if not period_id:
        raise HTTPException(status_code=404, detail="Period not found")

    # Get PBT Before Actual for all accessible companies
    pbt_rows = (
        await db.execute(
            select(
                FinancialFact.company_id,
                FinancialFact.amount,
            ).where(
                FinancialFact.company_id.in_(fd_companies),
                FinancialFact.period_id == period_id,
                FinancialFact.metric_id == int(MetricID.PBT_BEFORE_NON_OPS),
                func.upper(FinancialFact.actual_budget) == "ACTUAL",
            )
        )
    ).all()

    company_pbts = []
    companies_with_data = set()
    for cid, amount in pbt_rows:
        company_pbts.append((cid, float(amount) if amount is not None else 0.0))
        companies_with_data.add(cid)

    for cid in fd_companies:
        if cid not in companies_with_data:
            company_pbts.append((cid, 0.0))

    company_pbts.sort(key=lambda x: x[1], reverse=True)

    rank = 1
    target_pbt = None
    for i, (cid, pbt) in enumerate(company_pbts):
        if cid == company_id:
            rank = i + 1
            target_pbt = pbt
            break

    company_name_result = await db.execute(
        select(CompanyMaster.company_name).where(
            CompanyMaster.company_id == company_id
        )
    )
    company_name = company_name_result.scalar_one_or_none() or company_id

    return CompanyRankResponse(
        company_id=company_id,
        company_name=company_name,
        rank=rank,
        total_companies=len(company_pbts),
        pbt_before_actual=target_pbt,
        year=year,
        month=month,
    )


# ============================================================
# Company Analytics – Full dashboard data for one company
# ============================================================


async def _get_metric_for_periods(
    db: AsyncSession,
    company_id: str,
    period_ids: List[int],
    metric_id: int,
    scenario: str,
) -> Optional[float]:
    """
    Sum a single metric across given periods for one scenario (ACTUAL/BUDGET).
    Returns None when no rows exist.
    """
    if not period_ids:
        return None

    result = await db.execute(
        select(func.sum(FinancialFact.amount)).where(
            FinancialFact.company_id == company_id,
            FinancialFact.period_id.in_(period_ids),
            FinancialFact.metric_id == metric_id,
            func.upper(FinancialFact.actual_budget) == scenario.upper(),
        )
    )
    val = result.scalar_one_or_none()
    return float(val) if val is not None else None


async def _period_id_for(db: AsyncSession, year: int, month: int) -> Optional[int]:
    """Look up single period_id for a given year+month."""
    result = await db.execute(
        select(PeriodMaster.period_id).where(
            and_(PeriodMaster.year == year, PeriodMaster.month == month)
        )
    )
    return result.scalar_one_or_none()


@router.get("/company-analytics", response_model=CompanyAnalyticsResponse)
async def get_company_analytics(
    company_id: str,
    year: int,
    month: int,
    fy_label: Optional[str] = None,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Full analytics payload for the Company Analytics tab.

    Parameters
    ----------
    company_id : str   – Target company
    year       : int   – Calendar year of the selected month
    month      : int   – Calendar month (1-12) being analysed
    fy_label   : str   – Optional FY label (unused currently, reserved)

    Returns all 7 dashboard sections with real-time calculated values.
    """

    # ── 0. Access control ──────────────────────────────────────
    fd_companies = await _get_fd_company_ids(db, user.user_id)
    if company_id not in fd_companies:
        raise HTTPException(status_code=403, detail="Access denied to this company")

    # ── 1. Load company master for FY start month ──────────────
    company_row = (
        await db.execute(
            select(CompanyMaster).where(CompanyMaster.company_id == company_id)
        )
    ).scalar_one_or_none()
    if not company_row:
        raise HTTPException(status_code=404, detail="Company not found")

    fin_year_start = company_row.fin_year_start_month or 1
    company_name = company_row.company_name

    # ── 2. Resolve period IDs ──────────────────────────────────
    # Current selected period
    current_pid = await _period_id_for(db, year, month)
    # Same month last year (for YoY)
    prev_year_pid = await _period_id_for(db, year - 1, month)

    # YTD period range: FY start → selected month
    ytd_pids = await _get_ytd_period_ids(db, fin_year_start, year, month)
    # YTD same range last year (for YoY)
    ytd_pids_prev = await _get_ytd_period_ids(db, fin_year_start, year - 1, month)

    # ── Helper: fetch single-period metrics ────────────────────
    async def _single(pid: Optional[int], scenario: str) -> Dict[str, Optional[float]]:
        """Fetch all metrics for one period+scenario, return dict."""
        if pid is None:
            return {}
        rows = (
            await db.execute(
                select(FinancialFact.metric_id, FinancialFact.amount).where(
                    FinancialFact.company_id == company_id,
                    FinancialFact.period_id == pid,
                    func.upper(FinancialFact.actual_budget) == scenario.upper(),
                )
            )
        ).all()
        out: Dict[str, Optional[float]] = {}
        for mid, amt in rows:
            fname = _METRIC_ID_TO_FIELD.get(int(mid))
            if fname:
                out[fname] = float(amt) if amt is not None else None
        return out

    # Fetch current-month actuals + budget
    cur_actual = await _single(current_pid, "ACTUAL")
    cur_budget = await _single(current_pid, "BUDGET")
    # Same month last year actuals
    prev_actual = await _single(prev_year_pid, "ACTUAL")

    # ── 3. Monthly KPIs (Section 1) ───────────────────────────
    # GP Margin = (GP / Revenue) * 100
    cur_revenue = cur_actual.get("revenue") or 0
    cur_gp = cur_actual.get("gp") or 0
    cur_gp_margin = (cur_gp / cur_revenue * 100) if cur_revenue else None

    prev_revenue = prev_actual.get("revenue") or 0
    prev_gp = prev_actual.get("gp") or 0
    prev_gp_margin = (prev_gp / prev_revenue * 100) if prev_revenue else None

    # YoY change for GP Margin is difference in percentage points
    gp_margin_yoy = (cur_gp_margin - prev_gp_margin) if (cur_gp_margin is not None and prev_gp_margin is not None) else None
    # YoY change for GP is percentage change
    gp_yoy = (((cur_gp - prev_gp) / abs(prev_gp)) * 100) if prev_gp else None

    # PBT Before – use pre-computed or reconstruct
    cur_pbt_before = cur_actual.get("pbt_before_non_ops")
    if cur_pbt_before is None:
        # Reconstruct: GP + Other Income – Total Overhead + Provisions + Exchange Var
        oh = sum(cur_actual.get(k, 0) or 0 for k in ["personal_exp", "admin_exp", "selling_exp", "finance_exp", "depreciation"])
        cur_pbt_before = cur_gp + (cur_actual.get("other_income") or 0) - oh + (cur_actual.get("provisions") or 0) + (cur_actual.get("exchange_variance") or 0)
    prev_pbt_before = prev_actual.get("pbt_before_non_ops")
    if prev_pbt_before is None:
        oh_prev = sum(prev_actual.get(k, 0) or 0 for k in ["personal_exp", "admin_exp", "selling_exp", "finance_exp", "depreciation"])
        prev_pbt_before = prev_gp + (prev_actual.get("other_income") or 0) - oh_prev + (prev_actual.get("provisions") or 0) + (prev_actual.get("exchange_variance") or 0)
    pbt_before_yoy = (((cur_pbt_before - prev_pbt_before) / abs(prev_pbt_before)) * 100) if prev_pbt_before else None

    # PBT Achievement = Unified Formula:
    # Budget > 0: (Actual / Budget) * 100
    # Budget < 0: (2 - Actual / Budget) * 100
    # i.e. (1 + sign(Budget) * (Actual - Budget) / Budget) * 100
    budget_pbt_before = cur_budget.get("pbt_before_non_ops")
    if budget_pbt_before is None:
        oh_b = sum(cur_budget.get(k, 0) or 0 for k in ["personal_exp", "admin_exp", "selling_exp", "finance_exp", "depreciation"])
        budget_pbt_before = (cur_budget.get("gp") or 0) + (cur_budget.get("other_income") or 0) - oh_b + (cur_budget.get("provisions") or 0) + (cur_budget.get("exchange_variance") or 0)
    if budget_pbt_before and budget_pbt_before != 0:
        sign = 1 if budget_pbt_before >= 0 else -1
        pbt_achievement = (1 + sign * ((cur_pbt_before - budget_pbt_before) / budget_pbt_before)) * 100
    else:
        pbt_achievement = None

    monthly_kpi = MonthlyKPI(
        gp_margin=round(cur_gp_margin, 2) if cur_gp_margin is not None else None,
        gp_margin_yoy=round(gp_margin_yoy, 2) if gp_margin_yoy is not None else None,
        gp=round(cur_gp, 2),
        gp_yoy=round(gp_yoy, 2) if gp_yoy is not None else None,
        pbt_before=round(cur_pbt_before, 2) if cur_pbt_before is not None else None,
        pbt_before_yoy=round(pbt_before_yoy, 2) if pbt_before_yoy is not None else None,
        pbt_achievement=round(pbt_achievement, 2) if pbt_achievement is not None else None,
        revenue=round(cur_revenue, 2),
    )

    # ── 4. Yearly / YTD KPIs (Section 2) ─────────────────────
    ytd_actual = await _get_ytd_metrics(db, company_id, ytd_pids, "ACTUAL")
    ytd_budget = await _get_ytd_metrics(db, company_id, ytd_pids, "BUDGET")
    ytd_prev = await _get_ytd_metrics(db, company_id, ytd_pids_prev, "ACTUAL")

    ytd_revenue = ytd_actual.get("revenue") or 0
    ytd_gp = ytd_actual.get("gp") or 0
    ytd_gp_margin_val = (ytd_gp / ytd_revenue * 100) if ytd_revenue else None

    prev_ytd_rev = ytd_prev.get("revenue") or 0
    prev_ytd_gp = ytd_prev.get("gp") or 0
    prev_ytd_gp_margin = (prev_ytd_gp / prev_ytd_rev * 100) if prev_ytd_rev else None

    ytd_gp_margin_yoy = (ytd_gp_margin_val - prev_ytd_gp_margin) if (ytd_gp_margin_val is not None and prev_ytd_gp_margin is not None) else None
    ytd_gp_yoy_val = (((ytd_gp - prev_ytd_gp) / abs(prev_ytd_gp)) * 100) if prev_ytd_gp else None

    ytd_pbt_before_val = ytd_actual.get("pbt_before_non_ops") or 0
    prev_ytd_pbt = ytd_prev.get("pbt_before_non_ops") or 0
    ytd_pbt_yoy = (((ytd_pbt_before_val - prev_ytd_pbt) / abs(prev_ytd_pbt)) * 100) if prev_ytd_pbt else None

    ytd_budget_pbt = ytd_budget.get("pbt_before_non_ops") or 0
    if ytd_budget_pbt and ytd_budget_pbt != 0:
        ytd_sign = 1 if ytd_budget_pbt >= 0 else -1
        ytd_pbt_ach = (1 + ytd_sign * ((ytd_pbt_before_val - ytd_budget_pbt) / ytd_budget_pbt)) * 100
    else:
        ytd_pbt_ach = None

    yearly_kpi = YearlyKPI(
        ytd_gp_margin=round(ytd_gp_margin_val, 2) if ytd_gp_margin_val is not None else None,
        ytd_gp_margin_yoy=round(ytd_gp_margin_yoy, 2) if ytd_gp_margin_yoy is not None else None,
        ytd_gp=round(ytd_gp, 2),
        ytd_gp_yoy=round(ytd_gp_yoy_val, 2) if ytd_gp_yoy_val is not None else None,
        ytd_pbt_before=round(ytd_pbt_before_val, 2),
        ytd_pbt_before_yoy=round(ytd_pbt_yoy, 2) if ytd_pbt_yoy is not None else None,
        ytd_pbt_achievement=round(ytd_pbt_ach, 2) if ytd_pbt_ach is not None else None,
        ytd_revenue=round(ytd_revenue, 2),
    )

    # ── 5. PBT Before vs After comparison (Section 3) ────────
    # Monthly: fetch all 12 months of selected year
    pbt_comp_monthly: List[PBTComparisonItem] = []
    month_names_short = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    for m in range(1, 13):
        pid = await _period_id_for(db, year, m)
        if pid is None:
            pbt_comp_monthly.append(PBTComparisonItem(label=month_names_short[m], pbt_before=0, pbt_after=0))
            continue
        m_data = await _single(pid, "ACTUAL")
        pb = m_data.get("pbt_before_non_ops")
        if pb is None:
            oh_m = sum(m_data.get(k, 0) or 0 for k in ["personal_exp", "admin_exp", "selling_exp", "finance_exp", "depreciation"])
            pb = (m_data.get("gp") or 0) + (m_data.get("other_income") or 0) - oh_m + (m_data.get("provisions") or 0) + (m_data.get("exchange_variance") or 0)
        pa = m_data.get("pbt_after_non_ops")
        if pa is None:
            pa = (pb or 0) - (m_data.get("non_ops_exp") or 0) + (m_data.get("non_ops_income") or 0)
        pbt_comp_monthly.append(PBTComparisonItem(
            label=month_names_short[m],
            pbt_before=round(pb or 0, 2),
            pbt_after=round(pa or 0, 2),
        ))

    # Yearly: sum per FY for last 3 years using company FY start
    pbt_comp_yearly: List[PBTComparisonItem] = []
    for y_offset in range(2, -1, -1):
        fy_year = year - y_offset
        fy_pids = await _get_ytd_period_ids(db, fin_year_start, fy_year, 12 if fy_year < year else month)
        fy_metrics = await _get_ytd_metrics(db, company_id, fy_pids, "ACTUAL")
        pb_y = fy_metrics.get("pbt_before_non_ops") or 0
        pa_y = fy_metrics.get("pbt_after_non_ops") or 0
        pbt_comp_yearly.append(PBTComparisonItem(
            label=str(fy_year),
            pbt_before=round(pb_y, 2),
            pbt_after=round(pa_y, 2),
        ))

    # ── 6. PBT Before Monthly Trend (Section 4) ──────────────
    # Same 12-month data – reuse from pbt_comp_monthly
    pbt_trend_list: List[PBTTrendItem] = []
    for m in range(1, 13):
        pbt_trend_list.append(PBTTrendItem(
            label=month_names_short[m],
            month=m,
            year=year,
            pbt_before=pbt_comp_monthly[m - 1].pbt_before,
        ))

    # ── 7. Profitability Margins (Section 5) ──────────────────
    profitability_list: List[ProfitabilityItem] = []
    for m in range(1, 13):
        pid = await _period_id_for(db, year, m)
        if pid is None:
            profitability_list.append(ProfitabilityItem(label=month_names_short[m]))
            continue
        m_data = await _single(pid, "ACTUAL")
        m_rev = m_data.get("revenue") or 0
        m_gp = m_data.get("gp") or 0
        m_gp_margin = (m_gp / m_rev * 100) if m_rev else 0
        # NP Margin = PBT Before / Revenue
        m_pbt = m_data.get("pbt_before_non_ops")
        if m_pbt is None:
            oh_m2 = sum(m_data.get(k, 0) or 0 for k in ["personal_exp", "admin_exp", "selling_exp", "finance_exp", "depreciation"])
            m_pbt = m_gp + (m_data.get("other_income") or 0) - oh_m2 + (m_data.get("provisions") or 0) + (m_data.get("exchange_variance") or 0)
        m_np_margin = (m_pbt / m_rev * 100) if m_rev else 0
        profitability_list.append(ProfitabilityItem(
            label=month_names_short[m],
            gp_margin=round(m_gp_margin, 2),
            np_margin=round(m_np_margin, 2),
        ))

    # ── 8. Expense Breakdown (Section 6) ──────────────────────
    # Current month expense categories
    expense_colors = ["#0b1f3a", "#1e40af", "#3b82f6", "#60a5fa", "#93c5fd"]
    expense_cats = [
        ("Personnel", cur_actual.get("personal_exp") or 0),
        ("Admin", cur_actual.get("admin_exp") or 0),
        ("Selling", cur_actual.get("selling_exp") or 0),
        ("Finance", cur_actual.get("finance_exp") or 0),
        ("Depreciation", cur_actual.get("depreciation") or 0),
    ]
    total_exp = sum(v for _, v in expense_cats) or 1  # avoid division by zero
    expense_items: List[ExpenseItem] = []
    for i, (name, val) in enumerate(expense_cats):
        expense_items.append(ExpenseItem(
            name=name,
            value=round(val, 2),
            percentage=round(val / total_exp * 100, 1),
            color=expense_colors[i % len(expense_colors)],
        ))

    # ── 9. Performance Cards (Section 7) ──────────────────────
    # Monthly performance card
    perf_monthly = PerformanceCard(
        actual_pbt=round(cur_pbt_before, 2) if cur_pbt_before is not None else None,
        budget_pbt=round(budget_pbt_before, 2) if budget_pbt_before is not None else None,
        achievement=round(pbt_achievement, 2) if pbt_achievement is not None else None,
    )
    # Yearly performance card
    perf_yearly = PerformanceCard(
        actual_pbt=round(ytd_pbt_before_val, 2),
        budget_pbt=round(ytd_budget_pbt, 2),
        achievement=round(ytd_pbt_ach, 2) if ytd_pbt_ach is not None else None,
    )

    # ── 10. Available FY Labels for dropdown ──────────────────
    # Query distinct years from FinancialFact for this company
    distinct_years_result = await db.execute(
        select(PeriodMaster.year)
        .join(FinancialFact, FinancialFact.period_id == PeriodMaster.period_id)
        .where(FinancialFact.company_id == company_id)
        .distinct()
        .order_by(PeriodMaster.year.desc())
    )
    distinct_years = [row[0] for row in distinct_years_result.all()]
    # Generate FY labels based on fin_year_start
    fy_labels: List[str] = []
    seen = set()
    for y in distinct_years:
        if fin_year_start == 1:
            lbl = f"FY {y}"
        else:
            lbl = f"FY {y}-{str(y + 1)[-2:]}"
        if lbl not in seen:
            fy_labels.append(lbl)
            seen.add(lbl)

    return CompanyAnalyticsResponse(
        company_id=company_id,
        company_name=company_name,
        fin_year_start_month=fin_year_start,
        selected_year=year,
        selected_month=month,
        monthly_kpi=monthly_kpi,
        yearly_kpi=yearly_kpi,
        pbt_comparison_monthly=pbt_comp_monthly,
        pbt_comparison_yearly=pbt_comp_yearly,
        pbt_trend=pbt_trend_list,
        profitability=profitability_list,
        expense_breakdown=expense_items,
        performance_monthly=perf_monthly,
        performance_yearly=perf_yearly,
        available_fy_labels=fy_labels,
    )
