# JDK Enterprises v25 — Regression Testing & Release Engineering

## Required release gate
Run `npm run release:check` from the project root before deployment. The gate performs JavaScript syntax validation, trusted-function export checks, Firestore boundary checks, and commerce unit tests.

## Automated commerce regression coverage
The Node test suite covers promotion activation windows, minimum-spend and bounded discount calculations, the 5% seller commission split, payment-provider status normalization, and Uganda phone-input normalization.

## Firebase emulator integration gate
Before production, install Firebase CLI and Functions dependencies, then run the application against the Firebase Emulator Suite for Auth, Firestore and Functions. Exercise: concurrent checkout against low stock; unauthorized order writes; seller access to another seller's fulfilment; duplicate payment webhook delivery; duplicate refund attempts; message participant authorization; and review creation without a delivered purchase.

These scenarios need emulator-backed integration tests because they depend on Firestore transactions, callable authentication context, security rules, and trigger behavior. Pure unit tests must not pretend to prove those boundaries.

## Release sequence
1. `npm install --prefix functions`
2. `npm run release:check`
3. Run emulator integration scenarios.
4. Deploy rules and indexes to staging.
5. Deploy Functions to staging.
6. Smoke-test checkout, payment sandbox, fulfilment, refund and messaging.
7. Tag the release only after staging passes.
8. Deploy production using the production Firebase project alias and secrets.

Never use production payment secrets in local tests or staging fixtures.

## v26 executable emulator gate
The documented Firestore permission scenarios are now executable in `test/firestore.rules.test.js`. Run `npm run test:emulator`. CI executes the same suite through GitHub Actions. See `EMULATOR_TESTING.md`.
