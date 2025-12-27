"""
Company Domain Model
"""
from dataclasses import dataclass
from typing import Optional

@dataclass
class Company:
    id: str
    name: str
    cluster_id: str
    code: Optional[str] = None
