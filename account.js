
const customer = JDKCustomer.get();
const orders = JDKOrders.getAll();
const session = JDKStore.session.ensure();

document.getElementById("accountName").textContent = customer.name || "Guest Customer";
document.getElementById("accountPhone").textContent = customer.phone || "No phone saved";
document.getElementById("accountLocation").textContent = customer.location || "No delivery area saved";
document.getElementById("accountInitial").textContent = (customer.name || "J").charAt(0).toUpperCase();
document.getElementById("orderCount").textContent = orders.length;
document.getElementById("guestId").textContent = session.guestId.slice(-6);

const authUser=JDKStore.auth.getUser();
const signedIn=JDKStore.auth.isSignedIn();
const authStatus=document.getElementById("authStatus");
const authAction=document.getElementById("authAction");
const signOutBtn=document.getElementById("signOutBtn");
authStatus.textContent=signedIn?"Signed in as "+authUser.id:"Browsing as a guest";
authAction.hidden=signedIn;
signOutBtn.hidden=!signedIn;
signOutBtn.addEventListener("click",()=>{JDKStore.auth.signOut();location.reload();});
