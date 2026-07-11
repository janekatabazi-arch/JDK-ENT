const nameInput=document.getElementById("authName");
const phoneInput=document.getElementById("authPhone");
const submitBtn=document.getElementById("authSubmit");
const modeBtn=document.getElementById("authMode");
const registerFields=document.getElementById("registerFields");
const intro=document.getElementById("authIntro");
const errorBox=document.getElementById("authError");
let mode=JDKStore.auth.getUser()?"signin":"register";

function renderMode(){
 const register=mode==="register";
 registerFields.style.display=register?"block":"none";
 intro.textContent=register?"Create your customer account":"Sign in to your account";
 submitBtn.textContent=register?"Create Account":"Sign In";
 modeBtn.textContent=register?"I already have an account":"Create a new account";
 errorBox.textContent="";
}
modeBtn.addEventListener("click",()=>{mode=mode==="register"?"signin":"register";renderMode();});
submitBtn.addEventListener("click",()=>{
 const phone=phoneInput.value.trim();
 const name=nameInput.value.trim();
 errorBox.textContent="";
 if(!phone){errorBox.textContent="Enter your phone number.";return;}
 if(mode==="register"){
   if(!name){errorBox.textContent="Enter your name.";return;}
   const user=JDKStore.auth.register({name,phone});
   JDKCustomer.save({...JDKCustomer.get(),name:user.name,phone:user.phone});
   location.href="account.html"; return;
 }
 const user=JDKStore.auth.signIn(phone);
 if(!user){errorBox.textContent="No matching local account was found.";return;}
 location.href="account.html";
});
renderMode();