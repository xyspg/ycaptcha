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

## Known issues
- Account-deletion TOCTOU on cross-user R2 dedup: `beforeDelete` in `lib/auth/index.ts` reads `stillReferenced` (other users' image rows + gallery snapshots with overlapping contentHashes) then deletes R2 objects. A concurrent `uploadImages` / `uploadSingleImage` / `forkGalleryItem` by another user in that window can cross-set-dedup onto the URL we're about to delete, ending up with a 404ing URL after we nuke the R2 object. Fixing properly needs a global mutex that account-deletion holds against all dedup-touching actions. Very low practical risk, defer.

