"""
Authentication Service
Supports both custom JWT tokens and Microsoft Entra ID (Azure AD) tokens
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
from src.config.settings import settings
from src.db.models import User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Authentication service supporting custom JWT and Microsoft Entra ID"""
    
    # JWKS cache for Entra ID tokens
    _jwks_cache: Dict[str, Any] = {}
    _jwks_cache_time: Optional[datetime] = None
    
    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(user_id: str, email: str, role: str) -> str:
        """Create a custom JWT access token"""
        expire = datetime.utcnow() + timedelta(hours=settings.jwt_expiration_hours)
        payload = {
            "sub": user_id,
            "email": email,
            "role": role,
            "exp": expire
        }
        return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    
    @staticmethod
    def decode_token(token: str) -> Optional[dict]:
        """Decode custom JWT token"""
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            return payload
        except JWTError:
            return None
    
    @staticmethod
    async def verify_entra_token(token: str) -> Optional[dict]:
        """
        Verify a Microsoft Entra ID (Azure AD) JWT token.
        Returns the decoded payload if valid, None otherwise.
        """
        if not settings.azure_tenant_id or not settings.azure_client_id:
            return None
        
        try:
            # Get JWKS from Microsoft
            jwks_url = f"https://login.microsoftonline.com/{settings.azure_tenant_id}/discovery/v2.0/keys"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(jwks_url)
                if response.status_code != 200:
                    return None
                jwks = response.json()
            
            # Get unverified header to find key ID
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")
            
            if not kid:
                return None
            
            # Find matching key
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
            
            # Verify and decode
            issuer = f"https://login.microsoftonline.com/{settings.azure_tenant_id}/v2.0"
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256"],
                audience=settings.azure_client_id,
                issuer=issuer
            )
            
            return payload
            
        except JWTError as e:
            print(f"Entra ID token verification failed: {e}")
            return None
        except Exception as e:
            print(f"Token verification error: {e}")
            return None
    
    @staticmethod
    async def authenticate(db: AsyncSession, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        result = await db.execute(
            select(User).where(User.email == email, User.is_active == True)
        )
        user = result.scalar_one_or_none()
        
        if user and AuthService.verify_password(password, user.password_hash):
            return user
        return None
    
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
        """Get user by ID"""
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """Get user by email address"""
        result = await db.execute(
            select(User).where(User.email == email, User.is_active == True)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_azure_oid(db: AsyncSession, azure_oid: str) -> Optional[User]:
        """Get user by Azure AD Object ID"""
        result = await db.execute(
            select(User).where(User.azure_oid == azure_oid, User.is_active == True)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_or_create_user_from_entra(
        db: AsyncSession,
        email: str,
        name: str,
        azure_oid: str,
        role: UserRole = UserRole.DATA_OFFICER
    ) -> User:
        """Get or create user from Entra ID token claims"""
        # Try to find by Azure OID first
        user = await AuthService.get_user_by_azure_oid(db, azure_oid)
        if user:
            return user
        
        # Try to find by email
        user = await AuthService.get_user_by_email(db, email)
        if user:
            # Update Azure OID
            user.azure_oid = azure_oid
            await db.commit()
            return user
        
        # Create new user
        user = User(
            email=email,
            name=name,
            password_hash=AuthService.hash_password("temp-change-me"),  # Placeholder
            azure_oid=azure_oid,
            role=role,
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
