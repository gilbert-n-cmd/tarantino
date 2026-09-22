/* ============================================
   Firestore Data Layer — Student Portal
   ============================================ */

import {
  collection, doc, addDoc, getDoc, getDocs,
  query, where, orderBy, limit as fbLimit,
  serverTimestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const { db, auth } = window.tarantinoAuth;

/* ---------- Get student by Firebase Auth uid ---------- */
window.tarantinoGetStudentByUid = async function (uid) {
  const q = query(
    collection(db, "students"),
    where("uid", "==", uid),
    fbLimit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

/* ---------- Grades ---------- */
window.tarantinoGetGrades = async function (studentId) {
  const q = query(
    collection(db, "students", studentId, "grades"),
    orderBy("term", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/* ---------- Fees ---------- */
window.tarantinoGetFeeStatus = async function (studentId) {
  const q = query(
    collection(db, "students", studentId, "fees"),
    orderBy("term", "desc"),
    fbLimit(5)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/* ---------- Timetable ---------- */
window.tarantinoGetTimetable = async function (classId) {
  const snap = await getDocs(collection(db, "timetable", classId));
  const out = {};
  snap.forEach(d => { out[d.id] = d.data(); });
  return out;
};

/* ---------- Messages ---------- */
window.tarantinoGetMessages = async function (studentId) {
  const q = query(
    collection(db, "students", studentId, "messages"),
    orderBy("createdAt", "desc"),
    fbLimit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

window.tarantinoSendMessage = async function (studentId, text) {
  await addDoc(collection(db, "students", studentId, "messages"), {
    from: "student",
    fromName: window.tarantinoUser?.displayName || "Student",
    text,
    read: false,
    createdAt: serverTimestamp()
  });
};

console.log("[Firestore Data] Ready");

