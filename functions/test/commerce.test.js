"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { promotionIsLive, promotionDiscount, sellerBreakdown, normalisePhone, mapProviderStatus } = require("../lib/commerce");
test("promotion window and state are enforced", () => {
  const p={status:"active",startsAt:"2026-01-01T00:00:00Z",endsAt:"2026-12-31T23:59:59Z"};
  assert.equal(promotionIsLive(p, Date.parse("2026-07-12T12:00:00Z")), true);
  assert.equal(promotionIsLive({...p,status:"paused"}, Date.parse("2026-07-12T12:00:00Z")), false);
});
test("discounts are bounded and minimum spend is respected", () => {
  assert.equal(promotionDiscount({discountType:"percent",discountValue:10,minimumSpend:5000},10000),1000);
  assert.equal(promotionDiscount({discountType:"fixed",discountValue:20000},10000),10000);
  assert.equal(promotionDiscount({discountType:"fixed",discountValue:1000,minimumSpend:5000},4999),0);
});
test("seller breakdown applies 5 percent commission per seller", () => {
  assert.deepEqual(sellerBreakdown([{sellerId:"a",price:10000,quantity:2},{sellerId:"b",price:5000,quantity:1}]),[
    {sellerId:"a",gross:20000,commission:1000,net:19000},{sellerId:"b",gross:5000,commission:250,net:4750}
  ]);
});
test("provider status and phone normalization are stable", () => {
  assert.equal(mapProviderStatus("COMPLETED"),"paid"); assert.equal(mapProviderStatus("rejected"),"failed"); assert.equal(mapProviderStatus("queued"),"pending");
  assert.equal(normalisePhone(" +256 (700) 123-456 "),"+256700123456");
});
