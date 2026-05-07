# Deployment

Self-hosted on the Canada server (Xeon E5-1630 v4 / 64 GB) via Dokploy. Each
app is a separate Dokploy service pointing at its `Dockerfile` in this repo.

## Services

| Service       | Dockerfile                  | Port | Domain                                |
| ------------- | --------------------------- | ---- | ------------------------------------- |
| `api`         | `apps/api/Dockerfile`       | 3001 | `api.ycaptcha.xyspg.moe`              |
| `widget`      | `apps/widget/Dockerfile`    | 3002 | `widget.ycaptcha.xyspg.moe`           |
| `dashboard`   | `apps/dashboard/Dockerfile` | 80   | `app.ycaptcha.xyspg.moe`              |
| `landing`     | `apps/landing/Dockerfile`   | 3000 | `ycaptcha.xyspg.moe`                  |
| `postgres`    | Dokploy template            | 5432 | (internal)                            |
| `redis`       | Dokploy template            | 6379 | (internal)                            |

Each Dockerfile uses the **monorepo root as the build context** (`.`). Set the
context to the repo root in Dokploy and point at the per-app Dockerfile path.

## Build args (Vite/Next inline at build time)

Some env vars are inlined into client bundles at build time and need to be
passed as Dockerfile `ARG`s:

- `apps/widget` — `VITE_API_URL`, `VITE_WIDGET_URL`
- `apps/dashboard` — `VITE_API_URL`
- `apps/landing` — `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`,
  `NEXT_PUBLIC_GITHUB_URL`, `NEXT_PUBLIC_R2_PUBLIC_URL`

Set these in Dokploy under each service's Build Arguments.

## Runtime env

Set in Dokploy per service. Source of truth is the per-app `.env.example`.

### `api`

- `DATABASE_URL=postgres://ycaptcha:…@postgres:5432/ycaptcha`
- `REDIS_URL=redis://redis:6379`
- `BETTER_AUTH_SECRET` — generate with `openssl rand -hex 32`
- `BETTER_AUTH_URL=https://api.ycaptcha.xyspg.moe`
- `WEB_APP_URL=https://app.ycaptcha.xyspg.moe`
- `AUTH_COOKIE_DOMAIN=.ycaptcha.xyspg.moe`
- `AUTH_TRUSTED_ORIGINS=https://ycaptcha.xyspg.moe,https://app.ycaptcha.xyspg.moe,https://widget.ycaptcha.xyspg.moe`
- `PASSKEY_RP_ID=ycaptcha.xyspg.moe`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — update OAuth callback to
  `https://api.ycaptcha.xyspg.moe/api/auth/callback/github`
- `S3_ENDPOINT=https://s3.xyspg.moe`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL=https://r2.ycaptcha.xyspg.moe`
- `RESEND_API_KEY`, `EMAIL_FROM=noreply@ycaptcha.xyspg.moe`
- `SENTRY_DSN` — from existing project

### `widget`

- `DATABASE_URL=postgres://ycaptcha:…@postgres:5432/ycaptcha`
- `WIDGET_URL=https://widget.ycaptcha.xyspg.moe`
- `PORT=3002`

### `dashboard`

No runtime env — fully static. Build args inline via Vite.

### `landing`

No runtime env — fully static + Next standalone server reads only build-time
`NEXT_PUBLIC_*`.

## Data restore (staging → prod or initial seed)

```bash
# Postgres: dump from Neon, restore into Dokploy postgres
pg_dump "$NEON_DATABASE_URL" \
  --no-owner --no-privileges --clean --if-exists \
  | psql "$DOKPLOY_DATABASE_URL"

# Object storage: sync R2 → s3.xyspg.moe (already done; bucket already migrated)
aws s3 sync s3://ycaptcha-r2 s3://ycaptcha \
  --source-region auto --endpoint-url https://… \
  --region auto --profile s3xyspg
```

## Smoke checklist after first boot

- `curl https://api.ycaptcha.xyspg.moe/api/health` returns `{"ok":true}`
- `curl -I https://widget.ycaptcha.xyspg.moe/captcha.js` returns 200, < 5 KB
- `curl -I https://widget.ycaptcha.xyspg.moe/widget/<existing_sitekey>` returns
  `Content-Security-Policy: frame-ancestors …` matching DB row
- `https://app.ycaptcha.xyspg.moe/login` renders, sign in works
- `https://ycaptcha.xyspg.moe` renders, docs `/docs` accessible
- Embed loader on a third-party origin → solve → siteverify against `api.`
  succeeds
