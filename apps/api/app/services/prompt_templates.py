from typing import Any

from app.core.config import get_settings
from app.models.agent import OutputMode, TemplateCategory

BUILTIN_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "lookup_contact",
            "description": "Look up a contact by email or name in the CRM",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Email or name to search"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_lead",
            "description": "Create a new lead in the CRM",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "email": {"type": "string"},
                    "phone": {"type": "string"},
                    "source": {"type": "string"},
                    "score": {"type": "integer"},
                    "status": {"type": "string", "enum": ["new", "contacted", "qualified", "converted", "lost"]},
                    "notes_summary": {"type": "string"},
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_lead",
            "description": "Update an existing lead in the CRM",
            "parameters": {
                "type": "object",
                "properties": {
                    "lead_id": {"type": "string"},
                    "status": {"type": "string"},
                    "score": {"type": "integer"},
                    "notes_summary": {"type": "string"},
                },
                "required": ["lead_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_contact",
            "description": "Create a new contact in the CRM",
            "parameters": {
                "type": "object",
                "properties": {
                    "first_name": {"type": "string"},
                    "last_name": {"type": "string"},
                    "email": {"type": "string"},
                    "phone": {"type": "string"},
                    "title": {"type": "string"},
                },
                "required": ["first_name", "last_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_deal",
            "description": "Create a new deal in the CRM",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "amount": {"type": "number"},
                    "stage": {"type": "string"},
                    "contact_id": {"type": "string"},
                    "company_id": {"type": "string"},
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Create a follow-up task in the CRM",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "due_date": {"type": "string", "description": "ISO date YYYY-MM-DD"},
                    "priority": {"type": "string", "enum": ["low", "medium", "high"]},
                    "related_type": {"type": "string"},
                    "related_id": {"type": "string"},
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_note",
            "description": "Attach a note to a CRM record",
            "parameters": {
                "type": "object",
                "properties": {
                    "body": {"type": "string"},
                    "related_type": {"type": "string", "enum": ["lead", "contact", "company", "deal", "task"]},
                    "related_id": {"type": "string"},
                },
                "required": ["body", "related_type", "related_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "schedule_meeting",
            "description": "Schedule a meeting with a contact",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_email": {"type": "string"},
                    "title": {"type": "string"},
                    "datetime": {"type": "string", "description": "ISO 8601 datetime"},
                    "duration_minutes": {"type": "integer", "default": 30},
                },
                "required": ["contact_email", "title", "datetime"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "send_email",
            "description": "Send an email to a contact",
            "parameters": {
                "type": "object",
                "properties": {
                    "to": {"type": "string"},
                    "subject": {"type": "string"},
                    "body": {"type": "string"},
                },
                "required": ["to", "subject", "body"],
            },
        },
    },
]

BUILTIN_TEMPLATES: list[dict[str, Any]] = [
    {
        "slug": "lead_qualification",
        "name": "Lead Qualification",
        "description": "Score and qualify a sales lead based on firmographic and behavioral data",
        "category": TemplateCategory.LEAD_QUALIFICATION,
        "system_prompt": (
            "You are an expert B2B sales development representative. "
            "Analyze the lead data provided and produce a qualification assessment. "
            "Be objective, data-driven, and actionable."
        ),
        "user_prompt_template": (
            "Qualify this lead:\n\n"
            "Name: {{name}}\n"
            "Company: {{company}}\n"
            "Title: {{title}}\n"
            "Email: {{email}}\n"
            "Industry: {{industry}}\n"
            "Company Size: {{company_size}}\n"
            "Source: {{source}}\n"
            "Notes: {{notes}}\n\n"
            "Provide a qualification score (0-100), tier (hot/warm/cold), "
            "key signals, risks, and recommended next action."
        ),
        "output_mode": OutputMode.JSON,
        "json_schema": {
            "type": "object",
            "properties": {
                "score": {"type": "number", "description": "Qualification score 0-100"},
                "tier": {"type": "string", "enum": ["hot", "warm", "cold"]},
                "signals": {"type": "array", "items": {"type": "string"}},
                "risks": {"type": "array", "items": {"type": "string"}},
                "next_action": {"type": "string"},
                "reasoning": {"type": "string"},
            },
            "required": ["score", "tier", "signals", "risks", "next_action", "reasoning"],
        },
        "tools": [BUILTIN_TOOLS[0], BUILTIN_TOOLS[1], BUILTIN_TOOLS[2], BUILTIN_TOOLS[6]],
        "default_provider": "openai",
        "default_model": None,
    },
    {
        "slug": "email_generation",
        "name": "Email Generation",
        "description": "Generate personalized outreach or follow-up emails for prospects",
        "category": TemplateCategory.EMAIL_GENERATION,
        "system_prompt": (
            "You are a professional sales copywriter. "
            "Write concise, personalized emails that drive engagement. "
            "Match the requested tone and keep emails under 200 words unless specified otherwise."
        ),
        "user_prompt_template": (
            "Write a {{email_type}} email.\n\n"
            "Recipient: {{recipient_name}} ({{recipient_title}} at {{recipient_company}})\n"
            "Sender: {{sender_name}}\n"
            "Context: {{context}}\n"
            "Tone: {{tone}}\n"
            "Key points to include: {{key_points}}\n"
            "Call to action: {{call_to_action}}"
        ),
        "output_mode": OutputMode.JSON,
        "json_schema": {
            "type": "object",
            "properties": {
                "subject": {"type": "string"},
                "body": {"type": "string"},
                "preview_text": {"type": "string"},
                "follow_up_suggestion": {"type": "string"},
            },
            "required": ["subject", "body"],
        },
        "tools": [BUILTIN_TOOLS[7], BUILTIN_TOOLS[5], BUILTIN_TOOLS[6]],
        "default_provider": "openai",
        "default_model": None,
    },
    {
        "slug": "meeting_summary",
        "name": "Meeting Summary",
        "description": "Summarize meeting transcripts into action items and key decisions",
        "category": TemplateCategory.MEETING_SUMMARY,
        "system_prompt": (
            "You are an executive assistant skilled at distilling meetings into "
            "clear summaries. Extract decisions, action items, and follow-ups accurately."
        ),
        "user_prompt_template": (
            "Summarize this meeting:\n\n"
            "Meeting Title: {{meeting_title}}\n"
            "Date: {{meeting_date}}\n"
            "Attendees: {{attendees}}\n\n"
            "Transcript:\n{{transcript}}"
        ),
        "output_mode": OutputMode.JSON,
        "json_schema": {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "key_decisions": {"type": "array", "items": {"type": "string"}},
                "action_items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "task": {"type": "string"},
                            "owner": {"type": "string"},
                            "due_date": {"type": "string"},
                        },
                        "required": ["task"],
                    },
                },
                "follow_ups": {"type": "array", "items": {"type": "string"}},
                "sentiment": {"type": "string", "enum": ["positive", "neutral", "negative"]},
            },
            "required": ["summary", "key_decisions", "action_items"],
        },
        "tools": [BUILTIN_TOOLS[8]],
        "default_provider": "anthropic",
        "default_model": None,
    },
    {
        "slug": "voice_crm_assistant",
        "name": "Voice CRM Assistant",
        "description": "Voice-enabled CRM assistant for spoken commands, CRM actions, and TTS-friendly replies",
        "category": TemplateCategory.CUSTOM,
        "system_prompt": get_settings().agentflow_voice_system_prompt,
        "user_prompt_template": "{{user_message}}",
        "output_mode": OutputMode.TEXT,
        "json_schema": None,
        "tools": BUILTIN_TOOLS,
        "default_provider": "openai",
        "default_model": None,
    },
]


def get_builtin_template(slug: str) -> dict[str, Any] | None:
    return next((t for t in BUILTIN_TEMPLATES if t["slug"] == slug), None)


def list_builtin_templates() -> list[dict[str, Any]]:
    return BUILTIN_TEMPLATES.copy()


def render_prompt(template: str, variables: dict[str, Any]) -> str:
    result = template
    for key, value in variables.items():
        result = result.replace(f"{{{{{key}}}}}", str(value) if value is not None else "")
    return result
