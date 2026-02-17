"""
Authentication Service — Production Grade
==========================================

Single RBAC engine for the "One Key, Four Doors" architecture:

  Microsoft Entra  →  Confirms WHO you are    (identity)
  Database         →  Confirms WHAT you can do (authorization)
  Portal Tag       →  Confirms WHERE you go    (routing)
  JWT              →  Locks your session        (stateless auth)

Portal → Allowed Role IDs:
  finance-officer  → [1, 3]
  finance-director → [2, 3]
  system-admin     → [3]
  md               → [4, 3]

Role 3 (System Admin) is a super-user present in every portal mapping.
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any, ClassVar, Optional

import httpx
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.constants import RoleID
from src.config.settings import settings
from src.db.models import RoleMaster, UserCompanyRoleMap, UserMaster

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Centralised authentication and authorization service."""

    # ── JWKS cache for Entra ID token verification ─────────────────────
    _jwks_cache: ClassVar[dict[str, tuple[float, dict[str, Any]]]] = {}
    _jwks_lock: ClassVar[asyncio.Lock] = asyncio.Lock()
    _jwks_ttl_seconds: ClassVar[int] = 3600

    # ── Role priority (lower = higher priority) ───────────────────────
    # When a user has multiple roles, the highest-priority one is used.
    ROLE_PRIORITY: ClassVar[dict[int, int]] = {
        int(RoleID.SYSTEM_ADMIN): 0,       # Admin is highest
        int(RoleID.MANAGING_DIRECTOR): 1,
        int(RoleID.FINANCIAL_DIRECTOR): 2,
        int(RoleID.FINANCIAL_OFFICER): 3,
    }

    # ── Human-readable role names ─────────────────────────────────────
    ROLE_NAMES: ClassVar[dict[int, str]] = {
        int(RoleID.FINANCIAL_OFFICER): "Finance Officer",
        int(RoleID.FINANCIAL_DIRECTOR): "Finance Director",
        int(RoleID.SYSTEM_ADMIN): "Admin",
        int(RoleID.MANAGING_DIRECTOR): "MD",
    }

    # ── PORTAL → ALLOWED ROLE IDS (The Core RBAC Map) ─────────────────
    # This is the single source of truth for portal access control.
    # Role 3 (System Admin) appears in every list = super-user.
    PORTAL_ROLE_MAP: ClassVar[dict[str, list[int]]] = {
        "finance-officer": [int(RoleID.FINANCIAL_OFFICER), int(RoleID.SYSTEM_ADMIN)],
        "finance-director": [int(RoleID.FINANCIAL_DIRECTOR), int(RoleID.SYSTEM_ADMIN)],
        "system-admin": [int(RoleID.SYSTEM_ADMIN)],
        "administrator": [int(RoleID.SYSTEM_ADMIN)],  # alias
        "admin": [int(RoleID.SYSTEM_ADMIN)],           # alias
        "md": [int(RoleID.MANAGING_DIRECTOR), int(RoleID.SYSTEM_ADMIN)],
    }

    # ── Portal → Dashboard route (for JWT portal claim) ───────────────
    PORTAL_DASHBOARD: ClassVar[dict[str, str]] = {
        "finance-officer": "/finance-officer/dashboard",
        "finance-director": "/finance-director/dashboard",
        "system-admin": "/system-admin/dashboard",
        "md": "/md/dashboard",
    }

    # ================================================================
    #  PASSWORD UTILITIES
    # ================================================================

    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    # ================================================================
    #  JWT TOKEN CREATION & DECODING
    # ================================================================

    @staticmethod
    def create_access_token(
        user_id: str,
        email: str,
        role: str,
        role_id: int,
        portal: Optional[str] = None,
        companies: Optional[list[str]] = None,
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        """
        Create a portal-aware JWT token.

        The token includes:
          sub       – user_id
          email     – user email
          role      – human-readable role name
          role_id   – integer role ID from role_master
          portal    – which portal this session is for
          companies – list of accessible company IDs
        """
        expire_delta = expires_delta or timedelta(hours=settings.jwt_expiration_hours)
        expires_at = datetime.now(timezone.utc) + expire_delta

        payload: dict[str, Any] = {
            "sub": user_id,
            "email": email,
            "role": role,
            "role_id": role_id,
            "portal": portal,
            "companies": companies or [],
            "iat": int(datetime.now(timezone.utc).timestamp()),
            "exp": int(expires_at.timestamp()),
            "type": "access",
        }
        return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    @staticmethod
    def decode_token(token: str) -> Optional[dict[str, Any]]:
        """Decode and verify a JWT token issued by this service."""
        try:
            return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        except JWTError:
            return None

    # ================================================================
    #  MICROSOFT ENTRA ID TOKEN VERIFICATION
    # ================================================================

    @classmethod
    async def _fetch_jwks(cls, tenant_id: str) -> Optional[dict[str, Any]]:
        """Fetch (and cache) JWKS from Microsoft for token signature verification."""
        now = time.time()
        cached = cls._jwks_cache.get(tenant_id)
        if cached and now - cached[0] < cls._jwks_ttl_seconds:
            return cached[1]

        async with cls._jwks_lock:
            cached = cls._jwks_cache.get(tenant_id)
            if cached and now - cached[0] < cls._jwks_ttl_seconds:
                return cached[1]

            url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    response = await client.get(url)
                    response.raise_for_status()
                jwks = response.json()
                cls._jwks_cache[tenant_id] = (time.time(), jwks)
                return jwks
            except Exception as e:
                logger.error("Failed to fetch JWKS: %s", e)
                return None

    @classmethod
    async def verify_entra_token(cls, token: str) -> Optional[dict[str, Any]]:
        """
        Verify a Microsoft Entra ID token (id_token or access_token).

        In dev mode without Azure config, falls back to unverified claims
        so local development works without real Entra credentials.
        """
        if not token:
            return None

        try:
            header = jwt.get_unverified_header(token)
        except JWTError:
            return None

        tenant_id = settings.azure_tenant_id
        client_id = settings.azure_client_id

        if not tenant_id or not client_id:
            # Dev mode fallback: accept unverified claims
            if cls._is_dev_mode():
                try:
                    return jwt.get_unverified_claims(token)
                except JWTError:
                    return None
            return None

        jwks = await cls._fetch_jwks(str(tenant_id))
        if not jwks:
            return None

        kid = header.get("kid")
        keys = jwks.get("keys", [])
        key = next((k for k in keys if k.get("kid") == kid), None)
        if not key:
            return None

        issuers = [
            f"https://login.microsoftonline.com/{tenant_id}/v2.0",
            f"https://sts.windows.net/{tenant_id}/",
        ]
        for issuer in issuers:
            try:
                return jwt.decode(
                    token,
                    key,
                    algorithms=["RS256"],
                    audience=str(client_id),
                    issuer=issuer,
                    options={"verify_at_hash": False},
                )
            except JWTError:
                continue
        return None

    @staticmethod
    def email_from_entra_claims(claims: dict[str, Any]) -> Optional[str]:
        """Extract email from Entra ID token claims."""
        return (
            claims.get("preferred_username")
            or claims.get("email")
            or claims.get("upn")
        )

    # ================================================================
    #  DATABASE RBAC CHECKS
    # ================================================================

    @classmethod
    async def get_user_by_id(cls, db: AsyncSession, user_id: str) -> Optional[UserMaster]:
        """Get an active user by their user_id."""
        result = await db.execute(
            select(UserMaster).where(
                UserMaster.user_id == user_id,
                UserMaster.is_active.is_(True),
            )
        )
        return result.scalar_one_or_none()

    @classmethod
    async def verify_user_by_email(
        cls,
        db: AsyncSession,
        email: str,
        allowed_role_ids: Optional[list[int]] = None,
    ) -> Optional[dict[str, Any]]:
        """
        Verify a user's identity and role by email.

        SQL equivalent:
            SELECT um.*, rm.role_name, ucrm.role_id, ucrm.company_id
            FROM analytics.user_master um
            JOIN analytics.user_company_role_map ucrm ON um.user_id = ucrm.user_id
            JOIN analytics.role_master rm ON ucrm.role_id = rm.role_id
            WHERE LOWER(TRIM(um.user_email)) = :email
              AND um.is_active = TRUE
              AND ucrm.is_active = TRUE
              AND ucrm.role_id = ANY(:allowed_role_ids)    -- if provided

        Returns:
            dict(user, role, role_id, accessible_companies) or None
        """
        normalized_email = email.strip().lower()

        # Step 1: Find active user
        user_result = await db.execute(
            select(UserMaster).where(
                func.lower(func.trim(UserMaster.user_email)) == normalized_email,
                UserMaster.is_active.is_(True),
            )
        )
        user = user_result.scalar_one_or_none()
        if not user:
            logger.info("User not found or inactive: %s", normalized_email)
            return None

        # Step 2: Get active role mappings
        role_query = (
            select(
                UserCompanyRoleMap.company_id,
                UserCompanyRoleMap.role_id,
                RoleMaster.role_name,
            )
            .join(RoleMaster, RoleMaster.role_id == UserCompanyRoleMap.role_id)
            .where(
                UserCompanyRoleMap.user_id == user.user_id,
                UserCompanyRoleMap.is_active.is_(True),
            )
        )

        # Step 3: Filter by allowed roles (portal-specific)
        if allowed_role_ids is not None:
            role_query = role_query.where(
                UserCompanyRoleMap.role_id.in_(allowed_role_ids)
            )

        role_rows_result = await db.execute(role_query)
        role_rows = role_rows_result.all()

        if not role_rows:
            logger.info("No matching roles for %s (allowed: %s)", normalized_email, allowed_role_ids)
            return None

        # Step 4: Pick highest-priority role, collect companies
        accessible_companies = sorted({str(row.company_id) for row in role_rows})

        selected = min(
            role_rows,
            key=lambda row: cls.ROLE_PRIORITY.get(int(row.role_id), 999),
        )
        role_id = int(selected.role_id)
        role_name = selected.role_name or cls.ROLE_NAMES.get(role_id, "Unknown")

        # Attach to user object for downstream use
        user.current_role_id = role_id
        user.current_role = role_name
        user.accessible_companies = accessible_companies

        return {
            "user": user,
            "role": role_name,
            "role_id": role_id,
            "accessible_companies": accessible_companies,
        }

    @classmethod
    async def check_portal_access(
        cls,
        db: AsyncSession,
        email: str,
        portal: str,
    ) -> Optional[dict[str, Any]]:
        """
        Check whether a user can access a specific portal.

        This is the main RBAC entry point:
          1. Resolve portal → allowed_role_ids via PORTAL_ROLE_MAP
          2. Call verify_user_by_email with those IDs
          3. Return user context or None

        Example:
            check_portal_access(db, "admin@company.com", "finance-officer")
            → Checks role_id IN (1, 3) for this email
        """
        portal_key = portal.strip().lower().replace("_", "-")
        allowed_role_ids = cls.PORTAL_ROLE_MAP.get(portal_key)

        if allowed_role_ids is None:
            logger.warning("Unknown portal: %s", portal_key)
            return None

        return await cls.verify_user_by_email(db, email, allowed_role_ids)

    @classmethod
    async def get_or_create_user_from_entra(
        cls,
        db: AsyncSession,
        email: str,
        name: str,
        azure_oid: str,
        role: Optional[str] = None,
    ) -> Optional[UserMaster]:
        """Look up an existing user by email. No auto-create."""
        context = await cls.verify_user_by_email(db, email)
        if not context:
            return None
        return context["user"]

    # ================================================================
    #  HELPERS
    # ================================================================

    @staticmethod
    def _auth_mode_value() -> str:
        mode = settings.auth_mode.value if hasattr(settings.auth_mode, "value") else str(settings.auth_mode)
        return mode.lower()

    @classmethod
    def _is_dev_mode(cls) -> bool:
        return cls._auth_mode_value() == "dev"
