"""Quick check that FinancialMonthly has data and ORM works."""
import asyncio
from src.db.session import get_session
from src.db.models import FinancialMonthly
from sqlalchemy import select, func

async def check():
    async for session in get_session():
        result = await session.execute(select(func.count()).select_from(FinancialMonthly))
        count = result.scalar()
        print(f"FinancialMonthly count: {count}")

        result2 = await session.execute(
            select(FinancialMonthly).where(
                FinancialMonthly.year == 2025,
                FinancialMonthly.month == 10,
                FinancialMonthly.scenario == "ACTUAL"
            ).limit(3)
        )
        rows = result2.scalars().all()
        for r in rows:
            print(f"  company={r.company_id} revenue={r.revenue} gp={r.gp} pbt={r.pbt_before_non_ops}")
        break

asyncio.run(check())
