#!/usr/bin/env python3
"""
Database Seed Script
Populates the database with initial data for development and testing.
"""
import asyncio
import os
import sys
from uuid import uuid4
from datetime import datetime, timedelta
import random

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'apps', 'api'))

from src.db.session import async_session_factory
from src.db.models import (
    ClusterModel,
    CompanyModel,
    UserModel,
    ReportModel,
)


async def seed_clusters(session):
    """Create sample clusters"""
    clusters = [
        ClusterModel(
            id=uuid4(),
            name="North Region",
            code="NORTH",
            description="Northern region cluster",
            region="North",
        ),
        ClusterModel(
            id=uuid4(),
            name="South Region",
            code="SOUTH",
            description="Southern region cluster",
            region="South",
        ),
        ClusterModel(
            id=uuid4(),
            name="East Region",
            code="EAST",
            description="Eastern region cluster",
            region="East",
        ),
        ClusterModel(
            id=uuid4(),
            name="West Region",
            code="WEST",
            description="Western region cluster",
            region="West",
        ),
    ]
    
    for cluster in clusters:
        session.add(cluster)
    await session.commit()
    
    print(f"Created {len(clusters)} clusters")
    return clusters


async def seed_companies(session, clusters):
    """Create sample companies"""
    companies = []
    company_names = [
        "Alpha Corp", "Beta Industries", "Gamma Tech", "Delta Services",
        "Epsilon Ltd", "Zeta Holdings", "Eta Solutions", "Theta Group",
    ]
    
    for i, name in enumerate(company_names):
        cluster = clusters[i % len(clusters)]
        company = CompanyModel(
            id=uuid4(),
            name=name,
            code=name.split()[0].upper()[:4] + str(i + 1).zfill(3),
            cluster_id=cluster.id,
            contact_email=f"contact@{name.lower().replace(' ', '')}.com",
        )
        companies.append(company)
        session.add(company)
    
    await session.commit()
    print(f"Created {len(companies)} companies")
    return companies


async def seed_users(session, companies, clusters):
    """Create sample users"""
    users = []
    
    # Admin user
    admin = UserModel(
        id=uuid4(),
        email="admin@maclarens.com",
        name="System Administrator",
        role="ADMIN",
        is_active=True,
    )
    users.append(admin)
    session.add(admin)
    
    # CEO user
    ceo = UserModel(
        id=uuid4(),
        email="ceo@maclarens.com",
        name="Chief Executive Officer",
        role="CEO",
        is_active=True,
    )
    users.append(ceo)
    session.add(ceo)
    
    # Directors (one per cluster)
    for cluster in clusters:
        director = UserModel(
            id=uuid4(),
            email=f"director.{cluster.code.lower()}@maclarens.com",
            name=f"Director {cluster.name}",
            role="DIRECTOR",
            cluster_id=cluster.id,
            is_active=True,
        )
        users.append(director)
        session.add(director)
    
    # Data Officers (one per company)
    for company in companies:
        officer = UserModel(
            id=uuid4(),
            email=f"officer@{company.code.lower()}.com",
            name=f"Data Officer {company.name}",
            role="DATA_OFFICER",
            company_id=company.id,
            cluster_id=company.cluster_id,
            is_active=True,
        )
        users.append(officer)
        session.add(officer)
    
    await session.commit()
    print(f"Created {len(users)} users")
    return users


async def seed_reports(session, users, companies):
    """Create sample reports"""
    reports = []
    statuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"]
    
    data_officers = [u for u in users if u.role == "DATA_OFFICER"]
    
    for officer in data_officers:
        # Create 3-5 reports per officer
        num_reports = random.randint(3, 5)
        for i in range(num_reports):
            days_ago = random.randint(1, 30)
            report = ReportModel(
                id=uuid4(),
                title=f"Monthly Report {i + 1} - {officer.name}",
                status=random.choice(statuses),
                data={
                    "revenue": random.randint(10000, 100000),
                    "expenses": random.randint(5000, 50000),
                    "period": f"2024-{random.randint(1, 12):02d}",
                },
                author_id=officer.id,
                company_id=officer.company_id,
                created_at=datetime.utcnow() - timedelta(days=days_ago),
                updated_at=datetime.utcnow() - timedelta(days=days_ago - 1),
            )
            reports.append(report)
            session.add(report)
    
    await session.commit()
    print(f"Created {len(reports)} reports")
    return reports


async def main():
    """Main seed function"""
    print("Starting database seed...")
    
    async with async_session_factory() as session:
        try:
            # Seed in order of dependencies
            clusters = await seed_clusters(session)
            companies = await seed_companies(session, clusters)
            users = await seed_users(session, companies, clusters)
            reports = await seed_reports(session, users, companies)
            
            print("\nDatabase seeding completed successfully!")
            print(f"Summary:")
            print(f"  - Clusters: {len(clusters)}")
            print(f"  - Companies: {len(companies)}")
            print(f"  - Users: {len(users)}")
            print(f"  - Reports: {len(reports)}")
            
        except Exception as e:
            print(f"Error seeding database: {e}")
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(main())
