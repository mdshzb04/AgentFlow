import uuid
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.api.deps import CurrentUser, DbSession
from app.core.rate_limit import get_client_ip, public_form_rate_limiter
from app.models.integration_platform import WebhookDirection, WebhookLogStatus
from app.schemas.integration_platform import (
    WebhookCreateRequest,
    WebhookCreateResponse,
    WebhookDeliverRequest,
    WebhookEndpointRead,
    WebhookLogRead,
    WebhookRotateResponse,
)
from app.services import workflow_executor
from app.services.integrations.connection_service import connection_service
from app.services.integrations.webhook_service import webhook_service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

webhook_rate_limiter = public_form_rate_limiter


def _endpoint_read(endpoint, url: str | None = None) -> WebhookEndpointRead:
    return WebhookEndpointRead(
        id=endpoint.id,
        name=endpoint.name,
        direction=endpoint.direction.value,
        url=url,
        target_url=endpoint.target_url,
        workflow_id=endpoint.workflow_id,
        is_active=endpoint.is_active,
        created_at=endpoint.created_at,
        updated_at=endpoint.updated_at,
    )


@router.get("", response_model=list[WebhookEndpointRead])
async def list_webhooks(current_user: CurrentUser, db: DbSession) -> list[WebhookEndpointRead]:
    endpoints = await webhook_service.list_endpoints(db, current_user.id)
    result = []
    for ep in endpoints:
        url = (
            webhook_service.build_inbound_url(ep.url_token)
            if ep.direction == WebhookDirection.INCOMING
            else ep.target_url
        )
        result.append(_endpoint_read(ep, url))
    return result


@router.post("", response_model=WebhookCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    body: WebhookCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> WebhookCreateResponse:
    if body.direction == "incoming":
        endpoint, secret = await webhook_service.create_incoming(
            db, current_user.id, name=body.name, workflow_id=body.workflow_id
        )
        url = webhook_service.build_inbound_url(endpoint.url_token)
        return WebhookCreateResponse(
            endpoint=_endpoint_read(endpoint, url),
            secret=secret,
        )
    if not body.target_url:
        raise HTTPException(status_code=400, detail="target_url required for outgoing webhooks")
    endpoint = await webhook_service.create_outgoing(
        db, current_user.id, name=body.name, target_url=body.target_url
    )
    return WebhookCreateResponse(
        endpoint=_endpoint_read(endpoint, body.target_url),
        secret=None,
        message="Outgoing webhook created.",
    )


@router.delete("/{endpoint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    endpoint_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    endpoint = await webhook_service.get_endpoint(db, endpoint_id, current_user.id)
    if endpoint is None:
        raise HTTPException(status_code=404, detail="Webhook not found")
    await webhook_service.delete_endpoint(db, endpoint)


@router.post("/{endpoint_id}/rotate-secret", response_model=WebhookRotateResponse)
async def rotate_webhook_secret(
    endpoint_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> WebhookRotateResponse:
    endpoint = await webhook_service.get_endpoint(db, endpoint_id, current_user.id)
    if endpoint is None:
        raise HTTPException(status_code=404, detail="Webhook not found")
    if endpoint.direction != WebhookDirection.INCOMING:
        raise HTTPException(status_code=400, detail="Only incoming webhooks have secrets")
    secret = await webhook_service.rotate_secret(db, endpoint)
    return WebhookRotateResponse(secret=secret)


@router.get("/logs", response_model=list[WebhookLogRead])
async def list_webhook_logs(
    current_user: CurrentUser,
    db: DbSession,
    endpoint_id: uuid.UUID | None = None,
    status_filter: str | None = None,
    limit: int = 50,
) -> list[WebhookLogRead]:
    log_status = WebhookLogStatus(status_filter) if status_filter else None
    logs = await webhook_service.list_logs(
        db, current_user.id, endpoint_id=endpoint_id, status=log_status, limit=limit
    )
    return [WebhookLogRead.model_validate(log) for log in logs]


@router.post("/logs/{log_id}/retry", response_model=WebhookLogRead)
async def retry_webhook_log(
    log_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> WebhookLogRead:
    logs = await webhook_service.list_logs(db, current_user.id, limit=200)
    log = next((l for l in logs if l.id == log_id), None)
    if log is None:
        raise HTTPException(status_code=404, detail="Log not found")
    updated = await webhook_service.retry_log(db, log, current_user.id)
    return WebhookLogRead.model_validate(updated)


@router.post("/deliver", response_model=WebhookLogRead)
async def deliver_outgoing_webhook(
    body: WebhookDeliverRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> WebhookLogRead:
    endpoint = await webhook_service.get_endpoint(db, body.endpoint_id, current_user.id)
    if endpoint is None:
        raise HTTPException(status_code=404, detail="Webhook not found")
    if endpoint.direction != WebhookDirection.OUTGOING:
        raise HTTPException(status_code=400, detail="Only outgoing webhooks can be delivered")
    log = await webhook_service.deliver_outgoing(db, endpoint, body.payload)
    return WebhookLogRead.model_validate(log)


@router.post("/inbound/{webhook_token}")
async def inbound_webhook(
    webhook_token: str,
    request: Request,
    db: DbSession,
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
) -> dict[str, Any]:
    webhook_rate_limiter.check(f"webhook-inbound:{webhook_token}:{get_client_ip(request)}")

    endpoint = await webhook_service.get_endpoint_by_token(db, webhook_token)
    if endpoint is None:
        raise HTTPException(status_code=404, detail="Webhook not found")

    stored_secret = ""
    if endpoint.connection_id:
        creds = await connection_service.get_credentials(db, endpoint.connection_id)
        stored_secret = creds.get("secret", "")

    if stored_secret and (
        not x_webhook_secret
        or not webhook_service.verify_inbound_secret(x_webhook_secret, endpoint, stored_secret)
    ):
        await webhook_service.log_delivery(
            db,
            endpoint=endpoint,
            direction=WebhookDirection.INCOMING,
            status=WebhookLogStatus.FAILED,
            request_payload={},
            status_code=401,
            error_message="Invalid webhook secret",
        )
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    try:
        payload = await request.json()
    except Exception:
        payload = {}

    if not endpoint.workflow_id:
        await webhook_service.log_delivery(
            db,
            endpoint=endpoint,
            direction=WebhookDirection.INCOMING,
            status=WebhookLogStatus.FAILED,
            request_payload=payload,
            status_code=400,
            error_message="Webhook not linked to a workflow",
        )
        raise HTTPException(status_code=400, detail="Webhook is not linked to a workflow")

    try:
        wf_exec, steps = await workflow_executor.execute_workflow(
            db,
            endpoint.user_id,
            endpoint.workflow_id,
            {"webhook_payload": payload, "trigger": "webhook"},
            trigger_type="webhook",
        )
        response = {
            "workflow_execution_id": str(wf_exec.id),
            "status": wf_exec.status.value,
            "steps_completed": len(steps),
        }
        await webhook_service.log_delivery(
            db,
            endpoint=endpoint,
            direction=WebhookDirection.INCOMING,
            status=WebhookLogStatus.SUCCESS,
            request_payload=payload,
            response_payload=response,
            status_code=200,
        )
        return response
    except Exception as exc:
        await webhook_service.log_delivery(
            db,
            endpoint=endpoint,
            direction=WebhookDirection.INCOMING,
            status=WebhookLogStatus.FAILED,
            request_payload=payload,
            status_code=500,
            error_message=str(exc),
        )
        raise HTTPException(status_code=500, detail="Workflow execution failed") from exc
