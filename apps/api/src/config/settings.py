"""
Application Settings with Feature Switches for Dev/Production
"""
import secrets
import logging
from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import ClassVar, Optional, List
from enum import Enum

logger = logging.getLogger(__name__)


class AuthMode(str, Enum):
    DEV = "dev"
    ENTRA = "entra"


class EmailProvider(str, Enum):
    DISABLED = "disabled"
    MAILHOG = "mailhog"
    MAILPIT = "mailpit"  # Preferred for local dev
    RESEND = "resend"
    GRAPH = "graph"
    AZURE_EMAIL = "azure_email"  # Azure Communication Services Email


class Settings(BaseSettings):
    # ============ DATABASE ============
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/maclarens_analytics"
    
    # ============ REDIS ============
    redis_url: str = "redis://localhost:6379"
    
    # ============ AUTH SETTINGS ============
    # Switch: "dev" for local testing, "entra" for production
    auth_mode: AuthMode = AuthMode.DEV
    
    # JWT Configuration
    # IMPORTANT: Override via JWT_SECRET env var. Default is random per-process (dev only).
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    
    # Microsoft Entra ID (Azure AD) - used when auth_mode=entra
    azure_ad_tenant_id: Optional[str] = None
    azure_ad_client_id: Optional[str] = None
    azure_ad_client_secret: Optional[str] = None
    
    # ============ EMAIL SETTINGS ============
    # Master switch
    email_enabled: bool = True
    
    # Provider: "disabled", "mailhog", "resend", "graph"
    email_provider: EmailProvider = EmailProvider.MAILHOG
    
    # Common email settings
    sender_email: str = "no-reply@maclarens.local"
    
    # SMTP Settings (for MailHog/Mailpit)
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_use_tls: bool = False
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    
    # Resend API (alternative to Graph)
    resend_api_key: str = ""
    
    # Microsoft Graph Settings (for production email)
    graph_sender_email: Optional[str] = None  # e.g., notifications@yourtenant.com
    
    # Azure Communication Services Email (alternative production email)
    azure_email_connection_string: Optional[str] = None  # From Azure Portal > ACS > Keys
    azure_email_sender: str = "DoNotReply@<your-acs-domain>.azurecomm.net"  # Verified sender
    
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
        return self.email_provider in (EmailProvider.MAILHOG, EmailProvider.MAILPIT)
    
    @property
    def use_graph(self) -> bool:
        return self.email_provider == EmailProvider.GRAPH
    
    @property
    def use_resend(self) -> bool:
        return self.email_provider == EmailProvider.RESEND

    @property
    def use_azure_email(self) -> bool:
        return self.email_provider == EmailProvider.AZURE_EMAIL
    
    # Known insecure default secrets that must never be used in production
    _INSECURE_SECRETS: ClassVar[List[str]] = [
        "maclarens-secret-key-change-in-production",
        "local-dev-super-secret-key-change-in-production-min-32-chars",
        "GENERATE-A-STRONG-SECRET-HERE",
        "",
    ]

    @model_validator(mode="after")
    def _validate_production_settings(self) -> "Settings":
        """Enforce security invariants for production."""
        is_prod = self.environment.lower() in ("production", "staging")

        # Generate a random secret for dev if none provided
        if self.jwt_secret in self._INSECURE_SECRETS:
            if is_prod:
                raise ValueError(
                    "CRITICAL: JWT_SECRET is not set or uses an insecure default. "
                    "Generate a secure key: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
                )
            # Dev mode: generate a random per-process secret
            self.jwt_secret = secrets.token_urlsafe(64)
            logger.warning("JWT_SECRET not set — using random per-process secret (dev only)")

        # Enforce Entra ID config in production
        if is_prod and self.auth_mode == AuthMode.DEV:
            raise ValueError(
                "AUTH_MODE=dev is not allowed in production/staging. Set AUTH_MODE=entra."
            )

        if is_prod and self.debug:
            logger.warning("DEBUG=true in production — this should be false for security")

        return self

    class Config:
        env_file = ".env"
        extra = "allow"
        use_enum_values = True


settings = Settings()
