"""
Authentication & Authorization Middleware — Production Grade
=============================================================

Middleware dependencies for FastAPI route protection.

Architecture:
  1. get_current_user  — Extracts user from JWT (or Entra token fallback)
  2. require_role      — Checks if user has one of the allowed role IDs
  3. require_portal    — Checks JWT portal claim matches the route's portal
  4. CompanyAccess     — Verifies user can access a specific company

The JWT token contains: sub, email, role, role_id, portal, companies
This middleware reads those claims and enforces access control.
"""
import logging
from typing import Any, List, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.constants import RoleID
from src.config.settings import settings
from src.db.models import UserCompanyMap, UserCompanyRoleMap, UserMaster
from src.db.session import get_db  # noqa: F401 — re-exported for routers
from src.security.permissions import (
    Permission,
    can_approve_reports,
    can_create_reports,
    has_permission,
)
from src.services.auth_service import AuthService

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


# get_db is imported from src.db.session and re-exported for routers


# ════════════════════════════════════════════════════════════════════
#  USER EXTRACTION FROM TOKEN
# ════════════════════════════════════════════════════════════════════

async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[UserMaster]:
    """
    Extract the current user from the Authorization header.

    Tries:
      1. Backend JWT (issued by /auth/microsoft-login or /auth/login/dev)
      2. Entra ID token (direct Microsoft token, fallback)

    Attaches current_role_id, current_role, current_portal, and
    accessible_companies to the user object.
    """
    if not credentials or not credentials.credentials:
        return None

    token = credentials.credentials

    # ── Try backend JWT first ─────────────────────────────────────
    payload = AuthService.decode_token(token)
    if payload:
        user_id = payload.get("sub")
        user = await AuthService.get_user_by_id(db, user_id)
        if user:
            user.current_role_id = payload.get("role_id")
            user.current_role = payload.get("role")
            user.current_portal = payload.get("portal")
            user.accessible_companies = payload.get("companies", [])

            # Map string role to RoleID if role_id is missing
            if user.current_role_id is None and user.current_role:
                user.current_role_id = _role_name_to_id(user.current_role)

            return user

    # ── Fallback: try Entra ID token ──────────────────────────────
    entra_payload = await AuthService.verify_entra_token(token)
    if entra_payload:
        email = AuthService.email_from_entra_claims(entra_payload)
        if email:
            user_context = await AuthService.verify_user_by_email(db, email)
            if user_context:
                user = user_context["user"]
                user.current_role_id = user_context.get("role_id")
                user.current_role = user_context.get("role")
                user.current_portal = None  # No portal claim in raw Entra tokens
                user.accessible_companies = user_context.get("accessible_companies", [])
                return user

    return None


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> UserMaster:
    """Get current user or raise 401."""
    user = await get_current_user_optional(request, credentials, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    return user


async def get_current_active_user(
    user: UserMaster = Depends(get_current_user),
) -> UserMaster:
    """Alias: get current user and verify they are active."""
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


# ════════════════════════════════════════════════════════════════════
#  ROLE CHECKERS
# ════════════════════════════════════════════════════════════════════

def require_role(allowed_roles: List[int]):
    """
    Factory: creates a dependency that checks the user's role_id.

    Usage:
        @router.get("/admin-only", dependencies=[Depends(require_role([3]))])
    """
    async def role_checker(user: UserMaster = Depends(get_current_active_user)):
        if user.current_role_id not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role IDs: {allowed_roles}. Your role: {user.current_role_id}",
            )
        return user
    return role_checker


async def require_admin(user: UserMaster = Depends(get_current_active_user)):
    """Only System Admin (role_id=3) can access."""
    if user.current_role_id != RoleID.SYSTEM_ADMIN:
        raise HTTPException(status_code=403, detail="System Admin access required")
    return user


async def require_fo(user: UserMaster = Depends(get_current_active_user)):
    """Only Finance Officer (role_id=1) can access."""
    if user.current_role_id != RoleID.FINANCIAL_OFFICER:
        raise HTTPException(status_code=403, detail="Finance Officer access required")
    return user


async def require_fd(user: UserMaster = Depends(get_current_active_user)):
    """Only Finance Director (role_id=2) can access."""
    if user.current_role_id != RoleID.FINANCIAL_DIRECTOR:
        raise HTTPException(status_code=403, detail="Finance Director access required")
    return user


async def require_ceo(user: UserMaster = Depends(get_current_active_user)):
    """Only MD/CEO (role_id=4) can access."""
    if user.current_role_id != RoleID.MANAGING_DIRECTOR:
        raise HTTPException(status_code=403, detail="MD/CEO access required")
    return user


async def require_admin_or_ceo(user: UserMaster = Depends(get_current_active_user)):
    """Admin or MD can access."""
    if user.current_role_id not in (RoleID.SYSTEM_ADMIN, RoleID.MANAGING_DIRECTOR):
        raise HTTPException(status_code=403, detail="Admin or MD access required")
    return user


# ════════════════════════════════════════════════════════════════════
#  PORTAL ENFORCEMENT (Critical for security)
# ════════════════════════════════════════════════════════════════════

def require_portal(portal_name: str):
    """
    Factory: creates a dependency that checks the JWT's portal claim.

    Prevents cross-portal misuse (e.g. using a finance-officer token
    to access /system-admin/* routes).

    Usage:
        @router.get("/finance-officer/data",
                     dependencies=[Depends(require_portal("finance-officer"))])
    """
    async def portal_checker(user: UserMaster = Depends(get_current_active_user)):
        user_portal = getattr(user, "current_portal", None)

        # Admin (role_id=3) bypass: can access any portal
        if user.current_role_id == RoleID.SYSTEM_ADMIN:
            return user

        if user_portal != portal_name:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This endpoint requires portal '{portal_name}'. "
                       f"Your token is for portal '{user_portal}'.",
            )
        return user
    return portal_checker


# ════════════════════════════════════════════════════════════════════
#  PERMISSION CHECKERS
# ════════════════════════════════════════════════════════════════════

def require_permission(permission: Permission):
    async def permission_checker(user: UserMaster = Depends(get_current_active_user)):
        if not has_permission(user, permission):
            raise HTTPException(status_code=403, detail=f"Missing permission: {permission.value}")
        return user
    return permission_checker


def require_any_permission(permissions: List[Permission]):
    async def permission_checker(user: UserMaster = Depends(get_current_active_user)):
        if not any(has_permission(user, p) for p in permissions):
            raise HTTPException(status_code=403, detail="Missing required permissions")
        return user
    return permission_checker


async def require_can_approve(user: UserMaster = Depends(get_current_active_user)):
    if not can_approve_reports(user):
        raise HTTPException(status_code=403, detail="Approval permission required")
    return user


async def require_can_create_reports(user: UserMaster = Depends(get_current_active_user)):
    if not can_create_reports(user):
        raise HTTPException(status_code=403, detail="Create report permission required")
    return user


# ════════════════════════════════════════════════════════════════════
#  COMPANY ACCESS CONTROL
# ════════════════════════════════════════════════════════════════════

class CompanyAccessChecker:
    def __init__(self, company_id: str):
        self.company_id = company_id

    async def __call__(
        self,
        user: UserMaster = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
    ) -> UserMaster:
        return await verify_company_access(self.company_id, user, db)


async def verify_company_access(
    company_id: str,
    user: UserMaster = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> UserMaster:
    """Verify user has access to a specific company."""
    # Admin and MD have global access
    if user.current_role_id in (RoleID.SYSTEM_ADMIN, RoleID.MANAGING_DIRECTOR):
        return user

    # Check cached list from JWT
    accessible = getattr(user, "accessible_companies", []) or []
    if company_id in accessible:
        return user

    # Fallback: check DB directly
    res = await db.execute(
        select(UserCompanyMap).where(
            UserCompanyMap.user_id == user.user_id,
            UserCompanyMap.company_id == company_id,
            UserCompanyMap.is_active == True,
        )
    )
    if res.scalar_one_or_none():
        return user

    res2 = await db.execute(
        select(UserCompanyRoleMap).where(
            UserCompanyRoleMap.user_id == user.user_id,
            UserCompanyRoleMap.company_id == company_id,
            UserCompanyRoleMap.is_active == True,
        )
    )
    if res2.scalar_one_or_none():
        return user

    raise HTTPException(status_code=403, detail=f"Access denied to company {company_id}")


# ════════════════════════════════════════════════════════════════════
#  HELPERS
# ════════════════════════════════════════════════════════════════════

def is_dev_mode() -> bool:
    mode = settings.auth_mode.value if hasattr(settings.auth_mode, "value") else str(settings.auth_mode)
    return mode.lower() == "dev"


async def get_dev_user_or_current(
    request: Request,
    user: UserMaster = Depends(get_current_active_user),
) -> UserMaster:
    return user


def _role_name_to_id(role_name: str) -> Optional[int]:
    """Map a role name string to its RoleID integer."""
    mapping = {
        "finance officer": int(RoleID.FINANCIAL_OFFICER),
        "finance director": int(RoleID.FINANCIAL_DIRECTOR),
        "admin": int(RoleID.SYSTEM_ADMIN),
        "system admin": int(RoleID.SYSTEM_ADMIN),
        "md": int(RoleID.MANAGING_DIRECTOR),
        "managing director": int(RoleID.MANAGING_DIRECTOR),
    }
    return mapping.get(role_name.strip().lower()) if role_name else None
