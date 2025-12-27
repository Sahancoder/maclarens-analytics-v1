"""
Workflow Service - Orchestrates report workflow with notifications

This service coordinates:
1. Database updates (Report status, Audit logs)
2. In-app notifications (Notification table)
3. Email notifications (via email provider)

All DB writes happen in a single transaction, emails sent async after commit.
"""
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import BackgroundTasks
import logging

from src.db.models import (
    Report, ReportStatus, ReportComment, AuditLog,
    User, UserRole, Company, Notification
)
from src.config.settings import settings
from src.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class WorkflowService:
    """
    Orchestrates the report approval workflow with full notification support.
    
    Pattern:
    1. Update report status
    2. Create audit log
    3. Create in-app notification
    4. Commit transaction
    5. Send email (async, non-blocking)
    """
    
    @staticmethod
    async def get_report_with_relations(db: AsyncSession, report_id: str) -> Optional[Report]:
        """Get report with company loaded"""
        result = await db.execute(
            select(Report)
            .options(selectinload(Report.company))
            .where(Report.id == UUID(report_id))
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user(db: AsyncSession, user_id: str) -> Optional[User]:
        """Get user by ID"""
        result = await db.execute(
            select(User).where(User.id == UUID(user_id))
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_directors_for_company(db: AsyncSession, company_id: str) -> List[User]:
        """Get all company directors for a company"""
        # Directors can be linked to the company or its cluster
        result = await db.execute(
            select(User).where(
                User.role == UserRole.COMPANY_DIRECTOR,
                User.is_active == True
            )
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_report_author(db: AsyncSession, report: Report) -> Optional[User]:
        """Get the user who submitted the report"""
        if not report.submitted_by:
            return None
        result = await db.execute(
            select(User).where(User.id == report.submitted_by)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_audit_log(
        db: AsyncSession,
        user_id: str,
        action: str,
        entity_type: str,
        entity_id: str,
        details: Optional[str] = None
    ) -> AuditLog:
        """Create an audit log entry"""
        audit = AuditLog(
            user_id=UUID(user_id) if user_id != "system" else None,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details
        )
        db.add(audit)
        return audit
    
    # ============ WORKFLOW ACTIONS ============
    
    @staticmethod
    async def submit_report(
        db: AsyncSession,
        report_id: str,
        user_id: str,
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Dict[str, Any]:
        """
        Submit a report for director review.
        
        1. Update report status to SUBMITTED
        2. Create audit log
        3. Create notification for each director
        4. Send email to directors (async)
        """
        report = await WorkflowService.get_report_with_relations(db, report_id)
        if not report:
            return {"success": False, "error": "Report not found"}
        
        submitter = await WorkflowService.get_user(db, user_id)
        if not submitter:
            return {"success": False, "error": "User not found"}
        
        # Get directors to notify
        directors = await WorkflowService.get_directors_for_company(
            db, str(report.company_id)
        )
        
        # 1. Update report
        report.status = ReportStatus.SUBMITTED
        report.submitted_by = UUID(user_id)
        report.submitted_at = datetime.utcnow()
        report.rejection_reason = None  # Clear any previous rejection
        
        # 2. Create audit log
        await WorkflowService.create_audit_log(
            db=db,
            user_id=user_id,
            action="REPORT_SUBMITTED",
            entity_type="Report",
            entity_id=report_id,
            details=f"Submitted by {submitter.name} for {report.company.name if report.company else 'Unknown'}"
        )
        
        # 3. Create in-app notifications for directors
        company_name = report.company.name if report.company else "Unknown"
        period = f"{report.month}/{report.year}"
        
        for director in directors:
            notification = Notification(
                user_id=director.id,
                title="New Report Submitted",
                message=f"Report for {company_name} ({period}) has been submitted by {submitter.name}",
                link=f"/company-director/reports/{report.id}",
                is_read=False
            )
            db.add(notification)
        
        # 4. Commit all DB changes
        await db.commit()
        await db.refresh(report)
        
        # 5. Send emails asynchronously
        if settings.is_email_enabled and directors:
            if background_tasks:
                background_tasks.add_task(
                    WorkflowService._send_submission_emails,
                    report, submitter, directors
                )
            else:
                # Fallback: send synchronously (not ideal but works)
                await WorkflowService._send_submission_emails(
                    report, submitter, directors
                )
        
        return {
            "success": True,
            "report": report,
            "notifications_created": len(directors),
            "directors_notified": [d.email for d in directors if d.email]
        }
    
    @staticmethod
    async def _send_submission_emails(
        report: Report,
        submitter: User,
        directors: List[User]
    ):
        """Background task: Send submission notification emails"""
        company_name = report.company.name if report.company else "Unknown"
        period = f"{report.month}/{report.year}"
        review_url = f"{settings.app_url}/company-director/reports/{report.id}"
        
        for director in directors:
            if not director.email:
                continue
            try:
                await NotificationService.send_template_email(
                    to=director.email,
                    template_name="report_submitted",
                    variables={
                        "company_name": company_name,
                        "period": period,
                        "submitted_by": submitter.name,
                        "review_url": review_url
                    }
                )
                logger.info(f"Submission email sent to {director.email}")
            except Exception as e:
                logger.error(f"Failed to send email to {director.email}: {e}")
    
    @staticmethod
    async def approve_report(
        db: AsyncSession,
        report_id: str,
        approver_id: str,
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Dict[str, Any]:
        """
        Approve a submitted report.
        
        1. Update report status to APPROVED
        2. Create audit log
        3. Create notification for author
        4. Send email to author (async)
        """
        report = await WorkflowService.get_report_with_relations(db, report_id)
        if not report:
            return {"success": False, "error": "Report not found"}
        
        if report.status != ReportStatus.SUBMITTED:
            return {"success": False, "error": "Report is not in submitted status"}
        
        approver = await WorkflowService.get_user(db, approver_id)
        if not approver:
            return {"success": False, "error": "Approver not found"}
        
        author = await WorkflowService.get_report_author(db, report)
        
        # 1. Update report
        report.status = ReportStatus.APPROVED
        report.approved_by = UUID(approver_id)
        report.approved_at = datetime.utcnow()
        
        # 2. Create audit log
        await WorkflowService.create_audit_log(
            db=db,
            user_id=approver_id,
            action="REPORT_APPROVED",
            entity_type="Report",
            entity_id=report_id,
            details=f"Approved by {approver.name}"
        )
        
        # 3. Create notification for author
        company_name = report.company.name if report.company else "Unknown"
        period = f"{report.month}/{report.year}"
        
        if author:
            notification = Notification(
                user_id=author.id,
                title="Report Approved",
                message=f"Your report for {company_name} ({period}) has been approved by {approver.name}",
                link=f"/data-officer/reports/{report.id}",
                is_read=False
            )
            db.add(notification)
        
        # 4. Commit
        await db.commit()
        await db.refresh(report)
        
        # 5. Send email
        if settings.is_email_enabled and author and author.email:
            if background_tasks:
                background_tasks.add_task(
                    WorkflowService._send_approval_email,
                    report, approver, author
                )
            else:
                await WorkflowService._send_approval_email(report, approver, author)
        
        return {
            "success": True,
            "report": report,
            "author_notified": author.email if author else None
        }
    
    @staticmethod
    async def _send_approval_email(report: Report, approver: User, author: User):
        """Background task: Send approval notification email"""
        company_name = report.company.name if report.company else "Unknown"
        period = f"{report.month}/{report.year}"
        
        try:
            await NotificationService.send_template_email(
                to=author.email,
                template_name="report_approved",
                variables={
                    "company_name": company_name,
                    "period": period,
                    "approved_by": approver.name
                }
            )
            logger.info(f"Approval email sent to {author.email}")
        except Exception as e:
            logger.error(f"Failed to send approval email: {e}")
    
    @staticmethod
    async def reject_report(
        db: AsyncSession,
        report_id: str,
        rejector_id: str,
        reason: str,
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Dict[str, Any]:
        """
        Reject a submitted report with reason.
        
        1. Update report status to REJECTED with reason
        2. Create audit log
        3. Create comment with rejection reason
        4. Create notification for author
        5. Send email to author (async)
        """
        report = await WorkflowService.get_report_with_relations(db, report_id)
        if not report:
            return {"success": False, "error": "Report not found"}
        
        if report.status != ReportStatus.SUBMITTED:
            return {"success": False, "error": "Report is not in submitted status"}
        
        rejector = await WorkflowService.get_user(db, rejector_id)
        if not rejector:
            return {"success": False, "error": "Rejector not found"}
        
        author = await WorkflowService.get_report_author(db, report)
        
        # 1. Update report
        report.status = ReportStatus.REJECTED
        report.rejection_reason = reason
        
        # 2. Create audit log
        await WorkflowService.create_audit_log(
            db=db,
            user_id=rejector_id,
            action="REPORT_REJECTED",
            entity_type="Report",
            entity_id=report_id,
            details=f"Rejected by {rejector.name}. Reason: {reason}"
        )
        
        # 3. Create comment for the rejection
        comment = ReportComment(
            report_id=report.id,
            user_id=UUID(rejector_id),
            content=f"**Rejected:** {reason}"
        )
        db.add(comment)
        
        # 4. Create notification for author
        company_name = report.company.name if report.company else "Unknown"
        period = f"{report.month}/{report.year}"
        
        if author:
            notification = Notification(
                user_id=author.id,
                title="Report Rejected - Action Required",
                message=f"Your report for {company_name} ({period}) was rejected: {reason}",
                link=f"/data-officer/reports/{report.id}/edit",
                is_read=False
            )
            db.add(notification)
        
        # 5. Commit
        await db.commit()
        await db.refresh(report)
        
        # 6. Send email
        if settings.is_email_enabled and author and author.email:
            if background_tasks:
                background_tasks.add_task(
                    WorkflowService._send_rejection_email,
                    report, rejector, author, reason
                )
            else:
                await WorkflowService._send_rejection_email(
                    report, rejector, author, reason
                )
        
        return {
            "success": True,
            "report": report,
            "author_notified": author.email if author else None
        }
    
    @staticmethod
    async def _send_rejection_email(
        report: Report,
        rejector: User,
        author: User,
        reason: str
    ):
        """Background task: Send rejection notification email"""
        company_name = report.company.name if report.company else "Unknown"
        period = f"{report.month}/{report.year}"
        edit_url = f"{settings.app_url}/data-officer/reports/{report.id}/edit"
        
        try:
            await NotificationService.send_template_email(
                to=author.email,
                template_name="report_rejected",
                variables={
                    "company_name": company_name,
                    "period": period,
                    "rejected_by": rejector.name,
                    "rejection_reason": reason,
                    "edit_url": edit_url
                }
            )
            logger.info(f"Rejection email sent to {author.email}")
        except Exception as e:
            logger.error(f"Failed to send rejection email: {e}")
