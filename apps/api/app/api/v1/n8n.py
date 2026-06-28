import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.n8n import (
    N8nConnectRequest,
    N8nExportResponse,
    N8nImportRequest,
    N8nImportResponse,
    N8nMetadata,
    N8nPushRequest,
    N8nPushResponse,
    N8nRemoteWorkflow,
    N8nTriggerRequest,
    N8nTriggerResponse,
)
from app.services import n8n_sync
from app.services import workflow as workflow_service
from app.services.integrations.workflow_import_service import workflow_import_service
from app.schemas.integration import IntegrationAccountRead

router = APIRouter(prefix="/n8n", tags=["n8n"])


@router.post("/connect", response_model=IntegrationAccountRead, status_code=status.HTTP_201_CREATED)
async def connect_n8n(
    body: N8nConnectRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> IntegrationAccountRead:
    account = await n8n_sync.create_n8n_account(
        db,
        current_user.id,
        name=body.name,
        base_url=body.base_url,
        api_key=body.api_key,
    )
    return account


@router.get("/remote-workflows", response_model=list[N8nRemoteWorkflow])
async def list_remote_workflows(
    account_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[N8nRemoteWorkflow]:
    workflows = await n8n_sync.list_remote_workflows(db, current_user.id, account_id)
    return [N8nRemoteWorkflow(**w) for w in workflows]


@router.post("/import", response_model=N8nImportResponse, status_code=status.HTTP_201_CREATED)
async def import_workflow(
    body: N8nImportRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> N8nImportResponse:
    workflow, stats, created = await n8n_sync.import_workflow(
        db,
        current_user.id,
        account_id=body.account_id,
        n8n_workflow_id=body.n8n_workflow_id,
        workflow_json=body.workflow_json,
        name=body.name,
    )
    if body.account_id is not None:
        await workflow_import_service.record_import(
            db,
            connection_id=body.account_id,
            user_id=current_user.id,
            workflow=workflow,
            remote_workflow_id=body.n8n_workflow_id,
            remote_workflow_name=workflow.name,
            metadata=stats,
        )
    return N8nImportResponse(
        workflow_id=workflow.id,
        name=workflow.name,
        nodes_imported=stats.get("nodes_imported", 0),
        connections_imported=stats.get("connections_imported", len(workflow.definition.get("edges", []))),
        native_count=stats.get("native_count", 0),
        n8n_native_count=stats.get("n8n_native_count", 0),
        community_count=stats.get("community_count", 0),
        community_types=stats.get("community_types", []),
        unsupported_count=stats.get("unsupported_count", 0),
        unsupported_types=stats.get("unsupported_types", []),
        created=created,
        n8n_metadata=N8nMetadata(**(workflow.n8n_metadata or {})),
    )


@router.get("/node-registry")
async def get_node_registry() -> dict[str, Any]:
    """Return n8n node registry metadata for client rendering."""
    from app.services.n8n_node_registry import DEPRECATED_ALIASES, KNOWN_NODES, N8N_OFFICIAL_PREFIXES

    return {
        "official_prefixes": list(N8N_OFFICIAL_PREFIXES),
        "deprecated_aliases": DEPRECATED_ALIASES,
        "known_nodes": KNOWN_NODES,
    }


@router.get("/workflows/{workflow_id}/export", response_model=N8nExportResponse)
async def export_workflow(
    workflow_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> N8nExportResponse:
    n8n_json, workflow = await n8n_sync.export_workflow_json(
        db, current_user.id, workflow_id
    )
    return N8nExportResponse(
        workflow_id=workflow.id,
        name=workflow.name,
        n8n_workflow=n8n_json,
        n8n_metadata=N8nMetadata(**(workflow.n8n_metadata or {})),
    )


@router.post("/workflows/{workflow_id}/push", response_model=N8nPushResponse)
async def push_workflow(
    workflow_id: uuid.UUID,
    body: N8nPushRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> N8nPushResponse:
    n8n_id, workflow, activated = await n8n_sync.push_to_n8n(
        db,
        current_user.id,
        workflow_id,
        body.account_id,
        activate=body.activate,
    )
    return N8nPushResponse(
        n8n_workflow_id=n8n_id,
        name=workflow.name,
        activated=activated,
        n8n_metadata=N8nMetadata(**(workflow.n8n_metadata or {})),
    )


@router.post("/workflows/{workflow_id}/trigger", response_model=N8nTriggerResponse)
async def trigger_linked_workflow(
    workflow_id: uuid.UUID,
    body: N8nTriggerRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> N8nTriggerResponse:
    workflow = await workflow_service.get_workflow(db, workflow_id, current_user.id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")

    meta = workflow.n8n_metadata or {}

    # Resolve account_id: prefer explicit body param, fall back to stored metadata.
    account_id = body.account_id
    if not account_id and meta.get("n8n_instance_id"):
        try:
            account_id = uuid.UUID(str(meta["n8n_instance_id"]))
        except (ValueError, TypeError):
            pass

    n8n_workflow_id = meta.get("n8n_workflow_id")
    webhook_url = meta.get("n8n_webhook_url")

    # Validate that we have enough information to trigger.
    if not webhook_url and not n8n_workflow_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "This workflow has not been pushed to an n8n instance yet. "
                "Push it first using the 'Push to n8n' button, or import it "
                "from a connected n8n instance."
            ),
        )

    if not webhook_url and n8n_workflow_id and not account_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "An n8n instance (account_id) is required to trigger this "
                "workflow via the n8n API. Select an n8n instance and try again."
            ),
        )

    result = await n8n_sync.trigger_n8n_workflow(
        db,
        current_user.id,
        account_id=account_id,
        n8n_workflow_id=n8n_workflow_id,
        webhook_url=webhook_url,
        payload=body.payload,
    )

    if result.get("success"):
        meta["last_triggered_at"] = datetime.now(UTC).isoformat()
        workflow.n8n_metadata = meta
        await db.flush()

    return N8nTriggerResponse(
        success=bool(result.get("success")),
        n8n_workflow_id=result.get("n8n_workflow_id") or n8n_workflow_id,
        response=result.get("response"),
        error=result.get("error"),
    )
