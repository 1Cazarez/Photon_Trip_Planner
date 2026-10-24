import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { SpectrumAdapter } from "./adapters/spectrum.js";
import type { InboundMessage, SendRequest } from "./contract.js";

// Spectrum <-> agent relay. Skip this service entirely if #5 shows Spectrum can
// call the agent directly or has a Python SDK.

const PORT = Number(process.env.PORT ?? 8787);
const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:8000";
const SECRET = process.env.AGENT_SHARED_SECRET ?? "";

const adapter = new SpectrumAdapter();
const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

// Called by the agent to send a message.
// TODO(Kate, #6): agree on auth with J (shared secret header for now).
app.post("/send", async (c) => {
  if (c.req.header("x-agent-secret") !== SECRET) return c.json({ error: "unauthorized" }, 401);
  const body = await c.req.json<SendRequest>();
  return c.json(await adapter.send(body));
});

async function forwardToAgent(msg: InboundMessage): Promise<void> {
  // TODO(Kate, #8): retry with backoff; the agent dedupes on messageId so retries are safe.
  await fetch(`${AGENT_URL}/inbound`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-agent-secret": SECRET },
    body: JSON.stringify(msg),
  });
}

serve({ fetch: app.fetch, port: PORT }, () => console.log(`bridge listening on :${PORT}`));

adapter.start(forwardToAgent).catch((err) => console.error("adapter failed to start:", err));
