import asyncio
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DB_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/maclarens_analytics"

async def main():
    engine = create_async_engine(DB_URL)
    try:
        async with engine.connect() as conn:
            r = await conn.execute(text(
                "SELECT DISTINCT year, month, scenario FROM analytics.financial_monthly_view "
                "ORDER BY year DESC, month DESC, scenario LIMIT 30"
            ))
            rows = r.fetchall()
            print("=== Financial Data Periods ===")
            for row in rows:
                print(f"  Year={row[0]}, Month={row[1]}, Scenario={row[2]}")
            
            r2 = await conn.execute(text("SELECT COUNT(*) FROM analytics.financial_monthly_view"))
            print(f"\nTotal records: {r2.scalar()}")
            
            r3 = await conn.execute(text(
                "SELECT year, month, status, COUNT(*) FROM analytics.financial_workflow "
                "GROUP BY year, month, status ORDER BY year DESC, month DESC LIMIT 20"
            ))
            rows3 = r3.fetchall()
            print("\n=== Workflow Statuses ===")
            for row in rows3:
                print(f"  Year={row[0]}, Month={row[1]}, Status={row[2]}, Count={row[3]}")
            
            # Check user roles
            r4 = await conn.execute(text(
                "SELECT u.user_id, u.email, u.first_name, ucr.role_id "
                "FROM analytics.user_master u "
                "LEFT JOIN analytics.user_company_role_map ucr ON u.user_id = ucr.user_id "
                "ORDER BY u.email LIMIT 20"
            ))
            rows4 = r4.fetchall()
            print("\n=== Users & Roles ===")
            for row in rows4:
                print(f"  {row[1]} | role_id={row[3]}")
            
    finally:
        await engine.dispose()

asyncio.run(main())
