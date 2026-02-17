"""
Verify database seeding and user access
"""
import asyncio
import os
import sys

if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@db:5432/maclarens_analytics"

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    engine = create_async_engine(os.getenv("DATABASE_URL"))
    
    async with engine.connect() as conn:
        print("=" * 70)
        print("DATABASE VERIFICATION")
        print("=" * 70)
        
        # Check table counts
        print("\n1. Table Counts:")
        print("-" * 70)
        tables = [
            ("Companies", "analytics.company_master"),
            ("Users", "analytics.user_master"),
            ("Roles", "analytics.role_master"),
            ("User-Company-Role Maps", "analytics.user_company_role_map"),
            ("Financial Facts", "analytics.financial_fact"),
        ]
        
        for name, table in tables:
            result = await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            print(f"  {name:30} {count:>5} rows")
        
        # Check specific user
        print("\n2. User Access Check (sahanviranga18@gmail.com):")
        print("-" * 70)
        result = await conn.execute(text("""
            SELECT
                um.user_email,
                rm.role_name,
                COUNT(DISTINCT ucrm.company_id) as company_count
            FROM analytics.user_master um
            INNER JOIN analytics.user_company_role_map ucrm ON um.user_id = ucrm.user_id
            INNER JOIN analytics.role_master rm ON ucrm.role_id = rm.role_id
            WHERE um.user_email = 'sahanviranga18@gmail.com'
              AND um.is_active = true
              AND ucrm.is_active = true
            GROUP BY um.user_email, rm.role_name
        """))
        
        rows = result.fetchall()
        if rows:
            for row in rows:
                print(f"  Email: {row[0]}")
                print(f"  Role: {row[1]}")
                print(f"  Companies: {row[2]}")
        else:
            print("  ⚠️  User not found or has no role mappings!")
        
        print("\n" + "=" * 70)
        print("✅ VERIFICATION COMPLETE")
        print("=" * 70)
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
