/* ============================================
   Firestore Knowledge Base — Answer Lookup
   Searches a public "knowledge" collection
   ============================================ */

import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const { db } = window.tarantinoAuth;

/* In-memory cache so we don't hit Firestore on every message */
let knowledgeCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/* ---------- Load all knowledge entries (with cache) ---------- */
async function loadKnowledge() {
  const now = Date.now();
  if (knowledgeCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return knowledgeCache;
  }

  try {
    const snap = await getDocs(collection(db, "knowledge"));
    knowledgeCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cacheTimestamp = now;
    console.log(`[Knowledge] Loaded ${knowledgeCache.length} entries`);
    return knowledgeCache;
  } catch (err) {
    console.warn("[Knowledge] Failed to load:", err);
    return [];
  }
}

/* ---------- Search knowledge base for best match ---------- */
window.tarantinoSearchKnowledge = async function (userQuery) {
  const entries = await loadKnowledge();
  if (entries.length === 0) return null;

  const text = userQuery.toLowerCase().trim();
  let best = null;
  let bestScore = 0;

  for (const entry of entries) {
    const keywords = entry.keywords || [];
    let score = 0;

    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        score += kw.length;      // longer match = higher score
      }
    }

    // Exact question match = big bonus
    if (entry.question && text.includes(entry.question.toLowerCase())) {
      score += 100;
    }

    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  // Only return if we have a meaningful match
  if (bestScore >= 3) {
    return best;
  }
  return null;
};

/* ---------- Clear cache (call after admin updates) ---------- */
window.tarantinoClearKnowledgeCache = function () {
  knowledgeCache = null;
  cacheTimestamp = 0;
  console.log("[Knowledge] Cache cleared");
};

console.log("[Knowledge Store] Ready");

