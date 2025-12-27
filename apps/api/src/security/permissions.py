"""
Role-Based Access Control (RBAC)
"""
from enum import Enum
from typing import List

class Permission(Enum):
    READ_REPORTS = "read_reports"
    CREATE_REPORTS = "create_reports"
    APPROVE_REPORTS = "approve_reports"
    MANAGE_USERS = "manage_users"
    VIEW_ANALYTICS = "view_analytics"
    VIEW_ALL_COMPANIES = "view_all_companies"

ROLE_PERMISSIONS = {
    "data_officer": [Permission.READ_REPORTS, Permission.CREATE_REPORTS],
    "director": [Permission.READ_REPORTS, Permission.CREATE_REPORTS, Permission.APPROVE_REPORTS],
    "admin": [Permission.MANAGE_USERS, Permission.READ_REPORTS],
    "ceo": [Permission.VIEW_ANALYTICS, Permission.VIEW_ALL_COMPANIES, Permission.READ_REPORTS],
}
