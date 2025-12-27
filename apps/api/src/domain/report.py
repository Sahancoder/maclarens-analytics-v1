"""
Report Domain Model
"""
from dataclasses import dataclass
from typing import Optional
from enum import Enum
from datetime import datetime

class ReportStatus(Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"

class ReportType(Enum):
    ACTUAL = "actual"
    BUDGET = "budget"

@dataclass
class Report:
    id: str
    company_id: str
    period_month: int
    period_year: int
    report_type: ReportType
    status: ReportStatus
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None
