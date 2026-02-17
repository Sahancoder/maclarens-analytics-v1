# RBAC (Role-Based Access Control) - PostgreSQL Queries

## Database Schema

### Tables

1. **user_master**: Contains user information
   - `user_id` (PK)
   - `user_email`
   - `first_name`, `last_name`
   - `is_active` (boolean)

2. **user_company_role_map**: Maps users to companies and roles
   - `user_id` (FK → user_master)
   - `company_id` (FK → company_master)
   - `role_id` (FK → role_master)
   - `is_active` (boolean)

3. **role_master**: Defines roles
   - `role_id` (PK)
   - `role_name`

### Role Definitions

- **1** = Finance Officer
- **2** = Finance Director
- **3** = Admin (has access to ALL portals)
- **4** = MD (Managing Director)

---

## Portal Access Rules

### Finance Officer Portal

**Allowed Roles**: Finance Officer (1) OR Admin (3)

```sql
SELECT
    um.user_id,
    um.user_email,
    um.first_name,
    um.last_name,
    ucrm.role_id,
    rm.role_name,
    ucrm.company_id
FROM analytics.user_master um
INNER JOIN analytics.user_company_role_map ucrm
    ON um.user_id = ucrm.user_id
INNER JOIN analytics.role_master rm
    ON ucrm.role_id = rm.role_id
WHERE um.user_email = :email
  AND um.is_active = true
  AND ucrm.is_active = true
  AND ucrm.role_id IN (1, 3);  -- Finance Officer OR Admin
```

### Finance Director Portal

**Allowed Roles**: Finance Director (2) OR Admin (3)

```sql
SELECT
    um.user_id,
    um.user_email,
    um.first_name,
    um.last_name,
    ucrm.role_id,
    rm.role_name,
    ucrm.company_id
FROM analytics.user_master um
INNER JOIN analytics.user_company_role_map ucrm
    ON um.user_id = ucrm.user_id
INNER JOIN analytics.role_master rm
    ON ucrm.role_id = rm.role_id
WHERE um.user_email = :email
  AND um.is_active = true
  AND ucrm.is_active = true
  AND ucrm.role_id IN (2, 3);  -- Finance Director OR Admin
```

### Administrator Portal

**Allowed Roles**: Admin (3) ONLY

```sql
SELECT
    um.user_id,
    um.user_email,
    um.first_name,
    um.last_name,
    ucrm.role_id,
    rm.role_name,
    ucrm.company_id
FROM analytics.user_master um
INNER JOIN analytics.user_company_role_map ucrm
    ON um.user_id = ucrm.user_id
INNER JOIN analytics.role_master rm
    ON ucrm.role_id = rm.role_id
WHERE um.user_email = :email
  AND um.is_active = true
  AND ucrm.is_active = true
  AND ucrm.role_id = 3;  -- Admin only
```

### MD (Managing Director) Portal

**Allowed Roles**: MD (4) OR Admin (3)

```sql
SELECT
    um.user_id,
    um.user_email,
    um.first_name,
    um.last_name,
    ucrm.role_id,
    rm.role_name,
    ucrm.company_id
FROM analytics.user_master um
INNER JOIN analytics.user_company_role_map ucrm
    ON um.user_id = ucrm.user_id
INNER JOIN analytics.role_master rm
    ON ucrm.role_id = rm.role_id
WHERE um.user_email = :email
  AND um.is_active = true
  AND ucrm.is_active = true
  AND ucrm.role_id IN (4, 3);  -- MD OR Admin
```

---

## FastAPI Implementation

### Current Implementation Location

This RBAC logic is already implemented in:

- **File**: `apps/api/src/services/auth_service.py`
- **Function**: `check_portal_access()`

### Portal Constants

```python
# apps/api/src/config/constants.py
class RoleID:
    FINANCIAL_OFFICER = 1
    FINANCIAL_DIRECTOR = 2
    SYSTEM_ADMIN = 3
    MANAGING_DIRECTOR = 4

# Portal-to-Role mapping
PORTAL_ROLE_MAP = {
    "finance-officer": [RoleID.FINANCIAL_OFFICER, RoleID.SYSTEM_ADMIN],
    "finance-director": [RoleID.FINANCIAL_DIRECTOR, RoleID.SYSTEM_ADMIN],
    "system-admin": [RoleID.SYSTEM_ADMIN],
    "md": [RoleID.MANAGING_DIRECTOR, RoleID.SYSTEM_ADMIN],
}
```

### Usage Example (already implemented)

```python
from src.services.auth_service import AuthService

# Check if user has access to a specific portal
user_context = await AuthService.check_portal_access(
    db=db,
    email="sahanviranga18@gmail.com",
    portal="finance-officer"
)

if user_context:
    # User has access
    # Returns: {"user": UserMaster, "role": "Finance Officer", "role_id": 1, ...}
else:
    # Access denied
```

---

## Test Your Access

### Using dev mode (localhost):

```bash
curl -X POST http://localhost:8000/auth/login/dev \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sahanviranga18@gmail.com",
    "portal": "finance-officer"
  }'
```

### Expected Response:

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "U0048",
    "email": "sahanviranga18@gmail.com",
    "name": "Sahan Viranga",
    "role": "Admin",
    "role_id": 3,
    "portal": "finance-officer",
    "companies": ["CC0001", "CC0002", ...]
  }
}
```

---

## Verification Query

To verify your access, run this in the database:

```sql
SELECT
    um.user_email,
    rm.role_name,
    COUNT(DISTINCT ucrm.company_id) as company_count,
    STRING_AGG(DISTINCT ucrm.company_id::text, ', ') as companies
FROM analytics.user_master um
INNER JOIN analytics.user_company_role_map ucrm ON um.user_id = ucrm.user_id
INNER JOIN analytics.role_master rm ON ucrm.role_id = rm.role_id
WHERE um.user_email = 'sahanviranga18@gmail.com'
  AND um.is_active = true
  AND ucrm.is_active = true
GROUP BY um.user_email, rm.role_name;
```

This should show:

```
user_email                  | role_name | company_count | companies
----------------------------|-----------|---------------|----------
sahanviranga18@gmail.com    | Admin     | 89            | CC0001, CC0002, ...
```
