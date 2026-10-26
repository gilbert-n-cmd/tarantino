/* ============================================
   Firestore Knowledge Base — AI Bot Only
   Strict Word-Boundary Matching
   ============================================ */

import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
  console.log("[Knowledge] Starting strict database matcher...");

  let cache = null;
  let cacheTime = 0;
  const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

  async function loadKnowledge() {
    const now = Date.now();
    if (cache && (now - cacheTime) < CACHE_TTL) return cache;
    try {
      const snap = await getDocs(collection(db, "knowledge"));
      cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      cacheTime = now;
      console.log(`[Knowledge] Loaded ${cache.length} entries from database`);
      return cache;
    } catch (err) {
      console.warn("[Knowledge] Failed to load from Firestore:", err);
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

      // 1. Check if the user's text exactly matches your database question
      const q = (entry.question || "").toLowerCase();
      if (q && (text.includes(q) || q.includes(text))) {
        score += 100;
      }

      // 2. Check if the user's text contains any of your exact keywords
      for (const kw of (entry.keywords || [])) {
        const k = String(kw).toLowerCase().trim();
        if (!k) continue;
        
        // Use word boundaries (\b) so "email" doesn't match inside "Gilbert"
        // The 'i' flag makes it case-insensitive
        const regex = new RegExp(`\\b${k}\\b`, 'i'); 
        
        if (regex.test(text)) {
          score += 10; // Give a solid 10 points for a full word match
        }
      }

      // 3. Add priority (e.g., 10 points for priority 10)
      score += (Number(entry.priority) || 0);

      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }

    // Require a minimum score of 10 (meaning at least one full keyword matched)
    if (bestScore >= 10) {
      console.log("[Knowledge] ✅ Database match:", best.question, "| Score:", bestScore);
      return best;
    }
    
    console.log("[Knowledge] ❌ No match found in database. Best score:", bestScore);
    return null;
  }

  window.tarantinoSearchKnowledge = searchKnowledge;
  window.tarantinoClearKnowledgeCache = () => { cache = null; cacheTime = 0; };

  console.log("[Knowledge] ✅ Ready");
})();