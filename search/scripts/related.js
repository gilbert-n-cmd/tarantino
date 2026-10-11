// scripts/related.js
import { db } from "./auth.js";
import {
  collection, query, where, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Load up to N related resources based on the item's category.
 * Filters out the item itself.
 */
export async function loadRelated(item, limitN = 3) {
  if (!item || !item.category) return [];

  try {
    const q = query(
      collection(db, "resources"),
      where("category", "==", item.category),
      limit(limitN + 1)
    );
    const snap = await getDocs(q);
    return snap.docs
      .filter(d => d.id !== item.id)
      .slice(0, limitN)
      .map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[Related] failed:", err);
    return [];
  }
}

/**
 * Render related chips HTML for a resource.
 */
export function renderRelatedChips(related) {
  if (!related.length) return "";

  const chips = related.map(r => `
    <button class="related-chip" data-related-title="${escapeHtml(r.title || "")}">
      ${escapeHtml(r.title || "Untitled")}
    </button>
  `).join("");

  return `
    <div class="related-row">
      <div class="related-label">Related</div>
      <div class="related-chips">${chips}</div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));
}

