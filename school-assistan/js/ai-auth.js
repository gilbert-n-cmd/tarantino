/* ============================================
   AI BOT AUTHENTICATION — REGULAR USERS ONLY
   Firebase project: tarantino-3e322

   This auth is deliberately isolated from the school portal auth.
   ============================================ */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const waitForFirebase = async () => {
  if (window.aiBotFirebaseReady) return window.aiBotFirebaseReady;

  // Fallback for cached/older pages.
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.tarantinoAuth?.auth && window.tarantinoAuth?.db) {
        clearInterval(timer);
        resolve(window.tarantinoAuth);
      } else if (Date.now() - started > 10000) {
        clearInterval(timer);
        reject(new Error("AI Firebase initialization timed out."));
      }
    }, 25);
  });
};

const authReady = (async () => {
  const { auth, db } = await waitForFirebase();

  console.log("[AI Auth] Starting with project:", auth.app.options.projectId);

  await setPersistence(auth, browserLocalPersistence).catch(err => {
    console.warn("[AI Auth] Persistence failed:", err);
  });

  let currentUser = auth.currentUser || null;
  let firstAuthStateResolved = false;
  let firstAuthStateResolve;

  const firstAuthState = new Promise(resolve => {
    firstAuthStateResolve = resolve;
  });

  const dispatch = (name, user) => {
    window.dispatchEvent(new CustomEvent(name, { detail: user || null }));
  };

  onAuthStateChanged(auth, async user => {
    currentUser = user;

    if (user) {
      console.log("[AI Auth] Logged in:", user.email);

      try {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email || "",
          displayName: user.displayName || (user.email || "user").split("@")[0],
          lastLogin: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        // Do not block login if Firestore rules temporarily prevent the profile write.
        console.warn("[AI Auth] Could not write user profile:", err);
      }

      dispatch("ai-bot:login", user);
    } else {
      console.log("[AI Auth] Logged out");
      dispatch("ai-bot:logout", null);
    }

    if (!firstAuthStateResolved) {
      firstAuthStateResolved = true;
      firstAuthStateResolve(user);
    }
  });

  // Wait until Firebase has delivered the initial auth state.
  await firstAuthState;

  window.aiBotAuth = {
    auth,
    db,

    async signUp(email, password, displayName) {
      const cleanEmail = String(email || "").trim();
      const cleanName = String(displayName || "").trim();

      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);

      if (cleanName) {
        await updateProfile(cred.user, { displayName: cleanName });
      }

      await setDoc(doc(db, "users", cred.user.uid), {
        email: cleanEmail,
        displayName: cleanName || cleanEmail.split("@")[0],
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      }, { merge: true });

      return cred.user;
    },

    async login(email, password) {
      const cleanEmail = String(email || "").trim();
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      return cred.user;
    },

    async logout() {
      await signOut(auth);
    },

    getUser() {
      return currentUser || auth.currentUser || null;
    },

    async waitAuth() {
      return currentUser || auth.currentUser || null;
    }
  };

  // Compatibility-free, AI-specific function names.
  window.aiBotSignUp = (...args) => window.aiBotAuth.signUp(...args);
  window.aiBotLogin = (...args) => window.aiBotAuth.login(...args);
  window.aiBotLogout = (...args) => window.aiBotAuth.logout(...args);
  window.aiBotGetUser = () => window.aiBotAuth.getUser();
  window.aiBotWaitAuth = () => window.aiBotAuth.waitAuth();

  console.log("[AI Auth] Ready");
  return window.aiBotAuth;
})();

window.aiBotAuthReady = authReady;

// Make initialization failures visible instead of silently leaving the login button broken.
authReady.catch(err => {
  console.error("[AI Auth] Initialization failed:", err);
});
