"""
Authentication Resolvers
"""
import strawberry
from typing import Optional
from strawberry.types import Info
from src.graphql.types import AuthPayload, UserType, LoginInput, UserRoleEnum
from src.services.auth_service import AuthService
from src.db.models import UserRole


def db_role_to_enum(role: UserRole) -> UserRoleEnum:
    """Convert database role to GraphQL enum"""
    mapping = {
        UserRole.DATA_OFFICER: UserRoleEnum.DATA_OFFICER,
        UserRole.COMPANY_DIRECTOR: UserRoleEnum.COMPANY_DIRECTOR,
        UserRole.ADMIN: UserRoleEnum.ADMIN,
        UserRole.CEO: UserRoleEnum.CEO,
    }
    return mapping.get(role, UserRoleEnum.DATA_OFFICER)


@strawberry.type
class AuthMutation:
    
    @strawberry.mutation
    async def login(self, info: Info, input: LoginInput) -> Optional[AuthPayload]:
        db = info.context["db"]
        
        user = await AuthService.authenticate(db, input.email, input.password)
        if not user:
            return None
        
        token = AuthService.create_access_token(
            str(user.id),
            user.email,
            user.role.value
        )
        
        return AuthPayload(
            token=token,
            user=UserType(
                id=str(user.id),
                email=user.email,
                name=user.name,
                role=db_role_to_enum(user.role),
                company_id=str(user.company_id) if user.company_id else None,
                cluster_id=str(user.cluster_id) if user.cluster_id else None,
                is_active=user.is_active,
                created_at=user.created_at
            )
        )
    
    @strawberry.mutation
    async def logout(self, info: Info) -> bool:
        # In a real app, you'd invalidate the token
        return True


@strawberry.type
class AuthQuery:
    
    @strawberry.field
    async def me(self, info: Info) -> Optional[UserType]:
        user = info.context.get("user")
        if not user:
            return None
        
        return UserType(
            id=str(user.id),
            email=user.email,
            name=user.name,
            role=db_role_to_enum(user.role),
            company_id=str(user.company_id) if user.company_id else None,
            cluster_id=str(user.cluster_id) if user.cluster_id else None,
            is_active=user.is_active,
            created_at=user.created_at
        )
