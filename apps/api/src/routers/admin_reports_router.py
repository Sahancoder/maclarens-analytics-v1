"""
System Admin Reports Router
Month + Fiscal YTD report preview and PDF/Excel exports.
"""
import logging
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from src.db.models import User
from src.security.middleware import get_db, require_admin
from src.security.rate_limit import rate_limit_heavy
from src.services.admin_report_service import (
    AdminReportService,
    ReportNotFoundError,
    ReportValidationError,
)

router = APIRouter(prefix="/admin/reports", tags=["Admin Reports"])


class ReportYearsResponse(BaseModel):
    company_id: str
    years: List[int]


class ReportMonthOption(BaseModel):
    month: int
    month_name: str


class ReportMonthsResponse(BaseModel):
    company_id: str
    year: int
    months: List[ReportMonthOption]


class ReportMatrix(BaseModel):
    month_label: str
    ytd_label: str


class ReportMetricRow(BaseModel):
    metric_key: str
    metric_label: str
    month_actual: float
    month_budget: float
    month_achievement: float
    ytd_actual: float
    ytd_budget: float
    ytd_achievement: float
    is_percentage: bool


class ReportPreviewResponse(BaseModel):
    cluster_id: str
    cluster_name: str
    company_id: str
    company_name: str
    year: int
    month: int
    period_label: str
    fin_year_start_month: int
    matrix: ReportMatrix
    rows: List[ReportMetricRow]
    month_actual_values: Dict[str, float]
    month_budget_values: Dict[str, float]
    ytd_actual_values: Dict[str, float]
    ytd_budget_values: Dict[str, float]


class ReportExportHistoryItem(BaseModel):
    id: str
    exported_at: datetime
    exported_by: str
    exported_by_email: Optional[str] = None
    exported_by_name: Optional[str] = None
    export_format: str
    file_name: str
    cluster_id: str
    cluster_name: str
    company_id: str
    company_name: str
    year: int
    month: int
    period_label: str


class ReportExportHistoryResponse(BaseModel):
    items: List[ReportExportHistoryItem]
    total: int
    limit: int
    offset: int


def _to_http_exception(exc: Exception) -> HTTPException:
    if isinstance(exc, ReportNotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, ReportValidationError):
        return HTTPException(status_code=400, detail=str(exc))
    logger.exception("Unexpected report service error: %s", exc)
    return HTTPException(
        status_code=500,
        detail=f"Unexpected report service error: {type(exc).__name__}: {exc}",
    )


@router.get("/years", response_model=ReportYearsResponse)
async def get_report_years(
    company_id: str = Query(...),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        years = await AdminReportService.get_available_years(db, company_id)
        return ReportYearsResponse(company_id=company_id, years=years)
    except Exception as exc:
        raise _to_http_exception(exc) from exc


@router.get("/months", response_model=ReportMonthsResponse)
async def get_report_months(
    company_id: str = Query(...),
    year: int = Query(...),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        months = await AdminReportService.get_available_months(db, company_id, year)
        return ReportMonthsResponse(
            company_id=company_id,
            year=year,
            months=[ReportMonthOption(**m) for m in months],
        )
    except Exception as exc:
        raise _to_http_exception(exc) from exc


@router.get("/preview", response_model=ReportPreviewResponse)
async def get_report_preview(
    cluster_id: str = Query(...),
    company_id: str = Query(...),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        preview = await AdminReportService.build_report_preview(
            db=db,
            cluster_id=cluster_id,
            company_id=company_id,
            year=year,
            month=month,
        )
        return ReportPreviewResponse.model_validate(preview)
    except Exception as exc:
        raise _to_http_exception(exc) from exc


@router.get("/export/pdf", dependencies=[rate_limit_heavy()])
async def export_report_pdf(
    cluster_id: str = Query(...),
    company_id: str = Query(...),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        preview = await AdminReportService.build_report_preview(
            db=db,
            cluster_id=cluster_id,
            company_id=company_id,
            year=year,
            month=month,
        )
        file_name = f"Financial_Report_{company_id}_{year}_{month:02d}.pdf"
        pdf_bytes = AdminReportService.generate_pdf(preview)
        await AdminReportService.record_export(
            db=db,
            exported_by=current_user.user_id,
            export_format="PDF",
            file_name=file_name,
            preview=preview,
        )
        await db.commit()

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={file_name}",
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except Exception as exc:
        raise _to_http_exception(exc) from exc


@router.get("/export/excel", dependencies=[rate_limit_heavy()])
async def export_report_excel(
    cluster_id: str = Query(...),
    company_id: str = Query(...),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        preview = await AdminReportService.build_report_preview(
            db=db,
            cluster_id=cluster_id,
            company_id=company_id,
            year=year,
            month=month,
        )
        file_name = f"Financial_Report_{company_id}_{year}_{month:02d}.xlsx"
        excel_bytes = AdminReportService.generate_excel(preview)
        await AdminReportService.record_export(
            db=db,
            exported_by=current_user.user_id,
            export_format="EXCEL",
            file_name=file_name,
            preview=preview,
        )
        await db.commit()

        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={file_name}",
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except Exception as exc:
        raise _to_http_exception(exc) from exc


@router.get("/history", response_model=ReportExportHistoryResponse)
async def get_report_export_history(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        history = await AdminReportService.list_export_history(db, limit=limit, offset=offset)
        return ReportExportHistoryResponse.model_validate(history)
    except Exception as exc:
        raise _to_http_exception(exc) from exc
