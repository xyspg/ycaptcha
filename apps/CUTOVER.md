# Cutover runbook

Steps to migrate `*.ycaptcha.xyspg.moe` from Vercel monolith to Dokploy
self-hosted services. Each DNS flip is independently rollback-able.

> **Rule:** No `git push` to any remote before 2026-06-01. Cutover proper
> assumes that block has expired.

## T-24h: prep

- [ ] **Lower DNS TTLs.** For each record at the registrar:
  - `ycaptcha.xyspg.moe`
  - `app.ycaptcha.xyspg.moe`
  - `widget.ycaptcha.xyspg.moe`
  - `api.ycaptcha.xyspg.moe`
  - Set TTL to **60s** (or as low as the registrar allows). Wait 24 h before
    flipping anything so caches expire on schedule.
- [ ] **Final delta sync of object storage.** R2 → s3.xyspg.moe was bulk-synced
      earlier; re-run for any new uploads:
  ```bash
  aws s3 sync s3://ycaptcha-r2 s3://ycaptcha \
    --source-region auto --endpoint-url https://<r2>.r2.cloudflarestorage.com \
    --region auto --profile s3xyspg
  ```
- [ ] **Snapshot Neon DB**: take a logical dump as a rollback fallback. Keep
      Neon project active until step 6 below confirms zero traffic.
  ```bash
  pg_dump "$NEON_DATABASE_URL" \
    --no-owner --no-privileges --clean --if-exists \
    --file=/tmp/neon-final-$(date +%Y%m%d).sql
  ```
- [ ] **Add GitHub OAuth callback** (additive, do NOT remove the old one yet):
      `https://api.ycaptcha.xyspg.moe/api/auth/callback/github`. GitHub allows
      multiple. Old callback stays so a step-3 rollback still works.

## T-1h: server prep

- [ ] **Bring up Dokploy services** on `*.staging.ycaptcha.xyspg.moe` (or any
      pre-cutover hostnames). Run the smoke checklist in `DEPLOY.md`.
- [ ] **Restore DB into Dokploy postgres** (final delta from Neon):
  ```bash
  pg_dump "$NEON_DATABASE_URL" --no-owner --no-privileges --clean --if-exists \
    | psql "$DOKPLOY_DATABASE_URL"
  ```
- [ ] Verify a known-good site row produces correct `frame-ancestors` against
      `widget.staging`.

## DNS flip order

Each step waits for full propagation (`dig +short @1.1.1.1` matches new IP from
multiple resolvers) before moving on. Roll back by reverting that single record.

### 1. `widget.ycaptcha.xyspg.moe` → Dokploy

Nobody calls this hostname yet (the monolith serves widget at the apex).
Moving it first lets us verify the widget service is healthy without user
impact.

- [ ] Flip A/AAAA/CNAME to Dokploy.
- [ ] Verify: `curl -I https://widget.ycaptcha.xyspg.moe/captcha.js` → 200,
      < 5 KB.
- [ ] Verify: `curl -I https://widget.ycaptcha.xyspg.moe/widget/<sitekey>` →
      200, `Content-Security-Policy: frame-ancestors …` matches DB row.

### 2. `api.ycaptcha.xyspg.moe` → Dokploy

- [ ] Flip DNS.
- [ ] Verify: `curl https://api.ycaptcha.xyspg.moe/health` → `{"ok":true}`.
- [ ] Smoke `POST /api/v0/captcha/challenge` end-to-end against
      `widget.ycaptcha.xyspg.moe`.
- [ ] Confirm `Set-Cookie` includes `Domain=.ycaptcha.xyspg.moe; Secure;
      SameSite=Lax`.

### 3. `app.ycaptcha.xyspg.moe` → Dokploy

This is the breaking change for end users — they get logged out (cookies on
`.ycaptcha.xyspg.moe` survive, but session storage moved to Dokploy redis).

- [ ] Flip DNS.
- [ ] Test: sign in via password → dashboard renders → create test site →
      embed widget on a third-party origin → solve → siteverify against `api.`
      succeeds.
- [ ] Test: GitHub OAuth round-trip via the new callback.
- [ ] Test: Passkey registration + login (RP ID is now `ycaptcha.xyspg.moe`,
      not `app.ycaptcha.xyspg.moe`; existing passkeys keep working since RP ID
      didn't change between monolith and split deploy — verify on real
      device).

### 4. Update old loader at `ycaptcha.xyspg.moe/captcha.js`

The apex domain still serves Vercel for now. Embedders pinned the old URL
(`https://ycaptcha.xyspg.moe/captcha.js`) — those callers must continue
working until they migrate to `widget.ycaptcha.xyspg.moe/captcha.js`.

- [ ] Add a 301 redirect from `ycaptcha.xyspg.moe/captcha.js` →
      `widget.ycaptcha.xyspg.moe/captcha.js` in the Vercel project (still
      live).
- [ ] Wait **at least 7 days** for embedder caches and any pinned-version
      copies in the wild to update before step 5.

### 5. `ycaptcha.xyspg.moe` → Dokploy (`apps/landing`)

- [ ] Flip DNS to landing service.
- [ ] Verify: `/`, `/docs`, `/legal/privacy-policy`, `/legal/acceptable-use-policy`
      all render. `/captcha.js` redirect (now served by `apps/landing`?) — no,
      `apps/landing` does NOT serve `/captcha.js`. Either:
  - keep a separate Cloudflare/Traefik redirect at the apex, OR
  - add a redirect inside `apps/landing/next.config.ts`:
    ```ts
    async redirects() {
      return [{ source: "/captcha.js", destination:
        "https://widget.ycaptcha.xyspg.moe/captcha.js", permanent: true }];
    }
    ```
- [ ] Verify embed-on-old-origin path: third-party site with
      `<script src="https://ycaptcha.xyspg.moe/captcha.js">` still works
      end-to-end.

### 6. Decommission

- [ ] Wait 7+ days of zero traffic on Vercel. Watch Vercel analytics for the
      old monolith.
- [ ] Remove `proxy.ts`, `app/(auth)`, `app/(main)`, `app/(widget)`, `app/api`,
      and root-level `next.config.ts` from the repo. The apps/* tree is the
      only Next.js project after this.
- [ ] Pause/delete Neon project. Pause Upstash project. Pause Cloudflare R2
      bucket if separate from `s3.xyspg.moe`.
- [ ] Pause Vercel project (do not delete for at least 30 days; keeps the
      env vars + history available for emergency rollback).
- [ ] Remove the old GitHub OAuth callback URL.

## Post-cutover hardening

- [ ] **TTL restore**: bump back to 1 h or longer on all four records.
- [ ] **Backups**: confirm Dokploy postgres backup template is running daily,
      writing to `s3://ycaptcha-backups`.
- [ ] **Sentry**: confirm DSNs are receiving events from each service. Re-add
      `@sentry/nextjs` to `apps/landing` if it was stripped during port (see
      `apps/landing/app/global-error.tsx`).
- [ ] **Uptime checks**: add monitors for `/health` (api), `/captcha.js`
      (widget), `/` (landing), `/login` (dashboard).

## Rollback by step

| Step | Rollback action                                                   |
| ---- | ----------------------------------------------------------------- |
| 1    | Revert widget DNS. Loader callers don't see widget yet.           |
| 2    | Revert api DNS. Cookies on `.ycaptcha.xyspg.moe` re-route to monolith. |
| 3    | Revert app DNS. User logs back into monolith dashboard.           |
| 4    | Remove the captcha.js redirect from Vercel.                       |
| 5    | Revert apex DNS. Landing back on Vercel.                          |
| 6    | Restore from snapshot if needed (Neon DB still paused, not deleted). |

## Known cutover risks

- **Cross-subdomain cookie domain mismatch** — symptom: user logs in but
  every API call returns 401. Check `Set-Cookie: Domain=` matches
  `.ycaptcha.xyspg.moe` exactly (note the leading dot).
- **Passkey RP ID drift** — symptom: existing passkeys reject login with
  "InvalidStateError". RP ID must stay `ycaptcha.xyspg.moe` end-to-end.
- **`captcha.js` cached at edge** — symptom: embedders load stale loader for
  hours after step 5. Already mitigated by 7-day wait at step 4.
- **postMessage origin mismatch** — symptom: widget renders but never
  reports a token to the parent. Loader's origin check now matches
  `widget.ycaptcha.xyspg.moe`, not the apex; see
  `apps/widget/src/loader/loader.js`.
