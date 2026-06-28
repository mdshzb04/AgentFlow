import json
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

from app.services.prompt_templates import BUILTIN_TOOLS


@dataclass
class ToolCallResult:
    name: str
    arguments: dict[str, Any]
    result: dict[str, Any]


@dataclass
class LLMResponse:
    content: str
    parsed_json: dict[str, Any] | None = None
    tool_calls: list[ToolCallResult] = field(default_factory=list)
    usage: dict[str, Any] = field(default_factory=dict)
    model: str = ""
    provider: str = ""


ToolExecutor = Callable[[str, dict[str, Any]], Awaitable[dict[str, Any]]]


def execute_tool_stub(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    """Execute a registered tool (stub implementations for CRM actions)."""
    if name == "lookup_contact":
        query = arguments.get("query", "")
        return {
            "found": True,
            "contact": {
                "id": "contact-001",
                "name": query.split("@")[0].replace(".", " ").title() if "@" in query else query,
                "email": query if "@" in query else f"{query.lower().replace(' ', '.')}@example.com",
                "company": "Acme Corp",
                "title": "VP of Engineering",
                "status": "active",
            },
        }
    if name == "schedule_meeting":
        return {
            "scheduled": True,
            "meeting_id": "mtg-001",
            "title": arguments.get("title"),
            "datetime": arguments.get("datetime"),
            "attendees": [arguments.get("contact_email")],
            "calendar_link": "https://calendar.example.com/mtg-001",
        }
    if name == "send_email":
        return {
            "sent": True,
            "message_id": "msg-001",
            "to": arguments.get("to"),
            "subject": arguments.get("subject"),
            "status": "queued",
        }
    return {"error": f"Unknown tool: {name}"}


def _normalize_tools(tools: list[dict[str, Any]] | None) -> list[dict[str, Any]] | None:
    if not tools:
        return None
    normalized = []
    for tool in tools:
        if "type" in tool:
            normalized.append(tool)
        elif "name" in tool:
            normalized.append({
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool.get("description", ""),
                    "parameters": tool.get("parameters", {"type": "object", "properties": {}}),
                },
            })
    return normalized or None


async def call_openai(
    *,
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    output_mode: str = "text",
    json_schema: dict[str, Any] | None = None,
    tools: list[dict[str, Any]] | None = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    tool_executor: ToolExecutor | None = None,
) -> LLMResponse:
    from openai import AsyncOpenAI

    async def _run_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
        if tool_executor:
            return await tool_executor(name, args)
        return execute_tool_stub(name, args)

    client = AsyncOpenAI(api_key=api_key)
    normalized_tools = _normalize_tools(tools)
    all_tool_calls: list[ToolCallResult] = []
    total_usage: dict[str, int] = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    if output_mode == "json" and not normalized_tools:
        kwargs["response_format"] = {"type": "json_object"}
    if normalized_tools:
        kwargs["tools"] = normalized_tools
        if output_mode == "json" and "json" not in system_prompt.lower():
            messages[0]["content"] = system_prompt + "\n\nReturn your final answer as valid JSON."

    response = await client.chat.completions.create(**kwargs)
    choice = response.choices[0]
    content = choice.message.content or ""

    if response.usage:
        total_usage["prompt_tokens"] += response.usage.prompt_tokens or 0
        total_usage["completion_tokens"] += response.usage.completion_tokens or 0
        total_usage["total_tokens"] += response.usage.total_tokens or 0

    if choice.message.tool_calls:
        messages.append(choice.message.model_dump())
        for tc in choice.message.tool_calls:
            args = json.loads(tc.function.arguments)
            result = await _run_tool(tc.function.name, args)
            all_tool_calls.append(
                ToolCallResult(name=tc.function.name, arguments=args, result=result)
            )
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": json.dumps(result),
            })

        follow_up_kwargs: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if output_mode == "json" and not normalized_tools:
            follow_up_kwargs["response_format"] = {"type": "json_object"}
        follow_up = await client.chat.completions.create(**follow_up_kwargs)
        content = follow_up.choices[0].message.content or ""
        if follow_up.usage:
            total_usage["prompt_tokens"] += follow_up.usage.prompt_tokens or 0
            total_usage["completion_tokens"] += follow_up.usage.completion_tokens or 0
            total_usage["total_tokens"] += follow_up.usage.total_tokens or 0

    parsed_json = None
    if output_mode == "json" and content:
        try:
            parsed_json = json.loads(content)
        except json.JSONDecodeError:
            pass

    return LLMResponse(
        content=content,
        parsed_json=parsed_json,
        tool_calls=all_tool_calls,
        usage=total_usage,
        model=model,
        provider="openai",
    )


async def call_anthropic(
    *,
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    output_mode: str = "text",
    json_schema: dict[str, Any] | None = None,
    tools: list[dict[str, Any]] | None = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    tool_executor: ToolExecutor | None = None,
) -> LLMResponse:
    from anthropic import AsyncAnthropic

    async def _run_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
        if tool_executor:
            return await tool_executor(name, args)
        return execute_tool_stub(name, args)

    client = AsyncAnthropic(api_key=api_key)
    normalized_tools = _normalize_tools(tools)
    all_tool_calls: list[ToolCallResult] = []
    total_usage: dict[str, int] = {"input_tokens": 0, "output_tokens": 0}

    effective_system = system_prompt
    if output_mode == "json":
        schema_hint = json.dumps(json_schema) if json_schema else "a valid JSON object"
        effective_system += (
            f"\n\nYou must respond with valid JSON only, no markdown fences. "
            f"Schema: {schema_hint}"
        )

    anthropic_tools = None
    if normalized_tools:
        anthropic_tools = [
            {
                "name": t["function"]["name"],
                "description": t["function"].get("description", ""),
                "input_schema": t["function"].get(
                    "parameters", {"type": "object", "properties": {}}
                ),
            }
            for t in normalized_tools
        ]

    kwargs: dict[str, Any] = {
        "model": model,
        "max_tokens": max_tokens,
        "system": effective_system,
        "messages": [{"role": "user", "content": user_prompt}],
        "temperature": temperature,
    }
    if anthropic_tools:
        kwargs["tools"] = anthropic_tools

    response = await client.messages.create(**kwargs)

    if response.usage:
        total_usage["input_tokens"] += response.usage.input_tokens
        total_usage["output_tokens"] += response.usage.output_tokens

    content = ""
    tool_use_blocks = []
    for block in response.content:
        if block.type == "text":
            content += block.text
        elif block.type == "tool_use":
            tool_use_blocks.append(block)

    if tool_use_blocks:
        messages = [
            {"role": "user", "content": user_prompt},
            {"role": "assistant", "content": response.content},
        ]
        tool_results = []
        for block in tool_use_blocks:
            result = await _run_tool(block.name, block.input)
            all_tool_calls.append(
                ToolCallResult(name=block.name, arguments=block.input, result=result)
            )
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": json.dumps(result),
            })
        messages.append({"role": "user", "content": tool_results})

        follow_up = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=effective_system,
            messages=messages,
            temperature=temperature,
        )
        content = ""
        if follow_up.usage:
            total_usage["input_tokens"] += follow_up.usage.input_tokens
            total_usage["output_tokens"] += follow_up.usage.output_tokens
        for block in follow_up.content:
            if block.type == "text":
                content += block.text

    parsed_json = None
    if output_mode == "json" and content:
        try:
            cleaned = content.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0]
            parsed_json = json.loads(cleaned)
        except json.JSONDecodeError:
            pass

    return LLMResponse(
        content=content,
        parsed_json=parsed_json,
        tool_calls=all_tool_calls,
        usage=total_usage,
        model=model,
        provider="anthropic",
    )


async def call_llm(
    provider: str,
    *,
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    output_mode: str = "text",
    json_schema: dict[str, Any] | None = None,
    tools: list[dict[str, Any]] | None = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    tool_executor: ToolExecutor | None = None,
) -> LLMResponse:
    if provider == "anthropic":
        return await call_anthropic(
            api_key=api_key,
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            output_mode=output_mode,
            json_schema=json_schema,
            tools=tools,
            temperature=temperature,
            max_tokens=max_tokens,
            tool_executor=tool_executor,
        )
    return await call_openai(
        api_key=api_key,
        model=model,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        output_mode=output_mode,
        json_schema=json_schema,
        tools=tools,
        temperature=temperature,
        max_tokens=max_tokens,
        tool_executor=tool_executor,
    )
