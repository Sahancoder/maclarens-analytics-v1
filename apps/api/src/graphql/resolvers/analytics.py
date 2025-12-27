"""
Analytics Resolvers - Financial Data & CEO Dashboard
"""
import strawberry
from typing import List, Optional
from datetime import datetime
from strawberry.types import Info
from src.graphql.types import (
    ClusterPerformance, CompanyPerformance, GroupKPIs, TopPerformer,
    RiskCluster, AlertItem, CEODashboardData, FinancialMetrics,
    ForecastData, ClusterForecast, ScenarioResult, ScenarioInput,
    FinancialDataInput, PnLDataInput
)
from src.services.financial_service import FinancialService


@strawberry.type
class AnalyticsQuery:
    
    @strawberry.field
    async def cluster_performance(
        self,
        info: Info,
        year: int,
        month: int
    ) -> List[ClusterPerformance]:
        """Get all clusters performance with monthly and YTD metrics"""
        db = info.context["db"]
        
        data = await FinancialService.get_cluster_performance(db, year, month)
        
        return [
            ClusterPerformance(
                cluster_id=d["cluster_id"],
                cluster_name=d["cluster_name"],
                cluster_code=d["cluster_code"],
                monthly=FinancialMetrics(**d["monthly"]),
                ytd=FinancialMetrics(**d["ytd"]),
                remarks=None
            )
            for d in data
        ]
    
    @strawberry.field
    async def company_performance(
        self,
        info: Info,
        cluster_id: str,
        year: int,
        month: int
    ) -> List[CompanyPerformance]:
        """Get company performance within a cluster"""
        db = info.context["db"]
        
        data = await FinancialService.get_company_performance(db, cluster_id, year, month)
        
        return [
            CompanyPerformance(
                company_id=d["company_id"],
                company_name=d["company_name"],
                company_code=d["company_code"],
                cluster_name=d["cluster_name"],
                monthly=FinancialMetrics(**d["monthly"]),
                ytd=FinancialMetrics(**d["ytd"])
            )
            for d in data
        ]
    
    @strawberry.field
    async def group_kpis(self, info: Info, year: int, month: int) -> GroupKPIs:
        """Get group-level KPIs for executive dashboard"""
        db = info.context["db"]
        
        data = await FinancialService.get_group_kpis(db, year, month)
        
        return GroupKPIs(
            total_actual=data["total_actual"],
            total_budget=data["total_budget"],
            total_variance=data["total_variance"],
            variance_percent=data["variance_percent"],
            group_health_index=data["group_health_index"],
            pbt_vs_prior_year=data["pbt_vs_prior_year"],
            ebitda_margin=data["ebitda_margin"],
            cash_position=data["cash_position"]
        )
    
    @strawberry.field
    async def top_performers(
        self,
        info: Info,
        year: int,
        month: int,
        limit: int = 5
    ) -> List[TopPerformer]:
        """Get top performing clusters"""
        db = info.context["db"]
        
        data = await FinancialService.get_top_performers(db, year, month, limit, bottom=False)
        
        return [
            TopPerformer(
                rank=d["rank"],
                name=d["name"],
                achievement_percent=d["achievement_percent"],
                variance=d["variance"]
            )
            for d in data
        ]
    
    @strawberry.field
    async def bottom_performers(
        self,
        info: Info,
        year: int,
        month: int,
        limit: int = 5
    ) -> List[TopPerformer]:
        """Get bottom performing clusters"""
        db = info.context["db"]
        
        data = await FinancialService.get_top_performers(db, year, month, limit, bottom=True)
        
        return [
            TopPerformer(
                rank=d["rank"],
                name=d["name"],
                achievement_percent=d["achievement_percent"],
                variance=d["variance"]
            )
            for d in data
        ]
    
    @strawberry.field
    async def risk_clusters(self, info: Info, year: int, month: int) -> List[RiskCluster]:
        """Get clusters with risk indicators"""
        db = info.context["db"]
        
        # Get bottom performers as risk clusters
        data = await FinancialService.get_top_performers(db, year, month, 5, bottom=True)
        
        risk_clusters = []
        for d in data:
            variance_pct = d["achievement_percent"] - 100
            
            # Determine severity
            if variance_pct < -20:
                severity = "high"
            elif variance_pct < -10:
                severity = "medium"
            else:
                severity = "low"
            
            # Classify variance type (simplified)
            if abs(variance_pct) > 30:
                classification = "structural"
            elif abs(variance_pct) > 15:
                classification = "seasonal"
            else:
                classification = "one-off"
            
            risk_clusters.append(RiskCluster(
                cluster_name=d["name"],
                severity=severity,
                variance_percent=variance_pct,
                classification=classification
            ))
        
        return risk_clusters
    
    @strawberry.field
    async def recent_alerts(self, info: Info, limit: int = 5) -> List[AlertItem]:
        """Get recent system alerts"""
        # In production, this would come from a notifications/alerts table
        return [
            AlertItem(
                id="1",
                title="Liner cluster below target",
                severity="high",
                timestamp=datetime.utcnow()
            ),
            AlertItem(
                id="2",
                title="Q4 budget review pending",
                severity="medium",
                timestamp=datetime.utcnow()
            ),
            AlertItem(
                id="3",
                title="New company added to Insurance",
                severity="low",
                timestamp=datetime.utcnow()
            )
        ]
    
    @strawberry.field
    async def ceo_dashboard(self, info: Info, year: int, month: int) -> CEODashboardData:
        """Get complete CEO dashboard data in one query"""
        db = info.context["db"]
        
        # Fetch all data
        kpis = await FinancialService.get_group_kpis(db, year, month)
        top = await FinancialService.get_top_performers(db, year, month, 3, bottom=False)
        bottom = await FinancialService.get_top_performers(db, year, month, 3, bottom=True)
        clusters = await FinancialService.get_cluster_performance(db, year, month)
        
        # Build risk clusters from bottom performers
        risk_clusters = []
        for d in bottom:
            variance_pct = d["achievement_percent"] - 100
            severity = "high" if variance_pct < -20 else "medium" if variance_pct < -10 else "low"
            risk_clusters.append(RiskCluster(
                cluster_name=d["name"],
                severity=severity,
                variance_percent=variance_pct,
                classification="structural" if abs(variance_pct) > 30 else "seasonal"
            ))
        
        return CEODashboardData(
            group_kpis=GroupKPIs(**kpis),
            top_performers=[TopPerformer(**d) for d in top],
            bottom_performers=[TopPerformer(**d) for d in bottom],
            risk_clusters=risk_clusters,
            recent_alerts=[
                AlertItem(id="1", title="Q4 review pending", severity="medium", timestamp=datetime.utcnow())
            ],
            cluster_performance=[
                ClusterPerformance(
                    cluster_id=c["cluster_id"],
                    cluster_name=c["cluster_name"],
                    cluster_code=c["cluster_code"],
                    monthly=FinancialMetrics(**c["monthly"]),
                    ytd=FinancialMetrics(**c["ytd"])
                )
                for c in clusters
            ]
        )
    
    @strawberry.field
    async def forecast_data(
        self,
        info: Info,
        year: int
    ) -> List[ForecastData]:
        """Get monthly forecast data for charts"""
        # In production, this would come from forecast tables
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        
        return [
            ForecastData(
                month=m,
                actual=1000 + (i * 100) if i < 10 else None,
                budget=1200 + (i * 80),
                forecast=1100 + (i * 90)
            )
            for i, m in enumerate(months)
        ]
    
    @strawberry.field
    async def cluster_forecasts(
        self,
        info: Info,
        year: int
    ) -> List[ClusterForecast]:
        """Get cluster-level forecasts"""
        db = info.context["db"]
        
        # Get current performance and project
        clusters = await FinancialService.get_cluster_performance(db, year, 10)
        
        return [
            ClusterForecast(
                cluster_name=c["cluster_name"],
                current_ytd=c["ytd"]["actual"],
                projected_year_end=c["ytd"]["actual"] * 1.2,  # Simple projection
                budget=c["ytd"]["budget"] * 1.2,
                variance_percent=c["ytd"]["variance_percent"]
            )
            for c in clusters
        ]
    
    @strawberry.field
    async def run_scenario(
        self,
        info: Info,
        year: int,
        month: int,
        input: ScenarioInput
    ) -> ScenarioResult:
        """Run what-if scenario analysis"""
        db = info.context["db"]
        
        kpis = await FinancialService.get_group_kpis(db, year, month)
        
        # Apply scenario adjustments
        revenue_impact = 1 + (input.revenue_change_percent / 100)
        cost_impact = 1 + (input.cost_change_percent / 100)
        fx_impact = 1 + (input.fx_impact_percent / 100)
        
        base_pbt = kpis["total_actual"]
        base_revenue = kpis["total_actual"] * 2  # Simplified
        
        projected_revenue = base_revenue * revenue_impact * fx_impact
        projected_cost = (base_revenue - base_pbt) * cost_impact
        projected_pbt = projected_revenue - projected_cost
        
        impact_percent = ((projected_pbt - base_pbt) / base_pbt * 100) if base_pbt != 0 else 0
        
        return ScenarioResult(
            scenario_name="Custom Scenario",
            projected_pbt=projected_pbt,
            projected_revenue=projected_revenue,
            impact_percent=round(impact_percent, 2)
        )



@strawberry.type
class AnalyticsMutation:
    
    @strawberry.mutation
    async def save_financial_data(
        self,
        info: Info,
        input: FinancialDataInput
    ) -> bool:
        """Save financial data entry (legacy - for backward compatibility)"""
        db = info.context["db"]
        
        await FinancialService.save_financial_data(
            db,
            company_id=input.company_id,
            year=input.year,
            month=input.month,
            revenue_lkr_actual=input.revenue_actual,
            revenue_lkr_budget=input.revenue_budget,
            gp_actual=input.pbt_actual + input.cost_actual,  # Estimate GP
            gp_budget=input.pbt_budget + input.cost_budget,
        )
        
        return True
    
    @strawberry.mutation
    async def save_pnl_data(
        self,
        info: Info,
        input: PnLDataInput
    ) -> bool:
        """Save full P&L data matching Excel template"""
        db = info.context["db"]
        
        await FinancialService.save_financial_data(
            db,
            company_id=input.company_id,
            year=input.year,
            month=input.month,
            exchange_rate=input.exchange_rate,
            revenue_lkr_actual=input.revenue_lkr_actual,
            revenue_lkr_budget=input.revenue_lkr_budget,
            gp_actual=input.gp_actual,
            gp_budget=input.gp_budget,
            other_income_actual=input.other_income_actual,
            other_income_budget=input.other_income_budget,
            personal_exp_actual=input.personal_exp_actual,
            personal_exp_budget=input.personal_exp_budget,
            admin_exp_actual=input.admin_exp_actual,
            admin_exp_budget=input.admin_exp_budget,
            selling_exp_actual=input.selling_exp_actual,
            selling_exp_budget=input.selling_exp_budget,
            finance_exp_actual=input.finance_exp_actual,
            finance_exp_budget=input.finance_exp_budget,
            depreciation_actual=input.depreciation_actual,
            depreciation_budget=input.depreciation_budget,
            provisions_actual=input.provisions_actual,
            provisions_budget=input.provisions_budget,
            exchange_gl_actual=input.exchange_gl_actual,
            exchange_gl_budget=input.exchange_gl_budget,
            non_ops_exp_actual=input.non_ops_exp_actual,
            non_ops_exp_budget=input.non_ops_exp_budget,
            non_ops_income_actual=input.non_ops_income_actual,
            non_ops_income_budget=input.non_ops_income_budget,
        )
        
        return True

