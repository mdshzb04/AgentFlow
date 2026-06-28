"""Provider health checks run on application startup."""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import get_settings
from app.services.ai.openai_service import openai_service
from app.services.integrations.notion_service import get_notion_service

logger = logging.getLogger(__name__)


async def run_startup_provider_checks() -> dict[str, Any]:
    settings = get_settings()
    results: dict[str, Any] = {}

    openai_result = await openai_service.test_connection()
    results["openai"] = openai_result
    if openai_result.get("healthy"):
        logger.info("OpenAI connection OK (model: %s)", openai_result.get("model"))
    else:
        logger.warning("OpenAI not available: %s", openai_result.get("message"))

    if settings.notion_api_key:
        notion = get_notion_service(settings.notion_api_key)
        notion_result = await notion.test_connection()
        results["notion"] = notion_result
        if notion_result.get("healthy"):
            logger.info("Notion connection OK (workspace: %s)", notion_result.get("workspace_name"))
        else:
            logger.warning("Notion not available: %s", notion_result.get("message"))
    else:
        results["notion"] = {"healthy": False, "message": "NOTION_API_KEY not set"}
        logger.info("Notion API key not configured")

    if settings.google_client_id and settings.google_client_secret:
        logger.info("Google OAuth configured (Gmail + Google Sheets)")
        results["google_oauth"] = {"configured": True}
    else:
        results["google_oauth"] = {"configured": False, "message": "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"}
        logger.info("Google OAuth not configured — Gmail/Sheets Connect disabled")

    return results
