"""GraphQL request context: authenticated user, DB session, and DataLoaders."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from strawberry.fastapi import BaseContext

from app.core.database import AsyncSessionLocal
from app.core.security import decode_access_token
from app.graphql.dataloaders import DataLoaders
from app.models.user import User


@dataclass
class GraphQLContext(BaseContext):
    db: AsyncSession
    user: User | None
    loaders: DataLoaders | None = None

    @property
    def user_id(self) -> uuid.UUID:
        if self.user is None:
            raise ValueError("user required")
        return self.user.id


async def _resolve_user(db: AsyncSession, request: Request) -> User | None:
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    if payload is None:
        return None
    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_graphql_context(request: Request):
    """FastAPI/Strawberry context dependency with commit/rollback."""
    async with AsyncSessionLocal() as db:
        try:
            user = await _resolve_user(db, request)
            loaders = DataLoaders(db, user.id) if user else None
            yield GraphQLContext(db=db, user=user, loaders=loaders)
            await db.commit()
        except Exception:
            await db.rollback()
            raise
