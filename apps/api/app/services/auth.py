import secrets
from urllib.parse import urlencode

import httpx
import bcrypt
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token
from app.models.user import User

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"

# In-memory OAuth state store (use Redis in production at scale)
_oauth_states: dict[str, bool] = {}


def generate_oauth_state() -> str:
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = True
    return state


def validate_oauth_state(state: str) -> bool:
    return _oauth_states.pop(state, False)


def get_github_authorize_url(state: str) -> str:
    settings = get_settings()
    params = {
        "client_id": settings.github_client_id,
        "redirect_uri": settings.github_callback_url,
        "scope": "read:user user:email",
        "state": state,
    }
    return f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}"


async def exchange_github_code(code: str) -> str:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": settings.github_callback_url,
            },
        )
        response.raise_for_status()
        data = response.json()
        access_token = data.get("access_token")
        if not access_token:
            raise ValueError("GitHub did not return an access token")
        return access_token


async def fetch_github_user(access_token: str) -> dict:
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
    }
    async with httpx.AsyncClient() as client:
        user_response = await client.get(GITHUB_USER_URL, headers=headers)
        user_response.raise_for_status()
        user_data = user_response.json()

        if not user_data.get("email"):
            emails_response = await client.get(GITHUB_EMAILS_URL, headers=headers)
            emails_response.raise_for_status()
            emails = emails_response.json()
            primary = next(
                (e["email"] for e in emails if e.get("primary") and e.get("verified")),
                None,
            )
            if primary:
                user_data["email"] = primary
            elif emails:
                user_data["email"] = emails[0]["email"]

        return user_data


async def get_or_create_user_from_github(
    db: AsyncSession,
    github_data: dict,
) -> User:
    github_id = str(github_data["id"])
    email = github_data.get("email")
    if not email:
        raise ValueError("GitHub account has no public email. Please add one to your profile.")

    result = await db.execute(select(User).where(User.github_id == github_id))
    user = result.scalar_one_or_none()

    if user:
        user.name = github_data.get("name") or github_data.get("login") or user.name
        user.avatar_url = github_data.get("avatar_url")
        user.email = email
        await db.flush()
        return user

    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        existing.github_id = github_id
        existing.name = github_data.get("name") or github_data.get("login") or existing.name
        existing.avatar_url = github_data.get("avatar_url")
        await db.flush()
        return existing

    user = User(
        github_id=github_id,
        email=email,
        name=github_data.get("name") or github_data.get("login") or email.split("@")[0],
        avatar_url=github_data.get("avatar_url"),
    )
    db.add(user)
    await db.flush()
    return user


def issue_token_for_user(user: User) -> str:
    return create_access_token(
        subject=user.id,
        extra_claims={"email": user.email},
    )


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


async def create_user_with_password(
    db: AsyncSession,
    *,
    name: str,
    email: str,
    password: str,
) -> User:
    result = await db.execute(select(User).where(func.lower(User.email) == email.lower()))
    if result.scalar_one_or_none():
        raise ValueError("An account with this email already exists")

    user = User(
        email=email,
        name=name,
        password_hash=hash_password(password),
    )
    db.add(user)
    await db.flush()
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    result = await db.execute(select(User).where(func.lower(User.email) == email.lower()))
    user = result.scalar_one_or_none()
    if user is None or not user.password_hash:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
