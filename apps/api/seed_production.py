"""
Production/Clean Database Seeding Script
Creates essential structural data (Clusters, Companies, Users) WITHOUT dummy financial data.
"""
import os
import sys
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.db.models import Base, User, Cluster, Company, UserRole, FiscalCycle
from src.services.auth_service import AuthService
from src.config.settings import settings

async def seed_production_db():
    print("🏭 Starting Clean/Production Seed...")
    
    db_url = os.getenv("DATABASE_URL", str(settings.database_url))
    print(f"🔌 Connecting to database...")

    engine = create_async_engine(db_url, echo=False)
    
    print("   ↳ Checking schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        admin_email = "admin@maclarens.com"
        existing = await db.execute(select(User).where(User.email == admin_email))
        if existing.scalar_one_or_none():
            print("🛑 Database already initialized. Skipping seed.")
            await engine.dispose()
            return

        print("🌱 Seeding Structural Data...")
        
        # Create Clusters
        clusters_data = [
            {"name": "Liner", "code": "LNR", "fiscal_cycle": FiscalCycle.DECEMBER},
            {"name": "Insurance", "code": "INS", "fiscal_cycle": FiscalCycle.DECEMBER},
            {"name": "Logistics", "code": "LOG", "fiscal_cycle": FiscalCycle.MARCH},
            {"name": "Marine", "code": "MRN", "fiscal_cycle": FiscalCycle.DECEMBER},
            {"name": "Energy", "code": "ENG", "fiscal_cycle": FiscalCycle.DECEMBER},
            {"name": "Leisure", "code": "LSR", "fiscal_cycle": FiscalCycle.MARCH},
        ]
        
        clusters = {}
        for c in clusters_data:
            cluster = Cluster(**c)
            db.add(cluster)
            await db.flush()
            clusters[c["code"]] = cluster
            
        # Create Companies
        companies_data = [
            {"name": "McLarens Shipping Ltd", "code": "MSL", "cluster_code": "LNR"},
            {"name": "Lanka Container Lines", "code": "LCL", "cluster_code": "LNR"},
            {"name": "McLarens Insurance Brokers", "code": "MIB", "cluster_code": "INS"},
            {"name": "McLarens Logistics", "code": "MLG", "cluster_code": "LOG"},
            {"name": "McLarens Marine Services", "code": "MMS", "cluster_code": "MRN"},
            {"name": "McLarens Hotels", "code": "MHT", "cluster_code": "LSR"},
        ]
        
        for co in companies_data:
            company = Company(
                name=co["name"],
                code=co["code"],
                cluster_id=clusters[co["cluster_code"]].id
            )
            db.add(company)
            
        # Create Initial Admin & CEO
        print("👤 Creating Initial Administrators...")
        
        users = [
            {
                "email": admin_email,
                "name": "System Administrator",
                "role": UserRole.ADMIN,
                "password": "AdminChangeMe123!" 
            },
            {
                "email": "ceo@maclarens.com",
                "name": "CEO User",
                "role": UserRole.CEO,
                "password": "CeoChangeMe123!"
            }
        ]
        
        for u in users:
            user = User(
                email=u["email"],
                password_hash=AuthService.hash_password(u["password"]),
                name=u["name"],
                role=u["role"],
                is_active=True
            )
            db.add(user)
            
        await db.commit()
        print("✅ Seeding Complete.")
        print(f"👉 Admin Login: {admin_email} / AdminChangeMe123!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_production_db())
