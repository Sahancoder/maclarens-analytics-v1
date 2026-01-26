"""
Authentication Router
REST endpoints for authentication and session management

Endpoints:
- POST /auth/login - Email/password login (dev mode)
- POST /auth/login/dev - Dev mode login (select any user)
- GET  /auth/me - Get current user info
- POST /auth/logout - Logout (client-side token invalidation)
- GET  /auth/verify - Verify token validity
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.config.settings import settings, AuthMode
from src.db.models import User, UserRole, Company, Cluster
from src.db.session import AsyncSessionLocal
from src.services.auth_service import AuthService
from src.security.middleware import (
    get_db,
    get_current_user,
    get_current_active_user,
    get_current_user_optional,
)
from src.security.permissions import (
    get_user_permissions,
    get_accessible_company_ids,
    Permission,
)
from src.security.rate_limit import rate_limit, RateLimitConfig

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============ REQUEST/RESPONSE MODELS ============

class LoginRequest(BaseModel):
    """Email/password login request"""
    email: EmailStr
    password: str


class DevLoginRequest(BaseModel):
    """Dev mode login - select user by email"""
    email: EmailStr


class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: "UserResponse"


class UserResponse(BaseModel):
    """User information response"""
    id: str
    email: str
    name: str
    role: str
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    cluster_id: Optional[str] = None
    cluster_name: Optional[str] = None
    is_active: bool
    permissions: List[str]
    accessible_company_ids: Optional[List[str]] = None  # None = all


class AuthStatusResponse(BaseModel):
    """Auth status response"""
    authenticated: bool
    auth_mode: str
    user: Optional[UserResponse] = None


class DevUsersResponse(BaseModel):
    """Available dev users response"""
    users: List["DevUserInfo"]


class DevUserInfo(BaseModel):
    """Dev user info"""
    email: str
    name: str
    role: str
    company: Optional[str] = None


# Enable forward refs
TokenResponse.model_rebuild()
DevUsersResponse.model_rebuild()


# ============ HELPER FUNCTIONS ============

async def build_user_response(db: AsyncSession, user: User) -> UserResponse:
    """Build a complete user response with permissions and access info"""
    # Get company name if assigned
    company_name = None
    if user.company_id:
        result = await db.execute(
            select(Company.name).where(Company.id == user.company_id)
        )
        company_name = result.scalar_one_or_none()
    
    # Get cluster name if assigned
    cluster_name = None
    if user.cluster_id:
        result = await db.execute(
            select(Cluster.name).where(Cluster.id == user.cluster_id)
        )
        cluster_name = result.scalar_one_or_none()
    
    # Get permissions
    permissions = get_user_permissions(user)
    
    # Get accessible companies
    accessible = await get_accessible_company_ids(db, user)
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        role=user.role.value if hasattr(user.role, 'value') else str(user.role),
        company_id=str(user.company_id) if user.company_id else None,
        company_name=company_name,
        cluster_id=str(user.cluster_id) if user.cluster_id else None,
        cluster_name=cluster_name,
        is_active=user.is_active,
        permissions=[p.value for p in permissions],
        accessible_company_ids=[str(cid) for cid in accessible] if accessible is not None else None
    )


# ============ ENDPOINTS ============

@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit(*RateLimitConfig.AUTH, key_prefix="auth")),
):
    """
    Login with email and password.
    Returns JWT token for authenticated requests.
    """
    user = await AuthService.authenticate(db, request.email, request.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    await db.commit()
    
    # Create token
    token = AuthService.create_access_token(
        user_id=str(user.id),
        email=user.email,
        role=user.role.value if hasattr(user.role, 'value') else str(user.role)
    )
    
    user_response = await build_user_response(db, user)
    
    return TokenResponse(
        access_token=token,
        expires_in=settings.jwt_expiration_hours * 3600,
        user=user_response
    )


@router.post("/login/dev", response_model=TokenResponse)
async def dev_login(
    request: DevLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Dev mode login - login as any user without password.
    Only available when AUTH_MODE=dev.
    """
    if settings.auth_mode != AuthMode.DEV:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev login only available in development mode"
        )
    
    user = await AuthService.get_user_by_email(db, request.email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {request.email} not found"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    await db.commit()
    
    # Create token
    token = AuthService.create_access_token(
        user_id=str(user.id),
        email=user.email,
        role=user.role.value if hasattr(user.role, 'value') else str(user.role)
    )
    
    user_response = await build_user_response(db, user)
    
    return TokenResponse(
        access_token=token,
        expires_in=settings.jwt_expiration_hours * 3600,
        user=user_response
    )


@router.get("/dev/users", response_model=DevUsersResponse)
async def get_dev_users(
    db: AsyncSession = Depends(get_db),
):
    """
    Get list of available users for dev login.
    Only available when AUTH_MODE=dev.
    """
    if settings.auth_mode != AuthMode.DEV:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only available in development mode"
        )
    
    result = await db.execute(
        select(User).where(User.is_active == True).order_by(User.role, User.name)
    )
    users = result.scalars().all()
    
    dev_users = []
    for user in users:
        # Get company name
        company_name = None
        if user.company_id:
            company_result = await db.execute(
                select(Company.name).where(Company.id == user.company_id)
            )
            company_name = company_result.scalar_one_or_none()
        
        dev_users.append(DevUserInfo(
            email=user.email,
            name=user.name,
            role=user.role.value if hasattr(user.role, 'value') else str(user.role),
            company=company_name
        ))
    
    return DevUsersResponse(users=dev_users)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current authenticated user information"""
    return await build_user_response(db, user)


@router.get("/verify", response_model=AuthStatusResponse)
async def verify_auth(
    request: Request,
    user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify current authentication status.
    Returns user info if authenticated, or auth mode if not.
    """
    auth_mode = settings.auth_mode.value if hasattr(settings.auth_mode, 'value') else str(settings.auth_mode)
    
    if user:
        user_response = await build_user_response(db, user)
        return AuthStatusResponse(
            authenticated=True,
            auth_mode=auth_mode,
            user=user_response
        )
    
    return AuthStatusResponse(
        authenticated=False,
        auth_mode=auth_mode,
        user=None
    )


@router.post("/logout")
async def logout(
    user: User = Depends(get_current_active_user),
):
    """
    Logout endpoint.
    
    Note: Since we use stateless JWTs, the actual token invalidation
    must happen on the client side by removing the token.
    
    For server-side invalidation, you would need to implement a token
    blacklist (e.g., in Redis) - not included in this basic implementation.
    """
    return {
        "message": "Logged out successfully",
        "note": "Please remove the token from client storage"
    }


@router.get("/config")
async def get_auth_config():
    """
    Get authentication configuration (for frontend).
    Returns auth mode and Entra ID configuration if applicable.
    """
    auth_mode = settings.auth_mode.value if hasattr(settings.auth_mode, 'value') else str(settings.auth_mode)
    
    config = {
        "auth_mode": auth_mode,
        "dev_mode": auth_mode == "dev",
    }
    
    # Include Entra config for SSO
    if settings.azure_tenant_id and settings.azure_client_id:
        config["entra"] = {
            "tenant_id": settings.azure_tenant_id,
            "client_id": settings.azure_client_id,
            "authority": f"https://login.microsoftonline.com/{settings.azure_tenant_id}",
            "redirect_uri": f"{settings.app_url}/auth/callback",
        }
    
    return config
