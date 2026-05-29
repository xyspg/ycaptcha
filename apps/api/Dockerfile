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

FROM oven/bun:1.3-debian AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules /app/packages/shared/node_modules
COPY package.json bun.lock tsconfig.base.json /app/
COPY apps/api /app/apps/api
COPY packages/shared /app/packages/shared

WORKDIR /app/apps/api
USER bun
EXPOSE 3001
CMD ["bun", "run", "src/index.ts"]
