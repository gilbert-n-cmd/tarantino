
// scripts/search-multi.js
import { db } from "./auth.js";
import {
  collection, query, orderBy, startAt, endAt, where, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Configure which collections to search and how to normalize their docs.
 * Add more entries here as your project grows.
 */
export const SEARCHABLE_COLLECTIONS = [
  {
    name: "resources",
    // fields that hold searchable text
    titleField: "title",
    descField: "description",
    categoryField: "category",
    keywordField: "keywords",
    lowerField: "titleLower"
  }
  // Example — uncomment when you add these:
  // { name: "events", titleField: "title", descField: "details",
  //   categoryField: "type", keywordField: "keywords", lowerField: "titleLower" },
  // { name: "teachers", titleField: "name", descField: "bio",
  //   categoryField: "department", keywordField: "keywords", lowerField: "nameLower" },
];

/**
 * Run a prefix search (startsWith) against one collection.
 */
async function prefixSearch(cfg, searchLower, pageSize) {
  try {
    const snap = await getDocs(
      query(
        collection(db, cfg.name),
        orderBy(cfg.lowerField),
        startAt(searchLower),
        endAt(searchLower + "\uf8ff"),
        limit(pageSize)
      )
    );
    return snap.docs.map(d => normalize(cfg, d));
  } catch (err) {
    console.warn(`[MultiSearch] prefix failed for ${cfg.name}:`, err);
    return [];
  }
}

/**
 * Run a keyword array-contains search against one collection.
 */
async function keywordSearch(cfg, tokens, pageSize) {
  const seen = new Set();
  const out = [];
  for (const token of tokens) {
    try {
      const snap = await getDocs(
        query(
          collection(db, cfg.name),
          where(cfg.keywordField, "array-contains", token),
          limit(pageSize)
        )
      );
      for (const d of snap.docs) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        const data = d.data();
        const kws = Array.isArray(data[cfg.keywordField]) ? data[cfg.keywordField] : [];
        const matches = tokens.filter(t => kws.includes(t)).length;
        out.push({ ...normalize(cfg, d), _score: matches });
      }
    } catch (err) {
      console.warn(`[MultiSearch] keyword failed for ${cfg.name}:`, err);
    }
    if (out.length >= pageSize) break;
  }
  return out.sort((a, b) => (b._score || 0) - (a._score || 0));
}

/**
 * Normalize a Firestore doc into the shape app.js already expects.
 */
function normalize(cfg, docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    _collection: cfg.name,
    title: data[cfg.titleField] || "Untitled",
    description: data[cfg.descField] || data.answer || "",
    category: data[cfg.categoryField] || "",
    keywords: data[cfg.keywordField] || []
  };
}

/**
 * Search ALL configured collections in parallel and merge results.
 * Returns { docs, perCollection } where docs is the merged top-N list.
 */
export async function searchAllCollections(term, pageSize = 20) {
  const searchLower = term.toLowerCase().trim();
  const tokens = extractTokens(term);

  // Phase 1: run prefix searches on every collection in parallel
  const prefixResults = await Promise.all(
    SEARCHABLE_COLLECTIONS.map(cfg => prefixSearch(cfg, searchLower, pageSize))
  );

  let merged = prefixResults.flat();

  // Phase 2: if prefix search was thin, fall back to keyword search
  if (merged.length === 0 && tokens.length > 0) {
    const kwResults = await Promise.all(
      SEARCHABLE_COLLECTIONS.map(cfg => keywordSearch(cfg, tokens, pageSize))
    );
    merged = kwResults.flat();
  }

  // Dedupe by id (same doc could appear via multiple paths)
  const seen = new Set();
  const deduped = [];
  for (const item of merged) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }

  // Sort: exact prefix matches first, then by keyword score
  deduped.sort((a, b) => {
    const aPrefix = a.title.toLowerCase().startsWith(searchLower) ? 1 : 0;
    const bPrefix = b.title.toLowerCase().startsWith(searchLower) ? 1 : 0;
    if (aPrefix !== bPrefix) return bPrefix - aPrefix;
    return (b._score || 0) - (a._score || 0);
  });

  return deduped.slice(0, pageSize);
}

/**
 * Extract search tokens — mirrors highlight.js so scoring is consistent.
 */
function extractTokens(query) {
  const STOP = new Set([
    "the","a","an","is","are","was","were","be","been","being",
    "of","in","on","at","to","for","with","by","from","as",
    "and","or","but","if","then","so","than","that","this","these","those",
    "it","its","i","you","he","she","we","they","them","my","your",
    "our","their","me","us","do","does","did","can","could","will","would",
    "should","may","might","must","have","has","had","about","into","over",
    "what","which","who","whom","whose","when","where","why","how",
    "tell","give","show","need","want","know","find","get","see"
  ]);
  return String(query || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOP.has(w));
}
