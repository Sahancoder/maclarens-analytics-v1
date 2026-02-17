"""
Admin Company Management Service
"""
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from datetime import datetime

from src.services.activity_service import ActivityService


class AdminCompanyService:
    """Service for admin company management"""
    
    @staticmethod
    async def list_companies(
        db: AsyncSession,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        cluster_id: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Dict[str, Any]:
        """List companies with pagination and filtering"""
        limit = min(limit, 100)
        offset = (page - 1) * limit
        
        where_clauses = []
        params = {"limit": limit, "offset": offset}
        
        if is_active is not None:
            where_clauses.append("cm.is_active = :is_active")
            params["is_active"] = is_active
        else:
            where_clauses.append("cm.is_active = true")
        
        if search:
            where_clauses.append("cm.company_name ILIKE :search")
            params["search"] = f"%{search}%"
        
        if cluster_id:
            where_clauses.append("cm.cluster_id = :cluster_id")
            params["cluster_id"] = cluster_id
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        # Get total count
        count_query = f"""
            SELECT COUNT(*)
            FROM analytics.company_master cm
            WHERE {where_sql}
        """
        total_result = await db.execute(text(count_query), params)
        total = total_result.scalar() or 0
        
        # Get companies with cluster info and user count
        query = f"""
            SELECT 
                cm.company_id,
                cm.company_name,
                cm.cluster_id,
                c.cluster_name,
                cm.fin_year_start_month,
                cm.is_active,
                cm.created_date,
                cm.modified_date,
                COUNT(DISTINCT ucrm.user_id) as user_count
            FROM analytics.company_master cm
            JOIN analytics.cluster_master c ON cm.cluster_id = c.cluster_id
            LEFT JOIN analytics.user_company_role_map ucrm ON cm.company_id = ucrm.company_id AND ucrm.is_active = true
            WHERE {where_sql}
            GROUP BY cm.company_id, cm.company_name, cm.cluster_id, c.cluster_name, cm.fin_year_start_month, 
                     cm.is_active, cm.created_date, cm.modified_date
            ORDER BY cm.company_name ASC
            LIMIT :limit OFFSET :offset
        """
        
        result = await db.execute(text(query), params)
        
        companies = []
        for row in result:
            companies.append({
                "company_id": row.company_id,
                "company_name": row.company_name,
                "cluster_id": row.cluster_id,
                "cluster_name": row.cluster_name,
                "fin_year_start_month": row.fin_year_start_month,
                "is_active": row.is_active,
                "user_count": row.user_count,
                "created_date": row.created_date.isoformat() if row.created_date else None,
                "modified_date": row.modified_date.isoformat() if row.modified_date else None
            })
        
        total_pages = (total + limit - 1) // limit if total > 0 else 0
        
        return {
            "companies": companies,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages
            }
        }
    
    @staticmethod
    async def create_company(
        db: AsyncSession,
        company_name: str,
        cluster_id: str,
        fin_year_start_month: int,
        is_active: bool = True,
        current_user_id: Optional[str] = None,
        current_user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new company"""
        # Check if company name already exists
        existing = await db.execute(
            text("SELECT company_id FROM analytics.company_master WHERE company_name = :name"),
            {"name": company_name}
        )
        if existing.scalar():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Company name already exists"
            )
        
        # Validate cluster exists
        cluster_check = await db.execute(
            text("SELECT cluster_id FROM analytics.cluster_master WHERE cluster_id = :cluster_id"),
            {"cluster_id": cluster_id}
        )
        if not cluster_check.scalar():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid cluster_id"
            )
        
        # Generate new company_id
        max_id_result = await db.execute(
            text("SELECT company_id FROM analytics.company_master ORDER BY company_id DESC LIMIT 1")
        )
        max_id = max_id_result.scalar()
        if max_id:
            num = int(max_id[2:]) + 1
            new_company_id = f"CC{num:04d}"
        else:
            new_company_id = "CC0001"
        
        # Insert company
        await db.execute(text("""
            INSERT INTO analytics.company_master 
            (company_id, company_name, cluster_id, fin_year_start_month, is_active, created_date, modified_date)
            VALUES 
            (:company_id, :company_name, :cluster_id, :fin_year_start_month, :is_active, :created_date, :modified_date)
        """), {
            "company_id": new_company_id,
            "company_name": company_name,
            "cluster_id": cluster_id,
            "fin_year_start_month": fin_year_start_month,
            "is_active": is_active,
            "created_date": datetime.utcnow(),
            "modified_date": datetime.utcnow()
        })
        
        # Log activity
        await ActivityService.log_activity(
            db,
            action="COMPANY_CREATED",
            entity_type="company",
            entity_id=new_company_id,
            details=f"Created company: {company_name}",
            user_id=current_user_id,
            user_email=current_user_email
        )
        
        await db.commit()
        
        return {
            "company_id": new_company_id,
            "company_name": company_name,
            "cluster_id": cluster_id,
            "fin_year_start_month": fin_year_start_month,
            "is_active": is_active,
            "created_date": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    async def update_company(
        db: AsyncSession,
        company_id: str,
        company_name: Optional[str] = None,
        cluster_id: Optional[str] = None,
        fin_year_start_month: Optional[int] = None,
        is_active: Optional[bool] = None,
        current_user_id: Optional[str] = None,
        current_user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update company details"""
        update_fields = []
        params = {"company_id": company_id, "modified_date": datetime.utcnow()}
        
        if company_name is not None:
            update_fields.append("company_name = :company_name")
            params["company_name"] = company_name
        
        if cluster_id is not None:
            update_fields.append("cluster_id = :cluster_id")
            params["cluster_id"] = cluster_id
        
        if fin_year_start_month is not None:
            update_fields.append("fin_year_start_month = :fin_year_start_month")
            params["fin_year_start_month"] = fin_year_start_month
        
        if is_active is not None:
            update_fields.append("is_active = :is_active")
            params["is_active"] = is_active
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_fields.append("modified_date = :modified_date")
        
        query = f"""
            UPDATE analytics.company_master 
            SET {', '.join(update_fields)}
            WHERE company_id = :company_id
        """
        
        await db.execute(text(query), params)
        
        await ActivityService.log_activity(
            db,
            action="COMPANY_UPDATED",
            entity_type="company",
            entity_id=company_id,
            details=f"Updated company: {company_id}",
            user_id=current_user_id,
            user_email=current_user_email
        )
        
        await db.commit()
        
        result = await db.execute(
            text("SELECT * FROM analytics.company_master WHERE company_id = :company_id"),
            {"company_id": company_id}
        )
        company = result.fetchone()
        
        return {
            "company_id": company.company_id,
            "company_name": company.company_name,
            "cluster_id": company.cluster_id,
            "fin_year_start_month": company.fin_year_start_month,
            "is_active": company.is_active
        }
    
    @staticmethod
    async def delete_company(
        db: AsyncSession,
        company_id: str,
        current_user_id: Optional[str] = None,
        current_user_email: Optional[str] = None
    ):
        """Soft delete company (with validation)"""
        # Check if company has active users
        user_count_result = await db.execute(text("""
            SELECT COUNT(*) FROM analytics.user_company_role_map 
            WHERE company_id = :company_id AND is_active = true
        """), {"company_id": company_id})
        
        if user_count_result.scalar() > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete company with active users. Please remove users first."
            )
        
        # Soft delete
        await db.execute(
            text("UPDATE analytics.company_master SET is_active = false, modified_date = :modified_date WHERE company_id = :company_id"),
            {"company_id": company_id, "modified_date": datetime.utcnow()}
        )
        
        await ActivityService.log_activity(
            db,
            action="COMPANY_DELETED",
            entity_type="company",
            entity_id=company_id,
            details=f"Deleted company: {company_id}",
            user_id=current_user_id,
            user_email=current_user_email
        )
        
        await db.commit()
    
    @staticmethod
    async def get_company_users(db: AsyncSession, company_id: str) -> Dict[str, Any]:
        """Get all users assigned to a company"""
        result = await db.execute(text("""
            SELECT 
                um.user_id,
                um.user_email,
                um.first_name,
                um.last_name,
                ucrm.role_id,
                rm.role_name,
                ucrm.is_active
            FROM analytics.user_company_role_map ucrm
            JOIN analytics.user_master um ON ucrm.user_id = um.user_id
            JOIN analytics.role_master rm ON ucrm.role_id = rm.role_id
            WHERE ucrm.company_id = :company_id AND ucrm.is_active = true
            ORDER BY um.first_name, um.last_name
        """), {"company_id": company_id})
        
        users = []
        for row in result:
            users.append({
                "user_id": row.user_id,
                "user_email": row.user_email,
                "first_name": row.first_name,
                "last_name": row.last_name,
                "role_id": row.role_id,
                "role_name": row.role_name,
                "is_active": row.is_active
            })
        
        return {"users": users}
