/* ============================================
   Firestore Chat Store — AI Bot Only
   ============================================ */

import {
  collection, doc, addDoc, setDoc, getDocs,
  query, orderBy, limit as fbLimit,
  serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

function waitForFirebase() {
  return new Promise((resolve) => {
    if (window.tarantinoAuth?.db) return resolve(window.tarantinoAuth);
    const check = setInterval(() => {
      if (window.tarantinoAuth?.db) {
        clearInterval(check);
        resolve(window.tarantinoAuth);
      }
    }, 20);
    setTimeout(() => clearInterval(check), 10000);
  });
}

(async () => {
  const { db, auth } = await waitForFirebase();

  function requireUser() {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Not authenticated");
    return uid;
  }

  window.tarantinoCreateSession = async (title = "New chat") => {
    const uid = requireUser();
    const ref = await addDoc(collection(db, "users", uid, "sessions"), {
      title,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return ref.id;
  };

  window.tarantinoSaveMessage = async (sessionId, sender, text) => {
    const uid = requireUser();
    await addDoc(collection(db, "users", uid, "sessions", sessionId, "messages"), {
      sender,
      text,
      createdAt: serverTimestamp()
    });
    await setDoc(
      doc(db, "users", uid, "sessions", sessionId),
      { updatedAt: serverTimestamp() },
      { merge: true }
    );
  };

  window.tarantinoListSessions = async (max = 20) => {
    const uid = requireUser();
    const q = query(
      collection(db, "users", uid, "sessions"),
      orderBy("updatedAt", "desc"),
      fbLimit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  window.tarantinoLoadMessages = async (sessionId) => {
    const uid = requireUser();
    const q = query(
      collection(db, "users", uid, "sessions", sessionId, "messages"),
      orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  window.tarantinoDeleteSession = async (sessionId) => {
    const uid = requireUser();
    await deleteDoc(doc(db, "users", uid, "sessions", sessionId));
  };

  console.log("[Chat Store] ✅ Ready");
})();