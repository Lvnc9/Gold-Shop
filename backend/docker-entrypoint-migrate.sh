#!/bin/sh
# One-shot job run by the `migrate` compose service before the API replicas start.
set -e
python manage.py migrate --noinput
python manage.py collectstatic --noinput -v 0
python manage.py seed_catalog
python manage.py ensure_owner
