"""
Database Seed Script
Updated for User Master / Role Master schema
"""
import asyncio
from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.session import AsyncSessionLocal, init_db
from src.db.models import (
    UserMaster, RoleMaster, ClusterMaster, CompanyMaster, 
    UserCompanyMap, UserCompanyRoleMap
)

async def seed_database():
    """Seed the database with initial data matching the new schema"""
    print("🌱 Seeding database...")
    
    await init_db()
    
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        existing = await db.execute(select(UserMaster).limit(1))
        if existing.scalar_one_or_none():
            print("⚠️  Database already seeded, skipping...")
            # Ensure Admin exists even if seeded
            # await ensure_admin_user(db)
            return
        
        # 1. Create Roles (IDs must match constants.py: 1=FO, 2=FD, 3=Admin, 4=MD)
        print("Creating roles...")
        roles = [
            {"role_id": 1, "role_name": "Finance Officer"},
            {"role_id": 2, "role_name": "Finance Director"},
            {"role_id": 3, "role_name": "Admin"},
            {"role_id": 4, "role_name": "MD"},
        ]

        role_map = {}
        for r_data in roles:
            role = RoleMaster(role_id=r_data["role_id"], role_name=r_data["role_name"])
            db.add(role)
            await db.flush()
            role_map[r_data["role_name"]] = role.role_id
            
        # 2. Create Clusters
        print("Creating clusters...")
        clusters = [
            {"cluster_id": "C01", "cluster_name": "Shipping Infrastructure"},
            {"cluster_id": "C02", "cluster_name": "Logistics"},
            {"cluster_id": "C03", "cluster_name": "Maritime Services"},
        ]
        
        for c_data in clusters:
            cluster = ClusterMaster(
                cluster_id=c_data["cluster_id"], 
                cluster_name=c_data["cluster_name"],
                created_date=date.today(),
                modified_date=date.today()
            )
            db.add(cluster)
            
        await db.flush()
        
        # 3. Create Companies
        print("Creating companies...")
        companies = [
            {"company_id": "CC0001", "company_name": "GAC Shipping Ltd", "cluster_id": "C01"},
            {"company_id": "CC0002", "company_name": "McLarens Logistics Ltd", "cluster_id": "C02"},
            {"company_id": "CC0003", "company_name": "Spectra Logistics", "cluster_id": "C02"},
        ]
        
        for co_data in companies:
            company = CompanyMaster(
                company_id=co_data["company_id"],
                company_name=co_data["company_name"],
                cluster_id=co_data["cluster_id"],
                created_date=date.today(),
                modified_date=date.today(),
                is_active=True
            )
            db.add(company)
            
        await db.flush()
        
        # 4. Create Users
        print("Creating users...")
        users = [
            {
                "user_id": "U0001",
                "email": "amanda@mclarens.lk", # Admin 
                "first_name": "Amanda",
                "last_name": "Admin",
                "role": "Admin",
                "company_id": "CC0001" # Admin usually has access to all, but mapping one primary for now
            },
            {
                "user_id": "U0002",
                "email": "sahan@mclarens.lk",
                "first_name": "Sahan",
                "last_name": "Hettiarachchi",
                "role": "Finance Officer",
                "company_id": "CC0001"
            },
            {
                "user_id": "U0003",
                "email": "director@mclarens.lk",
                "first_name": "Company",
                "last_name": "Director",
                "role": "Finance Director",
                "company_id": "CC0001"
            }
        ]
        
        for u_data in users:
            # Create UserMaster
            user = UserMaster(
                user_id=u_data["user_id"],
                user_email=u_data["email"],
                first_name=u_data["first_name"],
                last_name=u_data["last_name"],
                created_date=date.today(),
                modified_date=date.today(),
                is_active=True
            )
            db.add(user)
            await db.flush()
            
            # Map Company
            user_company = UserCompanyMap(
                user_id=user.user_id,
                company_id=u_data["company_id"],
                assigned_date=date.today(),
                is_active=True
            )
            db.add(user_company)
            
            # Map Role
            role_id = role_map.get(u_data["role"])
            if role_id:
                user_role = UserCompanyRoleMap(
                    user_id=user.user_id,
                    company_id=u_data["company_id"],
                    role_id=role_id,
                    is_active=True
                )
                db.add(user_role)
        
        await db.commit()
        print("✅ Database seeded successfully!")
        print("  Admin: amanda@mclarens.lk")

if __name__ == "__main__":
    asyncio.run(seed_database())
