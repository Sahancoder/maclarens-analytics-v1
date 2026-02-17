"""
Admin Cluster Management Service
"""
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from datetime import datetime

from src.services.activity_service import ActivityService


class AdminClusterService:
    """Service for admin cluster management"""
    
    @staticmethod
    async def list_clusters(db: AsyncSession) -> Dict[str, Any]:
        """List all clusters with company counts"""
        query = """
            SELECT 
                c.cluster_id,
                c.cluster_name,
                c.is_active,
                c.created_date,
                COUNT(cm.company_id) as total_companies,
                SUM(CASE WHEN cm.is_active = true THEN 1 ELSE 0 END) as active_companies,
                SUM(CASE WHEN cm.is_active = false OR cm.is_active IS NULL THEN 1 ELSE 0 END) as inactive_companies
            FROM analytics.cluster_master c
            LEFT JOIN analytics.company_master cm ON c.cluster_id = cm.cluster_id
            WHERE c.is_active = true
            GROUP BY c.cluster_id, c.cluster_name, c.is_active, c.created_date
            ORDER BY c.cluster_name ASC
        """
        
        result = await db.execute(text(query))
        
        clusters = []
        for row in result:
            clusters.append({
                "cluster_id": row.cluster_id,
                "cluster_name": row.cluster_name,
                "is_active": row.is_active,
                "total_companies": row.total_companies or 0,
                "active_companies": row.active_companies or 0,
                "inactive_companies": row.inactive_companies or 0,
                "created_date": row.created_date.isoformat() if row.created_date else None
            })
        
        return {"clusters": clusters}
    
    @staticmethod
    async def create_cluster(
        db: AsyncSession,
        cluster_name: str,
        is_active: bool = True,
        current_user_id: Optional[str] = None,
        current_user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new cluster"""
        # Check if cluster name exists
        existing = await db.execute(
            text("SELECT cluster_id FROM analytics.cluster_master WHERE cluster_name = :name"),
            {"name": cluster_name}
        )
        if existing.scalar():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cluster name already exists"
            )
        
        # Generate new cluster_id
        max_id_result = await db.execute(
            text("SELECT cluster_id FROM analytics.cluster_master ORDER BY cluster_id DESC LIMIT 1")
        )
        max_id = max_id_result.scalar()
        if max_id:
            num = int(max_id[1:]) + 1
            new_cluster_id = f"C{num:02d}"
        else:
            new_cluster_id = "C01"
        
        # Insert cluster
        await db.execute(text("""
            INSERT INTO analytics.cluster_master 
            (cluster_id, cluster_name, is_active, created_date)
            VALUES 
            (:cluster_id, :cluster_name, :is_active, :created_date)
        """), {
            "cluster_id": new_cluster_id,
            "cluster_name": cluster_name,
            "is_active": is_active,
            "created_date": datetime.utcnow()
        })
        
        await ActivityService.log_activity(
            db,
            action="CLUSTER_CREATED",
            entity_type="cluster",
            entity_id=new_cluster_id,
            details=f"Created cluster: {cluster_name}",
            user_id=current_user_id,
            user_email=current_user_email
        )
        
        await db.commit()
        
        return {
            "cluster_id": new_cluster_id,
            "cluster_name": cluster_name,
            "is_active": is_active,
            "created_date": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    async def update_cluster(
        db: AsyncSession,
        cluster_id: str,
        cluster_name: Optional[str] = None,
        is_active: Optional[bool] = None,
        current_user_id: Optional[str] = None,
        current_user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update cluster details"""
        update_fields = []
        params = {"cluster_id": cluster_id}
        
        if cluster_name is not None:
            update_fields.append("cluster_name = :cluster_name")
            params["cluster_name"] = cluster_name
        
        if is_active is not None:
            update_fields.append("is_active = :is_active")
            params["is_active"] = is_active
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        query = f"""
            UPDATE analytics.cluster_master 
            SET {', '.join(update_fields)}
            WHERE cluster_id = :cluster_id
        """
        
        await db.execute(text(query), params)
        
        await ActivityService.log_activity(
            db,
            action="CLUSTER_UPDATED",
            entity_type="cluster",
            entity_id=cluster_id,
            details=f"Updated cluster: {cluster_id}",
            user_id=current_user_id,
            user_email=current_user_email
        )
        
        await db.commit()
        
        result = await db.execute(
            text("SELECT * FROM analytics.cluster_master WHERE cluster_id = :cluster_id"),
            {"cluster_id": cluster_id}
        )
        cluster = result.fetchone()
        
        return {
            "cluster_id": cluster.cluster_id,
            "cluster_name": cluster.cluster_name,
            "is_active": cluster.is_active
        }
    
    @staticmethod
    async def delete_cluster(
        db: AsyncSession,
        cluster_id: str,
        current_user_id: Optional[str] = None,
        current_user_email: Optional[str] = None
    ):
        """Soft delete cluster (with validation)"""
        # Check if cluster has active companies
        company_count_result = await db.execute(text("""
            SELECT COUNT(*) FROM analytics.company_master 
            WHERE cluster_id = :cluster_id AND is_active = true
        """), {"cluster_id": cluster_id})
        
        if company_count_result.scalar() > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete cluster with active companies. Please delete or deactivate companies first."
            )
        
        # Soft delete
        await db.execute(
            text("UPDATE analytics.cluster_master SET is_active = false WHERE cluster_id = :cluster_id"),
            {"cluster_id": cluster_id}
        )
        
        await ActivityService.log_activity(
            db,
            action="CLUSTER_DELETED",
            entity_type="cluster",
            entity_id=cluster_id,
            details=f"Deleted cluster: {cluster_id}",
            user_id=current_user_id,
            user_email=current_user_email
        )
        
        await db.commit()
    
    @staticmethod
    async def get_cluster_companies(db: AsyncSession, cluster_id: str) -> Dict[str, Any]:
        """Get all companies in a cluster"""
        result = await db.execute(text("""
            SELECT 
                company_id,
                company_name,
                fin_year_start_month,
                is_active,
                created_date
            FROM analytics.company_master
            WHERE cluster_id = :cluster_id
            ORDER BY company_name ASC
        """), {"cluster_id": cluster_id})
        
        companies = []
        for row in result:
            companies.append({
                "company_id": row.company_id,
                "company_name": row.company_name,
                "fin_year_start_month": row.fin_year_start_month,
                "is_active": row.is_active,
                "created_date": row.created_date.isoformat() if row.created_date else None
            })
        
        return {"companies": companies}
