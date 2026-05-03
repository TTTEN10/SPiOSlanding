#!/bin/sh
set -e
cd /app/apps/api
if [ "${SKIP_DB_PUSH:-0}" != "1" ]; then
  npx prisma db push --schema=./schema.prisma --skip-generate
fi
exec node /app/apps/api/dist/index.js
