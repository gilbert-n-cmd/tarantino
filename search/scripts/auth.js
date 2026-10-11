/* ============================================
   Shared Firebase instance + auth helpers
   Exports: app, auth, db, login, logout,
            waitForAuth, isAdmin, requireAdmin
   ============================================ */

import { initializeApp, getApps, getApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

/* --------------------------------------------
   Init once (named app to avoid collisions)
   -------------------------------------------- */
const APP_NAME = "shop-search";
const app = getApps().some(a => a.name === APP_NAME)
  ? getApp(APP_NAME)
  : initializeApp(firebaseConfig, APP_NAME);

const auth = getAuth(app);
const db   = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch(err => {
  console.warn("[Auth] Persistence failed:", err);
});

console.log("[Auth] ✅ Firebase ready:", firebaseConfig.projectId);

/* --------------------------------------------
   Auth actions
   -------------------------------------------- */
export async function login(email, password) {
  if (!email || !password) {
    const e = new Error("Email and password are required.");
    e.code = "auth/missing-fields";
    throw e;
  }
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function logout() {
  return signOut(auth);
}

export function waitForAuth(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let done = false;

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      unsub();
      reject(new Error("Auth check timed out"));
    }, timeoutMs);

    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        unsub();
        resolve(user);
      },
      (err) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        unsub();
        reject(err);
      }
    );
  });
}

export async function isAdmin(uid) {
  if (!uid) return false;
  const snap = await getDoc(doc(db, "admins", uid));
  if (!snap.exists()) return false;
  const data = snap.data() || {};
  return data.isAdmin === true || data.role === "admin";
}

export async function requireAdmin() {
  try {
    const user = await waitForAuth();
    if (!user) return null;
    const ok = await isAdmin(user.uid);
    return ok ? user : null;
  } catch (err) {
    console.error("[Auth] requireAdmin failed:", err);
    return null;
  }
}

export { app, auth, db };