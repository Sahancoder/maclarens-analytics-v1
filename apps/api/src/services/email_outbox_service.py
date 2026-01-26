"""
Email Outbox Service
Queues emails to the database instead of sending synchronously.

This pattern ensures:
1. No blocking SMTP calls in request threads
2. Automatic retry logic if email sending fails
3. Full audit trail of all emails
4. Can be integrated with any email provider
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.db.models import EmailOutbox, EmailStatus

logger = logging.getLogger(__name__)


# ============ EMAIL TEMPLATES ============

EMAIL_TEMPLATES = {
    "report_submitted": {
        "subject": "[McLarens] Report Submitted for Review - {company_name} ({period})",
        "html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #1a365d, #2563eb); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }}
        .button {{ display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }}
        .footer {{ background: #1e293b; color: #94a3b8; padding: 15px; font-size: 12px; border-radius: 0 0 8px 8px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>📋 New Report Submitted</h2>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>A new financial report has been submitted for your review:</p>
            <ul>
                <li><strong>Company:</strong> {company_name}</li>
                <li><strong>Period:</strong> {period}</li>
                <li><strong>Submitted By:</strong> {submitted_by}</li>
            </ul>
            <p>Please review and approve or provide feedback.</p>
            <a href="{review_url}" class="button">Review Report</a>
        </div>
        <div class="footer">
            <p>McLarens Analytics</p>
            <p>This is an automated notification. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
        """,
        "text": """
New Report Submitted

A new financial report has been submitted for your review:

- Company: {company_name}
- Period: {period}
- Submitted By: {submitted_by}

Review at: {review_url}

McLarens Analytics
        """
    },
    
    "report_approved": {
        "subject": "[McLarens] ✅ Report Approved - {company_name} ({period})",
        "html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #166534, #22c55e); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f0fdf4; padding: 20px; border: 1px solid #bbf7d0; }}
        .footer {{ background: #1e293b; color: #94a3b8; padding: 15px; font-size: 12px; border-radius: 0 0 8px 8px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>✅ Report Approved</h2>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>Great news! Your financial report has been approved:</p>
            <ul>
                <li><strong>Company:</strong> {company_name}</li>
                <li><strong>Period:</strong> {period}</li>
                <li><strong>Approved By:</strong> {approved_by}</li>
            </ul>
            <p>No further action is required.</p>
        </div>
        <div class="footer">
            <p>McLarens Analytics</p>
        </div>
    </div>
</body>
</html>
        """,
        "text": """
Report Approved

Your financial report has been approved:

- Company: {company_name}
- Period: {period}
- Approved By: {approved_by}

McLarens Analytics
        """
    },
    
    "report_rejected": {
        "subject": "[McLarens] ⚠️ Report Requires Revision - {company_name} ({period})",
        "html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #991b1b, #ef4444); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background: #fef2f2; padding: 20px; border: 1px solid #fecaca; }}
        .reason {{ background: #fff; padding: 15px; border-left: 4px solid #ef4444; margin: 15px 0; }}
        .button {{ display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }}
        .footer {{ background: #1e293b; color: #94a3b8; padding: 15px; font-size: 12px; border-radius: 0 0 8px 8px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>⚠️ Report Requires Revision</h2>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>Your financial report requires revision:</p>
            <ul>
                <li><strong>Company:</strong> {company_name}</li>
                <li><strong>Period:</strong> {period}</li>
                <li><strong>Reviewed By:</strong> {rejected_by}</li>
            </ul>
            <div class="reason">
                <strong>Reason:</strong><br>
                {rejection_reason}
            </div>
            <p>Please make the necessary corrections and resubmit.</p>
            <a href="{edit_url}" class="button">Edit Report</a>
        </div>
        <div class="footer">
            <p>McLarens Analytics</p>
        </div>
    </div>
</body>
</html>
        """,
        "text": """
Report Requires Revision

Your financial report requires revision:

- Company: {company_name}
- Period: {period}
- Reviewed By: {rejected_by}

Reason: {rejection_reason}

Edit at: {edit_url}

McLarens Analytics
        """
    },
    
    "overdue_reminder": {
        "subject": "[McLarens] ⏰ Reminder: Report Due - {company_name} ({period})",
        "html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #b45309, #f59e0b); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background: #fffbeb; padding: 20px; border: 1px solid #fde68a; }}
        .urgent {{ background: #fff; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0; }}
        .button {{ display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }}
        .footer {{ background: #1e293b; color: #94a3b8; padding: 15px; font-size: 12px; border-radius: 0 0 8px 8px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>⏰ Report Reminder</h2>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>This is a reminder that a financial report is due:</p>
            <ul>
                <li><strong>Company:</strong> {company_name}</li>
                <li><strong>Period:</strong> {period}</li>
                <li><strong>Days Overdue:</strong> {days_overdue}</li>
            </ul>
            <div class="urgent">
                <strong>Action Required:</strong> Please submit your report as soon as possible.
            </div>
            <a href="{submit_url}" class="button">Submit Report</a>
        </div>
        <div class="footer">
            <p>McLarens Analytics</p>
        </div>
    </div>
</body>
</html>
        """,
        "text": """
Report Reminder

This is a reminder that a financial report is due:

- Company: {company_name}
- Period: {period}
- Days Overdue: {days_overdue}

Please submit your report as soon as possible.

Submit at: {submit_url}

McLarens Analytics
        """
    },
    
    "fd_reminder": {
        "subject": "[McLarens] ⏳ Reminder: Reports Awaiting Review",
        "html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #1a365d, #2563eb); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }}
        .stats {{ background: #fff; padding: 15px; border-radius: 8px; margin: 15px 0; }}
        .button {{ display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }}
        .footer {{ background: #1e293b; color: #94a3b8; padding: 15px; font-size: 12px; border-radius: 0 0 8px 8px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>⏳ Reports Awaiting Review</h2>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>You have reports awaiting your review:</p>
            <div class="stats">
                <strong>Pending Reports:</strong> {pending_count}<br>
                <strong>Oldest Pending:</strong> {oldest_days} days
            </div>
            <p>Please review these reports at your earliest convenience.</p>
            <a href="{review_url}" class="button">Review Reports</a>
        </div>
        <div class="footer">
            <p>McLarens Analytics</p>
        </div>
    </div>
</body>
</html>
        """,
        "text": """
Reports Awaiting Review

You have reports awaiting your review:

- Pending Reports: {pending_count}
- Oldest Pending: {oldest_days} days

Review at: {review_url}

McLarens Analytics
        """
    }
}


class EmailOutboxService:
    """Service for queueing emails to the database outbox"""
    
    @staticmethod
    async def queue_email(
        db: AsyncSession,
        to_email: str,
        to_name: Optional[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        related_type: Optional[str] = None,
        related_id: Optional[str] = None,
    ) -> EmailOutbox:
        """
        Queue an email for sending.
        Does NOT send immediately - emails are sent by the worker.
        """
        email = EmailOutbox(
            to_email=to_email,
            to_name=to_name,
            subject=subject,
            body_html=html_content,
            body_text=text_content,
            status=EmailStatus.PENDING,
            attempts=0,
            related_type=related_type,
            related_id=related_id,
            created_at=datetime.utcnow()
        )
        db.add(email)
        await db.flush()
        
        logger.info(f"[OUTBOX] Queued email to {to_email}: {subject}")
        return email
    
    @staticmethod
    async def queue_template_email(
        db: AsyncSession,
        to_email: str,
        to_name: Optional[str],
        template_name: str,
        variables: Dict[str, Any],
        related_type: Optional[str] = None,
        related_id: Optional[str] = None,
    ) -> Optional[EmailOutbox]:
        """
        Queue a templated email.
        """
        template = EMAIL_TEMPLATES.get(template_name)
        if not template:
            logger.error(f"[OUTBOX] Unknown template: {template_name}")
            return None
        
        try:
            subject = template["subject"].format(**variables)
            html_content = template["html"].format(**variables)
            text_content = template.get("text", "").format(**variables) if template.get("text") else None
            
            return await EmailOutboxService.queue_email(
                db=db,
                to_email=to_email,
                to_name=to_name,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                related_type=related_type,
                related_id=related_id
            )
        except KeyError as e:
            logger.error(f"[OUTBOX] Missing template variable: {e} for template {template_name}")
            return None
    
    @staticmethod
    async def get_pending_emails(
        db: AsyncSession,
        limit: int = 50,
        max_attempts: int = 3
    ) -> List[EmailOutbox]:
        """Get pending emails ready to send"""
        result = await db.execute(
            select(EmailOutbox)
            .where(
                EmailOutbox.status == EmailStatus.PENDING,
                EmailOutbox.attempts < max_attempts
            )
            .order_by(EmailOutbox.created_at)
            .limit(limit)
        )
        return result.scalars().all()
    
    @staticmethod
    async def mark_sent(
        db: AsyncSession,
        email_id: UUID,
        provider_response: Optional[str] = None
    ):
        """Mark an email as sent"""
        result = await db.execute(
            select(EmailOutbox).where(EmailOutbox.id == email_id)
        )
        email = result.scalar_one_or_none()
        if email:
            email.status = EmailStatus.SENT
            email.sent_at = datetime.utcnow()
            email.error_message = None
            if provider_response:
                email.error_message = f"Provider: {provider_response}"
    
    @staticmethod
    async def mark_failed(
        db: AsyncSession,
        email_id: UUID,
        error_message: str
    ):
        """Mark an email attempt as failed"""
        result = await db.execute(
            select(EmailOutbox).where(EmailOutbox.id == email_id)
        )
        email = result.scalar_one_or_none()
        if email:
            email.attempts += 1
            email.last_attempt = datetime.utcnow()
            email.error_message = error_message
            
            # Mark as permanently failed if max attempts reached
            if email.attempts >= 3:
                email.status = EmailStatus.FAILED
    
    @staticmethod
    async def get_outbox_stats(db: AsyncSession) -> Dict[str, int]:
        """Get statistics about the email outbox"""
        result = await db.execute(
            select(
                EmailOutbox.status,
                func.count(EmailOutbox.id)
            )
            .group_by(EmailOutbox.status)
        )
        
        from sqlalchemy import func
        
        stats = {}
        for status, count in result.all():
            status_key = status.value if hasattr(status, 'value') else str(status)
            stats[status_key] = count
        
        return stats
