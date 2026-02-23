from contextvars import ContextVar
from typing import Optional
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

# Context variable to store the client IP address for auditing
client_ip_var: ContextVar[Optional[str]] = ContextVar("client_ip", default=None)

class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Extract client IP address
        # Check X-Forwarded-For if behind a proxy
        x_forwarded_for = request.headers.get("X-Forwarded-For")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        elif request.client:
            ip = request.client.host
        else:
            ip = None
            
        token = client_ip_var.set(ip)
        try:
            response = await call_next(request)
            return response
        finally:
            client_ip_var.reset(token)

def get_client_ip() -> Optional[str]:
    return client_ip_var.get()
