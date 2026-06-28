"""n8n node registry — metadata, aliases, and official-type detection."""

from __future__ import annotations

import re
from typing import Any

N8N_OFFICIAL_PREFIXES: tuple[str, ...] = (
    "n8n-nodes-base.",
    "@n8n/n8n-nodes-langchain.",
    "n8n-nodes-langchain.",
)

# Deprecated n8n node types → current equivalents.
DEPRECATED_ALIASES: dict[str, str] = {
    "n8n-nodes-base.function": "n8n-nodes-base.code",
    "n8n-nodes-base.functionItem": "n8n-nodes-base.code",
    "n8n-nodes-base.venafi": "n8n-nodes-base.venafiTlsProtectCloud",
    "n8n-nodes-base.venafiTrigger": "n8n-nodes-base.venafiTlsProtectCloudTrigger",
}

# Curated metadata for common node types (extensible without touching core import logic).
KNOWN_NODES: dict[str, dict[str, str]] = {
    "n8n-nodes-base.manualTrigger": {"display_name": "Manual Trigger", "category": "Trigger"},
    "n8n-nodes-base.start": {"display_name": "Start", "category": "Trigger"},
    "n8n-nodes-base.webhook": {"display_name": "Webhook", "category": "Trigger"},
    "n8n-nodes-base.cron": {"display_name": "Cron", "category": "Trigger"},
    "n8n-nodes-base.schedule": {"display_name": "Schedule", "category": "Trigger"},
    "n8n-nodes-base.formTrigger": {"display_name": "Form Trigger", "category": "Trigger"},
    "n8n-nodes-base.emailReadImap": {"display_name": "Email Trigger (IMAP)", "category": "Trigger"},
    "n8n-nodes-base.if": {"display_name": "IF", "category": "Logic"},
    "n8n-nodes-base.switch": {"display_name": "Switch", "category": "Logic"},
    "n8n-nodes-base.merge": {"display_name": "Merge", "category": "Logic"},
    "n8n-nodes-base.splitInBatches": {"display_name": "Split In Batches", "category": "Logic"},
    "n8n-nodes-base.wait": {"display_name": "Wait", "category": "Logic"},
    "n8n-nodes-base.noOp": {"display_name": "No Operation", "category": "Core"},
    "n8n-nodes-base.set": {"display_name": "Set", "category": "Core"},
    "n8n-nodes-base.code": {"display_name": "Code", "category": "Core"},
    "n8n-nodes-base.httpRequest": {"display_name": "HTTP Request", "category": "HTTP"},
    "n8n-nodes-base.respondToWebhook": {"display_name": "Respond to Webhook", "category": "HTTP"},
    "n8n-nodes-base.aggregate": {"display_name": "Aggregate", "category": "Core"},
    "n8n-nodes-base.gmail": {"display_name": "Gmail", "category": "Communication"},
    "n8n-nodes-base.googleSheets": {"display_name": "Google Sheets", "category": "Google Workspace"},
    "n8n-nodes-base.googleDrive": {"display_name": "Google Drive", "category": "Google Workspace"},
    "n8n-nodes-base.googleDocs": {"display_name": "Google Docs", "category": "Google Workspace"},
    "n8n-nodes-base.googleCalendar": {"display_name": "Google Calendar", "category": "Google Workspace"},
    "n8n-nodes-base.slack": {"display_name": "Slack", "category": "Communication"},
    "n8n-nodes-base.discord": {"display_name": "Discord", "category": "Communication"},
    "n8n-nodes-base.telegram": {"display_name": "Telegram", "category": "Communication"},
    "n8n-nodes-base.notion": {"display_name": "Notion", "category": "Productivity"},
    "n8n-nodes-base.github": {"display_name": "GitHub", "category": "Development"},
    "n8n-nodes-base.postgres": {"display_name": "Postgres", "category": "Database"},
    "n8n-nodes-base.mysql": {"display_name": "MySQL", "category": "Database"},
    "n8n-nodes-base.mongodb": {"display_name": "MongoDB", "category": "Database"},
    "n8n-nodes-base.redis": {"display_name": "Redis", "category": "Database"},
    "n8n-nodes-base.openAi": {"display_name": "OpenAI", "category": "AI"},
    "n8n-nodes-base.anthropic": {"display_name": "Anthropic", "category": "AI"},
    "n8n-nodes-base.workflow": {"display_name": "Execute Workflow", "category": "Flow"},
    "n8n-nodes-base.executeWorkflow": {"display_name": "Execute Workflow", "category": "Flow"},
    "n8n-nodes-base.awsS3": {"display_name": "AWS S3", "category": "AWS"},
    "n8n-nodes-base.awsLambda": {"display_name": "AWS Lambda", "category": "AWS"},
    "n8n-nodes-base.microsoftOutlook": {"display_name": "Microsoft Outlook", "category": "Microsoft"},
    "n8n-nodes-base.microsoftTeams": {"display_name": "Microsoft Teams", "category": "Microsoft"},
    "@n8n/n8n-nodes-langchain.agent": {"display_name": "AI Agent", "category": "AI / LangChain"},
    "@n8n/n8n-nodes-langchain.lmChatOpenAi": {"display_name": "OpenAI Chat Model", "category": "AI / LangChain"},
    "@n8n/n8n-nodes-langchain.lmChatAnthropic": {"display_name": "Anthropic Chat Model", "category": "AI / LangChain"},
    "@n8n/n8n-nodes-langchain.lmChatGoogleGemini": {"display_name": "Google Gemini Chat Model", "category": "AI / LangChain"},
    "@n8n/n8n-nodes-langchain.toolWorkflow": {"display_name": "Workflow Tool", "category": "AI / LangChain"},
    "@n8n/n8n-nodes-langchain.manualTrigger": {"display_name": "Manual Trigger", "category": "Trigger"},
}

# Keys preserved on every imported n8n node for lossless round-trip.
N8N_NODE_PRESERVE_KEYS: tuple[str, ...] = (
    "id",
    "name",
    "type",
    "typeVersion",
    "parameters",
    "position",
    "credentials",
    "disabled",
    "notes",
    "webhookId",
    "continueOnFail",
    "retryOnFail",
    "maxTries",
    "waitBetweenTries",
    "alwaysOutputData",
    "executeOnce",
    "onError",
    "color",
    "pinData",
)

N8N_WORKFLOW_PRESERVE_KEYS: tuple[str, ...] = (
    "settings",
    "pinnedData",
    "meta",
    "staticData",
    "tags",
    "versionId",
    "hash",
)


def normalize_n8n_type(n8n_type: str) -> str:
    return DEPRECATED_ALIASES.get(n8n_type, n8n_type)


def is_official_n8n_type(n8n_type: str) -> bool:
    normalized = normalize_n8n_type(n8n_type)
    return any(normalized.startswith(prefix) for prefix in N8N_OFFICIAL_PREFIXES)


def _short_type(n8n_type: str) -> str:
    for prefix in N8N_OFFICIAL_PREFIXES:
        if n8n_type.startswith(prefix):
            return n8n_type[len(prefix) :]
    return n8n_type


def _camel_to_title(value: str) -> str:
    spaced = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", value)
    spaced = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1 \2", spaced)
    return spaced.replace("_", " ").replace("-", " ").strip().title()


def _infer_category(n8n_type: str, short: str) -> str:
    lower = n8n_type.lower()
    short_lower = short.lower()
    if short_lower.endswith("trigger") or "trigger" in short_lower:
        return "Trigger"
    if "langchain" in lower or short_lower.endswith("tool"):
        return "AI / LangChain"
    if short_lower.startswith("google") or "googledocs" in short_lower or "googledrive" in short_lower:
        return "Google Workspace"
    if short_lower.startswith("microsoft") or short_lower in {"outlook", "teams", "onedrive"}:
        return "Microsoft"
    if short_lower.startswith("aws"):
        return "AWS"
    if short_lower in {"slack", "discord", "telegram", "twilio", "whatsapp", "gmail", "sendgrid"}:
        return "Communication"
    if any(k in short_lower for k in ("postgres", "mysql", "mongo", "redis", "sqlite", "supabase", "airtable")):
        return "Database"
    if any(k in short_lower for k in ("openai", "anthropic", "gemini", "huggingface", "cohere", "mistral")):
        return "AI"
    if short_lower in {"if", "switch", "merge", "splitinbatches", "wait", "filter", "compare"}:
        return "Logic"
    if short_lower in {"httprequest", "respondtowebhook", "webhook"}:
        return "HTTP"
    if short_lower in {"notion", "airtable", "clickup", "jira", "linear", "asana", "trello"}:
        return "Productivity"
    if short_lower in {"github", "gitlab", "bitbucket", "jira"}:
        return "Development"
    if short_lower in {"workflow", "executeworkflow", "executeworkflowtrigger"}:
        return "Flow"
    if is_official_n8n_type(n8n_type):
        return "Core"
    return "Community"


def get_node_metadata(n8n_type: str) -> dict[str, Any]:
    normalized = normalize_n8n_type(n8n_type)
    known = KNOWN_NODES.get(normalized) or KNOWN_NODES.get(n8n_type)
    short = _short_type(normalized)
    display_name = known["display_name"] if known else _camel_to_title(short)
    category = known["category"] if known else _infer_category(normalized, short)
    return {
        "n8n_type": n8n_type,
        "normalized_type": normalized,
        "display_name": display_name,
        "category": category,
        "official": is_official_n8n_type(n8n_type),
        "short_type": short,
    }


def build_node_snapshot(n8n_node: dict[str, Any]) -> dict[str, Any]:
    """Extract a lossless n8n node snapshot from raw workflow JSON."""
    snapshot: dict[str, Any] = {}
    for key in N8N_NODE_PRESERVE_KEYS:
        if key in n8n_node:
            snapshot[key] = n8n_node[key]
    # Preserve any extra keys n8n may add in future versions.
    for key, value in n8n_node.items():
        if key not in snapshot:
            snapshot[key] = value
    if "parameters" not in snapshot:
        snapshot["parameters"] = {}
    return snapshot


def extract_workflow_extras(n8n_data: dict[str, Any]) -> dict[str, Any]:
    extras: dict[str, Any] = {}
    for key in N8N_WORKFLOW_PRESERVE_KEYS:
        if key in n8n_data:
            extras[key] = n8n_data[key]
    return extras
