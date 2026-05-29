# syntax=docker/dockerfile:1.7
FROM oven/bun:1.3-debian AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/widget/package.json apps/widget/
COPY apps/dashboard/package.json apps/dashboard/
COPY apps/landing/package.json apps/landing/
COPY packages/shared/package.json packages/shared/
# --linker=hoisted: match local dev (bunfig.toml) so cross-workspace transitive
# deps resolve identically in the image instead of bun's default isolated layout.
RUN bun install --frozen-lockfile --linker=hoisted

FROM base AS builder
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=deps /app/apps/widget/node_modules /app/apps/widget/node_modules
COPY --from=deps /app/packages/shared/node_modules /app/packages/shared/node_modules
COPY package.json bun.lock tsconfig.base.json /app/
COPY apps/api /app/apps/api
COPY apps/widget /app/apps/widget
COPY packages/shared /app/packages/shared

ARG VITE_API_URL
ARG VITE_WIDGET_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WIDGET_URL=${VITE_WIDGET_URL}

WORKDIR /app/apps/widget
RUN bun run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/api /app/apps/api
COPY --from=builder /app/apps/widget /app/apps/widget
COPY --from=builder /app/packages/shared /app/packages/shared
COPY --from=builder /app/package.json /app/bun.lock /app/tsconfig.base.json /app/

WORKDIR /app/apps/widget
USER bun
EXPOSE 3002
CMD ["bun", "run", "src/server/index.ts"]
