# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS frontend
WORKDIR /build
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts
COPY frontend ./frontend
RUN npm run build

FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 STATIC_ROOT=/app/staticfiles
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend ./backend
COPY --from=frontend /build/frontend/dist ./frontend/dist
COPY scripts/entrypoint.sh ./scripts/entrypoint.sh
# The build-only key is public and never used by the runtime configuration.
RUN APP_MODE=preview DJANGO_DEBUG=true DJANGO_SECRET_KEY=public-static-collection-key-not-for-runtime-use python backend/manage.py collectstatic --noinput \
    && groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --no-create-home app \
    && chmod +x scripts/entrypoint.sh \
    && mkdir -p /app/.local \
    && chown app:app /app/.local
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health/', timeout=3)"
ENTRYPOINT ["/app/scripts/entrypoint.sh"]
