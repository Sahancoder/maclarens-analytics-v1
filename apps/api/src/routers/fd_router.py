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
