"""
User Domain Model
"""
from dataclasses import dataclass
from typing import Optional
from enum import Enum

class UserRole(Enum):
    DATA_OFFICER = "data_officer"
    DIRECTOR = "director"
    ADMIN = "admin"
    CEO = "ceo"

@dataclass
class User:
    id: str
    email: str
    name: str
    role: UserRole
    company_id: Optional[str] = None
