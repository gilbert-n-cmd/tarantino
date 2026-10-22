// scripts/related-searches.js
import { db } from "./auth.js";
import {
  collection, query, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// In-memory cache: term → { terms, expires }
const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// How many recent search events to scan
const SCAN_LIMIT = 300;

// How many related terms to return
const RESULT_LIMIT = 6;

// Minimum times a term must co-occur to be shown
const MIN_COOCCURRENCE = 2;

/**
 * Normalize a search term for comparison.
 */
function norm(str) {
  return String(str || "").trim().toLowerCase();
}

/**
 * Fetch recent search log entries once and cache them briefly.
 * Avoids re-reading 300 docs on every keystroke.
 */
let recentCache = null;
let recentCacheAt = 0;
const RECENT_TTL = 60 * 1000; // 60s

async function fetchRecentSearches() {
  const now = Date.now();
  if (recentCache && (now - recentCacheAt) < RECENT_TTL) {
    return recentCache;
  }

  try {
    const snap = await getDocs(
      query(
        collection(db, "searchLogs"),
        orderBy("at", "desc"),
        limit(SCAN_LIMIT)
      )
    );
    recentCache = snap.docs.map(d => {
      const data = d.data();
      return {
        term: norm(data.term),
        at: data.at?.toMillis?.() || 0,
        category: data.category || "all"
      };
    }).filter(s => s.term.length >= 2);

    recentCacheAt = now;
    return recentCache;
  } catch (err) {
    console.warn("[RelatedSearches] fetch failed:", err);
    recentCache = [];
    recentCacheAt = now;
    return recentCache;
  }
}

/**
 * Find terms that co-occur with `term` in recent search history.
 * "Co-occur" = a different search event within ±WINDOW_MS of a search
 * for `term` — same user, same session, so they're conceptually linked.
 */
export async function findRelatedSearches(term) {
  const target = norm(term);
  if (!target || target.length < 2) return [];

  // Cache hit
  const cached = CACHE.get(target);
  if (cached && cached.expires > Date.now()) {
    return cached.terms;
  }

  const recent = await fetchRecentSearches();
  if (!recent.length) return [];

  // Locate "anchor" events: searches that match the target term
  // (either exact or contained within)
  const anchors = recent.filter(s =>
    s.term === target || s.term.includes(target) || target.includes(s.term)
  );

  if (!anchors.length) {
    // Fall back: just count "popular nearby" terms
    return popularFallback(recent, target);
  }

  // Co-occurrence: count terms searched within ±3 minutes of any anchor
  const WINDOW_MS = 3 * 60 * 1000;
  const counts = new Map();

  for (const anchor of anchors) {
    for (const other of recent) {
      if (other.term === target) continue;                // skip self
      if (other.term === anchor.term) continue;           // skip duplicate anchor
      if (Math.abs(other.at - anchor.at) > WINDOW_MS) continue; // too far apart

      counts.set(other.term, (counts.get(other.term) || 0) + 1);
    }
  }

  // Filter + sort
  const ranked = [...counts.entries()]
    .filter(([, c]) => c >= MIN_COOCCURRENCE)
    .sort((a, b) => b[1] - a[1])
    .slice(0, RESULT_LIMIT)
    .map(([term, count]) => ({ term, count }));

  // If co-occurrence produced nothing, fall back
  const final = ranked.length >= 2
    ? ranked
    : popularFallback(recent, target);

  // Cache
  CACHE.set(target, { terms: final, expires: Date.now() + CACHE_TTL });
  return final;
}

/**
 * Fallback: return trending terms (excluding self + obvious duplicates).
 * Uses frequency across the recent window.
 */
function popularFallback(recent, target) {
  const counts = new Map();
  for (const s of recent) {
    if (s.term === target) continue;
    if (s.term.includes(target) || target.includes(s.term)) continue;
    counts.set(s.term, (counts.get(s.term) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, RESULT_LIMIT)
    .map(([term, count]) => ({ term, count }));
}

/**
 * Invalidate cache for a specific term (call after logging a new search).
 */
export function invalidateRelatedSearches(term) {
  CACHE.delete(norm(term));
}

