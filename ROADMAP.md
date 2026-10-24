# Roadmap

Two builders, split by layer. The **database schema** and the **messaging contract** are the interface between the two halves, so they're done first.

| Owner | Layers |
|---|---|
| **J** ([@1Cazarez](https://github.com/1Cazarez)) | Supabase (schema, RLS, storage), LLM, Python agent (tools, scheduler, flights, time zones, expenses), Render deploy |
| **Kate** ([@kateahn6](https://github.com/kateahn6)) | Messaging (Photon Spectrum, TS bridge, later the group adapter), Next.js web app, dashboard, Vercel deploy |

Board: GitHub Projects → **Photon Trip Planner** (linked to this repo). Each phase below is a GitHub milestone.

## Messaging mode: 1:1 messages now, group chat later

The Spectrum free tier only supports **direct conversations**. It can't create or join group chats, and a person has to text the bot first ([Photon docs](https://photon.codes/docs/beta/get-started/imessage)). So the build runs in two modes behind one `MessagingAdapter`:

1. **DM hub (default, free, cloud only).** Each member texts the bot's number with a personal join code from the web page. The bot replies 1:1 and fans out shared updates to every joined member ("Sam's flight is delayed 45 min" goes to everyone). When someone changes the plan, the bot announces it to the others with attribution ("Jo moved dinner to 8:00").
2. **Group chat (stretch, for the demo).** An imessage-kit adapter runs on a Mac with a dedicated Apple ID, so the bot lives in a real group as in the original spec. If budget allows, Spectrum Business (a dedicated line at $250/mo) also unlocks groups with no Mac.

DM mode makes time zones simpler: every message goes to one person, so it always uses that recipient's current zone.

## Phases

### M0: Foundations
Get each half running on its own and agree on the interfaces.

| Owner | Work |
|---|---|
| J | Supabase project + schema v1 + RLS |
| J | Python agent scaffold (FastAPI, `/health`, config, tests) |
| J | LLM provider interface. Pick the provider with free credits (tool calling + vision) |
| J | Render deploy (`render.yaml`, paid instance, one instance) |
| Kate | **Spectrum DM spike:** get a shared line, receive a DM, send a reply, and record the delivery model (webhook / long-lived / Python SDK). This decides whether the bridge exists |
| Kate + J | **Messaging contract:** `/inbound` payload, `/send`, `MessagingAdapter` interface (DM now, group later) |
| Kate | Next.js scaffold + Supabase magic-link auth + Vercel deploy |

**Exit:** text the bot from a phone, a row lands in `messages`, and an echo reply comes back.

### M1: Core loop
A member can join, ask questions, and add plans by text.

| Owner | Work |
|---|---|
| Kate | Spectrum bridge (TS): inbound → agent, `/send` → Spectrum |
| Kate | Web setup wizard: trip, members (E.164 + home zone), flights/hotel, opt-ins |
| Kate | Join screen: bot number + per-member join code / prefilled `sms:` link |
| J | Inbound pipeline: persist, idempotency, resolve the member, cheap gate |
| J | Join-code binding + welcome DM |
| J | Agent tool loop: save flights/events/reservations, answer questions, stay quiet |
| J | Fan-out: broadcast shared updates to all joined members with attribution |

**Exit:** the organizer creates a trip on the web, members join by text, "I land at 4:10 on DL 1234" is saved, and "who's landing first?" gets the right answer.

### M2: Trip intelligence
Real flights, safe edits, and screenshots.

| Owner | Work |
|---|---|
| J | Flight API choice + polling cadence + change detection + alerts |
| J | Time zone engine: per-member current zone, recipient-zone formatting |
| J | Edits: confirm big changes, undo, `event_history` |
| J | Screenshot parsing with the vision model + clarifying questions when something is ambiguous |
| Kate | Attachments: inbound images → private Storage → URLs to the agent |

**Exit:** a tracked flight's status change reaches every member, "move dinner to 8" asks for confirmation and then applies, and a hotel screenshot is parsed.

### M3: Proactive + extras
| Owner | Work |
|---|---|
| J | Scheduler + `notifications` table + quiet hours + morning summary |
| J | Event reminders with travel time (maps) + weather |
| J | Pickup suggestions for close arrivals |
| J | Expenses: custom splits, balances, settle-up |
| Kate | Dashboard: day timeline with Realtime + "my zone" toggle |
| Kate | Dashboard: flights panel, arrivals strip, balances, message log |

### M4: Demo
| Owner | Work |
|---|---|
| Kate | Organizer edits on the dashboard + "send summary now" demo control |
| Kate | **Stretch:** group-chat adapter (imessage-kit on a Mac, dedicated Apple ID) |
| J | Seed data + demo trip fixture |
| Both | Demo script + two full rehearsals on real phones |

## Workload note

J's list is longer because the agent holds most of the logic. If Kate finishes the dashboard early, these can move to her with little coordination: the maps/weather API clients, the expenses UI, and the stretch group adapter.
