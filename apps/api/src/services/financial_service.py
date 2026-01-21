"""
Financial Service - Core Business Logic
All financial calculations happen here, NOT in frontend.
Matches Excel P&L Template formulas exactly.
"""
from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from src.db.models import FinancialData, Company, Cluster, FiscalCycle


class FinancialService:
    """
    Financial calculation service matching Excel P&L Template.
    All formulas verified against: Group Financial Summary - P&L-Template.xlsx
    """
    
    @staticmethod
    def calculate_variance_percent(actual: float, budget: float) -> float:
        """
        Calculate variance percentage using Excel formula:
        % = IF(Budget<0, -((Actual-Budget)/Budget), (Actual-Budget)/Budget) + 1
        Then multiply by 100 for percentage
        """
        if budget == 0:
            return 0
        if budget < 0:
            return ((-((actual - budget) / budget)) + 1) * 100
        else:
            return (((actual - budget) / budget) + 1) * 100
    
    @staticmethod
    def calculate_variance_simple(actual: float, budget: float) -> float:
        """Simple variance percentage: (actual - budget) / budget * 100"""
        if budget == 0:
            return 0
        return ((actual - budget) / budget) * 100
    
    @staticmethod
    def calculate_metrics(actual: float, budget: float) -> Dict[str, float]:
        """Calculate variance and achievement metrics"""
        variance = actual - budget
        variance_percent = FinancialService.calculate_variance_simple(actual, budget)
        achievement_percent = (actual / budget * 100) if budget != 0 else 0
        
        return {
            "actual": actual,
            "budget": budget,
            "variance": variance,
            "variance_percent": round(variance_percent, 2),
            "achievement_percent": round(achievement_percent, 2)
        }
    
    @staticmethod
    def compute_full_pnl(data: FinancialData) -> Dict[str, Any]:
        """
        Compute all P&L metrics matching Excel template exactly.
        Uses model's computed properties for consistency.
        """
        return {
            # Revenue
            "revenue_usd_actual": round(data.revenue_usd_actual, 2),
            "revenue_usd_budget": round(data.revenue_usd_budget, 2),
            "revenue_lkr_actual": data.revenue_lkr_actual,
            "revenue_lkr_budget": data.revenue_lkr_budget,
            
            # GP
            "gp_actual": data.gp_actual,
            "gp_budget": data.gp_budget,
            "gp_margin_actual": round(data.gp_margin_actual * 100, 2),  # As percentage
            "gp_margin_budget": round(data.gp_margin_budget * 100, 2),
            
            # Other Income
            "other_income_actual": data.other_income_actual,
            "other_income_budget": data.other_income_budget,
            
            # Expense Breakdown
            "personal_exp_actual": data.personal_exp_actual,
            "personal_exp_budget": data.personal_exp_budget,
            "admin_exp_actual": data.admin_exp_actual,
            "admin_exp_budget": data.admin_exp_budget,
            "selling_exp_actual": data.selling_exp_actual,
            "selling_exp_budget": data.selling_exp_budget,
            "finance_exp_actual": data.finance_exp_actual,
            "finance_exp_budget": data.finance_exp_budget,
            "depreciation_actual": data.depreciation_actual,
            "depreciation_budget": data.depreciation_budget,
            
            # Total Overheads (computed)
            "total_overheads_actual": round(data.total_overheads_actual, 2),
            "total_overheads_budget": round(data.total_overheads_budget, 2),
            
            # Adjustments
            "provisions_actual": data.provisions_actual,
            "provisions_budget": data.provisions_budget,
            "exchange_gl_actual": data.exchange_gl_actual,
            "exchange_gl_budget": data.exchange_gl_budget,
            
            # PBT Before (computed)
            "pbt_before_actual": round(data.pbt_before_actual, 2),
            "pbt_before_budget": round(data.pbt_before_budget, 2),
            
            # NP Margin (computed)
            "np_margin_actual": round(data.np_margin_actual * 100, 2),
            "np_margin_budget": round(data.np_margin_budget * 100, 2),
            
            # Non-Operating Items
            "non_ops_exp_actual": data.non_ops_exp_actual,
            "non_ops_exp_budget": data.non_ops_exp_budget,
            "non_ops_income_actual": data.non_ops_income_actual,
            "non_ops_income_budget": data.non_ops_income_budget,
            
            # PBT After (computed)
            "pbt_after_actual": round(data.pbt_after_actual, 2),
            "pbt_after_budget": round(data.pbt_after_budget, 2),
            
            # EBIT & EBITDA (computed)
            "ebit_actual": round(data.ebit_computed_actual, 2),
            "ebit_budget": round(data.ebit_computed_budget, 2),
            "ebitda_actual": round(data.ebitda_computed_actual, 2),
            "ebitda_budget": round(data.ebitda_computed_budget, 2),
            
            # Variance calculations
            "pbt_variance": round(data.pbt_before_actual - data.pbt_before_budget, 2),
            "pbt_variance_percent": round(
                FinancialService.calculate_variance_simple(data.pbt_before_actual, data.pbt_before_budget), 2
            ),
        }
    
    @staticmethod
    def get_fiscal_start_month(fiscal_cycle: FiscalCycle, year: int, month: int) -> tuple:
        """Get fiscal year start based on cycle"""
        if fiscal_cycle == FiscalCycle.DECEMBER:
            return (year, 1)  # Jan to current month
        else:  # MARCH cycle
            if month >= 4:
                return (year, 4)  # Apr to current month
            else:
                return (year - 1, 4)  # Previous Apr to current month
    
    @staticmethod
    async def get_monthly_data(
        db: AsyncSession,
        year: int,
        month: int,
        company_id: Optional[str] = None,
        cluster_id: Optional[str] = None
    ) -> List[FinancialData]:
        """Get monthly financial data"""
        query = select(FinancialData).options(
            selectinload(FinancialData.company).selectinload(Company.cluster)
        ).where(
            and_(FinancialData.year == year, FinancialData.month == month)
        )
        
        if company_id:
            query = query.where(FinancialData.company_id == UUID(company_id))
        
        if cluster_id:
            query = query.join(Company).where(Company.cluster_id == UUID(cluster_id))
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_company_pnl(
        db: AsyncSession,
        company_id: str,
        year: int,
        month: int
    ) -> Optional[Dict[str, Any]]:
        """Get full P&L for a single company with all computed fields"""
        query = select(FinancialData).options(
            selectinload(FinancialData.company)
        ).where(
            and_(
                FinancialData.company_id == UUID(company_id),
                FinancialData.year == year,
                FinancialData.month == month
            )
        )
        
        result = await db.execute(query)
        data = result.scalar_one_or_none()
        
        if not data:
            return None
        
        pnl = FinancialService.compute_full_pnl(data)
        pnl["company_id"] = str(data.company_id)
        pnl["company_name"] = data.company.name if data.company else ""
        pnl["company_code"] = data.company.code if data.company else ""
        pnl["year"] = data.year
        pnl["month"] = data.month
        pnl["exchange_rate"] = data.exchange_rate
        
        return pnl
    
    @staticmethod
    async def get_cluster_pnl_summary(
        db: AsyncSession,
        cluster_id: str,
        year: int,
        month: int
    ) -> Dict[str, Any]:
        """Get aggregated P&L summary for a cluster"""
        query = select(FinancialData).options(
            selectinload(FinancialData.company)
        ).join(Company).where(
            and_(
                Company.cluster_id == UUID(cluster_id),
                FinancialData.year == year,
                FinancialData.month == month
            )
        )
        
        result = await db.execute(query)
        data_list = result.scalars().all()
        
        if not data_list:
            return {}
        
        # Aggregate all companies in cluster
        totals = {
            "revenue_lkr_actual": 0, "revenue_lkr_budget": 0,
            "gp_actual": 0, "gp_budget": 0,
            "other_income_actual": 0, "other_income_budget": 0,
            "personal_exp_actual": 0, "personal_exp_budget": 0,
            "admin_exp_actual": 0, "admin_exp_budget": 0,
            "selling_exp_actual": 0, "selling_exp_budget": 0,
            "finance_exp_actual": 0, "finance_exp_budget": 0,
            "depreciation_actual": 0, "depreciation_budget": 0,
            "provisions_actual": 0, "provisions_budget": 0,
            "exchange_gl_actual": 0, "exchange_gl_budget": 0,
            "non_ops_exp_actual": 0, "non_ops_exp_budget": 0,
            "non_ops_income_actual": 0, "non_ops_income_budget": 0,
        }
        
        for data in data_list:
            totals["revenue_lkr_actual"] += data.revenue_lkr_actual or 0
            totals["revenue_lkr_budget"] += data.revenue_lkr_budget or 0
            totals["gp_actual"] += data.gp_actual or 0
            totals["gp_budget"] += data.gp_budget or 0
            totals["other_income_actual"] += data.other_income_actual or 0
            totals["other_income_budget"] += data.other_income_budget or 0
            totals["personal_exp_actual"] += data.personal_exp_actual or 0
            totals["personal_exp_budget"] += data.personal_exp_budget or 0
            totals["admin_exp_actual"] += data.admin_exp_actual or 0
            totals["admin_exp_budget"] += data.admin_exp_budget or 0
            totals["selling_exp_actual"] += data.selling_exp_actual or 0
            totals["selling_exp_budget"] += data.selling_exp_budget or 0
            totals["finance_exp_actual"] += data.finance_exp_actual or 0
            totals["finance_exp_budget"] += data.finance_exp_budget or 0
            totals["depreciation_actual"] += data.depreciation_actual or 0
            totals["depreciation_budget"] += data.depreciation_budget or 0
            totals["provisions_actual"] += data.provisions_actual or 0
            totals["provisions_budget"] += data.provisions_budget or 0
            totals["exchange_gl_actual"] += data.exchange_gl_actual or 0
            totals["exchange_gl_budget"] += data.exchange_gl_budget or 0
            totals["non_ops_exp_actual"] += data.non_ops_exp_actual or 0
            totals["non_ops_exp_budget"] += data.non_ops_exp_budget or 0
            totals["non_ops_income_actual"] += data.non_ops_income_actual or 0
            totals["non_ops_income_budget"] += data.non_ops_income_budget or 0
        
        # Compute derived fields
        total_overheads_actual = (
            totals["personal_exp_actual"] + totals["admin_exp_actual"] +
            totals["selling_exp_actual"] + totals["finance_exp_actual"] +
            totals["depreciation_actual"]
        )
        total_overheads_budget = (
            totals["personal_exp_budget"] + totals["admin_exp_budget"] +
            totals["selling_exp_budget"] + totals["finance_exp_budget"] +
            totals["depreciation_budget"]
        )
        
        pbt_before_actual = (
            totals["gp_actual"] + totals["other_income_actual"] -
            total_overheads_actual + totals["provisions_actual"] +
            totals["exchange_gl_actual"]
        )
        pbt_before_budget = (
            totals["gp_budget"] + totals["other_income_budget"] -
            total_overheads_budget + totals["provisions_budget"] +
            totals["exchange_gl_budget"]
        )
        
        pbt_after_actual = pbt_before_actual - totals["non_ops_exp_actual"] + totals["non_ops_income_actual"]
        pbt_after_budget = pbt_before_budget - totals["non_ops_exp_budget"] + totals["non_ops_income_budget"]
        
        ebit_actual = pbt_before_actual + totals["finance_exp_actual"]
        ebit_budget = pbt_before_budget + totals["finance_exp_budget"]
        
        ebitda_actual = pbt_before_actual + totals["finance_exp_actual"] + totals["depreciation_actual"]
        ebitda_budget = pbt_before_budget + totals["finance_exp_budget"] + totals["depreciation_budget"]
        
        gp_margin_actual = totals["gp_actual"] / totals["revenue_lkr_actual"] if totals["revenue_lkr_actual"] else 0
        np_margin_actual = pbt_before_actual / totals["revenue_lkr_actual"] if totals["revenue_lkr_actual"] else 0
        
        return {
            **totals,
            "total_overheads_actual": round(total_overheads_actual, 2),
            "total_overheads_budget": round(total_overheads_budget, 2),
            "pbt_before_actual": round(pbt_before_actual, 2),
            "pbt_before_budget": round(pbt_before_budget, 2),
            "pbt_after_actual": round(pbt_after_actual, 2),
            "pbt_after_budget": round(pbt_after_budget, 2),
            "ebit_actual": round(ebit_actual, 2),
            "ebit_budget": round(ebit_budget, 2),
            "ebitda_actual": round(ebitda_actual, 2),
            "ebitda_budget": round(ebitda_budget, 2),
            "gp_margin_actual": round(gp_margin_actual * 100, 2),
            "np_margin_actual": round(np_margin_actual * 100, 2),
            "pbt_variance": round(pbt_before_actual - pbt_before_budget, 2),
            "pbt_variance_percent": round(
                FinancialService.calculate_variance_simple(pbt_before_actual, pbt_before_budget), 2
            ),
            "company_count": len(data_list),
        }
    
    @staticmethod
    async def get_ytd_data(
        db: AsyncSession,
        year: int,
        month: int,
        fiscal_cycle: FiscalCycle = FiscalCycle.DECEMBER
    ) -> List[Dict[str, Any]]:
        """Get YTD aggregated data by cluster"""
        start_year, start_month = FinancialService.get_fiscal_start_month(fiscal_cycle, year, month)
        
        # Build date range condition
        if start_year == year:
            date_condition = and_(
                FinancialData.year == year,
                FinancialData.month >= start_month,
                FinancialData.month <= month
            )
        else:
            date_condition = and_(
                ((FinancialData.year == start_year) & (FinancialData.month >= start_month)) |
                ((FinancialData.year == year) & (FinancialData.month <= month))
            )
        
        # Use pbt_before computed from raw fields
        query = select(
            Cluster.id,
            Cluster.name,
            Cluster.code,
            func.sum(FinancialData.gp_actual + FinancialData.other_income_actual -
                     (FinancialData.personal_exp_actual + FinancialData.admin_exp_actual +
                      FinancialData.selling_exp_actual + FinancialData.finance_exp_actual +
                      FinancialData.depreciation_actual) +
                     FinancialData.provisions_actual + FinancialData.exchange_gl_actual
            ).label('ytd_actual'),
            func.sum(FinancialData.gp_budget + FinancialData.other_income_budget -
                     (FinancialData.personal_exp_budget + FinancialData.admin_exp_budget +
                      FinancialData.selling_exp_budget + FinancialData.finance_exp_budget +
                      FinancialData.depreciation_budget) +
                     FinancialData.provisions_budget + FinancialData.exchange_gl_budget
            ).label('ytd_budget')
        ).select_from(FinancialData).join(
            Company, FinancialData.company_id == Company.id
        ).join(
            Cluster, Company.cluster_id == Cluster.id
        ).where(date_condition).group_by(Cluster.id, Cluster.name, Cluster.code)
        
        result = await db.execute(query)
        return [dict(row._mapping) for row in result.all()]
    
    @staticmethod
    async def get_cluster_performance(
        db: AsyncSession,
        year: int,
        month: int
    ) -> List[Dict[str, Any]]:
        """Get cluster performance with monthly and YTD metrics"""
        # Monthly aggregation by cluster using computed PBT
        monthly_query = select(
            Cluster.id,
            Cluster.name,
            Cluster.code,
            Cluster.fiscal_cycle,
            func.sum(FinancialData.gp_actual + FinancialData.other_income_actual -
                     (FinancialData.personal_exp_actual + FinancialData.admin_exp_actual +
                      FinancialData.selling_exp_actual + FinancialData.finance_exp_actual +
                      FinancialData.depreciation_actual) +
                     FinancialData.provisions_actual + FinancialData.exchange_gl_actual
            ).label('monthly_actual'),
            func.sum(FinancialData.gp_budget + FinancialData.other_income_budget -
                     (FinancialData.personal_exp_budget + FinancialData.admin_exp_budget +
                      FinancialData.selling_exp_budget + FinancialData.finance_exp_budget +
                      FinancialData.depreciation_budget) +
                     FinancialData.provisions_budget + FinancialData.exchange_gl_budget
            ).label('monthly_budget')
        ).select_from(FinancialData).join(
            Company, FinancialData.company_id == Company.id
        ).join(
            Cluster, Company.cluster_id == Cluster.id
        ).where(
            and_(FinancialData.year == year, FinancialData.month == month)
        ).group_by(Cluster.id, Cluster.name, Cluster.code, Cluster.fiscal_cycle)
        
        result = await db.execute(monthly_query)
        clusters = [dict(row._mapping) for row in result.all()]
        
        # Add YTD calculations for each cluster
        performance_data = []
        for cluster in clusters:
            fiscal_cycle = cluster.get('fiscal_cycle', FiscalCycle.DECEMBER)
            start_year, start_month = FinancialService.get_fiscal_start_month(fiscal_cycle, year, month)
            
            # YTD query for this cluster
            if start_year == year:
                ytd_query = select(
                    func.sum(FinancialData.gp_actual + FinancialData.other_income_actual -
                             (FinancialData.personal_exp_actual + FinancialData.admin_exp_actual +
                              FinancialData.selling_exp_actual + FinancialData.finance_exp_actual +
                              FinancialData.depreciation_actual) +
                             FinancialData.provisions_actual + FinancialData.exchange_gl_actual
                    ).label('ytd_actual'),
                    func.sum(FinancialData.gp_budget + FinancialData.other_income_budget -
                             (FinancialData.personal_exp_budget + FinancialData.admin_exp_budget +
                              FinancialData.selling_exp_budget + FinancialData.finance_exp_budget +
                              FinancialData.depreciation_budget) +
                             FinancialData.provisions_budget + FinancialData.exchange_gl_budget
                    ).label('ytd_budget')
                ).select_from(FinancialData).join(
                    Company, FinancialData.company_id == Company.id
                ).where(
                    and_(
                        Company.cluster_id == cluster['id'],
                        FinancialData.year == year,
                        FinancialData.month >= start_month,
                        FinancialData.month <= month
                    )
                )
            else:
                ytd_query = select(
                    func.sum(FinancialData.gp_actual + FinancialData.other_income_actual -
                             (FinancialData.personal_exp_actual + FinancialData.admin_exp_actual +
                              FinancialData.selling_exp_actual + FinancialData.finance_exp_actual +
                              FinancialData.depreciation_actual) +
                             FinancialData.provisions_actual + FinancialData.exchange_gl_actual
                    ).label('ytd_actual'),
                    func.sum(FinancialData.gp_budget + FinancialData.other_income_budget -
                             (FinancialData.personal_exp_budget + FinancialData.admin_exp_budget +
                              FinancialData.selling_exp_budget + FinancialData.finance_exp_budget +
                              FinancialData.depreciation_budget) +
                             FinancialData.provisions_budget + FinancialData.exchange_gl_budget
                    ).label('ytd_budget')
                ).select_from(FinancialData).join(
                    Company, FinancialData.company_id == Company.id
                ).where(
                    and_(
                        Company.cluster_id == cluster['id'],
                        ((FinancialData.year == start_year) & (FinancialData.month >= start_month)) |
                        ((FinancialData.year == year) & (FinancialData.month <= month))
                    )
                )
            
            ytd_result = await db.execute(ytd_query)
            ytd_row = ytd_result.first()
            
            monthly_actual = float(cluster['monthly_actual'] or 0)
            monthly_budget = float(cluster['monthly_budget'] or 0)
            ytd_actual = float(ytd_row.ytd_actual or 0) if ytd_row else 0
            ytd_budget = float(ytd_row.ytd_budget or 0) if ytd_row else 0
            
            performance_data.append({
                "cluster_id": str(cluster['id']),
                "cluster_name": cluster['name'],
                "cluster_code": cluster['code'],
                "monthly": FinancialService.calculate_metrics(monthly_actual, monthly_budget),
                "ytd": FinancialService.calculate_metrics(ytd_actual, ytd_budget)
            })
        
        return performance_data
    
    @staticmethod
    async def get_company_performance(
        db: AsyncSession,
        cluster_id: str,
        year: int,
        month: int
    ) -> List[Dict[str, Any]]:
        """Get company performance within a cluster"""
        query = select(
            Company.id,
            Company.name,
            Company.code,
            Cluster.name.label('cluster_name'),
            func.sum(FinancialData.gp_actual + FinancialData.other_income_actual -
                     (FinancialData.personal_exp_actual + FinancialData.admin_exp_actual +
                      FinancialData.selling_exp_actual + FinancialData.finance_exp_actual +
                      FinancialData.depreciation_actual) +
                     FinancialData.provisions_actual + FinancialData.exchange_gl_actual
            ).label('monthly_actual'),
            func.sum(FinancialData.gp_budget + FinancialData.other_income_budget -
                     (FinancialData.personal_exp_budget + FinancialData.admin_exp_budget +
                      FinancialData.selling_exp_budget + FinancialData.finance_exp_budget +
                      FinancialData.depreciation_budget) +
                     FinancialData.provisions_budget + FinancialData.exchange_gl_budget
            ).label('monthly_budget')
        ).select_from(FinancialData).join(
            Company, FinancialData.company_id == Company.id
        ).join(
            Cluster, Company.cluster_id == Cluster.id
        ).where(
            and_(
                Company.cluster_id == UUID(cluster_id),
                FinancialData.year == year,
                FinancialData.month == month
            )
        ).group_by(Company.id, Company.name, Company.code, Cluster.name)
        
        result = await db.execute(query)
        companies = [dict(row._mapping) for row in result.all()]
        
        performance_data = []
        for company in companies:
            # YTD for company
            ytd_query = select(
                func.sum(FinancialData.gp_actual + FinancialData.other_income_actual -
                         (FinancialData.personal_exp_actual + FinancialData.admin_exp_actual +
                          FinancialData.selling_exp_actual + FinancialData.finance_exp_actual +
                          FinancialData.depreciation_actual) +
                         FinancialData.provisions_actual + FinancialData.exchange_gl_actual
                ).label('ytd_actual'),
                func.sum(FinancialData.gp_budget + FinancialData.other_income_budget -
                         (FinancialData.personal_exp_budget + FinancialData.admin_exp_budget +
                          FinancialData.selling_exp_budget + FinancialData.finance_exp_budget +
                          FinancialData.depreciation_budget) +
                         FinancialData.provisions_budget + FinancialData.exchange_gl_budget
                ).label('ytd_budget')
            ).where(
                and_(
                    FinancialData.company_id == company['id'],
                    FinancialData.year == year,
                    FinancialData.month <= month
                )
            )
            ytd_result = await db.execute(ytd_query)
            ytd_row = ytd_result.first()
            
            monthly_actual = float(company['monthly_actual'] or 0)
            monthly_budget = float(company['monthly_budget'] or 0)
            ytd_actual = float(ytd_row.ytd_actual or 0) if ytd_row else 0
            ytd_budget = float(ytd_row.ytd_budget or 0) if ytd_row else 0
            
            performance_data.append({
                "company_id": str(company['id']),
                "company_name": company['name'],
                "company_code": company['code'],
                "cluster_name": company['cluster_name'],
                "monthly": FinancialService.calculate_metrics(monthly_actual, monthly_budget),
                "ytd": FinancialService.calculate_metrics(ytd_actual, ytd_budget)
            })
        
        return performance_data
    
    @staticmethod
    async def get_group_kpis(
        db: AsyncSession, 
        year: int, 
        month: int,
        is_ytd: bool = False
    ) -> Dict[str, float]:
        """Get group-level KPIs for CEO dashboard"""
        
        # Helper to construct date filtering condition based on FY cycles
        def get_fy_condition(model, ref_year, ref_month):
            if not is_ytd:
                return and_(model.year == ref_year, model.month == ref_month)
            
            # For YTD, we need to handle mixed Fiscal Cycles
            # Since we are aggregating across the whole group, this is tricky.
            # Strategy: Sum up (Actuals) for the valid periods for EACH company based on its cluster's cycle.
            # However, doing this in a single aggregate query without grouping is hard.
            # Simplified approach for Group Level:
            # Assume 'active financial year' is based on the majority or passed in context.
            # BETTER APPROACH: Use a complex WHERE clause that checks the joined Cluster's cycle.
            
            # Case 1: Standard (Jan-Dec) -> Year = ref_year, 1 <= Month <= ref_month
            # Case 2: Apr-Mar -> 
            #    If ref_month >= 4: Year = ref_year, 4 <= Month <= ref_month
            #    If ref_month < 4: (Year=ref_year-1 & Month >= 4) OR (Year=ref_year & Month <= ref_month)
            
            # Since this is a Group KPI query, we might not have 'Cluster' joined in the standard `get_group_kpis` query?
            # We need to join Company -> Cluster.
            pass

        # Construct the complex query
        stmt = select(
            func.sum(FinancialData.gp_actual + FinancialData.other_income_actual -
                     (FinancialData.personal_exp_actual + FinancialData.admin_exp_actual +
                      FinancialData.selling_exp_actual + FinancialData.finance_exp_actual +
                      FinancialData.depreciation_actual) +
                     FinancialData.provisions_actual + FinancialData.exchange_gl_actual
            ).label('total_actual'),
            func.sum(FinancialData.gp_budget + FinancialData.other_income_budget -
                     (FinancialData.personal_exp_budget + FinancialData.admin_exp_budget +
                      FinancialData.selling_exp_budget + FinancialData.finance_exp_budget +
                      FinancialData.depreciation_budget) +
                     FinancialData.provisions_budget + FinancialData.exchange_gl_budget
            ).label('total_budget'),
            func.sum(FinancialData.gp_actual + FinancialData.other_income_actual -
                     (FinancialData.personal_exp_actual + FinancialData.admin_exp_actual +
                      FinancialData.selling_exp_actual) +
                     FinancialData.provisions_actual + FinancialData.exchange_gl_actual
            ).label('ebitda_actual'),
            func.sum(FinancialData.revenue_lkr_actual).label('revenue_actual')
        ).select_from(FinancialData).join(
            Company, FinancialData.company_id == Company.id
        ).join(
            Cluster, Company.cluster_id == Cluster.id
        )

        if not is_ytd:
            # Month View
            stmt = stmt.where(and_(FinancialData.year == year, FinancialData.month == month))
        else:
            # YTD View (Complex Logic)
            # Logic:
            # IF fiscal_cycle = 'december':
            #    year == target_year AND month <= target_month
            # ELSE (march):
            #    IF target_month >= 4:
            #       year == target_year AND month >= 4 AND month <= target_month
            #    ELSE (target_month < 4):
            #       (year == target_year-1 AND month >= 4) OR (year == target_year AND month <= target_month)
            
            pass # We will build the where clause below
            
            # SQL Alchemy OR/AND construction
            # We split the condition into two main blocks based on Cluster.fiscal_cycle
            
            cycle_dec = and_(
                Cluster.fiscal_cycle == FiscalCycle.DECEMBER,
                FinancialData.year == year,
                FinancialData.month >= 1,
                FinancialData.month <= month
            )
            
            if month >= 4:
                cycle_mar = and_(
                    Cluster.fiscal_cycle == FiscalCycle.MARCH,
                    FinancialData.year == year,
                    FinancialData.month >= 4,
                    FinancialData.month <= month
                )
            else:
                cycle_mar = and_(
                    Cluster.fiscal_cycle == FiscalCycle.MARCH,
                    func.or_(
                        and_(FinancialData.year == year - 1, FinancialData.month >= 4),
                        and_(FinancialData.year == year, FinancialData.month <= month)
                    )
                )
                
            stmt = stmt.where(func.or_(cycle_dec, cycle_mar))

        result = await db.execute(stmt)
        current = result.first()
        
        # Prior Year / Period Logic
        # For simplify, if YTD, we compare to Prior YTD (Same logic but year-1)
        prior_year = year - 1
        
        prior_stmt = select(
            func.sum(FinancialData.gp_actual + FinancialData.other_income_actual -
                     (FinancialData.personal_exp_actual + FinancialData.admin_exp_actual +
                      FinancialData.selling_exp_actual + FinancialData.finance_exp_actual +
                      FinancialData.depreciation_actual) +
                     FinancialData.provisions_actual + FinancialData.exchange_gl_actual
            ).label('prior_actual')
        ).select_from(FinancialData).join(Company).join(Cluster)

        if not is_ytd:
            prior_stmt = prior_stmt.where(and_(FinancialData.year == prior_year, FinancialData.month == month))
        else:
            # Prior YTD logic - shift everything back by 1 year
            # Note: We keep the same month boundaries, just change year
            
            cycle_dec_prior = and_(
                Cluster.fiscal_cycle == FiscalCycle.DECEMBER,
                FinancialData.year == prior_year,
                FinancialData.month >= 1,
                FinancialData.month <= month
            )
            
            if month >= 4:
                cycle_mar_prior = and_(
                    Cluster.fiscal_cycle == FiscalCycle.MARCH,
                    FinancialData.year == prior_year,
                    FinancialData.month >= 4,
                    FinancialData.month <= month
                )
            else:
                cycle_mar_prior = and_(
                    Cluster.fiscal_cycle == FiscalCycle.MARCH,
                    func.or_(
                        and_(FinancialData.year == prior_year - 1, FinancialData.month >= 4),
                        and_(FinancialData.year == prior_year, FinancialData.month <= month)
                    )
                )
            
            prior_stmt = prior_stmt.where(func.or_(cycle_dec_prior, cycle_mar_prior))

        prior_result = await db.execute(prior_stmt)
        prior = prior_result.first()
        
        total_actual = float(current.total_actual or 0)
        total_budget = float(current.total_budget or 0)
        ebitda = float(current.ebitda_actual or 0)
        revenue = float(current.revenue_actual or 0)
        prior_actual = float(prior.prior_actual or 0) if prior else 0
        
        variance = total_actual - total_budget
        variance_percent = FinancialService.calculate_variance_simple(total_actual, total_budget)
        pbt_vs_prior = FinancialService.calculate_variance_simple(total_actual, prior_actual)
        ebitda_margin = (ebitda / revenue * 100) if revenue != 0 else 0
        
        # Group health index (simplified calculation)
        health_index = min(100, max(0, 50 + (variance_percent / 2)))
        
        return {
            "total_actual": total_actual,
            "total_budget": total_budget,
            "total_variance": variance,
            "variance_percent": round(variance_percent, 2),
            "group_health_index": round(health_index, 1),
            "pbt_vs_prior_year": round(pbt_vs_prior, 2),
            "ebitda_margin": round(ebitda_margin, 2),
            "cash_position": total_actual * 0.3  # Simplified
        }
    
    @staticmethod
    async def get_top_performers(
        db: AsyncSession,
        year: int,
        month: int,
        limit: int = 5,
        bottom: bool = False,
        is_ytd: bool = False
    ) -> List[Dict[str, Any]]:
        """Get top or bottom performing Companies (not Clusters)"""
        
        query = select(
            Company.name,
            Company.id.label('company_id'),
            func.sum(FinancialData.gp_actual + FinancialData.other_income_actual -
                     (FinancialData.personal_exp_actual + FinancialData.admin_exp_actual +
                      FinancialData.selling_exp_actual + FinancialData.finance_exp_actual +
                      FinancialData.depreciation_actual) +
                     FinancialData.provisions_actual + FinancialData.exchange_gl_actual
            ).label('actual'),
            func.sum(FinancialData.gp_budget + FinancialData.other_income_budget -
                     (FinancialData.personal_exp_budget + FinancialData.admin_exp_budget +
                      FinancialData.selling_exp_budget + FinancialData.finance_exp_budget +
                      FinancialData.depreciation_budget) +
                     FinancialData.provisions_budget + FinancialData.exchange_gl_budget
            ).label('budget')
        ).select_from(FinancialData).join(
            Company, FinancialData.company_id == Company.id
        ).join(
            Cluster, Company.cluster_id == Cluster.id
        )

        if not is_ytd:
            query = query.where(and_(FinancialData.year == year, FinancialData.month == month))
        else:
            # YTD View - Similar logic to Group KPIs
            cycle_dec = and_(
                Cluster.fiscal_cycle == FiscalCycle.DECEMBER,
                FinancialData.year == year,
                FinancialData.month >= 1,
                FinancialData.month <= month
            )
            
            if month >= 4:
                cycle_mar = and_(
                    Cluster.fiscal_cycle == FiscalCycle.MARCH,
                    FinancialData.year == year,
                    FinancialData.month >= 4,
                    FinancialData.month <= month
                )
            else:
                cycle_mar = and_(
                    Cluster.fiscal_cycle == FiscalCycle.MARCH,
                    func.or_(
                        and_(FinancialData.year == year - 1, FinancialData.month >= 4),
                        and_(FinancialData.year == year, FinancialData.month <= month)
                    )
                )
                
            query = query.where(func.or_(cycle_dec, cycle_mar))

        query = query.group_by(Company.name, Company.id)
        
        result = await db.execute(query)
        companies = []
        
        for row in result.all():
            actual = float(row.actual or 0)
            budget = float(row.budget or 0)
            achievement = (actual / budget * 100) if budget != 0 else 0
            variance = actual - budget
            companies.append({
                "name": row.name,
                "id": str(row.company_id),
                "achievement_percent": round(achievement, 2),
                "variance": variance
            })
        
        # Sort by achievement
        companies.sort(key=lambda x: x['achievement_percent'], reverse=not bottom)
        
        return [
            {"rank": i + 1, **c}
            for i, c in enumerate(companies[:limit])
        ]
    
    @staticmethod
    async def save_financial_data(
        db: AsyncSession,
        company_id: str,
        year: int,
        month: int,
        # New detailed fields
        exchange_rate: float = 1.0,
        revenue_lkr_actual: float = 0,
        revenue_lkr_budget: float = 0,
        gp_actual: float = 0,
        gp_budget: float = 0,
        other_income_actual: float = 0,
        other_income_budget: float = 0,
        personal_exp_actual: float = 0,
        personal_exp_budget: float = 0,
        admin_exp_actual: float = 0,
        admin_exp_budget: float = 0,
        selling_exp_actual: float = 0,
        selling_exp_budget: float = 0,
        finance_exp_actual: float = 0,
        finance_exp_budget: float = 0,
        depreciation_actual: float = 0,
        depreciation_budget: float = 0,
        provisions_actual: float = 0,
        provisions_budget: float = 0,
        exchange_gl_actual: float = 0,
        exchange_gl_budget: float = 0,
        non_ops_exp_actual: float = 0,
        non_ops_exp_budget: float = 0,
        non_ops_income_actual: float = 0,
        non_ops_income_budget: float = 0,
    ) -> FinancialData:
        """Save or update financial data with all P&L line items"""
        # Check if exists
        existing = await db.execute(
            select(FinancialData).where(
                and_(
                    FinancialData.company_id == UUID(company_id),
                    FinancialData.year == year,
                    FinancialData.month == month
                )
            )
        )
        financial = existing.scalar_one_or_none()
        
        if financial:
            # Update existing
            financial.exchange_rate = exchange_rate
            financial.revenue_lkr_actual = revenue_lkr_actual
            financial.revenue_lkr_budget = revenue_lkr_budget
            financial.gp_actual = gp_actual
            financial.gp_budget = gp_budget
            financial.other_income_actual = other_income_actual
            financial.other_income_budget = other_income_budget
            financial.personal_exp_actual = personal_exp_actual
            financial.personal_exp_budget = personal_exp_budget
            financial.admin_exp_actual = admin_exp_actual
            financial.admin_exp_budget = admin_exp_budget
            financial.selling_exp_actual = selling_exp_actual
            financial.selling_exp_budget = selling_exp_budget
            financial.finance_exp_actual = finance_exp_actual
            financial.finance_exp_budget = finance_exp_budget
            financial.depreciation_actual = depreciation_actual
            financial.depreciation_budget = depreciation_budget
            financial.provisions_actual = provisions_actual
            financial.provisions_budget = provisions_budget
            financial.exchange_gl_actual = exchange_gl_actual
            financial.exchange_gl_budget = exchange_gl_budget
            financial.non_ops_exp_actual = non_ops_exp_actual
            financial.non_ops_exp_budget = non_ops_exp_budget
            financial.non_ops_income_actual = non_ops_income_actual
            financial.non_ops_income_budget = non_ops_income_budget
            # Update legacy fields for backward compatibility
            financial.revenue_actual = revenue_lkr_actual
            financial.revenue_budget = revenue_lkr_budget
        else:
            financial = FinancialData(
                company_id=UUID(company_id),
                year=year,
                month=month,
                exchange_rate=exchange_rate,
                revenue_lkr_actual=revenue_lkr_actual,
                revenue_lkr_budget=revenue_lkr_budget,
                gp_actual=gp_actual,
                gp_budget=gp_budget,
                other_income_actual=other_income_actual,
                other_income_budget=other_income_budget,
                personal_exp_actual=personal_exp_actual,
                personal_exp_budget=personal_exp_budget,
                admin_exp_actual=admin_exp_actual,
                admin_exp_budget=admin_exp_budget,
                selling_exp_actual=selling_exp_actual,
                selling_exp_budget=selling_exp_budget,
                finance_exp_actual=finance_exp_actual,
                finance_exp_budget=finance_exp_budget,
                depreciation_actual=depreciation_actual,
                depreciation_budget=depreciation_budget,
                provisions_actual=provisions_actual,
                provisions_budget=provisions_budget,
                exchange_gl_actual=exchange_gl_actual,
                exchange_gl_budget=exchange_gl_budget,
                non_ops_exp_actual=non_ops_exp_actual,
                non_ops_exp_budget=non_ops_exp_budget,
                non_ops_income_actual=non_ops_income_actual,
                non_ops_income_budget=non_ops_income_budget,
                # Legacy fields
                revenue_actual=revenue_lkr_actual,
                revenue_budget=revenue_lkr_budget,
            )
            db.add(financial)
        
        await db.commit()
        await db.refresh(financial)
        return financial
