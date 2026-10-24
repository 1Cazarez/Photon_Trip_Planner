# Photon Trip Planner

Picture a group chat for a trip where one member is the agent. It knows everyone’s flights, the itinerary, and the reservations, and anyone can text it a question.

## What it does

- **Collects plans by text:** People forward confirmation emails or screenshots, or type “I land at 4:10 on DL 1234.” It pulls out flight, hotel, and reservation details.
- **Tracks flights live:** It watches each person’s flight and posts updates on its own, like “Sam’s flight is delayed 45 min, now landing 5:20.”
- **Answers questions:** “What time is dinner?”, “where’s the hotel?”, “who’s landing first?”, or “what’s tomorrow?” get a short reply from the stored itinerary.
- **Sends proactive nudges:** A morning “today’s plan” message, “leave for the airport in 30 min,” or “dinner in 1 hour, 12 min walk.”
- **Handles changes:** When someone says “move dinner to 8,” it updates the plan and tells the group.
- **Keeps logistics straight:** It can coordinate pickups, such as “Alex and Jo land 20 min apart, share a ride?”, and track shared costs.

## How it’s built

- **Messaging layer:** Photon’s imessage-kit or Spectrum receives and sends messages in the group thread. Supabase stores and coordinates the conversation data but is not the chat channel by itself.
- **Agent brain:** An LLM reads each message and decides whether to answer, update the plan, or stay quiet. Most messages in a group chat aren’t for the bot, so staying quiet matters.
- **Trip store:** Supabase Postgres holds trips, group members, messages, travelers, flights, reservations, events, notifications, and shared expenses.
- **Flight data:** A flight-status API polled every few minutes for each tracked flight, triggering messages on changes.
- **Backend logic:** Supabase Edge Functions process messages, call the LLM, update trip data, and send responses through the messaging layer.
- **Scheduler:** Supabase `pg_cron` triggers Edge Functions for flight polling, timed nudges, and morning summaries.
- **Optional extras:** A maps API for travel times, weather for each day, and image parsing for screenshots of confirmations.

### Group chat flow

```text
Group message
	-> Messaging layer
	-> Agent backend / Edge Function
	-> Supabase Postgres
	-> Agent response or proactive notification
```

Supabase Auth and Row Level Security keep each trip private, while Supabase Realtime lets members see itinerary changes as they happen. Uploaded confirmations can be stored in private Supabase Storage buckets.

## Tricky parts to plan for

- **Time zones:** Store everything in UTC, and display trip times in EST.
- **Noise:** Limit proactive messages so the bot doesn’t become the annoying friend. Big changes only, plus one daily summary.
- **Ambiguity:** “Dinner” could mean two events, so it should ask a quick clarifying question rather than guess.
- **Privacy:** Flight details and locations are personal, so let people opt in before tracking.