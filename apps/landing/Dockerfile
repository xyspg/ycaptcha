# syntax=docker/dockerfile:1.7
FROM oven/bun:1.3-debian AS deps
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/widget/package.json apps/widget/
COPY apps/dashboard/package.json apps/dashboard/
COPY apps/landing/package.json apps/landing/
COPY packages/shared/package.json packages/shared/
# --linker=hoisted: flatten symlinks so Next/Turbopack can resolve next/package.json
# from apps/landing/app without traversing bun's .bun/<hash>/node_modules layout
RUN bun install --frozen-lockfile --linker=hoisted

FROM oven/bun:1.3-debian AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/landing/node_modules /app/apps/landing/node_modules
COPY package.json bun.lock tsconfig.base.json /app/
COPY apps/landing /app/apps/landing

ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_GITHUB_URL
ARG NEXT_PUBLIC_R2_PUBLIC_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_GITHUB_URL=${NEXT_PUBLIC_GITHUB_URL}
ENV NEXT_PUBLIC_R2_PUBLIC_URL=${NEXT_PUBLIC_R2_PUBLIC_URL}

WORKDIR /app/apps/landing
RUN bun run build

FROM oven/bun:1.3-debian AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next standalone copies its required runtime files into .next/standalone
COPY --from=builder /app/apps/landing/.next/standalone ./
COPY --from=builder /app/apps/landing/.next/static ./apps/landing/.next/static
COPY --from=builder /app/apps/landing/public ./apps/landing/public

EXPOSE 3000
CMD ["bun", "run", "apps/landing/server.js"]
