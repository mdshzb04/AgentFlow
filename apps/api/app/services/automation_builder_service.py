"""Generate and deploy automations from natural language."""

from __future__ import annotations

import json
import logging
import re
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.workflow import WorkflowStatus
from app.schemas.automation_builder import (
    AutomationDeployResponse,
    AutomationPlan,
    WebhookPlan,
)
from app.schemas.workflow import WorkflowCreate, WorkflowDefinition
from app.services import workflow as workflow_service
from app.services.integrations.webhook_service import webhook_service
from app.services.llm import call_openai

logger = logging.getLogger(__name__)

VALID_NODE_TYPES = {
    "trigger",
    "webhook",
    "ai",
    "crm",
    "n8n",
    "condition",
    "gmail",
    "google_sheets",
    "end",
}

AUTOMATION_BUILDER_SYSTEM = """You are AgentFlow's automation architect. Convert natural language into a structured automation plan.

Return valid JSON with this exact shape:
{
  "name": "Short workflow name",
  "description": "One sentence description",
  "summary": "Friendly conversational reply explaining what you built and how it works",
  "trigger_type": "webhook" | "manual",
  "steps_summary": ["Plain English step 1", "Plain English step 2"],
  "workflow": {
    "nodes": [
      {
        "id": "trigger-abc12345",
        "type": "trigger",
        "position": {"x": 100, "y": 150},
        "data": {"label": "Start", "config": {}}
      }
    ],
    "edges": [
      {"id": "e-trigger-abc12345-gmail-def67890", "source": "trigger-abc12345", "target": "gmail-def67890"}
    ]
  },
  "webhook": null
}

Node types: trigger, webhook, ai, crm, gmail, google_sheets, condition, end

Node config examples:
- ai: {"template": "email_generation", "provider": "openai", "outputMode": "text", "temperature": 0.7, "userPrompt": "..."}
- gmail: {"action": "send", "to": "team@company.com", "subject": "Report", "body": "{{last_ai_output}}"}
- crm: {"entity": "lead", "action": "create", "fields": {"title": "{{name}}", "email": "{{email}}", "status": "new"}}
- webhook inbound: {"direction": "inbound"}
- webhook outbound: {"direction": "outbound", "method": "POST", "url": "https://..."}

Rules:
- Always include a linear chain ending with an "end" node
- Position nodes left-to-right: x = 100 + index * 220, y = 150
- Use trigger_type "webhook" for event-driven automations (include webhook with direction incoming)
- Use trigger_type "manual" for on-demand runs (webhook should be null)
- For "when a new lead is created" use webhook trigger with inbound webhook node first
- AI templates available: lead_qualification, email_generation, meeting_summary
- Keep workflows practical: 3-6 nodes typical
- The word json must appear in your reasoning when outputting structured data
"""


def _slug_id(node_type: str) -> str:
    return f"{node_type}-{uuid.uuid4().hex[:8]}"


def _normalize_definition(raw: dict[str, Any]) -> WorkflowDefinition:
    nodes = raw.get("nodes") or []
    edges = raw.get("edges") or []
    normalized_nodes: list[dict[str, Any]] = []
    id_map: dict[str, str] = {}

    for index, node in enumerate(nodes):
        node_type = str(node.get("type", "trigger"))
        if node_type not in VALID_NODE_TYPES:
            node_type = "ai" if index > 0 else "trigger"
        old_id = str(node.get("id") or _slug_id(node_type))
        new_id = _slug_id(node_type)
        id_map[old_id] = new_id

        data = node.get("data") or {}
        if not isinstance(data, dict):
            data = {"label": node_type.title()}
        if "label" not in data:
            data["label"] = node_type.title()
        if "config" not in data:
            data["config"] = {}

        normalized_nodes.append(
            {
                "id": new_id,
                "type": node_type,
                "position": {"x": 100 + index * 220, "y": 150},
                "data": data,
            }
        )

    if not normalized_nodes:
        trigger_id = _slug_id("trigger")
        end_id = _slug_id("end")
        normalized_nodes = [
            {
                "id": trigger_id,
                "type": "trigger",
                "position": {"x": 100, "y": 150},
                "data": {"label": "Trigger", "config": {}},
            },
            {
                "id": end_id,
                "type": "end",
                "position": {"x": 320, "y": 150},
                "data": {"label": "End", "config": {}},
            },
        ]
        id_map = {trigger_id: trigger_id, end_id: end_id}

    if normalized_nodes[-1]["type"] != "end":
        end_id = _slug_id("end")
        normalized_nodes.append(
            {
                "id": end_id,
                "type": "end",
                "position": {"x": 100 + len(normalized_nodes) * 220, "y": 150},
                "data": {"label": "End", "config": {}},
            }
        )

    normalized_edges: list[dict[str, Any]] = []
    seen_pairs: set[tuple[str, str]] = set()
    for edge in edges:
        source = id_map.get(str(edge.get("source", "")), str(edge.get("source", "")))
        target = id_map.get(str(edge.get("target", "")), str(edge.get("target", "")))
        if source and target and (source, target) not in seen_pairs:
            seen_pairs.add((source, target))
            normalized_edges.append(
                {
                    "id": f"e-{source}-{target}",
                    "source": source,
                    "target": target,
                }
            )

    node_ids = [n["id"] for n in normalized_nodes]
    for i in range(len(node_ids) - 1):
        pair = (node_ids[i], node_ids[i + 1])
        if pair not in seen_pairs:
            normalized_edges.append(
                {
                    "id": f"e-{pair[0]}-{pair[1]}",
                    "source": pair[0],
                    "target": pair[1],
                }
            )

    return WorkflowDefinition(
        nodes=normalized_nodes,
        edges=normalized_edges,
        viewport={"x": 0, "y": 0, "zoom": 0.85},
    )


def _parse_plan(raw: dict[str, Any]) -> AutomationPlan:
    workflow_raw = raw.get("workflow") or {}
    definition = _normalize_definition(workflow_raw)

    webhook = None
    if raw.get("webhook"):
        wh = raw["webhook"]
        webhook = WebhookPlan(
            name=str(wh.get("name") or raw.get("name", "Webhook")),
            direction=str(wh.get("direction") or "incoming"),
        )

    trigger_type = str(raw.get("trigger_type") or "manual")
    if trigger_type == "schedule":
        trigger_type = "manual"
    if trigger_type == "webhook" and webhook is None:
        webhook = WebhookPlan(name=f"{raw.get('name', 'Automation')} Webhook")

    steps = raw.get("steps_summary") or []
    if not isinstance(steps, list):
        steps = [str(steps)]

    return AutomationPlan(
        name=str(raw.get("name") or "New Automation")[:255],
        description=raw.get("description"),
        summary=str(raw.get("summary") or "Here's an automation based on your request."),
        trigger_type=trigger_type,
        steps_summary=[str(s) for s in steps],
        workflow=definition,
        webhook=webhook,
    )


def _fallback_plan(prompt: str) -> AutomationPlan:
    """Rule-based fallback when LLM is unavailable."""
    lower = prompt.lower()
    name = "Custom Automation"
    trigger_type = "manual"
    webhook = None
    nodes: list[dict[str, Any]] = []
    steps: list[str] = []

    trigger_id = _slug_id("trigger")
    nodes.append(
        {
            "id": trigger_id,
            "type": "trigger",
            "position": {"x": 100, "y": 150},
            "data": {"label": "Start", "config": {}},
        }
    )
    steps.append("Start the automation")

    if "email" in lower or "report" in lower or "send" in lower:
        nid = _slug_id("ai")
        nodes.append(
            {
                "id": nid,
                "type": "ai",
                "position": {"x": 320, "y": 150},
                "data": {
                    "label": "Generate Content",
                    "config": {
                        "template": "email_generation",
                        "provider": "openai",
                        "outputMode": "text",
                        "temperature": 0.7,
                        "userPrompt": prompt,
                    },
                },
            }
        )
        steps.append("Generate content with AI")
        if "email" in lower or "send" in lower:
            gid = _slug_id("gmail")
            nodes.append(
                {
                    "id": gid,
                    "type": "gmail",
                    "position": {"x": 540, "y": 150},
                    "data": {
                        "label": "Send Email",
                        "config": {
                            "action": "send",
                            "to": "team@company.com",
                            "subject": "Automation Report",
                            "body": "{{last_ai_output}}",
                        },
                    },
                }
            )
            steps.append("Send email via Gmail")

    if "lead" in lower:
        if "webhook" in lower or "created" in lower or "new" in lower:
            trigger_type = "webhook"
            webhook = WebhookPlan(name="New Lead Webhook")
            nodes[0] = {
                "id": _slug_id("webhook"),
                "type": "webhook",
                "position": {"x": 100, "y": 150},
                "data": {"label": "New Lead Webhook", "config": {"direction": "inbound"}},
            }
            steps[0] = "When a webhook receives a new lead payload"
        cid = _slug_id("crm")
        nodes.append(
            {
                "id": cid,
                "type": "crm",
                "position": {"x": 320, "y": 150},
                "data": {
                    "label": "Create Lead",
                    "config": {
                        "entity": "lead",
                        "action": "create",
                        "fields": {
                            "title": "{{name}}",
                            "email": "{{email}}",
                            "status": "new",
                        },
                    },
                },
            }
        )
        steps.append("Create or update lead in CRM")

    if any(word in lower for word in ("every", "daily", "weekly", "monday", "schedule")):
        nodes[0]["data"]["label"] = "Manual Trigger"
        steps[0] = "Run manually from the dashboard"

    if len(nodes) == 1:
        nid = _slug_id("ai")
        nodes.append(
            {
                "id": nid,
                "type": "ai",
                "position": {"x": 320, "y": 150},
                "data": {
                    "label": "AI Step",
                    "config": {
                        "template": "email_generation",
                        "provider": "openai",
                        "outputMode": "text",
                        "userPrompt": prompt,
                    },
                },
            }
        )
        steps.append("Process request with AI")

    end_id = _slug_id("end")
    nodes.append(
        {
            "id": end_id,
            "type": "end",
            "position": {"x": 100 + len(nodes) * 220, "y": 150},
            "data": {"label": "End", "config": {}},
        }
    )
    steps.append("Complete")

    edges = [
        {
            "id": f"e-{nodes[i]['id']}-{nodes[i + 1]['id']}",
            "source": nodes[i]["id"],
            "target": nodes[i + 1]["id"],
        }
        for i in range(len(nodes) - 1)
    ]

    if "monday" in lower and "report" in lower:
        name = "Weekly Sales Report"

    return AutomationPlan(
        name=name,
        description=prompt[:500],
        summary=f"I built an automation that will: {' → '.join(steps)}.",
        trigger_type=trigger_type,
        steps_summary=steps,
        workflow=_normalize_definition({"nodes": nodes, "edges": edges}),
        webhook=webhook,
    )


class AutomationBuilderService:
    async def build_plan(self, prompt: str) -> AutomationPlan:
        settings = get_settings()
        if not settings.openai_api_key:
            logger.warning("OpenAI not configured; using rule-based automation builder")
            return _fallback_plan(prompt)

        try:
            response = await call_openai(
                api_key=settings.openai_api_key,
                model=settings.default_openai_model,
                system_prompt=AUTOMATION_BUILDER_SYSTEM,
                user_prompt=f"Build an automation for:\n\n{prompt}",
                output_mode="json",
                temperature=0.4,
                max_tokens=4096,
            )
            raw = response.parsed_json
            if not raw and response.content:
                raw = json.loads(response.content)
            if not isinstance(raw, dict):
                raise ValueError("Invalid LLM response")
            return _parse_plan(raw)
        except Exception:
            logger.exception("LLM automation build failed; using fallback")
            return _fallback_plan(prompt)

    async def deploy_plan(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        plan: AutomationPlan,
        *,
        activate: bool = True,
    ) -> AutomationDeployResponse:
        workflow = await workflow_service.create_workflow(
            db,
            user_id,
            WorkflowCreate(
                name=plan.name,
                description=plan.description,
                status=WorkflowStatus.ACTIVE if activate else WorkflowStatus.DRAFT,
                definition=plan.workflow,
            ),
        )

        webhook_id = None
        webhook_url = None

        if plan.webhook and plan.webhook.direction == "incoming":
            endpoint, _secret = await webhook_service.create_incoming(
                db,
                user_id,
                name=plan.webhook.name,
                workflow_id=workflow.id,
            )
            webhook_id = endpoint.id
            webhook_url = webhook_service.build_inbound_url(endpoint.url_token)

        parts = [f"Workflow '{plan.name}' deployed"]
        if webhook_id:
            parts.append("incoming webhook ready")

        return AutomationDeployResponse(
            workflow_id=workflow.id,
            workflow_name=workflow.name,
            webhook_id=webhook_id,
            webhook_url=webhook_url,
            message=". ".join(parts) + ".",
        )


automation_builder_service = AutomationBuilderService()
