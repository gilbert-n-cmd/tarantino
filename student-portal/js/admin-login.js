/* ============================================
   Admin Login — self-contained
   ============================================ */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

(function () {
  "use strict";

  console.log("[AdminLogin] Starting…");

  // ---------- Firebase config ----------
  const firebaseConfig = {
  apiKey: "AIzaSyCdC66xNRXiEDTNfuJufkOhNvL57i-SxTs",
  authDomain: "tarantino-student-portal.firebaseapp.com",
  projectId: "tarantino-student-portal",
  storageBucket: "tarantino-student-portal.firebasestorage.app",
  messagingSenderId: "637346861909",
  appId: "1:637346861909:web:dc9661aad445d3488b95dc"
};

  const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db   = getFirestore(app);

  console.log("[AdminLogin] Firebase ready:", firebaseConfig.projectId);

  // ---------- Elements ----------
  const form  = document.getElementById("adminLoginForm");
  const email = document.getElementById("adminEmail");
  const pass  = document.getElementById("adminPassword");
  const btn   = document.getElementById("adminLoginBtn");
  const err   = document.getElementById("adminError");

  // ---------- Submit ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.textContent = "";
    btn.disabled = true;
    btn.textContent = "Checking access…";

    try {
      // 1. Sign in
      const cred = await signInWithEmailAndPassword(auth, email.value.trim(), pass.value);
      console.log("[AdminLogin] Signed in:", cred.user.email);

      // 2. Check admin role
      const userRef = doc(db, "users", cred.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.warn("[AdminLogin] No user doc found");
        await signOut(auth);
        err.textContent = "Access denied. Your account has no admin role.";
        return;
      }

      const role = userSnap.data().role;
      console.log("[AdminLogin] User role:", role);

      if (role !== "admin") {
        await signOut(auth);
        err.textContent = "Access denied. Admin privileges required.";
        return;
      }

      // 3. Redirect to admin panel
      console.log("[AdminLogin] ✅ Admin verified — redirecting");
      window.location.href = "admin.html";

    } catch (ex) {
      console.error("[AdminLogin] Login failed:", ex);
      err.textContent = friendlyError(ex);
    } finally {
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

