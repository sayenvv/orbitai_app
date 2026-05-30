# Orbit UI

Monorepo for the Orbit AI frontends — chat app, operator control center, and admin dashboard. All apps talk to **Orbit_API** on port **8000** by default.

## Apps

| App | Dev command | URL | Purpose |
|-----|-------------|-----|---------|
| **chat-app** | `pnpm dev:chat` | http://localhost:3001 | End-user chat, library, plans, PDF upload |
| **control_center_app** | `pnpm dev:control` | http://localhost:3003 | Agents, widgets, plan limits, AI stack config |
| **admin-app** | `pnpm dev:admin` | http://localhost:3004 | Platform ops (users, billing) |

Shared packages: `@orbit/ui`, `@orbit/types`, `@orbit/tsconfig` (under `packages/`).

---

## Prerequisites

- **Node.js 20+**
- **pnpm 9+** (`corepack enable` or `npm i -g pnpm`)
- **Orbit_API** running on http://localhost:8000 (see [Orbit_API/README.md](../Orbit_API/README.md))

Optional for full local AI:

- **Ollama** with `llama3.2` if the API uses `LLM_PROVIDER=ollama`

---

## Run the complete application

Follow these steps once per machine, then use the daily dev commands below.

### 1. Backend (required)

From the repo root:

```bash
cd Orbit_API
cp .env.example .env
# Edit .env — at minimum DATABASE_URL and LLM_PROVIDER=ollama for local dev

python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-local.txt

# Postgres: docker compose up db -d   OR use local Postgres (see API README)
alembic upgrade head
python -m scripts.seed

uvicorn app.main:app --reload --port 8000
```

### 2. Ollama (recommended for local chat)

```bash
ollama serve
ollama pull llama3.2
```

### 3. Install frontend dependencies

```bash
cd Orbit_UI
pnpm install
```

### 4. Start the apps you need

**Minimum for chat:**

```bash
pnpm dev:chat
```

Open http://localhost:3001 — sign in with `demo@orbit.ai` / `demo1234`.

**Control Center** (configure agents, plans, AI stack):

```bash
pnpm dev:control
```

Open http://localhost:3003 — sign in with `operator@orbit.ai` / `operator1234`.

**All apps at once** (Turbo):

```bash
pnpm dev
```

Or run individually (avoids Turbo TUI issues):

```bash
pnpm --filter chat-app dev
pnpm --filter control_center_app dev
pnpm --filter admin-app dev
```

---

## Daily dev workflow

| Terminal | Directory | Command |
|----------|-----------|---------|
| 1 | `Orbit_API` | `source .venv/bin/activate && uvicorn app.main:app --reload --port 8000` |
| 2 | `Orbit_UI` | `pnpm dev:chat` |
| 3 | `Orbit_UI` | `pnpm dev:control` (when editing operators/plans) |

Optional terminal: `ollama serve`

---

## API connection

Apps default to the local API — no `.env` required for basic dev:

| Variable | Default |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` |
| `NEXT_PUBLIC_CHAT_API_URL` | `http://localhost:8000/api/chat` |

To override, add `.env.local` in an app directory, e.g. `apps/chat-app/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_CHAT_API_URL=http://localhost:8000/api/chat
```

`CORS_ORIGINS` on the API must include `http://localhost:3001`, `3003`, and `3004` (set in `Orbit_API/.env`).

---

## Features by app

### chat-app (3001)

- Multi-agent chat with streaming
- PDF upload + RAG (library with Uploads / Generated tabs)
- Plans page and token usage
- Library: upload, download, delete, **Use in chat**

### control_center_app (3003)

- Publish agents, tools, widgets
- Edit plan limits, pricing copy, and **per-plan AI stack** (Ollama vs Azure)
- Operator-only (`operator@orbit.ai`)

### admin-app (3004)

- Platform dashboard (requires API `/api/platform/*`)

---

## Build & lint

```bash
pnpm build          # all apps
pnpm build:chat     # chat-app only
pnpm lint           # all apps
```

Production start (after build):

```bash
pnpm --filter chat-app start    # port 3001
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API requests fail / 401 | Ensure API is on :8000 and you are signed in |
| Blank chat / stub replies | Start Ollama or configure OpenAI on the API |
| CORS error in browser | Update `CORS_ORIGINS` in `Orbit_API/.env` |
| `pnpm` not found | `corepack enable && corepack prepare pnpm@latest --activate` |
| Port in use | chat=3001, control=3003, admin=3004, API=8000 |

Full backend setup (Postgres, migrations, RAG, Celery): [Orbit_API/README.md](../Orbit_API/README.md)
