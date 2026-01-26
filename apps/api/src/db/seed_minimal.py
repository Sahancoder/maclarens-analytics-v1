"""
Seed Script for McLarens Analytics
Creates minimal master data for development and testing

Usage:
    cd apps/api
    python -m src.db.seed_minimal
    
Or in Docker:
    docker exec maclarens-backend python -m src.db.seed_minimal
"""
import asyncio
import uuid
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import AsyncSessionLocal, init_db
from src.db.models import (
    Cluster, Company, User, UserRole, 
    FinancialMonthly, Scenario, FxRate
)


async def seed_database():
    """
    Seed the database with minimal master data:
    - 2 Clusters
    - 4 Companies (2 per cluster)
    - 4 Users (1 Admin, 1 CEO, 1 FD, 1 FO)
    - Sample FX rates
    - Sample budget data
    """
    print("🌱 Starting database seed...")
    
    # Initialize database (creates tables if not exist)
    await init_db()
    
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        existing = await db.execute(select(Cluster).limit(1))
        if existing.scalar_one_or_none():
            print("⚠️  Database already has data. Skipping seed.")
            return
        
        print("📦 Creating clusters...")
        clusters = await create_clusters(db)
        
        print("🏢 Creating companies...")
        companies = await create_companies(db, clusters)
        
        print("👥 Creating users...")
        users = await create_users(db, clusters, companies)
        
        print("💱 Creating FX rates...")
        await create_fx_rates(db)
        
        print("📊 Creating sample budget data...")
        await create_sample_budget(db, companies, users)
        
        await db.commit()
        
    print("✅ Database seeded successfully!")
    print_summary()


async def create_clusters(db: AsyncSession) -> dict:
    """Create 2 clusters"""
    clusters_data = [
        {"name": "Asia Pacific", "code": "APAC", "description": "Asia Pacific Region"},
        {"name": "Middle East", "code": "ME", "description": "Middle East Region"},
    ]
    
    clusters = {}
    for data in clusters_data:
        cluster = Cluster(
            id=uuid.uuid4(),
            name=data["name"],
            code=data["code"],
            description=data["description"],
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(cluster)
        clusters[data["code"]] = cluster
    
    await db.flush()
    return clusters


async def create_companies(db: AsyncSession, clusters: dict) -> dict:
    """Create 4 companies (2 per cluster)"""
    companies_data = [
        # APAC Cluster
        {"name": "McLarens Sri Lanka", "code": "MCL-LK", "cluster": "APAC", "fy_start_month": 1},
        {"name": "McLarens India", "code": "MCL-IN", "cluster": "APAC", "fy_start_month": 4},  # Apr FY
        # ME Cluster  
        {"name": "McLarens UAE", "code": "MCL-UAE", "cluster": "ME", "fy_start_month": 1},
        {"name": "McLarens Qatar", "code": "MCL-QA", "cluster": "ME", "fy_start_month": 1},
    ]
    
    companies = {}
    for data in companies_data:
        company = Company(
            id=uuid.uuid4(),
            name=data["name"],
            code=data["code"],
            cluster_id=clusters[data["cluster"]].id,
            fy_start_month=data["fy_start_month"],
            currency="LKR" if "LK" in data["code"] else "USD",
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(company)
        companies[data["code"]] = company
    
    await db.flush()
    return companies


async def create_users(db: AsyncSession, clusters: dict, companies: dict) -> dict:
    """Create 4 users with different roles"""
    from passlib.hash import bcrypt
    
    # Default password for dev: "password123"
    default_hash = bcrypt.hash("password123")
    
    users_data = [
        {
            "name": "System Admin",
            "email": "admin@maclarens.local",
            "role": UserRole.ADMIN,
            "company": None,
            "cluster": None,
        },
        {
            "name": "CEO Dashboard",
            "email": "ceo@maclarens.local",
            "role": UserRole.CEO,
            "company": None,
            "cluster": None,
        },
        {
            "name": "Finance Director",
            "email": "fd@maclarens.local",
            "role": UserRole.COMPANY_DIRECTOR,
            "company": None,  # FD reviews via cluster
            "cluster": "APAC",
        },
        {
            "name": "Finance Officer",
            "email": "fo@maclarens.local",
            "role": UserRole.DATA_OFFICER,
            "company": "MCL-LK",
            "cluster": "APAC",
        },
    ]
    
    users = {}
    for data in users_data:
        user = User(
            id=uuid.uuid4(),
            name=data["name"],
            email=data["email"],
            password_hash=default_hash,
            role=data["role"],
            company_id=companies[data["company"]].id if data["company"] else None,
            cluster_id=clusters[data["cluster"]].id if data["cluster"] else None,
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(user)
        users[data["email"]] = user
    
    await db.flush()
    return users


async def create_fx_rates(db: AsyncSession):
    """Create sample FX rates for 2024-2026"""
    rates_data = []
    
    # LKR to USD rates (approximate)
    lkr_usd_rates = {
        2024: 320.0,
        2025: 295.0,
        2026: 290.0,
    }
    
    for year, base_rate in lkr_usd_rates.items():
        for month in range(1, 13):
            # Add some monthly variation
            rate = base_rate + (month - 6) * 0.5
            rates_data.append({
                "from_currency": "LKR",
                "to_currency": "USD",
                "year": year,
                "month": month,
                "rate": round(1 / rate, 6),  # Store as LKR -> USD conversion
                "source": "seed"
            })
    
    for data in rates_data:
        fx = FxRate(
            id=uuid.uuid4(),
            **data,
            created_at=datetime.utcnow()
        )
        db.add(fx)


async def create_sample_budget(db: AsyncSession, companies: dict, users: dict):
    """Create sample BUDGET data for 2025"""
    # Only create budget for first company as sample
    company = companies["MCL-LK"]
    admin = users["admin@maclarens.local"]
    
    # Monthly budget figures (in LKR '000)
    budget_template = {
        "exchange_rate": 295.0,
        "revenue_lkr": 50_000_000,  # 50M LKR
        "gp": 15_000_000,           # 15M LKR
        "other_income": 500_000,
        "personal_exp": 8_000_000,
        "admin_exp": 2_000_000,
        "selling_exp": 1_500_000,
        "finance_exp": 1_000_000,
        "depreciation": 500_000,
        "provisions": 0,
        "exchange_gl": 0,
        "non_ops_exp": 0,
        "non_ops_income": 0,
    }
    
    for month in range(1, 13):
        # Slight variation by month
        multiplier = 1.0 + (month - 6) * 0.02
        
        fm = FinancialMonthly(
            id=uuid.uuid4(),
            company_id=company.id,
            year=2025,
            month=month,
            scenario=Scenario.BUDGET,
            exchange_rate=budget_template["exchange_rate"],
            revenue_lkr=budget_template["revenue_lkr"] * multiplier,
            gp=budget_template["gp"] * multiplier,
            other_income=budget_template["other_income"],
            personal_exp=budget_template["personal_exp"],
            admin_exp=budget_template["admin_exp"],
            selling_exp=budget_template["selling_exp"],
            finance_exp=budget_template["finance_exp"],
            depreciation=budget_template["depreciation"],
            provisions=0,
            exchange_gl=0,
            non_ops_exp=0,
            non_ops_income=0,
            imported_at=datetime.utcnow(),
            imported_by=admin.id,
            version=1,
            created_at=datetime.utcnow()
        )
        db.add(fm)


def print_summary():
    """Print seed summary"""
    print("\n" + "=" * 50)
    print("📋 SEED SUMMARY")
    print("=" * 50)
    print("""
Clusters:
  - APAC (Asia Pacific)
  - ME (Middle East)

Companies:
  - MCL-LK (McLarens Sri Lanka) - APAC - FY: Jan-Dec
  - MCL-IN (McLarens India) - APAC - FY: Apr-Mar
  - MCL-UAE (McLarens UAE) - ME - FY: Jan-Dec
  - MCL-QA (McLarens Qatar) - ME - FY: Jan-Dec

Users (password: password123):
  - admin@maclarens.local (Admin)
  - ceo@maclarens.local (CEO/MD)
  - fd@maclarens.local (Finance Director - APAC)
  - fo@maclarens.local (Finance Officer - MCL-LK)

Sample Data:
  - FX Rates: 2024-2026 (LKR/USD)
  - Budget: 2025 monthly for MCL-LK
""")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(seed_database())
