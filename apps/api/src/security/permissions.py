"""
Role-Based Access Control (RBAC) System
Complete permission and access control implementation for McLarens Analytics

Roles (Mapped to RoleMaster):
- SYSTEM_ADMIN (ID: 3): Full system access
- MANAGING_DIRECTOR (ID: 4): Dashboard access, view all
- FINANCIAL_DIRECTOR (ID: 2): Review/approve reports
- FINANCIAL_OFFICER (ID: 1): Create/submit reports
"""
from enum import Enum
from typing import List, Set, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import (
    UserMaster, UserCompanyMap
)
from src.config.constants import RoleID

# ============ PERMISSIONS ============

class Permission(str, Enum):
    """Fine-grained permissions for RBAC"""
    READ_OWN_REPORTS = "read_own_reports"
    READ_ASSIGNED_REPORTS = "read_assigned_reports"
    READ_ALL_REPORTS = "read_all_reports"
    CREATE_REPORTS = "create_reports"
    SUBMIT_REPORTS = "submit_reports"
    APPROVE_REPORTS = "approve_reports"
    REJECT_REPORTS = "reject_reports"

    VIEW_OWN_FINANCIALS = "view_own_financials"
    VIEW_ASSIGNED_FINANCIALS = "view_assigned_financials"
    VIEW_ALL_FINANCIALS = "view_all_financials"
    EDIT_FINANCIALS = "edit_financials"
    IMPORT_BUDGET = "import_budget"

    VIEW_OWN_COMPANY = "view_own_company"
    VIEW_ASSIGNED_COMPANIES = "view_assigned_companies"
    VIEW_ALL_COMPANIES = "view_all_companies"
    MANAGE_COMPANIES = "manage_companies"

    VIEW_USERS = "view_users"
    MANAGE_USERS = "manage_users"
    ASSIGN_ROLES = "assign_roles"

    VIEW_ANALYTICS = "view_analytics"
    VIEW_DASHBOARDS = "view_dashboards"
    EXPORT_DATA = "export_data"

    MANAGE_SYSTEM = "manage_system"
    VIEW_AUDIT_LOGS = "view_audit_logs"


# ============ ROLE → PERMISSION MAPPING ============

ROLE_PERMISSIONS: dict[int, Set[Permission]] = {
    RoleID.FINANCIAL_OFFICER: {
        Permission.READ_OWN_REPORTS,
        Permission.CREATE_REPORTS,
        Permission.SUBMIT_REPORTS,
        Permission.VIEW_OWN_FINANCIALS,
        Permission.EDIT_FINANCIALS,
        Permission.VIEW_OWN_COMPANY,
    },
    RoleID.FINANCIAL_DIRECTOR: {
        Permission.READ_ASSIGNED_REPORTS,
        Permission.APPROVE_REPORTS,
        Permission.REJECT_REPORTS,
        Permission.VIEW_ASSIGNED_FINANCIALS,
        Permission.VIEW_ASSIGNED_COMPANIES,
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_DASHBOARDS,
        Permission.EXPORT_DATA,
    },
    RoleID.MANAGING_DIRECTOR: {
        Permission.READ_ALL_REPORTS,
        Permission.VIEW_ALL_FINANCIALS,
        Permission.VIEW_ALL_COMPANIES,
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_DASHBOARDS,
        Permission.EXPORT_DATA,
    },
    RoleID.SYSTEM_ADMIN: {
        Permission.READ_ALL_REPORTS,
        Permission.VIEW_ALL_FINANCIALS,
        Permission.IMPORT_BUDGET,
        Permission.VIEW_ALL_COMPANIES,
        Permission.MANAGE_COMPANIES,
        Permission.VIEW_USERS,
        Permission.MANAGE_USERS,
        Permission.ASSIGN_ROLES,
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_DASHBOARDS,
        Permission.MANAGE_SYSTEM,
        Permission.VIEW_AUDIT_LOGS,
        Permission.EXPORT_DATA,
    },
}


# ============ PERMISSION CHECKING ============

def has_permission(user: UserMaster, permission: Permission, role_id: int = None) -> bool:
    """Check if user has a specific permission via their role"""
    if not user:
        return False
        
    # If role_id is not passed, try to get from user context (middleware usually sets this)
    if not role_id:
        role_id = getattr(user, "current_role_id", None)
        
    if not role_id:
        return False
        
    user_permissions = ROLE_PERMISSIONS.get(role_id, set())
    return permission in user_permissions


def has_any_permission(user: UserMaster, permissions: List[Permission], role_id: int = None) -> bool:
    return any(has_permission(user, p, role_id) for p in permissions)


def has_all_permissions(user: UserMaster, permissions: List[Permission], role_id: int = None) -> bool:
    return all(has_permission(user, p, role_id) for p in permissions)


def get_user_permissions(user: UserMaster, role_id: int = None) -> Set[Permission]:
    if not user:
        return set()
    if not role_id:
        role_id = getattr(user, "current_role_id", None)
    if not role_id:
        return set()
    return ROLE_PERMISSIONS.get(role_id, set())


# ============ COMPANY ACCESS CONTROL ============

async def get_accessible_company_ids(
    db: AsyncSession,
    user: UserMaster
) -> Optional[List[str]]:
    """
    Get list of company IDs the user can access.
    Returns None if user can access ALL companies (Admin/MD).
    """
    if not user:
        return []

    # Get Primary Role ID from user context
    role_id = getattr(user, "current_role_id", None)

    # Admin and MD can access all companies
    if role_id in (RoleID.SYSTEM_ADMIN, RoleID.MANAGING_DIRECTOR):
        return None  # None means "all"

    accessible = set()

    # Get from UserCompanyMap (direct assignment table in analytics schema)
    stmt2 = select(UserCompanyMap.company_id).where(
        UserCompanyMap.user_id == user.user_id,
        UserCompanyMap.is_active == True
    )
    result2 = await db.execute(stmt2)
    for row in result2.all():
        accessible.add(row[0])

    return list(accessible)


async def can_access_company(
    db: AsyncSession,
    user: UserMaster,
    company_id: str
) -> bool:
    """Check if user can access a specific company."""
    accessible = await get_accessible_company_ids(db, user)
    if accessible is None:
        return True
    return company_id in accessible


async def filter_companies_for_user(
    db: AsyncSession,
    user: UserMaster,
    company_ids: List[str]
) -> List[str]:
    accessible = await get_accessible_company_ids(db, user)
    if accessible is None:
        return company_ids
    allowed = set(accessible)
    return [company_id for company_id in company_ids if company_id in allowed]


def is_admin(user: UserMaster) -> bool:
    return bool(user and getattr(user, "current_role_id", None) == RoleID.SYSTEM_ADMIN)


def is_ceo(user: UserMaster) -> bool:
    return bool(user and getattr(user, "current_role_id", None) == RoleID.MANAGING_DIRECTOR)


def is_finance_director(user: UserMaster) -> bool:
    return bool(user and getattr(user, "current_role_id", None) == RoleID.FINANCIAL_DIRECTOR)


def is_finance_officer(user: UserMaster) -> bool:
    return bool(user and getattr(user, "current_role_id", None) == RoleID.FINANCIAL_OFFICER)


def can_approve_reports(user: UserMaster) -> bool:
    return has_permission(user, Permission.APPROVE_REPORTS)


def can_create_reports(user: UserMaster) -> bool:
    return has_permission(user, Permission.CREATE_REPORTS)


def can_view_all_companies(user: UserMaster) -> bool:
    return has_permission(user, Permission.VIEW_ALL_COMPANIES)


def can_manage_users(user: UserMaster) -> bool:
    return has_permission(user, Permission.MANAGE_USERS)


class AuthorizationError(Exception):
    def __init__(self, message: str = "Not authorized"):
        super().__init__(message)
        self.message = message


class CompanyAccessError(AuthorizationError):
    def __init__(self, company_id: str):
        super().__init__(f"Access denied to company {company_id}")
        self.company_id = company_id
