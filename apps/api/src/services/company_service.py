"""
Company Service
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from src.db.models import Company, Cluster


class CompanyService:
    
    @staticmethod
    async def get_all_companies(db: AsyncSession) -> List[Company]:
        result = await db.execute(
            select(Company)
            .options(selectinload(Company.cluster))
            .order_by(Company.name)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_companies_by_cluster(db: AsyncSession, cluster_id: str) -> List[Company]:
        result = await db.execute(
            select(Company)
            .options(selectinload(Company.cluster))
            .where(Company.cluster_id == UUID(cluster_id))
            .order_by(Company.name)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_company_by_id(db: AsyncSession, company_id: str) -> Optional[Company]:
        result = await db.execute(
            select(Company)
            .options(selectinload(Company.cluster))
            .where(Company.id == UUID(company_id))
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_company_by_code(db: AsyncSession, code: str) -> Optional[Company]:
        result = await db.execute(
            select(Company).where(Company.code == code)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_company(
        db: AsyncSession,
        name: str,
        code: str,
        cluster_id: str
    ) -> Company:
        company = Company(
            name=name,
            code=code,
            cluster_id=UUID(cluster_id)
        )
        db.add(company)
        await db.commit()
        await db.refresh(company)
        return company
    
    @staticmethod
    async def update_company(
        db: AsyncSession,
        company_id: str,
        name: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Optional[Company]:
        company = await CompanyService.get_company_by_id(db, company_id)
        if not company:
            return None
        
        if name is not None:
            company.name = name
        if is_active is not None:
            company.is_active = is_active
        
        await db.commit()
        await db.refresh(company)
        return company
    
    @staticmethod
    async def delete_company(db: AsyncSession, company_id: str) -> bool:
        company = await CompanyService.get_company_by_id(db, company_id)
        if not company:
            return False
        
        await db.delete(company)
        await db.commit()
        return True
    
    @staticmethod
    async def get_company_count(db: AsyncSession, active_only: bool = False) -> int:
        query = select(func.count(Company.id))
        if active_only:
            query = query.where(Company.is_active == True)
        result = await db.execute(query)
        return result.scalar()
    
    @staticmethod
    async def get_inactive_company_count(db: AsyncSession) -> int:
        result = await db.execute(
            select(func.count(Company.id)).where(Company.is_active == False)
        )
        return result.scalar()
