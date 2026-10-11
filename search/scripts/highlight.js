// scripts/highlight.js

const STOP_WORDS = new Set([
  // Common English
  "the","a","an","is","are","was","were","be","been","being",
  "of","in","on","at","to","for","with","by","from","as",
  "and","or","but","if","then","so","than","that","this","these","those",
  "it","its","i","you","he","she","we","they","them","my","your",
  "our","their","me","us","do","does","did","can","could","will","would",
  "should","may","might","must","have","has","had","about","into","over",

  // 👇 School-specific question words
  "what","which","who","whom","whose","when","where","why","how",
  "tell","give","show","need","want","know","find","get","see",
  "please","kindly","help","question","answer"
]);

export function extractTokens(query) {
  return String(query || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w));
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightTokens(text, query) {
  const safe = escapeHtml(text);
  const tokens = extractTokens(query);
  if (!tokens.length) return safe;

  const pattern = tokens
    .map(escapeRegex)
    .sort((a, b) => b.length - a.length)
    .join("|");

  const re = new RegExp(`\\b(${pattern})\\b`, "ig");
  return safe.replace(re, "<mark>$1</mark>");
}