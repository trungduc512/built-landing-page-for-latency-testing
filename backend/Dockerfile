# syntax=docker/dockerfile:1

# No native build step needed — node:sqlite is built into Node.js >= 22.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY . .

# SQLite lives on a mounted volume so data survives restart/redeploy.
VOLUME ["/data"]
ENV DB_PATH=/data/results.db

EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:8787/healthz || exit 1

CMD ["node", "src/server.js"]
