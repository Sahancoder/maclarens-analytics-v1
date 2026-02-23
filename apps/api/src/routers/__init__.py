"""
Routers Package for McLarens Analytics
"""
from src.routers.auth_router import router as auth_router
from src.routers.admin_router import router as admin_router
from src.routers.admin_reports_router import router as admin_reports_router
from src.routers.fo_router import router as fo_router
from src.routers.fd_router import router as fd_router
from src.routers.ceo_router import router as ceo_router
from src.routers.md_router import router as md_router

__all__ = [
    "auth_router",
    "admin_router",
    "admin_reports_router",
    "fo_router",
    "fd_router",
    "ceo_router",
    "md_router",
]
