# Baton

**A shared liability record for Australian share houses.**
BUS4012 Vibe Coding for Startups · Assignment 3 · Aditya Bajpai (22871057)

Baton lets housemates log damage as it happens and co-sign a dated **handover**
when someone moves out mid-lease, so liability for earlier damage stays with the
person who caused it. The departing renter gets an **exit pack** as evidence.

## Architecture

```
Browser (React + TypeScript + Tailwind)
        │  fetch /api/...   (login token only, no database keys)
        ▼
Python API (FastAPI) — Vercel serverless function, api/index.py
        │  Supabase URL + secret key from ENVIRONMENT VARIABLES
        ▼
Supabase — Auth (email + password) and Postgres (RLS on, no public access)
```

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 3, react-hook-form + zod.
- **Backend:** Python FastAPI. It checks the user's token with Supabase Auth,
  validates every input again on the server, and is the only code that can
  read or write the database.
- **Database:** Supabase Postgres, with tables `houses`, `residents`,
  `timeline_entries` and `handovers`. Row Level Security is enabled with no
  public policies, so the public API key cannot read or write any data.
- **Hosting:** Vercel serves the React build and the Python function from one
  project and one domain.

## Folder structure

```
api/index.py            Python backend (all API routes)
requirements.txt        Python packages for Vercel
supabase/schema.sql     Database tables, RLS and the BATON42 demo house
src/App.tsx             Routes and session state
src/lib/api.ts          The only file that calls the backend
src/components/ui/      Reusable UI kit (Button, FormField, ResidentBadge, Timeline, ...)
src/screens/            The 7 screens (Login, Setup, Timeline, Log damage, Handover, Result, Exit pack)
src/types.ts            Shared TypeScript types
vercel.json             Routes /api/* to Python and everything else to React
.env.example            Names of the required environment variables (no real values)
```

## Environment variables

| Name | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → Data API (or API) → Project URL |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → Secret key (or the legacy `service_role` key) |

They are set in **Vercel → Project → Settings → Environment Variables**. They
are never committed (`.env` is in `.gitignore`) and never sent to the browser.

## Run locally (optional)

```bash
npm install
pip install -r requirements.txt uvicorn
cp .env.example .env        # then fill in the two values
uvicorn api.index:app --port 8000   # terminal 1
npm run dev                         # terminal 2, open http://localhost:5173
```

## Demo

Create an account, choose **Join with a code** and enter **BATON42** to join the
demo house at 42 Rathdowne Street (pick the green colour).
