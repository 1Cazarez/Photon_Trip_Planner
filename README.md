# Photon Trip Planner

An AI agent that lives in a trip's iMessage group chat. It knows everyone's flights, the itinerary, and the reservations. It answers questions, tracks flights, sends a few useful nudges, and keeps track of shared costs.

- Idea: [idea.md](idea.md)
- Detailed spec: [.plans/trip-agent-group-chat-spec.md](.plans/trip-agent-group-chat-spec.md)

> Status: hackathon / demo, pre-code. This README describes the planned setup.

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Messaging | [Photon Spectrum](https://photon.codes) (hosted, free tier) | No Mac needed. Sends and receives iMessages in the group. |
| Spectrum bridge | TypeScript + `spectrum-ts` | **Only if** Spectrum has no Python SDK or webhooks. Relays messages to the agent over HTTP. |
| Agent service | Python 3.12, FastAPI, APScheduler | **Render** web service, always on. LLM tool loop, scheduler, integrations. |
| LLM | Provider with free credits | Must support tool calling and image input. Kept behind a small interface. |
| Database / auth | Supabase (Postgres, Auth, Realtime, Storage) | The organizer signs in with a magic link. RLS per trip. A private bucket holds screenshots. |
| Web app | Next.js (TypeScript) on **Vercel** | Trip setup wizard and live dashboard. |
| Flight status | AeroDataBox / AviationStack / FlightAware AeroAPI | Pick one after checking free-tier limits. |
| Maps | OpenRouteService, Google Routes, or Mapbox | Travel times for reminders. |
| Weather | Open-Meteo | Free, no API key. |

```text
web (Next.js, Vercel) ──▶ Supabase ◀── agent (Python, Render) ◀──▶ [TS bridge, Render] ◀──▶ Photon Spectrum ◀──▶ iMessage group
```

## Planned repo layout

```text
agent/      Python agent service (FastAPI app, tools, scheduler, integrations)
bridge/     TypeScript Spectrum bridge (only if needed)
web/        Next.js organizer app
supabase/   migrations, seed data, RLS policies (Supabase CLI)
.plans/     specs
```

## Prerequisites

- Node.js 20+ and npm (or pnpm)
- Python 3.12+ and [uv](https://docs.astral.sh/uv/) (or pip + venv)
- [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker (for local Supabase)
- Accounts and keys:
  - Supabase project
  - Photon Spectrum account
  - LLM provider API key
  - Flight-status API key
  - Maps API key (if not using a keyless option)
- [Vercel](https://vercel.com) account (web app)
- [Render](https://render.com) account (agent service and optional bridge)

## Dependencies

### Agent (`agent/`, Python)

| Package | Purpose |
|---|---|
| `fastapi`, `uvicorn[standard]` | HTTP endpoints: `/inbound`, `/trips/{id}/launch`, health |
| `supabase` | Postgres / Storage client (service role) |
| `httpx` | Flight, maps, weather, and bridge HTTP calls |
| `apscheduler` | In-process scheduler for polls, nudges, summaries |
| `pydantic`, `pydantic-settings` | Tool argument validation, env config |
| `tzdata` | IANA time zones for `zoneinfo` (needed on slim images) |
| `phonenumbers` | Normalize member phone numbers to E.164 |
| LLM SDK (`anthropic` / `openai` / …) | Whichever provider you use |
| Dev: `pytest`, `ruff` | Tests and lint |

### Bridge (`bridge/`, TypeScript, optional)

| Package | Purpose |
|---|---|
| Spectrum SDK (`spectrum-ts`) | Spectrum client. Get the exact package name from Photon's docs. |
| `hono` or `express` | Small HTTP server for `/send` and `/create-group` |
| `tsx`, `typescript` | Run and build |

### Web (`web/`, Next.js)

| Package | Purpose |
|---|---|
| `next`, `react`, `react-dom` | App framework |
| `@supabase/supabase-js`, `@supabase/ssr` | Auth (magic link), queries, Realtime |
| `date-fns`, `date-fns-tz` | Display times in different zones |
| `libphonenumber-js` | Phone input validation |
| `tailwindcss` | Styling |
| `zod` | Form validation |

## Getting started

### 1. Check Photon Spectrum first (blocking)

Before writing app code, confirm on the free tier that Spectrum can:

1. Create a group chat and post into it.
2. Keep **one stable sender number** within a group (the free tier uses a shared pool of numbers).
3. Deliver inbound group messages with the sender handle, images, and (ideally) tapbacks.
4. Deliver inbound messages in a known way: webhook, a long-lived connection, or a Python SDK. This decides whether `bridge/` exists.

If Spectrum can't create groups, use the fallback: the organizer adds the bot to the group and sends a link code. The spec has the full checklist (section 11).

### 2. Supabase

```bash
supabase init
supabase start                # local Postgres, Auth, Studio
supabase migration new init   # add tables from the spec (section 12)
supabase db reset             # apply migrations + seed
```

Create a private Storage bucket named `attachments`.

### 3. Environment variables

`agent/.env`

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
LLM_PROVIDER=            # e.g. anthropic | openai
LLM_API_KEY=
LLM_MODEL=
FLIGHT_API_KEY=
MAPS_API_KEY=
SPECTRUM_API_KEY=        # or BRIDGE_URL if using the bridge
AGENT_SHARED_SECRET=     # web -> agent launch calls
```

`web/.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
AGENT_URL=
AGENT_SHARED_SECRET=
```

### 4. Agent

```bash
cd agent
uv init && uv add fastapi "uvicorn[standard]" supabase httpx apscheduler pydantic pydantic-settings tzdata phonenumbers
uv add <llm-sdk>
uv add --dev pytest ruff
uv run uvicorn app.main:app --reload --port 8000
```

### 5. Bridge (only if needed)

```bash
cd bridge
npm init -y && npm i <spectrum-sdk> hono && npm i -D typescript tsx
npx tsx src/index.ts
```

### 6. Web

```bash
npx create-next-app@latest web --ts --tailwind --app
cd web
npm i @supabase/supabase-js @supabase/ssr date-fns date-fns-tz libphonenumber-js zod
npm run dev
```

### 7. Deploy

Deploy in this order. Each step needs a URL from the step before it.

1. Supabase (hosted project)
2. Render (agent). This gives you `AGENT_URL`.
3. Vercel (web). This gives you the site URL.
4. Back to Supabase and Spectrum to register those URLs.

#### 7a. Hosted Supabase

1. Create a project at [supabase.com](https://supabase.com). Pick the region closest to where you'll host on Render.
2. Link it and push the schema:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push
   ```

3. Create the private `attachments` Storage bucket in the hosted project.
4. Copy the **Project URL**, **anon key**, and **service role key** from Project Settings → API. The service role key goes only to Render, never to Vercel.

#### 7b. Render (agent service)

**One-time setup**

1. Sign up at [render.com](https://render.com) with GitHub and grant access to this repo.
2. Add a `render.yaml` blueprint at the repo root so the service is defined in code:

   ```yaml
   services:
     - type: web
       name: photon-agent
       runtime: python
       rootDir: agent
       region: oregon          # match your Supabase region as closely as possible
       plan: starter           # paid; free instances sleep and miss scheduled jobs
       numInstances: 1         # scheduler runs in-process; more instances = duplicate sends
       buildCommand: pip install uv && uv sync --frozen
       startCommand: uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT
       healthCheckPath: /health
       autoDeploy: true
       envVars:
         - key: PYTHON_VERSION
           value: 3.12.7
         - key: SUPABASE_URL
           sync: false
         - key: SUPABASE_SERVICE_ROLE_KEY
           sync: false
         - key: LLM_PROVIDER
           sync: false
         - key: LLM_API_KEY
           sync: false
         - key: LLM_MODEL
           sync: false
         - key: FLIGHT_API_KEY
           sync: false
         - key: MAPS_API_KEY
           sync: false
         - key: SPECTRUM_API_KEY
           sync: false
         - key: AGENT_SHARED_SECRET
           generateValue: true

     # Uncomment only if Spectrum needs the TypeScript bridge (see step 1).
     # - type: web
     #   name: photon-bridge
     #   runtime: node
     #   rootDir: bridge
     #   region: oregon
     #   plan: starter
     #   buildCommand: npm ci && npm run build
     #   startCommand: node dist/index.js
     #   envVars:
     #     - key: SPECTRUM_API_KEY
     #       sync: false
     #     - key: AGENT_URL
     #       sync: false
   ```

3. In the Render dashboard, choose **New → Blueprint**, select the repo, and apply. Render will ask for every `sync: false` value.
4. Wait for the first deploy, then open `https://photon-agent.onrender.com/health` (your actual URL is on the service page). It should return 200.
5. Copy the generated `AGENT_SHARED_SECRET` from the service's Environment tab, because Vercel needs the same value.

**If you use the bridge:** keep both services in the same region. Set the agent's `BRIDGE_URL` and the bridge's `AGENT_URL` to each other's **internal** address, which is shown in each service's Connect menu. Those calls then stay on Render's private network.

**Day to day**

- A push to `main` redeploys automatically (`autoDeploy: true`).
- Logs are in the service's Logs tab. Use them to watch classifier decisions and Spectrum delivery.
- After changing env vars, use **Manual Deploy → Deploy latest commit** if Render doesn't restart on its own.

#### 7c. Vercel (web app)

**One-time setup (dashboard)**

1. Sign up at [vercel.com](https://vercel.com) with GitHub.
2. **Add New → Project**, import this repo, and set:
   - **Root Directory:** `web`
   - **Framework Preset:** Next.js (auto-detected)
3. Add environment variables (Settings → Environment Variables) for **Production** and **Preview**:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `AGENT_URL` | Render agent URL, e.g. `https://photon-agent.onrender.com` |
   | `AGENT_SHARED_SECRET` | Same value as on Render |

4. Deploy. Note the production domain (e.g. `photon-trip-planner.vercel.app`).

**Or with the CLI**

```bash
npm i -g vercel
cd web
vercel link                 # pick/create the project; confirm root is web
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add AGENT_URL
vercel env add AGENT_SHARED_SECRET
vercel env pull .env.local  # sync the same values for local dev
vercel --prod
```

**Day to day**

- A push to `main` triggers a production deploy, and every other branch or PR gets a preview URL.
- `AGENT_URL` and `AGENT_SHARED_SECRET` aren't `NEXT_PUBLIC_`, so they stay server-side. Call the agent only from Route Handlers or Server Actions, never from the browser.

#### 7d. Wire the URLs together

1. **Supabase → Authentication → URL Configuration**
   - **Site URL:** your Vercel production domain
   - **Redirect URLs:** add `https://<prod-domain>/**`, plus `https://*-<your-team>.vercel.app/**` if you want magic links on preview deploys, plus `http://localhost:3000/**` for local dev
2. **Spectrum:** set the inbound webhook (or the bridge's target) to `https://<agent-url>/inbound`.

#### 7e. Smoke test

1. `GET https://<agent-url>/health` returns 200.
2. Sign in on the Vercel site with a magic link. You should land back on the site already signed in.
3. Create a test trip with your own number, then **Launch**. The group is created and the welcome arrives.
4. Text "when does the trip start?" in the group. The reply arrives, and the message appears in the dashboard's chat log.

## Build order

1. Spectrum check (step 1).
2. Schema and RLS.
3. Inbound message → stored → echo reply in the group.
4. LLM tool loop: save flights and events, answer questions, stay quiet.
5. Web setup wizard → launch creates the group.
6. Flight polling and change alerts.
7. Edits with confirmation and undo.
8. Morning summary, reminders, travel time, weather.
9. Expenses.
10. Pickup suggestions.
11. Dashboard polish.
12. Demo rehearsal.
