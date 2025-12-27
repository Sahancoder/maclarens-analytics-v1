"""
User Service
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime
from src.db.models import User, UserRole
from src.services.auth_service import AuthService


class UserService:
    
    @staticmethod
    async def get_all_users(db: AsyncSession) -> List[User]:
        result = await db.execute(
            select(User).order_by(User.created_at.desc())
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
        result = await db.execute(
            select(User).where(User.id == UUID(user_id))
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_user(
        db: AsyncSession,
        email: str,
        password: str,
        name: str,
        role: UserRole,
        company_id: Optional[str] = None,
        cluster_id: Optional[str] = None
    ) -> User:
        user = User(
            email=email,
            password_hash=AuthService.hash_password(password),
            name=name,
            role=role,
            company_id=UUID(company_id) if company_id else None,
            cluster_id=UUID(cluster_id) if cluster_id else None
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
    
    @staticmethod
    async def update_user(
        db: AsyncSession,
        user_id: str,
        name: Optional[str] = None,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None
    ) -> Optional[User]:
        user = await UserService.get_user_by_id(db, user_id)
        if not user:
            return None
        
        if name is not None:
            user.name = name
        if role is not None:
            user.role = role
        if is_active is not None:
            user.is_active = is_active
        
        user.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(user)
        return user
    
    @staticmethod
    async def delete_user(db: AsyncSession, user_id: str) -> bool:
        user = await UserService.get_user_by_id(db, user_id)
        if not user:
            return False
        
        await db.delete(user)
        await db.commit()
        return True
    
    @staticmethod
    async def get_user_count(db: AsyncSession) -> int:
        result = await db.execute(select(func.count(User.id)))
        return result.scalar()
    
    @staticmethod
    async def get_new_users_this_month(db: AsyncSession) -> int:
        now = datetime.utcnow()
        start_of_month = datetime(now.year, now.month, 1)
        result = await db.execute(
            select(func.count(User.id)).where(User.created_at >= start_of_month)
        )
        return result.scalar()
