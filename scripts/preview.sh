#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ ! -x .venv/bin/python ]; then
  if [ -z "${PYTHON_BIN:-}" ]; then
    for candidate in python3.12 python3.13 python3.14 python3; do
      if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys; sys.exit(sys.version_info < (3,12))' 2>/dev/null; then
        PYTHON_BIN=$candidate
        break
      fi
    done
  fi
  : "${PYTHON_BIN:?Install Python 3.12 or later, or set PYTHON_BIN to its path.}"
  "$PYTHON_BIN" -m venv .venv
fi
.venv/bin/python -c 'import sys; assert sys.version_info >= (3,12), "Recreate .venv with Python 3.12 or later."'
.venv/bin/python -m pip install -r backend/requirements-dev.txt
npm ci --ignore-scripts
npm run build
export APP_MODE=preview DJANGO_DEBUG=true DJANGO_SSL_REDIRECT=false DJANGO_SECURE_COOKIES=false
.venv/bin/python backend/manage.py migrate --noinput
.venv/bin/python backend/manage.py collectstatic --noinput
.venv/bin/python backend/manage.py purge_expired_data
exec .venv/bin/python backend/manage.py runserver 127.0.0.1:8002 --noreload
