"""
Report Service
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from src.db.models import Report, ReportComment, ReportStatus, Company, Notification


class ReportService:
    
    @staticmethod
    async def get_all_reports(
        db: AsyncSession,
        status: Optional[ReportStatus] = None,
        company_id: Optional[str] = None,
        year: Optional[int] = None,
        month: Optional[int] = None
    ) -> List[Report]:
        query = select(Report).options(
            selectinload(Report.company)
        ).order_by(Report.created_at.desc())
        
        if status:
            query = query.where(Report.status == status)
        if company_id:
            query = query.where(Report.company_id == UUID(company_id))
        if year:
            query = query.where(Report.year == year)
        if month:
            query = query.where(Report.month == month)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_report_by_id(db: AsyncSession, report_id: str) -> Optional[Report]:
        result = await db.execute(
            select(Report)
            .options(selectinload(Report.company), selectinload(Report.comments))
            .where(Report.id == UUID(report_id))
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_report(
        db: AsyncSession,
        company_id: str,
        year: int,
        month: int,
        submitted_by: str
    ) -> Report:
        report = Report(
            company_id=UUID(company_id),
            year=year,
            month=month,
            status=ReportStatus.DRAFT,
            submitted_by=UUID(submitted_by)
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)
        return report
    
    @staticmethod
    async def submit_report(db: AsyncSession, report_id: str, user_id: str) -> Optional[Report]:
        report = await ReportService.get_report_by_id(db, report_id)
        if not report:
            return None
        
        report.status = ReportStatus.SUBMITTED
        report.submitted_by = UUID(user_id)
        report.submitted_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(report)
        return report
    
    @staticmethod
    async def approve_report(db: AsyncSession, report_id: str, user_id: str) -> Optional[Report]:
        report = await ReportService.get_report_by_id(db, report_id)
        if not report:
            return None
        
        report.status = ReportStatus.APPROVED
        report.approved_by = UUID(user_id)
        report.approved_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(report)
        return report
    
    @staticmethod
    async def reject_report(
        db: AsyncSession,
        report_id: str,
        user_id: str,
        reason: str
    ) -> Optional[Report]:
        report = await ReportService.get_report_by_id(db, report_id)
        if not report:
            return None
        
        report.status = ReportStatus.REJECTED
        report.rejection_reason = reason
        
        await db.commit()
        await db.refresh(report)
        return report
    
    @staticmethod
    async def add_comment(
        db: AsyncSession,
        report_id: str,
        user_id: str,
        content: str
    ) -> ReportComment:
        comment = ReportComment(
            report_id=UUID(report_id),
            user_id=UUID(user_id),
            content=content
        )
        db.add(comment)
        await db.commit()
        await db.refresh(comment)
        return comment
    
    @staticmethod
    async def get_pending_reports_count(db: AsyncSession) -> int:
        result = await db.execute(
            select(func.count(Report.id)).where(Report.status == ReportStatus.SUBMITTED)
        )
        return result.scalar()
    
    @staticmethod
    async def get_reports_by_company(
        db: AsyncSession,
        company_id: str
    ) -> List[Report]:
        result = await db.execute(
            select(Report)
            .where(Report.company_id == UUID(company_id))
            .order_by(Report.year.desc(), Report.month.desc())
        )
        return result.scalars().all()
