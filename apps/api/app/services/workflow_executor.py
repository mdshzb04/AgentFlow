import time
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import ExecutionStatus
from app.models.integration import (
    IntegrationProvider,
    StepExecution,
    WorkflowExecution,
    WorkflowExecutionStatus,
)
from app.schemas.agent import AgentRunRequest
from app.services import agent as agent_service
from app.services import workflow as workflow_service
from app.services.integrations.accounts import get_account
from app.services.integrations.gmail import execute_gmail
from app.services.integrations.google_sheets import execute_sheets
from app.services.integrations.notion_workflow import execute_notion_node
from app.services.integrations.webhooks import outbound_webhook
from app.services.crm_tools import execute_crm_node
from app.services.n8n_sync import execute_n8n_node


async def _log_step(
    db: AsyncSession,
    *,
    workflow_execution_id: uuid.UUID,
    user_id: uuid.UUID,
    workflow_id: uuid.UUID,
    node_id: str,
    node_type: str,
    integration_provider: str | None = None,
    integration_account_id: uuid.UUID | None = None,
    input_data: dict[str, Any],
) -> StepExecution:
    step = StepExecution(
        workflow_execution_id=workflow_execution_id,
        user_id=user_id,
        workflow_id=workflow_id,
        node_id=node_id,
        node_type=node_type,
        integration_provider=integration_provider,
        integration_account_id=integration_account_id,
        status="running",
        input_data=input_data,
    )
    db.add(step)
    await db.flush()
    return step


async def _complete_step(
    step: StepExecution,
    *,
    status: str,
    output_data: dict[str, Any] | None = None,
    error_message: str | None = None,
    duration_ms: int,
) -> None:
    step.status = status
    step.output_data = output_data
    step.error_message = error_message
    step.duration_ms = duration_ms
    step.completed_at = datetime.now(UTC)


INTEGRATION_NODE_TYPES = {"gmail", "google_sheets", "webhook", "notion"}


async def execute_workflow(
    db: AsyncSession,
    user_id: uuid.UUID,
    workflow_id: uuid.UUID,
    input_data: dict[str, Any],
    trigger_type: str = "manual",
) -> tuple[WorkflowExecution, list[StepExecution]]:
    workflow = await workflow_service.get_workflow(db, workflow_id, user_id)
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    wf_exec = WorkflowExecution(
        user_id=user_id,
        workflow_id=workflow_id,
        status=WorkflowExecutionStatus.RUNNING,
        trigger_type=trigger_type,
        input_data=input_data,
    )
    db.add(wf_exec)
    await db.flush()

    definition = workflow.definition
    nodes = {n["id"]: n for n in definition.get("nodes", [])}
    edges = definition.get("edges", [])

    adjacency: dict[str, list[str]] = {}
    for edge in edges:
        adjacency.setdefault(edge["source"], []).append(edge["target"])

    trigger_nodes = [n for n in definition.get("nodes", []) if n.get("type") == "trigger"]
    webhook_triggers = [n for n in definition.get("nodes", []) if n.get("type") == "webhook"]
    start_nodes = trigger_nodes or webhook_triggers
    if not start_nodes:
        wf_exec.status = WorkflowExecutionStatus.FAILED
        wf_exec.error_message = "Workflow has no trigger or webhook node"
        wf_exec.completed_at = datetime.now(UTC)
        return wf_exec, []

    steps: list[StepExecution] = []
    visited: set[str] = set()
    queue = [start_nodes[0]["id"]]
    context = dict(input_data)
    failed = False

    while queue and not failed:
        node_id = queue.pop(0)
        if node_id in visited:
            continue
        visited.add(node_id)

        node = nodes.get(node_id)
        if not node:
            continue

        node_type = node.get("type", "")
        config = node.get("data", {}).get("config", {})
        start = time.monotonic()

        step = await _log_step(
            db,
            workflow_execution_id=wf_exec.id,
            user_id=user_id,
            workflow_id=workflow_id,
            node_id=node_id,
            node_type=node_type,
            input_data={"config": config, "context": context},
        )

        try:
            output: dict[str, Any] | None = None
            integration_provider: str | None = None
            account_id: uuid.UUID | None = None

            if node_type == "ai":
                integration_provider = "ai"
                run_request = AgentRunRequest(
                    provider=config.get("provider"),
                    model=config.get("model"),
                    template=config.get("template"),
                    system_prompt=config.get("systemPrompt"),
                    user_prompt=config.get("userPrompt"),
                    variables=context,
                    input=context,
                    output_mode=config.get("outputMode", "text"),
                    json_schema=config.get("jsonSchema"),
                    tools=config.get("tools"),
                    workflow_id=workflow_id,
                    node_id=node_id,
                    temperature=config.get("temperature", 0.7),
                )
                ai_exec = await agent_service.run_agent(db, user_id, run_request)
                output = ai_exec.output_data or {}
                if ai_exec.status == ExecutionStatus.FAILED:
                    raise ValueError(ai_exec.error_message or "AI step failed")
                parsed = output.get("parsed")
                if parsed:
                    context.update(parsed)
                context["last_ai_output"] = output.get("content")
                # Sync qualification output to CRM when tools weren't invoked
                if config.get("template") == "lead_qualification" and parsed:
                    from app.services import crm as crm_service

                    lead_fields: dict[str, Any] = {
                        "title": context.get("name") or context.get("title") or "Qualified Lead",
                        "email": context.get("email"),
                        "source": context.get("source"),
                        "score": parsed.get("score"),
                        "status": "qualified" if parsed.get("tier") in ("hot", "warm") else "new",
                        "notes_summary": parsed.get("next_action"),
                    }
                    crm_result = await crm_service.execute_crm_action(
                        db, user_id, entity="lead", action="create",
                        fields=lead_fields, context=context,
                    )
                    if crm_result.get("record"):
                        context["crm_lead"] = crm_result["record"]
                        context["last_lead_id"] = crm_result["record"]["id"]

            elif node_type == "crm":
                integration_provider = "crm"
                output = await execute_crm_node(db, user_id, config, context)
                context["last_crm_output"] = output

            elif node_type == "n8n":
                integration_provider = "n8n"
                conn_id = config.get("connectionId")
                if conn_id:
                    step.integration_account_id = uuid.UUID(str(conn_id))
                output = await execute_n8n_node(db, user_id, config, context)
                context["last_n8n_output"] = output
                if not output.get("success"):
                    raise ValueError(output.get("error") or "n8n step failed")

            elif node_type in INTEGRATION_NODE_TYPES:
                integration_provider = node_type
                if node_type == "webhook" and config.get("direction", "outbound") == "outbound":
                    output = await outbound_webhook(config, context)
                elif node_type == "webhook":
                    output = {"received": True, "payload": context}
                elif node_type == "notion":
                    output = await execute_notion_node(db, user_id, config, context)
                else:
                    conn_id = config.get("connectionId")
                    if not conn_id:
                        raise ValueError(f"{node_type} node requires a connected account")
                    account_id = uuid.UUID(str(conn_id))
                    account = await get_account(db, account_id, user_id)
                    if account is None:
                        raise ValueError("Integration account not found or revoked")
                    step.integration_account_id = account_id

                    if node_type == "gmail":
                        output = await execute_gmail(
                            db, user_id, account, config, context,
                            related_entity="workflow",
                            related_id=workflow_id,
                        )
                    elif node_type == "google_sheets":
                        output = await execute_sheets(account, config, context)

                context[f"last_{node_type}_output"] = output

            elif node_type == "condition":
                field = config.get("field", "")
                operator = config.get("operator", "equals")
                expected = config.get("value", "")
                actual = str(context.get(field, ""))
                result = (
                    actual == str(expected)
                    if operator == "equals"
                    else actual != str(expected)
                )
                output = {"result": result, "field": field, "actual": actual}
                context["condition_result"] = result
                next_ids = adjacency.get(node_id, [])
                if result and len(next_ids) > 0:
                    queue = [next_ids[0]] + queue
                elif not result and len(next_ids) > 1:
                    queue = [next_ids[1]] + queue
                await _complete_step(
                    step,
                    status="completed",
                    output_data=output,
                    duration_ms=int((time.monotonic() - start) * 1000),
                )
                step.integration_provider = integration_provider
                steps.append(step)
                continue

            elif node_type in ("trigger", "end"):
                output = {"status": "ok", "type": node_type}

            elif node_type in ("n8n_native", "unsupported"):
                n8n_type = config.get("n8nType") or config.get("originalType") or node_type
                output = {
                    "status": "delegated",
                    "message": "Runs on connected n8n instance — use Push to n8n or Trigger",
                    "n8n_type": n8n_type,
                }

            await _complete_step(
                step,
                status="completed",
                output_data=output,
                duration_ms=int((time.monotonic() - start) * 1000),
            )
            step.integration_provider = integration_provider

        except Exception as exc:
            await _complete_step(
                step,
                status="failed",
                error_message=str(exc),
                duration_ms=int((time.monotonic() - start) * 1000),
            )
            failed = True
            wf_exec.error_message = str(exc)

        steps.append(step)

        if not failed:
            for next_id in adjacency.get(node_id, []):
                if node_type != "condition":
                    queue.append(next_id)

    wf_exec.status = (
        WorkflowExecutionStatus.FAILED if failed else WorkflowExecutionStatus.COMPLETED
    )
    wf_exec.completed_at = datetime.now(UTC)
    await db.flush()

    # Mirror every run to Notion as a workflow log entry (non-blocking).
    try:
        from app.services.integrations.crm_sync_service import sync_workflow_log

        completed_steps = sum(1 for s in steps if getattr(s, "status", None) == "completed")
        failed_steps = sum(1 for s in steps if getattr(s, "status", None) == "failed")
        log_summary = (
            f"Workflow {workflow_id} run {wf_exec.id}\n"
            f"Status: {wf_exec.status.value}\n"
            f"Trigger: {wf_exec.trigger_type}\n"
            f"Steps: {len(steps)} ({completed_steps} completed, {failed_steps} failed)\n"
            f"Duration: started={wf_exec.created_at.isoformat() if wf_exec.created_at else ''} "
            f"ended={wf_exec.completed_at.isoformat() if wf_exec.completed_at else ''}"
        )
        if wf_exec.error_message:
            log_summary += f"\nError: {wf_exec.error_message}"
        await sync_workflow_log(
            db,
            user_id,
            execution_id=str(wf_exec.id),
            workflow_id=str(workflow_id),
            status=wf_exec.status.value,
            summary=log_summary,
        )
    except Exception:
        pass

    return wf_exec, steps


async def list_workflow_executions(
    db: AsyncSession,
    user_id: uuid.UUID,
    workflow_id: uuid.UUID | None = None,
    limit: int = 50,
) -> list[WorkflowExecution]:
    query = select(WorkflowExecution).where(WorkflowExecution.user_id == user_id)
    if workflow_id:
        query = query.where(WorkflowExecution.workflow_id == workflow_id)
    query = query.order_by(WorkflowExecution.started_at.desc()).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_workflow_execution(
    db: AsyncSession,
    execution_id: uuid.UUID,
    user_id: uuid.UUID,
) -> WorkflowExecution | None:
    result = await db.execute(
        select(WorkflowExecution).where(
            WorkflowExecution.id == execution_id,
            WorkflowExecution.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def list_step_executions(
    db: AsyncSession,
    workflow_execution_id: uuid.UUID,
    user_id: uuid.UUID,
) -> list[StepExecution]:
    result = await db.execute(
        select(StepExecution)
        .where(
            StepExecution.workflow_execution_id == workflow_execution_id,
            StepExecution.user_id == user_id,
        )
        .order_by(StepExecution.created_at.asc())
    )
    return list(result.scalars().all())


async def list_all_steps(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int = 100,
) -> list[StepExecution]:
    result = await db.execute(
        select(StepExecution)
        .where(StepExecution.user_id == user_id)
        .order_by(StepExecution.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
