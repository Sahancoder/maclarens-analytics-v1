"""
Cluster Service
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from src.db.models import Cluster, Company


class ClusterService:
    
    @staticmethod
    async def get_all_clusters(db: AsyncSession) -> List[Cluster]:
        result = await db.execute(
            select(Cluster).options(selectinload(Cluster.companies)).order_by(Cluster.name)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_cluster_by_id(db: AsyncSession, cluster_id: str) -> Optional[Cluster]:
        result = await db.execute(
            select(Cluster)
            .options(selectinload(Cluster.companies))
            .where(Cluster.id == UUID(cluster_id))
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_cluster_by_code(db: AsyncSession, code: str) -> Optional[Cluster]:
        result = await db.execute(
            select(Cluster).where(Cluster.code == code)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_cluster(db: AsyncSession, name: str, code: str) -> Cluster:
        cluster = Cluster(name=name, code=code)
        db.add(cluster)
        await db.commit()
        await db.refresh(cluster)
        return cluster
    
    @staticmethod
    async def update_cluster(
        db: AsyncSession,
        cluster_id: str,
        name: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Optional[Cluster]:
        cluster = await ClusterService.get_cluster_by_id(db, cluster_id)
        if not cluster:
            return None
        
        if name is not None:
            cluster.name = name
        if is_active is not None:
            cluster.is_active = is_active
        
        await db.commit()
        await db.refresh(cluster)
        return cluster
    
    @staticmethod
    async def delete_cluster(db: AsyncSession, cluster_id: str) -> bool:
        cluster = await ClusterService.get_cluster_by_id(db, cluster_id)
        if not cluster:
            return False
        
        await db.delete(cluster)
        await db.commit()
        return True
    
    @staticmethod
    async def get_cluster_count(db: AsyncSession) -> int:
        result = await db.execute(select(func.count(Cluster.id)))
        return result.scalar()
    
    @staticmethod
    async def get_company_count_by_cluster(db: AsyncSession, cluster_id: str) -> int:
        result = await db.execute(
            select(func.count(Company.id)).where(Company.cluster_id == UUID(cluster_id))
        )
        return result.scalar()
