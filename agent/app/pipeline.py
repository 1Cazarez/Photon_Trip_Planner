"""Per-message pipeline (spec §5.1)."""

from app.messaging import InboundMessage


async def handle_inbound(msg: InboundMessage) -> None:
    # TODO(J, #11): persist msg into `messages` (unique on message_id; return early on duplicate).
    # TODO(J, #11): resolve trip + member from the sender handle. Unknown handle -> one-line
    #   "text your join code" reply.
    # TODO(J, #12): if text matches `JOIN <code>`, bind the handle to the member and send the
    #   welcome DM (what the bot does, whether they're flight-tracked).
    # TODO(J, #11): cheap gate. Mention / image / pending confirmation -> agent; otherwise
    #   classify ignore | question | plan_detail | plan_change | expense | other_for_bot.
    # TODO(J, #13): run app.agent_loop.run_turn and send the reply (or nothing on NO_REPLY).
    # TODO(J, #18): when msg.attachment_urls is non-empty, route through app.vision first.
    pass
