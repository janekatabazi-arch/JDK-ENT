"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const failures = [];
const warnings = [];
const config = fs.readFileSync(path.join(root, "firebase-config.js"), "utf8");
for (const token of ["YOUR_API_KEY","YOUR_PROJECT_ID","YOUR_MESSAGING_SENDER_ID","YOUR_APP_ID"]) {
  if (config.includes(token)) failures.push(`Firebase config still contains placeholder: ${token}`);
}
if (config.includes('window.JDK_ENVIRONMENT = "development"')) failures.push("JDK_ENVIRONMENT is still development");
if (config.includes("YOUR_RECAPTCHA_ENTERPRISE_SITE_KEY")) failures.push("App Check site key is not configured");
if (config.includes("YOUR_WEB_PUSH_VAPID_KEY")) warnings.push("Web Push VAPID key is not configured; browser push will remain disabled");
const sw = fs.readFileSync(path.join(root, "firebase-messaging-sw.js"), "utf8");
if (/YOUR_(API_KEY|PROJECT_ID|MESSAGING_SENDER_ID|APP_ID)/.test(sw)) warnings.push("Messaging service worker still contains Firebase placeholders");
const html = fs.readdirSync(root).filter(f => f.endsWith(".html"));
for (const file of html) {
  const text = fs.readFileSync(path.join(root,file),"utf8");
  if (!/<meta\s+name=["']viewport["']/i.test(text)) failures.push(`${file}: missing viewport metadata`);
  if (!/<meta\s+name=["']theme-color["']/i.test(text)) warnings.push(`${file}: missing theme-color metadata`);
}
if (warnings.length) console.warn("LAUNCH WARNINGS\n" + warnings.join("\n"));
if (failures.length) { console.error("LAUNCH CONFIG CHECK FAILED\n" + failures.join("\n")); process.exit(1); }
console.log("Launch configuration gate passed.");
