#!/bin/sh
set -e
cd /app
npx prisma generate --schema=./schema.prisma
npx prisma db push --schema=./schema.prisma --skip-generate
exec node dist/index.js
