/* ============================================
   Admin Login — AI Bot Only
   ============================================ */

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

function waitForFirebase() {
  return new Promise((resolve) => {
    if (window.tarantinoAuth?.auth && window.tarantinoAuth?.db) {
      return resolve(window.tarantinoAuth);
    }
    const check = setInterval(() => {
      if (window.tarantinoAuth?.auth && window.tarantinoAuth?.db) {
        clearInterval(check);
        resolve(window.tarantinoAuth);
      }
    }, 20);
    setTimeout(() => clearInterval(check), 10000);
  });
}

(async () => {
  const { auth, db } = await waitForFirebase();
  console.log("[AdminLogin] Starting…");

  await setPersistence(auth, browserLocalPersistence)
    .then(() => console.log("[AdminLogin] ✅ Persistence: LOCAL"))
    .catch((e) => console.error("[AdminLogin] Persistence failed:", e));

  const form  = document.getElementById("adminLoginForm");
  const email = document.getElementById("adminEmail");
  const pass  = document.getElementById("adminPassword");
  const btn   = document.getElementById("adminLoginBtn");
  const err   = document.getElementById("adminError");

  let redirecting = false;

  // If already logged in as admin → redirect
  onAuthStateChanged(auth, async (user) => {
    if (!user || redirecting) return;
    try {
      // Changed to "adminUser"
      const snap = await getDoc(doc(db, "adminUser", user.uid));
      if (snap.exists() && snap.data().role === "admin") {
        redirecting = true;
        console.log("[AdminLogin] Already admin — redirecting");
        window.location.replace("knowledge-admin.html");
      }
    } catch (e) {
      console.warn("[AdminLogin] Auto-redirect failed:", e);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.textContent = "";
    btn.disabled = true;
    btn.textContent = "Checking access…";

    try {
      const cred = await signInWithEmailAndPassword(auth, email.value.trim(), pass.value);
      console.log("[AdminLogin] Signed in:", cred.user.email);

      // Wait for auth state to settle
      await new Promise(r => setTimeout(r, 400));

      // Check role
      // Changed to "adminUser"
      const snap = await getDoc(doc(db, "adminUser", cred.user.uid));

      if (!snap.exists() || snap.data().role !== "admin") {
        await signOut(auth);
        err.textContent = "Access denied. Admin privileges required.";
        btn.disabled = false;
        btn.textContent = "Sign In as Admin";
        return;
      }

      console.log("[AdminLogin] ✅ Admin verified — redirecting");
      redirecting = true;
      setTimeout(() => {
        window.location.replace("knowledge-admin.html");
      }, 400);

    } catch (ex) {
      console.error("[AdminLogin] Login failed:", ex);
      err.textContent = friendlyError(ex);
      btn.disabled = false;
      btn.textContent = "Sign In as Admin";
    }
  });

  function friendlyError(ex) {
    const code = ex.code || "";
    if (code.includes("user-not-found"))     return "No account found with that email.";
    if (code.includes("wrong-password"))     return "Incorrect password.";
    if (code.includes("invalid-credential")) return "Wrong email or password.";
    if (code.includes("invalid-email"))      return "Please enter a valid email.";
    if (code.includes("too-many-requests"))  return "Too many attempts. Try again later.";
    return "Login failed. Please try again.";
  }

  console.log("[AdminLogin] Ready");
})();