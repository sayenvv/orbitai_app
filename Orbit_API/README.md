# Orbit API

Python backend for the Orbit AI platform — multi-agent orchestration, chat streaming, and admin APIs.

## Apps served

| Frontend | Port | API prefix |
|----------|------|------------|
| chat-app | 3001 | `/api/chat`, `/api/auth`, `/api/agents` |
| control_center_app | 3003 | `/api/control/*` |
| admin-app | 3004 | `/api/platform/*` |

## Quick start

```bash
# 1. Start Postgres
cd Orbit_API
cp .env.example .env
docker compose up db -d

# 2. Create venv & install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# 3. Migrate & seed
alembic upgrade head
python -m scripts.seed

# 4. Run API
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## With Docker (API + Postgres)

```bash
docker compose up --build
```

## Environment

See `.env.example`. Set `OPENAI_API_KEY` for live LLM responses; without it the chat stream returns a dev stub message.

## Project layout

```
app/
├── api/v1/public/     # chat-app endpoints
├── api/v1/control/    # control center CRUD
├── api/v1/platform/   # admin-app ops
├── orchestration/     # LangGraph agent runner
├── services/          # shared business logic
└── models/            # SQLAlchemy tables
```
