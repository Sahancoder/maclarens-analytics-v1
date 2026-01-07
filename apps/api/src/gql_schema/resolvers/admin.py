"""
Admin Resolvers
"""
import strawberry
from typing import List, Optional
from strawberry.types import Info
from src.gql_schema.types import (
    UserType, ClusterType, CompanyType, DashboardStats,
    AuditLogType, NotificationType, CreateUserInput, UpdateUserInput,
    CreateClusterInput, CreateCompanyInput, UserRoleEnum
)
from src.services.user_service import UserService
from src.services.cluster_service import ClusterService
from src.services.company_service import CompanyService
from src.services.report_service import ReportService
from src.db.models import UserRole
from src.gql_schema.resolvers.auth import db_role_to_enum


def enum_to_db_role(role: UserRoleEnum) -> UserRole:
    """Convert GraphQL enum to database role"""
    mapping = {
        UserRoleEnum.DATA_OFFICER: UserRole.DATA_OFFICER,
        UserRoleEnum.COMPANY_DIRECTOR: UserRole.COMPANY_DIRECTOR,
        UserRoleEnum.ADMIN: UserRole.ADMIN,
        UserRoleEnum.CEO: UserRole.CEO,
    }
    return mapping.get(role, UserRole.DATA_OFFICER)


@strawberry.type
class AdminQuery:
    
    @strawberry.field
    async def dashboard_stats(self, info: Info) -> DashboardStats:
        db = info.context["db"]
        
        total_users = await UserService.get_user_count(db)
        new_users = await UserService.get_new_users_this_month(db)
        active_companies = await CompanyService.get_company_count(db, active_only=True)
        inactive_companies = await CompanyService.get_inactive_company_count(db)
        total_clusters = await ClusterService.get_cluster_count(db)
        pending_reports = await ReportService.get_pending_reports_count(db)
        
        return DashboardStats(
            total_users=total_users,
            new_users_this_month=new_users,
            active_companies=active_companies,
            inactive_companies=inactive_companies,
            total_clusters=total_clusters,
            pending_reports=pending_reports
        )
    
    @strawberry.field
    async def users(self, info: Info) -> List[UserType]:
        db = info.context["db"]
        users = await UserService.get_all_users(db)
        
        return [
            UserType(
                id=str(u.id),
                email=u.email,
                name=u.name,
                role=db_role_to_enum(u.role),
                company_id=str(u.company_id) if u.company_id else None,
                cluster_id=str(u.cluster_id) if u.cluster_id else None,
                is_active=u.is_active,
                created_at=u.created_at
            )
            for u in users
        ]
    
    @strawberry.field
    async def user(self, info: Info, id: str) -> Optional[UserType]:
        db = info.context["db"]
        user = await UserService.get_user_by_id(db, id)
        
        if not user:
            return None
        
        return UserType(
            id=str(user.id),
            email=user.email,
            name=user.name,
            role=db_role_to_enum(user.role),
            company_id=str(user.company_id) if user.company_id else None,
            cluster_id=str(user.cluster_id) if user.cluster_id else None,
            is_active=user.is_active,
            created_at=user.created_at
        )
    
    @strawberry.field
    async def clusters(self, info: Info) -> List[ClusterType]:
        db = info.context["db"]
        clusters = await ClusterService.get_all_clusters(db)
        
        return [
            ClusterType(
                id=str(c.id),
                name=c.name,
                code=c.code,
                is_active=c.is_active,
                company_count=len(c.companies) if c.companies else 0
            )
            for c in clusters
        ]
    
    @strawberry.field
    async def cluster(self, info: Info, id: str) -> Optional[ClusterType]:
        db = info.context["db"]
        cluster = await ClusterService.get_cluster_by_id(db, id)
        
        if not cluster:
            return None
        
        return ClusterType(
            id=str(cluster.id),
            name=cluster.name,
            code=cluster.code,
            is_active=cluster.is_active,
            company_count=len(cluster.companies) if cluster.companies else 0
        )
    
    @strawberry.field
    async def companies(self, info: Info, cluster_id: Optional[str] = None) -> List[CompanyType]:
        db = info.context["db"]
        
        if cluster_id:
            companies = await CompanyService.get_companies_by_cluster(db, cluster_id)
        else:
            companies = await CompanyService.get_all_companies(db)
        
        return [
            CompanyType(
                id=str(c.id),
                name=c.name,
                code=c.code,
                cluster_id=str(c.cluster_id),
                cluster_name=c.cluster.name if c.cluster else "",
                is_active=c.is_active
            )
            for c in companies
        ]
    
    @strawberry.field
    async def company(self, info: Info, id: str) -> Optional[CompanyType]:
        db = info.context["db"]
        company = await CompanyService.get_company_by_id(db, id)
        
        if not company:
            return None
        
        return CompanyType(
            id=str(company.id),
            name=company.name,
            code=company.code,
            cluster_id=str(company.cluster_id),
            cluster_name=company.cluster.name if company.cluster else "",
            is_active=company.is_active
        )


@strawberry.type
class AdminMutation:
    
    @strawberry.mutation
    async def create_user(self, info: Info, input: CreateUserInput) -> UserType:
        db = info.context["db"]
        
        user = await UserService.create_user(
            db,
            email=input.email,
            password=input.password,
            name=input.name,
            role=enum_to_db_role(input.role),
            company_id=input.company_id,
            cluster_id=input.cluster_id
        )
        
        return UserType(
            id=str(user.id),
            email=user.email,
            name=user.name,
            role=db_role_to_enum(user.role),
            company_id=str(user.company_id) if user.company_id else None,
            cluster_id=str(user.cluster_id) if user.cluster_id else None,
            is_active=user.is_active,
            created_at=user.created_at
        )
    
    @strawberry.mutation
    async def update_user(self, info: Info, id: str, input: UpdateUserInput) -> Optional[UserType]:
        db = info.context["db"]
        
        user = await UserService.update_user(
            db,
            user_id=id,
            name=input.name,
            role=enum_to_db_role(input.role) if input.role else None,
            is_active=input.is_active
        )
        
        if not user:
            return None
        
        return UserType(
            id=str(user.id),
            email=user.email,
            name=user.name,
            role=db_role_to_enum(user.role),
            company_id=str(user.company_id) if user.company_id else None,
            cluster_id=str(user.cluster_id) if user.cluster_id else None,
            is_active=user.is_active,
            created_at=user.created_at
        )
    
    @strawberry.mutation
    async def delete_user(self, info: Info, id: str) -> bool:
        db = info.context["db"]
        return await UserService.delete_user(db, id)
    
    @strawberry.mutation
    async def create_cluster(self, info: Info, input: CreateClusterInput) -> ClusterType:
        db = info.context["db"]
        
        cluster = await ClusterService.create_cluster(db, input.name, input.code)
        
        return ClusterType(
            id=str(cluster.id),
            name=cluster.name,
            code=cluster.code,
            is_active=cluster.is_active,
            company_count=0
        )
    
    @strawberry.mutation
    async def delete_cluster(self, info: Info, id: str) -> bool:
        db = info.context["db"]
        return await ClusterService.delete_cluster(db, id)
    
    @strawberry.mutation
    async def create_company(self, info: Info, input: CreateCompanyInput) -> CompanyType:
        db = info.context["db"]
        
        company = await CompanyService.create_company(
            db,
            name=input.name,
            code=input.code,
            cluster_id=input.cluster_id
        )
        
        # Reload with cluster
        company = await CompanyService.get_company_by_id(db, str(company.id))
        
        return CompanyType(
            id=str(company.id),
            name=company.name,
            code=company.code,
            cluster_id=str(company.cluster_id),
            cluster_name=company.cluster.name if company.cluster else "",
            is_active=company.is_active
        )
    
    @strawberry.mutation
    async def delete_company(self, info: Info, id: str) -> bool:
        db = info.context["db"]
        return await CompanyService.delete_company(db, id)
