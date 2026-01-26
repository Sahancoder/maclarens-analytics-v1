# EPIC 10: Testing & Quality Gates

## 10.1 FY Logic Tests

- **File**: `apps/api/tests/test_fy_logic.py`
- **Coverage**:
  - Jan-Dec (Calendar Year)
  - Apr-Mar (Fiscal Year)
  - Edge cases: Jan/Feb/Mar in Apr-Mar cycle
  - YTD calculation logic

## 10.2 Workflow Tests

- **File**: `apps/api/tests/test_workflow.py`
- **Coverage**:
  - `Submit` -> `Approve` flow
  - `Submit` -> `Reject` -> `Resubmit` flow
  - Transactional integrity (DB commits)
  - Notification generation

## 10.3 Security Tests

- **File**: `apps/api/tests/test_security_gates.py`
- **Coverage**:
  - **IDOR**: Users accessing other company/cluster data (blocked 403/404)
  - **Role Misuse**: FO approving reports, FD editing financials (blocked 403)
  - **Invalid Payloads**: Negative months, wrong types (blocked 422)

## 10.4 Performance Checks

- **File**: `apps/api/tests/check_performance.py`
- **Checks**:
  - **Pagination**: Scans routers for unpaginated lists
  - **N+1 Queries**: Scans code for loops containing DB awaits
  - **Indexing**: Checks `models.py` for `index=True` coverage
- **Note**: This static analysis ensures best practices without requiring a live, populated database for `EXPLAIN` plans.

## How to Run

**Prerequisites**:
Ensure testing dependencies are installed:

```powershell
pip install pytest pytest-asyncio httpx aiosqlite
```

**Run Tests**:

```powershell
cd apps/api

# Run logic and security tests (Pytest)
python -m pytest tests/test_fy_logic.py tests/test_workflow.py tests/test_security_gates.py -v

# Run performance static analysis
python tests/check_performance.py
```
