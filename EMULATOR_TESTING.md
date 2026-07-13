# JDK Enterprises v26 — Emulator Integration Tests

## Purpose
The v26 gate executes Firestore Security Rules against the Firebase Emulator Suite. These are integration tests, not string checks.

## Install
Run `npm install` at the project root and `npm --prefix functions install` once.

## Commands
- `npm run test:rules` — runs rules tests when the Firestore emulator is already running on port 8080.
- `npm run test:emulator` — starts Firestore emulator, executes the rules suite, then shuts the emulator down.
- `npm run ci` — runs syntax/unit/release checks followed by emulator integration tests.

## Executable v26 scenarios
1. Public catalog visibility: approved + active products are readable; pending products are denied.
2. Seller submission boundary: active sellers may submit only their own pending/inactive products.
3. Trusted order boundary: browser order creation is denied; customer order updates are denied; admin status updates are allowed; deletes remain denied.
4. Multi-party order visibility: buyer, participating seller, and admin may read; strangers may not.
5. Notification integrity: the owner may change only `read`; content tampering and stranger reads are denied.

## CI
`.github/workflows/release-check.yml` runs on pushes to `main`, pull requests, and manual dispatch. It installs locked dependencies, runs the v25 release gate, then runs the Firestore emulator suite.

## Next emulator expansion
Cloud Function transaction tests should use a dedicated emulator fixture project and test `createOrder`, duplicate payment webhooks, refund idempotency, and concurrent stock deduction through callable/HTTP endpoints. Provider secrets must remain mocked and isolated from production credentials.

## Validation note
The v26 source and release gate were validated locally. Dependency installation for the Firebase Emulator Suite could not complete inside the build container before its execution timeout, so the emulator suite is shipped as an executable CI/local gate rather than falsely reported as passed in this archive build.
