/* ============================================
   Firestore Knowledge Base — AI Bot Only
   ============================================ */

import {
  collection, getDocs
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
  const { db } = await waitForFirebase();
  console.log("[Knowledge] Starting…");

  let cache = null;
  let cacheTime = 0;
  const CACHE_TTL = 3 * 60 * 1000;

  async function loadKnowledge() {
    const now = Date.now();
    if (cache && (now - cacheTime) < CACHE_TTL) return cache;
    try {
      const snap = await getDocs(collection(db, "knowledge"));
      cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      cacheTime = now;
      console.log(`[Knowledge] Loaded ${cache.length} entries`);
      return cache;
    } catch (err) {
      console.warn("[Knowledge] Failed to load:", err);
      return [];
    }
  }

  async function searchKnowledge(query) {
    const entries = await loadKnowledge();
    if (entries.length === 0) return null;

    const text = query.toLowerCase().trim();
    if (text.length < 2) return null;

    let best = null;
    let bestScore = 0;

    for (const entry of entries) {
      let score = 0;

      for (const kw of (entry.keywords || [])) {
        const k = String(kw).toLowerCase();
        if (text.includes(k)) score += k.length;
      }

      const q = (entry.question || "").toLowerCase();
      if (q && text.includes(q)) score += 100;

      score += (Number(entry.priority) || 0) * 2;

      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }

    if (bestScore >= 4) {
      console.log("[Knowledge] Match:", best.question, "| Score:", bestScore);
      return best;
    }
    return null;
  }

  function clearCache() {
    cache = null;
    cacheTime = 0;
    console.log("[Knowledge] Cache cleared");
  }

  window.tarantinoSearchKnowledge = searchKnowledge;
  window.tarantinoClearKnowledgeCache = clearCache;

  console.log("[Knowledge] ✅ Ready");
})();