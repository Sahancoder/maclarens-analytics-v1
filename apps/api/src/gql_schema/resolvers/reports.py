"""
Report Resolvers
"""
import strawberry
from typing import List, Optional
from strawberry.types import Info
from fastapi import BackgroundTasks
from src.gql_schema.types import ReportType, ReportComment, ReportStatusEnum
from src.services.report_service import ReportService
from src.services.workflow_service import WorkflowService
from src.db.models import ReportStatus


def db_status_to_enum(status: ReportStatus) -> ReportStatusEnum:
    mapping = {
        ReportStatus.DRAFT: ReportStatusEnum.DRAFT,
        ReportStatus.SUBMITTED: ReportStatusEnum.SUBMITTED,
        ReportStatus.APPROVED: ReportStatusEnum.APPROVED,
        ReportStatus.REJECTED: ReportStatusEnum.REJECTED,
    }
    return mapping.get(status, ReportStatusEnum.DRAFT)


@strawberry.type
class ReportQuery:
    
    @strawberry.field
    async def reports(
        self,
        info: Info,
        status: Optional[ReportStatusEnum] = None,
        company_id: Optional[str] = None,
        year: Optional[int] = None,
        month: Optional[int] = None
    ) -> List[ReportType]:
        db = info.context["db"]
        
        db_status = None
        if status:
            status_mapping = {
                ReportStatusEnum.DRAFT: ReportStatus.DRAFT,
                ReportStatusEnum.SUBMITTED: ReportStatus.SUBMITTED,
                ReportStatusEnum.APPROVED: ReportStatus.APPROVED,
                ReportStatusEnum.REJECTED: ReportStatus.REJECTED,
            }
            db_status = status_mapping.get(status)
        
        reports = await ReportService.get_all_reports(
            db, status=db_status, company_id=company_id, year=year, month=month
        )
        
        return [
            ReportType(
                id=str(r.id),
                company_id=str(r.company_id),
                company_name=r.company.name if r.company else "",
                year=r.year,
                month=r.month,
                status=db_status_to_enum(r.status),
                submitted_at=r.submitted_at,
                approved_at=r.approved_at,
                rejection_reason=r.rejection_reason
            )
            for r in reports
        ]
    
    @strawberry.field
    async def report(self, info: Info, id: str) -> Optional[ReportType]:
        db = info.context["db"]
        
        report = await ReportService.get_report_by_id(db, id)
        if not report:
            return None
        
        return ReportType(
            id=str(report.id),
            company_id=str(report.company_id),
            company_name=report.company.name if report.company else "",
            year=report.year,
            month=report.month,
            status=db_status_to_enum(report.status),
            submitted_at=report.submitted_at,
            approved_at=report.approved_at,
            rejection_reason=report.rejection_reason
        )
    
    @strawberry.field
    async def pending_reports(self, info: Info) -> List[ReportType]:
        db = info.context["db"]
        
        reports = await ReportService.get_all_reports(db, status=ReportStatus.SUBMITTED)
        
        return [
            ReportType(
                id=str(r.id),
                company_id=str(r.company_id),
                company_name=r.company.name if r.company else "",
                year=r.year,
                month=r.month,
                status=db_status_to_enum(r.status),
                submitted_at=r.submitted_at,
                approved_at=r.approved_at,
                rejection_reason=r.rejection_reason
            )
            for r in reports
        ]


@strawberry.type
class ReportMutation:
    
    @strawberry.mutation
    async def create_report(
        self,
        info: Info,
        company_id: str,
        year: int,
        month: int
    ) -> ReportType:
        db = info.context["db"]
        user = info.context.get("user")
        user_id = str(user.id) if user else "system"
        
        report = await ReportService.create_report(db, company_id, year, month, user_id)
        
        return ReportType(
            id=str(report.id),
            company_id=str(report.company_id),
            company_name="",
            year=report.year,
            month=report.month,
            status=db_status_to_enum(report.status),
            submitted_at=report.submitted_at,
            approved_at=report.approved_at,
            rejection_reason=report.rejection_reason
        )
    
    @strawberry.mutation
    async def submit_report(self, info: Info, id: str) -> Optional[ReportType]:
        """
        Submit a report for director review.
        Creates notifications and sends emails to directors.
        """
        db = info.context["db"]
        user = info.context.get("user")
        user_id = str(user.id) if user else "system"
        
        # Get background tasks from request for async email
        request = info.context.get("request")
        background_tasks = getattr(request.state, "background_tasks", None) if request else None
        
        result = await WorkflowService.submit_report(
            db=db,
            report_id=id,
            user_id=user_id,
            background_tasks=background_tasks
        )
        
        if not result.get("success"):
            return None
        
        report = result["report"]
        return ReportType(
            id=str(report.id),
            company_id=str(report.company_id),
            company_name=report.company.name if report.company else "",
            year=report.year,
            month=report.month,
            status=db_status_to_enum(report.status),
            submitted_at=report.submitted_at,
            approved_at=report.approved_at,
            rejection_reason=report.rejection_reason
        )
    
    @strawberry.mutation
    async def approve_report(self, info: Info, id: str) -> Optional[ReportType]:
        """
        Approve a submitted report.
        Creates notification and sends email to the report author.
        """
        db = info.context["db"]
        user = info.context.get("user")
        user_id = str(user.id) if user else "system"
        
        request = info.context.get("request")
        background_tasks = getattr(request.state, "background_tasks", None) if request else None
        
        result = await WorkflowService.approve_report(
            db=db,
            report_id=id,
            approver_id=user_id,
            background_tasks=background_tasks
        )
        
        if not result.get("success"):
            return None
        
        report = result["report"]
        return ReportType(
            id=str(report.id),
            company_id=str(report.company_id),
            company_name=report.company.name if report.company else "",
            year=report.year,
            month=report.month,
            status=db_status_to_enum(report.status),
            submitted_at=report.submitted_at,
            approved_at=report.approved_at,
            rejection_reason=report.rejection_reason
        )
    
    @strawberry.mutation
    async def reject_report(
        self,
        info: Info,
        id: str,
        reason: str
    ) -> Optional[ReportType]:
        """
        Reject a submitted report with a reason.
        Creates notification, comment, and sends email to the author.
        """
        db = info.context["db"]
        user = info.context.get("user")
        user_id = str(user.id) if user else "system"
        
        request = info.context.get("request")
        background_tasks = getattr(request.state, "background_tasks", None) if request else None
        
        result = await WorkflowService.reject_report(
            db=db,
            report_id=id,
            rejector_id=user_id,
            reason=reason,
            background_tasks=background_tasks
        )
        
        if not result.get("success"):
            return None
        
        report = result["report"]
        return ReportType(
            id=str(report.id),
            company_id=str(report.company_id),
            company_name=report.company.name if report.company else "",
            year=report.year,
            month=report.month,
            status=db_status_to_enum(report.status),
            submitted_at=report.submitted_at,
            approved_at=report.approved_at,
            rejection_reason=report.rejection_reason
        )
    
    @strawberry.mutation
    async def add_report_comment(
        self,
        info: Info,
        report_id: str,
        content: str
    ) -> bool:
        db = info.context["db"]
        user = info.context.get("user")
        user_id = str(user.id) if user else "system"
        
        await ReportService.add_comment(db, report_id, user_id, content)
        return True

