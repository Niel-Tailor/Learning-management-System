#!/usr/bin/env bash
# Runs on every deploy. Stops at the first error.
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# Demo data, so the live site has courses to show.
python manage.py seed_demo

# Create the admin account from environment variables, if it doesn't exist yet.
python manage.py createsuperuser --no-input || true