from typing import Any

import httpx

from app.models.integration import IntegrationAccount
from app.services.integrations.accounts import refresh_google_token
from app.services.prompt_templates import render_prompt


def _render(value: str, context: dict[str, Any]) -> str:
    flat = {k: str(v) for k, v in context.items()}
    return render_prompt(value, flat)


async def read_sheet(
    account: IntegrationAccount,
    config: dict[str, Any],
    context: dict[str, Any],
) -> dict[str, Any]:
    access_token = await refresh_google_token(account)
    spreadsheet_id = config.get("spreadsheetId", "")
    range_ = _render(config.get("range", "Sheet1!A1:Z100"), context)

    if not spreadsheet_id:
        raise ValueError("Google Sheets node requires spreadsheetId")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{range_}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return response.json()


async def append_sheet(
    account: IntegrationAccount,
    config: dict[str, Any],
    context: dict[str, Any],
) -> dict[str, Any]:
    access_token = await refresh_google_token(account)
    spreadsheet_id = config.get("spreadsheetId", "")
    range_ = _render(config.get("range", "Sheet1!A1"), context)
    values_template = config.get("values", [])

    if not spreadsheet_id:
        raise ValueError("Google Sheets node requires spreadsheetId")

    values = []
    for row in values_template:
        if isinstance(row, list):
            values.append([_render(str(cell), context) for cell in row])
        else:
            values.append([_render(str(row), context)])

    if not values and context.get("parsed"):
        parsed = context["parsed"]
        if isinstance(parsed, dict):
            values = [[str(v) for v in parsed.values()]]

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{range_}:append",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"valueInputOption": "USER_ENTERED"},
            json={"values": values or [["AgentFlow workflow run"]]},
        )
        response.raise_for_status()
        return response.json()


async def execute_sheets(
    account: IntegrationAccount,
    config: dict[str, Any],
    context: dict[str, Any],
) -> dict[str, Any]:
    action = config.get("action", "append")
    if action == "read":
        return await read_sheet(account, config, context)
    return await append_sheet(account, config, context)
