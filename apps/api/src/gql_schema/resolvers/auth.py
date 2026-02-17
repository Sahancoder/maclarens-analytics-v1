"""
Authentication Resolvers
Updated for User Master / Role Master schema
"""
import strawberry
from typing import Optional
from strawberry.types import Info
from src.gql_schema.types import AuthPayload, UserType, LoginInput, UserRoleEnum
from src.services.auth_service import AuthService

def db_role_to_enum(role_name: str) -> UserRoleEnum:
    """Convert database role string to GraphQL enum"""
    mapping = {
        "Finance Officer": UserRoleEnum.DATA_OFFICER,
        "Finance Director": UserRoleEnum.COMPANY_DIRECTOR,
        "Admin": UserRoleEnum.ADMIN,
        "SYSTEM_ADMIN": UserRoleEnum.ADMIN,
        "MD": UserRoleEnum.CEO,
        "Viewer": UserRoleEnum.DATA_OFFICER, # Default fallback
    }
    return mapping.get(role_name, UserRoleEnum.DATA_OFFICER)

@strawberry.type
class AuthMutation:
    
    @strawberry.mutation
    async def login(self, info: Info, input: LoginInput) -> Optional[AuthPayload]:
        # Legacy login not supported or needs migration to new auth service
        # returning None for now to enforce Microsoft Login or Dev Login via Router
        return None

@strawberry.type
class AuthQuery:
    
    @strawberry.field
    async def me(self, info: Info) -> Optional[UserType]:
        user = info.context.get("user")
        if not user:
            return None
        
        # user is instance of UserMaster with attached current_role
        role_enum = db_role_to_enum(user.current_role)
        
        # Handle company_id for legacy frontend support
        # Return first accessible company if available
        first_company = user.accessible_companies[0] if hasattr(user, 'accessible_companies') and user.accessible_companies else None
        
        return UserType(
            id=str(user.user_id),
            email=str(user.user_email),
            name=f"{user.first_name} {user.last_name}",
            role=role_enum,
            company_id=first_company,
            cluster_id=None, # Cluster mapping logic if needed
            is_active=user.is_active,
            created_at=datetime.utcnow() # UserMaster has Date, UserType expects Datetime
        )

from datetime import datetime
