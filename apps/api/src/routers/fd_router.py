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
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from src.db.models import (
    User, UserRole, Company, Report, ReportStatus, ReportComment,
    FinancialMonthly, Scenario, ReportStatusHistory, Notification, NotificationType
)
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
        
        # Calculate days pending
        days_pending = (now - report.submitted_at).days if report.submitted_at else 0
        
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
            days_pending = (now - report.submitted_at).days
        
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
