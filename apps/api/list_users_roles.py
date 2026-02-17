
import asyncio
import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add the project root to the python path
current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.join(current_dir, 'src')
if src_path not in sys.path:
    sys.path.append(src_path)

# Ensure the parent directory is also in path for module resolution if needed
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

from sqlalchemy import select, text
from src.db.session import async_session_factory
from src.db.models import UserMaster, UserCompanyRoleMap, RoleMaster

async def list_users_and_roles():
    try:
        async with async_session_factory() as session:
            # Query to ensure DB connection works first
            await session.execute(text("SELECT 1"))
            
            # Query to get all active users and their active roles
            # We explicitly join to filter out inactive relationships
            stmt = (
                select(
                    UserMaster.user_email,
                    UserMaster.first_name,
                    UserMaster.last_name,
                    RoleMaster.role_name,
                    RoleMaster.role_id,
                    UserCompanyRoleMap.is_active
                )
                .join(UserCompanyRoleMap, UserMaster.user_id == UserCompanyRoleMap.user_id)
                .join(RoleMaster, UserCompanyRoleMap.role_id == RoleMaster.role_id)
                .where(
                    UserMaster.is_active == True,
                    UserCompanyRoleMap.is_active == True
                )
                .order_by(RoleMaster.role_id, UserMaster.user_email)
            )
            
            result = await session.execute(stmt)
            rows = result.all()

            if not rows:
                print("No active users found with active roles.")
                return

            print("\n" + "="*80)
            print("ACCESS CONTROL AUDIT REPORT")
            print("="*80)

            # --- Finance Officer Portal ---
            print("\n[PORTAL] Finance Officer")
            print("URL: http://localhost:3000/finance-officer/login")
            print("Allowed Roles: Finance Officer (1), Admin (3)")
            print("-" * 80)
            print(f"{'Email':<35} | {'Name':<25} | {'Role (ID)'}")
            print("-" * 80)
            for row in rows:
                if row.role_id in [1, 3]:
                    name = f"{row.first_name} {row.last_name}"
                    print(f"{row.user_email:<35} | {name:<25} | {row.role_name} ({row.role_id})")

            # --- Finance Director Portal ---
            print("\n[PORTAL] Finance Director")
            print("URL: http://localhost:3000/finance-director/login")
            print("Allowed Roles: Finance Director (2), Admin (3)")
            print("-" * 80)
            print(f"{'Email':<35} | {'Name':<25} | {'Role (ID)'}")
            print("-" * 80)
            for row in rows:
                if row.role_id in [2, 3]:
                    name = f"{row.first_name} {row.last_name}"
                    print(f"{row.user_email:<35} | {name:<25} | {row.role_name} ({row.role_id})")

            # --- System Admin Portal ---
            print("\n[PORTAL] System Admin")
            print("URL: http://localhost:3000/system-admin/login")
            print("Allowed Roles: Admin (3)")
            print("-" * 80)
            print(f"{'Email':<35} | {'Name':<25} | {'Role (ID)'}")
            print("-" * 80)
            for row in rows:
                if row.role_id == 3:
                    name = f"{row.first_name} {row.last_name}"
                    print(f"{row.user_email:<35} | {name:<25} | {row.role_name} ({row.role_id})")

            # --- MD Portal ---
            print("\n[PORTAL] Managing Director (MD)")
            print("URL: http://localhost:3000/md/login")
            print("Allowed Roles: MD (4), Admin (3)")
            print("-" * 80)
            print(f"{'Email':<35} | {'Name':<25} | {'Role (ID)'}")
            print("-" * 80)
            for row in rows:
                if row.role_id in [4, 3]:
                    name = f"{row.first_name} {row.last_name}"
                    print(f"{row.user_email:<35} | {name:<25} | {row.role_name} ({row.role_id})")
            
            print("\n" + "="*80 + "\n")

    except Exception as e:
        print(f"Error accessing database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(list_users_and_roles())
