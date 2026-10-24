"""Thin LLM provider interface so the provider with free credits can be swapped."""

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass
class ToolCall:
    name: str
    arguments: dict[str, Any]


@dataclass
class LLMResponse:
    text: str | None = None
    tool_calls: list[ToolCall] = field(default_factory=list)


class LLMProvider(Protocol):
    async def chat(
        self, messages: list[dict[str, Any]], tools: list[dict[str, Any]]
    ) -> LLMResponse: ...


# TODO(J, #3): pick the provider (must support tool calling + image input), implement it in
#   app/llm/<provider>.py, and add a get_provider() factory keyed on settings.llm_provider.
