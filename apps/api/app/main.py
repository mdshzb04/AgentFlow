from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.startup_checks import run_startup_provider_checks
from app.graphql.schema import graphql_router
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.services.integrations.connection_service import connection_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if settings.is_development:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await connection_service.ensure_integration_catalog(session)
        await session.commit()
    app.state.provider_health = await run_startup_provider_checks()
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="AgentFlow CRM API",
        description="Backend API for AgentFlow CRM",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(SecurityHeadersMiddleware)

    app.include_router(api_router, prefix="/api/v1")
    app.include_router(graphql_router, prefix="/graphql")

    @app.get("/health")
    async def health_check() -> dict[str, str]:
        return {"status": "healthy"}

    @app.get("/health/providers")
    async def provider_health() -> dict:
        if settings.is_development:
            app.state.provider_health = await run_startup_provider_checks()
        return getattr(app.state, "provider_health", {})

    return app


app = create_app()
