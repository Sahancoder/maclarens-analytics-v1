"""
Seed Database from CSV Files (Production-like Data)
Reads CSVs from infra/docker/db/seed/ and populates local database.
"""
import asyncio
import csv
import os
import sys
from datetime import datetime

# Database Config
# Docker Postgres on port 5433
if not os.getenv("DATABASE_URL"):
    # Docker Postgres on port 5433 (default for local host execution)
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5433/maclarens_analytics"

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import logging

# Configure logging to file
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("/app/seeding.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.db.models import Base

# Directory containing CSVs
# First check if running in Docker with mounted seed_data
if os.path.exists("/app/seed_data"):
    SEED_DIR = "/app/seed_data"
else:
    # Fallback to relative path for local execution
    SEED_DIR = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "infra", "docker", "db", "seed"
    )

def parse_date(val):
    """Convert date string to datetime object for asyncpg compatibility."""
    if not val or val.strip() == "":
        return None
    val = val.strip()
    try:
        if len(val) == 10:
            return datetime.strptime(val, "%Y-%m-%d")
        else:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except ValueError:
        return None

async def seed_from_csv():
    logger.info(f"Seeding from CSVs in: {SEED_DIR}")

    if not os.path.exists(SEED_DIR):
        logger.error(f"Seed directory not found: {SEED_DIR}")
        return

    try:
        engine = create_async_engine(os.environ["DATABASE_URL"], echo=False)

        # Create tables first
        async with engine.begin() as conn:
            logger.info("Creating tables...")
            await conn.run_sync(Base.metadata.create_all)

        AsyncSessionLocal = async_sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )

        async with AsyncSessionLocal() as db:
            # Clear existing data (reverse order of dependencies)
            logger.info("Cleaning tables...")
            tables = [
                "analytics.financial_fact",
                "analytics.financial_workflow",
                "analytics.user_company_role_map",
                "analytics.user_company_map",
                "analytics.user_master",
                "analytics.company_master",
                "analytics.cluster_master",
                "analytics.role_master",
                "analytics.period_master",
                "analytics.metric_master",
                "analytics.status_master",
            ]
            for t in tables:
                await db.execute(text(f"TRUNCATE TABLE {t} CASCADE"))
            await db.commit()

            # Helper to read CSV and insert
            async def load_csv(filename, table_name, columns, transform_row=None):
                path = os.path.join(SEED_DIR, filename)
                if not os.path.exists(path):
                    logger.warning(f"Skipping {filename} (not found)")
                    return

                logger.info(f"Loading {table_name}...")
                with open(path, "r", encoding="utf-8-sig") as f:
                    reader = csv.DictReader(f)
                    batch = []
                    for row in reader:
                        if transform_row:
                            row = transform_row(row)
                        if row:
                            # Convert empty strings to None
                            clean_row = {k: (v if v != "" else None) for k, v in row.items()}
                            # Keep only requested columns
                            final_row = {k: clean_row.get(k) for k in columns}
                            batch.append(final_row)

                    if batch:
                        stmt = text(
                            f"INSERT INTO {table_name} ({', '.join(columns)}) "
                            f"VALUES ({', '.join([':' + c for c in columns])})"
                        )
                        await db.execute(stmt, batch)
                        await db.commit()
                        logger.info(f"Loaded {len(batch)} rows into {table_name}")

            # 1. Role Master
            def transform_role(row):
                if row.get("role_id"):
                    row["role_id"] = int(row["role_id"])
                return row

            await load_csv("role_master.csv", "analytics.role_master", ["role_id", "role_name"], transform_role)

            # 2. Cluster Master
            def transform_cluster(row):
                val = str(row.get("is_active", "")).lower()
                row["is_active"] = val in ("true", "t", "1", "yes")
                row["created_date"] = parse_date(row.get("created_date"))
                row["modified_date"] = parse_date(row.get("modified_date"))
                return row

            await load_csv("cluster_master.csv", "analytics.cluster_master",
                           ["cluster_id", "cluster_name", "is_active", "created_date", "modified_date"],
                           transform_cluster)

            # 3. Company Master
            def transform_company(row):
                # Boolean conversion
                val = str(row.get("is_active", "")).lower()
                row["is_active"] = val in ("true", "t", "1", "yes")
                if row.get("fin_year_start_month"):
                    row["fin_year_start_month"] = int(float(row["fin_year_start_month"])) # handle 1.0
                row["created_date"] = parse_date(row.get("created_date"))
                row["modified_date"] = parse_date(row.get("modified_date"))
                return row

            await load_csv("company_master.csv", "analytics.company_master",
                           ["company_id", "cluster_id", "company_name", "fin_year_start_month", "is_active", "created_date", "modified_date"],
                           transform_company)

            # 4. User Master - custom loading to de-duplicate emails
            logger.info("Loading analytics.user_master...")
            user_path = os.path.join(SEED_DIR, "user_master.csv")
            if os.path.exists(user_path):
                with open(user_path, "r", encoding="utf-8-sig") as f:
                    reader = csv.DictReader(f)
                    raw_users = list(reader)

                # De-duplicate emails (same logic as 02_seed_v2.sql)
                email_counts = {}
                user_batch = []
                for row in sorted(raw_users, key=lambda r: r.get("user_id", "")):
                    val = str(row.get("is_active", "")).lower()
                    row["is_active"] = val in ("true", "t", "1", "yes")
                    email = row["user_email"].lower().strip()
                    row["created_date"] = parse_date(row.get("created_date"))
                    row["modified_date"] = parse_date(row.get("modified_date"))

                    email_counts[email] = email_counts.get(email, 0) + 1
                    if email_counts[email] > 1:
                        # Add +N suffix before @ for duplicates
                        parts = email.split("@")
                        email = f"{parts[0]}+{email_counts[email]}@{parts[1]}"

                    user_batch.append({
                        "user_id": row.get("user_id"),
                        "user_email": email,
                        "first_name": row.get("first_name") or None,
                        "last_name": row.get("last_name") or None,
                        "is_active": row["is_active"],
                        "created_date": row["created_date"],
                        "modified_date": row["modified_date"],
                    })

                if user_batch:
                    stmt = text(
                        "INSERT INTO analytics.user_master (user_id, user_email, first_name, last_name, is_active, created_date, modified_date) "
                        "VALUES (:user_id, :user_email, :first_name, :last_name, :is_active, :created_date, :modified_date)"
                    )
                    await db.execute(stmt, user_batch)
                    await db.commit()
                    logger.info(f"Loaded {len(user_batch)} rows into analytics.user_master")

            # 5. User Company Role Map
            def transform_role_map(row):
                val = str(row.get("is_active", "")).lower()
                row["is_active"] = val in ("true", "t", "1", "yes")
                if row.get("role_id"):
                    row["role_id"] = int(row["role_id"])
                return row

            await load_csv("user_company_role_map.csv", "analytics.user_company_role_map",
                           ["user_id", "company_id", "role_id", "is_active"],
                           transform_role_map)

            # 6. User Company Map (Derived from role map)
            logger.info("Generating user_company_map from roles...")
            await db.execute(text("""
                INSERT INTO analytics.user_company_map (user_id, company_id, is_active, assigned_date)
                SELECT DISTINCT user_id, company_id, is_active, CURRENT_DATE
                FROM analytics.user_company_role_map
                ON CONFLICT DO NOTHING
            """))
            await db.commit()
            logger.info("Generated user_company_map entries")

            # 7. Period Master
            def transform_period(row):
                for f in ["period_id", "month", "year"]:
                    if row.get(f):
                        row[f] = int(row[f])
                row["start_date"] = parse_date(row.get("start_date"))
                row["end_date"] = parse_date(row.get("end_date"))
                return row

            await load_csv("period_master.csv", "analytics.period_master",
                           ["period_id", "month", "year", "start_date", "end_date"], transform_period)

            # 8. Metric Master
            def transform_metric(row):
                if row.get("metric_id"):
                    row["metric_id"] = int(row["metric_id"])
                return row

            await load_csv("metric_master.csv", "analytics.metric_master",
                           ["metric_id", "metric_name", "metric_category"], transform_metric)

            # 9. Status Master
            def transform_status(row):
                if row.get("status_id"):
                    row["status_id"] = int(row["status_id"])
                return row

            await load_csv("status_master.csv", "analytics.status_master",
                           ["status_id", "status_name"], transform_status)

            # 10. Financial Fact
            def transform_fact(row):
                amt = row.get("amount")
                if amt:
                    amt = amt.replace(",", "").strip()
                    if amt in ("-", "--", ""):
                        amt = None
                    else:
                        try:
                            amt = float(amt)
                        except ValueError:
                            amt = None
                row["amount"] = amt

                # Handle implicit NULL metric_id -> 11 if specified in SQL logic
                if not row.get("metric_id"):
                    row["metric_id"] = 11
                else:
                    row["metric_id"] = int(row["metric_id"])

                if row.get("period_id"):
                    row["period_id"] = int(row["period_id"])
                return row

            await load_csv("financial_fact.csv", "analytics.financial_fact",
                           ["company_id", "period_id", "metric_id", "actual_budget", "amount"],
                           transform_fact)

            # 11. Financial Workflow
            # Must handle duplicate primary keys (company_id, period_id) by picking the latest
            logger.info("Loading financial_workflow...")
            path = os.path.join(SEED_DIR, "financial_workflow.csv")
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8-sig") as f:
                    reader = csv.DictReader(f)
                    rows = list(reader)

                # De-duplicate by key
                unique_rows = {}
                for row in rows:
                    key = (row.get("company_id"), row.get("period_id"))
                    if not key[0] or not key[1]:
                        continue

                    # Simple date parsing for sorting
                    submitted = row.get("submitted_date") or ""
                    existing = unique_rows.get(key)

                    if not existing:
                        unique_rows[key] = row
                    else:
                        # Keep the one with a later submitted_date, or existing if same
                        old_date = existing.get("submitted_date") or ""
                        if submitted > old_date:
                            unique_rows[key] = row

                batch = []
                for row in unique_rows.values():
                    # Cleanup empty strings
                    clean = {k: (v.strip() if v and v.strip() else None) for k, v in row.items()}

                    # Parse dates to valid ISO or None
                    for date_col in ["submitted_date", "approved_date", "rejected_date"]:
                        val = clean.get(date_col)
                        if val:
                            try:
                                # Try YYYY-MM-DD
                                if len(val) == 10:
                                    clean[date_col] = datetime.strptime(val, "%Y-%m-%d")
                                else:
                                    # Try generic fallback or keep string (postgres might reject)
                                    clean[date_col] = datetime.fromisoformat(val.replace("Z", "+00:00"))
                            except ValueError:
                                # If parsing fails, set to None to avoid crash
                                clean[date_col] = None

                    batch.append({
                        "company_id": clean.get("company_id"),
                        "period_id": int(clean.get("period_id") or 0),
                        "status_id": int(clean.get("status_id") or 1),
                        "submitted_by": clean.get("submitted_by"),
                        "submitted_date": clean.get("submitted_date"),
                        "actual_comment": clean.get("actual_comment"),
                        "budget_comment": clean.get("budget_comment"),
                        "approved_by": clean.get("approved_by"),
                        "approved_date": clean.get("approved_date"),
                        "rejected_by": clean.get("rejected_by"),
                        "rejected_date": clean.get("rejected_date"),
                        "reject_reason": clean.get("reject_reason")
                    })

                if batch:
                    stmt = text("""
                        INSERT INTO analytics.financial_workflow (
                            company_id, period_id, status_id, submitted_by, submitted_date,
                            actual_comment, budget_comment, approved_by, approved_date,
                            rejected_by, rejected_date, reject_reason
                        ) VALUES (
                            :company_id, :period_id, :status_id, :submitted_by, :submitted_date,
                            :actual_comment, :budget_comment, :approved_by, :approved_date,
                            :rejected_by, :rejected_date, :reject_reason
                        )
                    """)
                    await db.execute(stmt, batch)
                    await db.commit()
                    logger.info(f"Loaded {len(batch)} unique workflow entries")
            else:
                logger.error("financial_workflow.csv not found")

    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
    finally:
        await engine.dispose()
        logger.info("Seed complete!")

if __name__ == "__main__":
    asyncio.run(seed_from_csv())
