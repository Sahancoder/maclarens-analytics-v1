#!/usr/bin/env python
"""
Email Sender Worker - Cron-friendly script to send queued emails

Usage:
    python -m src.jobs.send_outbox_emails
    
This script:
1. Fetches pending emails from the outbox
2. Sends them via the configured email provider (Mailpit/Resend/Graph)
3. Marks them as sent or failed
4. Can be run repeatedly - won't resend already sent emails

Recommended cron schedule:
    * * * * * cd /app && python -m src.jobs.send_outbox_emails >> /var/log/email_worker.log 2>&1

Environment:
    Set DATABASE_URL and email provider settings
"""
import asyncio
import sys
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("email_worker")


async def send_outbox_emails(
    max_emails: int = 50,
    max_attempts: int = 3,
    dry_run: bool = False
):
    """
    Process pending emails from the outbox.
    
    Args:
        max_emails: Maximum number of emails to process in one run
        max_attempts: Max retry attempts before marking as failed
        dry_run: If True, log what would be sent but don't actually send
    """
    from sqlalchemy import select
    
    from src.db.session import AsyncSessionLocal
    from src.db.models import EmailOutbox, EmailStatus
    from src.services.email_provider import get_email_provider_instance
    from src.config.settings import settings
    
    logger.info("=" * 60)
    logger.info(f"Email Worker Started at {datetime.utcnow().isoformat()}")
    logger.info(f"Max emails: {max_emails}, Max attempts: {max_attempts}, Dry run: {dry_run}")
    
    # Get email provider
    provider = get_email_provider_instance()
    provider_name = type(provider).__name__
    logger.info(f"Email provider: {provider_name}")
    
    stats = {
        "processed": 0,
        "sent": 0,
        "failed": 0,
        "skipped": 0,
    }
    
    async with AsyncSessionLocal() as db:
        try:
            # Fetch pending emails
            result = await db.execute(
                select(EmailOutbox)
                .where(
                    EmailOutbox.status == EmailStatus.PENDING,
                    EmailOutbox.attempts < max_attempts
                )
                .order_by(EmailOutbox.created_at)
                .limit(max_emails)
            )
            emails = result.scalars().all()
            
            logger.info(f"Found {len(emails)} pending email(s)")
            
            for email in emails:
                stats["processed"] += 1
                
                logger.info(f"Processing email {email.id}: To={email.to_email}, Subject={email.subject[:50]}...")
                
                if dry_run:
                    logger.info(f"  [DRY RUN] Would send to {email.to_email}")
                    stats["skipped"] += 1
                    continue
                
                try:
                    # Send email via provider
                    result = await provider.send_email(
                        to=email.to_email,
                        subject=email.subject,
                        html_content=email.body_html,
                        text_content=email.body_text
                    )
                    
                    if result.get("success"):
                        # Mark as sent
                        email.status = EmailStatus.SENT
                        email.sent_at = datetime.utcnow()
                        email.error_message = None
                        
                        provider_id = result.get("id", "unknown")
                        logger.info(f"  ✅ Sent successfully. Provider ID: {provider_id}")
                        stats["sent"] += 1
                    else:
                        # Mark attempt as failed
                        email.attempts += 1
                        email.last_attempt = datetime.utcnow()
                        email.error_message = result.get("error", "Unknown error")
                        
                        if email.attempts >= max_attempts:
                            email.status = EmailStatus.FAILED
                            logger.error(f"  ❌ Permanently failed after {email.attempts} attempts: {email.error_message}")
                        else:
                            logger.warning(f"  ⚠️ Attempt {email.attempts} failed: {email.error_message}")
                        
                        stats["failed"] += 1
                    
                except Exception as e:
                    email.attempts += 1
                    email.last_attempt = datetime.utcnow()
                    email.error_message = str(e)
                    
                    if email.attempts >= max_attempts:
                        email.status = EmailStatus.FAILED
                    
                    logger.exception(f"  ❌ Exception sending email: {e}")
                    stats["failed"] += 1
            
            # Commit all changes
            await db.commit()
            
        except Exception as e:
            logger.exception(f"Worker error: {e}")
            await db.rollback()
    
    # Summary
    logger.info("-" * 60)
    logger.info(f"Summary: Processed={stats['processed']}, Sent={stats['sent']}, "
                f"Failed={stats['failed']}, Skipped={stats['skipped']}")
    logger.info(f"Email Worker Completed at {datetime.utcnow().isoformat()}")
    logger.info("=" * 60)
    
    return stats


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Send pending emails from outbox")
    parser.add_argument("--max", type=int, default=50, help="Max emails to process")
    parser.add_argument("--dry-run", action="store_true", help="Don't actually send")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    stats = await send_outbox_emails(
        max_emails=args.max,
        dry_run=args.dry_run
    )
    
    # Exit with error if any failures
    if stats["failed"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
