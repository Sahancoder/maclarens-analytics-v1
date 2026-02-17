import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Force correct DB URL for internal Docker network
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@db:5432/maclarens_analytics"

async def check_user_access(email):
    engine = create_async_engine(os.getenv("DATABASE_URL"))
    
    print(f"\nChecking Access for: {email}")
    print("-" * 50)
    
    async with engine.connect() as conn:
        # 1. Check User Existence
        user_res = await conn.execute(text(
            "SELECT user_id, is_active FROM analytics.user_master WHERE user_email = :e"
        ), {"e": email})
        user = user_res.fetchone()
        
        if not user:
            print(f"❌ User NOT FOUND in database.")
            return

        print(f"✅ User Found (ID: {user.user_id}) - Active: {user.is_active}")
        
        # 2. Check Roles
        roles_res = await conn.execute(text("""
            SELECT rm.role_name, rm.role_id, ucrm.company_id
            FROM analytics.user_company_role_map ucrm
            JOIN analytics.role_master rm ON ucrm.role_id = rm.role_id
            WHERE ucrm.user_id = :uid AND ucrm.is_active = true
        """), {"uid": user.user_id})
        
        roles = roles_res.fetchall()
        
        if not roles:
            print("❌ No Active Roles Assigned.")
        else:
            print(f"✅ Active Roles Assigned:")
            allowed_portals = []
            role_ids = set()
            
            for r in roles:
                print(f"   - {r.role_name} (ID: {r.role_id}) @ Company: {r.company_id}")
                role_ids.add(r.role_id)
            
            # 3. Check Portal Access
            print("\nPortal Access Evaluation:")
            print("-" * 30)
            
            # Map based on verify_setup.ps1 / AuthService
            portal_map = {
                "Finance Officer": {1, 3},
                "Finance Director": {2, 3},
                "System Admin": {3},
                "MD": {4, 3}
            }
            
            for portal, allowed_ids in portal_map.items():
                has_access = bool(role_ids & allowed_ids)
                status = "✅ YES" if has_access else "❌ NO "
                print(f"{status} - {portal}")

    await engine.dispose()

if __name__ == "__main__":
    target_email = "sahanviranga18@gmail.com"
    if len(sys.argv) > 1:
        target_email = sys.argv[1]
    asyncio.run(check_user_access(target_email))
