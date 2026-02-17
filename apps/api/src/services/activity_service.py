"""
Activity Service for audit logs and recent activities
"""
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import uuid

class ActivityService:
    """Service for managing audit logs and activity tracking"""
    
    @staticmethod
    async def get_recent_activity(db: AsyncSession, limit: int = 10) -> Dict[str, Any]:
        """
        Get recent system activities from audit logs
        
        Args:
            db: Database session
            limit: Maximum number of activities to return (default 10, max 50)
            
        Returns:
            Dict with activities list and total count
        """
        limit = min(limit, 50)  # Cap at 50
        
        # Query recent activities with user details
        result = await db.execute(text("""
            SELECT 
                al.id,
                al.timestamp,
                al.user_email,
                al.action,
                al.entity_type,
                al.entity_id,
                al.details,
                um.first_name,
                um.last_name
            FROM analytics.audit_logs al
            LEFT JOIN analytics.user_master um ON al.user_id = um.user_id
            ORDER BY al.timestamp DESC
            LIMIT :limit
        """), {"limit": limit})
        
        activities = []
        for row in result:
            user_name = None
            if row.first_name and row.last_name:
                user_name = f"{row.first_name} {row.last_name}"
            
            activities.append({
                "id": str(row.id),
                "timestamp": row.timestamp.isoformat() if row.timestamp else None,
                "user_email": row.user_email,
                "user_name": user_name,
                "action": row.action,
                "entity_type": row.entity_type,
                "entity_id": row.entity_id,
                "details": row.details
            })
        
        # Get total count
        total_result = await db.execute(
            text("SELECT COUNT(*) FROM analytics.audit_logs")
        )
        total = total_result.scalar() or 0
        
        return {
            "activities": activities,
            "total": total
        }
    
    @staticmethod
    async def log_activity(
        db: AsyncSession,
        action: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        details: Optional[str] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> str:
        """
        Create a new audit log entry
        
        Args:
            db: Database session
            action: Action performed (e.g., 'USER_CREATED', 'COMPANY_UPDATED')
            entity_type: Type of entity affected (e.g., 'user', 'company', 'cluster')
            entity_id: ID of the affected entity
            details: Additional details about the action
            user_id: ID of the user performing the action
            user_email: Email of the user performing the action
            ip_address: IP address of the request
            
        Returns:
            ID of the created audit log entry
        """
        log_id = str(uuid.uuid4())
        
        await db.execute(text("""
            INSERT INTO analytics.audit_logs 
            (id, user_id, user_email, action, entity_type, entity_id, details, ip_address, timestamp)
            VALUES 
            (:id, :user_id, :user_email, :action, :entity_type, :entity_id, :details, :ip_address, :timestamp)
        """), {
            "id": log_id,
            "user_id": user_id,
            "user_email": user_email,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "details": details,
            "ip_address": ip_address,
            "timestamp": datetime.utcnow()
        })
        
        return log_id
