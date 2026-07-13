"use strict";
const COMMISSION_RATE = 0.05;
function promotionIsLive(p, nowMs = Date.now()) {
  if (!p || p.status !== "active") return false;
  const start = Date.parse(p.startsAt || "");
  const end = Date.parse(p.endsAt || "");
  return Number.isFinite(start) && Number.isFinite(end) && start <= nowMs && nowMs <= end;
}
function promotionDiscount(p, subtotal) {
  if (!p || subtotal <= 0 || subtotal < Number(p.minimumSpend || 0)) return 0;
  const raw = p.discountType === "percent" ? Math.round(subtotal * Number(p.discountValue || 0) / 100) : Number(p.discountValue || 0);
  return Math.max(0, Math.min(subtotal, Math.round(raw)));
}
function sellerBreakdown(products) {
  const totals = new Map();
  for (const item of products || []) if (item.sellerId) totals.set(item.sellerId, (totals.get(item.sellerId) || 0) + Number(item.price) * Number(item.quantity));
  return [...totals].map(([sellerId, gross]) => { const commission = Math.round(gross * COMMISSION_RATE); return { sellerId, gross, commission, net: gross - commission }; });
}
function normalisePhone(phone) { return String(phone || "").replace(/[^0-9+]/g, "").slice(0, 20); }
function mapProviderStatus(value) {
  const status = String(value || "").toLowerCase();
  if (["successful","success","paid","completed"].includes(status)) return "paid";
  if (["failed","failure","rejected","cancelled","canceled"].includes(status)) return "failed";
  return "pending";
}
module.exports = { COMMISSION_RATE, promotionIsLive, promotionDiscount, sellerBreakdown, normalisePhone, mapProviderStatus };
