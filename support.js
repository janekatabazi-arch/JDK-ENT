const supportState = { orders: [], cases: [] };
const safe = value => { const el=document.createElement("span"); el.textContent=String(value??""); return el.innerHTML; };
async function loadTrustCenter(){
  const host=document.getElementById("trustCases");
  if(!JDKBackend.isConnected()){host.innerHTML='<p>Configure Firebase to use marketplace disputes.</p>';return;}
  const user=await JDKBackend.getUser(); if(!user){host.innerHTML='<p><a href="auth.html">Sign in</a> to open or review a marketplace case.</p>';return;}
  const [ordersSnap,casesSnap]=await Promise.all([JDKBackend.db.collection("orders").where("userId","==",user.uid).get(),JDKBackend.db.collection("supportCases").where("participantIds","array-contains",user.uid).get()]);
  supportState.orders=ordersSnap.docs.map(d=>({id:d.id,...d.data()})); supportState.cases=casesSnap.docs.map(d=>({id:d.id,...d.data()}));
  host.innerHTML=supportState.cases.length?supportState.cases.map(row=>`<article class="supportCard"><h3>Case ${safe(row.id)}</h3><p>${safe(row.reason)}</p><p><strong>Status:</strong> ${safe(row.status)} · <strong>Resolution:</strong> ${safe(row.resolution||"none")}</p><button class="supportBtn" data-evidence="${safe(row.id)}">Add evidence</button></article>`).join(""):'<p>No active support cases.</p>';
  const select=document.getElementById("disputeOrder"); select.innerHTML='<option value="">Choose an order</option>'+supportState.orders.map(o=>`<option value="${safe(o.id)}">${safe(o.id.slice(0,8))} · ${safe(o.status)}</option>`).join("");
}
document.getElementById("openDispute")?.addEventListener("click",async()=>{const orderId=document.getElementById("disputeOrder").value;const reason=document.getElementById("disputeReason").value.trim();try{await JDKBackend.createDispute(orderId,"",reason);JDKUI.toast("Support case opened");document.getElementById("disputeReason").value="";await loadTrustCenter();}catch(e){JDKUI.toast(e.message||"Could not open dispute");}});
document.getElementById("trustCases")?.addEventListener("click",async e=>{const btn=e.target.closest("[data-evidence]");if(!btn)return;const note=prompt("Evidence note:")||"";const url=prompt("HTTPS evidence link (optional):")||"";if(!note&&!url)return;try{await JDKBackend.addCaseEvidence(btn.dataset.evidence,note,url);JDKUI.toast("Evidence added to the case");}catch(err){JDKUI.toast(err.message||"Could not add evidence");}});
document.querySelector(".supportCard .supportBtn")?.addEventListener("click",async()=>{try{const c=await JDKBackend.createConversation("","","","support");location.href=`chat.html?conversation=${encodeURIComponent(c.id)}`;}catch(e){JDKUI.toast(e.message||"Could not start support chat");}});
loadTrustCenter().catch(e=>{document.getElementById("trustCases").textContent=e.message||"Trust Center failed to load.";});
