from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import RedirectResponse

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.core.rate_limit import auth_rate_limiter, get_client_ip
from app.models.user import User
from app.schemas.security import (
    ForgotPasswordRequest,
    GitHubLoginInitRequest,
    GitHubLoginInitResponse,
    LoginRequest,
    MessageResponse,
    SignupRequest,
    TokenResponse,
)
from app.schemas.user import UserRead
from app.services.auth import (
    authenticate_user,
    create_user_with_password,
    exchange_github_code,
    fetch_github_user,
    generate_oauth_state,
    get_github_authorize_url,
    get_or_create_user_from_github,
    issue_token_for_user,
    validate_oauth_state,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/github/login", response_model=GitHubLoginInitResponse)
async def github_login_init(
    request: Request,
    _body: GitHubLoginInitRequest,
) -> GitHubLoginInitResponse:
    settings = get_settings()
    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth is not configured",
        )

    auth_rate_limiter.check(f"github-login:{get_client_ip(request)}")

    state = generate_oauth_state()
    return GitHubLoginInitResponse(redirect_url=get_github_authorize_url(state))


@router.get("/github/login")
async def github_login_legacy() -> RedirectResponse:
    settings = get_settings()
    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth is not configured",
        )
    state = generate_oauth_state()
    return RedirectResponse(url=get_github_authorize_url(state))


@router.get("/github/callback")
async def github_callback(
    db: DbSession,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    settings = get_settings()

    if error:
        params = urlencode({"error": error})
        return RedirectResponse(url=f"{settings.frontend_url}/login?{params}")

    if not code or not state or not validate_oauth_state(state):
        params = urlencode({"error": "invalid_oauth_state"})
        return RedirectResponse(url=f"{settings.frontend_url}/login?{params}")

    try:
        github_token = await exchange_github_code(code)
        github_user = await fetch_github_user(github_token)
        user = await get_or_create_user_from_github(db, github_user)
        access_token = issue_token_for_user(user)
    except Exception as exc:
        params = urlencode({"error": str(exc)})
        return RedirectResponse(url=f"{settings.frontend_url}/login?{params}")

    params = urlencode({"token": access_token})
    return RedirectResponse(url=f"{settings.frontend_url}/auth/callback?{params}")


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: Request, body: SignupRequest, db: DbSession) -> TokenResponse:
    auth_rate_limiter.check(f"signup:{get_client_ip(request)}")

    try:
        user = await create_user_with_password(
            db,
            name=body.name.strip(),
            email=body.email.lower(),
            password=body.password,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return TokenResponse(access_token=issue_token_for_user(user))


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, body: LoginRequest, db: DbSession) -> TokenResponse:
    auth_rate_limiter.check(f"login:{get_client_ip(request)}")

    user = await authenticate_user(db, body.email.lower(), body.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return TokenResponse(access_token=issue_token_for_user(user))


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(request: Request, body: ForgotPasswordRequest) -> MessageResponse:
    auth_rate_limiter.check(f"forgot-password:{get_client_ip(request)}")

    return MessageResponse(
        message=(
            "If an account exists for this email, you will receive instructions shortly. "
            "GitHub sign-in users can recover access via GitHub account settings."
        )
    )


@router.get("/me", response_model=UserRead)
async def get_me(current_user: CurrentUser) -> User:
    return current_user


@router.post("/logout", response_model=dict[str, str])
async def logout() -> dict[str, str]:
    return {"message": "Logged out successfully"}
