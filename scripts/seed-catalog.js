"use strict";
const admin = require("../functions/node_modules/firebase-admin");
const seed = require("../seed/catalog.json");
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_CONFIG) {
  console.error("Use Firebase/Google Application Default Credentials before seeding. Never place a service-account key in the web app.");
  process.exit(1);
}
admin.initializeApp();
const db = admin.firestore();
(async () => {
  const batch = db.batch();
  seed.forEach(product => {
    if (!product.id || !product.name || !Number.isFinite(product.price)) throw new Error("Invalid catalog seed record");
    const { id, ...data } = product;
    batch.set(db.collection("products").doc(id), { ...data, active:true, approvalStatus:"approved", seededAt:admin.firestore.FieldValue.serverTimestamp() }, { merge:true });
  });
  await batch.commit();
  console.log(`Seeded ${seed.length} launch catalog records.`);
})().catch(error => { console.error(error); process.exit(1); });
