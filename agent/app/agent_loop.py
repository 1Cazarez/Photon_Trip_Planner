"""LLM tool loop: decides to answer, save plan details, apply a change, or stay quiet."""

NO_REPLY = "NO_REPLY"


async def run_turn(trip_id: str, member_id: str, text: str) -> str:
    # TODO(J, #13): build compact trip context (spec §5.3): trip header, members with zones,
    #   next 48h of events/reservations, flights + status, pending confirmation, last ~20 msgs.
    # TODO(J, #13): call the app.llm provider with tools from app.tools.trip and
    #   app.tools.expenses; loop until text or NO_REPLY. Short replies, never invent facts.
    # TODO(J, #17): big edits go through request_confirmation instead of applying directly.
    raise NotImplementedError("#13")
