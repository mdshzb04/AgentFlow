import uuid
from typing import Any

from pydantic import BaseModel, Field


class AIStatusResponse(BaseModel):
    configured: bool
    healthy: bool
    message: str
    model: str | None = None
    features: list[str] = Field(default_factory=list)


class AIChatRequest(BaseModel):
    system_prompt: str = "You are a helpful CRM assistant."
    user_prompt: str = Field(min_length=1)
    model: str | None = None
    output_mode: str = "text"
    temperature: float = 0.7


class AIChatResponse(BaseModel):
    content: str
    parsed_json: dict[str, Any] | None = None
    model: str
    usage: dict[str, Any] = Field(default_factory=dict)


class AISummarizeRequest(BaseModel):
    text: str = Field(min_length=1)
    context: str = ""


class AIEmailRequest(BaseModel):
    context: str = Field(min_length=1)
    tone: str = "professional"


class AILeadAnalyzeRequest(BaseModel):
    lead: dict[str, Any]


class AIInsightsRequest(BaseModel):
    snapshot: dict[str, Any]


class AITextToSpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4096)
    voice: str = "alloy"


class AITextToSpeechResponse(BaseModel):
    audio_base64: str
    content_type: str = "audio/mpeg"
