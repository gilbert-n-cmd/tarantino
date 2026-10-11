// scripts/feedback.js
import { db, auth } from "./auth.js";
import {
  doc, setDoc, getDoc, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const LS_KEY = "feedbackVoted";

function getVoted() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
  catch { return {}; }
}
function saveVoted(v) {
  localStorage.setItem(LS_KEY, JSON.stringify(v));
}

/**
 * Record a 👍 or 👎 vote for a resource.
 * Uses a stable per-browser fingerprint so the same user
 * can't vote twice for the same resource.
 */
export async function recordVote(resourceId, vote /* "yes" | "no" */) {
  const voted = getVoted();
  if (voted[resourceId]) {
    return { ok: false, reason: "already-voted" };
  }

  const uid = auth.currentUser?.uid || "anon";
  const fingerprint = `${uid}-${Math.random().toString(36).slice(2, 10)}`;
  const voteId = `${resourceId}_${fingerprint}`;

  try {
    // 1. Store the individual vote
    await setDoc(doc(db, "resultFeedback", voteId), {
      resourceId,
      vote,
      uid,
      at: serverTimestamp()
    });

    // 2. Increment counters on the resource doc
    const resourceRef = doc(db, "resources", resourceId);
    await setDoc(resourceRef, {
      helpfulYes: vote === "yes" ? increment(1) : increment(0),
      helpfulNo:  vote === "no"  ? increment(1) : increment(0)
    }, { merge: true });

    voted[resourceId] = vote;
    saveVoted(voted);

    return { ok: true };
  } catch (err) {
    console.warn("[Feedback] failed:", err);
    return { ok: false, reason: err.message };
  }
}

export function hasVoted(resourceId) {
  return getVoted()[resourceId] || null;
}

