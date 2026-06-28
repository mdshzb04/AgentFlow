from fastapi import APIRouter, Request

from app.api.deps import DbSession
from app.core.rate_limit import get_client_ip, public_form_rate_limiter
from app.models.security import ContactSubmission
from app.schemas.security import ContactRequest, MessageResponse

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("", response_model=MessageResponse)
async def submit_contact(
    request: Request,
    body: ContactRequest,
    db: DbSession,
) -> MessageResponse:
    public_form_rate_limiter.check(f"contact:{get_client_ip(request)}")

    submission = ContactSubmission(
        name=body.name,
        email=body.email,
        subject=body.subject,
        message=body.message,
    )
    db.add(submission)
    await db.commit()

    return MessageResponse(message="Thank you! Your message has been received. We will respond soon.")
