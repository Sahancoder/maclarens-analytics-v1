#!/usr/bin/env python
"""
Overdue Reminder Generator - Daily job for sending report reminders

Usage:
    python -m src.jobs.generate_reminders
    
This script:
1. Finds companies that haven't submitted reports for the current period
2. Finds reports stuck in SUBMITTED status (not reviewed)
3. Creates in-app notifications for affected users
4. Queues reminder emails to the outbox

Recommended cron schedule (once daily at 9 AM):
    0 9 * * * cd /app && python -m src.jobs.generate_reminders >> /var/log/reminders.log 2>&1

Logic:
    - Reports are due by the 10th of the following month
    - After day 10, reminders start going out
    - FOs get reminded about missing/draft reports
    - FDs get reminded about pending reviews
"""
import asyncio
import sys
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
from uuid import UUID

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("reminder_generator")


# Configuration
REPORT_DUE_DAY = 10  # Reports due by 10th of following month
OVERDUE_REMINDER_INTERVAL_DAYS = 3  # Send reminder every 3 days
FD_REMINDER_AFTER_DAYS = 3  # Remind FD if report pending review > 3 days


async def generate_reminders(
    dry_run: bool = False,
    force: bool = False
):
    """
    Generate reminder notifications and emails for overdue reports.
    
    Args:
        dry_run: If True, log what would happen but don't create records
        force: If True, generate reminders even if not past due date
    """
    from sqlalchemy import select, and_, func
    
    from src.db.session import AsyncSessionLocal
    from src.db.models import (
        Company, User, UserRole, Report, ReportStatus,
        Notification, NotificationType
    )
    from src.services.email_outbox_service import EmailOutboxService
    from src.config.settings import settings
    
    logger.info("=" * 60)
    logger.info(f"Reminder Generator Started at {datetime.utcnow().isoformat()}")
    logger.info(f"Dry run: {dry_run}, Force: {force}")
    
    now = datetime.utcnow()
    
    # Determine the report period we're checking
    # On Jan 15, we check Dec of previous year
    # On Jan 5, we're not past due yet (unless force=True)
    if now.day > REPORT_DUE_DAY or force:
        # We're past the due date, check previous month
        check_year = now.year if now.month > 1 else now.year - 1
        check_month = now.month - 1 if now.month > 1 else 12
        days_overdue = now.day - REPORT_DUE_DAY
    else:
        # Not past due date yet
        logger.info(f"Reports not yet due (due date: {REPORT_DUE_DAY}th). Use --force to override.")
        return {"fo_reminders": 0, "fd_reminders": 0}
    
    logger.info(f"Checking reports for: {check_month}/{check_year}, Days overdue: {days_overdue}")
    
    stats = {
        "fo_reminders": 0,
        "fd_reminders": 0,
        "notifications_created": 0,
        "emails_queued": 0,
    }
    
    async with AsyncSessionLocal() as db:
        try:
            # ============ FO REMINDERS: Missing/Draft Reports ============
            
            # Get all active companies
            companies_result = await db.execute(
                select(Company).where(Company.is_active == True)
            )
            companies = companies_result.scalars().all()
            
            for company in companies:
                # Check if company has an approved/submitted report for the period
                report_result = await db.execute(
                    select(Report).where(
                        and_(
                            Report.company_id == company.id,
                            Report.year == check_year,
                            Report.month == check_month
                        )
                    )
                )
                report = report_result.scalar_one_or_none()
                
                # Skip if already submitted or approved
                if report and report.status in (ReportStatus.SUBMITTED, ReportStatus.APPROVED):
                    continue
                
                # Find FO for this company
                fo_result = await db.execute(
                    select(User).where(
                        and_(
                            User.company_id == company.id,
                            User.role == UserRole.DATA_OFFICER,
                            User.is_active == True
                        )
                    )
                )
                fos = fo_result.scalars().all()
                
                if not fos:
                    logger.warning(f"No FO found for company {company.code}")
                    continue
                
                for fo in fos:
                    report_status = report.status.value if report else "not_started"
                    logger.info(f"FO Reminder: {company.code} - {fo.email} - Status: {report_status}")
                    
                    if dry_run:
                        stats["fo_reminders"] += 1
                        continue
                    
                    # Create notification
                    notification = Notification(
                        user_id=fo.id,
                        type=NotificationType.REPORT_OVERDUE,
                        title=f"⏰ Report Due: {company.code}",
                        message=f"Your report for {check_month}/{check_year} is {days_overdue} days overdue. Please submit as soon as possible.",
                        link=f"/finance-officer/reports",
                        is_read=False,
                        created_at=now
                    )
                    db.add(notification)
                    stats["notifications_created"] += 1
                    
                    # Queue email
                    await EmailOutboxService.queue_template_email(
                        db=db,
                        to_email=fo.email,
                        to_name=fo.name,
                        template_name="overdue_reminder",
                        variables={
                            "company_name": company.name,
                            "period": f"{get_month_name(check_month)} {check_year}",
                            "days_overdue": str(days_overdue),
                            "submit_url": f"{settings.app_url}/finance-officer/reports"
                        },
                        related_type="reminder",
                        related_id=f"{company.id}-{check_year}-{check_month}"
                    )
                    stats["emails_queued"] += 1
                    stats["fo_reminders"] += 1
            
            # ============ FD REMINDERS: Pending Reviews ============
            
            # Find reports submitted but not reviewed for too long
            pending_cutoff = now - timedelta(days=FD_REMINDER_AFTER_DAYS)
            
            pending_result = await db.execute(
                select(Report).where(
                    and_(
                        Report.status == ReportStatus.SUBMITTED,
                        Report.submitted_at < pending_cutoff
                    )
                )
            )
            pending_reports = pending_result.scalars().all()
            
            # Group by cluster to notify FDs
            fd_report_counts: Dict[UUID, int] = {}
            fd_oldest_days: Dict[UUID, int] = {}
            
            for report in pending_reports:
                # Get company cluster
                company_result = await db.execute(
                    select(Company).where(Company.id == report.company_id)
                )
                company = company_result.scalar_one_or_none()
                if not company or not company.cluster_id:
                    continue
                
                # Find FDs for this cluster
                fd_result = await db.execute(
                    select(User).where(
                        and_(
                            User.cluster_id == company.cluster_id,
                            User.role == UserRole.COMPANY_DIRECTOR,
                            User.is_active == True
                        )
                    )
                )
                fds = fd_result.scalars().all()
                
                days_pending = (now - report.submitted_at).days if report.submitted_at else 0
                
                for fd in fds:
                    if fd.id not in fd_report_counts:
                        fd_report_counts[fd.id] = 0
                        fd_oldest_days[fd.id] = 0
                    
                    fd_report_counts[fd.id] += 1
                    fd_oldest_days[fd.id] = max(fd_oldest_days[fd.id], days_pending)
            
            # Send reminders to FDs with pending reports
            for fd_id, pending_count in fd_report_counts.items():
                fd_result = await db.execute(
                    select(User).where(User.id == fd_id)
                )
                fd = fd_result.scalar_one_or_none()
                if not fd:
                    continue
                
                oldest_days = fd_oldest_days[fd_id]
                logger.info(f"FD Reminder: {fd.email} - {pending_count} pending, oldest {oldest_days} days")
                
                if dry_run:
                    stats["fd_reminders"] += 1
                    continue
                
                # Create notification
                notification = Notification(
                    user_id=fd.id,
                    type=NotificationType.REMINDER,
                    title=f"⏳ {pending_count} Report(s) Awaiting Review",
                    message=f"You have {pending_count} report(s) pending review. The oldest has been waiting {oldest_days} days.",
                    link=f"/company-director/pending",
                    is_read=False,
                    created_at=now
                )
                db.add(notification)
                stats["notifications_created"] += 1
                
                # Queue email
                await EmailOutboxService.queue_template_email(
                    db=db,
                    to_email=fd.email,
                    to_name=fd.name,
                    template_name="fd_reminder",
                    variables={
                        "pending_count": str(pending_count),
                        "oldest_days": str(oldest_days),
                        "review_url": f"{settings.app_url}/company-director/pending"
                    },
                    related_type="fd_reminder",
                    related_id=str(fd.id)
                )
                stats["emails_queued"] += 1
                stats["fd_reminders"] += 1
            
            # Commit all changes
            if not dry_run:
                await db.commit()
            
        except Exception as e:
            logger.exception(f"Generator error: {e}")
            await db.rollback()
            raise
    
    # Summary
    logger.info("-" * 60)
    logger.info(f"Summary: FO Reminders={stats['fo_reminders']}, FD Reminders={stats['fd_reminders']}, "
                f"Notifications={stats['notifications_created']}, Emails Queued={stats['emails_queued']}")
    logger.info(f"Reminder Generator Completed at {datetime.utcnow().isoformat()}")
    logger.info("=" * 60)
    
    return stats


def get_month_name(month: int) -> str:
    """Get month name from number"""
    names = [
        "", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    return names[month] if 1 <= month <= 12 else str(month)


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate overdue report reminders")
    parser.add_argument("--dry-run", action="store_true", help="Don't create records, just log")
    parser.add_argument("--force", action="store_true", help="Generate even if not past due date")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        stats = await generate_reminders(
            dry_run=args.dry_run,
            force=args.force
        )
        
        # Exit with success
        sys.exit(0)
        
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
