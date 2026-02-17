import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@db:5432/maclarens_analytics"

async def show_tables():
    engine = create_async_engine(os.environ["DATABASE_URL"])
    
    with open("/app/tables_output.txt", "w") as f:
        async with engine.connect() as conn:
            
            # Role Master
            f.write("\n=== ROLE MASTER ===\n")
            result = await conn.execute(text("SELECT * FROM analytics.role_master ORDER BY role_id"))
            for row in result:
                f.write(f"{row.role_id}: {row.role_name}\n")
            
            # User Master
            f.write("\n=== USER MASTER ===\n")
            result = await conn.execute(text("SELECT user_id, user_email, first_name, is_active FROM analytics.user_master ORDER BY user_id"))
            for row in result:
                f.write(f"{row.user_id} | {row.user_email} | {row.first_name} | Active: {row.is_active}\n")

            # User Role Mappings
            f.write("\n=== USER ROLE MAPPINGS ===\n")
            result = await conn.execute(text("""
                SELECT um.user_email, rm.role_name, cm.company_name, ucrm.is_active 
                FROM analytics.user_company_role_map ucrm
                JOIN analytics.user_master um ON ucrm.user_id = um.user_id
                JOIN analytics.role_master rm ON ucrm.role_id = rm.role_id
                JOIN analytics.company_master cm ON ucrm.company_id = cm.company_id
                ORDER BY um.user_email, cm.company_name
            """))
            for row in result:
                f.write(f"{row.user_email} | {row.role_name} | {row.company_name} | Active: {row.is_active}\n")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(show_tables())
