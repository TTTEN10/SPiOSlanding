# syntax=docker/dockerfile:1
# Production image: Express API (landing-only capable) + built Vite SPA.
# Build from monorepo root: docker build -f deployment/landing-app.Dockerfile .

FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/safepsy-mobile/package.json apps/safepsy-mobile/

RUN npm ci -w safepsy-api -w safepsy-web

COPY apps/api apps/api
COPY apps/web apps/web
COPY public public

RUN npm run db:generate \
  && npm run build:web \
  && npm run build -w safepsy-api \
  && npm prune --omit=dev

FROM node:20-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
# Prisma generate writes under apps/api/node_modules/.prisma; @prisma/client resolves from hoisted root.
COPY --from=build /app/apps/api/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/web/package.json ./apps/web/
COPY --from=build /app/apps/safepsy-mobile/package.json ./apps/safepsy-mobile/
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/apps/api/schema.prisma ./apps/api/schema.prisma

COPY deployment/landing/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
