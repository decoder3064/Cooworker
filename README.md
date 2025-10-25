Conversational Workspace – Project Template Documentation
A voice/text-first collaborative workspace where multiple users interact with an AI Agent that can listen, answer (@ask), and act (@act) using connected tools (GitHub, Notion, Google Drive/Sheets) via Composio and Letta.

1) MVP Scope
User flows

Auth: Firebase (Email/Password or Google).

Workspace: Create, invite via link, join.

Session/Party: Real-time text chat (WebSockets); (Optional later) voice via SFU.

Agent: @ask (answer with memory), @act (host-only; confirm; execute via Composio).

Settings (post-MVP): Link/unlink external apps; permission delegation.

Non‑goals (MVP)

Full voice stack w/ diarization.

Complex role hierarchies beyond host/member.

Mobile apps.

2) System Architecture
┌──────────────┐      HTTPS / WSS       ┌──────────────────┐
│  Next.js UI  │◄──────────────────────►│   FastAPI Core   │
│ (Firebase)   │                        │  (AuthZ, REST,   │
│              │   WebSocket (chat)     │   WS Gateway)    │
└──────┬───────┘                        └───┬──────────────┘
       │                                   │
       │                                   │Pub/Sub      ┌────────────┐
       │                                   ├────────────►│  Redis     │
       │                                   │             └────────────┘
       │                                   │                 ▲
       │                                   │                 │
       │                        ┌──────────┴─────────┐       │
       │                        │  Worker(s): Agent  │◄──────┘
       │                        │  (Letta + Composio │  Subscribes
       │                        │   tool executors)  │  to session
       │                        └──────────┬─────────┘  channels
       │                                   │
       │                             ┌──────┴───────┐
       │                             │ Postgres +   │
       └────────────────────────────►│  pgvector    │
                                     └──────────────┘

(Optional Voice)
Next.js  ──WebRTC──► SFU (LiveKit/Daily) ──► Bot Subscriber ──► ASR → same WS/Agent pipeline
3) Tech Stack
Frontend: Next.js (App Router), React, Tailwind, TanStack Query.

Auth: Firebase Auth (ID token verified by backend).

Backend: FastAPI (Python 3.11+), uvicorn, SQLAlchemy/SQLModel.

DB: Postgres (Neon/Supabase), pgvector for semantic memory.

Realtime: WebSockets (FastAPI) + Redis pub/sub (Upstash/Elasticache).

Agent: Letta (LLM + tool calling) with retrieval; Composio for integrations.

Workers: RQ or Celery (Redis) for @ask/@act jobs and “sleeper” tasks.

(Optional Voice): LiveKit/Daily SFU; ASR (Whisper server or managed).

4) Repository Layout
root/
  apps/
    web/              # Next.js app
    api/              # FastAPI service
  infra/              # IaC / deploy scripts (optional)
  docs/               # Design docs, OpenAPI, sequences
Frontend (apps/web)

src/
  app/
    (auth)/
    dashboard/
    workspaces/[id]/
    sessions/[id]/
  components/
  lib/
  styles/
Backend (apps/api)

app/
  main.py
  auth/firebase.py
  db/base.py
  db/models.py
  api/routes/
    workspaces.py
    invites.py
    sessions.py
    messages.py
    actions.py
    composio.py
  services/
    agent.py       # Letta orchestration
    actions.py     # Composio executors
    memory.py      # embeddings + retrieval
    ws_gateway.py  # Redis + WS fanout
  workers/
    jobs.py        # ask/act jobs
  schemas/
    dto.py         # pydantic models
5) Environment & Config
Create two .env files: one per app.

apps/web/.env.local

NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_WS_URL=wss://api.example.com
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
apps/api/.env

PORT=8080
DATABASE_URL=postgresql+psycopg://user:pass@host/db
REDIS_URL=redis://:pass@host:6379/0
FIREBASE_PROJECT_ID=...
COMPOSIO_API_KEY=...
LETTA_API_KEY=...
EMBEDDINGS_PROVIDER=openai
OPENAI_API_KEY=...
JWT_AUDIENCE=your-firebase-project
ALLOW_ORIGINS=https://app.example.com,https://localhost:3000
Store provider keys in your secrets manager (e.g., Fly.io secrets, Vercel envs).

6) Database Schema (MVP)
-- Users are identified by Firebase UID
create table users (
  id text primary key,
  email text not null,
  display_name text,
  created_at timestamptz default now()
);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  host_user_id text references users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id text references users(id) on delete cascade,
  role text check (role in ('host','member')) not null,
  primary key (workspace_id, user_id)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table messages (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  sender_user_id text null references users(id), -- null for agent/system
  type text check (type in ('user','agent','system','transcript')) not null,
  text text not null,
  seq bigint not null,
  ts timestamptz default now()
);
create index on messages(session_id, seq);

create table actions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  initiator_user_id text references users(id),
  kind text not null, -- e.g. github_template, notion_itinerary, sheet_budget
  status text check (status in ('pending','awaiting_confirm','running','done','error')) not null,
  payload_json jsonb not null,
  result_json jsonb,
  created_at timestamptz default now()
);

-- Composio mapping (we store only IDs, not tokens)
create table connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id text references users(id),
  provider text not null,    -- github|notion|google
  account_id text not null,  -- composio connected account id
  label text,
  created_at timestamptz default now()
);

-- Semantic memory
create table memory (
  id bigserial primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  text text not null,
  embedding vector(1536),
  source_message_id bigint references messages(id),
  ts timestamptz default now()
);
7) Backend Endpoints (OpenAPI sketch)
Auth

GET /me → current Firebase user (after token verify).

Workspaces

POST /workspaces { name } → { id } (host = caller)

GET /workspaces → list memberships

POST /workspaces/{id}/invites → { code, url }

POST /invites/{code}/accept → join

Sessions (Parties)

POST /workspaces/{id}/sessions → { sessionId }

POST /sessions/{id}/end → is_active=false

Messages

GET /sessions/{id}/messages?after_seq=N&limit=100

WS /ws/sessions/{id} (see protocol below)

Actions (@act)

POST /actions { workspace_id, session_id, tool, args, connected_account_id, dry_run } → { action_id }

POST /actions/{id}/confirm (host only)

GET /actions/{id} → status/result

Composio

POST /composio/users (idempotent create; maps Firebase uid → Composio user)

POST /composio/connect-link { provider, user_id } → { url }

GET /composio/accounts?user_id=... → list connected accounts

Webhooks: /composio/webhook (optional) to update connection status

8) WebSocket Protocol (Sessions)
Connect: wss://api/ws/sessions/:id with header Authorization: Bearer <idToken>

Client → Server events

{ "type": "user_msg", "client_event_id": "uuid", "text": "@ask what did we decide?" }
{ "type": "typing", "is_typing": true }
Server → Client events

{ "type": "message", "seq": 123, "sender": {"id":"U1","name":"Reet"}, "role":"user|agent|system|transcript", "text":"…", "ts": 1730.12 }
{ "type": "presence", "users": [{"id":"U1","name":"Reet"}, ...] }
{ "type": "action_update", "id":"A1", "status":"awaiting_confirm|running|done|error", "result": { ... } }
Ordering: Messages carry a server-assigned, monotonically increasing seq; the gateway broadcasts in seq order.

Idempotency: Server de-duplicates client_event_id within a short TTL.

9) Agent Orchestration (Letta)
System prompt (compact)

Identity, guardrails, role rules (host-only for @act), JSON tool schema expectations.

Context building

Window: recent chat (time/seq-based) + top‑k from memory via pgvector.

Include speaker tags and workspace summary (rolled per session hourly).

Tools (examples)

create_github_template(repo_name, template)

create_notion_itinerary(trip_name, days, cities[], prefs{})

create_budget_sheet(sheet_name, items[])

Flow

Detect @ask vs @act in router.

@ask → Letta → stream back text; persist & optionally TTS later.

@act → Letta returns tool_call + args → server validates (Pydantic) → create Action(status=awaiting_confirm) → host confirms → run Composio → update via WS.

10) Composio Integration (Multi‑user)
On first login, create Composio User mapped to Firebase UID.

To link a tool, request Connect Link for that user & provider.

After OAuth, Composio stores tokens; you store only Connected Account IDs per user (optionally bind to workspace).

When executing, choose which connected_account_id to use (default: host’s for workspace‑scoped actions).

Maintain audit log (action id → external IDs: repo URL, notion page ID, sheet ID).

11) Frontend Notes (Next.js)
Use Firebase SDK; persist ID token; attach to every REST/WS call.

Chat UI: list by seq; show presence & typing; host-only confirm button on pending actions.

“Link apps” screen: list Composio accounts; connect flow opens link in new tab.

Error toasts on WS disconnects; auto-retry with backoff.

WS client helper

const ws = new WebSocket(`${WS_URL}/ws/sessions/${sid}`);
ws.onopen = () => ws.send(JSON.stringify({ type: 'hello' }));
ws.onmessage = (e) => dispatch(JSON.parse(e.data));
function sendText(text: string) {
  ws.send(JSON.stringify({ type: 'user_msg', client_event_id: crypto.randomUUID(), text }));
}
12) Local Dev – Quickstart
Requirements: Python 3.11, Node 18+, Docker, Postgres, Redis.

# Backend
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head  # run migrations
uvicorn app.main:app --reload --port 8080

# Frontend
cd apps/web
pnpm i
pnpm dev
Services (Docker Compose)

version: "3.9"
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
13) Deployment
Web: Vercel (set env vars; proxy API URL).

API: Fly.io/Render/Heroku; scale one web + one worker.

DB: Neon/Supabase (enable pgvector).

Redis: Upstash.

Domain & CORS: lock to app.yourdomain.com.

Zero-downtime notes

Use sticky WS or stateless fanout via Redis (recommended).

Run Alembic migrations on deploy.

14) Security & Compliance
Verify Firebase ID token on every HTTP/WS request (backend).

Role checks server-side (host-only @act & confirm).

Store only Composio account IDs, never raw OAuth tokens.

Encrypt secrets at rest (KMS); rotate keys regularly.

PII: redact emails/phones in memory/doc logs if needed.

15) Observability & Testing
Logs: structured JSON; correlate by workspace_id, session_id, action_id.

Metrics: latency (ask/act), WS connections, tool success rate.

Tracing: OpenTelemetry for request → agent → action path.

Testing:

Unit: tool arg validators, router logic, role checks.

Integration: mock Letta, mock Composio; run against test Postgres/Redis.

E2E: Playwright for UI; WebSocket harness for message ordering/idempotency.

16) Roadmap (stretch)
Voice rooms (LiveKit); bot participant; streaming ASR/diarization → type: "transcript" events.

Delegated permissions; per-user tool accounts and policy engine.

Multi-agent parallel tasks; planner/worker agents with human-in-the-loop.

Summaries & knowledge base per workspace; vector memory compaction.

SSO (Org); billing; rate limits & quotas; export data.

17) Appendix – Minimal Snippets
FastAPI Firebase verify

from fastapi import Depends, Header, HTTPException
import firebase_admin
from firebase_admin import auth
firebase_admin.initialize_app()

def require_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(401, "Missing token")
    try:
        scheme, token = authorization.split()
        assert scheme.lower() == "bearer"
        decoded = auth.verify_id_token(token)
        return {"uid": decoded["uid"], "email": decoded.get("email")}
    except Exception:
        raise HTTPException(401, "Invalid token")
WS gateway skeleton

from fastapi import WebSocket
from redis.asyncio import Redis

redis = Redis.from_url(os.getenv("REDIS_URL"))

async def ws_session(ws: WebSocket, sid: str, user: dict):
    await ws.accept()
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"session:{sid}")
    try:
        async for msg in pubsub.listen():
            if msg["type"] == "message":
                await ws.send_text(msg["data"].decode())
    finally:
        await pubsub.unsubscribe(f"session:{sid}")
Action dry‑run → confirm flow

# POST /actions
action = Actions.create(..., status="awaiting_confirm")
# host clicks confirm -> /actions/{id}/confirm
Actions.update(id, status="running")
result = run_executor(tool, args, connected_account_id)
Actions.update(id, status="done", result_json=result)
# broadcast via WS

