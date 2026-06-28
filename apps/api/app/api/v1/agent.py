import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.agent import (
    AgentRunRequest,
    ExecutionRead,
    PromptTemplateCreate,
    PromptTemplateRead,
    WorkflowExecuteRequest,
    WorkflowExecuteResponse,
)
from app.schemas.integration import (
    StepExecutionRead,
    WorkflowExecuteResponseV2,
    WorkflowExecutionRead,
)
from app.services import agent as agent_service
from app.services import workflow_executor

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/templates", response_model=list[PromptTemplateRead])
async def list_templates(
    current_user: CurrentUser,
    db: DbSession,
) -> list[PromptTemplateRead]:
    templates = await agent_service.list_all_templates(db, current_user.id)
    return templates


@router.post("/templates", response_model=PromptTemplateRead, status_code=status.HTTP_201_CREATED)
async def create_template(
    body: PromptTemplateCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> PromptTemplateRead:
    template = await agent_service.create_custom_template(db, current_user.id, body)
    return PromptTemplateRead(
        id=str(template.id),
        slug=template.slug,
        name=template.name,
        description=template.description,
        category=template.category.value,
        system_prompt=template.system_prompt,
        user_prompt_template=template.user_prompt_template,
        output_mode=template.output_mode.value,
        json_schema=template.json_schema,
        tools=template.tools,
        default_provider=template.default_provider,
        default_model=template.default_model,
        is_builtin=False,
    )


@router.post("/run", response_model=ExecutionRead)
async def run_agent(
    body: AgentRunRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ExecutionRead:
    execution = await agent_service.run_agent(db, current_user.id, body)
    return execution


@router.get("/executions", response_model=list[ExecutionRead])
async def list_executions(
    current_user: CurrentUser,
    db: DbSession,
    workflow_id: uuid.UUID | None = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[ExecutionRead]:
    executions = await agent_service.list_executions(
        db, current_user.id, workflow_id=workflow_id, limit=limit, offset=offset
    )
    return executions


@router.get("/executions/{execution_id}", response_model=ExecutionRead)
async def get_execution(
    execution_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> ExecutionRead:
    execution = await agent_service.get_execution(db, execution_id, current_user.id)
    if execution is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found")
    return execution


@router.post("/workflows/{workflow_id}/execute", response_model=WorkflowExecuteResponseV2)
async def execute_workflow(
    workflow_id: uuid.UUID,
    body: WorkflowExecuteRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> WorkflowExecuteResponseV2:
    wf_exec, steps = await workflow_executor.execute_workflow(
        db, current_user.id, workflow_id, body.input
    )
    return WorkflowExecuteResponseV2(
        workflow_execution=WorkflowExecutionRead.model_validate(wf_exec),
        steps=[StepExecutionRead.model_validate(s) for s in steps],
        total_steps=len(steps),
    )
