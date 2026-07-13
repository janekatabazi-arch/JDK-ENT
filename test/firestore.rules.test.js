"use strict";
const { before, beforeEach, after, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, deleteDoc } = require("firebase/firestore");

const projectId = "jdk-enterprises-emulator";
let env;
const rules = fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8");

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { host: "127.0.0.1", port: 8080, rules },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, "sellers/seller-1"), { ownerId: "seller-1", status: "active", shopName: "Seller One" });
    await setDoc(doc(db, "products/live"), { sellerId: "seller-1", shopName: "Seller One", type: "product", name: "Live", price: 1000, stock: 5, active: true, approvalStatus: "approved" });
    await setDoc(doc(db, "products/private"), { sellerId: "seller-1", shopName: "Seller One", type: "product", name: "Pending", price: 1000, stock: 5, active: false, approvalStatus: "pending" });
    await setDoc(doc(db, "orders/order-1"), { userId: "buyer-1", sellerIds: ["seller-1"], status: "Placed" });
    await setDoc(doc(db, "notifications/n1"), { userId: "buyer-1", read: false, title: "Order" });
  });
});

after(async () => { if (env) await env.cleanup(); });

test("public can read approved active products but not pending products", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db, "products/live")));
  await assertFails(getDoc(doc(db, "products/private")));
});

test("active seller can submit only a pending inactive product owned by self", async () => {
  const db = env.authenticatedContext("seller-1").firestore();
  await assertSucceeds(setDoc(doc(db, "products/new-product"), {
    sellerId: "seller-1", shopName: "Seller One", type: "product", name: "Phone", price: 950000, stock: 2, active: false, approvalStatus: "pending"
  }));
  await assertFails(setDoc(doc(db, "products/self-approved"), {
    sellerId: "seller-1", shopName: "Seller One", type: "product", name: "Phone", price: 950000, stock: 2, active: true, approvalStatus: "approved"
  }));
});

test("browser clients cannot create, update, or delete orders", async () => {
  const buyer = env.authenticatedContext("buyer-1").firestore();
  const admin = env.authenticatedContext("admin-1", { admin: true }).firestore();
  await assertFails(setDoc(doc(buyer, "orders/new-order"), { userId: "buyer-1", sellerIds: [] }));
  await assertFails(updateDoc(doc(buyer, "orders/order-1"), { status: "Cancelled" }));
  await assertSucceeds(updateDoc(doc(admin, "orders/order-1"), { status: "Processing" }));
  await assertFails(deleteDoc(doc(admin, "orders/order-1")));
});

test("order visibility is restricted to buyer, participating seller, and admin", async () => {
  await assertSucceeds(getDoc(doc(env.authenticatedContext("buyer-1").firestore(), "orders/order-1")));
  await assertSucceeds(getDoc(doc(env.authenticatedContext("seller-1").firestore(), "orders/order-1")));
  await assertSucceeds(getDoc(doc(env.authenticatedContext("admin-1", { admin: true }).firestore(), "orders/order-1")));
  await assertFails(getDoc(doc(env.authenticatedContext("stranger").firestore(), "orders/order-1")));
});

test("notification owner may change only read state", async () => {
  const owner = env.authenticatedContext("buyer-1").firestore();
  const stranger = env.authenticatedContext("stranger").firestore();
  await assertSucceeds(updateDoc(doc(owner, "notifications/n1"), { read: true }));
  await assertFails(updateDoc(doc(owner, "notifications/n1"), { title: "Tampered" }));
  await assertFails(getDoc(doc(stranger, "notifications/n1")));
});
