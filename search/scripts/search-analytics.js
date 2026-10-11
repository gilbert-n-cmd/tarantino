// scripts/search-analytics.js
import { db } from "./auth.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Log a search. Two writes:
 *  1. Raw log entry in `searchLogs`
 *  2. Running counter in `searchCounts`
 */
export async function logSearch(rawTerm, category = "all") {
  const term = normalize(rawTerm);
  if (!term || term.length < 2) return;

  const docId = sanitizeId(term);

  try {
    await addDoc(collection(db, "searchLogs"), {
      term,
      category,
      at: serverTimestamp()
    });

    const counterRef = doc(db, "searchCounts", docId);
    const snap = await getDoc(counterRef);

    if (snap.exists()) {
      await setDoc(counterRef, {
        term,
        count: increment(1),
        lastAt: serverTimestamp()
      }, { merge: true });
    } else {
      await setDoc(counterRef, {
        term,
        count: 1,
        firstAt: serverTimestamp(),
        lastAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn("[Analytics] Search logging failed:", err);
  }
}

function normalize(str) {
  return String(str || "").trim().toLowerCase();
}

function sanitizeId(term) {
  return term.replace(/[\/\.\#\$\[\]]/g, "_").slice(0, 100);
}