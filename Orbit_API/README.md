# Orbit API

Python backend for the Orbit AI platform — chat streaming, multi-agent orchestration, PDF RAG, plan limits, and admin APIs.

## What this serves

| Frontend app | Port | Main API routes |
|--------------|------|-----------------|
| **chat-app** | 3001 | `/api/auth`, `/api/chat`, `/api/agents`, `/api/files`, `/api/library`, `/api/plans` |
| **control_center_app** | 3003 | `/api/control/*` |
| **admin-app** | 3004 | `/api/platform/*` |

Interactive API docs: http://localhost:8000/docs

---

## Prerequisites

- **Python 3.11+** (3.12 recommended)
- **PostgreSQL 16** (local install or Docker)
- **Node/pnpm** — only if you run frontends from `Orbit_UI` (see that README)
- **LLM (pick one for local dev)**
  - **Ollama** (recommended for free-tier local stack): [ollama.com](https://ollama.com)
  - **OpenAI**: API key in `.env`
  - **Azure OpenAI**: for Pro/Enterprise plan routing (configured in Control Center + `.env`)

Optional for async PDF ingest at scale:

- **Redis** + Celery worker (or use `RAG_INGEST_MODE=background` without Redis)

---

## Run the full stack (local dev)

Use this order when running Orbit end-to-end with the chat UI and Control Center.

### 1. Database

```bash
cd Orbit_API
cp .env.example .env
```

**Option A — Docker Postgres**

```bash
docker compose up db -d
```

**Option B — Existing local Postgres** (e.g. Homebrew on port 5432)

Create role and database if needed:

```bash
createuser -s orbit 2>/dev/null || true
psql -d postgres -c "ALTER USER orbit WITH PASSWORD 'orbit';" 2>/dev/null || true
createdb -O orbit orbit 2>/dev/null || true
```

Set in `.env`:

```env
DATABASE_URL=postgresql+psycopg://orbit:orbit@localhost:5432/orbit
```

### 2. Python environment

```bash
cd Orbit_API
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-local.txt
```

### 3. Migrate & seed

```bash
alembic upgrade head
python -m scripts.seed
```

Seed creates demo users and loads agents/tools from Control Center JSON.

| Account | Email | Password | App only |
|---------|-------|----------|----------|
| Chat user | `demo@orbit.ai` | `demo1234` | chat-app (`/auth/chat/*`) |
| Operator | `operator@orbit.ai` | `operator1234` | control center (`/auth/control/*`) |
| Admin | `admin@orbit.ai` | `admin1234` | admin app (`/auth/admin/*`) |

Each app uses its **own session cookie** (`orbit_chat_session`, `orbit_control_session`, `orbit_admin_session`). Signing into one app does not sign you into the others.

### 4. Configure `.env` for local LLM

Minimal local setup with Ollama:

```env
LLM_PROVIDER=ollama
OLLAMA_DEFAULT_MODEL=llama3.2
RAG_INGEST_MODE=background
```

Then in another terminal:

```bash
ollama serve
ollama pull llama3.2
```

First PDF upload downloads the embedding model (`BAAI/bge-small-en-v1.5` via fastembed) automatically.

### 5. Start the API

```bash
cd Orbit_API
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Verify: http://localhost:8000/docs

### 6. Start frontends

In a **separate** terminal:

```bash
cd Orbit_UI
pnpm install
pnpm dev:chat          # http://localhost:3001
pnpm dev:control       # http://localhost:3003  (operator login)
pnpm dev:admin         # http://localhost:3004  (optional)
```

See [Orbit_UI/README.md](../Orbit_UI/README.md) for frontend-only details.

---

## Quick reference — all terminals

| # | Service | Command | URL |
|---|---------|---------|-----|
| 1 | Postgres | `docker compose up db -d` (in `Orbit_API`) | `localhost:5432` |
| 2 | Ollama | `ollama serve` + `ollama pull llama3.2` | `localhost:11434` |
| 3 | API | `uvicorn app.main:app --reload --port 8000` | http://localhost:8000 |
| 4 | Chat UI | `pnpm dev:chat` (in `Orbit_UI`) | http://localhost:3001 |
| 5 | Control Center | `pnpm dev:control` | http://localhost:3003 |

Optional:

```bash
# Redis + Celery (async PDF ingest)
docker compose up redis -d
celery -A app.worker.celery_app worker --loglevel=info
```

Or set `RAG_INGEST_MODE=background` in `.env` to process uploads inside the API process (simplest for dev).

---

## Environment

Copy `.env.example` → `.env`. Important variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection |
| `CORS_ORIGINS` | Must include `http://localhost:3001,3003,3004` |
| `LLM_PROVIDER` | `openai` or `ollama` |
| `OPENAI_API_KEY` | When using OpenAI |
| `OLLAMA_*` | Local Ollama URL and default model |
| `AZURE_OPENAI_*` | Azure credentials (Pro/Enterprise plans) |
| `RAG_INGEST_MODE` | `auto` \| `background` \| `celery` \| `sync` |
| `RAG_FREE_MAX_PAGES` | Free plan PDF page cap (default 20) |

Plan limits, AI stack (chat + embedding providers per plan), and marketing copy are editable in **Control Center → Plan limits** after seed.

---

## PDF RAG pipeline

| Step | Detail |
|------|--------|
| Upload | `POST /api/files/upload` — PDF only, auth required |
| Inspect | `POST /api/files/inspect` — page count vs plan limit before upload |
| Storage | Files on disk under `data/rag_uploads/{user_id}/` + rows in `rag_documents` |
| Extract | `pypdf` — Free plan: first 20 pages per file |
| Embed | `fastembed` + `BAAI/bge-small-en-v1.5` (or Azure per plan) |
| Retrieve | Cosine similarity when chat sends `source_id` |
| Library | `GET /api/library` — uploads + generated files |

Upload returns **202 Accepted** while ingest runs. Poll `GET /api/files/{id}` until `status` is `ready` or `failed`.

---

## Docker (API + Postgres + Redis + worker)

```bash
cd Orbit_API
cp .env.example .env
docker compose up --build
```

Note: if port `5432` is already used by a local Postgres, change the `db` service port mapping in `docker-compose.yml` and update `DATABASE_URL`.

---

## Project layout

```
app/
├── api/v1/public/     # chat-app endpoints (auth, chat, files, library, plans)
├── api/v1/control/    # control center CRUD
├── api/v1/platform/   # admin-app ops
├── orchestration/     # agent chat runner (Ollama / OpenAI / Azure per plan)
├── services/          # RAG, plans, library, token usage
├── worker/            # Celery tasks (PDF ingest)
└── models/            # SQLAlchemy tables
packages/clovai/         # LLM client used by the Clovai API
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `role "orbit" does not exist` | Create the DB user/db (see step 1) or start Docker Postgres |
| Chat returns stub / no LLM | Start Ollama or set `OPENAI_API_KEY` |
| CORS errors from UI | Check `CORS_ORIGINS` includes your frontend origin |
| PDF stuck on processing | Use `RAG_INGEST_MODE=background` or start Redis + Celery worker |
| Embedding download slow | First run pulls Hugging Face model; optional `HF_TOKEN` in env |
