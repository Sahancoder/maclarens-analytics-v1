"""
Application Constants
Mapped to Database Master Data (IDs) to avoid hardcoding magic numbers.
"""
from enum import Enum

class MetricID(int, Enum):
    """
    Mapped to analytics.metric_master
    """
    REVENUE = 1
    GP = 2
    GP_MARGIN = 3
    OTHER_INCOME = 4
    PERSONAL_EXP = 5
    ADMIN_EXP = 6
    SELLING_EXP = 7
    FINANCE_EXP = 8
    DEPRECIATION = 9
    TOTAL_OVERHEAD = 10
    PROVISIONS = 11
    EXCHANGE_VARIANCE = 12
    PBT_BEFORE_NON_OPS = 13
    PBT_AFTER_NON_OPS = 14
    NON_OPS_EXP = 15
    NON_OPS_INCOME = 16
    NP_MARGIN = 17
    EBIT = 18
    EBITDA = 19

class StatusID(int, Enum):
    """
    Mapped to analytics.status_master
    """
    DRAFT = 1
    SUBMITTED = 2
    APPROVED = 3
    REJECTED = 4

class RoleID(int, Enum):
    """
    Mapped to analytics.role_master
    """
    FINANCIAL_OFFICER = 1
    FINANCIAL_DIRECTOR = 2
    SYSTEM_ADMIN = 3
    MANAGING_DIRECTOR = 4
