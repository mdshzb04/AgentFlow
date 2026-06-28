"""n8n API client and workflow sync operations."""

import uuid
from datetime import UTC, datetime
from typing import Any

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.integration import AccountStatus, IntegrationAccount, IntegrationProvider
from app.models.workflow import Workflow
from app.services import workflow as workflow_service
from app.services.n8n_converter import (
    build_n8n_metadata,
    export_to_n8n,
    import_n8n_workflow,
    extract_webhook_url,
)
from app.schemas.workflow import WorkflowCreate


def _normalize_base_url(url: str) -> str:
    return url.rstrip("/")


async def _get_n8n_account(
    db: AsyncSession,
    account_id: uuid.UUID,
    user_id: uuid.UUID,
) -> IntegrationAccount:
    """Load an n8n account with meaningful not-found / revoked errors."""
    result = await db.execute(
        select(IntegrationAccount).where(
            IntegrationAccount.id == account_id,
            IntegrationAccount.user_id == user_id,
            IntegrationAccount.provider == IntegrationProvider.N8N,
        )
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=404, detail="n8n account not found")
    if account.status != AccountStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"n8n account is {account.status.value}; reconnect it on the Integrations page",
        )
    return account


def _get_n8n_credentials(account: IntegrationAccount) -> tuple[str, str]:
    from app.services.integrations.n8n_url import resolve_n8n_base_url

    base_url = _normalize_base_url(
        account.account_metadata.get("base_url")
        or account.credentials.get("base_url", "")
    )
    api_key = account.credentials.get("api_key", "")
    if not base_url or not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="n8n account missing base_url or api_key",
        )
    return resolve_n8n_base_url(base_url), api_key


async def _find_existing_imported_workflow(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    n8n_instance_id: str | None,
    n8n_workflow_id: str | None,
) -> Workflow | None:
    """Find a previously imported workflow linked to the same remote n8n workflow."""
    if not n8n_workflow_id:
        return None
    stmt = select(Workflow).where(
        Workflow.user_id == user_id,
        Workflow.n8n_metadata["n8n_workflow_id"].astext == str(n8n_workflow_id),
    )
    if n8n_instance_id:
        stmt = stmt.where(
            Workflow.n8n_metadata["n8n_instance_id"].astext == str(n8n_instance_id)
        )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_n8n_account(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    name: str,
    base_url: str,
    api_key: str,
) -> IntegrationAccount:
    from app.services.integrations.n8n_url import format_n8n_connection_error, resolve_n8n_base_url

    base_url = _normalize_base_url(base_url)
    request_url = resolve_n8n_base_url(base_url)
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(
                f"{request_url}/api/v1/workflows",
                headers={"X-N8N-API-KEY": api_key},
                params={"limit": 1},
            )
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=400,
                detail=format_n8n_connection_error(exc, base_url),
            ) from exc
        if resp.status_code == 401:
            raise HTTPException(status_code=400, detail="Invalid n8n API key")
        if resp.status_code >= 400:
            raise HTTPException(
                status_code=400,
                detail=f"Could not reach n8n instance: {resp.status_code}",
            )

    # Reuse an existing connection to the same instance instead of duplicating.
    existing = await db.execute(
        select(IntegrationAccount).where(
            IntegrationAccount.user_id == user_id,
            IntegrationAccount.provider == IntegrationProvider.N8N,
            IntegrationAccount.external_account_id == base_url,
        )
    )
    account = existing.scalars().first()
    if account is not None:
        account.name = name
        account.credentials = {"api_key": api_key}
        account.account_metadata = {**account.account_metadata, "base_url": base_url}
        account.status = AccountStatus.ACTIVE
        await db.flush()
        return account

    account = IntegrationAccount(
        user_id=user_id,
        provider=IntegrationProvider.N8N,
        name=name,
        external_account_id=base_url,
        credentials={"api_key": api_key},
        account_metadata={"base_url": base_url},
        status=AccountStatus.ACTIVE,
    )
    db.add(account)
    await db.flush()
    return account


async def list_remote_workflows(
    db: AsyncSession,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
) -> list[dict[str, Any]]:
    account = await _get_n8n_account(db, account_id, user_id)

    base_url, api_key = _get_n8n_credentials(account)
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{base_url}/api/v1/workflows",
            headers={"X-N8N-API-KEY": api_key},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"n8n API error: {resp.text[:200]}")
        data = resp.json()

    workflows = data if isinstance(data, list) else data.get("data", data.get("workflows", []))
    return [
        {
            "id": str(w.get("id")),
            "name": w.get("name", "Untitled"),
            "active": bool(w.get("active")),
            "created_at": w.get("createdAt"),
            "updated_at": w.get("updatedAt"),
        }
        for w in workflows
        if isinstance(w, dict)
    ]


async def fetch_remote_workflow(
    account: IntegrationAccount,
    n8n_workflow_id: str,
) -> dict[str, Any]:
    base_url, api_key = _get_n8n_credentials(account)
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{base_url}/api/v1/workflows/{n8n_workflow_id}",
            headers={"X-N8N-API-KEY": api_key},
        )
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail="n8n workflow not found")
        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"n8n API error: {resp.text[:200]}")
        return resp.json()


def _validate_workflow_json(n8n_data: dict[str, Any]) -> None:
    """Defensive server-side validation of imported n8n workflow JSON."""
    nodes = n8n_data.get("nodes")
    if not isinstance(nodes, list) or len(nodes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="n8n workflow JSON has no nodes to import",
        )
    for idx, node in enumerate(nodes):
        if not isinstance(node, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"n8n node #{idx + 1} is not an object",
            )
        if not isinstance(node.get("type"), str) or not node["type"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"n8n node #{idx + 1} is missing a `type`",
            )
    connections = n8n_data.get("connections")
    if connections is not None and not isinstance(connections, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="n8n `connections` must be an object keyed by node name",
        )


async def import_workflow(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    account_id: uuid.UUID | None = None,
    n8n_workflow_id: str | None = None,
    workflow_json: dict[str, Any] | None = None,
    name: str | None = None,
) -> tuple[Workflow, dict[str, Any], bool]:
    """Import (or re-sync) an n8n workflow. Returns (workflow, stats, created)."""
    account = None
    base_url: str | None = None
    if account_id is not None:
        account = await _get_n8n_account(db, account_id, user_id)
        base_url, _ = _get_n8n_credentials(account)

    if workflow_json:
        _validate_workflow_json(workflow_json)
        n8n_data = workflow_json
        # A JSON file's `id` is not a live remote id on the user's n8n instance —
        # don't treat it as one. The real id is captured after Push to n8n.
        remote_id = None
        wf_name = name or workflow_json.get("name", "Imported from n8n")
    elif n8n_workflow_id:
        if account is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="account_id is required to import a remote n8n workflow",
            )
        n8n_data = await fetch_remote_workflow(account, n8n_workflow_id)
        _validate_workflow_json(n8n_data)
        remote_id = n8n_workflow_id
        wf_name = name or n8n_data.get("name", "Imported from n8n")
    else:
        raise HTTPException(status_code=400, detail="Provide n8n_workflow_id or workflow_json")

    definition, stats = import_n8n_workflow(n8n_data)
    webhook_url = extract_webhook_url(n8n_data, base_url) if base_url else None
    now = datetime.now(UTC).isoformat()
    instance_id = str(account.id) if account else None

    # Re-sync an existing import instead of creating a duplicate.
    existing = await _find_existing_imported_workflow(
        db, user_id, n8n_instance_id=instance_id, n8n_workflow_id=remote_id
    )
    if existing is not None:
        existing.definition = definition
        existing.n8n_metadata = {
            **(existing.n8n_metadata or {}),
            **build_n8n_metadata(
                source="n8n",
                n8n_workflow_id=remote_id,
                n8n_instance_id=instance_id,
                n8n_webhook_url=webhook_url,
                remote_name=n8n_data.get("name"),
                imported_at=now,
            ),
            "last_synced_at": now,
            "workflow_extras": definition.get("n8nWorkflow") or {},
            "raw_n8n": {
                "id": n8n_data.get("id"),
                "name": n8n_data.get("name"),
                "nodes_count": len(n8n_data.get("nodes") or []),
            },
        }
        await db.flush()
        return existing, stats, False

    workflow = await workflow_service.create_workflow(
        db,
        user_id,
        WorkflowCreate(name=wf_name, description="Imported from n8n"),
    )
    workflow.definition = definition
    workflow.n8n_metadata = build_n8n_metadata(
        source="n8n",
        n8n_workflow_id=remote_id,
        n8n_instance_id=instance_id,
        n8n_webhook_url=webhook_url,
        remote_name=n8n_data.get("name"),
        imported_at=now,
    )
    workflow.n8n_metadata["raw_n8n"] = {
        "id": n8n_data.get("id"),
        "name": n8n_data.get("name"),
        "nodes_count": len(n8n_data.get("nodes") or []),
    }
    workflow.n8n_metadata["workflow_extras"] = definition.get("n8nWorkflow") or {}
    await db.flush()
    return workflow, stats, True


async def export_workflow_json(
    db: AsyncSession,
    user_id: uuid.UUID,
    workflow_id: uuid.UUID,
) -> tuple[dict[str, Any], Workflow]:
    workflow = await workflow_service.get_workflow(db, workflow_id, user_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")

    meta = workflow.n8n_metadata or {}
    n8n_json = export_to_n8n(
        workflow.name,
        workflow.definition,
        existing_n8n_id=meta.get("n8n_workflow_id"),
    )
    now = datetime.now(UTC).isoformat()
    workflow.n8n_metadata = {
        **meta,
        "source": meta.get("source", "hybrid"),
        "exported_at": now,
        "last_synced_at": now,
    }
    await db.flush()
    return n8n_json, workflow


async def push_to_n8n(
    db: AsyncSession,
    user_id: uuid.UUID,
    workflow_id: uuid.UUID,
    account_id: uuid.UUID,
    *,
    activate: bool = False,
) -> tuple[str, Workflow, bool]:
    """Push a workflow to n8n. Returns (n8n_workflow_id, workflow, activated)."""
    account = await _get_n8n_account(db, account_id, user_id)

    n8n_json, workflow = await export_workflow_json(db, user_id, workflow_id)
    base_url, api_key = _get_n8n_credentials(account)
    headers = {"X-N8N-API-KEY": api_key, "Content-Type": "application/json"}

    meta = workflow.n8n_metadata or {}
    remote_id = meta.get("n8n_workflow_id")

    activated = False
    async with httpx.AsyncClient(timeout=30.0) as client:
        if remote_id:
            resp = await client.put(
                f"{base_url}/api/v1/workflows/{remote_id}",
                headers=headers,
                json=n8n_json,
            )
        else:
            n8n_json.pop("id", None)
            resp = await client.post(
                f"{base_url}/api/v1/workflows",
                headers=headers,
                json=n8n_json,
            )

        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"n8n push failed: {resp.text[:300]}")

        result = resp.json()
        new_id = str(result.get("id", remote_id))

        if activate and new_id:
            activate_resp = await client.post(
                f"{base_url}/api/v1/workflows/{new_id}/activate",
                headers=headers,
            )
            if activate_resp.status_code < 400:
                activated = True
            else:
                # Push succeeded; surface activation failure via metadata
                # rather than rolling back the already-pushed workflow.
                workflow.n8n_metadata = {
                    **(workflow.n8n_metadata or {}),
                    "activation_error": activate_resp.text[:300],
                }

    webhook_url = extract_webhook_url(result, base_url)
    now = datetime.now(UTC).isoformat()
    workflow.n8n_metadata = {
        **(workflow.n8n_metadata or {}),
        **build_n8n_metadata(
            source="hybrid",
            n8n_workflow_id=new_id,
            n8n_instance_id=str(account.id),
            n8n_webhook_url=webhook_url,
            remote_name=result.get("name", workflow.name),
            exported_at=now,
        ),
        "last_synced_at": now,
    }
    if activated:
        workflow.n8n_metadata.pop("activation_error", None)
    await db.flush()
    return new_id, workflow, activated


async def _activate_n8n_workflow(
    client: httpx.AsyncClient,
    base_url: str,
    headers: dict[str, str],
    n8n_workflow_id: str,
) -> bool:
    """Best-effort activate. Returns True if activated (or already active)."""
    try:
        resp = await client.post(
            f"{base_url}/api/v1/workflows/{n8n_workflow_id}/activate",
            headers=headers,
        )
        return resp.status_code < 400
    except httpx.HTTPError:
        return False


async def trigger_n8n_workflow(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    account_id: uuid.UUID | None,
    n8n_workflow_id: str | None,
    webhook_url: str | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    # Webhook triggering is the only reliable path on modern n8n — the public
    # REST /run and /executions endpoints return 405. Webhooks require an
    # active workflow, so we activate on demand if needed.
    if webhook_url:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(webhook_url, json=payload)
            # 404/405 typically means the workflow isn't active. Try activating
            # the owning workflow via the API, then retry once.
            if resp.status_code in (404, 405) and account_id and n8n_workflow_id:
                account = await _get_n8n_account(db, account_id, user_id)
                base_url, api_key = _get_n8n_credentials(account)
                headers = {"X-N8N-API-KEY": api_key, "Content-Type": "application/json"}
                if await _activate_n8n_workflow(client, base_url, headers, n8n_workflow_id):
                    resp = await client.post(webhook_url, json=payload)
            try:
                body = resp.json()
            except Exception:
                body = {"status_code": resp.status_code, "text": resp.text[:500]}
            if resp.status_code >= 400:
                hint = (
                    " Activate the workflow in n8n (it must contain a Webhook trigger node)."
                    if resp.status_code in (404, 405)
                    else ""
                )
                return {
                    "success": False,
                    "error": f"Webhook trigger failed ({resp.status_code}): {resp.text[:200]}.{hint}",
                    "response": body,
                    "method": "webhook",
                }
            return {"success": True, "response": body, "method": "webhook"}

    if not account_id or not n8n_workflow_id:
        raise HTTPException(
            status_code=400,
            detail="account_id and n8n_workflow_id required when webhook_url is not set",
        )

    account = await _get_n8n_account(db, account_id, user_id)
    base_url, api_key = _get_n8n_credentials(account)
    headers = {"X-N8N-API-KEY": api_key, "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=120.0) as client:
        # Modern n8n public API does not support manual REST execution (/run and
        # /executions return 405). Try /run first; on 405, fall back to webhook
        # by activating the workflow and extracting its webhook URL.
        resp = await client.post(
            f"{base_url}/api/v1/workflows/{n8n_workflow_id}/run",
            headers=headers,
            json={"data": payload},
        )
        if resp.status_code == 405:
            # Fetch the workflow to find a webhook node URL, then trigger it.
            wf_resp = await client.get(
                f"{base_url}/api/v1/workflows/{n8n_workflow_id}",
                headers=headers,
            )
            webhook = None
            if wf_resp.status_code < 400:
                webhook = extract_webhook_url(wf_resp.json(), base_url)
            if not webhook:
                if wf_resp.status_code == 404:
                    error_msg = (
                        "This workflow hasn't been pushed to n8n yet (n8n could not find it). "
                        "Click \"Push to n8n\" first, then Trigger n8n."
                    )
                else:
                    error_msg = (
                        "This n8n version does not support REST execution and no Webhook trigger "
                        "node URL could be resolved. Add a Webhook trigger node to the workflow, "
                        "push again, then use Trigger n8n."
                    )
                return {
                    "success": False,
                    "n8n_workflow_id": n8n_workflow_id,
                    "error": error_msg,
                    "response": {"status_code": wf_resp.status_code},
                    "method": "api",
                }
            if not await _activate_n8n_workflow(client, base_url, headers, n8n_workflow_id):
                return {
                    "success": False,
                    "n8n_workflow_id": n8n_workflow_id,
                    "error": "Could not activate the workflow in n8n. Activate it manually, then trigger.",
                    "response": {"status_code": 405},
                    "method": "api",
                }
            hook_resp = await client.post(webhook, json=payload)
            try:
                body = hook_resp.json()
            except Exception:
                body = {"status_code": hook_resp.status_code, "text": hook_resp.text[:500]}
            if hook_resp.status_code >= 400:
                return {
                    "success": False,
                    "n8n_workflow_id": n8n_workflow_id,
                    "error": f"Webhook trigger failed ({hook_resp.status_code}): {hook_resp.text[:200]}",
                    "response": body,
                    "method": "webhook",
                }
            return {
                "success": True,
                "n8n_workflow_id": n8n_workflow_id,
                "response": body,
                "method": "webhook",
            }
        if resp.status_code == 404:
            resp = await client.post(
                f"{base_url}/api/v1/executions",
                headers=headers,
                json={"workflowId": n8n_workflow_id, "data": payload},
            )
        try:
            body = resp.json()
        except Exception:
            body = {"status_code": resp.status_code, "text": resp.text[:500]}
        if resp.status_code >= 400:
            return {
                "success": False,
                "n8n_workflow_id": n8n_workflow_id,
                "error": resp.text[:300],
                "response": body,
            }
        return {
            "success": True,
            "n8n_workflow_id": n8n_workflow_id,
            "response": body,
            "method": "api",
        }


async def trigger_agentflow_workflow_via_n8n(
    db: AsyncSession,
    user_id: uuid.UUID,
    workflow: Workflow,
    payload: dict[str, Any],
) -> dict[str, Any]:
    meta = workflow.n8n_metadata or {}
    account_id = meta.get("n8n_instance_id")
    n8n_wf_id = meta.get("n8n_workflow_id")
    webhook = meta.get("n8n_webhook_url")

    result = await trigger_n8n_workflow(
        db,
        user_id,
        account_id=uuid.UUID(str(account_id)) if account_id else None,
        n8n_workflow_id=n8n_wf_id,
        webhook_url=webhook,
        payload=payload,
    )

    if result.get("success"):
        meta["last_triggered_at"] = datetime.now(UTC).isoformat()
        workflow.n8n_metadata = meta
        await db.flush()

    return result


async def execute_n8n_node(
    db: AsyncSession,
    user_id: uuid.UUID,
    config: dict[str, Any],
    context: dict[str, Any],
) -> dict[str, Any]:
    from app.services.crm import resolve_fields

    account_id = config.get("connectionId") or config.get("accountId")
    n8n_workflow_id = config.get("n8nWorkflowId")
    webhook_url = config.get("webhookUrl")

    payload_template = config.get("payload") or config.get("body") or {}
    if isinstance(payload_template, dict):
        payload = resolve_fields(payload_template, context)
    else:
        payload = dict(context)

    if not account_id and not webhook_url and not n8n_workflow_id:
        raise ValueError("n8n node requires connectionId or webhookUrl or n8nWorkflowId")

    parsed_account = uuid.UUID(str(account_id)) if account_id else None
    return await trigger_n8n_workflow(
        db,
        user_id,
        account_id=parsed_account,
        n8n_workflow_id=str(n8n_workflow_id) if n8n_workflow_id else None,
        webhook_url=webhook_url,
        payload=payload,
    )
