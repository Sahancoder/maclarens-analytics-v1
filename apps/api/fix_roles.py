import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Force correct DB connection for inside container
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@db:5432/maclarens_analytics"

async def fix_sahan_roles():
    print("=" * 60)
    print("FORCE ACTIVATING ROLES FOR: sahanviranga18@gmail.com")
    print("=" * 60)

    engine = create_async_engine(os.environ["DATABASE_URL"], echo=False)
    
    try:
        async with engine.connect() as conn:
            # 1. Get User ID
            result = await conn.execute(text(
                "SELECT user_id FROM analytics.user_master WHERE user_email = 'sahanviranga18@gmail.com'"
            ))
            user_id = result.scalar()
            
            if not user_id:
                print("❌ User not found! Please run the seeding script first.")
                return

            print(f"Found User ID: {user_id}")

            # 2. Update ALL role mappings
            print("Activating all assigned roles...")
            update_result = await conn.execute(text("""
                UPDATE analytics.user_company_role_map
                SET is_active = true
                WHERE user_id = :uid
            """), {"uid": user_id})
            
            await conn.commit()
            print(f"✅ Updated {update_result.rowcount} role mappings to ACTIVE.")

            # 3. Verify
            print("\nVerification:")
            rows = await conn.execute(text("""
                SELECT rm.role_name, cm.company_name, ucrm.is_active
                FROM analytics.user_company_role_map ucrm
                JOIN analytics.company_master cm ON ucrm.company_id = cm.company_id
                JOIN analytics.role_master rm ON ucrm.role_id = rm.role_id
                WHERE ucrm.user_id = :uid
            """), {"uid": user_id})
            
            for row in rows:
                status = "✅ TRUE" if row[2] else "❌ FALSE"
                print(f"  {row[1]:<40} | {row[0]:<15} | {status}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix_sahan_roles())
