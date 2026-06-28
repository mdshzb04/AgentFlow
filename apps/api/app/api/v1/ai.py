"""OpenAI API routes — keys never exposed to clients."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status

from app.api.deps import CurrentUser, DbSession
from app.core.rate_limit import get_client_ip, public_form_rate_limiter
from app.schemas.ai import (
    AIChatRequest,
    AIChatResponse,
    AIEmailRequest,
    AIInsightsRequest,
    AILeadAnalyzeRequest,
    AISpeechToTextResponse,
    AIStatusResponse,
    AISummarizeRequest,
    AISummarizeResponse,
    AITextToSpeechRequest,
    AITextToSpeechResponse,
)
from app.services.ai.openai_service import OpenAIServiceError, openai_service

router = APIRouter(prefix="/ai", tags=["ai"])
ai_rate_limiter = public_form_rate_limiter


def _rate_limit(request: Request, user_id: uuid.UUID) -> None:
    ai_rate_limiter.check(f"ai:{user_id}:{get_client_ip(request)}")


@router.get("/status", response_model=AIStatusResponse)
async def ai_status(current_user: CurrentUser) -> AIStatusResponse:
    health = openai_service._last_health or await openai_service.test_connection()
    return AIStatusResponse(
        configured=openai_service.is_configured,
        healthy=bool(health.get("healthy")),
        message=str(health.get("message", "")),
        model=health.get("model"),
        features=["chat", "structured_output", "summarize", "email", "lead_analysis", "insights", "stt", "tts"],
    )


@router.post("/chat", response_model=AIChatResponse)
async def ai_chat(body: AIChatRequest, request: Request, current_user: CurrentUser) -> AIChatResponse:
    _rate_limit(request, current_user.id)
    try:
        response = await openai_service.chat_completion(
            system_prompt=body.system_prompt,
            user_prompt=body.user_prompt,
            model=body.model,
            output_mode=body.output_mode,
            temperature=body.temperature,
        )
    except OpenAIServiceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return AIChatResponse(
        content=response.content,
        parsed_json=response.parsed_json,
        model=response.model,
        usage=response.usage,
    )


@router.post("/summarize", response_model=AISummarizeResponse)
async def ai_summarize(
    body: AISummarizeRequest,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> AISummarizeResponse:
    _rate_limit(request, current_user.id)
    try:
        summary = await openai_service.summarize_text(body.text, context=body.context)
    except OpenAIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    notion_remote_id: str | None = None
    notion_remote_url: str | None = None
    notion_synced = False
    notion_error: str | None = None
    if body.save_to_notion:
        try:
            from app.services.integrations.crm_sync_service import sync_meeting_summary

            result = await sync_meeting_summary(
                db,
                current_user.id,
                title=body.title or "Meeting Summary",
                summary=summary,
                related_entity=body.related_entity,
                related_id=body.related_id,
            )
            if result.get("success"):
                notion_remote_id = result.get("remote_id")
                notion_remote_url = result.get("remote_url")
                notion_synced = True
            else:
                notion_error = result.get("error") or result.get("reason") or "unknown error"
        except Exception as exc:
            notion_error = str(exc)

    return AISummarizeResponse(
        summary=summary,
        notion_remote_id=notion_remote_id,
        notion_remote_url=notion_remote_url,
        notion_synced=notion_synced,
        notion_error=notion_error,
    )


@router.post("/email")
async def ai_email(body: AIEmailRequest, request: Request, current_user: CurrentUser) -> dict[str, str]:
    _rate_limit(request, current_user.id)
    try:
        return await openai_service.generate_email(context=body.context, tone=body.tone)
    except OpenAIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/leads/analyze")
async def ai_analyze_lead(
    body: AILeadAnalyzeRequest, request: Request, current_user: CurrentUser
) -> dict:
    _rate_limit(request, current_user.id)
    try:
        return await openai_service.analyze_lead(body.lead)
    except OpenAIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/insights")
async def ai_insights(body: AIInsightsRequest, request: Request, current_user: CurrentUser) -> dict[str, str]:
    _rate_limit(request, current_user.id)
    try:
        insights = await openai_service.crm_insights(body.snapshot)
    except OpenAIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"insights": insights}


@router.post("/speech-to-text", response_model=AISpeechToTextResponse)
async def ai_speech_to_text(
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
    file: UploadFile = File(...),
    save_to_notion: bool = Form(default=False),
    title: str | None = Form(default=None),
    related_entity: str | None = Form(default=None),
    related_id: str | None = Form(default=None),
) -> AISpeechToTextResponse:
    _rate_limit(request, current_user.id)
    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=400, detail="Empty audio file")
    try:
        text = await openai_service.speech_to_text(audio, filename=file.filename or "audio.webm")
    except OpenAIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    notion_remote_id: str | None = None
    notion_remote_url: str | None = None
    notion_synced = False
    if save_to_notion:
        try:
            from app.services.integrations.crm_sync_service import sync_call_transcript

            result = await sync_call_transcript(
                db,
                current_user.id,
                title=title or f"Call transcript {file.filename or 'recording'}",
                transcript=text,
                related_entity=related_entity,
                related_id=related_id,
            )
            if result.get("success"):
                notion_remote_id = result.get("remote_id")
                notion_remote_url = result.get("remote_url")
                notion_synced = True
        except Exception:
            pass

    return AISpeechToTextResponse(
        text=text,
        save_to_notion=save_to_notion,
        title=title,
        related_entity=related_entity,
        related_id=related_id,
        notion_remote_id=notion_remote_id,
        notion_remote_url=notion_remote_url,
        notion_synced=notion_synced,
    )


@router.post("/text-to-speech", response_model=AITextToSpeechResponse)
async def ai_text_to_speech(
    body: AITextToSpeechRequest, request: Request, current_user: CurrentUser
) -> AITextToSpeechResponse:
    _rate_limit(request, current_user.id)
    try:
        audio = await openai_service.text_to_speech(body.text, voice=body.voice)
    except OpenAIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return AITextToSpeechResponse(audio_base64=openai_service.text_to_speech_base64(audio))


@router.get("/request-history")
async def ai_request_history(
    current_user: CurrentUser,
    db: DbSession,
    limit: int = 50,
) -> dict:
    """Live LLM request history: tokens, latency, model, cost per call."""
    from app.services.ai.ai_request_log_service import list_ai_request_logs

    logs = await list_ai_request_logs(db, current_user.id, limit=limit)
    return {
        "requests": [
            {
                "id": str(log.id),
                "provider": log.provider,
                "model": log.model,
                "status": log.status.value,
                "prompt_tokens": log.prompt_tokens,
                "completion_tokens": log.completion_tokens,
                "total_tokens": log.total_tokens,
                "latency_ms": log.latency_ms,
                "cost_usd": round(log.cost_usd, 6),
                "request_preview": log.request_preview,
                "response_preview": (log.response_preview or "")[:500],
                "error_message": log.error_message,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
    }
