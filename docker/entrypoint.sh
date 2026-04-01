#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy 2>/dev/null || echo "Migrations skipped (may already be applied)"

echo "Starting portal..."
exec node server.js
