"""Reusable OpenAI service with retries, health checks, and CRM AI helpers."""

from __future__ import annotations

import asyncio
import base64
import logging
from typing import Any

from app.core.config import get_settings
from app.services.llm import LLMResponse, call_openai

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAY_SEC = 0.5


class OpenAIServiceError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class OpenAIService:
    def __init__(self) -> None:
        self._last_health: dict[str, Any] | None = None

    @property
    def _settings(self):
        return get_settings()

    @property
    def _api_key(self) -> str:
        return self._settings.openai_api_key

    @property
    def _default_model(self) -> str:
        return self._settings.default_openai_model

    @property
    def _tts_model(self) -> str:
        return self._settings.openai_tts_model

    @property
    def _stt_model(self) -> str:
        return self._settings.openai_stt_model

    @property
    def is_configured(self) -> bool:
        return bool(self._api_key)

    def _require_key(self) -> str:
        if not self._api_key:
            raise OpenAIServiceError("OpenAI API key is not configured")
        return self._api_key

    async def _with_retry(self, coro_factory, *, label: str) -> Any:
        last_error: Exception | None = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                return await coro_factory()
            except Exception as exc:
                last_error = exc
                logger.warning("OpenAI %s failed (attempt %s/%s): %s", label, attempt, MAX_RETRIES, exc)
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(RETRY_DELAY_SEC * attempt)
        raise OpenAIServiceError(f"OpenAI {label} failed after {MAX_RETRIES} attempts: {last_error}")

    async def test_connection(self) -> dict[str, Any]:
        if not self.is_configured:
            result = {"healthy": False, "message": "OPENAI_API_KEY not set", "model": None}
            self._last_health = result
            return result
        try:
            response = await self._with_retry(
                lambda: call_openai(
                    api_key=self._require_key(),
                    model=self._default_model,
                    system_prompt="You are a health check.",
                    user_prompt="Reply with OK only.",
                    max_tokens=8,
                    temperature=0,
                ),
                label="health_check",
            )
            result = {
                "healthy": True,
                "message": "Connected",
                "model": response.model or self._default_model,
            }
        except Exception as exc:
            result = {"healthy": False, "message": str(exc), "model": None}
        self._last_health = result
        return result

    async def chat_completion(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        output_mode: str = "text",
        json_schema: dict[str, Any] | None = None,
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        return await self._with_retry(
            lambda: call_openai(
                api_key=self._require_key(),
                model=model or self._default_model,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_mode=output_mode,
                json_schema=json_schema,
                tools=tools,
                temperature=temperature,
                max_tokens=max_tokens,
            ),
            label="chat_completion",
        )

    async def structured_output(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        json_schema: dict[str, Any] | None = None,
        model: str | None = None,
    ) -> dict[str, Any]:
        response = await self.chat_completion(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=model,
            output_mode="json",
            json_schema=json_schema,
        )
        if response.parsed_json is None:
            raise OpenAIServiceError("Failed to parse structured JSON response")
        return response.parsed_json

    async def summarize_text(self, text: str, *, context: str = "") -> str:
        response = await self.chat_completion(
            system_prompt="Summarize the content concisely for a CRM user. Use plain text only.",
            user_prompt=f"{context}\n\n{text}".strip(),
            temperature=0.3,
            max_tokens=1024,
        )
        return response.content.strip()

    async def generate_email(self, *, context: str, tone: str = "professional") -> dict[str, str]:
        data = await self.structured_output(
            system_prompt=(
                "Generate a sales email. Return JSON with subject and body fields. "
                "Plain text only in body."
            ),
            user_prompt=f"Tone: {tone}\n\nContext:\n{context}",
            json_schema={
                "type": "object",
                "properties": {"subject": {"type": "string"}, "body": {"type": "string"}},
                "required": ["subject", "body"],
            },
        )
        return {"subject": str(data.get("subject", "")), "body": str(data.get("body", ""))}

    async def analyze_lead(self, lead_data: dict[str, Any]) -> dict[str, Any]:
        return await self.structured_output(
            system_prompt=(
                "You are a CRM lead analyst. Score and qualify the lead. "
                "Return JSON with score (0-100), tier (hot/warm/cold), signals, risks, next_action."
            ),
            user_prompt=str(lead_data),
            json_schema={
                "type": "object",
                "properties": {
                    "score": {"type": "number"},
                    "tier": {"type": "string"},
                    "signals": {"type": "array", "items": {"type": "string"}},
                    "risks": {"type": "array", "items": {"type": "string"}},
                    "next_action": {"type": "string"},
                },
                "required": ["score", "tier", "next_action"],
            },
        )

    async def crm_insights(self, crm_snapshot: dict[str, Any]) -> str:
        response = await self.chat_completion(
            system_prompt="Provide actionable CRM insights in plain text. Be concise.",
            user_prompt=str(crm_snapshot),
            temperature=0.4,
            max_tokens=1500,
        )
        return response.content.strip()

    async def speech_to_text(self, audio_bytes: bytes, *, filename: str = "audio.webm") -> str:
        from openai import AsyncOpenAI

        async def _run() -> str:
            client = AsyncOpenAI(api_key=self._require_key())
            result = await client.audio.transcriptions.create(
                model=self._stt_model,
                file=(filename, audio_bytes),
            )
            return result.text

        return await self._with_retry(_run, label="speech_to_text")

    async def text_to_speech(self, text: str, *, voice: str = "alloy") -> bytes:
        from openai import AsyncOpenAI

        async def _run() -> bytes:
            client = AsyncOpenAI(api_key=self._require_key())
            response = await client.audio.speech.create(
                model=self._tts_model,
                voice=voice,
                input=text,
            )
            return response.content

        return await self._with_retry(_run, label="text_to_speech")

    def text_to_speech_base64(self, audio_bytes: bytes) -> str:
        return base64.b64encode(audio_bytes).decode()


openai_service = OpenAIService()
