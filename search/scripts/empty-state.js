// scripts/empty-state.js
import { db } from "./auth.js";
import {
  collection, query, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { escapeHtml } from "./highlight.js";

const COLLECTION = "resources";    // 👈 CHANGED

export async function loadPopular(limitN = 6) {
  try {
    const snap = await getDocs(
      query(collection(db, COLLECTION), orderBy("titleLower"), limit(limitN))
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[EmptyState] failed:", err);
    return [];
  }
}

export function renderPopular(items, container, onPick) {
  if (!items.length) {
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");
  const list = container.querySelector("#popularList");
  list.innerHTML = items.map(p => `
    <li data-title="${escapeHtml(p.title)}">
      <span class="pop-name">${escapeHtml(p.title || "Untitled")}</span>
      ${p.category ? `<span class="pop-cat">${escapeHtml(p.category)}</span>` : ""}
    </li>
  `).join("");

  list.querySelectorAll("li").forEach(li => {
    li.addEventListener("click", () => {
      const title = li.dataset.title;
      if (title) onPick(title);
    });
  });
}

export function hidePopular(container) {
  container.classList.add("hidden");
}