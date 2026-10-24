# Photon Trip Planner — Group Chat Agent Spec

Status: draft (from interview, 2026-10-23)
Stage: **hackathon / demo**. Works convincingly for one or a few live groups. Shortcuts are fine where noted; reliability work beyond the demo is out of scope.

## 1. Summary

An organizer creates a trip on a small web app (dates, destination, members with phone numbers and time zones, known flights and hotel, tracking opt-ins). The agent then creates an iMessage group with everyone and lives in it as a **trip-named bot** (e.g. "Tulum Bot"). Members text it plans, screenshots, questions, and changes. It keeps the itinerary in Supabase, tracks opted-in flights with a real flight-status API, posts a small number of proactive messages, coordinates pickups, adds travel times and weather, and tracks shared expenses with custom splits. The organizer also sees a live dashboard.

## 2. Decisions (from interview)

| Topic | Decision |
|---|---|
| Messaging | **Photon Spectrum, hosted, free tier.** No Mac. Open-source imessage-kit is macOS-only and is not used. |
| Group creation | **The bot creates the group** when web setup is submitted. Fallback: the organizer adds the bot to a group and sends a linking code (see §4.2). |
| Agent runtime | **Python agent service on Render** (web service on a paid, always-on instance; one instance only, because the scheduler runs in-process). Not Supabase Edge Functions. Supabase is the database, auth, realtime, and storage. |
| Spectrum ↔ Python | If Spectrum has no Python SDK and no webhooks, a **thin TypeScript bridge** (spectrum-ts) runs next to the agent and relays messages over local HTTP. See §3. |
| Web app | TypeScript / Next.js on **Vercel**. Used for setup and as a **live trip dashboard** with Supabase Realtime. |
| Auth | **Organizer only** (Supabase magic link). Members are identified by phone number / iMessage handle in chat. |
| LLM | **Whichever provider has free credits**, behind a thin provider interface. It must support tool calling and image input. |
| Time zones | Store UTC. Each member sets a **home zone on the web**; flights move their *current* zone. Group messages show **multiple zones inline** when members are split. Personal nudges use the recipient's current zone. |
| Inputs | Typed text and **screenshots** in chat. Organizer can also enter flights and hotel on the web. No inbound email. |
| Flight data | **Real flight-status API only**, no simulator. If nothing changes on demo day, that is accepted. |
| Edits | **Anyone can edit.** Small edits apply immediately. Big edits (move or delete an event, change the hotel, cancel) ask for a confirmation in the group. |
| Noise | **One morning summary, plus big changes only.** Quiet hours apply. |
| Expenses | **Custom amounts**: uneven shares and itemized splits. |
| Extras in scope | Pickup coordination, travel time (maps), weather, expenses. |

## 3. Architecture

```text
             ┌────────────── Photon Spectrum (hosted, free tier) ──────────────┐
             │                 iMessage lines (shared pool)                    │
             └───────────────▲───────────────────────────┬─────────────────────┘
                             │ send                      │ inbound events
                     ┌───────┴───────────────────────────▼───────┐
                     │  spectrum-bridge (TS, only if needed)     │
                     │  - normalizes inbound → POST /inbound     │
                     │  - exposes POST /send, /create-group      │
                     └───────▲───────────────────────────┬───────┘
                             │ HTTP (Render private net) │
                     ┌───────┴───────────────────────────▼───────┐
                     │  agent (Python, always on)                │
                     │  - message router + LLM tool loop         │
                     │  - scheduler: flight polls, nudges,       │
                     │    morning summary                        │
                     │  - integrations: flights, maps, weather   │
                     └───────▲───────────────────────────┬───────┘
                             │ service-role client       │
                     ┌───────┴───────────────────────────▼───────┐
                     │  Supabase: Postgres, Auth, Realtime,      │
                     │  Storage (private screenshots bucket)     │
                     └───────▲───────────────────────────────────┘
                             │ anon key + RLS, Realtime
                     ┌───────┴───────┐
                     │ Next.js web   │  organizer setup + live dashboard
                     └───────────────┘
```

- **Bridge vs. direct.** Check Spectrum's delivery model first (§11, V1–V3). If it offers webhooks or a Python client, drop the bridge and have the agent talk to Spectrum directly. Keep the agent's messaging code behind a `MessagingAdapter` interface (`send_text`, `send_image?`, `create_group`, `react?`) either way.
- **Web → agent.** The web app writes the trip to Postgres, then calls the agent's `POST /trips/{id}/launch` (authenticated with a shared secret) to create the group. Dashboard edits are written straight to Postgres. The agent receives them as Realtime / `LISTEN` events and announces any change that §6 classifies as big.
- **Scheduler.** Runs in-process in the agent (e.g. APScheduler). All due work is derived from DB state (`notifications` rows with `send_at`, `flights.next_poll_at`), so a restart loses nothing. `pg_cron` is not needed now that Edge Functions are gone.
- **Idempotency.** Store inbound messages by Spectrum message ID (unique). Outbound sends go through a `notifications` / `outbound` row with a status, so retries never double-post.

## 4. Onboarding flow

### 4.1 Web setup (organizer)

1. The organizer signs in with a magic link.
2. They create a trip: **name, start and end dates, destination** (geocoded, which gives the destination time zone), and the **bot name** (defaults to "<Destination> Bot").
3. They add members: **name, phone number (E.164), home time zone** (defaults to the organizer's zone) and **flight-tracking opt-in** (off by default). The organizer adds themselves as a member.
4. Optional: they add **flights** (airline and number plus date; the details are looked up via the flight API) and **hotel or reservations** (name, address, times).
5. They press **Launch**. The agent creates the group, sends a welcome, and tells the dashboard the status.

The opt-in is set by the organizer on members' behalf because only the organizer has an account. The welcome message says who is being tracked, and anyone can text "stop tracking me" to turn it off (§8).

### 4.2 Launch

- The agent calls `create_group(handles, name=trip.name)` and posts a welcome: what it does, who is on which flight, who is tracked, and a hint like "ask me things like 'when's dinner?'".
- **Fallback** (the group can't be created, or the line is unstable; see V2 and V3): the dashboard shows the bot's number and a 6-character **link code**. The organizer adds the bot to their own group and sends the code. The agent binds that `chat_id` to the trip and sends the welcome.
- A trip has exactly one bound `chat_id`. Messages from unbound chats get one reply ("I'm not set up for this chat — create a trip at <url>") and are then ignored.

## 5. Message handling

### 5.1 Pipeline per inbound message

1. **Persist** the raw message (sender handle, chat_id, text, attachments). Upload attachments to private Storage.
2. **Resolve** the trip from chat_id and the member from the sender handle. If the sender is unknown, add them as a guest member with no zone and no tracking.
3. **Cheap gate.** If the bot is mentioned by name, there is an image, or there is a pending confirmation in this chat, go to the LLM. Otherwise run a small or cheap classification call (or the same model with a short prompt) that labels the message `ignore | question | plan_detail | plan_change | expense | other_for_bot`. On `ignore`, stop.
4. **Agent step.** Run the LLM with the trip context (§5.3) and tools (§5.2). The model may call tools, then either reply or return `NO_REPLY`.
5. **Respond** with the reply text, or a short acknowledgement for silent saves (§5.4).

### 5.2 When the bot speaks (all chosen)

| Trigger | Behavior |
|---|---|
| Name mention ("tulum bot, …", or just the bot name) | Always replies. |
| Clear itinerary question, not addressed to it | Replies only if the answer is in trip data and confidence is high. If a human answered first (a reply from another member within ~60 s), it stays quiet. |
| Plan details typed or screenshotted | Saves them silently, then acknowledges with a tapback if supported, otherwise a one-line "Saved: Sam · DL 1234 · lands 4:10 PM ET". |
| Plan change by anyone | Applies a small change and confirms in one line. For a big change it asks first (§6). |
| Expense statement | Records it and confirms the split in one line. |

### 5.3 LLM context and tools

The context (built on each turn, kept compact) contains: the trip header (dates, destination and zone), members (name, home and current zone, tracked?), upcoming events and reservations (next ~48 h in full, the rest summarized), flights with current status, any pending confirmation, the last ~20 chat messages, and the current UTC time.

Tools (Python functions that validate and write to the DB):

- `upsert_flight(member, airline, number, date)`: looks up the flight via the API and stores it with the canonical times.
- `upsert_event(title, start, end?, location?, attendees?)` and `update_event(event_id, fields)`
- `delete_event(event_id)`: this is a big edit (§6).
- `upsert_reservation(kind, name, address, start, end, confirmation_code?)`
- `request_confirmation(change_payload, prompt_text)`
- `add_expense(payer, amount, currency, description, shares[])`, `get_balances()`
- `get_travel_time(from, to, mode)` and `get_weather(date)`
- `set_tracking(member, on|off)`
- `ask_clarification(question)`: used when a reference is ambiguous (two "dinner" events, or "Friday" when the trip spans two Fridays). It **never guesses** on an ambiguous edit.

Screenshot parsing: the image goes to the same vision-capable model with an extraction instruction. The model then calls the same tools. If a field can't be read, it replies with what it got and asks for the missing piece.

### 5.4 Reply style

- Short, at most 3 lines unless it's the morning summary or the user asks for "everything".
- Times use the inline multi-zone format (§7).
- No invented facts. If something isn't in trip data or the APIs, it says so.

## 6. Edits and confirmations

- **Small edits apply immediately:** adding an event, adding or correcting your own flight, adjusting an event by ≤30 min, adding a location or note.
- **Big edits ask first:** moving an event by >30 min or to another day, deleting an event or reservation, changing the hotel, editing someone else's flight.
  - The bot asks: "Move dinner (Casa Banana) from 7:00 → 8:00 PM for everyone? Reply yes to confirm." It stores a `pending_confirmations` row (expires in 30 min, one pending per chat).
  - **Yes** comes from any member: the text "yes", "y", 👍, or a 👍 tapback if Spectrum exposes reactions. On yes, the bot applies the change and announces it in one line.
  - **Conflicts:** a new big edit to the same event replaces the pending one ("Updated: 7:30 instead? reply yes"). After expiry, the bot drops it silently.
- **Undo:** "undo" reverts the last applied change in this trip within 10 minutes (keep an `event_history` / audit row per change).
- Dashboard edits by the organizer skip confirmation but are announced if §8 classifies them as big.

## 7. Time zones

- All timestamps are stored as `timestamptz` (UTC). Every place-bound thing stores its IANA zone: an event stores its venue zone, and a flight stores its departure and arrival airport zones.
- **Member current zone:** the home zone (from the web) until their outbound flight to the destination lands, then the destination zone, then the home zone again after the return flight lands. If a member has no flights, it is the home zone during the trip.
- **Group messages:** if all members' current zones are the same, it shows one time. Otherwise it shows the time in the destination (or event) zone followed by the other distinct zones in use, e.g. "Sam lands 5:20 PM ET (2:20 PM PT)". The cap is 3 zones per time, and abbreviations are always shown when more than one zone is in play.
- **Personal nudges** (e.g. "leave for the airport") use the recipient's current zone only.
- Quiet hours (§8) and "morning" are evaluated in the destination zone for group messages.

## 8. Proactive messages and noise budget

| Message | When |
|---|---|
| Morning summary | 8:00 AM destination time each trip day: today's events, arrivals and departures, weather, any open balances worth settling. One message. |
| Flight change | Delay or advance of ≥15 min versus the last announced time, gate change within 3 h of departure, cancellation, diversion. Changes are **coalesced**: at most one post per flight per 20 min, with the latest state. |
| Arrival | When a tracked flight lands, only if someone has a pickup assigned or the bot suggested a pickup. |
| Event reminder | 1 h before each event with a location, including travel time: "Dinner in 1 h · 12 min walk from hotel". |
| Leave-for-airport | Personal-zone nudge in the group, addressed by name, at (departure − 2 h domestic / 3 h international − travel time to airport). Only for tracked members. |
| Pickup suggestion | Once per arrival cluster: two or more members landing at the same airport within 45 min. "Alex and Jo land 20 min apart at CUN, share a ride?" |

- **Quiet hours** are 10 PM–7 AM destination time. Messages due in that window wait until 7 AM, except cancellations and diversions, which still go out.
- There is no hard daily cap. The trigger list above *is* the budget.

## 9. Flight tracking

- Use a real provider with a free or hackathon tier (candidates: AeroDataBox via RapidAPI, AviationStack, FlightAware AeroAPI). Pick the one with schedule plus live status at the lowest polling cost, and check its rate limits before choosing (V5).
- Only **opted-in** members' flights are polled. Flights of members who aren't opted in are stored only if the organizer entered them, and are shown as "scheduled" without live updates.
- **Polling cadence** (driven by `next_poll_at`):
  - more than 24 h before departure: every 6 h
  - from 24 h out until 3 h before departure: every 30 min
  - from 3 h before departure until landing: every 5 min
  - after landing: stop
  Adjust the cadence downward to fit the provider's free quota.
- Keep a `flight_status_snapshots` table. A change is detected by comparing against the **last announced** values, not the last polled ones, so noise doesn't accumulate.
- On stage, if no real flight changes, the demo shows tracking by asking "who's landing first?" and "is Sam's flight on time?". Proactive alerts are a bonus.

## 10. Expenses

- `expenses(id, trip_id, payer_member_id, amount_cents, currency, description, created_at, source_message_id)`
- `expense_shares(expense_id, member_id, amount_cents)`. The shares must sum to the total. The agent resolves "split with Jo and Sam" (even split among the named people), "I owe 20 of it" (custom), and itemized lists from a receipt screenshot.
- Default when nobody is specified: even split across all members. Rounding remainders go to the payer.
- `get_balances` returns net per member and a minimal settle-up list ("Jo → Alex $42.10").
- One trip currency (set on the web, default USD). A different currency is stored as given. Conversion is out of scope, and the bot says so.

## 11. Things to verify before building (blocking)

| # | Question | If the answer is bad |
|---|---|---|
| V1 | How does Spectrum deliver inbound messages: webhook, long-lived connection, or polling? Is there a Python SDK? | No webhooks or Python SDK means adding the TS bridge (§3). |
| V2 | Can the free tier **create group chats** and post into groups? | The organizer adds the bot and sends the link code (§4.2). |
| V3 | On the free tier's shared line pool, does the bot keep **one stable sender** within a given group thread? | If not, use the link-code flow with a fixed line if one is available. Otherwise the demo can't be reliable on the free tier; escalate. |
| V4 | Does Spectrum expose inbound images, tapbacks/reactions, and sender handles for group messages? | No reactions means text "yes" and one-line acks. No images means screenshots are dropped from scope. |
| V5 | What are the flight API's free-tier limits for status lookups? | Lower the polling cadence, or poll only on the demo day's flights. |
| V6 | Free LLM credits: which provider, and does it support vision plus tool calling? | Pick a provider that does; otherwise run a separate vision call for screenshots. |
| V7 | Maps and weather API free tiers (e.g. Google Routes, Mapbox, OpenRouteService; Open-Meteo for weather). | Prefer keyless or free options (Open-Meteo, OpenRouteService). |

## 12. Data model (Supabase Postgres)

```text
trips(id, organizer_user_id, name, bot_name, destination_name, destination_lat, destination_lng,
      destination_tz, start_date, end_date, currency, chat_id unique null, link_code, status)
members(id, trip_id, name, phone_e164, imessage_handle, home_tz, is_organizer, is_guest,
        tracking_opt_in, created_at)                     -- unique(trip_id, phone_e164)
messages(id, trip_id, chat_id, spectrum_message_id unique, member_id null, direction in|out,
         text, attachments jsonb, classified_as, created_at)
flights(id, trip_id, member_id, airline, number, flight_date, dep_airport, arr_airport,
        dep_tz, arr_tz, sched_dep, sched_arr, est_dep, est_arr, gate_dep, status,
        last_announced jsonb, next_poll_at, direction outbound|return|other)
flight_status_snapshots(id, flight_id, payload jsonb, fetched_at)
events(id, trip_id, title, start_at, end_at, tz, location_name, location_address, lat, lng,
       attendees uuid[] null, created_by_member_id, deleted_at)
reservations(id, trip_id, kind hotel|restaurant|activity|car|other, name, address, lat, lng,
             start_at, end_at, tz, confirmation_code, notes)
event_history(id, trip_id, entity, entity_id, before jsonb, after jsonb, actor_member_id, created_at)
pending_confirmations(id, trip_id, chat_id, payload jsonb, prompt_message_id, expires_at, status)
notifications(id, trip_id, kind, dedupe_key unique, send_at, payload jsonb, status, sent_message_id)
expenses(...), expense_shares(...)                        -- §10
```

- **RLS:** the organizer can read and write rows where `trips.organizer_user_id = auth.uid()` (and child rows through `trip_id`). The agent uses the service role. Nothing is readable anonymously.
- **Storage:** a private `attachments` bucket. Paths are keyed by `trip_id/`.
- **Realtime:** the dashboard subscribes to `events`, `flights`, `reservations`, `expenses`, and `messages` (the latter for a read-only chat log) for the trip.

## 13. Web app (Next.js)

- **Setup wizard**: trip, members, flights and stays, review, then Launch (§4.1).
- **Dashboard** (live): a timeline grouped by day in the destination zone, with a toggle for "show in my zone". Also a flights panel (status chips, last updated), a who-lands-when strip, balances and settle-up, the chat log (read-only), and the launch status / link code.
- The organizer can edit events, reservations, flights, member zones, and opt-ins. Edits are announced per §6 and §8.
- Keyboard accessible, works on a phone-width screen (organizers will check it on mobile).

## 14. Demo script (target ~4 min)

1. Create the trip on the web (pre-filled draft, about 30 s). Press Launch, and phones receive the group with a welcome.
2. A member types "I land at 4:10 on DL 1234". The bot acknowledges with a saved line, and the dashboard updates live.
3. Another member sends a hotel confirmation screenshot. The bot parses and saves it.
4. Someone asks "who's landing first?" without addressing the bot. The bot answers with times in multiple zones.
5. Someone says "move dinner to 8". The bot asks for confirmation, a member replies yes, and the bot announces the change.
6. Someone says "I paid $84 for the Uber, Jo owes 30 of it", then asks "who owes what?".
7. Pickup suggestion and the morning summary are shown. The summary can be triggered by an organizer-only "send summary now" button on the dashboard. That button is a demo control, not a fake flight.
8. Live flight status on request. A real delay is a bonus.

## 15. Out of scope

Inbound email forwarding, flight simulator or replay, currency conversion, member logins, multiple organizers, payments or settle-up links, booking anything, SMS/WhatsApp channels, scaling beyond a handful of trips.

## 16. Risks

- **Spectrum free tier** (V2/V3) is the largest risk. Test group creation and sender stability on day one, before anything else.
- **Shared-pool number**: members may not recognize the bot. The welcome message and the dashboard should show which number it texts from.
- **Over-eager replies**: the "clear itinerary question" trigger can misfire in banter. Keep a high confidence threshold and the "human answered first" check, and log classifier decisions for tuning.
- **Real-only flight data**: proactive flight alerts may not fire during the demo (accepted).
- **Organizer-set opt-in** is consent by proxy. The welcome message lists who is tracked, and "stop tracking me" is honored immediately.
