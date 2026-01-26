"""
Authentication & Authorization Middleware
Provides FastAPI dependencies for protecting endpoints

Features:
- JWT token validation (both custom and Entra ID)
- Role-based access control (RBAC)
- Company-scoped access control (IDOR prevention)
- Dev mode bypass for local development
- Rate limiting
"""
from typing import Optional, List, Callable, Any
from functools import wraps
from uuid import UUID

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.settings import settings, AuthMode
from src.db.session import AsyncSessionLocal
from src.db.models import User, UserRole
from src.services.auth_service import AuthService
from src.security.permissions import (
    Permission,
    has_permission,
    has_any_permission,
    can_access_company,
    get_accessible_company_ids,
    AuthorizationError,
    CompanyAccessError,
)

# HTTP Bearer token extractor
security = HTTPBearer(auto_error=False)


# ============ DATABASE DEPENDENCY ============

async def get_db():
    """Dependency for getting database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# ============ AUTHENTICATION DEPENDENCIES ============

async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Get current user from token if provided.
    Returns None if no token or invalid token.
    Does NOT raise exceptions - use for optional auth.
    """
    if not credentials:
        return None
    
    token = credentials.credentials
    if not token:
        return None
    
    # Try custom JWT first
    payload = AuthService.decode_token(token)
    if payload:
        user_id = payload.get("sub")
        if user_id:
            return await AuthService.get_user_by_id(db, user_id)
    
    # Try Entra ID token
    if settings.auth_mode == AuthMode.ENTRA or settings.azure_tenant_id:
        entra_payload = await AuthService.verify_entra_token(token)
        if entra_payload:
            email = (
                entra_payload.get("preferred_username") or
                entra_payload.get("email") or
                entra_payload.get("upn")
            )
            name = (
                entra_payload.get("name") or
                " ".join(filter(None, [
                    entra_payload.get("given_name"),
                    entra_payload.get("family_name")
                ]))
            )
            oid = entra_payload.get("oid") or entra_payload.get("sub")
            role = AuthService.role_from_entra_claims(entra_payload)
            
            if email and oid:
                return await AuthService.get_or_create_user_from_entra(
                    db=db,
                    email=email,
                    name=name or email,
                    azure_oid=oid,
                    role=role,
                )
    
    return None


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current authenticated user.
    Raises 401 if not authenticated.
    
    In DEV mode, allows fallback to a default dev user.
    """
    # Try to get user from token
    user = await get_current_user_optional(request, credentials, db)
    
    if user:
        # Check if user needs provisioning (FO/FD without company assignment)
        if user.role in (UserRole.DATA_OFFICER, UserRole.COMPANY_DIRECTOR):
            if not user.company_id and not user.cluster_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error": "not_provisioned",
                        "message": "Your account has not been provisioned. Please contact an administrator."
                    }
                )
        return user
    
    # DEV MODE: Allow unauthenticated access with default user
    if settings.auth_mode == AuthMode.DEV:
        # Check for dev user header or use default
        dev_email = request.headers.get("X-Dev-User-Email", "admin@maclarens.local")
        user = await AuthService.get_user_by_email(db, dev_email)
        if user:
            return user
        
        # If no user found and in dev mode, this is a setup issue
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dev mode: No users in database. Run seed script first."
        )
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_active_user(
    user: User = Depends(get_current_user),
) -> User:
    """Get current user and verify they are active"""
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    return user


# ============ ROLE-BASED DEPENDENCIES ============

def require_role(allowed_roles: List[UserRole]):
    """
    Dependency factory: Require user to have one of the allowed roles.
    
    Usage:
        @app.get("/admin-only")
        async def admin_endpoint(user: User = Depends(require_role([UserRole.ADMIN]))):
            ...
    """
    async def role_checker(
        user: User = Depends(get_current_active_user),
    ) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role(s): {[r.value for r in allowed_roles]}"
            )
        return user
    return role_checker


def require_permission(required: Permission):
    """
    Dependency factory: Require user to have a specific permission.
    
    Usage:
        @app.post("/reports")
        async def create_report(user: User = Depends(require_permission(Permission.CREATE_REPORTS))):
            ...
    """
    async def permission_checker(
        user: User = Depends(get_current_active_user),
    ) -> User:
        if not has_permission(user, required):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {required.value}"
            )
        return user
    return permission_checker


def require_any_permission(required: List[Permission]):
    """
    Dependency factory: Require user to have any of the given permissions.
    """
    async def permission_checker(
        user: User = Depends(get_current_active_user),
    ) -> User:
        if not has_any_permission(user, required):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permissions: {[p.value for p in required]}"
            )
        return user
    return permission_checker


# ============ CONVENIENCE DEPENDENCIES ============

# Admin only
async def require_admin(
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> User:
    """Require admin role"""
    return user


# Finance Director only
async def require_fd(
    user: User = Depends(require_role([UserRole.COMPANY_DIRECTOR])),
) -> User:
    """Require Finance Director role"""
    return user


# Finance Officer only
async def require_fo(
    user: User = Depends(require_role([UserRole.DATA_OFFICER])),
) -> User:
    """Require Finance Officer role"""
    return user


# CEO only
async def require_ceo(
    user: User = Depends(require_role([UserRole.CEO])),
) -> User:
    """Require CEO role"""
    return user


# Admin or CEO (can view everything)
async def require_admin_or_ceo(
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.CEO])),
) -> User:
    """Require admin or CEO role"""
    return user


# Can approve (FD)
async def require_can_approve(
    user: User = Depends(require_permission(Permission.APPROVE_REPORTS)),
) -> User:
    """Require report approval permission"""
    return user


# Can create reports (FO)
async def require_can_create_reports(
    user: User = Depends(require_permission(Permission.CREATE_REPORTS)),
) -> User:
    """Require report creation permission"""
    return user


# ============ COMPANY ACCESS DEPENDENCIES ============

class CompanyAccessChecker:
    """
    Dependency class for checking company access.
    
    Usage:
        @app.get("/companies/{company_id}/reports")
        async def get_company_reports(
            company_id: UUID,
            access: CompanyAccessChecker = Depends(CompanyAccessChecker()),
        ):
            await access.check(company_id)
            ...
    """
    def __init__(self):
        self.user: Optional[User] = None
        self.db: Optional[AsyncSession] = None
    
    async def __call__(
        self,
        user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
    ) -> "CompanyAccessChecker":
        self.user = user
        self.db = db
        return self
    
    async def check(self, company_id: UUID) -> bool:
        """Check if current user can access company, raise 403 if not"""
        if not await can_access_company(self.db, self.user, company_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied to company"
            )
        return True
    
    async def get_accessible_ids(self) -> Optional[List[UUID]]:
        """Get list of company IDs the user can access (None = all)"""
        return await get_accessible_company_ids(self.db, self.user)


async def verify_company_access(
    company_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> UUID:
    """
    Verify user has access to the specified company.
    Returns the company_id if access is granted.
    
    Usage:
        @app.get("/companies/{company_id}")
        async def get_company(
            company_id: UUID = Depends(verify_company_access),
        ):
            ...
    """
    if not await can_access_company(db, user, company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    return company_id


# ============ DEV MODE UTILITIES ============

def is_dev_mode() -> bool:
    """Check if running in development mode"""
    return settings.auth_mode == AuthMode.DEV


async def get_dev_user_or_current(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    In dev mode, allows setting user via X-Dev-User-Email header.
    In production, requires proper authentication.
    """
    # In dev mode, check for dev header first
    if is_dev_mode():
        dev_email = request.headers.get("X-Dev-User-Email")
        if dev_email:
            user = await AuthService.get_user_by_email(db, dev_email)
            if user:
                return user
    
    # Fall back to normal auth
    return await get_current_user(request, credentials, db)
