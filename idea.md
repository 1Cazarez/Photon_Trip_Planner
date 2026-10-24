# Photon Trip Planner

Picture a group chat for a trip where one member is the agent. It knows everyone’s flights, the itinerary, and the reservations, and anyone can text it a question.

## What it does

- **Collects plans by text:** People send screenshots of confirmations, or type “I land at 4:10 on DL 1234.” It pulls out flight, hotel, and reservation details.
- **Tracks flights live:** It watches each person’s flight and posts updates on its own, like “Sam’s flight is delayed 45 min, now landing 5:20.”
- **Answers questions:** “What time is dinner?”, “where’s the hotel?”, “who’s landing first?”, or “what’s tomorrow?” get a short reply from the stored itinerary.
- **Sends proactive nudges:** A morning “today’s plan” message, “leave for the airport in 30 min,” or “dinner in 1 hour, 12 min walk.”
- **Handles changes:** When someone says “move dinner to 8,” it updates the plan and tells the group.
- **Keeps logistics straight:** It can coordinate pickups, such as “Alex and Jo land 20 min apart, share a ride?”, and track shared costs with custom splits.

## How it’s built

- **Messaging layer:** Photon Spectrum (hosted, free tier) sends and receives iMessages, so no Mac is needed. The open-source imessage-kit is macOS-only and isn't used. If Spectrum has no Python SDK or webhooks, a thin TypeScript bridge (spectrum-ts) relays messages to the agent over HTTP.
- **Agent brain:** A Python service runs on Render as an always-on web service (a paid instance, so it never sleeps). An LLM with tool calling and vision reads each message and decides whether to answer, save plan details, apply a change, or stay quiet. The provider is whichever one has free credits, kept behind a thin interface.
- **Trip store:** Supabase Postgres holds trips, members, messages, flights, reservations, events, notifications, edit history, and shared expenses. Supabase Storage keeps screenshots in a private bucket.
- **Web app:** A Next.js app hosted on Vercel where the organizer creates the trip (dates, destination, members with phone numbers and home time zones, known flights and hotel, tracking opt-ins) and watches a live dashboard over Supabase Realtime. Only the organizer signs in (magic link).
- **Flight data:** A real flight-status API, polled more often as departure gets closer, for opted-in members only.
- **Scheduler:** Runs inside the agent service. All due work is stored in the database, so a restart loses nothing. Supabase Edge Functions and `pg_cron` aren't needed.
- **Extras (in scope):** A maps API for travel times, weather in the morning summary, pickup coordination, and expenses with custom splits.

### Group chat flow

```text
Organizer sets up trip on web  ->  agent creates the iMessage group (via Spectrum)

Group message
	-> Photon Spectrum
	-> (TS bridge, if needed)
	-> Python agent service (LLM + tools)
	-> Supabase Postgres
	-> reply / silent save / proactive notification back through Spectrum
```

Each trip is private. Row Level Security limits trip data to its organizer, and the agent uses the service role.

## Tricky parts to plan for

- **Time zones:** Store everything in UTC. Each member sets a home zone; flights move their current zone. Group messages show times in every zone currently in use ("lands 5:20 PM ET (2:20 PM PT)"). Personal nudges use the recipient's zone.
- **Noise:** One morning summary, plus big changes only (flight change of 15 min or more, gate change, cancellation, event reminder 1 h before). Quiet hours run 10 PM–7 AM destination time.
- **Ambiguity:** "Dinner" could mean two events, so it asks a quick clarifying question rather than guessing.
- **Edits:** Anyone can edit. Big edits (moving an event by more than 30 min, deleting, changing the hotel) wait for a "yes" in the group. "undo" works for 10 minutes.
- **Privacy:** The organizer sets flight-tracking opt-ins, the welcome message lists who is tracked, and "stop tracking me" works at any time.
- **Spectrum free tier:** It uses a shared pool of numbers. Check first that it can create groups and keep one stable sender per group. If it can't, the organizer adds the bot to the group and sends a link code.

Full spec: [.plans/trip-agent-group-chat-spec.md](.plans/trip-agent-group-chat-spec.md)
