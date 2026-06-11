#!/usr/bin/env bash
# Dev server — reload only app/packages sources (not .venv) so long SSE streams are not killed.
set -euo pipefail
cd "$(dirname "$0")/.."
exec .venv/bin/uvicorn app.main:app \
  --reload \
  --port 8000 \
  --reload-dir app \
  --reload-dir packages
