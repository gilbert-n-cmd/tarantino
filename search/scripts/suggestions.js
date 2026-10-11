// scripts/suggestions.js
import { db } from "./auth.js";
import {
  collection, query, orderBy, startAt, endAt, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const HISTORY_KEY = "schoolSearchHistory";    // 👈 CHANGED (separate from old shop history)
const MAX_HISTORY = 10;
const COLLECTION  = "resources";              // 👈 CHANGED

/* ============================================================
   HISTORY
   ============================================================ */
export function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

export function addToHistory(term) {
  const clean = String(term || "").trim();
  if (!clean) return;
  const history = getHistory().filter(t => t.toLowerCase() !== clean.toLowerCase());
  history.unshift(clean);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export function removeFromHistory(term) {
  const history = getHistory().filter(t => t !== term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

/* ============================================================
   TRENDING
   ============================================================ */
export async function fetchTrending(limitN = 5) {
  try {
    const snap = await getDocs(
      query(collection(db, "searchCounts"), orderBy("count", "desc"), limit(limitN))
    );
    return snap.docs.map(d => d.data()).filter(t => t.term);
  } catch (err) {
    console.warn("[Trending] failed:", err);
    return [];
  }
}

/* ============================================================
   TITLE SUGGESTIONS
   ============================================================ */
async function fetchResourceSuggestions(prefix, limitN = 5) {
  if (!prefix) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, COLLECTION),
        orderBy("titleLower"),           // 👈 CHANGED
        startAt(prefix),
        endAt(prefix + "\uf8ff"),
        limit(limitN)
      )
    );
    return snap.docs.map(d => d.data().title).filter(Boolean);
  } catch (err) {
    console.warn("[Suggestions] resource lookup failed:", err);
    return [];
  }
}

/* ============================================================
   POPULAR MATCHING TERMS
   ============================================================ */
async function fetchPopularMatching(prefix, limitN = 3) {
  if (!prefix) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "searchCounts"), orderBy("count", "desc"), limit(50))
    );
    return snap.docs
      .map(d => d.data())
      .filter(t => t.term && t.term.startsWith(prefix))
      .slice(0, limitN);
  } catch (err) {
    console.warn("[Suggestions] popular lookup failed:", err);
    return [];
  }
}

/* ============================================================
   BUILD SUGGESTIONS
   ============================================================ */
export async function buildSuggestions(term) {
  const lower = String(term || "").toLowerCase().trim();

  if (!lower) {
    const history = getHistory();
    return {
      sections: [
        { label: "Your recent searches",
          items: history.map(h => ({ type: "history", text: h })) }
      ].filter(s => s.items.length > 0)
    };
  }

  const [resources, popular] = await Promise.all([
    fetchResourceSuggestions(lower),
    fetchPopularMatching(lower)
  ]);

  const historyMatches = getHistory()
    .filter(h => h.toLowerCase().includes(lower))
    .slice(0, 3)
    .map(h => ({ type: "history", text: h }));

  const sections = [];

  if (resources.length) {
    sections.push({
      label: "Information",
      items: resources.map(t => ({ type: "resource", text: t }))
    });
  }

  if (popular.length) {
    sections.push({
      label: "Popular questions",
      items: popular.map(p => ({ type: "popular", text: p.term, count: p.count }))
    });
  }

  if (historyMatches.length) {
    sections.push({
      label: "Your recent searches",
      items: historyMatches
    });
  }

  return { sections };
}