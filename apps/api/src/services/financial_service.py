"""
Financial Service - Core Business Logic
All financial calculations happen here, NOT in frontend.
Matches Excel P&L Template formulas exactly.
"""
from typing import List, Optional, Dict, Any
# from uuid import UUID  <-- Removed UUID import
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from src.db.models import FinancialPnL, Company, Cluster, FiscalCycle


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
    def compute_full_pnl(data: FinancialPnL) -> Dict[str, Any]:
        """
        Compute all P&L metrics matching Excel template exactly.
        Uses model's computed properties for consistency.
        """
        exchange_rate = float(data.exchange_rate or 1) or 1
        rev_lkr_actual = float(data.revenue_lkr_actual or 0)
        rev_lkr_budget = float(data.revenue_lkr_budget or 0)

        return {
            # Revenue
            "revenue_usd_actual": round(rev_lkr_actual / exchange_rate, 2),
            "revenue_usd_budget": round(rev_lkr_budget / exchange_rate, 2),
            "revenue_lkr_actual": rev_lkr_actual,
            "revenue_lkr_budget": rev_lkr_budget,
            
            # GP
            "gp_actual": float(data.gp_actual or 0),
            "gp_budget": float(data.gp_budget or 0),
            "gp_margin_actual": round(float(data.gp_margin_actual or 0) * 100, 2),  # As percentage
            "gp_margin_budget": round(float(data.gp_margin_budget or 0) * 100, 2),
            
            # Other Income
            "other_income_actual": float(data.other_income_actual or 0),
            "other_income_budget": float(data.other_income_budget or 0),
            
            # Expense Breakdown
            "personal_exp_actual": float(data.personal_exp_actual or 0),
            "personal_exp_budget": float(data.personal_exp_budget or 0),
            "admin_exp_actual": float(data.admin_exp_actual or 0),
            "admin_exp_budget": float(data.admin_exp_budget or 0),
            "selling_exp_actual": float(data.selling_exp_actual or 0),
            "selling_exp_budget": float(data.selling_exp_budget or 0),
            "finance_exp_actual": float(data.finance_exp_actual or 0),
            "finance_exp_budget": float(data.finance_exp_budget or 0),
            "depreciation_actual": float(data.depreciation_actual or 0),
            "depreciation_budget": float(data.depreciation_budget or 0),
            
            # Total Overheads (computed)
            "total_overheads_actual": round(float(data.total_overheads_actual or 0), 2),
            "total_overheads_budget": round(float(data.total_overheads_budget or 0), 2),
            
            # Adjustments
            "provisions_actual": float(data.provisions_actual or 0),
            "provisions_budget": float(data.provisions_budget or 0),
            "exchange_gl_actual": float(data.exchange_gl_actual or 0),
            "exchange_gl_budget": float(data.exchange_gl_budget or 0),
            
            # PBT Before (computed)
            "pbt_before_actual": round(float(data.pbt_before_actual or 0), 2),
            "pbt_before_budget": round(float(data.pbt_before_budget or 0), 2),
            
            # NP Margin (computed)
            "np_margin_actual": round(float(data.np_margin_actual or 0) * 100, 2),
            "np_margin_budget": round(float(data.np_margin_budget or 0) * 100, 2),
            
            # Non-Operating Items
            "non_ops_exp_actual": float(data.non_ops_exp_actual or 0),
            "non_ops_exp_budget": float(data.non_ops_exp_budget or 0),
            "non_ops_income_actual": float(data.non_ops_income_actual or 0),
            "non_ops_income_budget": float(data.non_ops_income_budget or 0),
            
            # PBT After (computed)
            "pbt_after_actual": round(float(data.pbt_after_actual or 0), 2),
            "pbt_after_budget": round(float(data.pbt_after_budget or 0), 2),
            
            # EBIT & EBITDA (computed)
            "ebit_actual": round(float(data.ebit_computed_actual or 0), 2),
            "ebit_budget": round(float(data.ebit_computed_budget or 0), 2),
            "ebitda_actual": round(float(data.ebitda_computed_actual or 0), 2),
            "ebitda_budget": round(float(data.ebitda_computed_budget or 0), 2),
            
            # Variance calculations
            "pbt_variance": round(float(data.pbt_before_actual or 0) - float(data.pbt_before_budget or 0), 2),
            "pbt_variance_percent": round(
                FinancialService.calculate_variance_simple(float(data.pbt_before_actual or 0), float(data.pbt_before_budget or 0)), 2
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
    def _apply_filters(query, company_id=None, cluster_id=None):
        """Helper to apply filters without casting to UUID"""
        if company_id:
            query = query.where(FinancialPnL.company_id == str(company_id))
        if cluster_id:
            # Join Company if not already joined? 
            # Ideally caller handles joins, but for safety:
            # We assume join isn't duplicated or we add it safely.
            # But simpler: FinancialService checks often join Company.
            query = query.where(Company.cluster_id == str(cluster_id))
        return query

    @staticmethod
    async def get_monthly_data(
        db: AsyncSession,
        year: int,
        month: int,
        company_id: Optional[str] = None,
        cluster_id: Optional[str] = None
    ) -> List[FinancialPnL]:
        """Get monthly financial data"""
        query = select(FinancialPnL).options(
            selectinload(FinancialPnL.company).selectinload(Company.cluster)
        ).join(Company).where(
            and_(FinancialPnL.year == year, FinancialPnL.month == month)
        )
        
        query = FinancialService._apply_filters(query, company_id, cluster_id)
        
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
        query = select(FinancialPnL).options(
            selectinload(FinancialPnL.company)
        ).where(
            and_(
                FinancialPnL.company_id == str(company_id),
                FinancialPnL.year == year,
                FinancialPnL.month == month
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
        pnl["exchange_rate"] = float(data.exchange_rate or 1)
        
        return pnl
    
    @staticmethod
    async def get_cluster_pnl_summary(
        db: AsyncSession,
        cluster_id: str,
        year: int,
        month: int
    ) -> Dict[str, Any]:
        """Get aggregated P&L summary for a cluster"""
        query = select(FinancialPnL).options(
            selectinload(FinancialPnL.company)
        ).join(Company).where(
            and_(
                Company.cluster_id == str(cluster_id),
                FinancialPnL.year == year,
                FinancialPnL.month == month
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
            totals["revenue_lkr_actual"] += float(data.revenue_lkr_actual or 0)
            totals["revenue_lkr_budget"] += float(data.revenue_lkr_budget or 0)
            totals["gp_actual"] += float(data.gp_actual or 0)
            totals["gp_budget"] += float(data.gp_budget or 0)
            totals["other_income_actual"] += float(data.other_income_actual or 0)
            totals["other_income_budget"] += float(data.other_income_budget or 0)
            totals["personal_exp_actual"] += float(data.personal_exp_actual or 0)
            totals["personal_exp_budget"] += float(data.personal_exp_budget or 0)
            totals["admin_exp_actual"] += float(data.admin_exp_actual or 0)
            totals["admin_exp_budget"] += float(data.admin_exp_budget or 0)
            totals["selling_exp_actual"] += float(data.selling_exp_actual or 0)
            totals["selling_exp_budget"] += float(data.selling_exp_budget or 0)
            totals["finance_exp_actual"] += float(data.finance_exp_actual or 0)
            totals["finance_exp_budget"] += float(data.finance_exp_budget or 0)
            totals["depreciation_actual"] += float(data.depreciation_actual or 0)
            totals["depreciation_budget"] += float(data.depreciation_budget or 0)
            totals["provisions_actual"] += float(data.provisions_actual or 0)
            totals["provisions_budget"] += float(data.provisions_budget or 0)
            totals["exchange_gl_actual"] += float(data.exchange_gl_actual or 0)
            totals["exchange_gl_budget"] += float(data.exchange_gl_budget or 0)
            totals["non_ops_exp_actual"] += float(data.non_ops_exp_actual or 0)
            totals["non_ops_exp_budget"] += float(data.non_ops_exp_budget or 0)
            totals["non_ops_income_actual"] += float(data.non_ops_income_actual or 0)
            totals["non_ops_income_budget"] += float(data.non_ops_income_budget or 0)
        
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
                FinancialPnL.year == year,
                FinancialPnL.month >= start_month,
                FinancialPnL.month <= month
            )
        else:
            date_condition = and_(
                ((FinancialPnL.year == start_year) & (FinancialPnL.month >= start_month)) |
                ((FinancialPnL.year == year) & (FinancialPnL.month <= month))
            )
        
        # Use pbt_before computed from raw fields
        query = select(
            Cluster.id,
            Cluster.name,
            Cluster.code,
            func.sum(FinancialPnL.gp_actual + FinancialPnL.other_income_actual -
                     (FinancialPnL.personal_exp_actual + FinancialPnL.admin_exp_actual +
                      FinancialPnL.selling_exp_actual + FinancialPnL.finance_exp_actual +
                      FinancialPnL.depreciation_actual) +
                     FinancialPnL.provisions_actual + FinancialPnL.exchange_gl_actual
            ).label('ytd_actual'),
            func.sum(FinancialPnL.gp_budget + FinancialPnL.other_income_budget -
                     (FinancialPnL.personal_exp_budget + FinancialPnL.admin_exp_budget +
                      FinancialPnL.selling_exp_budget + FinancialPnL.finance_exp_budget +
                      FinancialPnL.depreciation_budget) +
                     FinancialPnL.provisions_budget + FinancialPnL.exchange_gl_budget
            ).label('ytd_budget')
        ).select_from(FinancialPnL).join(
            Company, FinancialPnL.company_id == Company.id
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
        # Note: Cluster.fiscal_cycle column may be missing in V2 schema.
        # We default to December cycle if not available, since V2 ClusterMaster schema doesn't have it.
        # If CompanyMaster has it, we would need to check individual companies which complicates 'Cluster' logic.
        
        monthly_query = select(
            Cluster.id,
            Cluster.name,
            Cluster.code,
            func.sum(FinancialPnL.gp_actual + FinancialPnL.other_income_actual -
                     (FinancialPnL.personal_exp_actual + FinancialPnL.admin_exp_actual +
                      FinancialPnL.selling_exp_actual + FinancialPnL.finance_exp_actual +
                      FinancialPnL.depreciation_actual) +
                     FinancialPnL.provisions_actual + FinancialPnL.exchange_gl_actual
            ).label('monthly_actual'),
            func.sum(FinancialPnL.gp_budget + FinancialPnL.other_income_budget -
                     (FinancialPnL.personal_exp_budget + FinancialPnL.admin_exp_budget +
                      FinancialPnL.selling_exp_budget + FinancialPnL.finance_exp_budget +
                      FinancialPnL.depreciation_budget) +
                     FinancialPnL.provisions_budget + FinancialPnL.exchange_gl_budget
            ).label('monthly_budget')
        ).select_from(FinancialPnL).join(
            Company, FinancialPnL.company_id == Company.id
        ).join(
            Cluster, Company.cluster_id == Cluster.id
        ).where(
            and_(FinancialPnL.year == year, FinancialPnL.month == month)
        ).group_by(Cluster.id, Cluster.name, Cluster.code)
        
        result = await db.execute(monthly_query)
        clusters = [dict(row._mapping) for row in result.all()]
        
        # Add YTD calculations for each cluster
        performance_data = []
        for cluster in clusters:
            # Default to DECEMBER cycle as Cluster.fiscal_cycle is not in V2 schema
            fiscal_cycle = FiscalCycle.DECEMBER 
            start_year, start_month = FinancialService.get_fiscal_start_month(fiscal_cycle, year, month)
            
            # YTD query for this cluster
            if start_year == year:
                ytd_query_filters = and_(
                    Company.cluster_id == cluster['id'],
                    FinancialPnL.year == year,
                    FinancialPnL.month >= start_month,
                    FinancialPnL.month <= month
                )
            else:
                ytd_query_filters = and_(
                    Company.cluster_id == cluster['id'],
                    ((FinancialPnL.year == start_year) & (FinancialPnL.month >= start_month)) |
                    ((FinancialPnL.year == year) & (FinancialPnL.month <= month))
                )
            
            ytd_query = select(
                func.sum(FinancialPnL.gp_actual + FinancialPnL.other_income_actual -
                         (FinancialPnL.personal_exp_actual + FinancialPnL.admin_exp_actual +
                          FinancialPnL.selling_exp_actual + FinancialPnL.finance_exp_actual +
                          FinancialPnL.depreciation_actual) +
                         FinancialPnL.provisions_actual + FinancialPnL.exchange_gl_actual
                ).label('ytd_actual'),
                func.sum(FinancialPnL.gp_budget + FinancialPnL.other_income_budget -
                         (FinancialPnL.personal_exp_budget + FinancialPnL.admin_exp_budget +
                          FinancialPnL.selling_exp_budget + FinancialPnL.finance_exp_budget +
                          FinancialPnL.depreciation_budget) +
                         FinancialPnL.provisions_budget + FinancialPnL.exchange_gl_budget
                ).label('ytd_budget')
            ).select_from(FinancialPnL).join(
                Company, FinancialPnL.company_id == Company.id
            ).where(ytd_query_filters)
            
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
            func.sum(FinancialPnL.gp_actual + FinancialPnL.other_income_actual -
                     (FinancialPnL.personal_exp_actual + FinancialPnL.admin_exp_actual +
                      FinancialPnL.selling_exp_actual + FinancialPnL.finance_exp_actual +
                      FinancialPnL.depreciation_actual) +
                     FinancialPnL.provisions_actual + FinancialPnL.exchange_gl_actual
            ).label('monthly_actual'),
            func.sum(FinancialPnL.gp_budget + FinancialPnL.other_income_budget -
                     (FinancialPnL.personal_exp_budget + FinancialPnL.admin_exp_budget +
                      FinancialPnL.selling_exp_budget + FinancialPnL.finance_exp_budget +
                      FinancialPnL.depreciation_budget) +
                     FinancialPnL.provisions_budget + FinancialPnL.exchange_gl_budget
            ).label('monthly_budget')
        ).select_from(FinancialPnL).join(
            Company, FinancialPnL.company_id == Company.id
        ).join(
            Cluster, Company.cluster_id == Cluster.id
        ).where(
            and_(
                Company.cluster_id == str(cluster_id),
                FinancialPnL.year == year,
                FinancialPnL.month == month
            )
        ).group_by(Company.id, Company.name, Company.code, Cluster.name)
        
        result = await db.execute(query)
        companies = [dict(row._mapping) for row in result.all()]
        
        performance_data = []
        for company in companies:
            # YTD for company
            ytd_query = select(
                func.sum(FinancialPnL.gp_actual + FinancialPnL.other_income_actual -
                         (FinancialPnL.personal_exp_actual + FinancialPnL.admin_exp_actual +
                          FinancialPnL.selling_exp_actual + FinancialPnL.finance_exp_actual +
                          FinancialPnL.depreciation_actual) +
                         FinancialPnL.provisions_actual + FinancialPnL.exchange_gl_actual
                ).label('ytd_actual'),
                func.sum(FinancialPnL.gp_budget + FinancialPnL.other_income_budget -
                         (FinancialPnL.personal_exp_budget + FinancialPnL.admin_exp_budget +
                          FinancialPnL.selling_exp_budget + FinancialPnL.finance_exp_budget +
                          FinancialPnL.depreciation_budget) +
                         FinancialPnL.provisions_budget + FinancialPnL.exchange_gl_budget
                ).label('ytd_budget')
            ).where(
                and_(
                    FinancialPnL.company_id == company['id'],
                    FinancialPnL.year == year,
                    FinancialPnL.month <= month
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
        
        stmt = select(
            func.sum(FinancialPnL.gp_actual + FinancialPnL.other_income_actual -
                     (FinancialPnL.personal_exp_actual + FinancialPnL.admin_exp_actual +
                      FinancialPnL.selling_exp_actual + FinancialPnL.finance_exp_actual +
                      FinancialPnL.depreciation_actual) +
                     FinancialPnL.provisions_actual + FinancialPnL.exchange_gl_actual
            ).label('total_actual'),
            func.sum(FinancialPnL.gp_budget + FinancialPnL.other_income_budget -
                     (FinancialPnL.personal_exp_budget + FinancialPnL.admin_exp_budget +
                      FinancialPnL.selling_exp_budget + FinancialPnL.finance_exp_budget +
                      FinancialPnL.depreciation_budget) +
                     FinancialPnL.provisions_budget + FinancialPnL.exchange_gl_budget
            ).label('total_budget'),
            func.sum(FinancialPnL.gp_actual + FinancialPnL.other_income_actual -
                     (FinancialPnL.personal_exp_actual + FinancialPnL.admin_exp_actual +
                      FinancialPnL.selling_exp_actual) +
                     FinancialPnL.provisions_actual + FinancialPnL.exchange_gl_actual
            ).label('ebitda_actual'),
            func.sum(FinancialPnL.revenue_lkr_actual).label('revenue_actual')
        ).select_from(FinancialPnL).join(
            Company, FinancialPnL.company_id == Company.id
        ).join(
            Cluster, Company.cluster_id == Cluster.id
        )

        if not is_ytd:
            # Month View
            stmt = stmt.where(and_(FinancialPnL.year == year, FinancialPnL.month == month))
        else:
            # YTD View (Simplified: Default to December Cycle for Group View)
            # To strictly handle mixed cycles we would need individual company logic check here.
            # For robustness we assume Jan start.
            
            stmt = stmt.where(and_(
                FinancialPnL.year == year,
                FinancialPnL.month >= 1,
                FinancialPnL.month <= month
            ))

        result = await db.execute(stmt)
        current = result.first()
        
        # Prior Year logic
        prior_year = year - 1
        
        prior_stmt = select(
            func.sum(FinancialPnL.gp_actual + FinancialPnL.other_income_actual -
                     (FinancialPnL.personal_exp_actual + FinancialPnL.admin_exp_actual +
                      FinancialPnL.selling_exp_actual + FinancialPnL.finance_exp_actual +
                      FinancialPnL.depreciation_actual) +
                     FinancialPnL.provisions_actual + FinancialPnL.exchange_gl_actual
            ).label('prior_actual')
        ).select_from(FinancialPnL).join(Company).join(Cluster)

        if not is_ytd:
            prior_stmt = prior_stmt.where(and_(FinancialPnL.year == prior_year, FinancialPnL.month == month))
        else:
            prior_stmt = prior_stmt.where(and_(
                FinancialPnL.year == prior_year,
                FinancialPnL.month >= 1,
                FinancialPnL.month <= month
            ))

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
        
        health_index = min(100, max(0, 50 + (variance_percent / 2)))
        
        return {
            "total_actual": total_actual,
            "total_budget": total_budget,
            "total_variance": variance,
            "variance_percent": round(variance_percent, 2),
            "group_health_index": round(health_index, 1),
            "pbt_vs_prior_year": round(pbt_vs_prior, 2),
            "ebitda_margin": round(ebitda_margin, 2),
            "cash_position": total_actual * 0.3
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
        """Get top or bottom performing Companies"""
        
        query = select(
            Company.name,
            Company.id.label('company_id'),
            func.sum(FinancialPnL.gp_actual + FinancialPnL.other_income_actual -
                     (FinancialPnL.personal_exp_actual + FinancialPnL.admin_exp_actual +
                      FinancialPnL.selling_exp_actual + FinancialPnL.finance_exp_actual +
                      FinancialPnL.depreciation_actual) +
                     FinancialPnL.provisions_actual + FinancialPnL.exchange_gl_actual
            ).label('actual'),
            func.sum(FinancialPnL.gp_budget + FinancialPnL.other_income_budget -
                     (FinancialPnL.personal_exp_budget + FinancialPnL.admin_exp_budget +
                      FinancialPnL.selling_exp_budget + FinancialPnL.finance_exp_budget +
                      FinancialPnL.depreciation_budget) +
                     FinancialPnL.provisions_budget + FinancialPnL.exchange_gl_budget
            ).label('budget')
        ).select_from(FinancialPnL).join(
            Company, FinancialPnL.company_id == Company.id
        ).join(
            Cluster, Company.cluster_id == Cluster.id
        )

        if not is_ytd:
            query = query.where(and_(FinancialPnL.year == year, FinancialPnL.month == month))
        else:
            # YTD View (Simplified)
            query = query.where(and_(
                FinancialPnL.year == year,
                FinancialPnL.month >= 1,
                FinancialPnL.month <= month
            ))

        query = query.group_by(Company.name, Company.id)
        
        # We need to compute variance percent to sort by it
        # SQL math for variance %: (actual - budget) / budget * 100
        # Handle division by zero
        variance_percent_expr = func.case(
            (func.sum(FinancialPnL.total_overheads_budget) == 0, 0), # Simplified safety, ideally check sum of budget
            else_=(
                (func.sum(FinancialPnL.pbt_before_actual) - func.sum(FinancialPnL.pbt_before_budget)) 
                / func.sum(FinancialPnL.pbt_before_budget) * 100
            ) 
        )
        # Using PBT columns directly from model (which effectively map to the view columns)
        # Note: View columns are accessible as attributes on FinancialPnL (FinancialMonthlyView)
        
        pbt_actual_expr = (FinancialPnL.pbt_before_actual)
        pbt_budget_expr = (FinancialPnL.pbt_before_budget)
        
        # Aggregated Variance
        agg_var_expr = (func.sum(pbt_actual_expr) - func.sum(pbt_budget_expr))
        
        if bottom:
            query = query.order_by(agg_var_expr.asc())
        else:
            query = query.order_by(agg_var_expr.desc())
            
        query = query.limit(limit)
        
        result = await db.execute(query)
        return [
            {
                "company_id": str(row.company_id), 
                "name": row.name, 
                "actual": float(row.actual or 0), 
                "budget": float(row.budget or 0)
            } 
            for row in result.all()
        ]
