"""
FULL DATABASE RE-SEEDER
1. Wipes database
2. Loads ALL data from CSVs (Full Dataset)
3. Force-activates Admin permissions for sahanviranga18@gmail.com
"""
import asyncio
import os
import sys

# Ensure we can import from current directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 1. Import the Full CSV Seeder
try:
    from seed_csv import seed_from_csv
except ImportError:
    # If running inside container where seed_csv matches filename
    from seed_csv import seed_from_csv

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Force correct DB connection
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@db:5432/maclarens_analytics"

async def fix_permissions():
    """Logic to force active permissions for the admin user"""
    print("\n" + "=" * 50)
    print("PHASE 2: FIXING ADMIN PERMISSIONS")
    print("=" * 50)
    
    engine = create_async_engine(os.environ["DATABASE_URL"], echo=False)
    target_email = "sahanviranga18@gmail.com"
    
    async with engine.connect() as conn:
        # Get User ID (User should exist now from CSVs)
        res = await conn.execute(text("SELECT user_id FROM analytics.user_master WHERE user_email = :e"), {"e": target_email})
        user_id = res.scalar()
        
        if not user_id:
            print(f"❌ User {target_email} not found in CSV data!")
            # Fallback: Create the user if missing? 
            # User asked for 'Full seed', usually implies user is in CSV.
            # But let's be safe and insert if missing.
            print("  -> Creating user manually...")
            await conn.execute(text("""
                INSERT INTO analytics.user_master 
                (user_id, user_email, first_name, last_name, is_active, created_date, modified_date)
                VALUES ('U0048', :e, 'Sahan', 'Viranga', true, CURRENT_DATE, CURRENT_DATE)
                ON CONFLICT (user_id) DO NOTHING
            """), {"e": target_email})
            await conn.commit()
            user_id = 'U0048'
        else:
            print(f"✅ User found: {user_id}")

        # Force Active Roles
        print("Forcing all roles to ACTIVE...")
        await conn.execute(text("""
            UPDATE analytics.user_company_role_map
            SET is_active = true
            WHERE user_id = :uid
        """), {"uid": user_id})
        await conn.commit()
        
        # Verify
        rows = await conn.execute(text("""
            SELECT count(*) FROM analytics.user_company_role_map 
            WHERE user_id = :uid AND is_active = true
        """), {"uid": user_id})
        count = rows.scalar()
        print(f"✅ {count} Active Roles confirmed.")

    await engine.dispose()

async def main():
    print("=" * 60)
    print("🚀 STARTING FULL RE-SEED (CSV + PERMISSIONS)")
    print("=" * 60)
    
    # 1. Run the existing CSV seeder (Wipes DB + Loads Data)
    print("\n[1/2] Loading Standard Data...")
    await seed_from_csv()
    
    # 2. Fix Permissions
    print("\n[2/2] Applying Admin Fixes...")
    await fix_permissions()
    
    print("\n✅ RE-SEED COMPLETE! You can login now.")

if __name__ == "__main__":
    asyncio.run(main())
