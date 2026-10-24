"""Agent side of the messaging contract. Mirror of bridge/src/contract.ts.

TODO(Kate + J, #6): finalize with Kate; keep field names in sync with the bridge.
"""

from datetime import datetime
from typing import Literal

import httpx
from pydantic import BaseModel, Field

from app.config import settings


class InboundMessage(BaseModel):
    message_id: str = Field(alias="messageId")
    sender: str
    conversation_id: str = Field(alias="conversationId")
    kind: Literal["dm", "group"] = "dm"
    text: str = ""
    attachment_urls: list[str] = Field(default_factory=list, alias="attachmentUrls")
    sent_at: datetime = Field(alias="sentAt")


async def send_text(
    *, text: str, handle: str | None = None, conversation_id: str | None = None
) -> None:
    """Send through the bridge.

    TODO(J, #14): callers should write an outbound/notifications row first so retries never
    double-post.
    """
    to = {"conversationId": conversation_id} if conversation_id else {"handle": handle}
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{settings.bridge_url}/send",
            json={"to": to, "text": text},
            headers={"x-agent-secret": settings.agent_shared_secret},
        )
        r.raise_for_status()
