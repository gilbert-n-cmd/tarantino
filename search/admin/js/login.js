// admin/js/login.js
import { auth, login, logout, requireAdmin } from "../../scripts/auth.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const authLoader    = document.getElementById("authLoader");
const loginForm     = document.getElementById("loginForm");
const emailInput    = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn     = document.getElementById("submitBtn");
const loginError    = document.getElementById("loginError");

// Safety net — never leave the loader stuck
const safetyTimer = setTimeout(() => {
  authLoader.classList.add("hidden");
}, 3000);

// Auto-redirect if already signed in as admin
onAuthStateChanged(auth, async (user) => {
  clearTimeout(safetyTimer);

  if (!user) {
    authLoader.classList.add("hidden");
    return;
  }

  try {
    const admin = await requireAdmin();
    if (admin) {
      window.location.replace("index.html");
    } else {
      authLoader.classList.add("hidden");
    }
  } catch (err) {
    console.error(err);
    authLoader.classList.add("hidden");
  }
});

// Login submit
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");
  setBtnLoading(submitBtn, true);

  try {
    await login(emailInput.value.trim(), passwordInput.value);
    const user = await requireAdmin();

    if (user) {
      window.location.replace("index.html");
    } else {
      await logout();
      showError("This account is not an admin.");
    }
  } catch (err) {
    console.error(err);
    showError(friendlyAuthError(err));
  } finally {
    setBtnLoading(submitBtn, false);
  }
});

function showError(msg) {
  loginError.textContent = "⚠️ " + msg;
  loginError.classList.remove("hidden");
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  if (code.includes("user-not-found"))      return "No account with that email.";
  if (code.includes("wrong-password"))      return "Incorrect password.";
  if (code.includes("invalid-email"))       return "Invalid email format.";
  if (code.includes("invalid-credential"))  return "Incorrect email or password.";
  if (code.includes("too-many-requests"))   return "Too many attempts. Try again later.";
  if (code.includes("unauthorized-domain")) return "This domain isn't authorized in Firebase.";
  return err?.message || "Sign-in failed. Please try again.";
}

function setBtnLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle("loading", loading);
  btn.disabled = loading;
}