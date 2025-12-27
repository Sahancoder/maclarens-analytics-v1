"""
Cluster Domain Model
"""
from dataclasses import dataclass

@dataclass
class Cluster:
    id: str
    name: str
    code: str
