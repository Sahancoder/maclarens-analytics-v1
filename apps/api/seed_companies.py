"""
Seed Companies and Clusters for McLarens Analytics
Run this script to populate the database with all companies and clusters.
"""
import asyncio
import sys
sys.path.insert(0, "c:/Users/Sahan/Desktop/maclarens-analytics-v1/apps/api")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from src.db.models import Base, Cluster, Company, FiscalCycle

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5433/maclarens_analytics"

# Define all clusters with their fiscal cycles
CLUSTERS = [
    {"code": "LINER", "name": "Liner", "fiscal_cycle": FiscalCycle.MARCH},
    {"code": "SSL", "name": "Shipping services & Logistics", "fiscal_cycle": FiscalCycle.MARCH},
    {"code": "GAC", "name": "GAC Cluster", "fiscal_cycle": FiscalCycle.DECEMBER},
    {"code": "WL", "name": "Warehouse and Logistics", "fiscal_cycle": FiscalCycle.MARCH},
    {"code": "SSS", "name": "Ship Supply Services", "fiscal_cycle": FiscalCycle.MARCH},
    {"code": "LUB2", "name": "Lubricant II", "fiscal_cycle": FiscalCycle.MARCH},
    {"code": "MFG", "name": "Manufacturing", "fiscal_cycle": FiscalCycle.MARCH},
    {"code": "BNR", "name": "Bunkering & Renewables", "fiscal_cycle": FiscalCycle.MARCH},
    {"code": "LUB1", "name": "Lubricant I", "fiscal_cycle": FiscalCycle.DECEMBER},
    {"code": "PROP", "name": "Property", "fiscal_cycle": FiscalCycle.MARCH},
    {"code": "HTL", "name": "Hotel & Leisure", "fiscal_cycle": FiscalCycle.MARCH},
    {"code": "MHL", "name": "MHL and related companies", "fiscal_cycle": FiscalCycle.MARCH},
    {"code": "SI", "name": "Strategic Investment", "fiscal_cycle": FiscalCycle.MARCH},
    {"code": "DORMANT", "name": "Dormant Companies", "fiscal_cycle": FiscalCycle.MARCH},
]

# Define all companies (CompanyCode, CompanyName, ClusterCode, YearEnd, IsActive)
COMPANIES = [
    # Liner Cluster
    ("ONE", "ONE", "LINER", FiscalCycle.MARCH, True),
    ("UMI", "UMI", "LINER", FiscalCycle.MARCH, True),
    ("MSC", "MSC", "LINER", FiscalCycle.DECEMBER, True),
    
    # Shipping services & Logistics
    ("MMA", "McLarens Marchitime Academy (Pvt) Ltd", "SSL", FiscalCycle.MARCH, True),
    ("MOL", "M O L Logistics Lanka (Pvt) Ltd", "SSL", FiscalCycle.DECEMBER, True),
    ("CHR", "C.H. Robinson Worldwide Freight Lanka (Pvt) Ltd", "SSL", FiscalCycle.MARCH, True),
    ("SwiftShipping", "Swift Shipping Services (Pvt) Ltd", "SSL", FiscalCycle.MARCH, True),
    ("UnitedMarchitime", "United Marchitime (Pvt) Ltd", "SSL", FiscalCycle.MARCH, True),
    ("Shermans", "Shermans Logistics (Pvt) Ltd", "SSL", FiscalCycle.MARCH, True),
    
    # GAC Cluster
    ("GMSL", "GAC Marchine Services (Pvt) Ltd", "GAC", FiscalCycle.DECEMBER, True),
    ("GSL", "GAC Shipping Limited", "GAC", FiscalCycle.DECEMBER, True),
    ("GACTugs", "GAC Tugs (Private) Limited", "GAC", FiscalCycle.DECEMBER, True),
    ("MSL", "McLarens Shipping Ltd", "GAC", FiscalCycle.DECEMBER, True),
    ("GLL", "GAC Logistics Ltd", "GAC", FiscalCycle.DECEMBER, True),
    ("McOceanLog", "McOcean Logistics Ltd", "GAC", FiscalCycle.DECEMBER, False),
    
    # Warehouse and Logistics
    ("SPIL", "Spectra Integrated Logistics (Pvt) Ltd", "WL", FiscalCycle.MARCH, True),
    ("SPL", "Spectra Logistics (Pvt) Ltd", "WL", FiscalCycle.MARCH, True),
    ("MCY", "McLarens Container Yard (Pvt) Ltd", "WL", FiscalCycle.MARCH, False),
    
    # Ship Supply Services
    ("IOSM", "Interocean Ship Management (Pvt) Ltd", "SSS", FiscalCycle.MARCH, True),
    ("AMOS", "Amos International Lanka (Pvt) Ltd", "SSS", FiscalCycle.MARCH, True),
    ("CTL", "Continental Tech Services (Pvt) Ltd", "SSS", FiscalCycle.MARCH, True),
    ("IOS_C", "Interocean Services Limited C", "SSS", FiscalCycle.MARCH, True),
    ("WOSS", "World Subsea Services (Pvt) Ltd", "SSS", FiscalCycle.MARCH, True),
    ("LSL", "Lubricant Specialists (Pvt) Ltd", "SSS", FiscalCycle.MARCH, False),
    ("IOMA", "Interocean Marchine Agencies (Pvt) Ltd", "SSS", FiscalCycle.MARCH, True),
    ("WSS", "Walkers Subsea Services (Pvt) Ltd", "SSS", FiscalCycle.MARCH, False),
    ("IOLL", "Interocean Logistics (Pvt) Ltd", "SSS", FiscalCycle.MARCH, True),
    ("IOS_S", "Interocean Services Limited S", "SSS", FiscalCycle.MARCH, True),
    ("IOS_T", "Interocean Services Limited T", "SSS", FiscalCycle.MARCH, True),
    
    # Lubricant II
    ("Carplan", "Carplan Lubricants (Private) Limited", "LUB2", FiscalCycle.MARCH, True),
    ("ECL", "Energy Core Lanka (Pvt) Ltd", "LUB2", FiscalCycle.MARCH, False),
    ("ElanLubricants", "Elan Lubricants (Pvt) Ltd", "LUB2", FiscalCycle.MARCH, True),
    ("InteroceanLubricants", "Interocean Lubricants (Pvt) Ltd", "LUB2", FiscalCycle.DECEMBER, True),
    ("EHL", "Elan Holdings (Pvt) Ltd", "LUB2", FiscalCycle.MARCH, False),
    ("SeaWorldLanka", "Sea World Lanka (Pvt) Ltd", "LUB2", FiscalCycle.MARCH, True),
    
    # Manufacturing
    ("Yantrataksan", "Yantrataksan Technologies (Pvt) Ltd", "MFG", FiscalCycle.MARCH, True),
    ("Pidilite", "Pidilite Lanka (Pvt) Ltd", "MFG", FiscalCycle.MARCH, True),
    ("Macbertan", "Macbertan (Pvt) Ltd", "MFG", FiscalCycle.MARCH, True),
    ("MacbertanHoldings", "Macbertan Holdings (Pvt) Ltd", "MFG", FiscalCycle.MARCH, True),
    
    # Bunkering & Renewables
    ("CBS", "Colombo Bunkering Services (Pvt) Ltd", "BNR", FiscalCycle.MARCH, False),
    ("IOE", "Interocean Energy (Pvt) Ltd", "BNR", FiscalCycle.MARCH, True),
    ("McMarchine", "Mc Marchine (Pvt) Ltd", "BNR", FiscalCycle.MARCH, False),
    ("OLBS", "Ocean Lanka Bunkering Services (Pvt) Ltd", "BNR", FiscalCycle.MARCH, False),
    ("HMES", "HM Energy Solutions (Pvt) Ltd", "BNR", FiscalCycle.MARCH, False),
    ("McBay", "Mcbay (Pvt) Ltd", "BNR", FiscalCycle.MARCH, False),
    
    # Lubricant I
    ("MLL-Auto", "McLarens Lubricants Ltd - Auto", "LUB1", FiscalCycle.DECEMBER, True),
    ("McKupler", "McKupler Inc", "LUB1", FiscalCycle.DECEMBER, True),
    ("3M", "McLarens Lubricants Ltd - 3M", "LUB1", FiscalCycle.DECEMBER, True),
    ("MLL-Industrial", "McLarens Lubricants Ltd - Industrial", "LUB1", FiscalCycle.DECEMBER, True),
    ("McShaw-Auto", "McShaw Automotive Limited", "LUB1", FiscalCycle.DECEMBER, True),
    ("MC360", "MC360", "LUB1", FiscalCycle.DECEMBER, False),
    
    # Property
    ("GAHL", "Galle Agency House (Pvt) Ltd", "PROP", FiscalCycle.MARCH, True),
    ("IOD", "Interocean Developments (Pvt) Ltd", "PROP", FiscalCycle.MARCH, False),
    ("IOP", "Interocean Property (Pvt) Ltd", "PROP", FiscalCycle.MARCH, False),
    ("JaysAuto", "Jays Auto", "PROP", FiscalCycle.MARCH, False),
    ("MGL", "M G Logistics (Pvt) Ltd", "PROP", FiscalCycle.MARCH, True),
    ("MGIL", "Mac Group International (Pvt) Ltd", "PROP", FiscalCycle.MARCH, True),
    ("MacbertanProp", "Macbertan Properties (Pvt) Ltd", "PROP", FiscalCycle.MARCH, False),
    ("MAL", "Mclarens Automotive Ltd", "PROP", FiscalCycle.MARCH, True),
    ("MDL", "Mclarens Developers Ltd", "PROP", FiscalCycle.MARCH, True),
    ("MOPD", "McOcean Property Developers", "PROP", FiscalCycle.MARCH, True),
    ("McPeak", "McPeak Lanka (Pvt) Ltd", "PROP", FiscalCycle.MARCH, False),
    ("RIL", "Rantek Investments (Private) Limited", "PROP", FiscalCycle.MARCH, False),
    ("SAHL", "Shipping Agency House (Pvt) Ltd", "PROP", FiscalCycle.MARCH, True),
    ("UPH", "United Property Holdings (Pvt) Ltd", "PROP", FiscalCycle.MARCH, False),
    ("USAL", "United Shipping Agencies", "PROP", FiscalCycle.MARCH, True),
    ("Velocitech", "Velocitech (Private) Limited", "PROP", FiscalCycle.MARCH, False),
    
    # Hotel & Leisure
    ("Topas", "Topaz Hotels Limited", "HTL", FiscalCycle.MARCH, True),
    ("ELH", "Emerald Lanka Hotels Ltd", "HTL", FiscalCycle.MARCH, False),
    
    # MHL and related companies
    ("AHA", "Austin Holdings Australia (Pte) Ltd", "MHL", FiscalCycle.MARCH, False),
    ("AHL", "Austin Holdings Ltd", "MHL", FiscalCycle.MARCH, False),
    ("AM", "Austin Marchine (Pte) Ltd", "MHL", FiscalCycle.MARCH, False),
    ("AFS", "Auto Force Services Ltd", "MHL", FiscalCycle.MARCH, False),
    ("CPL", "Cambridge Properties (Pvt) Ltd", "MHL", FiscalCycle.MARCH, False),
    ("CAL", "Contship Agencies (Pvt) Ltd", "MHL", FiscalCycle.MARCH, False),
    ("FHV", "Fort Heritage Ventures (Private) Limited", "MHL", FiscalCycle.MARCH, False),
    ("IOA", "Interocean Automobile (Pvt) Ltd", "MHL", FiscalCycle.MARCH, False),
    ("MHLtd", "McLarens Holdings Limited", "MHL", FiscalCycle.MARCH, False),
    ("MIL", "McLarens International (Pvt) Ltd", "MHL", FiscalCycle.MARCH, False),
    ("MPL", "McLarens Property (Pvt) Ltd", "MHL", FiscalCycle.MARCH, False),
    ("YJI", "Y & J Investments (Pvt) Ltd", "MHL", FiscalCycle.MARCH, False),
    
    # Strategic Investment
    ("MGML", "Mclarans Group Management Ltd", "SI", FiscalCycle.MARCH, True),
    
    # Dormant Companies
    ("CFP", "Cinemac Film Production (Pvt) Ltd", "DORMANT", FiscalCycle.MARCH, False),
    ("GMR", "G M Rails (Pvt) Ltd", "DORMANT", FiscalCycle.MARCH, False),
    ("IOI", "Interocean Investments (Pvt) Ltd", "DORMANT", FiscalCycle.MARCH, False),
    ("PEL", "Petro Energy Lanka (Pvt) Ltd", "DORMANT", FiscalCycle.MARCH, False),
    ("SRF", "Silk Route Foods (Pvt) Ltd", "DORMANT", FiscalCycle.MARCH, False),
    ("SD", "Speed Drome (Pvt) Ltd", "DORMANT", FiscalCycle.MARCH, False),
    ("TML", "Terra-Marchine Lanka (Pvt) Ltd", "DORMANT", FiscalCycle.MARCH, False),
]


async def seed_data():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Create clusters first
        print("\n📁 Creating Clusters...")
        cluster_map = {}  # code -> cluster object
        
        for cluster_data in CLUSTERS:
            # Check if cluster already exists
            result = await session.execute(
                select(Cluster).where(Cluster.code == cluster_data["code"])
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"   ⏭️  Cluster '{cluster_data['name']}' already exists")
                cluster_map[cluster_data["code"]] = existing
            else:
                cluster = Cluster(
                    code=cluster_data["code"],
                    name=cluster_data["name"],
                    fiscal_cycle=cluster_data["fiscal_cycle"],
                    is_active=True
                )
                session.add(cluster)
                cluster_map[cluster_data["code"]] = cluster
                print(f"   ✅ Created cluster: {cluster_data['name']}")
        
        await session.commit()
        
        # Refresh clusters to get their IDs
        for code, cluster in cluster_map.items():
            await session.refresh(cluster)
        
        # Create companies
        print("\n🏢 Creating Companies...")
        companies_created = 0
        companies_skipped = 0
        
        for code, name, cluster_code, fiscal_cycle, is_active in COMPANIES:
            # Check if company already exists
            result = await session.execute(
                select(Company).where(Company.code == code)
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                companies_skipped += 1
                continue
            
            cluster = cluster_map.get(cluster_code)
            if not cluster:
                print(f"   ⚠️  Cluster '{cluster_code}' not found for company '{name}'")
                continue
            
            company = Company(
                code=code,
                name=name,
                cluster_id=cluster.id,
                is_active=is_active
            )
            session.add(company)
            companies_created += 1
            
            status = "✅" if is_active else "⏸️ "
            print(f"   {status} {code}: {name} [{cluster_code}]")
        
        await session.commit()
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 SEED SUMMARY")
        print("=" * 50)
        print(f"   Clusters: {len(CLUSTERS)}")
        print(f"   Companies created: {companies_created}")
        print(f"   Companies skipped (already exist): {companies_skipped}")
        print(f"   Total companies in database: {companies_created + companies_skipped}")
        
        # Count active vs inactive
        active_count = sum(1 for c in COMPANIES if c[4])
        inactive_count = len(COMPANIES) - active_count
        print(f"   Active companies: {active_count}")
        print(f"   Inactive companies: {inactive_count}")
        print("=" * 50)
    
    await engine.dispose()
    print("\n✅ Database seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed_data())
