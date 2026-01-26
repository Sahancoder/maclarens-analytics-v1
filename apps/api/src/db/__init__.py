"""
Database package for McLarens Analytics
"""
from src.db.models import (
    Base,
    # Enums
    UserRole,
    ReportStatus,
    Scenario,
    FiscalStartMonth,
    NotificationType,
    EmailStatus,
    # Master Data
    Cluster,
    Company,
    User,
    CompanyUserRole,
    # Financial Data
    FinancialMonthly,
    FinancialData,  # Legacy alias
    # Workflow
    Report,
    ReportComment,
    ReportStatusHistory,
    # Notifications & Email
    Notification,
    EmailOutbox,
    # Other
    FxRate,
    AuditLog,
)

from src.db.session import (
    engine,
    AsyncSessionLocal,
    get_db,
    init_db,
    close_db,
)

__all__ = [
    # Base
    "Base",
    # Enums
    "UserRole",
    "ReportStatus",
    "Scenario",
    "FiscalStartMonth",
    "NotificationType",
    "EmailStatus",
    # Master Data
    "Cluster",
    "Company",
    "User",
    "CompanyUserRole",
    # Financial Data
    "FinancialMonthly",
    "FinancialData",
    # Workflow
    "Report",
    "ReportComment",
    "ReportStatusHistory",
    # Notifications & Email
    "Notification",
    "EmailOutbox",
    # Other
    "FxRate",
    "AuditLog",
    # Session
    "engine",
    "AsyncSessionLocal",
    "get_db",
    "init_db",
    "close_db",
]
