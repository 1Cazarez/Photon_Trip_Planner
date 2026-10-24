from fastapi import FastAPI, Header, HTTPException

from app.config import settings
from app.messaging import InboundMessage
from app.pipeline import handle_inbound

app = FastAPI(title="Photon Trip Planner agent")


def _check_secret(secret: str | None) -> None:
    if not settings.agent_shared_secret or secret != settings.agent_shared_secret:
        raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/inbound")
async def inbound(msg: InboundMessage, x_agent_secret: str | None = Header(default=None)) -> dict:
    """Every inbound message from the bridge (or Spectrum directly, depending on #5)."""
    _check_secret(x_agent_secret)
    await handle_inbound(msg)
    return {"ok": True}


@app.post("/trips/{trip_id}/launch")
async def launch(trip_id: str, x_agent_secret: str | None = Header(default=None)) -> dict:
    """Called by the web app after the setup wizard (#9).

    TODO(J, #12): in DM hub mode, generate per-member join codes. The bot can't text first,
    so members start the conversation from the join screen (#10).
    """
    _check_secret(x_agent_secret)
    raise HTTPException(status_code=501, detail="not implemented (#12)")


@app.post("/trips/{trip_id}/summary")
async def send_summary_now(trip_id: str, x_agent_secret: str | None = Header(default=None)) -> dict:
    """Demo control: send the morning summary on demand.

    TODO(J, #20, #26): reuse the scheduler's morning-summary job.
    """
    _check_secret(x_agent_secret)
    raise HTTPException(status_code=501, detail="not implemented (#26)")


# TODO(J, #20): start the in-process scheduler on app startup (app/scheduler.py).
