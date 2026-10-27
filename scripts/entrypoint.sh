#!/bin/sh
set -eu
python backend/manage.py migrate --noinput
python backend/manage.py createcachetable
python backend/manage.py purge_expired_data
exec gunicorn config.wsgi:application --chdir backend --bind 0.0.0.0:8000 --workers 1 --threads 2 --timeout 30 --error-logfile - --access-logfile /dev/null
