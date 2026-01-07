"""
Standalone Database Seed Script
Run this from the apps/api directory to seed the database.
"""
import os
import sys

# Set the DATABASE_URL before any other imports
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5433/maclarens_analytics"
os.environ["REDIS_URL"] = "redis://localhost:6379"
os.environ["AUTH_MODE"] = "dev"
os.environ["JWT_SECRET"] = "maclarens-dev-secret-key-local"

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.db.models import Base, User, Cluster, Company, FinancialData, UserRole, FiscalCycle
from src.services.auth_service import AuthService


async def seed_database():
    """Seed the database with initial data"""
    print("🌱 Seeding database...")
    
    # Create engine directly with known good URL
    engine = create_async_engine(
        "postgresql+asyncpg://postgres:postgres@localhost:5433/maclarens_analytics",
        echo=True
    )
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables created")
    
    # Create session factory
    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        existing = await db.execute(select(User).limit(1))
        if existing.scalar_one_or_none():
            print("⚠️  Database already seeded, skipping...")
            await engine.dispose()
            return
        
        # ============ CREATE CLUSTERS ============
        print("Creating clusters...")
        clusters_data = [
            {"name": "Liner", "code": "LNR", "fiscal_cycle": FiscalCycle.DECEMBER},
            {"name": "Insurance", "code": "INS", "fiscal_cycle": FiscalCycle.DECEMBER},
            {"name": "Logistics", "code": "LOG", "fiscal_cycle": FiscalCycle.MARCH},
            {"name": "Marine", "code": "MRN", "fiscal_cycle": FiscalCycle.DECEMBER},
            {"name": "Energy", "code": "ENG", "fiscal_cycle": FiscalCycle.DECEMBER},
            {"name": "Leisure", "code": "LSR", "fiscal_cycle": FiscalCycle.MARCH},
        ]
        
        clusters = {}
        for c_data in clusters_data:
            cluster = Cluster(**c_data)
            db.add(cluster)
            await db.flush()
            clusters[c_data["code"]] = cluster
        
        # ============ CREATE COMPANIES ============
        print("Creating companies...")
        companies_data = [
            {"name": "McLarens Shipping Ltd", "code": "MSL", "cluster_code": "LNR"},
            {"name": "Lanka Container Lines", "code": "LCL", "cluster_code": "LNR"},
            {"name": "Colombo Freight Services", "code": "CFS", "cluster_code": "LNR"},
            {"name": "McLarens Insurance Brokers", "code": "MIB", "cluster_code": "INS"},
            {"name": "General Insurance Co", "code": "GIC", "cluster_code": "INS"},
            {"name": "McLarens Logistics", "code": "MLG", "cluster_code": "LOG"},
            {"name": "Express Cargo Services", "code": "ECS", "cluster_code": "LOG"},
            {"name": "McLarens Marine Services", "code": "MMS", "cluster_code": "MRN"},
            {"name": "Port Operations Ltd", "code": "POL", "cluster_code": "MRN"},
            {"name": "McLarens Energy Solutions", "code": "MES", "cluster_code": "ENG"},
            {"name": "Power Generation Co", "code": "PGC", "cluster_code": "ENG"},
            {"name": "McLarens Hotels", "code": "MHT", "cluster_code": "LSR"},
            {"name": "Resort Management Co", "code": "RMC", "cluster_code": "LSR"},
        ]
        
        companies = {}
        for co_data in companies_data:
            company = Company(
                name=co_data["name"],
                code=co_data["code"],
                cluster_id=clusters[co_data["cluster_code"]].id
            )
            db.add(company)
            await db.flush()
            companies[co_data["code"]] = company
        
        # ============ CREATE USERS ============
        print("Creating users...")
        users_data = [
            {
                "email": "sahanhettiarachchi275@gmail.com",
                "password": "1234",
                "name": "Sahan Hettiarachchi",
                "role": UserRole.DATA_OFFICER,
                "company_code": "MSL"
            },
            {
                "email": "dataentry@mclarens.com",
                "password": "data123",
                "name": "Data Entry Officer",
                "role": UserRole.DATA_OFFICER,
                "company_code": "MIB"
            },
            {
                "email": "sahanviranga18@gmail.com",
                "password": "5678",
                "name": "Sahan Viranga",
                "role": UserRole.COMPANY_DIRECTOR,
                "company_code": "MSL",
                "cluster_code": "LNR"
            },
            {
                "email": "director@mclarens.com",
                "password": "dir123",
                "name": "Company Director",
                "role": UserRole.COMPANY_DIRECTOR,
                "company_code": "MIB",
                "cluster_code": "INS"
            },
            {
                "email": "hmsvhettiarachchi@std.foc.sab.ac.lk",
                "password": "91011",
                "name": "System Administrator",
                "role": UserRole.ADMIN
            },
            {
                "email": "admin@mclarens.com",
                "password": "admin123",
                "name": "Admin User",
                "role": UserRole.ADMIN
            },
            {
                "email": "oxysusl@gmail.com",
                "password": "121314",
                "name": "CEO User",
                "role": UserRole.CEO
            },
            {
                "email": "ceo@mclarens.com",
                "password": "ceo123",
                "name": "Chief Executive Officer",
                "role": UserRole.CEO
            },
        ]
        
        for u_data in users_data:
            user = User(
                email=u_data["email"],
                password_hash=AuthService.hash_password(u_data["password"]),
                name=u_data["name"],
                role=u_data["role"],
                company_id=companies[u_data["company_code"]].id if u_data.get("company_code") else None,
                cluster_id=clusters[u_data["cluster_code"]].id if u_data.get("cluster_code") else None
            )
            db.add(user)
        
        # ============ CREATE FINANCIAL DATA ============
        print("Creating financial data...")
        import random
        
        for company_code, company in companies.items():
            for month in range(1, 13):
                base_revenue = random.uniform(5000, 20000)
                base_cost = base_revenue * random.uniform(0.6, 0.85)
                
                revenue_actual = base_revenue * random.uniform(0.9, 1.15)
                cost_actual = base_cost * random.uniform(0.9, 1.1)
                pbt_actual = revenue_actual - cost_actual
                ebitda_actual = pbt_actual * random.uniform(1.1, 1.3)
                
                revenue_budget = base_revenue
                cost_budget = base_cost
                pbt_budget = revenue_budget - cost_budget
                ebitda_budget = pbt_budget * 1.2
                
                financial = FinancialData(
                    company_id=company.id,
                    year=2025,
                    month=month,
                    revenue_actual=round(revenue_actual, 2),
                    cost_actual=round(cost_actual, 2),
                    pbt_actual=round(pbt_actual, 2),
                    ebitda_actual=round(ebitda_actual, 2),
                    revenue_budget=round(revenue_budget, 2),
                    cost_budget=round(cost_budget, 2),
                    pbt_budget=round(pbt_budget, 2),
                    ebitda_budget=round(ebitda_budget, 2),
                    is_approved=month <= 10
                )
                db.add(financial)
        
        await db.commit()
        print("✅ Database seeded successfully!")
        
        # Print credentials
        print("\n📋 Test Credentials:")
        print("=" * 60)
        print("DATA OFFICER:      sahanhettiarachchi275@gmail.com / 1234")
        print("COMPANY DIRECTOR:  sahanviranga18@gmail.com / 5678")
        print("ADMIN:             hmsvhettiarachchi@std.foc.sab.ac.lk / 91011")
        print("CEO:               oxysusl@gmail.com / 121314")
        print("=" * 60)
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_database())
