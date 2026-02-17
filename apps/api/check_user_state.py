import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@db:5432/maclarens_analytics"

async def check_user():
    engine = create_async_engine(os.environ["DATABASE_URL"])
    
    with open("/app/user_check.txt", "w") as f:
        async with engine.connect() as conn:
            email = 'sahanviranga18@gmail.com'
            f.write(f"Checking user: {email}\n")
            
            # Check User Master
            result = await conn.execute(text(f"SELECT * FROM analytics.user_master WHERE user_email = '{email}'"))
            user = result.fetchone()
            if user:
                f.write(f"User Found: ID={user.user_id}, Active={user.is_active}\n")
            else:
                f.write("User NOT FOUND in user_master\n")
                
            if user:
                # Check Role Mappings
                f.write("\nRole Mappings:\n")
                result = await conn.execute(text(f"""
                    SELECT rm.role_name, rm.role_id, ucrm.company_id, ucrm.is_active 
                    FROM analytics.user_company_role_map ucrm
                    JOIN analytics.role_master rm ON ucrm.role_id = rm.role_id
                    WHERE ucrm.user_id = '{user.user_id}'
                """))
                mappings = result.fetchall()
                if mappings:
                    for m in mappings:
                        f.write(f"  Role: {m.role_name} ({m.role_id}), Company: {m.company_id}, Active: {m.is_active}\n")
                else:
                    f.write("  No role mappings found!\n")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_user())
