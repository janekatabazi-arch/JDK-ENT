# JDK Enterprises v31 — Firebase Spark launch

This build is intentionally redesigned for the Firebase Spark plan.

## Active Firebase services
- Firebase Authentication (Email/Password)
- Cloud Firestore
- Firebase Hosting

## Removed from deployment
- Cloud Storage
- Cloud Functions
- server payment adapters/webhooks
- server analytics
- FCM push delivery
- automated finance/refund/dispute workflows

## Product images
Seller Center accepts a public HTTPS image URL. Do not choose a local image file in Spark mode. Use a legitimate image host/CDN whose terms allow product images.

## Payments
Mobile Money orders are created with `paymentStatus: pending` and `paymentMode: manual_confirmation`. JDK staff must verify payment manually and an admin can mark the order paid. Never mark an order paid from a customer screenshot alone; verify against the receiving account/provider record.

## Stock limitation
The Spark build validates stock before order creation but does not atomically reserve/decrement stock. This is a deliberate free-tier limitation. Admin/sellers must monitor inventory. Upgrade to the trusted Cloud Functions transaction engine before high order volume.

## First admin
1. Create/sign in to the JDK account that will be admin.
2. In Firebase Console > Authentication > Users, copy that user's UID.
3. In Firestore create collection `admins`.
4. Create a document whose document ID is exactly the UID.
5. Add boolean field `active` = `true`.

Clients cannot create admin documents because Firestore Rules deny all writes to `/admins`.

## Deploy
Enable Email/Password Authentication and create Firestore Database first.

Then from this project folder:

    npm install
    npx firebase-tools login
    npx firebase-tools use jdk-ent
    npx firebase-tools deploy --only firestore:rules,firestore:indexes,hosting

No billing upgrade is required for this deployment path, subject to Firebase Spark quotas and Firebase's current plan terms.
