# JDK Enterprises v30 — Deployment Execution

## Firebase Console prerequisites
1. Enable Authentication > Email/Password.
2. Create the default Cloud Firestore database.
3. Enable Cloud Storage.
4. Register the web app under App Check with the configured reCAPTCHA Enterprise site key.
5. Confirm Cloud Messaging Web Push certificates contain the configured public VAPID key.
6. Upgrade to Blaze before deploying Cloud Functions if the project requires billing for deployment/runtime resources.

## Local deployment
From the project root:

```bash
npm install
npm install --prefix functions
npx firebase-tools login
npx firebase-tools use jdk-ent
npm run launch:check
npm run release:check
npx firebase-tools deploy --only firestore,storage
npx firebase-tools deploy --only functions
npx firebase-tools deploy --only hosting
```

The live Firebase Hosting URLs will use the `jdk-ent` project ID.

## App Check rollout
Do not enforce App Check blindly before traffic verification. Deploy the client, open the hosted site, exercise Auth, Firestore, Storage and callable Functions, then inspect App Check metrics. Enable enforcement service-by-service only after legitimate requests are showing as verified.

## Payment boundary
Do not enable production Mobile Money collection until the provider/gateway secrets and webhook signing secret are configured in the Functions secret/runtime environment and sandbox reconciliation has passed. Never place those values in frontend files.
