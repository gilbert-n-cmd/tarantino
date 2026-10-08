/* ============================================
   Firestore Chat Store — AI Bot Only
   ============================================ */

import {
  collection, doc, addDoc, setDoc, getDocs,
  query, orderBy, limit as fbLimit,
  serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

async function waitForFirebase() {
  if (window.aiBotFirebaseReady) return window.aiBotFirebaseReady;
  if (window.tarantinoAuth?.db) return window.tarantinoAuth;
  throw new Error("AI Firebase is not initialized.");
}

const chatStoreReady = (async () => {
  const { db, auth } = await waitForFirebase();

  function requireUser() {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Not authenticated");
    return uid;
  }

  window.aiBotCreateSession = async (title = "New chat") => {
    const uid = requireUser();
    const ref = await addDoc(collection(db, "users", uid, "sessions"), {
      title,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return ref.id;
  };

  // Log every AI question for the admin FAQ Insights dashboard.
  // This is intentionally separate from private per-user chat history.
  // Guest questions are allowed in FAQ Insights, but guest chat history
  // is not stored under /users because the guest has no account.
  window.aiBotLogQuestion = async (question) => {
    const text = String(question || "").trim();
    if (!text) return null;

    const uid = auth.currentUser?.uid || null;

    const ref = await addDoc(collection(db, "faq_logs"), {
      question: text.toLowerCase().replace(/\s+/g, " ").trim(),
      originalQuestion: text,
      userId: uid,
      source: "ai-bot",
      timestamp: serverTimestamp()
    });
    return ref.id;
  };

  window.aiBotSaveMessage = async (sessionId, sender, text) => {
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

  window.aiBotListSessions = async (max = 20) => {
    const uid = requireUser();
    const q = query(
      collection(db, "users", uid, "sessions"),
      orderBy("updatedAt", "desc"),
      fbLimit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  window.aiBotLoadMessages = async (sessionId) => {
    const uid = requireUser();
    const q = query(
      collection(db, "users", uid, "sessions", sessionId, "messages"),
      orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  window.aiBotDeleteSession = async (sessionId) => {
    const uid = requireUser();
    await deleteDoc(doc(db, "users", uid, "sessions", sessionId));
  };

  console.log("[Chat Store] ✅ Ready");
  return true;
})();

window.aiBotChatReady = chatStoreReady;
chatStoreReady.catch(err => console.error("[Chat Store] Initialization failed:", err));