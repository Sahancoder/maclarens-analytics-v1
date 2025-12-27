"""
Application Settings with Feature Switches for Dev/Production
"""
from pydantic_settings import BaseSettings
from typing import Optional, List, Literal
from enum import Enum


class AuthMode(str, Enum):
    DEV = "dev"
    ENTRA = "entra"


class EmailProvider(str, Enum):
    DISABLED = "disabled"
    MAILHOG = "mailhog"
    RESEND = "resend"
    GRAPH = "graph"


class Settings(BaseSettings):
    # ============ DATABASE ============
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/maclarens_analytics"
    
    # ============ REDIS ============
    redis_url: str = "redis://localhost:6379"
    
    # ============ AUTH SETTINGS ============
    # Switch: "dev" for local testing, "entra" for production
    auth_mode: AuthMode = AuthMode.DEV
    
    # JWT Configuration (used in dev mode)
    jwt_secret: str = "maclarens-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    
    # Microsoft Entra ID (Azure AD) - used when auth_mode=entra
    azure_tenant_id: Optional[str] = None
    azure_client_id: Optional[str] = None
    azure_client_secret: Optional[str] = None
    
    # ============ EMAIL SETTINGS ============
    # Master switch
    email_enabled: bool = True
    
    # Provider: "disabled", "mailhog", "resend", "graph"
    email_provider: EmailProvider = EmailProvider.MAILHOG
    
    # Common email settings
    sender_email: str = "no-reply@maclarens.local"
    
    # SMTP Settings (for MailHog)
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_use_tls: bool = False
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    
    # Resend API (alternative to Graph)
    resend_api_key: str = ""
    
    # Microsoft Graph Settings (for production email)
    graph_sender_email: Optional[str] = None  # e.g., notifications@yourtenant.com
    
    # ============ APP SETTINGS ============
    debug: bool = True
    environment: str = "development"
    app_url: str = "http://localhost:3000"  # Frontend URL for email links
    
    # ============ CORS ============
    cors_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # ============ COMPUTED PROPERTIES ============
    @property
    def is_dev_mode(self) -> bool:
        return self.auth_mode == AuthMode.DEV
    
    @property
    def is_email_enabled(self) -> bool:
        return self.email_enabled and self.email_provider != EmailProvider.DISABLED
    
    @property
    def use_mailhog(self) -> bool:
        return self.email_provider == EmailProvider.MAILHOG
    
    @property
    def use_graph(self) -> bool:
        return self.email_provider == EmailProvider.GRAPH
    
    @property
    def use_resend(self) -> bool:
        return self.email_provider == EmailProvider.RESEND
    
    class Config:
        env_file = ".env"
        extra = "allow"
        use_enum_values = True


settings = Settings()
