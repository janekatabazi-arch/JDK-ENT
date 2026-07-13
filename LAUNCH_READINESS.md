# JDK Enterprises v28 — Launch Readiness

v28 freezes broad feature expansion and converts the repository into a launch-controlled release candidate.

## Changes in this phase
- Added `npm run launch:check`, a strict production configuration gate. It fails while required Firebase/App Check placeholders remain or the client environment is still set to development.
- Added a controlled Firestore launch-catalog seed at `seed/catalog.json` and `npm run seed:catalog`. It uses Firebase Admin through Application Default Credentials; no service-account credential belongs in this repository.
- Normalized customer-facing page titles to `JDK Enterprises` and added baseline search/share description metadata.
- Removed the dead legacy `success.html`; checkout uses `order-success.html`.
- Kept the six product fallback records for offline/development rendering. The three worker records remain service discovery data and are not seeded as purchasable Firestore products.
- Updated the release version to 28.0.0.

## Production sequence
1. Create/select the production Firebase project and replace every required placeholder in `firebase-config.js` and `firebase-messaging-sw.js`.
2. Configure reCAPTCHA Enterprise App Check, verify token issuance, then set `JDK_ENVIRONMENT` to `production`.
3. Install dependencies: `npm install` and `npm install --prefix functions`.
4. Run `npm run release:check` and `npm run test:emulator`.
5. Run `npm run launch:check`. A failure is a deployment blocker.
6. Deploy rules, indexes, Storage rules, and Functions.
7. Seed only reviewed launch products using trusted credentials: `npm run seed:catalog`.
8. Assign the first admin custom claim from a trusted Admin SDK environment.
9. Complete a staging purchase: sign up → product → cart → delivery/pickup → order → payment sandbox → fulfilment → delivery → review.
10. Test on a real Android device and only then enable production payment-provider credentials/webhooks.

## Go-live blockers
Do not launch with Firebase placeholders, development environment mode, unverified App Check, failing emulator tests, untested provider webhooks, or invented pickup/courier configuration. Replace launch sample catalog content with JDK's real products, seller ownership, stock, images, and descriptions before accepting customer orders.
