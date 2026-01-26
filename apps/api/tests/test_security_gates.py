"""
EPIC 10.3: Security Tests
Tests for IDOR attempts, role misuse, and invalid payloads.
"""
import pytest
import pytest_asyncio
from uuid import uuid4
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from src.main import app
from src.db.models import Base, User, UserRole, Company, Cluster, Report, ReportStatus
from src.db.session import get_async_db

# ============ TEST FIXTURES ============

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture
async def test_db(test_engine):
    async_session = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session

@pytest_asyncio.fixture
async def seed_security_data(test_db):
    """Seed data for security tests: 2 clusters, 2 companies, users for each"""
    # Cluster A
    cluster_a = Cluster(id=uuid4(), name="Cluster A", code="CLA", is_active=True)
    test_db.add(cluster_a)
    
    # Company A1 (in Cluster A)
    company_a1 = Company(id=uuid4(), name="Company A1", code="CA1", cluster_id=cluster_a.id, fy_start_month=1, is_active=True)
    test_db.add(company_a1)
    
    # Company A2 (in Cluster A)
    company_a2 = Company(id=uuid4(), name="Company A2", code="CA2", cluster_id=cluster_a.id, fy_start_month=1, is_active=True)
    test_db.add(company_a2)

    # Cluster B
    cluster_b = Cluster(id=uuid4(), name="Cluster B", code="CLB", is_active=True)
    test_db.add(cluster_b)

    # Company B1 (in Cluster B)
    company_b1 = Company(id=uuid4(), name="Company B1", code="CB1", cluster_id=cluster_b.id, fy_start_month=1, is_active=True)
    test_db.add(company_b1)

    # Users
    # FO for Company A1
    fo_a1 = User(id=uuid4(), email="fo_a1@test.com", name="FO A1", role=UserRole.DATA_OFFICER, company_id=company_a1.id, is_active=True)
    test_db.add(fo_a1)

    # FO for Company B1
    fo_b1 = User(id=uuid4(), email="fo_b1@test.com", name="FO B1", role=UserRole.DATA_OFFICER, company_id=company_b1.id, is_active=True)
    test_db.add(fo_b1)

    # FD for Cluster A
    fd_a = User(id=uuid4(), email="fd_a@test.com", name="FD Cluster A", role=UserRole.COMPANY_DIRECTOR, cluster_id=cluster_a.id, is_active=True)
    test_db.add(fd_a)

    # Report for Company A1
    report_a1 = Report(id=uuid4(), company_id=company_a1.id, year=2025, month=1, status=ReportStatus.DRAFT, author_id=fo_a1.id)
    test_db.add(report_a1)
    
    # Report for Company B1
    report_b1 = Report(id=uuid4(), company_id=company_b1.id, year=2025, month=1, status=ReportStatus.DRAFT, author_id=fo_b1.id)
    test_db.add(report_b1)

    await test_db.commit()
    return {
        "company_a1": company_a1,
        "company_b1": company_b1,
        "fo_a1": fo_a1,
        "fo_b1": fo_b1,
        "fd_a": fd_a,
        "report_a1": report_a1,
        "report_b1": report_b1
    }

@pytest_asyncio.fixture
async def client(test_db):
    async def override_get_db():
        yield test_db
    app.dependency_overrides[get_async_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

def get_auth_header(email: str):
    return {"X-Dev-User-Email": email}

# ============ TEST: IDOR PREVENTION ============

class TestIDORPrevention:
    
    @pytest.mark.asyncio
    async def test_fo_access_own_company_report(self, client, seed_security_data):
        """FO should be able to access their own company's report"""
        response = await client.get(
            f"/fo/reports/{seed_security_data['report_a1'].id}",
            headers=get_auth_header("fo_a1@test.com")
        )
        assert response.status_code == 200
        assert response.json()["id"] == str(seed_security_data["report_a1"].id)

    @pytest.mark.asyncio
    async def test_fo_cannot_access_other_company_report(self, client, seed_security_data):
        """IDOR: FO from Company A should NOT access Company B's report"""
        response = await client.get(
            f"/fo/reports/{seed_security_data['report_b1'].id}",
            headers=get_auth_header("fo_a1@test.com")
        )
        # Should return 404 (Not Found) or 403 (Forbidden). 
        # Ideally 404 to avoid leaking existence, but 403 is also acceptable security.
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_fo_cannot_create_report_for_other_company(self, client, seed_security_data):
        """IDOR: FO A1 cannot create report for Company B1"""
        response = await client.post(
            "/fo/reports",
            json={
                "company_id": str(seed_security_data["company_b1"].id),
                "year": 2025,
                "month": 2
            },
            headers=get_auth_header("fo_a1@test.com")
        )
        assert response.status_code in [403, 404, 400]

    @pytest.mark.asyncio
    async def test_fd_cannot_access_other_cluster_report(self, client, seed_security_data):
        """IDOR: FD Cluster A cannot access report from Cluster B"""
        response = await client.get(
            f"/fd/reports/{seed_security_data['report_b1'].id}",
            headers=get_auth_header("fd_a@test.com")
        )
        assert response.status_code in [403, 404]

# ============ TEST: ROLE MISUSE ============

class TestRoleMisuse:
    
    @pytest.mark.asyncio
    async def test_fo_cannot_approve_report(self, client, seed_security_data):
        """Role Misuse: FO tries to approve report (FD action)"""
        # Even their own report
        response = await client.post(
            f"/fd/reports/{seed_security_data['report_a1'].id}/approve",
            json={"comment": "Self approval attempt"},
            headers=get_auth_header("fo_a1@test.com") # Using FO creds on FD endpoint
        )
        # Should be blocked either by role check (403) or not found if router prefix splits roles
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_fd_cannot_edit_financials(self, client, seed_security_data):
        """Role Misuse: FD tries to edit financials (FO action)"""
        response = await client.put(
            f"/fo/reports/{seed_security_data['report_a1'].id}/financials",
            json={"revenue_lkr": 999},
            headers=get_auth_header("fd_a@test.com")
        )
        # Verify access control
        assert response.status_code == 403

# ============ TEST: INVALID PAYLOADS ============

class TestInvalidPayloads:
    
    @pytest.mark.asyncio
    async def test_create_report_invalid_month(self, client, seed_security_data):
        """Invalid Payload: Month 13"""
        response = await client.post(
            "/fo/reports",
            json={
                "company_id": str(seed_security_data["company_a1"].id),
                "year": 2025,
                "month": 13 
            },
            headers=get_auth_header("fo_a1@test.com")
        )
        # Should be 422 Unprocessable Entity (Pydantic validation)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_financials_negative_revenue(self, client, seed_security_data):
        """Validation: Negative revenue might be allowed (refunds?), 
        but let's check basic data types. String for int?"""
        response = await client.put(
            f"/fo/reports/{seed_security_data['report_a1'].id}/financials",
            json={"revenue_lkr": "lots of money"}, # Invalid type
            headers=get_auth_header("fo_a1@test.com")
        )
        assert response.status_code == 422

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
