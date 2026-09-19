/* ============================================
   Firebase Auth — Signup / Login / Persistence
   ============================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app  = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = getFirestore(app);

/* ✅ Force localStorage persistence — user stays logged in across visits */
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("[Auth] Persistence setup failed:", err);
});

window.tarantinoAuth = { auth, db };
window.tarantinoUser = null;

/* ---------- Track auth state across the whole app ---------- */
onAuthStateChanged(auth, async (user) => {
  window.tarantinoUser = user;

  if (user) {
    console.log("[Auth] Logged in:", user.email);

    // Ensure user doc exists
    try {
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        displayName: user.displayName || user.email.split("@")[0],
        lastLogin: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn("[Auth] Could not write user doc:", err);
    }

    window.dispatchEvent(new CustomEvent("auth:login", { detail: user }));
  } else {
    console.log("[Auth] Logged out");
    window.dispatchEvent(new CustomEvent("auth:logout"));
  }
});

/* ---------- Sign Up ---------- */
window.tarantinoSignUp = async function (email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }

  // ✅ Create the user doc right away
  await setDoc(doc(db, "users", cred.user.uid), {
    email,
    displayName: displayName || email.split("@")[0],
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp()
  });

  return cred.user;
};

/* ---------- Log In ---------- */
window.tarantinoLogin = async function (email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
};

/* ---------- Log Out ---------- */
window.tarantinoLogout = async function () {
  await signOut(auth);
};

/* ---------- Get current user (sync) ---------- */
window.tarantinoGetUser = function () {
  return window.tarantinoUser;
};

/* ---------- Wait until auth state is known ---------- */
window.tarantinoWaitAuth = function () {
  return new Promise((resolve) => {
    if (window.tarantinoUser !== null || auth.currentUser !== null) {
      return resolve(window.tarantinoUser);
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
};