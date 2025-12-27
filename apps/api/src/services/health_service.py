"""
Health Check Service

Provides diagnostics for:
- Database connection
- Redis connection
- Email provider status
"""
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

from src.config.settings import settings
from src.services.email_provider import get_email_provider_instance

logger = logging.getLogger(__name__)


class HealthService:
    """Service for checking system health"""
    
    @staticmethod
    async def check_database(db: AsyncSession) -> Dict[str, Any]:
        """Check database connectivity"""
        try:
            result = await db.execute(text("SELECT 1"))
            result.scalar()
            return {
                "status": "healthy",
                "message": "Database connection successful",
                "provider": "postgresql"
            }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "message": str(e),
                "provider": "postgresql"
            }
    
    @staticmethod
    async def check_redis() -> Dict[str, Any]:
        """Check Redis connectivity"""
        try:
            import redis.asyncio as redis
            
            client = redis.from_url(settings.redis_url)
            await client.ping()
            await client.close()
            
            return {
                "status": "healthy",
                "message": "Redis connection successful",
                "url": settings.redis_url
            }
        except ImportError:
            return {
                "status": "not_available",
                "message": "Redis client not installed"
            }
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return {
                "status": "unhealthy",
                "message": str(e)
            }
    
    @staticmethod
    async def check_email() -> Dict[str, Any]:
        """Check email provider health"""
        provider = get_email_provider_instance()
        result = await provider.health_check()
        
        # Add global email settings info
        result["email_enabled"] = settings.email_enabled
        result["configured_provider"] = settings.email_provider.value if hasattr(settings.email_provider, 'value') else str(settings.email_provider)
        
        return result
    
    @staticmethod
    async def get_full_health(db: AsyncSession) -> Dict[str, Any]:
        """Get complete system health status"""
        db_health = await HealthService.check_database(db)
        redis_health = await HealthService.check_redis()
        email_health = await HealthService.check_email()
        
        # Overall status
        all_healthy = (
            db_health["status"] == "healthy" and
            (redis_health["status"] in ["healthy", "not_available"]) and
            email_health["status"] in ["healthy", "configured", "disabled"]
        )
        
        return {
            "status": "healthy" if all_healthy else "degraded",
            "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
            "environment": settings.environment,
            "auth_mode": settings.auth_mode.value if hasattr(settings.auth_mode, 'value') else str(settings.auth_mode),
            "checks": {
                "database": db_health,
                "redis": redis_health,
                "email": email_health
            }
        }
    
    @staticmethod
    def get_config_summary() -> Dict[str, Any]:
        """Get current configuration (non-sensitive)"""
        return {
            "environment": settings.environment,
            "debug": settings.debug,
            "auth_mode": settings.auth_mode.value if hasattr(settings.auth_mode, 'value') else str(settings.auth_mode),
            "email_enabled": settings.email_enabled,
            "email_provider": settings.email_provider.value if hasattr(settings.email_provider, 'value') else str(settings.email_provider),
            "app_url": settings.app_url,
            "cors_origins": settings.cors_origins
        }
