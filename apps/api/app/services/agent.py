import time
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.agent import AgentExecution, ExecutionStatus, OutputMode, PromptTemplate
from app.schemas.agent import AgentRunRequest, PromptTemplateCreate
from app.services.crm_tools import execute_crm_tool
from app.services.llm import call_llm
from app.services.prompt_templates import (
    get_builtin_template,
    list_builtin_templates,
    render_prompt,
)
from app.services import workflow as workflow_service


async def list_all_templates(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[dict[str, Any]]:
    builtins = [
        {**t, "id": t["slug"], "is_builtin": True}
        for t in list_builtin_templates()
    ]
    result = await db.execute(
        select(PromptTemplate)
        .where(PromptTemplate.user_id == user_id)
        .order_by(PromptTemplate.created_at.desc())
    )
    custom = [
        {
            "id": str(t.id),
            "slug": t.slug,
            "name": t.name,
            "description": t.description,
            "category": t.category.value,
            "system_prompt": t.system_prompt,
            "user_prompt_template": t.user_prompt_template,
            "output_mode": t.output_mode.value,
            "json_schema": t.json_schema,
            "tools": t.tools,
            "default_provider": t.default_provider,
            "default_model": t.default_model,
            "is_builtin": False,
        }
        for t in result.scalars().all()
    ]
    return builtins + custom


async def create_custom_template(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: PromptTemplateCreate,
) -> PromptTemplate:
    template = PromptTemplate(
        user_id=user_id,
        name=data.name,
        slug=data.slug,
        description=data.description,
        category=data.category,
        system_prompt=data.system_prompt,
        user_prompt_template=data.user_prompt_template,
        output_mode=data.output_mode,
        json_schema=data.json_schema,
        tools=data.tools,
        default_provider=data.default_provider,
        default_model=data.default_model,
        is_builtin=False,
    )
    db.add(template)
    await db.flush()
    return template


async def get_template_config(
    db: AsyncSession,
    user_id: uuid.UUID,
    template_slug: str | None,
) -> dict[str, Any] | None:
    if not template_slug:
        return None
    builtin = get_builtin_template(template_slug)
    if builtin:
        return builtin
    result = await db.execute(
        select(PromptTemplate).where(
            PromptTemplate.user_id == user_id,
            PromptTemplate.slug == template_slug,
        )
    )
    custom = result.scalar_one_or_none()
    if custom:
        return {
            "slug": custom.slug,
            "system_prompt": custom.system_prompt,
            "user_prompt_template": custom.user_prompt_template,
            "output_mode": custom.output_mode,
            "json_schema": custom.json_schema,
            "tools": custom.tools,
            "default_provider": custom.default_provider,
            "default_model": custom.default_model,
        }
    return None


def _resolve_provider_and_model(
    request: AgentRunRequest,
    template_config: dict[str, Any] | None,
) -> tuple[str, str, str]:
    settings = get_settings()
    provider = request.provider or (
        template_config.get("default_provider") if template_config else None
    ) or settings.default_llm_provider

    if provider == "anthropic":
        model = (
            request.model
            or (template_config.get("default_model") if template_config else None)
            or settings.default_anthropic_model
        )
        api_key = settings.anthropic_api_key
    else:
        provider = "openai"
        model = (
            request.model
            or (template_config.get("default_model") if template_config else None)
            or settings.default_openai_model
        )
        api_key = settings.openai_api_key

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{provider} API key is not configured",
        )
    return provider, model, api_key  # type: ignore[return-value]


async def run_agent(
    db: AsyncSession,
    user_id: uuid.UUID,
    request: AgentRunRequest,
) -> AgentExecution:
    template_config = await get_template_config(db, user_id, request.template)

    provider, model, api_key = _resolve_provider_and_model(request, template_config)

    system_prompt = request.system_prompt or (
        template_config.get("system_prompt") if template_config else ""
    ) or "You are a helpful AI assistant."

    user_template = request.user_prompt or (
        template_config.get("user_prompt_template") if template_config else ""
    ) or "{{input}}"
    variables = {**request.variables, **request.input}
    if "input" not in variables and request.input:
        variables["input"] = str(request.input)
    user_prompt = render_prompt(user_template, variables)

    output_mode = request.output_mode
    if template_config and not request.output_mode:
        output_mode = template_config.get("output_mode", OutputMode.TEXT)
    if isinstance(output_mode, OutputMode):
        output_mode = output_mode.value

    json_schema = request.json_schema or (
        template_config.get("json_schema") if template_config else None
    )
    tools = request.tools or (template_config.get("tools") if template_config else None)

    execution = AgentExecution(
        user_id=user_id,
        workflow_id=request.workflow_id,
        node_id=request.node_id,
        template_slug=request.template,
        provider=provider,
        model=model,
        status=ExecutionStatus.RUNNING,
        input_data={
            "variables": request.variables,
            "input": request.input,
            "system_prompt": system_prompt,
            "user_prompt": user_prompt,
        },
    )
    db.add(execution)
    await db.flush()

    start = time.monotonic()
    try:
        async def tool_executor(name: str, args: dict[str, Any]) -> dict[str, Any]:
            return await execute_crm_tool(db, user_id, name, args)

        response = await call_llm(
            provider,
            api_key=api_key,
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            output_mode=output_mode or "text",
            json_schema=json_schema,
            tools=tools,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            tool_executor=tool_executor,
        )

        execution.status = ExecutionStatus.COMPLETED
        execution.output_data = {
            "content": response.content,
            "parsed": response.parsed_json,
        }
        execution.tool_calls = [
            {"name": tc.name, "arguments": tc.arguments, "result": tc.result}
            for tc in response.tool_calls
        ]
        execution.usage = response.usage
        execution.steps = [
            {"step": 1, "type": "llm_call", "provider": provider, "model": model},
            *[
                {"step": i + 2, "type": "tool_call", "tool": tc.name}
                for i, tc in enumerate(response.tool_calls)
            ],
        ]
    except Exception as exc:
        execution.status = ExecutionStatus.FAILED
        execution.error_message = str(exc)

    execution.duration_ms = int((time.monotonic() - start) * 1000)
    execution.completed_at = datetime.now(UTC)
    await db.flush()
    return execution


async def list_executions(
    db: AsyncSession,
    user_id: uuid.UUID,
    workflow_id: uuid.UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[AgentExecution]:
    query = select(AgentExecution).where(AgentExecution.user_id == user_id)
    if workflow_id:
        query = query.where(AgentExecution.workflow_id == workflow_id)
    query = query.order_by(AgentExecution.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_execution(
    db: AsyncSession,
    execution_id: uuid.UUID,
    user_id: uuid.UUID,
) -> AgentExecution | None:
    result = await db.execute(
        select(AgentExecution).where(
            AgentExecution.id == execution_id,
            AgentExecution.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def execute_workflow(
    db: AsyncSession,
    user_id: uuid.UUID,
    workflow_id: uuid.UUID,
    input_data: dict[str, Any],
) -> list[AgentExecution]:
    """Deprecated: use workflow_executor.execute_workflow for full step logging."""
    from app.services import workflow_executor as wf_exec

    _, steps = await wf_exec.execute_workflow(db, user_id, workflow_id, input_data)
    return []
