(async function(){
  const list=document.getElementById("notificationList"); const esc=value=>JDKUI?.escapeHTML?JDKUI.escapeHTML(String(value||"")):String(value||"");
  function time(value){ const date=value?.toDate?.()||new Date(value||Date.now()); return date.toLocaleString(); }
  async function render(){
    const user=await JDKBackend.getUser(); if(!user){ list.innerHTML='<div class="emptyState"><h3>Sign in to see notifications</h3><a href="auth.html" class="primaryBtn">Sign in</a></div>'; return; }
    try { const rows=await JDKBackend.getNotifications(); if(!rows.length){list.innerHTML='<div class="emptyState"><h3>No notifications yet</h3><p>Marketplace updates will appear here.</p></div>';return;}
      list.innerHTML=rows.map(row=>`<a class="notificationCard ${row.read?'':'unread'}" href="${esc(row.link||'notifications.html')}" data-id="${esc(row.id)}"><div class="notificationDot"></div><div><h3>${esc(row.title)}</h3><p>${esc(row.message)}</p><small>${esc(time(row.createdAt))}</small></div></a>`).join("");
      list.querySelectorAll("[data-id]").forEach(card=>card.addEventListener("click",()=>JDKBackend.markNotificationRead(card.dataset.id).catch(()=>{})));
    } catch(error){ list.innerHTML=`<div class="emptyState"><h3>Could not load notifications</h3><p>${esc(error.message)}</p></div>`; }
  }
  document.getElementById("markAllRead").addEventListener("click",async()=>{try{await JDKBackend.markAllNotificationsRead();JDKUI?.toast?.("Notifications marked as read.");render();}catch(e){JDKUI?.toast?.(e.message,"error");}});
  document.getElementById("enablePush").addEventListener("click",async()=>{try{await JDKBackend.registerPushNotifications();JDKUI?.toast?.("Push notifications enabled.");}catch(e){JDKUI?.toast?.(e.message,"error");}});
  await render();
})();
