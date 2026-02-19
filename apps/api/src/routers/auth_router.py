"""
Authentication Router — Production Grade
=========================================

Endpoints:
  POST /auth/microsoft-login   — Login via Microsoft Entra ID token
  POST /auth/login/dev         — Dev-mode login by email (disabled in production)
  POST /auth/check-access      — Verify portal access without issuing a token
  GET  /auth/me                — Get current authenticated user info
  POST /auth/logout            — Client-side logout acknowledgement

Flow:
  1. Frontend sends Microsoft ID token + portal name
  2. Backend verifies token, extracts email
  3. Backend checks email + role against PORTAL_ROLE_MAP
  4. If allowed → issues portal-aware JWT
  5. If denied  → returns 403 with clear error message
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.settings import settings
from src.db.models import UserMaster
from src.security.middleware import get_current_active_user, get_db
from src.security.rate_limit import rate_limit_auth
from src.services.auth_service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ════════════════════════════════════════════════════════════════════
#  REQUEST / RESPONSE MODELS
# ════════════════════════════════════════════════════════════════════

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    role_id: int
    portal: Optional[str] = None
    companies: List[str]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: UserResponse


class MicrosoftLoginRequest(BaseModel):
    access_token: str
    portal: Optional[str] = None


class DevLoginRequest(BaseModel):
    email: EmailStr
    portal: Optional[str] = None


class PortalAccessRequest(BaseModel):
    email: EmailStr
    portal: str


class PortalAccessResponse(BaseModel):
    has_access: bool
    role: Optional[str] = None
    role_id: Optional[int] = None
    companies: List[str] = []


# ════════════════════════════════════════════════════════════════════
#  HELPER
# ════════════════════════════════════════════════════════════════════

def _auth_mode() -> str:
    mode = settings.auth_mode.value if hasattr(settings.auth_mode, "value") else str(settings.auth_mode)
    return mode.lower()


def _build_token_response(
    user: UserMaster,
    role: str,
    role_id: int,
    companies: list[str],
    portal: Optional[str] = None,
) -> TokenResponse:
    """Build a standardised TokenResponse with portal-aware JWT."""
    access_token = AuthService.create_access_token(
        user_id=user.user_id,
        email=user.user_email,
        role=role,
        role_id=role_id,
        portal=portal,
        companies=companies,
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.jwt_expiration_hours * 3600,
        user=UserResponse(
            id=user.user_id,
            email=user.user_email,
            name=f"{user.first_name} {user.last_name}".strip(),
            role=role,
            role_id=role_id,
            portal=portal,
            companies=companies,
        ),
    )


async def _login_with_rbac(
    db: AsyncSession,
    email: str,
    portal: Optional[str],
    error_prefix: str = "Access denied",
) -> TokenResponse:
    """
    Shared login logic for both Microsoft and dev endpoints.

    1. If portal is provided → check_portal_access (role_id filter)
    2. If no portal          → verify_user_by_email (any active role)
    3. If access granted     → build JWT with portal claim
    4. If denied             → raise 403
    """
    if portal:
        user_context = await AuthService.check_portal_access(db, email, portal)
    else:
        user_context = await AuthService.verify_user_by_email(db, email)

    if not user_context:
        detail = (
            f"{error_prefix}. Your account ({email}) does not have the required "
            f"role for the '{portal}' portal."
            if portal
            else f"{error_prefix}. User {email} is not provisioned or inactive."
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

    return _build_token_response(
        user=user_context["user"],
        role=user_context["role"],
        role_id=user_context["role_id"],
        companies=user_context["accessible_companies"],
        portal=portal,
    )


# ════════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ════════════════════════════════════════════════════════════════════

@router.post("/microsoft-login", response_model=TokenResponse, dependencies=[rate_limit_auth()])
async def microsoft_login(
    request: MicrosoftLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Login with Microsoft Entra ID token.

    Flow:
      1. Verify the Entra ID token (signature + claims)
      2. Extract email from token claims
      3. Run RBAC check: email + portal → allowed?
      4. Issue portal-aware JWT
    """
    # Verify the Microsoft token
    payload = await AuthService.verify_entra_token(request.access_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Microsoft token",
        )

    email = AuthService.email_from_entra_claims(payload)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email claim not found in Microsoft token",
        )

    logger.info("Microsoft login: email=%s, portal=%s", email, request.portal)
    return await _login_with_rbac(db, email, request.portal, "Access denied")


@router.post("/login/dev", response_model=TokenResponse, dependencies=[rate_limit_auth()])
async def dev_login(
    request: DevLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Dev-mode login by email. Disabled when AUTH_MODE != 'dev'.

    Same RBAC logic as Microsoft login, but accepts email directly
    instead of requiring a Microsoft token.
    """
    if _auth_mode() != "dev":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev login is disabled when AUTH_MODE is not 'dev'.",
        )

    logger.info("Dev login: email=%s, portal=%s", request.email, request.portal)
    return await _login_with_rbac(db, request.email, request.portal, "Access denied")


@router.post("/check-access", response_model=PortalAccessResponse, dependencies=[rate_limit_auth()])
async def check_portal_access(
    request: PortalAccessRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Check if a user has access to a specific portal WITHOUT issuing a token.

    Used by the frontend callback page to verify access after Microsoft
    authentication, before requesting a full login token.

    SQL logic:
      SELECT EXISTS (
        SELECT 1
        FROM analytics.user_master um
        JOIN analytics.user_company_role_map ucrm ON um.user_id = ucrm.user_id
        WHERE LOWER(TRIM(um.user_email)) = :email
          AND um.is_active = true
          AND ucrm.is_active = true
          AND ucrm.role_id IN (:allowed_role_ids)
      );
    """
    user_context = await AuthService.check_portal_access(db, request.email, request.portal)

    if not user_context:
        return PortalAccessResponse(has_access=False)

    return PortalAccessResponse(
        has_access=True,
        role=user_context["role"],
        role_id=user_context["role_id"],
        companies=user_context["accessible_companies"],
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: UserMaster = Depends(get_current_active_user),
):
    """Get the currently authenticated user's info from their JWT."""
    role = getattr(user, "current_role", None) or "Unknown"
    role_id = getattr(user, "current_role_id", None) or 0
    companies = getattr(user, "accessible_companies", []) or []

    return UserResponse(
        id=user.user_id,
        email=user.user_email,
        name=f"{user.first_name} {user.last_name}".strip(),
        role=role,
        role_id=role_id,
        companies=companies,
    )


@router.post("/logout")
async def logout():
    """
    Logout endpoint.
    JWT is stateless — actual logout is handled client-side by deleting the token.
    """
    return {"message": "Logged out"}
