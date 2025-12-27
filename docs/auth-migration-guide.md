# Authentication Migration Guide: Entra ID (Azure AD) Integration

> **Version:** 1.0  
> **Last Updated:** 2025-12-27  
> **Target:** Production-ready Microsoft Entra ID SSO

---

## 📋 Overview

This guide covers migrating from username/password authentication to **Microsoft Entra ID (Azure AD)** SSO for enterprise authentication.

### Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Entra ID   │────▶│   Backend   │
│  (Next.js)  │     │  (OAuth 2.0) │     │  (FastAPI)  │
└─────────────┘     └──────────────┘     └─────────────┘
      │                    │                    │
      │  1. Redirect       │                    │
      │─────────────────▶  │                    │
      │                    │                    │
      │  2. Auth Code      │                    │
      │◀─────────────────  │                    │
      │                    │                    │
      │  3. Token Exchange │                    │
      │────────────────────│───────────────────▶│
      │                    │                    │
      │  4. JWT + User     │                    │
      │◀───────────────────│────────────────────│
```

---

## 🔧 Entra ID Configuration

### 1. App Registration (Azure Portal)

1. Go to **Azure Portal** → **Entra ID** → **App Registrations**
2. Click **New Registration**
3. Configure:
   - **Name:** `McLarens Analytics`
   - **Supported account types:** Single tenant (or Multi-tenant)
   - **Redirect URI (Web):**
     - Dev: `http://localhost:3000/api/auth/callback/azure-ad`
     - Prod: `https://your-domain.com/api/auth/callback/azure-ad`

### 2. Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Copy the **Value** (not the ID) - save securely!

### 3. API Permissions

Add these permissions (Delegated):

- `openid`
- `profile`
- `email`
- `User.Read`

### 4. Token Configuration (Optional)

Add optional claims:

- `email`
- `preferred_username`
- `groups` (if using AD groups for roles)

### 5. Capture Configuration Values

```env
AZURE_AD_CLIENT_ID=<Application (client) ID>
AZURE_AD_CLIENT_SECRET=<Client secret value>
AZURE_AD_TENANT_ID=<Directory (tenant) ID>
```

---

## 🖥️ Backend Implementation (FastAPI)

### Dependencies

```bash
pip install python-jose[cryptography] httpx
```

### Environment Variables

```env
# .env
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_ISSUER=https://login.microsoftonline.com/{tenant-id}/v2.0
AZURE_AD_JWKS_URL=https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys
```

### Token Validation Service

```python
# src/services/entra_auth_service.py
import httpx
from jose import jwt, JWTError
from jose.backends import RSAKey
from datetime import datetime
from typing import Optional, Dict, Any
import json

class EntraAuthService:
    """Microsoft Entra ID (Azure AD) Token Validation"""

    def __init__(self, tenant_id: str, client_id: str):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.issuer = f"https://login.microsoftonline.com/{tenant_id}/v2.0"
        self.jwks_url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
        self._jwks_cache: Dict[str, Any] = {}
        self._jwks_cache_time: Optional[datetime] = None

    async def get_jwks(self) -> Dict[str, Any]:
        """Fetch and cache JWKS (JSON Web Key Set)"""
        # Cache for 1 hour
        if self._jwks_cache and self._jwks_cache_time:
            if (datetime.utcnow() - self._jwks_cache_time).seconds < 3600:
                return self._jwks_cache

        async with httpx.AsyncClient() as client:
            response = await client.get(self.jwks_url)
            response.raise_for_status()
            self._jwks_cache = response.json()
            self._jwks_cache_time = datetime.utcnow()
            return self._jwks_cache

    async def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate Entra ID JWT token

        Returns claims dict if valid, None if invalid
        """
        try:
            # Get unverified header to find the key ID
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")

            if not kid:
                return None

            # Get JWKS and find matching key
            jwks = await self.get_jwks()
            rsa_key = None

            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    rsa_key = {
                        "kty": key["kty"],
                        "kid": key["kid"],
                        "use": key["use"],
                        "n": key["n"],
                        "e": key["e"]
                    }
                    break

            if not rsa_key:
                return None

            # Verify and decode token
            claims = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256"],
                audience=self.client_id,
                issuer=self.issuer,
                options={
                    "verify_exp": True,
                    "verify_aud": True,
                    "verify_iss": True
                }
            )

            return claims

        except JWTError as e:
            print(f"JWT validation error: {e}")
            return None
        except Exception as e:
            print(f"Token validation error: {e}")
            return None

    def extract_user_info(self, claims: Dict[str, Any]) -> Dict[str, Any]:
        """Extract user information from validated claims"""
        return {
            "oid": claims.get("oid"),  # Object ID (unique user identifier)
            "email": claims.get("email") or claims.get("preferred_username"),
            "name": claims.get("name"),
            "roles": claims.get("roles", []),
            "groups": claims.get("groups", []),
            "tenant_id": claims.get("tid")
        }
```

### GraphQL Auth Middleware

```python
# src/middleware/auth_middleware.py
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from src.services.entra_auth_service import EntraAuthService
from src.config.settings import settings

entra_service = EntraAuthService(
    tenant_id=settings.AZURE_AD_TENANT_ID,
    client_id=settings.AZURE_AD_CLIENT_ID
)

class EntraAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization", "")
        token = None

        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

        if token:
            claims = await entra_service.validate_token(token)
            if claims:
                user_info = entra_service.extract_user_info(claims)
                request.state.user = user_info
                request.state.authenticated = True
            else:
                request.state.user = None
                request.state.authenticated = False
        else:
            request.state.user = None
            request.state.authenticated = False

        response = await call_next(request)
        return response
```

### User Sync Service

```python
# src/services/user_sync_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import User, UserRole
from typing import Dict, Any, Optional

class UserSyncService:
    """Sync Entra ID users with local database"""

    @staticmethod
    async def get_or_create_user(
        db: AsyncSession,
        entra_claims: Dict[str, Any]
    ) -> User:
        """
        Get existing user or create from Entra ID claims.
        Maps AD groups/roles to application roles.
        """
        email = entra_claims.get("email")
        oid = entra_claims.get("oid")

        # Try to find by Azure OID first, then by email
        user = await db.execute(
            select(User).where(
                (User.azure_oid == oid) | (User.email == email)
            )
        )
        user = user.scalar_one_or_none()

        if user:
            # Update Azure OID if not set
            if not user.azure_oid:
                user.azure_oid = oid
                await db.commit()
            return user

        # Create new user
        role = UserSyncService._map_role(entra_claims.get("roles", []))

        new_user = User(
            email=email,
            name=entra_claims.get("name", email),
            azure_oid=oid,
            role=role,
            is_active=True
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        return new_user

    @staticmethod
    def _map_role(azure_roles: list) -> UserRole:
        """Map Azure AD roles to application roles"""
        # Customize based on your AD group names
        if "CEO" in azure_roles or "GroupCEO" in azure_roles:
            return UserRole.CEO
        elif "Admin" in azure_roles or "ITAdmin" in azure_roles:
            return UserRole.ADMIN
        elif "Director" in azure_roles or "CompanyDirector" in azure_roles:
            return UserRole.COMPANY_DIRECTOR
        else:
            return UserRole.DATA_OFFICER
```

---

## 🌐 Frontend Implementation (Next.js)

### NextAuth.js Setup

```bash
npm install next-auth
```

### NextAuth Configuration

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

const handler = NextAuth({
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: "openid email profile User.Read",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the Azure AD access token
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Make token available to client
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
});

export { handler as GET, handler as POST };
```

### Environment Variables

```env
# .env.local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-min-32-chars

AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id
```

### Auth Hook

```typescript
// hooks/useEntraAuth.ts
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export function useEntraAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const login = () => {
    signIn("azure-ad", { callbackUrl: "/dashboard" });
  };

  const logout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const getAccessToken = (): string | null => {
    return session?.accessToken || null;
  };

  return {
    user: session?.user,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    accessToken: getAccessToken(),
    login,
    logout,
  };
}
```

### GraphQL Client with Auth

```typescript
// lib/graphql-client.ts
import { GraphQLClient } from "graphql-request";
import { getSession } from "next-auth/react";

export async function getAuthenticatedClient(): Promise<GraphQLClient> {
  const session = await getSession();

  const client = new GraphQLClient(
    process.env.NEXT_PUBLIC_API_URL + "/graphql",
    {
      headers: session?.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {},
    }
  );

  return client;
}
```

---

## 🔄 Migration Steps

### Phase 1: Preparation

- [ ] Register app in Azure Entra ID
- [ ] Configure redirect URIs (dev + prod)
- [ ] Create client secret
- [ ] Document all configuration values

### Phase 2: Backend

- [ ] Add `azure_oid` column to Users table
- [ ] Implement `EntraAuthService`
- [ ] Add auth middleware
- [ ] Create user sync service
- [ ] Test token validation locally

### Phase 3: Frontend

- [ ] Install NextAuth.js
- [ ] Configure Azure AD provider
- [ ] Update login page
- [ ] Update GraphQL client
- [ ] Test full SSO flow

### Phase 4: Rollout

- [ ] Deploy to staging
- [ ] Test with pilot users
- [ ] Verify role mapping
- [ ] Monitor auth logs
- [ ] Enable for all users

---

## 🔍 Debugging

### Common Issues

| Issue                         | Solution                                  |
| ----------------------------- | ----------------------------------------- |
| AADSTS700016: App not found   | Verify client ID and tenant ID            |
| AADSTS65001: Consent required | Admin grant permissions in Azure          |
| Invalid signature             | JWKS cache stale - restart or clear cache |
| Missing email claim           | Add `email` to token configuration        |
| Role not mapping              | Check AD group names match code           |

### Logging

```python
# Enable debug logging for troubleshooting
import logging
logging.getLogger("jose").setLevel(logging.DEBUG)
```

---

## ✅ Security Checklist

- [ ] Token expiry enforced (`exp` claim validated)
- [ ] Audience verified (`aud` matches client ID)
- [ ] Issuer verified (`iss` matches tenant)
- [ ] JWKS fetched over HTTPS only
- [ ] Client secret stored in environment vars (not code)
- [ ] Refresh tokens handled securely
- [ ] Session timeout configured
- [ ] CORS properly configured for auth endpoints
