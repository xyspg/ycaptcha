# syntax=docker/dockerfile:1.7
FROM oven/bun:1.3-debian AS deps
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/widget/package.json apps/widget/
COPY apps/dashboard/package.json apps/dashboard/
COPY apps/landing/package.json apps/landing/
COPY packages/shared/package.json packages/shared/
# --linker=hoisted: match local dev (bunfig.toml) so cross-workspace transitive
# deps resolve identically in the image instead of bun's default isolated layout.
RUN bun install --frozen-lockfile --linker=hoisted

FROM oven/bun:1.3-debian AS builder
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=deps /app/apps/dashboard/node_modules /app/apps/dashboard/node_modules
COPY --from=deps /app/packages/shared/node_modules /app/packages/shared/node_modules
COPY package.json bun.lock tsconfig.base.json /app/
COPY apps/api /app/apps/api
COPY apps/dashboard /app/apps/dashboard
COPY packages/shared /app/packages/shared

ARG VITE_API_URL
ARG VITE_LANDING_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_LANDING_URL=${VITE_LANDING_URL}

WORKDIR /app/apps/dashboard
RUN bun run build

FROM nginx:alpine AS runtime
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/dashboard/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
