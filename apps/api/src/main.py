"""
McLarens Analytics API - FastAPI Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from src.config.settings import settings
from src.db.session import init_db, close_db, AsyncSessionLocal
from src.gql_schema.schema import schema
from src.services.auth_service import AuthService
from src.services.health_service import HealthService
from src.db.models import UserRole


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown"""
    # Startup
    auth_mode = settings.auth_mode.value if hasattr(settings.auth_mode, 'value') else str(settings.auth_mode)
    email_provider = settings.email_provider.value if hasattr(settings.email_provider, 'value') else str(settings.email_provider)
    
    print("🚀 Starting McLarens Analytics API...")
    print(f"   📌 Environment: {settings.environment}")
    print(f"   🔐 Auth Mode: {auth_mode}")
    print(f"   📧 Email Provider: {email_provider} (enabled: {settings.email_enabled})")
    
    await init_db()
    print("✅ Database initialized")
    yield
    # Shutdown
    print("👋 Shutting down...")
    await close_db()


app = FastAPI(
    title="McLarens Analytics API",
    description="Enterprise financial analytics platform API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_context(request: Request):
    """Create GraphQL context with database session and authenticated user"""
    async with AsyncSessionLocal() as db:
        user = None
        auth_error = None
        
        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1].strip()
            auth_mode = settings.auth_mode.value if hasattr(settings.auth_mode, "value") else str(settings.auth_mode)

            if token:
                # Prefer Entra in production, but allow fallback to custom JWT
                if auth_mode == "entra":
                    entra_payload = await AuthService.verify_entra_token(token)
                    if entra_payload:
                        email = (
                            entra_payload.get("preferred_username")
                            or entra_payload.get("email")
                            or entra_payload.get("upn")
                        )
                        name = (
                            entra_payload.get("name")
                            or " ".join(filter(None, [entra_payload.get("given_name"), entra_payload.get("family_name")]))
                        )
                        oid = entra_payload.get("oid") or entra_payload.get("sub")
                        role = AuthService.role_from_entra_claims(entra_payload)

                        if email and oid:
                            user = await AuthService.get_or_create_user_from_entra(
                                db=db,
                                email=email,
                                name=name or email,
                                azure_oid=oid,
                                role=role or None,
                            )
                            if user and user.role in {UserRole.DATA_OFFICER, UserRole.COMPANY_DIRECTOR}:
                                if not user.company_id and not user.cluster_id:
                                    auth_error = "not_provisioned"
                                    user = None
                else:
                    payload = AuthService.decode_token(token)
                    if payload:
                        user = await AuthService.get_user_by_id(db, payload["sub"])
                    else:
                        entra_payload = await AuthService.verify_entra_token(token)
                        if entra_payload:
                            email = (
                                entra_payload.get("preferred_username")
                                or entra_payload.get("email")
                                or entra_payload.get("upn")
                            )
                            name = (
                                entra_payload.get("name")
                                or " ".join(filter(None, [entra_payload.get("given_name"), entra_payload.get("family_name")]))
                            )
                            oid = entra_payload.get("oid") or entra_payload.get("sub")
                            role = AuthService.role_from_entra_claims(entra_payload)

                            if email and oid:
                                user = await AuthService.get_or_create_user_from_entra(
                                    db=db,
                                    email=email,
                                    name=name or email,
                                    azure_oid=oid,
                                    role=role or None,
                                )
                                if user and user.role in {UserRole.DATA_OFFICER, UserRole.COMPANY_DIRECTOR}:
                                    if not user.company_id and not user.cluster_id:
                                        auth_error = "not_provisioned"
                                        user = None
        
        return {
            "db": db,
            "user": user,
            "auth_error": auth_error,
            "request": request
        }


# GraphQL router
graphql_app = GraphQLRouter(
    schema,
    context_getter=get_context
)

app.include_router(graphql_app, prefix="/graphql")


# ============ HEALTH CHECK ENDPOINTS ============

@app.get("/")
async def root():
    return {
        "message": "McLarens Analytics API",
        "status": "running",
        "graphql": "/graphql",
        "docs": "/docs",
        "health": "/health/full"
    }


@app.get("/health")
async def health_quick():
    """Quick health check - just confirms API is running"""
    return {"status": "healthy", "service": "mclarens-api"}


@app.get("/health/db")
async def health_database():
    """Check database connection"""
    async with AsyncSessionLocal() as db:
        return await HealthService.check_database(db)


@app.get("/health/email")
async def health_email():
    """Check email provider status"""
    return await HealthService.check_email()


@app.get("/health/redis")
async def health_redis():
    """Check Redis connection"""
    return await HealthService.check_redis()


@app.get("/health/full")
async def health_full():
    """Full system health check - all components"""
    async with AsyncSessionLocal() as db:
        return await HealthService.get_full_health(db)


@app.get("/health/config")
async def health_config():
    """Get current configuration (non-sensitive)"""
    return HealthService.get_config_summary()
