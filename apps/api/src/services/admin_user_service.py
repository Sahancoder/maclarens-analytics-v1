"""
Admin User Management Service
Handles CRUD operations for users in the admin panel
"""
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from datetime import datetime

from src.services.activity_service import ActivityService


class AdminUserService:
    """Service for admin user management operations"""
    
    @staticmethod
    async def list_users(
        db: AsyncSession,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        role_id: Optional[int] = None,
        company_id: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        List users with pagination, search, and filtering
        
        Returns:
            Dict with users list and pagination info
        """
        limit = min(limit, 100)  # Cap at 100
        offset = (page - 1) * limit
        
        # Build WHERE clause dynamically
        where_clauses = ["um.is_active = true"] if is_active is None else [f"um.is_active = {is_active}"]
        params = {"limit": limit, "offset": offset}
        
        if search:
            where_clauses.append("(um.user_email ILIKE :search OR um.first_name ILIKE :search OR um.last_name ILIKE :search)")
            params["search"] = f"%{search}%"
        
        if role_id:
            where_clauses.append("ucrm.role_id = :role_id")
            params["role_id"] = role_id
        
        if company_id:
            where_clauses.append("ucrm.company_id = :company_id")
            params["company_id"] = company_id
        
        where_sql = " AND ".join(where_clauses)
        
        # Get total count
        count_query = f"""
            SELECT COUNT(DISTINCT um.user_id)
            FROM analytics.user_master um
            LEFT JOIN analytics.user_company_role_map ucrm ON um.user_id = ucrm.user_id AND ucrm.is_active = true
            WHERE {where_sql}
        """
        total_result = await db.execute(text(count_query), params)
        total = total_result.scalar() or 0
        
        # Get users with roles and companies
        query = f"""
            SELECT 
                um.user_id,
                um.user_email,
                um.first_name,
                um.last_name,
                um.is_active,
                um.created_date,
                um.modified_date,
                ucrm.role_id,
                rm.role_name,
                ucrm.company_id,
                cm.company_name
            FROM analytics.user_master um
            LEFT JOIN analytics.user_company_role_map ucrm ON um.user_id = ucrm.user_id AND ucrm.is_active = true
            LEFT JOIN analytics.role_master rm ON ucrm.role_id = rm.role_id
            LEFT JOIN analytics.company_master cm ON ucrm.company_id = cm.company_id
            WHERE {where_sql}
            ORDER BY um.created_date DESC
            LIMIT :limit OFFSET :offset
        """
        
        result = await db.execute(text(query), params)
        
        # Group users and their roles
        users_dict = {}
        for row in result:
            user_id = row.user_id
            if user_id not in users_dict:
                users_dict[user_id] = {
                    "user_id": user_id,
                    "user_email": row.user_email,
                    "first_name": row.first_name,
                    "last_name": row.last_name,
                    "is_active": row.is_active,
                    "created_date": row.created_date.isoformat() if row.created_date else None,
                    "modified_date": row.modified_date.isoformat() if row.modified_date else None,
                    "roles": []
                }
            
            if row.role_id:
                users_dict[user_id]["roles"].append({
                    "role_id": row.role_id,
                    "role_name": row.role_name,
                    "company_id": row.company_id,
                    "company_name": row.company_name
                })
        
        users = list(users_dict.values())
        total_pages = (total + limit - 1) // limit if total > 0 else 0
        
        return {
            "users": users,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages
            }
        }
    
    @staticmethod
    async def create_user(
        db: AsyncSession,
        user_email: str,
        first_name: str,
        last_name: str,
        role_id: int,
        company_id: str,
        is_active: bool = True,
        current_user_id: Optional[str] = None,
        current_user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new user
        
        Raises:
            HTTPException 409 if email already exists
        """
        # Check if email already exists
        existing = await db.execute(
            text("SELECT user_id FROM analytics.user_master WHERE user_email = :email"),
            {"email": user_email}
        )
        if existing.scalar():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists"
            )
        
        # Generate new user_id
        max_id_result = await db.execute(
            text("SELECT user_id FROM analytics.user_master ORDER BY user_id DESC LIMIT 1")
        )
        max_id = max_id_result.scalar()
        if max_id:
            # Extract number from U0001 format
            num = int(max_id[1:]) + 1
            new_user_id = f"U{num:04d}"
        else:
            new_user_id = "U0001"
        
        # Insert user
        await db.execute(text("""
            INSERT INTO analytics.user_master 
            (user_id, user_email, first_name, last_name, is_active, created_date, modified_date)
            VALUES 
            (:user_id, :user_email, :first_name, :last_name, :is_active, :created_date, :modified_date)
        """), {
            "user_id": new_user_id,
            "user_email": user_email,
            "first_name": first_name,
            "last_name": last_name,
            "is_active": is_active,
            "created_date": datetime.utcnow(),
            "modified_date": datetime.utcnow()
        })
        
        # Assign role
        await db.execute(text("""
            INSERT INTO analytics.user_company_role_map 
            (user_id, company_id, role_id, is_active)
            VALUES 
            (:user_id, :company_id, :role_id, :is_active)
        """), {
            "user_id": new_user_id,
            "company_id": company_id,
            "role_id": role_id,
            "is_active": True
        })
        
        # Log activity
        await ActivityService.log_activity(
            db,
            action="USER_CREATED",
            entity_type="user",
            entity_id=new_user_id,
            details=f"Created user: {first_name} {last_name} ({user_email})",
            user_id=current_user_id,
            user_email=current_user_email
        )
        
        await db.commit()
        
        return {
            "user_id": new_user_id,
            "user_email": user_email,
            "first_name": first_name,
            "last_name": last_name,
            "is_active": is_active,
            "created_date": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    async def update_user(
        db: AsyncSession,
        user_id: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        is_active: Optional[bool] = None,
        current_user_id: Optional[str] = None,
        current_user_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update user details"""
        update_fields = []
        params = {"user_id": user_id, "modified_date": datetime.utcnow()}
        
        if first_name is not None:
            update_fields.append("first_name = :first_name")
            params["first_name"] = first_name
        
        if last_name is not None:
            update_fields.append("last_name = :last_name")
            params["last_name"] = last_name
        
        if is_active is not None:
            update_fields.append("is_active = :is_active")
            params["is_active"] = is_active
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_fields.append("modified_date = :modified_date")
        
        query = f"""
            UPDATE analytics.user_master 
            SET {', '.join(update_fields)}
            WHERE user_id = :user_id
        """
        
        await db.execute(text(query), params)
        
        # Log activity
        await ActivityService.log_activity(
            db,
            action="USER_UPDATED",
            entity_type="user",
            entity_id=user_id,
            details=f"Updated user: {user_id}",
            user_id=current_user_id,
            user_email=current_user_email
        )
        
        await db.commit()
        
        # Fetch updated user
        result = await db.execute(
            text("SELECT * FROM analytics.user_master WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        user = result.fetchone()
        
        return {
            "user_id": user.user_id,
            "user_email": user.user_email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_active": user.is_active
        }
    
    @staticmethod
    async def delete_user(
        db: AsyncSession,
        user_id: str,
        current_user_id: Optional[str] = None,
        current_user_email: Optional[str] = None
    ):
        """Soft delete user (set is_active = false)"""
        # Deactivate user
        await db.execute(
            text("UPDATE analytics.user_master SET is_active = false, modified_date = :modified_date WHERE user_id = :user_id"),
            {"user_id": user_id, "modified_date": datetime.utcnow()}
        )
        
        # Deactivate all role mappings
        await db.execute(
            text("UPDATE analytics.user_company_role_map SET is_active = false WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        
        # Log activity
        await ActivityService.log_activity(
            db,
            action="USER_DEACTIVATED",
            entity_type="user",
            entity_id=user_id,
            details=f"Deactivated user: {user_id}",
            user_id=current_user_id,
            user_email=current_user_email
        )
        
        await db.commit()
    
    @staticmethod
    async def assign_user_to_company(
        db: AsyncSession,
        user_id: str,
        company_id: str,
        role_id: int,
        current_user_id: Optional[str] = None,
        current_user_email: Optional[str] = None
    ):
        """Assign user to a company with a role"""
        # Check if already assigned
        existing = await db.execute(text("""
            SELECT * FROM analytics.user_company_role_map 
            WHERE user_id = :user_id AND company_id = :company_id AND is_active = true
        """), {"user_id": user_id, "company_id": company_id})
        
        if existing.scalar():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already assigned to this company"
            )
        
        # Insert assignment
        await db.execute(text("""
            INSERT INTO analytics.user_company_role_map 
            (user_id, company_id, role_id, is_active)
            VALUES 
            (:user_id, :company_id, :role_id, :is_active)
        """), {
            "user_id": user_id,
            "company_id": company_id,
            "role_id": role_id,
            "is_active": True
        })
        
        # Log activity
        await ActivityService.log_activity(
            db,
            action="USER_ASSIGNED_TO_COMPANY",
            entity_type="user",
            entity_id=user_id,
            details=f"Assigned user {user_id} to company {company_id} with role {role_id}",
            user_id=current_user_id,
            user_email=current_user_email
        )
        
        await db.commit()
    
    @staticmethod
    async def remove_user_from_company(
        db: AsyncSession,
        user_id: str,
        company_id: str,
        current_user_id: Optional[str] = None,
        current_user_email: Optional[str] = None
    ):
        """Remove user from company (soft delete)"""
        await db.execute(text("""
            UPDATE analytics.user_company_role_map 
            SET is_active = false 
            WHERE user_id = :user_id AND company_id = :company_id
        """), {"user_id": user_id, "company_id": company_id})
        
        # Log activity
        await ActivityService.log_activity(
            db,
            action="USER_REMOVED_FROM_COMPANY",
            entity_type="user",
            entity_id=user_id,
            details=f"Removed user {user_id} from company {company_id}",
            user_id=current_user_id,
            user_email=current_user_email
        )
        
        await db.commit()
