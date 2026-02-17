"""
Quick check and seed the database
"""
import asyncio
import sys
import os

# Ensure DATABASE_URL is set for container environment
if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@db:5432/maclarens_analytics"

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    engine = create_async_engine(os.getenv("DATABASE_URL"))
    
    async with engine.connect() as conn:
        # Check table counts
        print("=" * 60)
        print("DATABASE STATUS")
        print("=" * 60)
        
        tables = [
            "analytics.company_master",
            "analytics.user_master", 
            "analytics.user_company_role_map",
            "analytics.role_master"
        ]
        
        for table in tables:
            result = await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            print(f"{table:40} {count:>5} rows")
        
        print("=" * 60)
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
