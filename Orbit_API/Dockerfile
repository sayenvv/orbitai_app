FROM python:3.12-slim

WORKDIR /app

# Build from repo root: docker build -f personal/orbitai_app/Orbit_API/Dockerfile .
COPY packages/orbit-ollama /tmp/orbit-ollama
RUN pip install --no-cache-dir /tmp/orbit-ollama

COPY personal/orbitai_app/Orbit_API/pyproject.toml personal/orbitai_app/Orbit_API/README.md ./
COPY personal/orbitai_app/Orbit_API/app ./app
COPY personal/orbitai_app/Orbit_API/alembic.ini ./
COPY personal/orbitai_app/Orbit_API/alembic ./alembic
COPY personal/orbitai_app/Orbit_API/scripts ./scripts

RUN pip install --no-cache-dir .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
