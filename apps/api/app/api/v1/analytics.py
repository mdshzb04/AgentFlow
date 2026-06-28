from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.analytics import AnalyticsOverview
from app.services import analytics as analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
async def get_overview(
    current_user: CurrentUser,
    db: DbSession,
    days: int = Query(default=30, ge=1, le=365),
) -> AnalyticsOverview:
    return await analytics_service.get_analytics_overview(db, current_user.id, days)
