## Done
- ~~Ratelimiting~~
- ~~Passkey~~
- ~~Sentry~~
- i18n
- Support Audio CAPTCHA

## Future
- Light/dark mode for widget
- X (Twitter) OAuth
- Resend email integration
- React SDK npm package 
- onboarding flow
- analytics for site owner

## Tests
- Add e2e tests for the Gallery: publish flow, browse/filter, fork → new image set, hide/delete (once implemented), auth-gated routes.

## Known issues
- Account-deletion TOCTOU on cross-user R2 dedup: `beforeDelete` in `lib/auth/index.ts` reads `stillReferenced` (other users' image rows + gallery snapshots with overlapping contentHashes) then deletes R2 objects. A concurrent `uploadImages` / `uploadSingleImage` / `forkGalleryItem` by another user in that window can cross-set-dedup onto the URL we're about to delete, ending up with a 404ing URL after we nuke the R2 object. Fixing properly needs a global mutex that account-deletion holds against all dedup-touching actions. Very low practical risk, defer.
- Legacy `gallery/{itemId}/{hash}.webp` R2 objects from the old publish-with-copy flow are orphans after the refactor — the DB URLs still resolve (URL is opaque) but no refcount tracks them, so removing those gallery items leaves R2 bytes behind. One-shot cleanup script in prod if the storage bill ever matters.

