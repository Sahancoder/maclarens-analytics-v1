"""
Create audit_logs table for tracking system activities
"""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@db:5432/maclarens_analytics"

async def create_audit_logs_table():
    engine = create_async_engine(os.environ["DATABASE_URL"])
    
    async with engine.begin() as conn:
        print("Creating audit_logs table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS analytics.audit_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                user_id VARCHAR(20),
                user_email VARCHAR(255),
                action VARCHAR(100) NOT NULL,
                entity_type VARCHAR(50),
                entity_id VARCHAR(50),
                details TEXT,
                ip_address VARCHAR(45),
                created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES analytics.user_master(user_id) ON DELETE SET NULL
            );
        """))
        
        print("Creating index on timestamp...")
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp 
            ON analytics.audit_logs(timestamp DESC);
        """))
        
        print("Creating index on user_id...")
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
            ON analytics.audit_logs(user_id);
        """))
        
        print("✅ Audit logs table created successfully!")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_audit_logs_table())
