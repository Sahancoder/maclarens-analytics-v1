"""
Admin Statistics Service
Provides dashboard stats and metrics
"""
import asyncio
from typing import Dict, Any
from sqlalchemy import text, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import time

class StatsService:
    """Service for fetching dashboard statistics"""
    
    @staticmethod
    async def get_dashboard_stats(db: AsyncSession) -> Dict[str, Any]:
        """
        Get all dashboard statistics in parallel
        Returns: total_users, active_companies, total_clusters, pending_reports, system_health
        """
        # Execute all queries in parallel for better performance
        results = await asyncio.gather(
            StatsService._get_total_users(db),
            StatsService._get_active_companies(db),
            StatsService._get_total_clusters(db),
            StatsService._get_pending_reports(db),
            StatsService._get_system_health(db),
            return_exceptions=True
        )
        
        return {
            "total_users": results[0] if not isinstance(results[0], Exception) else 0,
            "active_companies": results[1] if not isinstance(results[1], Exception) else 0,
            "total_clusters": results[2] if not isinstance(results[2], Exception) else 0,
            "pending_reports": results[3] if not isinstance(results[3], Exception) else 0,
            "system_health": results[4] if not isinstance(results[4], Exception) else {}
        }
    
    @staticmethod
    async def _get_total_users(db: AsyncSession) -> int:
        """Count active users"""
        result = await db.execute(
            text("SELECT COUNT(*) FROM analytics.user_master WHERE is_active = true")
        )
        return result.scalar() or 0
    
    @staticmethod
    async def _get_active_companies(db: AsyncSession) -> int:
        """Count active companies"""
        result = await db.execute(
            text("SELECT COUNT(*) FROM analytics.company_master WHERE is_active = true")
        )
        return result.scalar() or 0
    
    @staticmethod
    async def _get_total_clusters(db: AsyncSession) -> int:
        """Count active clusters"""
        result = await db.execute(
            text("SELECT COUNT(*) FROM analytics.cluster_master WHERE is_active = true")
        )
        return result.scalar() or 0
    
    @staticmethod
    async def _get_pending_reports(db: AsyncSession) -> int:
        """Count pending financial reports"""
        try:
            # Assuming status_id 1 = Pending
            result = await db.execute(
                text("SELECT COUNT(*) FROM analytics.financial_workflow WHERE status_id = 1")
            )
            return result.scalar() or 0
        except Exception:
            # If table doesn't exist or status_id doesn't match, return 0
            return 0
    
    @staticmethod
    async def _get_system_health(db: AsyncSession) -> Dict[str, Any]:
        """Check health of all system components"""
        import os
        
        health = {
            "overall_status": "operational",
            "services": {}
        }
        
        # Database health check
        db_start = time.time()
        try:
            await db.execute(text("SELECT 1"))
            db_response_time = int((time.time() - db_start) * 1000)
            
            if db_response_time > 1000:
                health["services"]["database"] = {
                    "status": "degraded",
                    "response_time_ms": db_response_time
                }
                health["overall_status"] = "degraded"
            else:
                health["services"]["database"] = {
                    "status": "operational",
                    "response_time_ms": db_response_time
                }
        except Exception as e:
            health["services"]["database"] = {
                "status": "down",
                "error": str(e)
            }
            health["overall_status"] = "down"
        
        # Redis health check
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            try:
                import redis.asyncio as redis
                redis_start = time.time()
                r = redis.from_url(redis_url)
                await r.ping()
                redis_response_time = int((time.time() - redis_start) * 1000)
                
                if redis_response_time > 500:
                    health["services"]["redis"] = {
                        "status": "degraded",
                        "response_time_ms": redis_response_time
                    }
                    if health["overall_status"] != "down":
                        health["overall_status"] = "degraded"
                else:
                    health["services"]["redis"] = {
                        "status": "operational",
                        "response_time_ms": redis_response_time
                    }
                await r.close()
            except Exception:
                health["services"]["redis"] = {
                    "status": "down"
                }
                if health["overall_status"] != "down":
                    health["overall_status"] = "degraded"
        else:
            health["services"]["redis"] = {
                "status": "not_configured"
            }
        
        # Email service check
        smtp_host = os.getenv("SMTP_HOST")
        if smtp_host:
            health["services"]["email_service"] = {
                "status": "operational",
                "provider": smtp_host
            }
        else:
            health["services"]["email_service"] = {
                "status": "not_configured"
            }
        
        # API service (always operational if code reaches here)
        health["services"]["api"] = {
            "status": "operational",
            "version": "1.0.0"
        }
        
        health["timestamp"] = datetime.utcnow().isoformat() + "Z"
        
        return health
