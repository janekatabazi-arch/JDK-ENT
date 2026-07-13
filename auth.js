const nameInput = document.getElementById("authName");
const phoneInput = document.getElementById("authPhone");
const emailInput = document.getElementById("authEmail");
const passwordInput = document.getElementById("authPassword");
const submitBtn = document.getElementById("authSubmit");
const modeBtn = document.getElementById("authMode");
const registerFields = document.getElementById("registerFields");
const registerPhone = document.getElementById("registerPhone");
const intro = document.getElementById("authIntro");
const errorBox = document.getElementById("authError");
let mode = "signin";
function renderMode() { const register = mode === "register"; registerFields.style.display = register ? "block" : "none"; registerPhone.style.display = register ? "block" : "none"; intro.textContent = register ? "Create your customer account" : "Sign in to your account"; submitBtn.textContent = register ? "Create Account" : "Sign In"; modeBtn.textContent = register ? "I already have an account" : "Create a new account"; errorBox.textContent = ""; }
modeBtn.addEventListener("click", () => { mode = mode === "register" ? "signin" : "register"; renderMode(); });
submitBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim(); const password = passwordInput.value; const phone = phoneInput.value.trim(); const name = nameInput.value.trim();
  errorBox.textContent = "";
  if (!email) return errorBox.textContent = "Enter your email address.";
  if (password.length < 6) return errorBox.textContent = "Password must contain at least 6 characters.";
  if (mode === "register" && !name) return errorBox.textContent = "Enter your name.";
  if (mode === "register" && !phone) return errorBox.textContent = "Enter your phone number.";
  submitBtn.disabled = true; submitBtn.textContent = "Please wait...";
  try { if (mode === "register") await JDKBackend.signUp({ email, password, name, phone }); else await JDKBackend.signIn({ email, password }); location.href = "account.html"; }
  catch (error) { errorBox.textContent = String(error.message || "Authentication failed.").replace(/^Firebase:\s*/i, ""); }
  finally { submitBtn.disabled = false; renderMode(); }
});
renderMode();
