# JDK Enterprises v22 — Production Hardening Checklist

## 1. Separate Firebase projects
Use distinct Firebase projects for development and production. Copy `.firebaserc.example` to `.firebaserc` and replace the example project IDs with your real IDs. Never test destructive admin, refund, or payment workflows against production.

## 2. Configure Firebase App Check
Register the production web app in Firebase App Check and configure the reCAPTCHA Enterprise provider. Put the public site key in `firebase-config.js`, test token issuance, then set `JDK_ENVIRONMENT` to `production`.

After the client is verified, configure the Functions runtime environment variable `REQUIRE_APP_CHECK=true` and redeploy Functions. v22 sensitive/high-volume callable paths validate App Check through the shared abuse-control guard.

## 3. Deploy server rules and indexes
Run `firebase deploy --only firestore:rules,firestore:indexes,storage,functions` from the project root after selecting the correct Firebase project.

## 4. Abuse controls
v22 applies transaction-backed rate buckets to order creation, marketplace messages, analytics ingestion, and client error reporting. The `rateLimits` collection is server-owned. Configure a Firestore TTL policy on `rateLimits.expiresAt` so expired buckets are removed automatically.

## 5. Diagnostics
The browser reports bounded error metadata to the `clientErrors` collection through a callable Function. It intentionally does not send stack traces, form values, addresses, messages, payment references, or passwords. Restrict operational access to trusted administrators in the Firebase/Google Cloud console.

## 6. Secrets
The Firebase web config and App Check site key are public client configuration, not server secrets. Payment API keys, Firebase Admin credentials, webhook secrets, and provider tokens must stay in Cloud Functions secrets/environment configuration and must never be committed to this frontend ZIP.

## 7. Pre-payment production gate
Before connecting MTN MoMo or Airtel Money: verify App Check enforcement, create provider sandbox integrations, validate signed webhooks server-side, add idempotency keys, reconcile provider transaction IDs, test refund failure paths, and run an end-to-end staging checkout.

## v25 automated release gate
- Run `npm install --prefix functions`.
- Run `npm run release:check` from the project root.
- Do not deploy if syntax, commerce regression, trusted-function export, or Firestore boundary checks fail.
- Complete the emulator integration scenarios in `RELEASE_ENGINEERING.md` before a production payment release.

## v28 launch readiness gate
Run `npm run launch:check` against the production-ready repository. This command is intentionally expected to fail while required Firebase/App Check placeholders remain or `JDK_ENVIRONMENT` is still `development`. Follow `LAUNCH_READINESS.md` and do not bypass the gate.
