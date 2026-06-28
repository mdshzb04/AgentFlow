import uuid
from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Header, HTTPException, Request, status
from fastapi.responses import RedirectResponse

from app.api.deps import CurrentUser, DbSession, OAuthCurrentUser
from app.core.config import get_settings
from app.core.rate_limit import get_client_ip
from app.models.integration import IntegrationProvider
from app.schemas.integration import (
    IntegrationAccountRead,
    StepExecutionRead,
    WorkflowExecutionRead,
)
from app.schemas.integration_platform import (
    IntegrationCardRead,
    IntegrationConnectRequest,
    IntegrationConnectResponse,
    IntegrationConnectionDetail,
    IntegrationMetricsResponse,
    IntegrationStatusRead,
    IntegrationTestRequest,
    IntegrationTestResponse,
    N8nSettingsUpdate,
)
from app.services import workflow_executor
from app.services.integrations.accounts import (
    GMAIL_SCOPES,
    SHEETS_SCOPES,
    delete_account,
    get_account,
    get_google_auth_url,
    list_accounts,
    save_google_account,
)
from app.services.integrations.connection_service import connection_service
from app.services.integrations.health_check import health_check_service
from app.services.integrations.integration_metrics import all_metrics
from app.services.integrations.integration_service import integration_service
from app.services.integrations.oauth_service import oauth_service

router = APIRouter(prefix="/integrations", tags=["integrations"])


# ─── Production SaaS API ─────────────────────────────────────────────────────

@router.get("", response_model=list[IntegrationCardRead])
async def list_integrations(current_user: CurrentUser, db: DbSession) -> list[IntegrationCardRead]:
    cards = await integration_service.list_provider_cards(db, current_user.id)
    return [IntegrationCardRead(**c) for c in cards]


@router.get("/status", response_model=IntegrationStatusRead)
async def integration_status(current_user: CurrentUser, db: DbSession) -> IntegrationStatusRead:
    summary = await integration_service.get_status_summary(db, current_user.id)
    return IntegrationStatusRead(**summary)


@router.get("/metrics", response_model=IntegrationMetricsResponse)
async def integration_metrics(
    current_user: CurrentUser, db: DbSession
) -> IntegrationMetricsResponse:
    """Live operational metrics for every integration (rows synced, emails sent,
    AI tokens, webhook deliveries, n8n runs, etc.). All values come from the
    database; integrations with no activity return zero counters and the
    frontend renders an empty state."""
    payload = await all_metrics(db, current_user.id)
    return IntegrationMetricsResponse(**payload)


@router.post("/connect", response_model=IntegrationConnectResponse)
async def connect_integration(
    body: IntegrationConnectRequest,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> IntegrationConnectResponse:
    ip = get_client_ip(request)
    if body.provider == "n8n":
        effective_base_url = (body.base_url or "").strip()
        effective_api_key = (body.api_key or "").strip()
        if not effective_base_url or not effective_api_key:
            raise HTTPException(
                status_code=400,
                detail="base_url and api_key are required to connect n8n",
            )
        from app.services.integrations.health_check import health_check_service as hc

        try:
            connection = await connection_service.create_n8n_connection(
                db,
                current_user.id,
                base_url=effective_base_url,
                api_key=effective_api_key,
                ip_address=ip,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        integration = await connection_service.get_integration_by_slug(db, "n8n")
        if integration:
            result = await hc.test_connection(db, connection, integration)
            await connection_service.record_health(
                db, connection, healthy=result["healthy"], message=result.get("message"), version=result.get("version")
            )
        return IntegrationConnectResponse(
            connection_id=str(connection.id),
            status="connected",
            message="n8n connected successfully",
        )

    if body.provider == "notion":
        api_key = (body.api_key or "").strip()
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="api_key is required to connect Notion",
            )
        try:
            connection = await connection_service.create_notion_connection(
                db, current_user.id, api_key=api_key, ip_address=ip
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return IntegrationConnectResponse(
            connection_id=str(connection.id),
            status="connected",
            message="Notion connected successfully",
        )

    if body.provider in ("gmail", "google_sheets"):
        paths = {
            "gmail": "/api/v1/integrations/gmail/connect",
            "google_sheets": "/api/v1/integrations/google-sheets/connect",
        }
        settings = get_settings()
        return IntegrationConnectResponse(
            connection_id="",
            status="redirect",
            message=f"{settings.api_public_url}{paths[body.provider]}",
        )

    raise HTTPException(status_code=400, detail="Unsupported provider")


@router.post("/test", response_model=IntegrationTestResponse)
async def test_integration(
    body: IntegrationTestRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> IntegrationTestResponse:
    row = await connection_service.get_connection(db, body.connection_id, current_user.id)
    if row is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    connection, integration = row
    result = await health_check_service.test_connection(db, connection, integration)
    await connection_service.record_health(
        db,
        connection,
        healthy=result["healthy"],
        message=result.get("message"),
        version=result.get("version"),
    )
    return IntegrationTestResponse(**result)


@router.patch("/{connection_id}/n8n", response_model=IntegrationConnectionDetail)
async def update_n8n_settings(
    connection_id: uuid.UUID,
    body: N8nSettingsUpdate,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> IntegrationConnectionDetail:
    row = await connection_service.get_connection(db, connection_id, current_user.id)
    if row is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    connection, integration = row
    if integration.slug != "n8n":
        raise HTTPException(status_code=400, detail="Not an n8n connection")
    if not body.base_url and not body.api_key:
        raise HTTPException(status_code=400, detail="Provide base_url and/or api_key")

    connection = await connection_service.update_n8n_connection(
        db,
        connection,
        integration,
        base_url=body.base_url,
        api_key=body.api_key,
        ip_address=get_client_ip(request),
    )
    result = await health_check_service.test_connection(db, connection, integration)
    await connection_service.record_health(
        db,
        connection,
        healthy=result["healthy"],
        message=result.get("message"),
        version=result.get("version"),
    )
    detail = await integration_service.get_connection_detail(db, connection.id, current_user.id)
    return IntegrationConnectionDetail(**detail)


@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_integration(
    connection_id: uuid.UUID,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    row = await connection_service.get_connection(db, connection_id, current_user.id)
    if row is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    connection, _ = row
    await connection_service.disconnect(db, connection, ip_address=get_client_ip(request))


@router.get("/accounts", response_model=list[IntegrationAccountRead])
async def get_accounts(
    current_user: CurrentUser,
    db: DbSession,
    provider: str | None = None,
) -> list[IntegrationAccountRead]:
    prov = IntegrationProvider(provider) if provider else None
    accounts = await list_accounts(db, current_user.id, prov)
    return accounts


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_account(
    account_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    account = await get_account(db, account_id, current_user.id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    await delete_account(db, account)
    # OAuth connections have a connection id distinct from the legacy account id;
    # look up the connection via legacy_account_id as well as a direct id match.
    row = await connection_service.get_connection(db, account_id, current_user.id)
    if row is None:
        row = await connection_service.get_connection_by_legacy_account(db, account_id, current_user.id)
    if row:
        connection, _ = row
        await connection_service.disconnect(db, connection)


@router.get("/gmail/connect")
async def connect_gmail(current_user: OAuthCurrentUser) -> RedirectResponse:
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")
    state = oauth_service.generate_state(current_user.id, "google", "gmail")
    return RedirectResponse(url=get_google_auth_url(state, GMAIL_SCOPES))


@router.get("/google-sheets/connect")
async def connect_google_sheets(current_user: OAuthCurrentUser) -> RedirectResponse:
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")
    state = oauth_service.generate_state(current_user.id, "google", "google_sheets")
    return RedirectResponse(url=get_google_auth_url(state, SHEETS_SCOPES))


@router.get("/google/callback")
async def google_callback(
    db: DbSession,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    settings = get_settings()
    if error or not code or not state:
        return RedirectResponse(f"{settings.frontend_url}/dashboard/integrations?error=oauth_failed")

    oauth_state = oauth_service.pop_state(state)
    if not oauth_state:
        return RedirectResponse(f"{settings.frontend_url}/dashboard/integrations?error=invalid_state")

    try:
        token_data = await oauth_service.exchange_google_code(code)
        userinfo = await oauth_service.fetch_google_userinfo(token_data["access_token"])
        target = oauth_state["target_provider"]
        provider = IntegrationProvider.GMAIL if target == "gmail" else IntegrationProvider.GOOGLE_SHEETS
        account = await save_google_account(
            db, uuid.UUID(oauth_state["user_id"]), token_data, provider, userinfo
        )
        slug = "gmail" if target == "gmail" else "google_sheets"
        conn = await connection_service.sync_from_legacy_account(db, account, slug)
        await oauth_service.save_tokens(
            db,
            conn,
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token"),
            expires_in=token_data.get("expires_in"),
        )
    except Exception as exc:
        return RedirectResponse(
            f"{settings.frontend_url}/dashboard/integrations?error={quote(str(exc))}"
        )

    return RedirectResponse(f"{settings.frontend_url}/dashboard/integrations?connected={target}")


@router.get("/executions", response_model=list[WorkflowExecutionRead])
async def list_executions(
    current_user: CurrentUser,
    db: DbSession,
    workflow_id: uuid.UUID | None = None,
) -> list[WorkflowExecutionRead]:
    executions = await workflow_executor.list_workflow_executions(
        db, current_user.id, workflow_id
    )
    return [WorkflowExecutionRead.model_validate(e) for e in executions]


@router.get("/executions/{execution_id}", response_model=WorkflowExecutionRead)
async def get_execution(
    execution_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> WorkflowExecutionRead:
    wf_exec = await workflow_executor.get_workflow_execution(
        db, execution_id, current_user.id
    )
    if wf_exec is None:
        raise HTTPException(status_code=404, detail="Execution not found")
    steps = await workflow_executor.list_step_executions(
        db, execution_id, current_user.id
    )
    return WorkflowExecutionRead(
        **WorkflowExecutionRead.model_validate(wf_exec).model_dump(),
        steps=[StepExecutionRead.model_validate(s) for s in steps],
    )


@router.get("/steps", response_model=list[StepExecutionRead])
async def list_steps(
    current_user: CurrentUser,
    db: DbSession,
    limit: int = 100,
) -> list[StepExecutionRead]:
    steps = await workflow_executor.list_all_steps(db, current_user.id, limit)
    return steps


@router.get("/{connection_id}", response_model=IntegrationConnectionDetail)
async def get_connection_detail(
    connection_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> IntegrationConnectionDetail:
    detail = await integration_service.get_connection_detail(db, connection_id, current_user.id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    return IntegrationConnectionDetail(**detail)


@router.post("/google-sheets/sync")
async def sync_crm_to_sheets(
    body: dict,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    """Append CRM rows to a connected Google Sheet.

    Body: { "spreadsheet_id": "...", "entity": "lead|contact|deal|task|note|all", "record_id": "optional" }
    """
    from app.services.integrations.sheets_sync import (
        sync_all_entity_to_sheet,
        sync_entity_to_sheet,
    )
    from app.services import crm as crm_service

    spreadsheet_id = str(body.get("spreadsheet_id", "")).strip()
    entity = str(body.get("entity", "lead")).strip()
    record_id = body.get("record_id")
    if not spreadsheet_id:
        raise HTTPException(status_code=400, detail="spreadsheet_id is required")

    if entity == "all":
        results = {}
        for ent in ("lead", "contact", "deal", "task", "note"):
            try:
                results[ent] = await sync_all_entity_to_sheet(db, current_user.id, entity=ent, spreadsheet_id=spreadsheet_id)
            except ValueError as exc:
                results[ent] = {"success": False, "error": str(exc)}
        return {"success": True, "results": results}

    if record_id:
        record = await _fetch_crm_record(db, current_user.id, entity=entity, record_id=uuid.UUID(str(record_id)))
        if record is None:
            raise HTTPException(status_code=404, detail="CRM record not found")
        return await sync_entity_to_sheet(db, current_user.id, entity=entity, spreadsheet_id=spreadsheet_id, record=record)

    return await sync_all_entity_to_sheet(db, current_user.id, entity=entity, spreadsheet_id=spreadsheet_id)


async def _fetch_crm_record(db, user_id: uuid.UUID, *, entity: str, record_id: uuid.UUID):
    from app.services import crm as crm_service

    if entity == "lead":
        return await crm_service.get_lead(db, record_id, user_id)
    if entity == "contact":
        return await crm_service.get_contact(db, record_id, user_id)
    if entity == "deal":
        return await crm_service.get_deal(db, record_id, user_id)
    if entity == "task":
        return await crm_service.get_task(db, record_id, user_id)
    if entity == "note":
        return await crm_service.get_note(db, record_id, user_id)
    return None
