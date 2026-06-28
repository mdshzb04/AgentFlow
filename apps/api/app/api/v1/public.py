from fastapi import APIRouter, Request

from app.api.deps import DbSession
from app.core.rate_limit import get_client_ip, public_form_rate_limiter
from app.models.security import PublicWebhookRequest as PublicWebhookRequestModel
from app.schemas.security import PublicWebhookRequest, PublicWebhookResponse

router = APIRouter(prefix="/public", tags=["public"])


@router.post("/webhooks", response_model=PublicWebhookResponse)
async def request_public_webhook(
    request: Request,
    body: PublicWebhookRequest,
    db: DbSession,
) -> PublicWebhookResponse:
    """Submit a public webhook access request (reviewed by the team)."""
    public_form_rate_limiter.check(f"public-webhook:{get_client_ip(request)}")

    record = PublicWebhookRequestModel(
        name=body.name,
        email=body.email,
        use_case=body.use_case,
        status="pending",
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return PublicWebhookResponse(
        id=str(record.id),
        message=(
            "Your webhook request has been submitted. "
            "Our team will review it and contact you at the provided email."
        ),
    )
