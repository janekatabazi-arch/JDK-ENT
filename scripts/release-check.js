"use strict";
const fs=require("node:fs"), path=require("node:path"), cp=require("node:child_process");
const root=path.resolve(__dirname,"..");
const failures=[];
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.name==="node_modules"?[]:e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);}
for(const file of walk(root).filter(f=>f.endsWith(".js"))){const r=cp.spawnSync(process.execPath,["--check",file],{encoding:"utf8"}); if(r.status) failures.push(`${path.relative(root,file)}: ${r.stderr.trim()}`);}
const index=fs.readFileSync(path.join(root,"functions/index.js"),"utf8");
for(const required of ["createOrder","cancelOrder","issueOrderRefund","sendConversationMessage","paymentWebhook"]){if(!index.includes(`exports.${required} =`)) failures.push(`Missing trusted function export: ${required}`);}
const rules=fs.readFileSync(path.join(root,"firestore.rules"),"utf8");
if(!rules.includes("match /orders/{orderId}")) failures.push("Order rules missing");
if(!rules.includes("allow create: if false")) failures.push("Expected server-owned create boundary not found");
if(failures.length){console.error("RELEASE CHECK FAILED\n"+failures.join("\n"));process.exit(1);} console.log("Release integrity checks passed.");
