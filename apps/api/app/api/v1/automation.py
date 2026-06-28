from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.automation_builder import (
    AutomationBuildRequest,
    AutomationBuildResponse,
    AutomationDeployRequest,
    AutomationDeployResponse,
)
from app.services.automation_builder_service import automation_builder_service

router = APIRouter(prefix="/automation", tags=["automation"])


@router.post("/build", response_model=AutomationBuildResponse)
async def build_automation(
    body: AutomationBuildRequest,
    _current_user: CurrentUser,
) -> AutomationBuildResponse:
    try:
        plan = await automation_builder_service.build_plan(body.prompt.strip())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return AutomationBuildResponse(plan=plan)


@router.post("/deploy", response_model=AutomationDeployResponse, status_code=status.HTTP_201_CREATED)
async def deploy_automation(
    body: AutomationDeployRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> AutomationDeployResponse:
    try:
        result = await automation_builder_service.deploy_plan(
            db,
            current_user.id,
            body.plan,
            activate=body.activate,
        )
        await db.commit()
        return result
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
