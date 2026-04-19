# Production image for landing + waitlist API (Express + Prisma + PostgreSQL).
FROM node:20-bookworm-slim AS build

RUN apt-get update && apt-get install -y openssl ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install

COPY . .
RUN npx prisma generate --schema=./schema.prisma && npm run build

FROM node:20-bookworm-slim AS runtime

# python3 + build toolchain: some transitive deps (e.g. utf-8-validate via web3) run node-gyp on npm install.
RUN apt-get update && apt-get install -y openssl ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY schema.prisma ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
