"""
Email Provider - Abstraction layer for multiple email backends

Supports:
- MailHog (SMTP) - for DEV testing
- Resend API - for simple production
- Microsoft Graph - for enterprise production
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List, Dict, Any
from abc import ABC, abstractmethod
import logging

from src.config.settings import settings, EmailProvider

logger = logging.getLogger(__name__)


class BaseEmailProvider(ABC):
    """Abstract base class for email providers"""
    
    @abstractmethod
    async def send_email(
        self,
        to: str | List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send an email. Returns dict with success, id/error keys."""
        pass
    
    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """Check if the email provider is healthy/reachable."""
        pass


class DisabledEmailProvider(BaseEmailProvider):
    """No-op provider when email is disabled"""
    
    async def send_email(
        self,
        to: str | List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        logger.info(f"[EMAIL-DISABLED] Would send to: {to}, Subject: {subject}")
        return {"success": True, "id": "disabled", "message": "Email disabled"}
    
    async def health_check(self) -> Dict[str, Any]:
        return {"status": "disabled", "message": "Email is disabled"}


class MailHogProvider(BaseEmailProvider):
    """SMTP provider for MailHog (local dev testing)"""
    
    def __init__(self):
        self.host = settings.smtp_host
        self.port = settings.smtp_port
        self.use_tls = settings.smtp_use_tls
        self.username = settings.smtp_username
        self.password = settings.smtp_password
        self.from_email = settings.sender_email
    
    async def send_email(
        self,
        to: str | List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        try:
            recipients = to if isinstance(to, list) else [to]
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = ', '.join(recipients)
            
            # Add text version if provided
            if text_content:
                text_part = MIMEText(text_content, 'plain')
                msg.attach(text_part)
            
            # Add HTML version
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Send via SMTP
            with smtplib.SMTP(self.host, self.port) as server:
                if self.use_tls:
                    server.starttls()
                if self.username and self.password:
                    server.login(self.username, self.password)
                server.sendmail(self.from_email, recipients, msg.as_string())
            
            logger.info(f"[MAILHOG] Email sent to: {recipients}")
            return {"success": True, "id": f"mailhog-{id(msg)}", "provider": "mailhog"}
            
        except Exception as e:
            logger.error(f"[MAILHOG] Failed to send email: {e}")
            return {"success": False, "error": str(e), "provider": "mailhog"}
    
    async def health_check(self) -> Dict[str, Any]:
        try:
            with smtplib.SMTP(self.host, self.port, timeout=5) as server:
                status = server.noop()
            return {"status": "healthy", "provider": "mailhog", "host": self.host, "port": self.port}
        except Exception as e:
            return {"status": "unhealthy", "provider": "mailhog", "error": str(e)}


class ResendProvider(BaseEmailProvider):
    """Resend API provider"""
    
    def __init__(self):
        self.api_key = settings.resend_api_key
        self.from_email = settings.sender_email
        self._resend = None
    
    def _get_client(self):
        if self._resend is None:
            try:
                import resend
                resend.api_key = self.api_key
                self._resend = resend
            except ImportError:
                raise RuntimeError("Resend package not installed. Run: pip install resend")
        return self._resend
    
    async def send_email(
        self,
        to: str | List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        if not self.api_key:
            logger.warning("[RESEND] API key not configured, logging email instead")
            logger.info(f"[RESEND] Would send to: {to}, Subject: {subject}")
            return {"success": True, "id": "dev-mode", "message": "Resend not configured"}
        
        try:
            resend = self._get_client()
            recipients = to if isinstance(to, list) else [to]
            
            params = {
                "from": self.from_email,
                "to": recipients,
                "subject": subject,
                "html": html_content,
            }
            if text_content:
                params["text"] = text_content
            
            response = resend.Emails.send(params)
            logger.info(f"[RESEND] Email sent to: {recipients}")
            return {"success": True, "id": response.get("id"), "provider": "resend"}
            
        except Exception as e:
            logger.error(f"[RESEND] Failed to send email: {e}")
            return {"success": False, "error": str(e), "provider": "resend"}
    
    async def health_check(self) -> Dict[str, Any]:
        if not self.api_key:
            return {"status": "not_configured", "provider": "resend"}
        return {"status": "configured", "provider": "resend", "message": "API key present"}


class GraphProvider(BaseEmailProvider):
    """Microsoft Graph API provider for Mail.Send"""
    
    def __init__(self):
        self.tenant_id = settings.azure_ad_tenant_id
        self.client_id = settings.azure_ad_client_id
        self.client_secret = settings.azure_ad_client_secret
        self.sender_email = settings.graph_sender_email or settings.sender_email
        self._token = None
    
    async def _get_token(self) -> str:
        """Get OAuth2 token for Microsoft Graph"""
        import httpx
        
        if not all([self.tenant_id, self.client_id, self.client_secret]):
            raise RuntimeError("Microsoft Graph credentials not configured")
        
        token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "scope": "https://graph.microsoft.com/.default",
                    "grant_type": "client_credentials",
                }
            )
            response.raise_for_status()
            return response.json()["access_token"]
    
    async def send_email(
        self,
        to: str | List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        try:
            import httpx
            
            token = await self._get_token()
            recipients = to if isinstance(to, list) else [to]
            
            # Build Graph API email payload
            email_payload = {
                "message": {
                    "subject": subject,
                    "body": {
                        "contentType": "HTML",
                        "content": html_content
                    },
                    "toRecipients": [
                        {"emailAddress": {"address": addr}} for addr in recipients
                    ]
                }
            }
            
            graph_url = f"https://graph.microsoft.com/v1.0/users/{self.sender_email}/sendMail"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    graph_url,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json"
                    },
                    json=email_payload
                )
                response.raise_for_status()
            
            logger.info(f"[GRAPH] Email sent to: {recipients}")
            return {"success": True, "id": f"graph-{id(email_payload)}", "provider": "graph"}
            
        except Exception as e:
            logger.error(f"[GRAPH] Failed to send email: {e}")
            return {"success": False, "error": str(e), "provider": "graph"}
    
    async def health_check(self) -> Dict[str, Any]:
        if not all([self.tenant_id, self.client_id, self.client_secret]):
            return {"status": "not_configured", "provider": "graph"}
        
        try:
            token = await self._get_token()
            return {"status": "healthy", "provider": "graph", "message": "Token acquired successfully"}
        except Exception as e:
            return {"status": "unhealthy", "provider": "graph", "error": str(e)}


class AzureEmailProvider(BaseEmailProvider):
    """Azure Communication Services Email provider"""
    
    def __init__(self):
        self.connection_string = settings.azure_email_connection_string
        self.sender_email = settings.azure_email_sender
        self._client = None
    
    def _get_client(self):
        if self._client is None:
            try:
                from azure.communication.email import EmailClient
                self._client = EmailClient.from_connection_string(self.connection_string)
            except ImportError:
                raise RuntimeError("Azure Communication Email package not installed. Run: pip install azure-communication-email")
        return self._client
    
    async def send_email(
        self,
        to: str | List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        if not self.connection_string:
            logger.warning("[AZURE-EMAIL] Connection string not configured, logging email instead")
            logger.info(f"[AZURE-EMAIL] Would send to: {to}, Subject: {subject}")
            return {"success": True, "id": "dev-mode", "message": "Azure Email not configured"}
        
        try:
            client = self._get_client()
            recipients = to if isinstance(to, list) else [to]
            
            # Build message
            message = {
                "senderAddress": self.sender_email,
                "recipients": {
                    "to": [{"address": addr} for addr in recipients]
                },
                "content": {
                    "subject": subject,
                    "html": html_content,
                }
            }
            
            if text_content:
                message["content"]["plainText"] = text_content
            
            # Send email (Azure SDK is sync, wrap it)
            poller = client.begin_send(message)
            result = poller.result()
            
            logger.info(f"[AZURE-EMAIL] Email sent to: {recipients}, Message ID: {result.get('id', 'unknown')}")
            return {"success": True, "id": result.get("id"), "provider": "azure_email"}
            
        except Exception as e:
            logger.error(f"[AZURE-EMAIL] Failed to send email: {e}")
            return {"success": False, "error": str(e), "provider": "azure_email"}
    
    async def health_check(self) -> Dict[str, Any]:
        if not self.connection_string:
            return {"status": "not_configured", "provider": "azure_email"}
        return {"status": "configured", "provider": "azure_email", "sender": self.sender_email}


def get_email_provider() -> BaseEmailProvider:
    """Factory function to get the configured email provider"""
    if not settings.email_enabled:
        return DisabledEmailProvider()
    
    provider_map = {
        EmailProvider.DISABLED: DisabledEmailProvider,
        EmailProvider.MAILHOG: MailHogProvider,
        EmailProvider.MAILPIT: MailHogProvider,
        EmailProvider.RESEND: ResendProvider,
        EmailProvider.GRAPH: GraphProvider,
        EmailProvider.AZURE_EMAIL: AzureEmailProvider,
    }
    
    provider_class = provider_map.get(settings.email_provider, DisabledEmailProvider)
    return provider_class()


# Singleton instance
_email_provider: Optional[BaseEmailProvider] = None


def get_email_provider_instance() -> BaseEmailProvider:
    """Get or create shared email provider instance"""
    global _email_provider
    if _email_provider is None:
        _email_provider = get_email_provider()
    return _email_provider
