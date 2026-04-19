## Done
- ~~Ratelimiting~~
- ~~Passkey~~
- ~~Sentry~~

## Future
- Light/dark mode for widget
- i18n
- Support Audio CAPTCHA
- X (Twitter) OAuth
- Resend email integration
- React SDK npm package 
- onboarding flow
- analytics for site owner

## Tests
- Rewrite e2e `importSampleSet` helper (`e2e/helpers.ts`). It currently clicks the "Import" button from the deprecated SampleSets UI, which no longer exists. Replace with a real upload flow using fixture images, or seed via the image-sets create + upload actions.
- Add e2e tests for the Gallery: publish flow, browse/filter, fork → new image set, hide/delete (once implemented), auth-gated routes.

## Known issues
- Account-deletion TOCTOU on cross-user R2 dedup: `beforeDelete` in `lib/auth/index.ts` reads `stillReferenced` (other users' image rows with overlapping contentHashes) then deletes R2 objects. A concurrent `uploadImages` / `uploadSingleImage` / `forkGalleryItem` by another user in that window can cross-set-dedup onto the URL we're about to delete, ending up with a 404ing URL after we nuke the R2 object. Fixing properly needs a global mutex that account-deletion holds against all dedup-touching actions. Very low practical risk, defer.

