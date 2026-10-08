/* ============================================
   Firebase Auth — AI Bot Only
   Uses tarantino-3e322 (window.tarantinoAuth)
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
  doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Wait for firebase-config.js to finish
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
  console.log("[Auth] Starting with project:", auth.app.options.projectId);

  await setPersistence(auth, browserLocalPersistence)
    .catch((err) => console.warn("[Auth] Persistence failed:", err));

  window.tarantinoUser = null;

  onAuthStateChanged(auth, async (user) => {
    window.tarantinoUser = user;

    if (user) {
      console.log("[Auth] Logged in:", user.email);
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

  window.tarantinoSignUp = async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(cred.user, { displayName });
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      displayName: displayName || email.split("@")[0],
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });
    return cred.user;
  };

  window.tarantinoLogin = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  window.tarantinoLogout = async () => {
    await signOut(auth);
  };

  window.tarantinoGetUser = () => window.tarantinoUser;

  window.tarantinoWaitAuth = () =>
    new Promise((resolve) => {
      if (window.tarantinoUser !== null || auth.currentUser !== null) {
        return resolve(window.tarantinoUser);
      }
      const unsub = onAuthStateChanged(auth, (user) => {
        unsub();
        resolve(user);
      });
    });

  console.log("[Auth] ✅ Ready");
})();