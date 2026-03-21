#!/bin/sh
set -eu

mkdir -p /app/backend/logs

exec "$@"

