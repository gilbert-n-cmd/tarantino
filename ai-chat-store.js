/* ============================================
   Firestore chat store — sessions + messages
   Exposes: tarantinoCreateSession, tarantinoSaveMessage,
            tarantinoListSessions, tarantinoLoadMessages,
            tarantinoDeleteSession
   ============================================ */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as fbLimit,
  serverTimestamp,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const { db, auth } = window.tarantinoAuth;

/* ---------- Get current uid or throw ---------- */
function requireUser() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return uid;
}

/* ---------- Create a new chat session ---------- */
window.tarantinoCreateSession = async function (title = "New chat") {
  const uid = requireUser();
  const ref = await addDoc(collection(db, "users", uid, "sessions"), {
    title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
};

/* ---------- Save a message in a session ---------- */
window.tarantinoSaveMessage = async function (sessionId, sender, text) {
  const uid = requireUser();

  // Add message
  await addDoc(collection(db, "users", uid, "sessions", sessionId, "messages"), {
    sender,       // "user" | "bot"
    text,
    createdAt: serverTimestamp()
  });

  // Touch session updatedAt
  await setDoc(
    doc(db, "users", uid, "sessions", sessionId),
    { updatedAt: serverTimestamp() },
    { merge: true }
  );
};

/* ---------- List recent sessions ---------- */
window.tarantinoListSessions = async function (max = 20) {
  const uid = requireUser();
  const q = query(
    collection(db, "users", uid, "sessions"),
    orderBy("updatedAt", "desc"),
    fbLimit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/* ---------- Load messages in a session ---------- */
window.tarantinoLoadMessages = async function (sessionId) {
  const uid = requireUser();
  const q = query(
    collection(db, "users", uid, "sessions", sessionId, "messages"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/* ---------- Delete a session ---------- */
window.tarantinoDeleteSession = async function (sessionId) {
  const uid = requireUser();
  await deleteDoc(doc(db, "users", uid, "sessions", sessionId));
};

console.log("[Chat Store] Ready");