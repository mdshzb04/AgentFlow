"""CRM tool execution for AI agents and workflows."""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services import crm as crm_service


CRM_TOOL_NAMES = {
    "lookup_contact",
    "create_lead",
    "update_lead",
    "create_contact",
    "update_contact",
    "create_company",
    "create_deal",
    "update_deal",
    "create_task",
    "create_note",
    "schedule_meeting",
    "send_email",
}


async def execute_crm_tool(
    db: AsyncSession,
    user_id: uuid.UUID,
    name: str,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    if name == "lookup_contact":
        query = arguments.get("query", "")
        contact = await crm_service.lookup_contact(db, user_id, query)
        if contact is None:
            return {"found": False, "contact": None}
        return {"found": True, "contact": crm_service._to_dict(contact)}

    if name == "create_lead":
        return await crm_service.execute_crm_action(
            db, user_id, entity="lead", action="create", fields=arguments
        )

    if name == "update_lead":
        record_id = arguments.get("lead_id") or arguments.get("id")
        fields = {k: v for k, v in arguments.items() if k not in ("lead_id", "id")}
        return await crm_service.execute_crm_action(
            db,
            user_id,
            entity="lead",
            action="update",
            record_id=uuid.UUID(str(record_id)) if record_id else None,
            fields=fields,
        )

    if name == "create_contact":
        return await crm_service.execute_crm_action(
            db, user_id, entity="contact", action="create", fields=arguments
        )

    if name == "update_contact":
        record_id = arguments.get("contact_id") or arguments.get("id")
        fields = {k: v for k, v in arguments.items() if k not in ("contact_id", "id")}
        return await crm_service.execute_crm_action(
            db,
            user_id,
            entity="contact",
            action="update",
            record_id=uuid.UUID(str(record_id)) if record_id else None,
            fields=fields,
        )

    if name == "create_company":
        return await crm_service.execute_crm_action(
            db, user_id, entity="company", action="create", fields=arguments
        )

    if name == "create_deal":
        return await crm_service.execute_crm_action(
            db, user_id, entity="deal", action="create", fields=arguments
        )

    if name == "update_deal":
        record_id = arguments.get("deal_id") or arguments.get("id")
        fields = {k: v for k, v in arguments.items() if k not in ("deal_id", "id")}
        return await crm_service.execute_crm_action(
            db,
            user_id,
            entity="deal",
            action="update",
            record_id=uuid.UUID(str(record_id)) if record_id else None,
            fields=fields,
        )

    if name == "create_task":
        return await crm_service.execute_crm_action(
            db, user_id, entity="task", action="create", fields=arguments
        )

    if name == "create_note":
        return await crm_service.execute_crm_action(
            db, user_id, entity="note", action="create", fields=arguments
        )

    if name == "schedule_meeting":
        task_result = await crm_service.execute_crm_action(
            db,
            user_id,
            entity="task",
            action="create",
            fields={
                "title": arguments.get("title", "Meeting"),
                "description": (
                    f"Meeting with {arguments.get('contact_email', '')} "
                    f"at {arguments.get('datetime', '')}"
                ),
                "due_date": str(arguments.get("datetime", ""))[:10] if arguments.get("datetime") else None,
                "status": "pending",
                "priority": "high",
            },
        )
        return {
            "scheduled": True,
            "meeting_id": task_result.get("record", {}).get("id"),
            "title": arguments.get("title"),
            "datetime": arguments.get("datetime"),
            "attendees": [arguments.get("contact_email")],
            "task": task_result.get("record"),
        }

    if name == "send_email":
        return await _send_email_via_gmail(db, user_id, arguments)


async def _send_email_via_gmail(
    db: AsyncSession,
    user_id: uuid.UUID,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    """Send a real email through the user's connected Gmail account.

    Falls back to an honest 'not connected' result instead of a fake queued draft.
    """
    from datetime import UTC, datetime

    from app.services.integrations.accounts import list_accounts
    from app.services.integrations.gmail import send_gmail
    from app.models.integration import IntegrationProvider
    from app.models.integration_platform import IntegrationAuditLog

    to = arguments.get("to", "")
    subject = arguments.get("subject", "")
    body = arguments.get("body") or arguments.get("content") or ""

    accounts = await list_accounts(db, user_id, provider=IntegrationProvider.GMAIL)
    if not accounts:
        return {
            "sent": False,
            "to": to,
            "subject": subject,
            "status": "not_connected",
            "error": "No Gmail account connected. Connect Gmail on the Integrations page to send email.",
        }

    account = accounts[0]
    config = {"to": to, "subject": subject, "body": body}
    audit = IntegrationAuditLog(
        user_id=user_id,
        action="gmail_send",
        details={"to": to, "subject": subject},
    )
    try:
        result = await send_gmail(db, user_id, account, config, {})
        audit.details = {**audit.details, "status": "sent", "message_id": result.get("id")}
        db.add(audit)
        await db.flush()
        return {
            "sent": True,
            "message_id": result.get("id"),
            "to": to,
            "subject": subject,
            "status": "sent",
            "from": account.account_email,
        }
    except Exception as exc:
        audit.details = {**audit.details, "status": "failed", "error": str(exc)}
        db.add(audit)
        await db.flush()
        return {
            "sent": False,
            "to": to,
            "subject": subject,
            "status": "failed",
            "error": str(exc),
        }

    return {"error": f"Unknown tool: {name}"}


async def execute_crm_node(
    db: AsyncSession,
    user_id: uuid.UUID,
    config: dict[str, Any],
    context: dict[str, Any],
) -> dict[str, Any]:
    entity = config.get("entity", "lead")
    action = config.get("action", "create")
    record_id = config.get("recordId") or config.get("record_id")
    fields = config.get("fields", {})

    parsed_id = uuid.UUID(str(record_id)) if record_id else None
    result = await crm_service.execute_crm_action(
        db,
        user_id,
        entity=str(entity),
        action=str(action),
        record_id=parsed_id,
        fields=fields if isinstance(fields, dict) else {},
        context=context,
    )

    record = result.get("record")
    if record and record.get("id"):
        context[f"last_{entity}_id"] = record["id"]
        context[f"crm_{entity}"] = record

    return result
