// search/scripts/app.js
console.log("🟢 app.js loaded");

import { db } from "./auth.js";
import { logSearch } from "./search-analytics.js";
import {
  collection, query, orderBy, startAt, endAt, where,
  limit, getDocs, startAfter
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getHistory, addToHistory, removeFromHistory,
  fetchTrending, buildSuggestions
} from "./suggestions.js";

import { loadPopular, renderPopular, hidePopular } from "./empty-state.js";
import { highlightTokens, escapeHtml, extractTokens } from "./highlight.js";
import { createPaginator } from "./pagination.js";
import { findClosest } from "./fuzzy.js";
import { recordVote, hasVoted } from "./feedback.js";
import { initQuickLinks } from "./quick-links.js";
import { initContactFloat } from "./contact-float.js";
import { initAnnouncements } from "./announcements.js";
import { shareResource, focusSharedResult } from "./share.js";
import { loadRelated, renderRelatedChips } from "./related.js";

// ============================================================
// COLLECTION & DOM
// ============================================================
const COLLECTION = "resources";

const input          = document.getElementById("searchInput");
const spinner        = document.getElementById("spinner");
const clearBtn       = document.getElementById("clearBtn");
const feedback       = document.getElementById("feedback");
const resultsUl      = document.getElementById("results");
const filterBar      = document.getElementById("filterBar");
const suggestionsBox = document.getElementById("suggestionsBox");
const searchWrapper  = document.getElementById("searchWrapper");
const emptyState     = document.getElementById("emptyState");
const loadMoreWrap   = document.getElementById("loadMoreWrap");
const loadMoreBtn    = document.getElementById("loadMoreBtn");
const loadMoreStatus = document.getElementById("loadMoreStatus");
const quickLinks     = document.getElementById("quickLinks");

const answerCard     = document.getElementById("answerCard");
const answerTitle    = document.getElementById("answerTitle");
const answerText     = document.getElementById("answerText");
const answerRate     = document.getElementById("answerRate");
const answerShare    = document.getElementById("answerShare");

const searchBar      = document.getElementById("searchBar");
const searchCloseBtn = document.getElementById("searchCloseBtn");
const searchToggleBtn= document.querySelector(".search-toggle");

// ============================================================
// STATE
// ============================================================
let debounceTimer = null;
let suggestTimer = null;
let currentRequestId = 0;
let activeCategory = "all";
let lastResults = [];
let activeSuggestionIndex = -1;
let suggestionItems = [];
let currentAnswer = null;
let cachedTrending = []; 

const paginator = createPaginator();
const relatedCache = new Map();

const PAGE_SIZE = 20;

// ============================================================
// INIT
// ============================================================
(async function init() {
  initContactFloat();
  initQuickLinks((category) => {
    activeCategory = category;
    filterBar.querySelectorAll(".filter-chip")
      .forEach(c => c.classList.toggle("active", c.dataset.category === category));
    const term = input.value.trim() || category;
    input.value = term;
    input.dispatchEvent(new Event("input"));
  });
  initAnnouncements();

  cachedTrending = await fetchTrending(5);

  const popular = await loadPopular(6);
  renderPopular(popular, emptyState, (title) => {
    input.value = title;
    input.dispatchEvent(new Event("input"));
  });
})();

// ============================================================
// OVERLAY OPEN/CLOSE
// ============================================================
function openSearch() {
  if (!searchBar) return;
  searchBar.style.display = "block";
  document.body.classList.add("search-open");
  requestAnimationFrame(() => input?.focus());
}

function closeSearch() {
  if (!searchBar) return;
  searchBar.style.display = "none";
  document.body.classList.remove("search-open");
}

searchToggleBtn?.addEventListener("click", (e) => { e.preventDefault(); openSearch(); });
searchCloseBtn?.addEventListener("click", (e) => { e.preventDefault(); closeSearch(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && searchBar && searchBar.style.display === "block") closeSearch();
});

// ============================================================
// INPUT EVENTS
// ============================================================
input.addEventListener("input", () => {
  const term = input.value.trim();
  clearBtn.classList.toggle("hidden", term.length === 0);

  // We are KEEPING the Quick Links and Filter Bar visible now
  
  clearTimeout(suggestTimer);
  suggestTimer = setTimeout(() => showSuggestions(term), 120);

  if (!term) {
    resetUI({ keepEmptyState: true });
    showEmptyStateIfIdle();
    return;
  }

  hidePopular(emptyState);
  hideAnswer();
  showLoading();
  
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    hideSuggestions(); 
    performSearch(term);
  }, 300);
});

input.addEventListener("focus", () => {
  showSuggestions(input.value.trim());
});

input.addEventListener("blur", () => {
  setTimeout(() => hideSuggestions(), 150);
});

input.addEventListener("keydown", (e) => {
  if (suggestionsBox.classList.contains("hidden")) return;
  const items = suggestionsBox.querySelectorAll(".sug-item");
  if (!items.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, items.length - 1);
    updateSuggestionActive(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
    updateSuggestionActive(items);
  } else if (e.key === "Enter") {
    if (activeSuggestionIndex >= 0 && items[activeSuggestionIndex]) {
      e.preventDefault();
      items[activeSuggestionIndex].click();
    }
  } else if (e.key === "Escape") {
    hideSuggestions();
  }
});

// ============================================================
// SUGGESTIONS DROPDOWN
// ============================================================
async function showSuggestions(term) {
  const isTyping = term.length > 0;
  let data;

  if (isTyping) {
    data = await buildSuggestions(term);
  } else {
    const history = getHistory();
    const sections = [];

    if (history.length > 0) {
      sections.push({
        label: "Recent Searches",
        items: history.map(h => ({ type: "history", text: h }))
      });
    }

    if (cachedTrending.length > 0) {
      sections.push({
        label: "Popular Right Now",
        items: cachedTrending.map(t => ({ type: "popular", text: t.term, count: t.count }))
      });
    }
    data = { sections };
  }

  if (!data.sections.length) return hideSuggestions();

  const flat = [];
  const html = data.sections.map(section => {
    const items = section.items.map(item => {
      flat.push(item);
      const idx = flat.length - 1;
      
      const icon = item.type === "resource" ? "📄"
                 : item.type === "popular" ? "🔥"
                 : "🕘";
                 
      const count = item.count ? `<span class="sug-count">${item.count}</span>` : "";
      
      const removeBtn = item.type === "history"
        ? `<button class="sug-remove" data-remove="${escapeHtml(item.text)}" aria-label="Remove">✕</button>`
        : "";
        
      return `
        <button class="sug-item" data-index="${idx}" data-text="${escapeHtml(item.text)}">
          <span class="sug-icon">${icon}</span>
          <span class="sug-text">${escapeHtml(item.text)}</span>
          ${count}
          ${removeBtn}
        </button>
      `;
    }).join("");
    return `<div class="sug-section">${section.label}</div>${items}`;
  }).join("");

  suggestionsBox.innerHTML = html;
  suggestionsBox.classList.remove("hidden");
  suggestionItems = flat;
  activeSuggestionIndex = -1;

  suggestionsBox.querySelectorAll(".sug-item").forEach(el => {
    el.addEventListener("click", (e) => {
      if (e.target.classList.contains("sug-remove")) return;
      input.value = el.dataset.text;
      hideSuggestions();
      input.dispatchEvent(new Event("input"));
    });
  });

  suggestionsBox.querySelectorAll(".sug-remove").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      removeFromHistory(el.dataset.remove);
      showSuggestions(input.value.trim()); 
    });
  });
}

function updateSuggestionActive(items) {
  items.forEach((el, i) => el.classList.toggle("active", i === activeSuggestionIndex));
  if (items[activeSuggestionIndex]) {
    items[activeSuggestionIndex].scrollIntoView({ block: "nearest" });
  }
}

function hideSuggestions() {
  suggestionsBox.classList.add("hidden");
  activeSuggestionIndex = -1;
}

document.addEventListener("click", (e) => {
  if (!searchWrapper.contains(e.target)) hideSuggestions();
});

// ============================================================
// CLEAR BUTTON
// ============================================================
clearBtn.addEventListener("click", () => {
  input.value = "";
  input.focus();
  clearBtn.classList.add("hidden");
  
  hideAnswer();
  resetUI({ keepEmptyState: true });
  showEmptyStateIfIdle();
  showSuggestions(""); 
});

// ============================================================
// SEARCH & RENDER
// ============================================================
async function performSearch(term) {
  const requestId = ++currentRequestId;
  const searchLower = term.toLowerCase().trim();
  const tokens = extractTokens(term);

  paginator.reset();
  hideAnswer();

  try {
    let docs = [];
    const prefixSnap = await getDocs(
      query(collection(db, COLLECTION), orderBy("titleLower"), startAt(searchLower), endAt(searchLower + "\uf8ff"), limit(PAGE_SIZE))
    );
    docs = prefixSnap.docs;

    if (docs.length === 0 && tokens.length > 0) {
      const seenIds = new Set();
      const candidates = [];
      for (const token of tokens) {
        const kwSnap = await getDocs(query(collection(db, COLLECTION), where("keywords", "array-contains", token), limit(50)));
        for (const d of kwSnap.docs) {
          if (seenIds.has(d.id)) continue;
          seenIds.add(d.id);
          const data = d.data();
          const kws = Array.isArray(data.keywords) ? data.keywords : [];
          const matches = tokens.filter(t => kws.includes(t)).length;
          candidates.push({ doc: d, matches });
        }
        if (candidates.length >= PAGE_SIZE) break;
      }
      docs = candidates.sort((a, b) => b.matches - a.matches).slice(0, PAGE_SIZE).map(c => c.doc);
    }

    if (requestId !== currentRequestId) return;

    const lastDoc = docs[docs.length - 1];
    if (lastDoc) paginator.setLastDoc(lastDoc);
    if (docs.length < PAGE_SIZE) paginator.markExhausted();

    addToHistory(term);
    logSearch(term, activeCategory);

    lastResults = docs.map(d => ({ id: d.id, ...d.data() }));
    applyCategoryAndRender(term);

    if (lastResults.length > 0) {
      showAnswerIfStrongMatch(lastResults[0], term);
    } else {
      await suggestCorrection(term, tokens);
    }
  } catch (err) {
    if (requestId !== currentRequestId) return;
    console.error("Search error:", err);
    showError("Something went wrong. Please try again.");
  }
}

// ============================================================
// LOAD MORE
// ============================================================
loadMoreBtn.addEventListener("click", loadMore);
async function loadMore() {
  if (paginator.exhausted || !paginator.lastDoc) return;
  const term = input.value.trim().toLowerCase();
  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = "Loading…";

  try {
    const snap = await getDocs(
      query(collection(db, COLLECTION), orderBy("titleLower"), startAfter(paginator.lastDoc), limit(PAGE_SIZE))
    );
    const newDocs = snap.docs;
    if (newDocs.length < PAGE_SIZE) paginator.markExhausted();
    if (newDocs.length) paginator.setLastDoc(newDocs[newDocs.length - 1]);

    const items = newDocs.map(d => ({ id: d.id, ...d.data() }));
    lastResults.push(...items);
    await appendResults(items, term);
    updateLoadMoreUI();
  } catch (err) {
    console.error("Load more failed:", err);
  } finally {
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = "Load more";
  }
}

function updateLoadMoreUI() {
  if (paginator.exhausted) {
    loadMoreWrap.classList.remove("hidden");
    loadMoreBtn.classList.add("hidden");
    loadMoreStatus.textContent = "— End of results —";
  } else {
    loadMoreWrap.classList.remove("hidden");
    loadMoreBtn.classList.remove("hidden");
    loadMoreStatus.textContent = "";
  }
}

// ============================================================
// DID YOU MEAN
// ============================================================
async function suggestCorrection(term, tokens) {
  try {
    const snap = await getDocs(query(collection(db, "searchCounts"), orderBy("count", "desc"), limit(200)));
    const candidates = snap.docs.map(d => d.data().term).filter(Boolean);
    if (!candidates.length) return;

    const corrections = [];
    for (const token of tokens) {
      const close = findClosest(token, candidates, 2);
      if (close.length && close[0].toLowerCase() !== token) {
        corrections.push({ from: token, to: close[0] });
      }
    }
    if (!corrections.length) return;

    let suggested = term;
    for (const c of corrections) suggested = suggested.replace(new RegExp(`\\b${c.from}\\b`, "gi"), c.to);
    showDidYouMean(suggested);
  } catch (err) { console.warn("[DidYouMean] failed:", err); }
}

function showDidYouMean(suggestion) {
  removeDidYouMean();
  const el = document.createElement("div");
  el.className = "did-you-mean";
  el.id = "didYouMean";
  el.innerHTML = `Did you mean <button type="button">${escapeHtml(suggestion)}</button>?`;
  el.querySelector("button").addEventListener("click", () => {
    input.value = suggestion;
    input.dispatchEvent(new Event("input"));
    el.remove();
  });
  feedback.parentNode.insertBefore(el, feedback);
}

function removeDidYouMean() { document.getElementById("didYouMean")?.remove(); }

// ============================================================
// ANSWER CARD
// ============================================================
function showAnswerIfStrongMatch(item, term) {
  const tokens = extractTokens(term);
  if (tokens.length === 0) return;

  const kws = Array.isArray(item.keywords) ? item.keywords : [];
  const matchCount = tokens.filter(t => kws.includes(t)).length;
  const ratio = matchCount / tokens.length;
  if (ratio < 0.6) return;

  currentAnswer = item;
  answerTitle.textContent = item.title || "Untitled";
  answerText.textContent = item.description || item.answer || "";
  answerCard.classList.remove("hidden");

  const prev = hasVoted(item.id);
  answerRate.querySelectorAll(".rate-btn").forEach(btn => {
    btn.disabled = !!prev;
    btn.classList.toggle("voted-" + (prev === "yes" ? "yes" : "no"), prev === btn.dataset.vote);
  });

  answerShare.onclick = () => shareResource(item.id, item.title);
}

function hideAnswer() {
  answerCard.classList.add("hidden");
  currentAnswer = null;
}

answerRate.addEventListener("click", async (e) => {
  const btn = e.target.closest(".rate-btn");
  if (!btn || !currentAnswer || btn.disabled) return;
  const vote = btn.dataset.vote;
  const result = await recordVote(currentAnswer.id, vote);
  if (result.ok) {
    answerRate.querySelectorAll(".rate-btn").forEach(b => {
      b.disabled = true;
      if (b === btn) b.classList.add("voted-" + (vote === "yes" ? "yes" : "no"));
    });
  }
});

// ============================================================
// RENDER
// ============================================================
function applyCategoryAndRender(term) {
  spinner.classList.add("hidden");
  let items = lastResults;
  if (activeCategory !== "all") items = items.filter(i => i.category === activeCategory);
  renderResults(items, term);
  updateLoadMoreUI();
}

async function renderResults(items, term) {
  spinner.classList.add("hidden");

  if (items.length === 0) {
    resultsUl.innerHTML = "";
    const suffix = activeCategory !== "all" ? ` in ${activeCategory}` : "";
    showEmpty(`No results found for "${term}"${suffix}`);
    return;
  }

  feedback.classList.add("hidden");
  resultsUl.innerHTML = items.map(renderResultItem(term)).join("");
  await enrichResults(items);
  focusSharedResult();
}

async function appendResults(items, term) {
  resultsUl.insertAdjacentHTML("beforeend", items.map(renderResultItem(term)).join(""));
  await enrichResults(items);
}

function renderResultItem(term) {
  return (item) => {
    const title = item.title ?? "Untitled";
    const description = item.description ?? item.answer ?? "";
    const category = item.category ?? "";
    const id = `desc-${item.id}`;

    return `
      <li data-result-id="${item.id}">
        <div class="result-body">
          <strong>
            ${highlightTokens(title, term)}
            ${category ? `<span class="cat-badge">${escapeHtml(category)}</span>` : ""}
          </strong>
          <div class="result-text" id="${id}" data-clamped="true">
            ${highlightTokens(description, term)}
          </div>
          <div class="result-actions">
            <button class="share-btn" data-share-id="${item.id}" data-share-title="${escapeHtml(title)}">🔗 Share</button>
          </div>
          <div class="related-slot" data-related-for="${item.id}"></div>
        </div>
      </li>
    `;
  };
}

async function enrichResults(items) {
  applyReadMoreButtons(resultsUl);

  resultsUl.querySelectorAll(".share-btn:not([data-wired])").forEach(btn => {
    btn.dataset.wired = "1";
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await shareResource(btn.dataset.shareId, btn.dataset.shareTitle);
    });
  });

  for (const item of items) {
    const slot = resultsUl.querySelector(`[data-related-for="${item.id}"]`);
    if (!slot || slot.dataset.loaded === "1") continue;
    slot.dataset.loaded = "1";

    let related = relatedCache.get(item.id);
    if (!related) {
      related = await loadRelated(item, 3);
      relatedCache.set(item.id, related);
    }
    if (related.length) {
      slot.innerHTML = renderRelatedChips(related);
      slot.querySelectorAll(".related-chip").forEach(chip => {
        chip.addEventListener("click", () => {
          input.value = chip.dataset.relatedTitle;
          input.dispatchEvent(new Event("input"));
        });
      });
    }
  }
}

function applyReadMoreButtons(scope = document) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    scope.querySelectorAll(".result-text:not([data-processed])").forEach(el => {
      el.dataset.processed = "1";
      if (el.scrollHeight <= el.clientHeight + 2) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "read-more-btn";
      btn.textContent = "Read more";
      btn.setAttribute("aria-expanded", "false");

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const expanded = el.classList.toggle("expanded");
        btn.textContent = expanded ? "Show less" : "Read more";
        btn.setAttribute("aria-expanded", expanded ? "true" : "false");
      });
      el.insertAdjacentElement("afterend", btn);
    });
  }));
}

// ============================================================
// UI STATES
// ============================================================
function showEmptyStateIfIdle() {
  if (!input.value.trim() && !lastResults.length) emptyState.classList.remove("hidden");
}

function showLoading() {
  spinner.classList.remove("hidden");
  feedback.classList.add("hidden");
  resultsUl.innerHTML = "";
  loadMoreWrap.classList.add("hidden");
  removeDidYouMean();
}

function showEmpty(message) {
  feedback.textContent = "😕 " + message;
  feedback.className = "feedback empty";
}

function showError(message) {
  spinner.classList.add("hidden");
  resultsUl.innerHTML = "";
  loadMoreWrap.classList.add("hidden");
  feedback.textContent = "⚠️ " + message;
  feedback.className = "feedback error";
}

function resetUI(opts = {}) {
  spinner.classList.add("hidden");
  feedback.classList.add("hidden");
  feedback.textContent = "";
  resultsUl.innerHTML = "";
  loadMoreWrap.classList.add("hidden");
  lastResults = [];
  paginator.reset();
  removeDidYouMean();
  if (!opts.keepEmptyState) {
    emptyState.classList.add("hidden");
  } else {
    showEmptyStateIfIdle();
  }
}