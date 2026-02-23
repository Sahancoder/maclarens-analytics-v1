from datetime import datetime, timezone
from math import ceil
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import and_, case, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.constants import MetricID, StatusID
from src.db.models import (
    AuditLog,
    Cluster,
    Company,
    FinancialFact,
    PeriodMaster,
    Report,
    RoleMaster,
    StatusMaster,
    User,
    UserCompanyRoleMap,
)
from src.security.middleware import get_db, require_admin
from src.security.audit_context import get_client_ip
from src.services.budget_import_service import BudgetImportService

router = APIRouter(prefix="/admin", tags=["Admin"])


# ==================== MODELS ====================

class AdminDashboardStats(BaseModel):
    total_users: int
    active_companies: int
    total_clusters: int
    pending_reports: int
    new_users_this_month: int


class RoleResponse(BaseModel):
    role_id: int
    role_name: str


class ActivityItem(BaseModel):
    id: str
    timestamp: Optional[datetime]
    user_id: Optional[str]
    user_email: Optional[str]
    user_name: Optional[str]
    action: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str] = "-"


class ActivityListResponse(BaseModel):
    activities: List[ActivityItem]
    total: int


class ClusterCreate(BaseModel):
    cluster_name: str = Field(..., min_length=2, max_length=100)
    is_active: bool = True


class ClusterUpdate(BaseModel):
    cluster_name: Optional[str] = Field(None, min_length=2, max_length=100)
    is_active: Optional[bool] = None


class ClusterResponse(BaseModel):
    cluster_id: str
    cluster_name: str
    is_active: bool
    total_companies: int
    active_companies: int
    inactive_companies: int
    created_date: Optional[datetime]


class ClusterListResponse(BaseModel):
    clusters: List[ClusterResponse]
    total_clusters: int
    total_companies: int
    active_companies: int
    inactive_companies: int


class CompanyCreate(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255)
    cluster_id: str
    fin_year_start_month: Optional[int] = Field(None, ge=1, le=12)
    is_active: bool = True
    company_id: Optional[str] = None


class CompanyUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=2, max_length=255)
    cluster_id: Optional[str] = None
    fin_year_start_month: Optional[int] = Field(None, ge=1, le=12)
    is_active: Optional[bool] = None


class CompanyResponse(BaseModel):
    company_id: str
    company_name: str
    cluster_id: str
    cluster_name: Optional[str]
    fin_year_start_month: Optional[int]
    is_active: bool
    user_count: int
    created_date: Optional[datetime]
    modified_date: Optional[datetime]


class CompanyListResponse(BaseModel):
    companies: List[CompanyResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class UserRoleAssignment(BaseModel):
    company_id: str
    company_name: Optional[str]
    cluster_id: Optional[str]
    cluster_name: Optional[str]
    role_id: int
    role_name: Optional[str]
    is_active: bool


class UserResponse(BaseModel):
    user_id: str
    user_email: str
    first_name: Optional[str]
    last_name: Optional[str]
    is_active: bool
    created_date: Optional[datetime]
    modified_date: Optional[datetime]
    roles: List[UserRoleAssignment]


class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class UserCreate(BaseModel):
    user_email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role_id: Optional[int] = None
    company_id: Optional[str] = None
    is_active: bool = True


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserAssignmentResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    user_name: str
    company_id: str
    company_name: str
    role_id: int
    role_name: str
    is_active: bool


class AssignUserRequest(BaseModel):
    user_email: EmailStr
    role_id: int


class UserRoleAssignRequest(BaseModel):
    company_id: str
    role_id: int


class AssignmentCreateRequest(BaseModel):
    user_id: str
    company_id: str
    role_id: int
    is_active: bool = True


class AssignmentListResponse(BaseModel):
    assignments: List[UserAssignmentResponse]
    total: int


class BudgetImportResponse(BaseModel):
    success: bool
    total_rows: int
    imported_rows: int
    updated_rows: int
    skipped_rows: int
    error_count: int
    message: str
    errors: Optional[List[Dict[str, Any]]] = None


# ==================== HELPERS ====================

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _display_name(user: User) -> str:
    full_name = f"{(user.first_name or '').strip()} {(user.last_name or '').strip()}".strip()
    return full_name or user.user_email


async def _next_text_id(
    db: AsyncSession,
    column,
    prefix: str,
    width: int,
) -> str:
    rows = (await db.execute(select(column).where(column.like(f"{prefix}%")))).scalars().all()
    max_num = 0
    for value in rows:
        if not value:
            continue
        suffix = str(value)[len(prefix):]
        if suffix.isdigit():
            max_num = max(max_num, int(suffix))
    return f"{prefix}{max_num + 1:0{width}d}"


async def _audit(
    db: AsyncSession,
    actor_user_id: Optional[str],
    action: str,
    entity_type: Optional[str],
    entity_id: Optional[str],
    details: Optional[str],
    ip_address: Optional[str] = None,  # Can be passed explicitly or pulled from context
) -> None:
    try:
        # If ip_address not provided, try to get it from audit context
        if ip_address is None:
            ip_address = get_client_ip()
            
        db.add(
            AuditLog(
                user_id=actor_user_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details=details,
                ip_address=ip_address,
                created_at=_utcnow(),
            )
        )
    except Exception:
        pass


async def _build_user_roles(db: AsyncSession, user_ids: List[str]) -> Dict[str, List[UserRoleAssignment]]:
    if not user_ids:
        return {}

    rows = (
        await db.execute(
            select(
                UserCompanyRoleMap.user_id,
                UserCompanyRoleMap.company_id,
                UserCompanyRoleMap.role_id,
                UserCompanyRoleMap.is_active,
                Company.company_name,
                Company.cluster_id,
                Cluster.cluster_name,
                RoleMaster.role_name,
            )
            .join(Company, Company.company_id == UserCompanyRoleMap.company_id)
            .join(Cluster, Cluster.cluster_id == Company.cluster_id)
            .join(RoleMaster, RoleMaster.role_id == UserCompanyRoleMap.role_id)
            .where(UserCompanyRoleMap.user_id.in_(user_ids))
            .order_by(UserCompanyRoleMap.user_id, UserCompanyRoleMap.role_id)
        )
    ).all()

    by_user: Dict[str, List[UserRoleAssignment]] = {uid: [] for uid in user_ids}
    for row in rows:
        by_user.setdefault(row.user_id, []).append(
            UserRoleAssignment(
                company_id=row.company_id,
                company_name=row.company_name,
                cluster_id=row.cluster_id,
                cluster_name=row.cluster_name,
                role_id=int(row.role_id),
                role_name=row.role_name,
                is_active=bool(row.is_active),
            )
        )
    return by_user


async def _build_assignment_response(
    db: AsyncSession,
    user_id: str,
    company_id: str,
    role_id: int,
) -> UserAssignmentResponse:
    row = (
        await db.execute(
            select(User, Company, RoleMaster, UserCompanyRoleMap)
            .join(UserCompanyRoleMap, UserCompanyRoleMap.user_id == User.user_id)
            .join(Company, Company.company_id == UserCompanyRoleMap.company_id)
            .join(RoleMaster, RoleMaster.role_id == UserCompanyRoleMap.role_id)
            .where(
                UserCompanyRoleMap.user_id == user_id,
                UserCompanyRoleMap.company_id == company_id,
                UserCompanyRoleMap.role_id == role_id,
            )
        )
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")

    user, company, role, mapping = row
    return UserAssignmentResponse(
        id=f"{user.user_id}:{company.company_id}:{role.role_id}",
        user_id=user.user_id,
        user_email=user.user_email,
        user_name=_display_name(user),
        company_id=company.company_id,
        company_name=company.company_name,
        role_id=role.role_id,
        role_name=role.role_name,
        is_active=bool(mapping.is_active),
    )


# ==================== DASHBOARD ====================

@router.get("/dashboard", response_model=AdminDashboardStats)
async def get_admin_dashboard(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    now = _utcnow()
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    total_users = (await db.execute(select(func.count(User.user_id)))).scalar() or 0
    active_companies = (
        await db.execute(select(func.count(Company.company_id)).where(Company.is_active.is_(True)))
    ).scalar() or 0
    total_clusters = (
        await db.execute(select(func.count(Cluster.cluster_id)).where(Cluster.is_active.is_(True)))
    ).scalar() or 0
    pending_reports = (
        await db.execute(
            select(func.count(Report.company_id)).where(Report.status_id == int(StatusID.SUBMITTED))
        )
    ).scalar() or 0
    new_users_this_month = (
        await db.execute(select(func.count(User.user_id)).where(User.created_date >= month_start))
    ).scalar() or 0

    return AdminDashboardStats(
        total_users=total_users,
        active_companies=active_companies,
        total_clusters=total_clusters,
        pending_reports=pending_reports,
        new_users_this_month=new_users_this_month,
    )


@router.get("/activity", response_model=ActivityListResponse)
async def get_recent_activity(
    limit: int = Query(default=10, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    total = (await db.execute(select(func.count(AuditLog.id)))).scalar() or 0

    rows = (
        await db.execute(
            select(AuditLog, User)
            .outerjoin(User, User.user_id == AuditLog.user_id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
        )
    ).all()

    activities: List[ActivityItem] = []
    for log, user in rows:
        activities.append(
            ActivityItem(
                id=str(log.id),
                timestamp=log.created_at,
                user_id=log.user_id,
                user_email=user.user_email if user else None,
                user_name=_display_name(user) if user else None,
                action=log.action,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                details=log.details,
                ip_address=log.ip_address or "-",
            )
        )

    return ActivityListResponse(activities=activities, total=total)


@router.get("/roles", response_model=List[RoleResponse])
async def list_roles(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(select(RoleMaster).order_by(RoleMaster.role_id))).scalars().all()
    return [RoleResponse(role_id=row.role_id, role_name=row.role_name) for row in rows]


# ==================== CLUSTERS ====================

@router.get("/clusters", response_model=ClusterListResponse)
async def list_clusters(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(
                Cluster.cluster_id,
                Cluster.cluster_name,
                Cluster.is_active,
                Cluster.created_date,
                func.count(Company.company_id).label("total_companies"),
                func.coalesce(
                    func.sum(case((Company.is_active.is_(True), 1), else_=0)),
                    0,
                ).label("active_companies"),
                func.coalesce(
                    func.sum(case((Company.is_active.is_(False), 1), else_=0)),
                    0,
                ).label("inactive_companies"),
            )
            .outerjoin(Company, Company.cluster_id == Cluster.cluster_id)
            .group_by(Cluster.cluster_id, Cluster.cluster_name, Cluster.is_active, Cluster.created_date)
            .order_by(Cluster.cluster_name)
        )
    ).all()

    clusters: List[ClusterResponse] = []
    total_companies = 0
    active_companies = 0
    inactive_companies = 0

    for row in rows:
        total_companies += int(row.total_companies or 0)
        active_companies += int(row.active_companies or 0)
        inactive_companies += int(row.inactive_companies or 0)

        clusters.append(
            ClusterResponse(
                cluster_id=row.cluster_id,
                cluster_name=row.cluster_name,
                is_active=bool(row.is_active),
                total_companies=int(row.total_companies or 0),
                active_companies=int(row.active_companies or 0),
                inactive_companies=int(row.inactive_companies or 0),
                created_date=row.created_date,
            )
        )

    return ClusterListResponse(
        clusters=clusters,
        total_clusters=len(clusters),
        total_companies=total_companies,
        active_companies=active_companies,
        inactive_companies=inactive_companies,
    )


@router.post("/clusters", response_model=ClusterResponse, status_code=status.HTTP_201_CREATED)
async def create_cluster(
    request: ClusterCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = (
        await db.execute(
            select(Cluster).where(func.lower(Cluster.cluster_name) == request.cluster_name.strip().lower())
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Cluster name already exists")

    cluster_id = await _next_text_id(db, Cluster.cluster_id, "C", 2)
    cluster = Cluster(
        cluster_id=cluster_id,
        cluster_name=request.cluster_name.strip(),
        is_active=request.is_active,
        created_date=_utcnow(),
        modified_date=_utcnow(),
    )
    db.add(cluster)

    await _audit(
        db,
        current_user.user_id,
        "CLUSTER_CREATED",
        "cluster",
        cluster_id,
        f"Created cluster {request.cluster_name.strip()}",
    )

    await db.commit()

    return ClusterResponse(
        cluster_id=cluster.cluster_id,
        cluster_name=cluster.cluster_name,
        is_active=cluster.is_active,
        total_companies=0,
        active_companies=0,
        inactive_companies=0,
        created_date=cluster.created_date,
    )


@router.patch("/clusters/{cluster_id}", response_model=ClusterResponse)
async def update_cluster(
    cluster_id: str,
    request: ClusterUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    cluster = (await db.execute(select(Cluster).where(Cluster.cluster_id == cluster_id))).scalar_one_or_none()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    if request.cluster_name is not None:
        duplicate = (
            await db.execute(
                select(Cluster).where(
                    Cluster.cluster_id != cluster_id,
                    func.lower(Cluster.cluster_name) == request.cluster_name.strip().lower(),
                )
            )
        ).scalar_one_or_none()
        if duplicate:
            raise HTTPException(status_code=409, detail="Cluster name already exists")
        cluster.cluster_name = request.cluster_name.strip()

    if request.is_active is not None:
        cluster.is_active = request.is_active

    cluster.modified_date = _utcnow()

    await _audit(
        db,
        current_user.user_id,
        "CLUSTER_UPDATED",
        "cluster",
        cluster.cluster_id,
        f"Updated cluster {cluster.cluster_name}",
    )

    await db.commit()

    counts = (
        await db.execute(
            select(
                func.count(Company.company_id),
                func.coalesce(func.sum(case((Company.is_active.is_(True), 1), else_=0)), 0),
                func.coalesce(func.sum(case((Company.is_active.is_(False), 1), else_=0)), 0),
            ).where(Company.cluster_id == cluster.cluster_id)
        )
    ).one()

    return ClusterResponse(
        cluster_id=cluster.cluster_id,
        cluster_name=cluster.cluster_name,
        is_active=cluster.is_active,
        total_companies=int(counts[0] or 0),
        active_companies=int(counts[1] or 0),
        inactive_companies=int(counts[2] or 0),
        created_date=cluster.created_date,
    )


@router.delete("/clusters/{cluster_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cluster(
    cluster_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    cluster = (await db.execute(select(Cluster).where(Cluster.cluster_id == cluster_id))).scalar_one_or_none()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    active_company_count = (
        await db.execute(
            select(func.count(Company.company_id)).where(
                Company.cluster_id == cluster_id,
                Company.is_active.is_(True),
            )
        )
    ).scalar() or 0

    if active_company_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete cluster with {active_company_count} active companies",
        )

    cluster.is_active = False
    cluster.modified_date = _utcnow()

    await _audit(
        db,
        current_user.user_id,
        "CLUSTER_DEACTIVATED",
        "cluster",
        cluster_id,
        f"Deactivated cluster {cluster.cluster_name}",
    )

    await db.commit()


@router.get("/clusters/{cluster_id}/companies", response_model=List[CompanyResponse])
async def get_cluster_companies(
    cluster_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    cluster = (await db.execute(select(Cluster).where(Cluster.cluster_id == cluster_id))).scalar_one_or_none()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    rows = (
        await db.execute(
            select(
                Company,
                func.count(func.distinct(UserCompanyRoleMap.user_id)).label("user_count"),
            )
            .outerjoin(
                UserCompanyRoleMap,
                and_(
                    UserCompanyRoleMap.company_id == Company.company_id,
                    UserCompanyRoleMap.is_active.is_(True),
                ),
            )
            .where(Company.cluster_id == cluster_id)
            .group_by(Company.company_id)
            .order_by(Company.company_name)
        )
    ).all()

    return [
        CompanyResponse(
            company_id=company.company_id,
            company_name=company.company_name,
            cluster_id=company.cluster_id,
            cluster_name=cluster.cluster_name,
            fin_year_start_month=company.fin_year_start_month,
            is_active=company.is_active,
            user_count=int(user_count or 0),
            created_date=company.created_date,
            modified_date=company.modified_date,
        )
        for company, user_count in rows
    ]


# ==================== COMPANIES ====================

@router.get("/companies", response_model=CompanyListResponse)
async def list_companies(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    search: Optional[str] = Query(default=None),
    cluster_id: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    conditions = []

    if search:
        q = f"%{search.strip()}%"
        conditions.append(Company.company_name.ilike(q))
    if cluster_id:
        conditions.append(Company.cluster_id == cluster_id)
    if is_active is not None:
        conditions.append(Company.is_active.is_(is_active))

    total_query = select(func.count(Company.company_id))
    if conditions:
        total_query = total_query.where(*conditions)
    total = (await db.execute(total_query)).scalar() or 0

    statement = (
        select(
            Company,
            Cluster.cluster_name,
            func.count(func.distinct(UserCompanyRoleMap.user_id)).label("user_count"),
        )
        .join(Cluster, Cluster.cluster_id == Company.cluster_id)
        .outerjoin(
            UserCompanyRoleMap,
            and_(
                UserCompanyRoleMap.company_id == Company.company_id,
                UserCompanyRoleMap.is_active.is_(True),
            ),
        )
    )
    if conditions:
        statement = statement.where(*conditions)

    statement = (
        statement
        .group_by(Company.company_id, Cluster.cluster_name)
        .order_by(Company.company_name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    data_rows = (await db.execute(statement)).all()

    companies = [
        CompanyResponse(
            company_id=company.company_id,
            company_name=company.company_name,
            cluster_id=company.cluster_id,
            cluster_name=cluster_name,
            fin_year_start_month=company.fin_year_start_month,
            is_active=company.is_active,
            user_count=int(user_count or 0),
            created_date=company.created_date,
            modified_date=company.modified_date,
        )
        for company, cluster_name, user_count in data_rows
    ]

    total_pages = ceil(total / page_size) if total else 0
    return CompanyListResponse(
        companies=companies,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    request: CompanyCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    cluster = (
        await db.execute(select(Cluster).where(Cluster.cluster_id == request.cluster_id))
    ).scalar_one_or_none()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    duplicate_name = (
        await db.execute(
            select(Company).where(func.lower(Company.company_name) == request.company_name.strip().lower())
        )
    ).scalar_one_or_none()
    if duplicate_name:
        raise HTTPException(status_code=409, detail="Company name already exists")

    company_id = request.company_id.strip() if request.company_id else await _next_text_id(db, Company.company_id, "CC", 4)
    existing_id = (
        await db.execute(select(Company).where(Company.company_id == company_id))
    ).scalar_one_or_none()
    if existing_id:
        raise HTTPException(status_code=409, detail="Company ID already exists")

    company = Company(
        company_id=company_id,
        company_name=request.company_name.strip(),
        cluster_id=request.cluster_id,
        fin_year_start_month=request.fin_year_start_month,
        is_active=request.is_active,
        created_date=_utcnow(),
        modified_date=_utcnow(),
    )
    db.add(company)

    await _audit(
        db,
        current_user.user_id,
        "COMPANY_CREATED",
        "company",
        company.company_id,
        f"Created company {company.company_name}",
    )

    await db.commit()

    return CompanyResponse(
        company_id=company.company_id,
        company_name=company.company_name,
        cluster_id=company.cluster_id,
        cluster_name=cluster.cluster_name,
        fin_year_start_month=company.fin_year_start_month,
        is_active=company.is_active,
        user_count=0,
        created_date=company.created_date,
        modified_date=company.modified_date,
    )


@router.get("/companies/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    row = (
        await db.execute(
            select(
                Company,
                Cluster.cluster_name,
                func.count(func.distinct(UserCompanyRoleMap.user_id)).label("user_count"),
            )
            .join(Cluster, Cluster.cluster_id == Company.cluster_id)
            .outerjoin(
                UserCompanyRoleMap,
                and_(
                    UserCompanyRoleMap.company_id == Company.company_id,
                    UserCompanyRoleMap.is_active.is_(True),
                ),
            )
            .where(Company.company_id == company_id)
            .group_by(Company.company_id, Cluster.cluster_name)
        )
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="Company not found")

    company, cluster_name, user_count = row
    return CompanyResponse(
        company_id=company.company_id,
        company_name=company.company_name,
        cluster_id=company.cluster_id,
        cluster_name=cluster_name,
        fin_year_start_month=company.fin_year_start_month,
        is_active=company.is_active,
        user_count=int(user_count or 0),
        created_date=company.created_date,
        modified_date=company.modified_date,
    )


@router.patch("/companies/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: str,
    request: CompanyUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    company = (await db.execute(select(Company).where(Company.company_id == company_id))).scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if request.company_name is not None:
        duplicate = (
            await db.execute(
                select(Company).where(
                    Company.company_id != company_id,
                    func.lower(Company.company_name) == request.company_name.strip().lower(),
                )
            )
        ).scalar_one_or_none()
        if duplicate:
            raise HTTPException(status_code=409, detail="Company name already exists")
        company.company_name = request.company_name.strip()

    if request.cluster_id is not None:
        cluster = (
            await db.execute(select(Cluster).where(Cluster.cluster_id == request.cluster_id))
        ).scalar_one_or_none()
        if not cluster:
            raise HTTPException(status_code=404, detail="Cluster not found")
        company.cluster_id = request.cluster_id

    if request.fin_year_start_month is not None:
        company.fin_year_start_month = request.fin_year_start_month

    if request.is_active is not None:
        company.is_active = request.is_active

    company.modified_date = _utcnow()

    await _audit(
        db,
        current_user.user_id,
        "COMPANY_UPDATED",
        "company",
        company.company_id,
        f"Updated company {company.company_name}",
    )

    await db.commit()

    return await get_company(company_id, current_user, db)


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    company = (await db.execute(select(Company).where(Company.company_id == company_id))).scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    active_assignments = (
        await db.execute(
            select(func.count(UserCompanyRoleMap.user_id)).where(
                UserCompanyRoleMap.company_id == company_id,
                UserCompanyRoleMap.is_active.is_(True),
            )
        )
    ).scalar() or 0

    if active_assignments > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot deactivate company with {active_assignments} active user assignments",
        )

    company.is_active = False
    company.modified_date = _utcnow()

    await _audit(
        db,
        current_user.user_id,
        "COMPANY_DEACTIVATED",
        "company",
        company.company_id,
        f"Deactivated company {company.company_name}",
    )

    await db.commit()


@router.get("/companies/{company_id}/users", response_model=List[UserAssignmentResponse])
async def get_company_users(
    company_id: str,
    include_inactive: bool = Query(default=False),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    company = (await db.execute(select(Company).where(Company.company_id == company_id))).scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    conditions = [UserCompanyRoleMap.company_id == company_id]
    if not include_inactive:
        conditions.append(UserCompanyRoleMap.is_active.is_(True))

    rows = (
        await db.execute(
            select(User, RoleMaster, UserCompanyRoleMap)
            .join(UserCompanyRoleMap, UserCompanyRoleMap.user_id == User.user_id)
            .join(RoleMaster, RoleMaster.role_id == UserCompanyRoleMap.role_id)
            .where(*conditions)
            .order_by(User.first_name, User.last_name, User.user_email)
        )
    ).all()

    response: List[UserAssignmentResponse] = []
    for user, role, mapping in rows:
        response.append(
            UserAssignmentResponse(
                id=f"{user.user_id}:{company.company_id}:{role.role_id}",
                user_id=user.user_id,
                user_email=user.user_email,
                user_name=_display_name(user),
                company_id=company.company_id,
                company_name=company.company_name,
                role_id=role.role_id,
                role_name=role.role_name,
                is_active=bool(mapping.is_active),
            )
        )
    return response


@router.post("/companies/{company_id}/users", response_model=UserAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_user_to_company(
    company_id: str,
    request: AssignUserRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = (
        await db.execute(
            select(User).where(func.lower(func.trim(User.user_email)) == request.user_email.strip().lower())
        )
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    assignment_request = UserRoleAssignRequest(company_id=company_id, role_id=request.role_id)
    await assign_role_to_user(user.user_id, assignment_request, current_user, db)
    return await _build_assignment_response(db, user.user_id, company_id, request.role_id)


# ==================== USERS ====================

@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=2000),
    search: Optional[str] = Query(default=None),
    role_id: Optional[int] = Query(default=None),
    company_id: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user_conditions = []
    if search:
        q = f"%{search.strip()}%"
        user_conditions.append(
            or_(
                User.user_email.ilike(q),
                User.first_name.ilike(q),
                User.last_name.ilike(q),
            )
        )

    if is_active is not None:
        user_conditions.append(User.is_active.is_(is_active))

    if role_id is not None or company_id is not None:
        role_filters = [
            UserCompanyRoleMap.user_id == User.user_id,
            UserCompanyRoleMap.is_active.is_(True),
        ]
        if role_id is not None:
            role_filters.append(UserCompanyRoleMap.role_id == role_id)
        if company_id is not None:
            role_filters.append(UserCompanyRoleMap.company_id == company_id)
        user_conditions.append(exists(select(1).where(*role_filters)))

    total_query = select(func.count(User.user_id))
    if user_conditions:
        total_query = total_query.where(*user_conditions)
    total = (await db.execute(total_query)).scalar() or 0

    user_statement = select(User)
    if user_conditions:
        user_statement = user_statement.where(*user_conditions)
    user_statement = (
        user_statement
        .order_by(User.created_date.desc(), User.user_email.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    users = (await db.execute(user_statement)).scalars().all()
    user_ids = [u.user_id for u in users]
    roles_map = await _build_user_roles(db, user_ids)

    response_users = [
        UserResponse(
            user_id=user.user_id,
            user_email=user.user_email,
            first_name=user.first_name,
            last_name=user.last_name,
            is_active=user.is_active,
            created_date=user.created_date,
            modified_date=user.modified_date,
            roles=roles_map.get(user.user_id, []),
        )
        for user in users
    ]

    total_pages = ceil(total / page_size) if total else 0
    return UserListResponse(
        users=response_users,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: UserCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    normalized_email = request.user_email.strip().lower()

    existing_user = (
        await db.execute(
            select(User).where(func.lower(func.trim(User.user_email)) == normalized_email)
        )
    ).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already exists")

    role = None
    company = None

    if request.role_id is not None:
        role = (
            await db.execute(select(RoleMaster).where(RoleMaster.role_id == request.role_id))
        ).scalar_one_or_none()
        if not role:
            raise HTTPException(status_code=400, detail="Invalid role_id")

    if request.company_id is not None:
        company = (
            await db.execute(select(Company).where(Company.company_id == request.company_id))
        ).scalar_one_or_none()
        if not company:
            raise HTTPException(status_code=400, detail="Invalid company_id")

    user_id = await _next_text_id(db, User.user_id, "U", 4)
    now = _utcnow()

    user = User(
        user_id=user_id,
        user_email=normalized_email,
        first_name=request.first_name.strip(),
        last_name=request.last_name.strip(),
        is_active=request.is_active,
        created_date=now,
        modified_date=now,
    )
    db.add(user)

    if role and company:
        db.add(
            UserCompanyRoleMap(
                user_id=user_id,
                company_id=request.company_id,
                role_id=request.role_id,
                is_active=True,
            )
        )

    audit_detail = f"Created user {normalized_email}"
    if role and company:
        audit_detail += f" with role {role.role_name} at company {company.company_name}"

    await _audit(
        db,
        current_user.user_id,
        "USER_CREATED",
        "user",
        user_id,
        audit_detail,
    )

    await db.commit()

    roles_map = await _build_user_roles(db, [user_id])
    return UserResponse(
        user_id=user.user_id,
        user_email=user.user_email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_active=user.is_active,
        created_date=user.created_date,
        modified_date=user.modified_date,
        roles=roles_map.get(user_id, []),
    )


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    request: UserUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.user_id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if request.first_name is not None:
        user.first_name = request.first_name.strip()
    if request.last_name is not None:
        user.last_name = request.last_name.strip()
    if request.is_active is not None:
        user.is_active = request.is_active
        if request.is_active is False:
            mappings = (
                await db.execute(
                    select(UserCompanyRoleMap).where(UserCompanyRoleMap.user_id == user.user_id)
                )
            ).scalars().all()
            for mapping in mappings:
                mapping.is_active = False

    user.modified_date = _utcnow()

    await _audit(
        db,
        current_user.user_id,
        "USER_UPDATED",
        "user",
        user.user_id,
        f"Updated user {user.user_email}",
    )

    await db.commit()

    roles_map = await _build_user_roles(db, [user.user_id])
    return UserResponse(
        user_id=user.user_id,
        user_email=user.user_email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_active=user.is_active,
        created_date=user.created_date,
        modified_date=user.modified_date,
        roles=roles_map.get(user.user_id, []),
    )


@router.post("/users/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: str,
    request: UserStatusUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await update_user(
        user_id=user_id,
        request=UserUpdate(is_active=request.is_active),
        current_user=current_user,
        db=db,
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.user_id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    user.modified_date = _utcnow()

    mappings = (
        await db.execute(select(UserCompanyRoleMap).where(UserCompanyRoleMap.user_id == user_id))
    ).scalars().all()
    for mapping in mappings:
        mapping.is_active = False

    await _audit(
        db,
        current_user.user_id,
        "USER_DEACTIVATED",
        "user",
        user_id,
        f"Deactivated user {user.user_email}",
    )

    await db.commit()


# ==================== ASSIGNMENTS ====================

@router.get("/assignments", response_model=AssignmentListResponse)
async def list_assignments(
    company_id: Optional[str] = Query(default=None),
    user_id: Optional[str] = Query(default=None),
    include_inactive: bool = Query(default=False),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    conditions = []
    if company_id:
        conditions.append(UserCompanyRoleMap.company_id == company_id)
    if user_id:
        conditions.append(UserCompanyRoleMap.user_id == user_id)
    if not include_inactive:
        conditions.append(UserCompanyRoleMap.is_active.is_(True))

    statement = (
        select(User, Company, RoleMaster, UserCompanyRoleMap)
        .join(UserCompanyRoleMap, UserCompanyRoleMap.user_id == User.user_id)
        .join(Company, Company.company_id == UserCompanyRoleMap.company_id)
        .join(RoleMaster, RoleMaster.role_id == UserCompanyRoleMap.role_id)
        .order_by(Company.company_name, User.user_email)
    )
    if conditions:
        statement = statement.where(*conditions)

    rows = (await db.execute(statement)).all()

    assignments = [
        UserAssignmentResponse(
            id=f"{user.user_id}:{company.company_id}:{role.role_id}",
            user_id=user.user_id,
            user_email=user.user_email,
            user_name=_display_name(user),
            company_id=company.company_id,
            company_name=company.company_name,
            role_id=role.role_id,
            role_name=role.role_name,
            is_active=bool(mapping.is_active),
        )
        for user, company, role, mapping in rows
    ]

    return AssignmentListResponse(assignments=assignments, total=len(assignments))


@router.post("/assignments", response_model=UserAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    request: AssignmentCreateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.user_id == request.user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    company = (
        await db.execute(select(Company).where(Company.company_id == request.company_id))
    ).scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    role = (
        await db.execute(select(RoleMaster).where(RoleMaster.role_id == request.role_id))
    ).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role_id")

    existing = (
        await db.execute(
            select(UserCompanyRoleMap).where(
                UserCompanyRoleMap.user_id == request.user_id,
                UserCompanyRoleMap.company_id == request.company_id,
                UserCompanyRoleMap.role_id == request.role_id,
            )
        )
    ).scalar_one_or_none()

    if existing and existing.is_active:
        raise HTTPException(status_code=409, detail="Assignment already exists")

    if existing:
        existing.is_active = request.is_active
    else:
        db.add(
            UserCompanyRoleMap(
                user_id=request.user_id,
                company_id=request.company_id,
                role_id=request.role_id,
                is_active=request.is_active,
            )
        )

    await _audit(
        db,
        current_user.user_id,
        "USER_ASSIGNED",
        "assignment",
        f"{request.user_id}:{request.company_id}:{request.role_id}",
        f"Assigned user {user.user_email} as {role.role_name} to {company.company_name}",
    )

    await db.commit()

    return await _build_assignment_response(db, request.user_id, request.company_id, request.role_id)


@router.delete("/assignments/{user_id}/{company_id}/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    user_id: str,
    company_id: str,
    role_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    mapping = (
        await db.execute(
            select(UserCompanyRoleMap).where(
                UserCompanyRoleMap.user_id == user_id,
                UserCompanyRoleMap.company_id == company_id,
                UserCompanyRoleMap.role_id == role_id,
            )
        )
    ).scalar_one_or_none()

    if not mapping:
        raise HTTPException(status_code=404, detail="Assignment not found")

    mapping.is_active = False

    await _audit(
        db,
        current_user.user_id,
        "USER_UNASSIGNED",
        "assignment",
        f"{user_id}:{company_id}:{role_id}",
        f"Unassigned user {user_id} role {role_id} from company {company_id}",
    )

    await db.commit()


@router.post("/users/{user_id}/roles", response_model=UserAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_role_to_user(
    user_id: str,
    request: UserRoleAssignRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    assignment = AssignmentCreateRequest(
        user_id=user_id,
        company_id=request.company_id,
        role_id=request.role_id,
        is_active=True,
    )
    return await create_assignment(assignment, current_user, db)


@router.delete("/users/{user_id}/roles/{company_id}/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_role_from_user(
    user_id: str,
    company_id: str,
    role_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await delete_assignment(user_id, company_id, role_id, current_user, db)


# ==================== BUDGET IMPORT ====================

@router.post("/budget/import", response_model=BudgetImportResponse)
async def import_budget(
    file: UploadFile = File(..., description="CSV file with budget data"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    try:
        csv_content = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            csv_content = content.decode("latin-1")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decode file. Please use UTF-8 encoding.",
            )

    result = await BudgetImportService.import_budget_csv(
        db=db,
        csv_content=csv_content,
        imported_by=current_user,
    )

    return BudgetImportResponse(
        success=result.success,
        total_rows=result.total_rows,
        imported_rows=result.imported_rows,
        updated_rows=result.updated_rows,
        skipped_rows=result.skipped_rows,
        error_count=len(result.error_rows),
        message=result.message,
        errors=result.error_rows[:20] if result.error_rows else None,
    )


@router.get("/budget/template")
async def get_budget_template(
    current_user: User = Depends(require_admin),
):
    template = BudgetImportService.generate_template_csv()
    return PlainTextResponse(
        content=template,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=budget_import_template.csv"},
    )


@router.post("/budget/import/validate")
async def validate_budget_file(
    file: UploadFile = File(..., description="CSV file to validate"),
    current_user: User = Depends(require_admin),
):
    content = await file.read()
    try:
        csv_content = content.decode("utf-8")
    except UnicodeDecodeError:
        csv_content = content.decode("latin-1")

    import csv
    import io

    reader = csv.DictReader(io.StringIO(csv_content))
    headers = reader.fieldnames or []
    mapping = BudgetImportService.detect_column_mapping(headers)

    required = ["company_code", "year", "month"]
    missing = [field for field in required if field not in mapping]
    rows = list(reader)

    return {
        "valid": len(missing) == 0,
        "row_count": len(rows),
        "headers_found": headers,
        "column_mapping": mapping,
        "missing_required": missing,
        "message": "File looks valid" if len(missing) == 0 else f"Missing required columns: {missing}",
    }


# ==================== BUDGET ENTRY ====================

# Metric field name -> MetricID mapping
_METRIC_FIELD_MAP: Dict[str, int] = {
    "revenue": int(MetricID.REVENUE),
    "gp": int(MetricID.GP),
    "gp_margin": int(MetricID.GP_MARGIN),
    "other_income": int(MetricID.OTHER_INCOME),
    "personal_exp": int(MetricID.PERSONAL_EXP),
    "admin_exp": int(MetricID.ADMIN_EXP),
    "selling_exp": int(MetricID.SELLING_EXP),
    "finance_exp": int(MetricID.FINANCE_EXP),
    "depreciation": int(MetricID.DEPRECIATION),
    "total_overhead": int(MetricID.TOTAL_OVERHEAD),
    "provisions": int(MetricID.PROVISIONS),
    "exchange_variance": int(MetricID.EXCHANGE_VARIANCE),
    "pbt_before_non_ops": int(MetricID.PBT_BEFORE_NON_OPS),
    "pbt_after_non_ops": int(MetricID.PBT_AFTER_NON_OPS),
    "non_ops_exp": int(MetricID.NON_OPS_EXP),
    "non_ops_income": int(MetricID.NON_OPS_INCOME),
    "np_margin": int(MetricID.NP_MARGIN),
    "ebit": int(MetricID.EBIT),
    "ebitda": int(MetricID.EBITDA),
}


class BudgetEntryMetrics(BaseModel):
    revenue: Optional[float] = None
    gp: Optional[float] = None
    gp_margin: Optional[float] = None
    other_income: Optional[float] = None
    personal_exp: Optional[float] = None
    admin_exp: Optional[float] = None
    selling_exp: Optional[float] = None
    finance_exp: Optional[float] = None
    depreciation: Optional[float] = None
    total_overhead: Optional[float] = None
    provisions: Optional[float] = None
    exchange_variance: Optional[float] = None
    pbt_before_non_ops: Optional[float] = None
    pbt_after_non_ops: Optional[float] = None
    non_ops_exp: Optional[float] = None
    non_ops_income: Optional[float] = None
    np_margin: Optional[float] = None
    ebit: Optional[float] = None
    ebitda: Optional[float] = None


class BudgetEntryRequest(BaseModel):
    company_id: str
    year: int
    month: int = Field(..., ge=1, le=12)
    metrics: BudgetEntryMetrics
    comment: Optional[str] = None


class BudgetEntryResponse(BaseModel):
    success: bool
    company_id: str
    period_id: int
    status: str
    message: str


class BudgetDraftItem(BaseModel):
    company_id: str
    company_name: str
    cluster_name: Optional[str]
    period_id: int
    year: int
    month: int
    status: str
    budget_comment: Optional[str]
    submitted_by: Optional[str]
    submitted_date: Optional[datetime]
    metrics: Dict[str, Optional[float]]


class BudgetDraftListResponse(BaseModel):
    drafts: List[BudgetDraftItem]
    total: int


async def _upsert_budget(
    db: AsyncSession,
    company_id: str,
    period_id: int,
    metrics: BudgetEntryMetrics,
    comment: Optional[str],
    status_id: int,
    current_user: User,
) -> None:
    """Upsert financial_fact rows + financial_workflow for budget entry."""
    now = _utcnow()
    metrics_dict = metrics.model_dump()

    for field_name, metric_id in _METRIC_FIELD_MAP.items():
        amount = metrics_dict.get(field_name)
        if amount is None:
            continue

        existing = (
            await db.execute(
                select(FinancialFact).where(
                    FinancialFact.company_id == company_id,
                    FinancialFact.period_id == period_id,
                    FinancialFact.metric_id == metric_id,
                    FinancialFact.actual_budget == "BUDGET",
                )
            )
        ).scalar_one_or_none()

        if existing:
            existing.amount = amount
        else:
            db.add(
                FinancialFact(
                    company_id=company_id,
                    period_id=period_id,
                    metric_id=metric_id,
                    actual_budget="BUDGET",
                    amount=amount,
                )
            )

    # Upsert financial_workflow
    workflow = (
        await db.execute(
            select(Report).where(
                Report.company_id == company_id,
                Report.period_id == period_id,
            )
        )
    ).scalar_one_or_none()

    if workflow:
        workflow.status_id = status_id
        workflow.submitted_by = current_user.user_id
        workflow.submitted_date = now
        workflow.budget_comment = comment
    else:
        db.add(
            Report(
                company_id=company_id,
                period_id=period_id,
                status_id=status_id,
                submitted_by=current_user.user_id,
                submitted_date=now,
                budget_comment=comment,
            )
        )


@router.post("/budget/entry", response_model=BudgetEntryResponse)
async def submit_budget_entry(
    request: BudgetEntryRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Submit budget entry — saves to financial_fact + financial_workflow with status=Submitted."""
    company = (
        await db.execute(select(Company).where(Company.company_id == request.company_id))
    ).scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    period = (
        await db.execute(
            select(PeriodMaster).where(
                PeriodMaster.year == request.year,
                PeriodMaster.month == request.month,
            )
        )
    ).scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail=f"Period not found for {request.year}-{request.month}")

    await _upsert_budget(
        db, request.company_id, period.period_id,
        request.metrics, request.comment,
        int(StatusID.SUBMITTED), current_user,
    )

    await _audit(
        db, current_user.user_id, "BUDGET_SUBMITTED", "budget",
        f"{request.company_id}:{period.period_id}",
        f"Submitted budget for {company.company_name} ({request.year}-{request.month})",
    )
    await db.commit()

    return BudgetEntryResponse(
        success=True, company_id=request.company_id,
        period_id=period.period_id, status="Submitted",
        message=f"Budget submitted for {company.company_name}",
    )


@router.post("/budget/draft", response_model=BudgetEntryResponse)
async def save_budget_draft(
    request: BudgetEntryRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Save budget as draft — same as submit but status=Draft."""
    company = (
        await db.execute(select(Company).where(Company.company_id == request.company_id))
    ).scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    period = (
        await db.execute(
            select(PeriodMaster).where(
                PeriodMaster.year == request.year,
                PeriodMaster.month == request.month,
            )
        )
    ).scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail=f"Period not found for {request.year}-{request.month}")

    await _upsert_budget(
        db, request.company_id, period.period_id,
        request.metrics, request.comment,
        int(StatusID.DRAFT), current_user,
    )

    await _audit(
        db, current_user.user_id, "BUDGET_DRAFT_SAVED", "budget",
        f"{request.company_id}:{period.period_id}",
        f"Saved budget draft for {company.company_name} ({request.year}-{request.month})",
    )
    await db.commit()

    return BudgetEntryResponse(
        success=True, company_id=request.company_id,
        period_id=period.period_id, status="Draft",
        message=f"Budget draft saved for {company.company_name}",
    )


@router.get("/budget/drafts", response_model=BudgetDraftListResponse)
async def list_budget_drafts(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all budget drafts — workflow rows with status=Draft that have Budget financial_fact rows."""
    rows = (
        await db.execute(
            select(Report, Company.company_name, Cluster.cluster_name, PeriodMaster)
            .join(Company, Company.company_id == Report.company_id)
            .join(Cluster, Cluster.cluster_id == Company.cluster_id)
            .join(PeriodMaster, PeriodMaster.period_id == Report.period_id)
            .where(Report.status_id == int(StatusID.DRAFT))
            .where(
                exists(
                    select(FinancialFact.company_id).where(
                        FinancialFact.company_id == Report.company_id,
                        FinancialFact.period_id == Report.period_id,
                        FinancialFact.actual_budget == "BUDGET",
                    )
                )
            )
            .order_by(Report.submitted_date.desc())
        )
    ).all()

    drafts: List[BudgetDraftItem] = []
    for workflow, company_name, cluster_name, period in rows:
        # Load budget metrics for this company+period
        fact_rows = (
            await db.execute(
                select(FinancialFact.metric_id, FinancialFact.amount).where(
                    FinancialFact.company_id == workflow.company_id,
                    FinancialFact.period_id == workflow.period_id,
                    FinancialFact.actual_budget == "BUDGET",
                )
            )
        ).all()

        metric_id_to_field = {v: k for k, v in _METRIC_FIELD_MAP.items()}
        metrics_data: Dict[str, Optional[float]] = {}
        for metric_id, amount in fact_rows:
            field_name = metric_id_to_field.get(int(metric_id))
            if field_name:
                metrics_data[field_name] = float(amount) if amount is not None else None

        status_row = (
            await db.execute(select(StatusMaster.status_name).where(StatusMaster.status_id == workflow.status_id))
        ).scalar_one_or_none()

        drafts.append(
            BudgetDraftItem(
                company_id=workflow.company_id,
                company_name=company_name,
                cluster_name=cluster_name,
                period_id=workflow.period_id,
                year=period.year,
                month=period.month,
                status=status_row or "Draft",
                budget_comment=workflow.budget_comment,
                submitted_by=workflow.submitted_by,
                submitted_date=workflow.submitted_date,
                metrics=metrics_data,
            )
        )

    return BudgetDraftListResponse(drafts=drafts, total=len(drafts))


@router.get("/budget/entry/{company_id}/{year}/{month}")
async def get_budget_entry(
    company_id: str,
    year: int,
    month: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Load existing budget data for a company+period (for resuming drafts)."""
    period = (
        await db.execute(
            select(PeriodMaster).where(
                PeriodMaster.year == year,
                PeriodMaster.month == month,
            )
        )
    ).scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail="Period not found")

    fact_rows = (
        await db.execute(
            select(FinancialFact.metric_id, FinancialFact.amount).where(
                FinancialFact.company_id == company_id,
                FinancialFact.period_id == period.period_id,
                FinancialFact.actual_budget == "BUDGET",
            )
        )
    ).all()

    metric_id_to_field = {v: k for k, v in _METRIC_FIELD_MAP.items()}
    metrics: Dict[str, Optional[float]] = {}
    for metric_id, amount in fact_rows:
        field_name = metric_id_to_field.get(int(metric_id))
        if field_name:
            metrics[field_name] = float(amount) if amount is not None else None

    workflow = (
        await db.execute(
            select(Report).where(
                Report.company_id == company_id,
                Report.period_id == period.period_id,
            )
        )
    ).scalar_one_or_none()

    return {
        "company_id": company_id,
        "period_id": period.period_id,
        "year": year,
        "month": month,
        "metrics": metrics,
        "comment": workflow.budget_comment if workflow else None,
        "status": workflow.status.value if workflow else None,
    }


# ==================== ACTUAL ENTRY ====================


async def _upsert_actual(
    db: AsyncSession,
    company_id: str,
    period_id: int,
    metrics: BudgetEntryMetrics,
    comment: Optional[str],
    status_id: int,
    current_user: User,
) -> None:
    """Upsert financial_fact rows (actual_budget='Actual') + financial_workflow."""
    now = _utcnow()
    metrics_dict = metrics.model_dump()

    for field_name, metric_id in _METRIC_FIELD_MAP.items():
        amount = metrics_dict.get(field_name)
        if amount is None:
            continue

        existing = (
            await db.execute(
                select(FinancialFact).where(
                    FinancialFact.company_id == company_id,
                    FinancialFact.period_id == period_id,
                    FinancialFact.metric_id == metric_id,
                    FinancialFact.actual_budget == "ACTUAL",
                )
            )
        ).scalar_one_or_none()

        if existing:
            existing.amount = amount
        else:
            db.add(
                FinancialFact(
                    company_id=company_id,
                    period_id=period_id,
                    metric_id=metric_id,
                    actual_budget="ACTUAL",
                    amount=amount,
                )
            )

    # Upsert financial_workflow
    workflow = (
        await db.execute(
            select(Report).where(
                Report.company_id == company_id,
                Report.period_id == period_id,
            )
        )
    ).scalar_one_or_none()

    if workflow:
        workflow.status_id = status_id
        workflow.submitted_by = current_user.user_id
        workflow.submitted_date = now
        workflow.actual_comment = comment
    else:
        db.add(
            Report(
                company_id=company_id,
                period_id=period_id,
                status_id=status_id,
                submitted_by=current_user.user_id,
                submitted_date=now,
                actual_comment=comment,
            )
        )


@router.post("/actual/entry", response_model=BudgetEntryResponse)
async def submit_actual_entry(
    request: BudgetEntryRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Submit actual entry — saves to financial_fact (Actual) + financial_workflow with status=Approved (admin bypass)."""
    company = (
        await db.execute(select(Company).where(Company.company_id == request.company_id))
    ).scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    period = (
        await db.execute(
            select(PeriodMaster).where(
                PeriodMaster.year == request.year,
                PeriodMaster.month == request.month,
            )
        )
    ).scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail=f"Period not found for {request.year}-{request.month}")

    await _upsert_actual(
        db, request.company_id, period.period_id,
        request.metrics, request.comment,
        int(StatusID.APPROVED), current_user,
    )

    await _audit(
        db, current_user.user_id, "ACTUAL_APPROVED", "actual",
        f"{request.company_id}:{period.period_id}",
        f"Approved actuals for {company.company_name} ({request.year}-{request.month})",
    )
    await db.commit()

    return BudgetEntryResponse(
        success=True, company_id=request.company_id,
        period_id=period.period_id, status="Approved",
        message=f"Actuals approved for {company.company_name}",
    )


@router.post("/actual/draft", response_model=BudgetEntryResponse)
async def save_actual_draft(
    request: BudgetEntryRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Save actual as draft — same as submit but status=Draft."""
    company = (
        await db.execute(select(Company).where(Company.company_id == request.company_id))
    ).scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    period = (
        await db.execute(
            select(PeriodMaster).where(
                PeriodMaster.year == request.year,
                PeriodMaster.month == request.month,
            )
        )
    ).scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail=f"Period not found for {request.year}-{request.month}")

    await _upsert_actual(
        db, request.company_id, period.period_id,
        request.metrics, request.comment,
        int(StatusID.DRAFT), current_user,
    )

    await _audit(
        db, current_user.user_id, "ACTUAL_DRAFT_SAVED", "actual",
        f"{request.company_id}:{period.period_id}",
        f"Saved actual draft for {company.company_name} ({request.year}-{request.month})",
    )
    await db.commit()

    return BudgetEntryResponse(
        success=True, company_id=request.company_id,
        period_id=period.period_id, status="Draft",
        message=f"Actual draft saved for {company.company_name}",
    )


@router.get("/actual/drafts", response_model=BudgetDraftListResponse)
async def list_actual_drafts(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all actual drafts — workflow rows with status=Draft that have Actual financial_fact rows."""
    rows = (
        await db.execute(
            select(Report, Company.company_name, Cluster.cluster_name, PeriodMaster)
            .join(Company, Company.company_id == Report.company_id)
            .join(Cluster, Cluster.cluster_id == Company.cluster_id)
            .join(PeriodMaster, PeriodMaster.period_id == Report.period_id)
            .where(Report.status_id == int(StatusID.DRAFT))
            .where(
                exists(
                    select(FinancialFact.company_id).where(
                        FinancialFact.company_id == Report.company_id,
                        FinancialFact.period_id == Report.period_id,
                        FinancialFact.actual_budget == "ACTUAL",
                    )
                )
            )
            .order_by(Report.submitted_date.desc())
        )
    ).all()

    drafts: List[BudgetDraftItem] = []
    for workflow, company_name, cluster_name, period in rows:
        fact_rows = (
            await db.execute(
                select(FinancialFact.metric_id, FinancialFact.amount).where(
                    FinancialFact.company_id == workflow.company_id,
                    FinancialFact.period_id == workflow.period_id,
                    FinancialFact.actual_budget == "ACTUAL",
                )
            )
        ).all()

        metric_id_to_field = {v: k for k, v in _METRIC_FIELD_MAP.items()}
        metrics_data: Dict[str, Optional[float]] = {}
        for metric_id, amount in fact_rows:
            field_name = metric_id_to_field.get(int(metric_id))
            if field_name:
                metrics_data[field_name] = float(amount) if amount is not None else None

        drafts.append(
            BudgetDraftItem(
                company_id=workflow.company_id,
                company_name=company_name,
                cluster_name=cluster_name,
                period_id=workflow.period_id,
                year=period.year,
                month=period.month,
                status="Draft",
                budget_comment=workflow.actual_comment,
                submitted_by=workflow.submitted_by,
                submitted_date=workflow.submitted_date,
                metrics=metrics_data,
            )
        )

    return BudgetDraftListResponse(drafts=drafts, total=len(drafts))


@router.get("/actual/entry/{company_id}/{year}/{month}")
async def get_actual_entry(
    company_id: str,
    year: int,
    month: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Load existing actual data for a company+period."""
    period = (
        await db.execute(
            select(PeriodMaster).where(
                PeriodMaster.year == year,
                PeriodMaster.month == month,
            )
        )
    ).scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail="Period not found")

    fact_rows = (
        await db.execute(
            select(FinancialFact.metric_id, FinancialFact.amount).where(
                FinancialFact.company_id == company_id,
                FinancialFact.period_id == period.period_id,
                FinancialFact.actual_budget == "ACTUAL",
            )
        )
    ).all()

    metric_id_to_field = {v: k for k, v in _METRIC_FIELD_MAP.items()}
    metrics: Dict[str, Optional[float]] = {}
    for metric_id, amount in fact_rows:
        field_name = metric_id_to_field.get(int(metric_id))
        if field_name:
            metrics[field_name] = float(amount) if amount is not None else None

    workflow = (
        await db.execute(
            select(Report).where(
                Report.company_id == company_id,
                Report.period_id == period.period_id,
            )
        )
    ).scalar_one_or_none()

    return {
        "company_id": company_id,
        "period_id": period.period_id,
        "year": year,
        "month": month,
        "metrics": metrics,
        "comment": workflow.actual_comment if workflow else None,
        "status": workflow.status.value if workflow else None,
        "has_data": len(fact_rows) > 0,
    }
