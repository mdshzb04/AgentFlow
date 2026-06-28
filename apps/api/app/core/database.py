from collections.abc import AsyncGenerator
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()


def prepare_database_url(url: str) -> tuple[str, dict]:
    """Strip libpq-only query params and map sslmode to asyncpg connect_args."""
    parts = urlsplit(url)
    if not parts.query:
        connect_args = {"ssl": True} if "neon.tech" in url else {}
        return url, connect_args

    params = parse_qs(parts.query, keep_blank_values=True)
    connect_args: dict = {}
    sslmode = params.pop("sslmode", [None])[0]
    params.pop("channel_binding", None)
    if sslmode in ("require", "verify-full", "verify-ca") or "neon.tech" in url:
        connect_args["ssl"] = True

    query = urlencode({key: values[0] for key, values in params.items()})
    clean_url = urlunsplit((parts.scheme, parts.netloc, parts.path, query, parts.fragment))
    return clean_url, connect_args


database_url, connect_args = prepare_database_url(settings.database_url)

engine = create_async_engine(
    database_url,
    connect_args=connect_args,
    echo=settings.is_development,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
