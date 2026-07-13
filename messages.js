const messagesContainer = document.getElementById("messagesContainer");
const searchInput = document.getElementById("getData");
let conversations = [];
const safe = value => window.JDKUI?.escapeHTML ? JDKUI.escapeHTML(String(value ?? "")) : String(value ?? "");

function openChat(row) { localStorage.setItem("selectedConversation", JSON.stringify(row)); location.href = `chat.html?conversation=${encodeURIComponent(row.id)}`; }
function render(list = conversations) {
  if (!messagesContainer) return; messagesContainer.innerHTML = "";
  if (!list.length) { messagesContainer.innerHTML = `<div class="emptyMessages"><h3>No conversations yet</h3><p>Message a seller from a product page or contact JDK Support.</p><button id="startSupport" class="sellerPrimary">Contact JDK Support</button></div>`; document.getElementById("startSupport")?.addEventListener("click", startSupport); return; }
  list.forEach(row => { const unread=Number(row.unreadCounts?.[JDKBackend.auth?.currentUser?.uid] || 0); const card=document.createElement("button"); card.className="messageCard conversationCard"; card.innerHTML=`<div class="conversationAvatar">${safe((row.title||"J").charAt(0).toUpperCase())}</div><div class="messageInfo"><h3>${safe(row.title||"Conversation")}</h3><p>${safe(row.lastMessage||"Conversation started")}</p></div><span class="time">${unread ? `<b class="messageUnread">${unread}</b>` : "Chat"}</span>`; card.onclick=()=>openChat(row); messagesContainer.appendChild(card); });
}
async function startSupport(){ try { const row=await JDKBackend.createConversation({type:"support"}); openChat({id:row.id,title:"JDK Support",type:"support"}); } catch(e){ JDKUI.toast(e.message||"Could not open support chat","error"); } }
async function load(){ if(!JDKBackend?.isConnected()) { messagesContainer.innerHTML='<div class="emptyMessages"><h3>Firebase required</h3><p>Configure Firebase to use secure marketplace messaging.</p></div>'; return; } const user=await JDKBackend.getUser(); if(!user){ location.href="auth.html"; return; } try { conversations=await JDKBackend.getConversations(); render(); } catch(e){ messagesContainer.innerHTML=`<p class="authError">${safe(e.message)}</p>`; } }
searchInput?.addEventListener("input",()=>{const q=searchInput.value.trim().toLowerCase();render(conversations.filter(row=>`${row.title||""} ${row.lastMessage||""}`.toLowerCase().includes(q)));});
load();
