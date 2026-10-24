# Messaging contract (draft)

Owner: Kate. Reviewer: J. Tracked in #6.

This is the interface between the bridge (`bridge/`, TypeScript) and the agent (`agent/`, Python). The code mirrors are `bridge/src/contract.ts` and `agent/app/messaging.py`. Keep all three in sync.

## Bridge → agent: `POST {AGENT_URL}/inbound`

Header: `x-agent-secret: <AGENT_SHARED_SECRET>`

```json
{
  "messageId": "spectrum-msg-id",
  "sender": "+15551234567",
  "conversationId": "spectrum-space-id",
  "kind": "dm",
  "text": "I land at 4:10 on DL 1234",
  "attachmentUrls": [],
  "sentAt": "2026-10-24T18:03:00Z"
}
```

- The agent dedupes on `messageId`, so the bridge can safely retry.
- `kind` is `"dm"` in DM hub mode, and `"group"` once the group adapter (#27) exists.
- `attachmentUrls` are signed Supabase Storage URLs (#19).

## Agent → bridge: `POST {BRIDGE_URL}/send`

Header: `x-agent-secret: <AGENT_SHARED_SECRET>`

```json
{ "to": { "handle": "+15551234567" }, "text": "Saved: Sam · DL 1234 · lands 4:10 PM ET" }
```

`to` is either `{ "conversationId": "..." }` or `{ "handle": "..." }`. The response is `{ "messageId": "..." }`.

## Open questions for #5 / #6

- [ ] Can the agent send to a handle directly, or only to a conversation the member already started?
- [ ] Does Spectrum give a stable conversation id per member?
- [ ] Do inbound images arrive as URLs or bytes?
- [ ] If Spectrum can call the agent directly (webhook), delete the bridge and move this contract onto Spectrum's payload.
