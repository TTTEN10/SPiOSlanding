FROM node:20-alpine
ARG APP_DOMAIN=localhost
WORKDIR /app
COPY . .
# Do not set VITE_API_URL: client uses `/api` (same origin behind Caddy).
RUN npm install --legacy-peer-deps && npx vite build
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "3000"]
