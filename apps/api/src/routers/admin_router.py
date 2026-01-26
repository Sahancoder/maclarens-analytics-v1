"""
Admin Router - Company Setup & User Assignment
Admin-only endpoints for managing clusters, companies, and user assignments

Endpoints:
- CRUD for Clusters
- CRUD for Companies  
- User assignment to companies
- Budget import
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.db.models import Cluster, Company, User, UserRole, CompanyUserRole
from src.security.middleware import get_db, require_admin
from src.services.cluster_service import ClusterService
from src.services.company_service import CompanyService
from src.services.budget_import_service import BudgetImportService, ImportResult
from fastapi.responses import PlainTextResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


# ============ REQUEST/RESPONSE MODELS ============

# Cluster Models
class ClusterCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=20)
    description: Optional[str] = None


class ClusterUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ClusterResponse(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str]
    is_active: bool
    company_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class ClusterListResponse(BaseModel):
    clusters: List[ClusterResponse]
    total: int


# Company Models
class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=50)
    cluster_id: str
    fy_start_month: int = Field(default=1, ge=1, le=12)
    currency: str = Field(default="LKR", max_length=3)


class CompanyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    fy_start_month: Optional[int] = Field(None, ge=1, le=12)
    currency: Optional[str] = Field(None, max_length=3)
    is_active: Optional[bool] = None


class CompanyResponse(BaseModel):
    id: str
    name: str
    code: str
    cluster_id: str
    cluster_name: Optional[str]
    fy_start_month: int
    currency: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CompanyListResponse(BaseModel):
    companies: List[CompanyResponse]
    total: int


# User Assignment Models
class UserAssignment(BaseModel):
    user_id: str
    company_id: str
    role: str  # data_officer or company_director
    is_primary: bool = False


class UserAssignmentResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    user_name: str
    company_id: str
    company_name: str
    role: str
    is_primary: bool


class AssignUserRequest(BaseModel):
    user_email: str
    role: str = Field(..., pattern="^(data_officer|company_director)$")
    is_primary: bool = False


class BulkAssignRequest(BaseModel):
    assignments: List[UserAssignment]


# Budget Import Models
class BudgetImportResponse(BaseModel):
    success: bool
    total_rows: int
    imported_rows: int
    updated_rows: int
    skipped_rows: int
    error_count: int
    message: str
    errors: Optional[List[Dict[str, Any]]] = None


# ============ CLUSTER ENDPOINTS ============

@router.get("/clusters", response_model=ClusterListResponse)
async def list_clusters(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all clusters"""
    clusters = await ClusterService.get_all_clusters(db)
    
    response_clusters = []
    for cluster in clusters:
        company_count = await ClusterService.get_company_count_by_cluster(db, str(cluster.id))
        response_clusters.append(ClusterResponse(
            id=str(cluster.id),
            name=cluster.name,
            code=cluster.code,
            description=cluster.description if hasattr(cluster, 'description') else None,
            is_active=cluster.is_active,
            company_count=company_count,
            created_at=cluster.created_at
        ))
    
    return ClusterListResponse(clusters=response_clusters, total=len(response_clusters))


@router.post("/clusters", response_model=ClusterResponse, status_code=status.HTTP_201_CREATED)
async def create_cluster(
    request: ClusterCreate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new cluster"""
    # Check if code already exists
    existing = await ClusterService.get_cluster_by_code(db, request.code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cluster with code '{request.code}' already exists"
        )
    
    cluster = Cluster(
        name=request.name,
        code=request.code.upper(),
        description=request.description,
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(cluster)
    await db.commit()
    await db.refresh(cluster)
    
    return ClusterResponse(
        id=str(cluster.id),
        name=cluster.name,
        code=cluster.code,
        description=cluster.description if hasattr(cluster, 'description') else None,
        is_active=cluster.is_active,
        company_count=0,
        created_at=cluster.created_at
    )


@router.get("/clusters/{cluster_id}", response_model=ClusterResponse)
async def get_cluster(
    cluster_id: str,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get cluster by ID"""
    cluster = await ClusterService.get_cluster_by_id(db, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    company_count = await ClusterService.get_company_count_by_cluster(db, cluster_id)
    
    return ClusterResponse(
        id=str(cluster.id),
        name=cluster.name,
        code=cluster.code,
        description=cluster.description if hasattr(cluster, 'description') else None,
        is_active=cluster.is_active,
        company_count=company_count,
        created_at=cluster.created_at
    )


@router.patch("/clusters/{cluster_id}", response_model=ClusterResponse)
async def update_cluster(
    cluster_id: str,
    request: ClusterUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a cluster"""
    cluster = await ClusterService.get_cluster_by_id(db, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    if request.name is not None:
        cluster.name = request.name
    if request.description is not None:
        cluster.description = request.description
    if request.is_active is not None:
        cluster.is_active = request.is_active
    
    cluster.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(cluster)
    
    company_count = await ClusterService.get_company_count_by_cluster(db, cluster_id)
    
    return ClusterResponse(
        id=str(cluster.id),
        name=cluster.name,
        code=cluster.code,
        description=cluster.description if hasattr(cluster, 'description') else None,
        is_active=cluster.is_active,
        company_count=company_count,
        created_at=cluster.created_at
    )


@router.delete("/clusters/{cluster_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cluster(
    cluster_id: str,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a cluster (only if no companies attached)"""
    cluster = await ClusterService.get_cluster_by_id(db, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    company_count = await ClusterService.get_company_count_by_cluster(db, cluster_id)
    if company_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete cluster with {company_count} companies. Remove or reassign companies first."
        )
    
    await db.delete(cluster)
    await db.commit()


# ============ COMPANY ENDPOINTS ============

@router.get("/companies", response_model=CompanyListResponse)
async def list_companies(
    cluster_id: Optional[str] = None,
    active_only: bool = False,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all companies, optionally filtered by cluster"""
    if cluster_id:
        companies = await CompanyService.get_companies_by_cluster(db, cluster_id)
    else:
        companies = await CompanyService.get_all_companies(db)
    
    if active_only:
        companies = [c for c in companies if c.is_active]
    
    response_companies = []
    for company in companies:
        response_companies.append(CompanyResponse(
            id=str(company.id),
            name=company.name,
            code=company.code,
            cluster_id=str(company.cluster_id),
            cluster_name=company.cluster.name if company.cluster else None,
            fy_start_month=company.fy_start_month if hasattr(company, 'fy_start_month') else 1,
            currency=company.currency if hasattr(company, 'currency') else "LKR",
            is_active=company.is_active,
            created_at=company.created_at
        ))
    
    return CompanyListResponse(companies=response_companies, total=len(response_companies))


@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    request: CompanyCreate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new company"""
    # Check if code already exists
    existing = await CompanyService.get_company_by_code(db, request.code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Company with code '{request.code}' already exists"
        )
    
    # Verify cluster exists
    cluster = await ClusterService.get_cluster_by_id(db, request.cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    company = Company(
        name=request.name,
        code=request.code.upper(),
        cluster_id=UUID(request.cluster_id),
        fy_start_month=request.fy_start_month,
        currency=request.currency.upper(),
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(company)
    await db.commit()
    await db.refresh(company)
    
    return CompanyResponse(
        id=str(company.id),
        name=company.name,
        code=company.code,
        cluster_id=str(company.cluster_id),
        cluster_name=cluster.name,
        fy_start_month=company.fy_start_month,
        currency=company.currency,
        is_active=company.is_active,
        created_at=company.created_at
    )


@router.get("/companies/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: str,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get company by ID"""
    company = await CompanyService.get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return CompanyResponse(
        id=str(company.id),
        name=company.name,
        code=company.code,
        cluster_id=str(company.cluster_id),
        cluster_name=company.cluster.name if company.cluster else None,
        fy_start_month=company.fy_start_month if hasattr(company, 'fy_start_month') else 1,
        currency=company.currency if hasattr(company, 'currency') else "LKR",
        is_active=company.is_active,
        created_at=company.created_at
    )


@router.patch("/companies/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: str,
    request: CompanyUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a company"""
    company = await CompanyService.get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    if request.name is not None:
        company.name = request.name
    if request.fy_start_month is not None:
        company.fy_start_month = request.fy_start_month
    if request.currency is not None:
        company.currency = request.currency.upper()
    if request.is_active is not None:
        company.is_active = request.is_active
    
    company.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(company)
    
    return CompanyResponse(
        id=str(company.id),
        name=company.name,
        code=company.code,
        cluster_id=str(company.cluster_id),
        cluster_name=company.cluster.name if company.cluster else None,
        fy_start_month=company.fy_start_month,
        currency=company.currency,
        is_active=company.is_active,
        created_at=company.created_at
    )


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: str,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a company (soft delete - set inactive)"""
    company = await CompanyService.get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Soft delete
    company.is_active = False
    company.updated_at = datetime.utcnow()
    await db.commit()


# ============ USER ASSIGNMENT ENDPOINTS ============

@router.get("/companies/{company_id}/users", response_model=List[UserAssignmentResponse])
async def get_company_users(
    company_id: str,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get all users assigned to a company"""
    company = await CompanyService.get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get from company_user_roles
    result = await db.execute(
        select(CompanyUserRole, User)
        .join(User, CompanyUserRole.user_id == User.id)
        .where(CompanyUserRole.company_id == UUID(company_id))
    )
    rows = result.all()
    
    assignments = []
    for cur, usr in rows:
        assignments.append(UserAssignmentResponse(
            id=str(cur.id),
            user_id=str(usr.id),
            user_email=usr.email,
            user_name=usr.name,
            company_id=str(cur.company_id),
            company_name=company.name,
            role=cur.role.value if hasattr(cur.role, 'value') else str(cur.role),
            is_primary=cur.is_primary
        ))
    
    # Also include users directly assigned to company
    result = await db.execute(
        select(User).where(User.company_id == UUID(company_id))
    )
    direct_users = result.scalars().all()
    
    existing_ids = {a.user_id for a in assignments}
    for usr in direct_users:
        if str(usr.id) not in existing_ids:
            assignments.append(UserAssignmentResponse(
                id=f"direct-{usr.id}",
                user_id=str(usr.id),
                user_email=usr.email,
                user_name=usr.name,
                company_id=company_id,
                company_name=company.name,
                role=usr.role.value if hasattr(usr.role, 'value') else str(usr.role),
                is_primary=True
            ))
    
    return assignments


@router.post("/companies/{company_id}/users", response_model=UserAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_user_to_company(
    company_id: str,
    request: AssignUserRequest,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Assign a user to a company"""
    company = await CompanyService.get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Find user by email
    result = await db.execute(
        select(User).where(User.email == request.user_email)
    )
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail=f"User with email '{request.user_email}' not found")
    
    # Map role string to enum
    role_map = {
        "data_officer": UserRole.DATA_OFFICER,
        "company_director": UserRole.COMPANY_DIRECTOR,
    }
    role = role_map.get(request.role)
    if not role:
        raise HTTPException(status_code=400, detail=f"Invalid role: {request.role}")
    
    # Check if assignment already exists
    result = await db.execute(
        select(CompanyUserRole).where(
            CompanyUserRole.user_id == target_user.id,
            CompanyUserRole.company_id == UUID(company_id),
            CompanyUserRole.role == role
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already assigned to this company with this role"
        )
    
    # Create assignment
    assignment = CompanyUserRole(
        user_id=target_user.id,
        company_id=UUID(company_id),
        role=role,
        is_primary=request.is_primary,
        created_at=datetime.utcnow()
    )
    db.add(assignment)
    
    # If primary, also update user's direct company_id
    if request.is_primary:
        target_user.company_id = UUID(company_id)
        target_user.cluster_id = company.cluster_id
        target_user.role = role
    
    await db.commit()
    await db.refresh(assignment)
    
    return UserAssignmentResponse(
        id=str(assignment.id),
        user_id=str(target_user.id),
        user_email=target_user.email,
        user_name=target_user.name,
        company_id=company_id,
        company_name=company.name,
        role=request.role,
        is_primary=request.is_primary
    )


@router.delete("/companies/{company_id}/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_from_company(
    company_id: str,
    user_id: str,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Remove a user's assignment to a company"""
    # Delete from company_user_roles
    result = await db.execute(
        select(CompanyUserRole).where(
            CompanyUserRole.user_id == UUID(user_id),
            CompanyUserRole.company_id == UUID(company_id)
        )
    )
    assignments = result.scalars().all()
    
    for assignment in assignments:
        await db.delete(assignment)
    
    # Also clear direct assignment if matches
    result = await db.execute(
        select(User).where(User.id == UUID(user_id))
    )
    target_user = result.scalar_one_or_none()
    if target_user and str(target_user.company_id) == company_id:
        target_user.company_id = None
    
    await db.commit()


# ============ BUDGET IMPORT ENDPOINTS ============

@router.post("/budget/import", response_model=BudgetImportResponse)
async def import_budget(
    file: UploadFile = File(..., description="CSV file with budget data"),
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Import budget data from CSV file.
    
    The CSV should have columns:
    - company_code (required): Company code like "MCL-LK"
    - year (required): Four-digit year
    - month (required): 1-12
    - revenue_lkr, gp, other_income, personal_exp, admin_exp, etc.
    
    The import is idempotent - running it again will UPDATE existing entries,
    not create duplicates.
    
    Download the template at GET /admin/budget/template
    """
    # Read file content
    content = await file.read()
    try:
        csv_content = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            csv_content = content.decode("latin-1")
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decode file. Please use UTF-8 encoding."
            )
    
    # Import
    result = await BudgetImportService.import_budget_csv(
        db=db,
        csv_content=csv_content,
        imported_by=user,
    )
    
    return BudgetImportResponse(
        success=result.success,
        total_rows=result.total_rows,
        imported_rows=result.imported_rows,
        updated_rows=result.updated_rows,
        skipped_rows=result.skipped_rows,
        error_count=len(result.error_rows),
        message=result.message,
        errors=result.error_rows[:20] if result.error_rows else None  # Limit to first 20 errors
    )


@router.get("/budget/template")
async def get_budget_template(
    user: User = Depends(require_admin),
):
    """
    Download a CSV template for budget import.
    """
    template = BudgetImportService.generate_template_csv()
    
    return PlainTextResponse(
        content=template,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=budget_import_template.csv"
        }
    )


@router.post("/budget/import/validate")
async def validate_budget_file(
    file: UploadFile = File(..., description="CSV file to validate"),
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Validate a budget CSV file without importing.
    Returns what would happen if you imported this file.
    """
    content = await file.read()
    try:
        csv_content = content.decode("utf-8")
    except UnicodeDecodeError:
        csv_content = content.decode("latin-1")
    
    # Detect columns
    import csv
    import io
    reader = csv.DictReader(io.StringIO(csv_content))
    headers = reader.fieldnames or []
    
    mapping = BudgetImportService.detect_column_mapping(headers)
    
    # Check required columns
    required = ["company_code", "year", "month"]
    missing = [f for f in required if f not in mapping]
    
    # Count rows
    rows = list(reader)
    
    return {
        "valid": len(missing) == 0,
        "row_count": len(rows),
        "headers_found": headers,
        "column_mapping": mapping,
        "missing_required": missing,
        "message": "File looks valid" if len(missing) == 0 else f"Missing required columns: {missing}"
    }

