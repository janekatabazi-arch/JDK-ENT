# JDK Enterprises — Firebase setup

The project now uses Firebase Authentication and Cloud Firestore. Shopping/cart data remains local-first so the storefront still loads before Firebase is configured.

## 1. Create the Firebase project
Open the Firebase console, create a project, then add a Web App.

## 2. Configure the web app
Copy the Firebase web configuration into `firebase-config.js`. Replace every `YOUR_...` placeholder.

## 3. Enable authentication
In Firebase Console: Authentication > Sign-in method > Email/Password > Enable.

## 4. Create Firestore
Create a Cloud Firestore database. Use the region appropriate for the business deployment.

## 5. Deploy security rules
Copy `firestore.rules` into Firestore Rules and publish it. The included rules only let signed-in users access their own profile and orders.

## 6. Test through a web server
Do not open the HTML files with `file://`. Run a local web server or deploy the site to Firebase Hosting.

Example with Python:
`python -m http.server 5500`

Then open `http://localhost:5500`.

## Current Firebase-backed flows
- Customer registration with email/password, name and phone
- Customer sign-in/sign-out
- User profile document in `users/{uid}`
- Signed-in order creation in `orders/{orderId}`
- Signed-in order retrieval
- Local-first cart and customer delivery details

## Architecture note
`store.js` is now the single `window.JDKStore` definition. `data.js` only registers marketplace data and message helpers. This removes the previous global store overwrite/load-order bug.

## Firestore catalog (v4)

The storefront now uses the local records in `data.js` as an offline/default catalog and automatically replaces them with Firestore records when the `products` collection contains active products.

Create a `products` collection. Each document ID should be a stable product ID such as `phone-001`.

Recommended fields:
- `name` (string)
- `price` (number, for products)
- `image` (string URL or local filename)
- `category` (string: electronics, groceries, furniture, workers, building)
- `type` (string: product or worker)
- `description` (string)
- `active` (boolean, must be true to appear)
- `service` and `phone` (worker records only)

Deploy `firestore.rules`. Public visitors can read only active products. Browser clients cannot write product documents. Add and edit catalog documents through the Firebase Console for now.


## Seller Center (v6)

The project now includes `seller.html` and `seller.js`. A signed-in customer can activate a seller profile in `sellers/{uid}` and submit products. Seller submissions are written to `products` with `active: false` and `approvalStatus: pending`.

### Approval workflow
1. Seller submits a product in Seller Center.
2. In Firebase Console, review the `products` document.
3. To publish it, set `approvalStatus` to `approved` and `active` to `true`.
4. To reject it, set `approvalStatus` to `rejected` and leave `active` as `false`.

Only an admin can update or delete product documents under the included rules. Admin access uses the Firebase Auth custom claim `admin: true`; custom claims must be assigned from a trusted Admin SDK/server environment, never from browser JavaScript.

### Product images in v6
Seller publishing uses a public HTTPS image URL. This is deliberate: it keeps the current build independent of Firebase Storage billing/configuration while the seller and approval workflow is stabilized. Do not paste local filenames into Seller Center.

### Firestore query requirement
The public catalog queries `active == true` and `approvalStatus == approved`. Firestore may ask you to create a composite index; use the index creation link shown in the Firebase error console if prompted.


## Admin Control Center (v7)

The project now includes `admin.html` and `admin.js`. Access is restricted in both the UI and Firestore by the Firebase Auth custom claim `admin: true`.

The dashboard loads marketplace totals, the pending product queue, and seller profiles. An administrator can approve or reject a pending listing. Approval sets `approvalStatus` to `approved` and `active` to `true`; rejection sets `approvalStatus` to `rejected` and `active` to `false`. Review metadata is stored in `reviewedBy` and `reviewedAt`.

### Assign the first administrator
Use the Firebase Admin SDK from a trusted server or one-time local admin script and set the custom claim `{ admin: true }` on the selected Firebase Auth UID. Never place Admin SDK service-account credentials in this web project. After the claim is assigned, sign out and sign in again so Firebase issues a refreshed ID token.

The Account page reveals the Admin Control Center link only when the signed-in token contains the admin claim. Firestore rules remain the authoritative security boundary.


## JDK Enterprises v8 operations

- Seller product edits automatically reset `active` to `false` and `approvalStatus` to `pending`, forcing admin review again.
- Checkout stores `sellerIds` on each order so Firestore can securely expose relevant orders to each seller.
- Order lifecycle values are: `placed`, `confirmed`, `processing`, `shipped`, `delivered`, and `cancelled`.
- Only administrators can change order status. Customers see their order status and sellers see only orders containing their own product items.
- Deploy the updated `firestore.rules` before testing seller order visibility or product editing.


## JDK v9 — Storage, stock and variants

1. Enable Firebase Storage for the project.
2. Deploy `storage.rules` with the Firebase CLI: `firebase deploy --only storage`.
3. Deploy the updated `firestore.rules`.
4. Seller product images accept JPG, PNG and WebP files up to 5 MB and are stored under `product-images/{sellerUid}/`.
5. Product documents now include `stock` (non-negative integer), `imagePath`, and `variants: { sizes: [], colors: [] }`.
6. The browser validates live Firestore stock again before saving an authenticated order. This prevents stale-cart purchases in normal use. For strict high-concurrency stock reservation, move final order creation and stock decrement into a trusted Cloud Function/transaction before production scale.


## JDK v10 — trusted order engine and commission foundation

1. Install the Firebase CLI and sign in.
2. From this project folder run `cd functions && npm install && cd ..`.
3. Deploy with `firebase deploy --only functions,firestore:rules,storage`.
4. Checkout now calls the `createOrder` callable Cloud Function. The server reloads every product, trusts Firestore prices only, and atomically decrements stock in a Firestore transaction.
5. Direct browser order creation is denied by `firestore.rules`.
6. Customer cancellation is allowed only while an order is `placed` or `confirmed`; the callable transaction restores stock.
7. Admin order status changes now pass through `updateOrderStatus` and verify the `admin: true` custom claim server-side.
8. Orders snapshot `commissionRate`, `platformCommission`, and `sellerProceeds`. The current foundation rate is 5%. This is accounting metadata only; seller payouts are not automated yet.
9. Payment state is explicit: cash orders start `pending`; mobile-money orders start `awaiting_payment`. No payment provider secret is stored in the browser. Integrate a provider using server-side Functions/webhooks before marking mobile-money orders paid.

Cloud Functions deployment generally requires a Firebase project on the Blaze plan. Review billing before deployment.

## v11 payment and finance architecture

JDK v11 normalizes checkout payment values to `cash` and `mobile-money` and supports network selection for `mtn` and `airtel`.

Mobile Money is intentionally **not charged from browser code**. `createOrder` creates a server-owned `paymentIntents/{orderId}` record with `awaiting_provider`. Before accepting live Mobile Money payments, connect a licensed payment provider or aggregator in Cloud Functions and verify its signed callback on the server. Never place collection API secrets, subscription keys, client secrets, or webhook secrets in `firebase-config.js` or frontend JavaScript.

The `settlePayment` callable is an admin-only operational bridge for verified/manual reconciliation. When an order becomes paid, the Cloud Function posts idempotent entries to:

- `sellerLedger/{orderId}_{sellerId}` — seller gross, 5% JDK commission, and seller net earnings.
- `financeLedger/commission_{orderId}` — JDK commission accounting.

Cash-on-delivery orders are automatically settled when an admin moves them to `delivered`. Paid orders cannot use the customer self-cancellation flow because refunds need a separate trusted workflow.

Deploy v11 with:

```bash
firebase deploy --only functions,firestore:rules,storage
```

### Live Mobile Money integration seam

Implement provider initiation and signed webhook verification in `functions/index.js` only after choosing the payment provider and obtaining its merchant credentials. The current `paymentIntents` collection is the integration boundary. Do not mark an order paid merely because the customer reports a transaction ID; verify payment with the provider server-to-server first.


## v12 product discovery

`discovery.js` provides ranked client-side search over the approved catalog, local wishlist persistence, recently viewed products, and category/seller-weighted recommendations. Firestore is still the source of truth for the public catalog. Firestore does not provide native full-text search, so this version does not pretend that the database query itself is full-text search. For a very large catalog, connect Algolia, Typesense, or another dedicated search service from a trusted indexing pipeline.

Deploy `firestore.indexes.json` with `firebase deploy --only firestore:indexes` when using the ordered approved-catalog query.


## v13 verified reviews and reputation

Reviews are created only through the `createReview` callable Cloud Function. The function verifies that the signed-in customer has a delivered order containing the product, enforces one review per customer/product, and updates `ratingTotal`, `ratingCount`, and `averageRating` in a Firestore transaction. Admins can hide/restore reviews through `moderateReview`; rating aggregates are adjusted transactionally. Sellers cannot write or moderate reviews. Deploy Functions and Firestore rules after upgrading.


## v14 seller fulfilment and delivery

JDK v14 adds server-authoritative per-seller fulfilment inside each order under `sellerFulfilments.{sellerId}`. Sellers can only advance their own order line workflow through `awaiting_acceptance -> accepted -> processing -> ready_for_dispatch -> dispatched` by calling `updateSellerFulfilment`. Dispatch requires a carrier/rider name and tracking or dispatch reference.

The customer order page renders `statusHistory` as an order timeline and displays available dispatch references. Admin delivery confirmation uses the `recordDeliveryEvidence` callable Function, records a delivery reference/note, marks the order delivered, and settles COD payment through the existing trusted ledger transaction. Deploy Functions and Firestore rules after upgrading.

## v15 — Notifications and Firebase Cloud Messaging

JDK v15 adds a Firestore `notifications` inbox and optional Firebase Cloud Messaging (FCM) web push. Cloud Functions create notifications for new orders, order/payment/fulfilment changes, product approval decisions and verified reviews. The notification inbox works even when push is disabled.

1. Deploy the updated Firestore rules and Functions.
2. In Firebase Console > Project settings > Cloud Messaging, create/use a Web Push certificate and paste the public VAPID key into `firebase-config.js` as `JDK_FIREBASE_VAPID_KEY`.
3. Copy the same public Firebase web configuration from `firebase-config.js` into `firebase-messaging-sw.js`. Firebase web config is public client configuration; never place Admin SDK service-account credentials in either file.
4. Serve the site over HTTPS (or localhost for development). Open `notifications.html`, sign in and choose **Enable push**.

The Functions Admin SDK sends push only to registered tokens and removes invalid/unregistered tokens. Firestore rules allow customers to read only their own notifications and change only the `read` field. Notification creation remains server-only.


## v16 — Secure marketplace messaging

JDK v16 replaces the old localStorage/demo auto-reply chat with Firestore real-time conversations. Deploy the updated Cloud Functions and Firestore rules. Conversation and message writes are server-only through callable Functions; Firestore clients can only read conversations they participate in.

Collections: `conversations/{conversationId}` and `conversations/{conversationId}/messages/{messageId}`. Buyer/seller chats can be product-linked or order-linked. Unread counts are maintained server-side. Participants can escalate a conversation to JDK Support.

The admin escalation notification lookup expects admin user profile documents to contain `admin: true` in addition to the Firebase Auth custom claim. The custom claim remains the actual authorization boundary.

## v17 — Trust operations and refunds

Deploy the updated Functions and Firestore rules. v17 adds `supportCases/{caseId}` with server-only writes and participant/admin reads, plus an `evidence` subcollection. Disputes are tied to real orders and only order participants can open them. Admin case decisions are handled by `resolveSupportCase`.

Refunds are recorded by the trusted `issueOrderRefund` callable. It requires an existing support case and a paid order, marks the order payment state as `refunded`, records the provider/reference value, posts negative seller-ledger entries, and reverses JDK commission in `financeLedger`. The function records accounting state; the actual provider-side transfer must still be executed or verified through the connected payment provider before an administrator records the refund reference.


## v18 Marketplace analytics

Deploy Functions after upgrading. v18 adds server-written `analyticsEvents` plus callable admin/seller analytics summaries. The browser cannot read or write raw analytics documents directly. Events are first-party marketplace interactions only; do not place passwords, payment references, message text, addresses, or other sensitive customer data in analytics payloads. Admins can open `analytics.html` for product views, add-to-cart rate, paid volume, top products and search demand. The current summary scans a bounded event window; move to scheduled aggregate documents or BigQuery before very large traffic volumes.


## v19 promotions and trusted pricing

Deploy the updated Cloud Functions and Firestore rules. The `promotions` collection is server-managed. Admins create scheduled automatic or coupon campaigns in Admin Control Center. `createOrder` reads authoritative product prices, evaluates live campaign dates and minimum spend, enforces coupon redemption limits transactionally, stores `subtotal`, `discount`, `promotion`, and `total`, and uses the discounted total for payment intents and JDK commission calculations. Browser-calculated discounts are never trusted.

Current stacking policy: the order engine evaluates eligible automatic and coupon promotions and applies the single highest discount. This deliberately prevents accidental discount stacking.

## v20 — Storefront campaign presentation

The storefront reads only active promotion documents. `deals.js` presents automatic campaign pricing as a preview, campaign countdowns, sale badges, coupon discovery and a personalized campaign order based on recently viewed sellers. The trusted Cloud Function remains authoritative: browser deal prices are display-only and `createOrder` recalculates the winning eligible promotion transactionally.

Deploy the v20 Firestore rules so public storefront clients can read active promotion documents. Paused and ended promotions remain admin-only.


## v21 — Uganda delivery logistics and address book

JDK v21 adds a trusted checkout logistics layer. The callable `getDeliveryOptions` exposes the current Uganda delivery zones and pickup points. `createOrder` validates the selected zone/pickup server-side and adds the authoritative `deliveryFee` to the order total and payment intent. Delivery fees are excluded from the 5% marketplace commission calculation.

Current launch defaults are Kampala Central (UGX 5,000), Greater Kampala & Wakiso (UGX 8,000), Entebbe (UGX 10,000), and other Uganda districts (UGX 15,000). The initial pickup point is JDK Kampala CBD at UGX 0. These are launch configuration defaults in the trusted Functions layer; update them before production if JDK's actual courier rates or pickup address differ.

Signed-in customers can save addresses under `users/{uid}/addresses/{addressId}`. Firestore rules restrict the address book to its owner. Checkout supports saved-address selection, delivery estimates, pickup selection, and server-authoritative fee calculation. Deploy Functions and Firestore rules after upgrading.

## v22 — production deployment hardening

v22 adds Firebase App Check client initialization, environment separation guidance, callable abuse-rate controls, and privacy-bounded client diagnostics. Read `DEPLOYMENT_CHECKLIST.md` before enabling production payment providers.

Important: keep `REQUIRE_APP_CHECK` disabled until valid App Check tokens are confirmed from the production web app. Then enable it in the Functions runtime environment and redeploy. Configure Firestore TTL on `rateLimits.expiresAt`.

## v23 — Payment provider integration boundary

v23 introduces a server-only Mobile Money provider boundary. The browser creates an order, then calls `initiateMobileMoneyPayment`. Firebase Functions owns provider credentials, provider references, webhook verification, idempotency and settlement.

### Functions configuration

Set `PAYMENT_MODE=sandbox` while developing. Production requires `PAYMENT_MODE=production`, `PAYMENT_BASE_URL`, and `PAYMENT_CALLBACK_BASE_URL` as Functions parameters. Store `MTN_API_KEY`, `AIRTEL_API_KEY`, `MTN_WEBHOOK_SECRET`, and `AIRTEL_WEBHOOK_SECRET` with Firebase Functions secrets. Never place these values in `firebase-config.js`.

The outbound adapter contract is `POST {PAYMENT_BASE_URL}/{provider}/collections` with an Authorization bearer token and `idempotency-key`. The configured payment gateway must translate that normalized JDK request into the exact licensed MTN MoMo or Airtel Money API contract. This keeps provider-specific API changes outside checkout and order accounting.

### Webhook contract

Configure the gateway callback to the deployed `paymentWebhook?provider=mtn` or `paymentWebhook?provider=airtel` endpoint. The gateway must send an HMAC-SHA256 signature in `x-jdk-signature` (or `x-signature`) using the matching webhook secret. The JSON body must include a unique `eventId`, provider `reference`/`transactionId`, and payment `status`.

Webhook events are deduplicated in `paymentWebhookEvents/{provider_eventId}`. Successful verified events settle the order and post seller/JDK ledgers transactionally. Replayed events do not settle twice.

### Sandbox

Sandbox mode creates a provider reference but does not pretend money was collected. Use signed webhook test events to exercise the verified settlement path. Do not enable production payment messaging until the gateway/provider contract and callback signatures have been tested end-to-end.
