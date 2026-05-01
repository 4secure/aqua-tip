FROM node:22-alpine AS build
WORKDIR /app
# cache-bust 2026-05-01 — Railway BuildKit cache poisoned, force layer recompute

# Vite inlines env vars at build time. Railway passes service variables as build-time
# args automatically, but the Dockerfile must declare ARG to receive them and re-export
# them via ENV so `npm run build` can read them via import.meta.env.*.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js .
COPY --from=build /app/package.json .
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
