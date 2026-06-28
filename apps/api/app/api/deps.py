import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

security_scheme = HTTPBearer(auto_error=False)


async def _resolve_user(db: AsyncSession, raw_token: str | None) -> User:
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(raw_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        ) from exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)] = None,
) -> User:
    raw: str | None = None
    if credentials is not None and credentials.scheme.lower() == "bearer":
        raw = credentials.credentials
    return await _resolve_user(db, raw)


async def get_current_user_for_oauth(
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)] = None,
    token: Annotated[str | None, Query()] = None,
) -> User:
    """Like get_current_user, but also accepts ?token= for browser-navigated OAuth starts.

    OAuth connect endpoints are reached via full-page browser navigation (<a href> /
    window.location.href), which cannot send an Authorization header. The frontend appends
    the user's short-lived JWT as a query param for that single redirect hop only.
    """
    raw: str | None = None
    if credentials is not None and credentials.scheme.lower() == "bearer":
        raw = credentials.credentials
    elif token:
        raw = token
    return await _resolve_user(db, raw)


CurrentUser = Annotated[User, Depends(get_current_user)]
OAuthCurrentUser = Annotated[User, Depends(get_current_user_for_oauth)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
