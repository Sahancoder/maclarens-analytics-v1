"""
Notification Service - Unified Business Logic

Handles:
1. In-app notifications (DB persistence)
2. Email notifications (via configurable provider)
3. Background task support
"""
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import logging

from src.config.settings import settings
from src.db.models import Notification, User, Report, Company
from src.services.email_provider import get_email_provider_instance

logger = logging.getLogger(__name__)


# ============ EMAIL TEMPLATES ============

TEMPLATES = {
    "report_submitted": {
        "subject": "Report Submitted for Review - {company_name}",
        "html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="color: white; margin: 0;">📊 New Report Submitted</h2>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
                <p>A new report has been submitted and requires your review.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Company:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{company_name}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Period:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{period}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Submitted by:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{submitted_by}</td></tr>
                </table>
                <a href="{review_url}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Review Report →</a>
            </div>
            <div style="padding: 15px; text-align: center; color: #6b7280; font-size: 12px;">
                McLarens Analytics System
            </div>
        </div>
        """
    },
    "report_approved": {
        "subject": "✓ Report Approved - {company_name}",
        "html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="color: white; margin: 0;">✓ Report Approved</h2>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
                <p>Great news! Your report has been approved.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Company:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{company_name}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Period:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{period}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Approved by:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{approved_by}</td></tr>
                </table>
            </div>
            <div style="padding: 15px; text-align: center; color: #6b7280; font-size: 12px;">
                McLarens Analytics System
            </div>
        </div>
        """
    },
    "report_rejected": {
        "subject": "⚠️ Report Rejected - Action Required - {company_name}",
        "html": """
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="color: white; margin: 0;">⚠️ Report Rejected</h2>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
                <p>Your report has been rejected and requires revision.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Company:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{company_name}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Period:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{period}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Rejected by:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{rejected_by}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Reason:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; color: #ef4444;">{rejection_reason}</td></tr>
                </table>
                <a href="{edit_url}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Edit Report →</a>
            </div>
            <div style="padding: 15px; text-align: center; color: #6b7280; font-size: 12px;">
                McLarens Analytics System
            </div>
        </div>
        """
    }
}


class NotificationService:
    """
    Unified service for in-app notifications + email.
    Writes to DB first, then sends email asynchronously.
    """
    
    # ============ IN-APP NOTIFICATIONS (DB) ============
    
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: str,
        title: str,
        message: str,
        link: Optional[str] = None
    ) -> Notification:
        """Create an in-app notification (persisted to DB)"""
        notification = Notification(
            user_id=UUID(user_id),
            title=title,
            message=message,
            link=link,
            is_read=False
        )
        db.add(notification)
        await db.flush()  # Get ID without committing (allows transaction grouping)
        return notification
    
    @staticmethod
    async def get_user_notifications(
        db: AsyncSession,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Notification]:
        """Get notifications for a user"""
        query = select(Notification).where(
            Notification.user_id == UUID(user_id)
        ).order_by(Notification.created_at.desc()).limit(limit)
        
        if unread_only:
            query = query.where(Notification.is_read == False)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def mark_as_read(db: AsyncSession, notification_id: str) -> bool:
        """Mark a notification as read"""
        await db.execute(
            update(Notification)
            .where(Notification.id == UUID(notification_id))
            .values(is_read=True)
        )
        await db.commit()
        return True
    
    @staticmethod
    async def mark_all_as_read(db: AsyncSession, user_id: str) -> int:
        """Mark all notifications as read for a user"""
        result = await db.execute(
            update(Notification)
            .where(Notification.user_id == UUID(user_id), Notification.is_read == False)
            .values(is_read=True)
        )
        await db.commit()
        return result.rowcount
    
    # ============ EMAIL SENDING ============
    
    @staticmethod
    async def send_email(
        to: str | List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send email via configured provider"""
        provider = get_email_provider_instance()
        return await provider.send_email(to, subject, html_content, text_content)
    
    @staticmethod
    async def send_template_email(
        to: str | List[str],
        template_name: str,
        variables: dict
    ) -> Dict[str, Any]:
        """Send email using a predefined template"""
        template = TEMPLATES.get(template_name)
        if not template:
            return {"success": False, "error": f"Template '{template_name}' not found"}
        
        subject = template["subject"].format(**variables)
        html_content = template["html"].format(**variables)
        
        return await NotificationService.send_email(to, subject, html_content)
    
    # ============ WORKFLOW NOTIFICATIONS ============
    
    @staticmethod
    async def notify_report_submitted(
        db: AsyncSession,
        report: Report,
        submitter: User,
        directors: List[User]
    ) -> Dict[str, Any]:
        """
        Notify directors when a report is submitted.
        1. Create in-app notification for each director
        2. Send email to each director
        """
        results = {"notifications_created": 0, "emails_sent": 0, "errors": []}
        
        company_name = report.company.name if report.company else "Unknown"
        period = f"{report.month}/{report.year}"
        review_url = f"{settings.app_url}/company-director/reports/{report.id}"
        
        for director in directors:
            try:
                # 1. Create in-app notification
                await NotificationService.create_notification(
                    db=db,
                    user_id=str(director.id),
                    title="New Report Submitted",
                    message=f"Report for {company_name} ({period}) has been submitted by {submitter.name}",
                    link=f"/company-director/reports/{report.id}"
                )
                results["notifications_created"] += 1
                
                # 2. Send email (async - won't block)
                if settings.is_email_enabled and director.email:
                    email_result = await NotificationService.send_template_email(
                        to=director.email,
                        template_name="report_submitted",
                        variables={
                            "company_name": company_name,
                            "period": period,
                            "submitted_by": submitter.name,
                            "review_url": review_url
                        }
                    )
                    if email_result.get("success"):
                        results["emails_sent"] += 1
                    else:
                        results["errors"].append(f"Email to {director.email}: {email_result.get('error')}")
                        
            except Exception as e:
                results["errors"].append(f"Director {director.id}: {str(e)}")
        
        await db.commit()
        return results
    
    @staticmethod
    async def notify_report_approved(
        db: AsyncSession,
        report: Report,
        approver: User,
        author: User
    ) -> Dict[str, Any]:
        """Notify author when their report is approved"""
        results = {"notifications_created": 0, "emails_sent": 0, "errors": []}
        
        company_name = report.company.name if report.company else "Unknown"
        period = f"{report.month}/{report.year}"
        
        try:
            # 1. Create in-app notification
            await NotificationService.create_notification(
                db=db,
                user_id=str(author.id),
                title="Report Approved",
                message=f"Your report for {company_name} ({period}) has been approved by {approver.name}",
                link=f"/data-officer/reports/{report.id}"
            )
            results["notifications_created"] += 1
            
            # 2. Send email
            if settings.is_email_enabled and author.email:
                email_result = await NotificationService.send_template_email(
                    to=author.email,
                    template_name="report_approved",
                    variables={
                        "company_name": company_name,
                        "period": period,
                        "approved_by": approver.name
                    }
                )
                if email_result.get("success"):
                    results["emails_sent"] += 1
                else:
                    results["errors"].append(f"Email: {email_result.get('error')}")
                    
        except Exception as e:
            results["errors"].append(str(e))
        
        await db.commit()
        return results
    
    @staticmethod
    async def notify_report_rejected(
        db: AsyncSession,
        report: Report,
        rejector: User,
        author: User,
        reason: str
    ) -> Dict[str, Any]:
        """Notify author when their report is rejected"""
        results = {"notifications_created": 0, "emails_sent": 0, "errors": []}
        
        company_name = report.company.name if report.company else "Unknown"
        period = f"{report.month}/{report.year}"
        edit_url = f"{settings.app_url}/data-officer/reports/{report.id}/edit"
        
        try:
            # 1. Create in-app notification
            await NotificationService.create_notification(
                db=db,
                user_id=str(author.id),
                title="Report Rejected - Action Required",
                message=f"Your report for {company_name} ({period}) was rejected: {reason}",
                link=f"/data-officer/reports/{report.id}/edit"
            )
            results["notifications_created"] += 1
            
            # 2. Send email
            if settings.is_email_enabled and author.email:
                email_result = await NotificationService.send_template_email(
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
                if email_result.get("success"):
                    results["emails_sent"] += 1
                else:
                    results["errors"].append(f"Email: {email_result.get('error')}")
                    
        except Exception as e:
            results["errors"].append(str(e))
        
        await db.commit()
        return results
