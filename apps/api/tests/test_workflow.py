"""
Test Report Workflow API
Tests for submit → approve, submit → reject, and resubmit flows.
Verifies transactional integrity.
"""
import pytest
import pytest_asyncio
from uuid import uuid4
from datetime import datetime
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from src.main import app
from src.db.models import (
    Base, User, UserRole, Company, Cluster, Report, ReportStatus,
    FinancialMonthly, Scenario, Notification, ReportStatusHistory
)
from src.db.session import AsyncSessionLocal, get_async_db
from src.config.settings import settings


# ============ TEST FIXTURES ============

# Use test database
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def test_engine():
    """Create test database engine"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db(test_engine):
    """Create test database session"""
    async_session = sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def seed_data(test_db):
    """Seed test data"""
    # Create cluster
    cluster = Cluster(
        id=uuid4(),
        name="Test Cluster",
        code="TEST",
        is_active=True
    )
    test_db.add(cluster)
    
    # Create company
    company = Company(
        id=uuid4(),
        name="Test Company",
        code="TC001",
        cluster_id=cluster.id,
        fy_start_month=1,
        is_active=True
    )
    test_db.add(company)
    
    # Create FO user
    fo_user = User(
        id=uuid4(),
        email="fo@test.com",
        name="Test FO",
        role=UserRole.DATA_OFFICER,
        company_id=company.id,
        is_active=True
    )
    test_db.add(fo_user)
    
    # Create FD user
    fd_user = User(
        id=uuid4(),
        email="fd@test.com",
        name="Test FD",
        role=UserRole.COMPANY_DIRECTOR,
        cluster_id=cluster.id,
        is_active=True
    )
    test_db.add(fd_user)
    
    # Create admin user
    admin_user = User(
        id=uuid4(),
        email="admin@test.com",
        name="Test Admin",
        role=UserRole.ADMIN,
        is_active=True
    )
    test_db.add(admin_user)
    
    await test_db.commit()
    
    return {
        "cluster": cluster,
        "company": company,
        "fo_user": fo_user,
        "fd_user": fd_user,
        "admin_user": admin_user
    }


@pytest_asyncio.fixture
async def client(test_db, seed_data):
    """Create test client with dependency override"""
    
    async def override_get_db():
        yield test_db
    
    app.dependency_overrides[get_async_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


def get_auth_header(user_email: str) -> dict:
    """Create auth header for test user (dev mode)"""
    return {"X-Dev-User-Email": user_email}


# ============ TEST: SUBMIT → APPROVE FLOW ============

class TestSubmitApproveFlow:
    """Test the complete submit → approve workflow"""
    
    @pytest.mark.asyncio
    async def test_create_report_as_fo(self, client, seed_data):
        """FO can create a report"""
        response = await client.post(
            "/fo/reports",
            json={
                "company_id": str(seed_data["company"].id),
                "year": 2025,
                "month": 1
            },
            headers=get_auth_header("fo@test.com")
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "draft"
        assert data["year"] == 2025
        assert data["month"] == 1
    
    @pytest.mark.asyncio
    async def test_save_financials(self, client, seed_data, test_db):
        """FO can save financial data"""
        # First create report
        report = Report(
            id=uuid4(),
            company_id=seed_data["company"].id,
            year=2025,
            month=1,
            status=ReportStatus.DRAFT,
            author_id=seed_data["fo_user"].id
        )
        test_db.add(report)
        await test_db.commit()
        
        response = await client.put(
            f"/fo/reports/{report.id}/financials",
            json={
                "revenue_lkr": 1000000,
                "gp": 300000,
                "exchange_rate": 295
            },
            headers=get_auth_header("fo@test.com")
        )
        
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_submit_report(self, client, seed_data, test_db):
        """FO can submit a report"""
        # Create report and financials
        report = Report(
            id=uuid4(),
            company_id=seed_data["company"].id,
            year=2025,
            month=2,
            status=ReportStatus.DRAFT,
            author_id=seed_data["fo_user"].id
        )
        test_db.add(report)
        
        financial = FinancialMonthly(
            id=uuid4(),
            company_id=seed_data["company"].id,
            year=2025,
            month=2,
            scenario=Scenario.ACTUAL,
            exchange_rate=295,
            revenue_lkr=1000000,
            gp=300000
        )
        test_db.add(financial)
        await test_db.commit()
        
        response = await client.post(
            f"/fo/reports/{report.id}/submit",
            json={"fo_comment": "Ready for review"},
            headers=get_auth_header("fo@test.com")
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Verify status changed
        await test_db.refresh(report)
        assert report.status == ReportStatus.SUBMITTED
    
    @pytest.mark.asyncio
    async def test_fd_can_see_pending(self, client, seed_data, test_db):
        """FD can see pending reports"""
        # Create submitted report
        report = Report(
            id=uuid4(),
            company_id=seed_data["company"].id,
            year=2025,
            month=3,
            status=ReportStatus.SUBMITTED,
            author_id=seed_data["fo_user"].id,
            submitted_at=datetime.utcnow()
        )
        test_db.add(report)
        await test_db.commit()
        
        response = await client.get(
            "/fd/pending",
            headers=get_auth_header("fd@test.com")
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
    
    @pytest.mark.asyncio
    async def test_fd_approve_report(self, client, seed_data, test_db):
        """FD can approve a report"""
        report = Report(
            id=uuid4(),
            company_id=seed_data["company"].id,
            year=2025,
            month=4,
            status=ReportStatus.SUBMITTED,
            author_id=seed_data["fo_user"].id,
            submitted_at=datetime.utcnow()
        )
        test_db.add(report)
        await test_db.commit()
        
        response = await client.post(
            f"/fd/reports/{report.id}/approve",
            json={"comment": "Looks good!"},
            headers=get_auth_header("fd@test.com")
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Verify status changed
        await test_db.refresh(report)
        assert report.status == ReportStatus.APPROVED
    
    @pytest.mark.asyncio
    async def test_notification_created_on_approve(self, client, seed_data, test_db):
        """Notification is created when report is approved"""
        report = Report(
            id=uuid4(),
            company_id=seed_data["company"].id,
            year=2025,
            month=5,
            status=ReportStatus.SUBMITTED,
            author_id=seed_data["fo_user"].id,
            submitted_at=datetime.utcnow()
        )
        test_db.add(report)
        await test_db.commit()
        
        await client.post(
            f"/fd/reports/{report.id}/approve",
            json={"comment": "Approved"},
            headers=get_auth_header("fd@test.com")
        )
        
        # Check notification exists
        result = await test_db.execute(
            select(Notification).where(Notification.user_id == seed_data["fo_user"].id)
        )
        notifications = result.scalars().all()
        
        assert len(notifications) >= 1
        assert "approved" in notifications[-1].title.lower() or "approved" in notifications[-1].message.lower()


# ============ TEST: SUBMIT → REJECT → RESUBMIT FLOW ============

class TestRejectResubmitFlow:
    """Test the submit → reject → resubmit workflow"""
    
    @pytest.mark.asyncio
    async def test_fd_reject_report(self, client, seed_data, test_db):
        """FD can reject a report"""
        report = Report(
            id=uuid4(),
            company_id=seed_data["company"].id,
            year=2025,
            month=6,
            status=ReportStatus.SUBMITTED,
            author_id=seed_data["fo_user"].id,
            submitted_at=datetime.utcnow()
        )
        test_db.add(report)
        await test_db.commit()
        
        response = await client.post(
            f"/fd/reports/{report.id}/reject",
            json={"reason": "Revenue figures seem incorrect. Please verify."},
            headers=get_auth_header("fd@test.com")
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Verify status changed
        await test_db.refresh(report)
        assert report.status == ReportStatus.REJECTED
    
    @pytest.mark.asyncio
    async def test_rejection_requires_reason(self, client, seed_data, test_db):
        """Rejection must include a reason"""
        report = Report(
            id=uuid4(),
            company_id=seed_data["company"].id,
            year=2025,
            month=7,
            status=ReportStatus.SUBMITTED,
            author_id=seed_data["fo_user"].id,
            submitted_at=datetime.utcnow()
        )
        test_db.add(report)
        await test_db.commit()
        
        response = await client.post(
            f"/fd/reports/{report.id}/reject",
            json={},  # No reason
            headers=get_auth_header("fd@test.com")
        )
        
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_fo_can_edit_rejected_report(self, client, seed_data, test_db):
        """FO can edit a rejected report"""
        report = Report(
            id=uuid4(),
            company_id=seed_data["company"].id,
            year=2025,
            month=8,
            status=ReportStatus.REJECTED,
            author_id=seed_data["fo_user"].id,
            rejection_reason="Fix revenue"
        )
        test_db.add(report)
        
        financial = FinancialMonthly(
            id=uuid4(),
            company_id=seed_data["company"].id,
            year=2025,
            month=8,
            scenario=Scenario.ACTUAL,
            exchange_rate=295,
            revenue_lkr=900000
        )
        test_db.add(financial)
        await test_db.commit()
        
        response = await client.put(
            f"/fo/reports/{report.id}/financials",
            json={"revenue_lkr": 1100000},  # Corrected value
            headers=get_auth_header("fo@test.com")
        )
        
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_fo_can_resubmit_rejected(self, client, seed_data, test_db):
        """FO can resubmit a rejected report"""
        report = Report(
            id=uuid4(),
            company_id=seed_data["company"].id,
            year=2025,
            month=9,
            status=ReportStatus.REJECTED,
            author_id=seed_data["fo_user"].id,
            rejection_reason="Fix figures"
        )
        test_db.add(report)
        
        financial = FinancialMonthly(
            id=uuid4(),
            company_id=seed_data["company"].id,
            year=2025,
            month=9,
            scenario=Scenario.ACTUAL,
            exchange_rate=295,
            revenue_lkr=1000000,
            gp=300000
        )
        test_db.add(financial)
        await test_db.commit()
        
        response = await client.post(
            f"/fo/reports/{report.id}/submit",
            json={"fo_comment": "Fixed the revenue figures"},
            headers=get_auth_header("fo@test.com")
        )
        
        assert response.status_code == 200
        
        await test_db.refresh(report)
        assert report.status == ReportStatus.SUBMITTED


# ============ TEST: TRANSACTIONAL INTEGRITY ============

class TestTransactionalIntegrity:
    """Test that operations are atomic"""
    
    @pytest.mark.asyncio
    async def test_approve_creates_status_history(self, client, seed_data, test_db):
        """Approval creates status history record"""
        report = Report(
            id=uuid4(),
            company_id=seed_data["company"].id,
            year=2025,
            month=10,
            status=ReportStatus.SUBMITTED,
            author_id=seed_data["fo_user"].id,
            submitted_at=datetime.utcnow()
        )
        test_db.add(report)
        await test_db.commit()
        
        await client.post(
            f"/fd/reports/{report.id}/approve",
            json={},
            headers=get_auth_header("fd@test.com")
        )
        
        # Check history
        result = await test_db.execute(
            select(ReportStatusHistory).where(ReportStatusHistory.report_id == report.id)
        )
        history = result.scalars().all()
        
        assert len(history) >= 1
        assert any(h.to_status == ReportStatus.APPROVED for h in history)
    
    @pytest.mark.asyncio
    async def test_cannot_approve_draft(self, client, seed_data, test_db):
        """Cannot approve a draft report"""
        report = Report(
            id=uuid4(),
            company_id=seed_data["company"].id,
            year=2025,
            month=11,
            status=ReportStatus.DRAFT,  # Not submitted
            author_id=seed_data["fo_user"].id
        )
        test_db.add(report)
        await test_db.commit()
        
        response = await client.post(
            f"/fd/reports/{report.id}/approve",
            json={},
            headers=get_auth_header("fd@test.com")
        )
        
        assert response.status_code in [400, 403]
    
    @pytest.mark.asyncio
    async def test_cannot_submit_approved(self, client, seed_data, test_db):
        """Cannot submit an already approved report"""
        report = Report(
            id=uuid4(),
            company_id=seed_data["company"].id,
            year=2025,
            month=12,
            status=ReportStatus.APPROVED,
            author_id=seed_data["fo_user"].id
        )
        test_db.add(report)
        await test_db.commit()
        
        response = await client.post(
            f"/fo/reports/{report.id}/submit",
            json={},
            headers=get_auth_header("fo@test.com")
        )
        
        assert response.status_code in [400, 403]


# ============ RUN TESTS ============

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
