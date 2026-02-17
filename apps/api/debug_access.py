import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Force correct DB connection for inside container
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@db:5432/maclarens_analytics"

async def debug_access():
    print("\n" + "=" * 50)
    print("DEBUGGING ACCESS FOR: sahanviranga18@gmail.com")
    print("=" * 50)
    
    engine = create_async_engine(os.environ["DATABASE_URL"], echo=False)
    
    async with engine.connect() as conn:
        # 1. Check User (Case Insensitive Search)
        print("Checking user_master...")
        result = await conn.execute(text(
            "SELECT user_id, user_email, is_active FROM analytics.user_master WHERE lower(user_email) = 'sahanviranga18@gmail.com'"
        ))
        user = result.fetchone()
        
        if not user:
            print("❌ USER NOT FOUND IN DB!")
            return

        print(f"✅ User Found: {user.user_email} (ID: {user.user_id}) | Active: {user.is_active}")
        
        if not user.is_active:
             print("⚠️ USER IS INACTIVE!")

        # 2. Check Roles
        print("\nChecking Role Assignments...")
        roles = (await conn.execute(text("""
            SELECT ucrm.role_id, rm.role_name, ucrm.company_id, ucrm.is_active 
            FROM analytics.user_company_role_map ucrm
            JOIN analytics.role_master rm ON ucrm.role_id = rm.role_id
            WHERE ucrm.user_id = :uid
        """), {"uid": user.user_id})).fetchall()
        
        active_admin_count = 0
        for r in roles:
            status = "✅ Active" if r.is_active else "❌ Inactive"
            print(f"   Role: {r.role_name} (ID: {r.role_id}) | Company: {r.company_id} | {status}")
            if r.role_id == 3 and r.is_active:
                active_admin_count += 1
        
        if active_admin_count > 0:
            print(f"\n✅ SUCCESS: Found {active_admin_count} Active Admin Roles.")
            print("Access should be GRANTED for portals requiring Role ID 3.")
        else:
            print("\n❌ FAILURE: No Active Admin Role (ID 3) found.")
            print("Please run the 'Grant Admin' script again.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(debug_access())
