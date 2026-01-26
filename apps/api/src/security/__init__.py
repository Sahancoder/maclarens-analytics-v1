"""
Security Package for McLarens Analytics
Exports authentication, authorization, and rate limiting utilities
"""
from src.security.permissions import (
    # Enums
    Permission,
    # Functions
    has_permission,
    has_any_permission,
    has_all_permissions,
    get_user_permissions,
    # Company access
    get_accessible_company_ids,
    can_access_company,
    filter_companies_for_user,
    # Role checks
    is_admin,
    is_ceo,
    is_finance_director,
    is_finance_officer,
    can_approve_reports,
    can_create_reports,
    can_view_all_companies,
    can_manage_users,
    # Errors
    AuthorizationError,
    CompanyAccessError,
    # Mappings
    ROLE_PERMISSIONS,
)

from src.security.middleware import (
    # Database
    get_db,
    # Authentication
    get_current_user,
    get_current_user_optional,
    get_current_active_user,
    get_dev_user_or_current,
    is_dev_mode,
    # Role dependencies
    require_role,
    require_permission,
    require_any_permission,
    require_admin,
    require_fd,
    require_fo,
    require_ceo,
    require_admin_or_ceo,
    require_can_approve,
    require_can_create_reports,
    # Company access
    CompanyAccessChecker,
    verify_company_access,
)

from src.security.rate_limit import (
    rate_limiter,
    rate_limit,
    rate_limit_auth,
    rate_limit_write,
    rate_limit_heavy,
    RateLimitConfig,
    RateLimitMiddleware,
)

__all__ = [
    # Permissions
    "Permission",
    "has_permission",
    "has_any_permission",
    "has_all_permissions",
    "get_user_permissions",
    "ROLE_PERMISSIONS",
    # Company access
    "get_accessible_company_ids",
    "can_access_company",
    "filter_companies_for_user",
    # Role checks
    "is_admin",
    "is_ceo",
    "is_finance_director",
    "is_finance_officer",
    "can_approve_reports",
    "can_create_reports",
    "can_view_all_companies",
    "can_manage_users",
    # Errors
    "AuthorizationError",
    "CompanyAccessError",
    # Database
    "get_db",
    # Authentication
    "get_current_user",
    "get_current_user_optional",
    "get_current_active_user",
    "get_dev_user_or_current",
    "is_dev_mode",
    # Role dependencies
    "require_role",
    "require_permission",
    "require_any_permission",
    "require_admin",
    "require_fd",
    "require_fo",
    "require_ceo",
    "require_admin_or_ceo",
    "require_can_approve",
    "require_can_create_reports",
    # Company access deps
    "CompanyAccessChecker",
    "verify_company_access",
    # Rate limiting
    "rate_limiter",
    "rate_limit",
    "rate_limit_auth",
    "rate_limit_write",
    "rate_limit_heavy",
    "RateLimitConfig",
    "RateLimitMiddleware",
]
