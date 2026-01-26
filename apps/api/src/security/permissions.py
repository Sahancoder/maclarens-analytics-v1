"""
Role-Based Access Control (RBAC) System
Complete permission and access control implementation for McLarens Analytics

Roles:
- ADMIN: Full system access, user management
- CEO: Dashboard access, view all companies (read-only)
- COMPANY_DIRECTOR (FD): Review/approve reports for assigned companies
- DATA_OFFICER (FO): Create/submit reports for assigned company
"""
from enum import Enum
from typing import List, Set, Optional, Callable, Any
from functools import wraps
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import User, UserRole, Company, CompanyUserRole


# ============ PERMISSIONS ============

class Permission(str, Enum):
    """Fine-grained permissions for RBAC"""
    # Report permissions
    READ_OWN_REPORTS = "read_own_reports"
    READ_ASSIGNED_REPORTS = "read_assigned_reports"
    READ_ALL_REPORTS = "read_all_reports"
    CREATE_REPORTS = "create_reports"
    SUBMIT_REPORTS = "submit_reports"
    APPROVE_REPORTS = "approve_reports"
    REJECT_REPORTS = "reject_reports"
    
    # Financial data permissions
    VIEW_OWN_FINANCIALS = "view_own_financials"
    VIEW_ASSIGNED_FINANCIALS = "view_assigned_financials"
    VIEW_ALL_FINANCIALS = "view_all_financials"
    EDIT_FINANCIALS = "edit_financials"
    IMPORT_BUDGET = "import_budget"
    
    # Company permissions
    VIEW_OWN_COMPANY = "view_own_company"
    VIEW_ASSIGNED_COMPANIES = "view_assigned_companies"
    VIEW_ALL_COMPANIES = "view_all_companies"
    MANAGE_COMPANIES = "manage_companies"
    
    # User permissions
    VIEW_USERS = "view_users"
    MANAGE_USERS = "manage_users"
    ASSIGN_ROLES = "assign_roles"
    
    # Analytics/Dashboard permissions
    VIEW_ANALYTICS = "view_analytics"
    VIEW_DASHBOARDS = "view_dashboards"
    EXPORT_DATA = "export_data"
    
    # System permissions
    MANAGE_SYSTEM = "manage_system"
    VIEW_AUDIT_LOGS = "view_audit_logs"


# ============ ROLE → PERMISSION MAPPING ============

ROLE_PERMISSIONS: dict[UserRole, Set[Permission]] = {
    UserRole.DATA_OFFICER: {
        # Reports
        Permission.READ_OWN_REPORTS,
        Permission.CREATE_REPORTS,
        Permission.SUBMIT_REPORTS,
        # Financials
        Permission.VIEW_OWN_FINANCIALS,
        Permission.EDIT_FINANCIALS,
        # Company
        Permission.VIEW_OWN_COMPANY,
    },
    
    UserRole.COMPANY_DIRECTOR: {
        # Reports
        Permission.READ_ASSIGNED_REPORTS,
        Permission.APPROVE_REPORTS,
        Permission.REJECT_REPORTS,
        # Financials
        Permission.VIEW_ASSIGNED_FINANCIALS,
        # Company
        Permission.VIEW_ASSIGNED_COMPANIES,
        # Analytics
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_DASHBOARDS,
        Permission.EXPORT_DATA,
    },
    
    UserRole.CEO: {
        # Reports (read-only, all companies)
        Permission.READ_ALL_REPORTS,
        # Financials
        Permission.VIEW_ALL_FINANCIALS,
        # Company
        Permission.VIEW_ALL_COMPANIES,
        # Analytics
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_DASHBOARDS,
        Permission.EXPORT_DATA,
    },
    
    UserRole.ADMIN: {
        # Full permissions
        Permission.READ_ALL_REPORTS,
        Permission.VIEW_ALL_FINANCIALS,
        Permission.IMPORT_BUDGET,
        Permission.VIEW_ALL_COMPANIES,
        Permission.MANAGE_COMPANIES,
        Permission.VIEW_USERS,
        Permission.MANAGE_USERS,
        Permission.ASSIGN_ROLES,
        Permission.MANAGE_SYSTEM,
        Permission.VIEW_AUDIT_LOGS,
        Permission.EXPORT_DATA,
    },
}


# ============ PERMISSION CHECKING ============

def has_permission(user: User, permission: Permission) -> bool:
    """Check if user has a specific permission"""
    if not user or not user.role:
        return False
    
    user_permissions = ROLE_PERMISSIONS.get(user.role, set())
    return permission in user_permissions


def has_any_permission(user: User, permissions: List[Permission]) -> bool:
    """Check if user has any of the given permissions"""
    return any(has_permission(user, p) for p in permissions)


def has_all_permissions(user: User, permissions: List[Permission]) -> bool:
    """Check if user has all of the given permissions"""
    return all(has_permission(user, p) for p in permissions)


def get_user_permissions(user: User) -> Set[Permission]:
    """Get all permissions for a user"""
    if not user or not user.role:
        return set()
    return ROLE_PERMISSIONS.get(user.role, set())


# ============ COMPANY ACCESS CONTROL ============

async def get_accessible_company_ids(
    db: AsyncSession, 
    user: User
) -> Optional[List[UUID]]:
    """
    Get list of company IDs the user can access.
    Returns None if user can access ALL companies (Admin/CEO).
    Returns empty list if user has no access.
    
    This is the core IDOR prevention mechanism.
    """
    if not user:
        return []
    
    # Admin and CEO can access all companies
    if user.role in (UserRole.ADMIN, UserRole.CEO):
        return None  # None means "all"
    
    accessible = set()
    
    # Direct company assignment (FO)
    if user.company_id:
        accessible.add(user.company_id)
    
    # Cluster-based assignment (FD with cluster access)
    if user.cluster_id:
        result = await db.execute(
            select(Company.id).where(Company.cluster_id == user.cluster_id)
        )
        cluster_companies = result.scalars().all()
        accessible.update(cluster_companies)
    
    # Check company_user_roles table for additional assignments
    result = await db.execute(
        select(CompanyUserRole.company_id).where(
            CompanyUserRole.user_id == user.id
        )
    )
    role_companies = result.scalars().all()
    accessible.update(role_companies)
    
    return list(accessible)


async def can_access_company(
    db: AsyncSession, 
    user: User, 
    company_id: UUID
) -> bool:
    """
    Check if user can access a specific company.
    This is the primary IDOR prevention check.
    """
    accessible = await get_accessible_company_ids(db, user)
    
    # None means all access
    if accessible is None:
        return True
    
    return company_id in accessible


async def filter_companies_for_user(
    db: AsyncSession,
    user: User,
    company_ids: List[UUID]
) -> List[UUID]:
    """Filter a list of company IDs to only those the user can access"""
    accessible = await get_accessible_company_ids(db, user)
    
    if accessible is None:
        return company_ids
    
    accessible_set = set(accessible)
    return [cid for cid in company_ids if cid in accessible_set]


# ============ ROLE-SPECIFIC CHECKS ============

def is_admin(user: User) -> bool:
    """Check if user is an admin"""
    return user and user.role == UserRole.ADMIN


def is_ceo(user: User) -> bool:
    """Check if user is CEO/MD"""
    return user and user.role == UserRole.CEO


def is_finance_director(user: User) -> bool:
    """Check if user is Finance Director"""
    return user and user.role == UserRole.COMPANY_DIRECTOR


def is_finance_officer(user: User) -> bool:
    """Check if user is Finance Officer"""
    return user and user.role == UserRole.DATA_OFFICER


def can_approve_reports(user: User) -> bool:
    """Check if user can approve/reject reports"""
    return has_permission(user, Permission.APPROVE_REPORTS)


def can_create_reports(user: User) -> bool:
    """Check if user can create/edit reports"""
    return has_permission(user, Permission.CREATE_REPORTS)


def can_view_all_companies(user: User) -> bool:
    """Check if user can view all companies (Admin/CEO)"""
    return has_permission(user, Permission.VIEW_ALL_COMPANIES)


def can_manage_users(user: User) -> bool:
    """Check if user can manage other users"""
    return has_permission(user, Permission.MANAGE_USERS)


# ============ ERROR CLASSES ============

class AuthorizationError(Exception):
    """Raised when user is not authorized for an action"""
    def __init__(self, message: str = "Not authorized", required_permission: Optional[Permission] = None):
        self.message = message
        self.required_permission = required_permission
        super().__init__(self.message)


class CompanyAccessError(AuthorizationError):
    """Raised when user tries to access a company they don't have access to"""
    def __init__(self, company_id: UUID):
        self.company_id = company_id
        super().__init__(f"Access denied to company {company_id}")
