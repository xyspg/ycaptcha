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