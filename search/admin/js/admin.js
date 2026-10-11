// admin/js/admin.js
console.log("🟢 admin.js loaded");

import { requireAdmin, logout, db } from "../../scripts/auth.js";
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc,
  onSnapshot, serverTimestamp, query, orderBy, getDocs, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const COLLECTION = "resources";

// ============================================================
// STOP WORDS + SYNONYMS (school-focused)
// ============================================================
const STOP_WORDS = new Set([
  "the","a","an","is","are","was","were","be","been","being",
  "of","in","on","at","to","for","with","by","from","as",
  "and","or","but","if","then","so","than","that","this","these","those",
  "it","its","i","you","he","she","we","they","them","my","your",
  "our","their","me","us","do","does","did","can","could","will","would",
  "should","may","might","must","have","has","had","about","into","over",
  "what","which","who","whom","whose","when","where","why","how",
  "tell","give","show","need","want","know","find","get","see"
]);

const SYNONYMS = {
  "fee":         ["fees","tuition","payment","payments","cost","costs","charges","price","pricing"],
  "fees":        ["fee","tuition","payment","payments","cost","costs","charges","price","pricing"],
  "tuition":     ["fees","fee","payment","cost","charges"],
  "payment":     ["pay","payments","fee","fees","tuition","cost"],
  "cost":        ["costs","fee","fees","price","pricing","charges","payment"],
  "structure":   ["structures","breakdown","plan","plans","schedule","schedules","details"],
  "scholarship": ["scholarships","bursary","bursaries","sponsorship","aid"],
  "bursary":     ["bursaries","scholarship","scholarships","sponsorship","aid"],

  "admission":   ["admissions","apply","application","applications","enroll","enrollment","register","registration","join"],
  "apply":       ["application","applications","admissions","enroll","enrollment","register","registration"],
  "enroll":      ["enrolls","enrolled","enrollment","admission","admissions","register","registration","apply"],
  "register":    ["registers","registration","enroll","enrollment","admission","apply","application"],
  "requirements":["requirement","needed","required","documents","papers"],
  "intake":      ["intakes","admission","admissions","enrollment","session"],

  "school":      ["schools","academy","college","institution","campus","institute"],
  "student":     ["students","pupil","pupils","learner","learners","child","children"],
  "teacher":     ["teachers","tutor","tutors","instructor","staff","faculty"],
  "staff":       ["teachers","teacher","employees","faculty","personnel","administration"],
  "headteacher": ["head","principal","headmaster","headmistress","director","administration"],
  "principal":   ["head","headteacher","headmaster","headmistress","director"],
  "class":       ["classes","course","courses","grade","grades","form","level"],
  "subject":     ["subjects","course","courses","lesson","lessons","topic","topics"],
  "course":      ["courses","class","classes","subject","subjects","program","programs"],
  "term":        ["terms","semester","semesters","session","sessions"],
  "semester":    ["semesters","term","terms","session"],
  "holiday":     ["holidays","break","vacation","closing","recess"],
  "timetable":   ["schedule","schedules","routine"],

  "event":       ["events","activity","activities","function","ceremony"],
  "news":        ["announcements","updates","notice","notices","bulletin"],
  "announcement":["announcements","notice","notices","news","updates"],
  "exam":        ["exams","examination","examinations","test","tests","assessment","assessments"],
  "result":      ["results","grade","grades","score","scores","marks"],
  "graduation":  ["graduations","commencement","ceremony","prize giving"],

  "policy":      ["policies","rules","regulations","guidelines","conduct"],
  "rules":       ["rule","policy","policies","regulations","guidelines","conduct"],
  "uniform":     ["uniforms","dress code","attire","clothing"],
  "attendance":  ["absent","absence","attend","present","punctuality"],

  "contact":     ["contacts","reach","phone","telephone","email","address","location","direction"],
  "location":    ["locations","address","place","campus","directions","map"],
  "office":      ["administration","admin","front office","secretary","reception"]
};

function buildKeywords(...parts) {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  const base = [...new Set(
    text.replace(/[^\w\s]/g, " ").split(/\s+/)
      .filter(w => w.length >= 2)
      .filter(w => !STOP_WORDS.has(w))
  )];
  const expanded = new Set(base);

  for (const w of base) {
    if (w.endsWith("s") && w.length > 3) {
      expanded.add(w.slice(0, -1));
      if (w.endsWith("es") && w.length > 4) expanded.add(w.slice(0, -2));
    } else {
      expanded.add(w + "s");
      if (w.endsWith("y") && w.length > 2) expanded.add(w.slice(0, -1) + "ies");
      if (w.endsWith("ch") || w.endsWith("sh") || w.endsWith("x")) expanded.add(w + "es");
    }
    const syns = SYNONYMS[w];
    if (syns) for (const s of syns) expanded.add(s);
  }

  return [...expanded];
}

// ============================================================
// DOM
// ============================================================
const authLoader  = document.getElementById("authLoader");
const adminView   = document.getElementById("adminView");
const userEmailEl = document.getElementById("userEmail");
const logoutBtn   = document.getElementById("logoutBtn");

const navItems     = document.querySelectorAll(".nav-item");
const tabAdd       = document.getElementById("tab-add");
const tabProducts  = document.getElementById("tab-products");
const tabAnalytics = document.getElementById("tab-analytics");

const productForm  = document.getElementById("productForm");
const formTitle    = document.getElementById("formTitle");
const formSubtitle = document.getElementById("formSubtitle");
const productIdEl  = document.getElementById("productId");
const nameEl       = document.getElementById("name");
const descEl       = document.getElementById("description");
const catEl        = document.getElementById("category");
const submitBtn    = document.getElementById("submitBtn");
const cancelBtn    = document.getElementById("cancelBtn");
const formFeedback = document.getElementById("formFeedback");

const adminList    = document.getElementById("adminList");
const productCount = document.getElementById("productCount");

const refreshAnalytics   = document.getElementById("refreshAnalytics");
const statTotalSearches  = document.getElementById("statTotalSearches");
const statUniqueTerms    = document.getElementById("statUniqueTerms");
const statTopTerm        = document.getElementById("statTopTerm");
const topTermsList       = document.getElementById("topTermsList");
const recentSearchesList = document.getElementById("recentSearchesList");

const toastEl = document.getElementById("toast");

let unsubscribeResources = null;

// ============================================================
// AUTH GUARD
// ============================================================
(async function guard() {
  try {
    const user = await requireAdmin();
    if (!user) {
      window.location.replace("login.html");
      return;
    }
    authLoader.classList.add("hidden");
    adminView.classList.remove("hidden");
    userEmailEl.textContent = user.email || user.uid;
    startResourceListener();
  } catch (err) {
    console.error("[Admin] Guard failed:", err);
    authLoader.innerHTML = `
      <p>Could not verify admin session.</p>
      <p style="font-size:.8rem;color:#94a3b8;margin-top:.5rem">${err.message || ""}</p>
      <button onclick="location.reload()" class="btn primary sm" style="margin-top:1rem">Retry</button>
    `;
  }
})();

// ============================================================
// LOGOUT
// ============================================================
logoutBtn.addEventListener("click", async () => {
  try {
    if (unsubscribeResources) unsubscribeResources();
    await logout();
  } finally {
    window.location.replace("login.html");
  }
});

// ============================================================
// TAB SWITCHING
// ============================================================
navItems.forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    navItems.forEach(b => b.classList.toggle("active", b === btn));

    tabAdd.classList.toggle("hidden", tab !== "add");
    tabProducts.classList.toggle("hidden", tab !== "products");
    tabAnalytics.classList.toggle("hidden", tab !== "analytics");

    if (tab === "analytics") loadAnalytics();
    if (tab === "products") waitForLayout().then(() => applyReadMoreButtons(adminList));
  });
});

// ============================================================
// RESOURCES (live)
// ============================================================
function startResourceListener() {
  const q = query(collection(db, COLLECTION), orderBy("titleLower"));
  unsubscribeResources = onSnapshot(q,
    (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderAdminList(items);
    },
    (err) => {
      console.error(err);
      adminList.innerHTML = `<li class="feedback error">Failed to load resources.</li>`;
    }
  );
}

/**
 * Renders the admin resource list with:
 *  - Title on its own line
 *  - Category badge on its own row
 *  - Description clamped to 3 lines, with a "Read more" toggle if needed
 *  - Edit / Delete buttons
 */
function renderAdminList(items) {
  productCount.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;

  if (items.length === 0) {
    adminList.innerHTML = `<li class="empty">No resources yet. Add your first one ⬅️</li>`;
    return;
  }

  adminList.innerHTML = items.map(p => {
    const title       = p.title || "Untitled";
    const description = p.description || "No description";
    const category    = p.category || "";
    const id          = `desc-${p.id}`;

    return `
      <li>
        <div class="info">
          <strong>${escapeHtml(title)}</strong>
          ${category ? `<div class="cat-row"><span class="cat">${escapeHtml(category)}</span></div>` : ""}
          <div class="desc-text" id="${id}">${escapeHtml(description)}</div>
        </div>
        <div class="actions">
          <button class="btn ghost sm" data-action="edit" data-id="${p.id}">Edit</button>
          <button class="btn danger sm" data-action="delete" data-id="${p.id}">Delete</button>
        </div>
      </li>
    `;
  }).join("");

  // 👇 Wait for CSS + fonts + two frames, then measure and inject buttons
  waitForLayout().then(() => applyReadMoreButtons(adminList));
}

/**
 * Resolves once fonts are loaded and the browser has painted twice.
 * Double rAF guarantees layout has settled after DOM insertion.
 */
function waitForLayout() {
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const framesReady = new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  return Promise.all([fontsReady, framesReady]);
}

/**
 * Insert a "Read more" toggle after any .desc-text that visually overflows.
 * Safe to call repeatedly — processed nodes are skipped.
 */
function applyReadMoreButtons(scope = document) {
  const texts = scope.querySelectorAll(".desc-text:not([data-processed])");

  texts.forEach((el) => {
    el.dataset.processed = "1";

    const overflowBy = el.scrollHeight - el.clientHeight;
    const overflows = overflowBy > 2;

    console.log(`[ReadMore] ${el.id} overflow=${overflows} (scroll: ${el.scrollHeight}, client: ${el.clientHeight})`);

    if (!overflows) return;

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
}

// ============================================================
// LIST ACTIONS (edit / delete)
// ============================================================
adminList.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === "edit") {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (snap.exists()) {
      startEdit(id, snap.data());
      navItems.forEach(b => b.classList.toggle("active", b.dataset.tab === "add"));
      tabAdd.classList.remove("hidden");
      tabProducts.classList.add("hidden");
      tabAnalytics.classList.add("hidden");
    }
  }

  if (action === "delete") {
    if (!confirm("Delete this resource?")) return;
    try {
      await deleteDoc(doc(db, COLLECTION, id));
      toast("Resource deleted", "success");
    } catch (err) {
      console.error(err);
      toast("Delete failed: " + err.message, "error");
    }
  }
});

// ============================================================
// FORM
// ============================================================
function startEdit(id, data) {
  productIdEl.value = id;
  nameEl.value      = data.title || "";
  descEl.value      = data.description || "";
  catEl.value       = data.category || "other";
  formTitle.textContent = "Edit Resource";
  formSubtitle.textContent = "Update the details below";
  submitBtn.querySelector(".btn-label").textContent = "Update Resource";
  cancelBtn.classList.remove("hidden");
  nameEl.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  productIdEl.value = "";
  productForm.reset();
  formTitle.textContent = "Add Resource";
  formSubtitle.textContent = "Fill in the details below";
  submitBtn.querySelector(".btn-label").textContent = "Save Resource";
  cancelBtn.classList.add("hidden");
  formFeedback.classList.add("hidden");
}

cancelBtn.addEventListener("click", resetForm);

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formFeedback.classList.add("hidden");

  const id          = productIdEl.value;
  const title       = nameEl.value.trim();
  const description = descEl.value.trim();
  const category    = catEl.value;

  if (!title) return flashForm("Title is required.", "error");

  const keywords = buildKeywords(title, description, category);

  const payload = {
    title,
    titleLower: title.toLowerCase(),
    description,
    category,
    keywords,
    updatedAt: serverTimestamp()
  };

  setBtnLoading(submitBtn, true);

  try {
    if (id) {
      await updateDoc(doc(db, COLLECTION, id), payload);
      toast("Resource updated", "success");
    } else {
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, COLLECTION), payload);
      toast("Resource added", "success");
    }
    resetForm();
  } catch (err) {
    console.error(err);
    flashForm("❌ " + (err?.message || "Save failed."), "error");
    toast("Save failed", "error");
  } finally {
    setBtnLoading(submitBtn, false);
  }
});

function flashForm(msg, type) {
  formFeedback.textContent = msg;
  formFeedback.className = "feedback " + type;
  setTimeout(() => formFeedback.classList.add("hidden"), 3500);
}

// ============================================================
// ANALYTICS
// ============================================================
refreshAnalytics.addEventListener("click", loadAnalytics);

async function loadAnalytics() {
  topTermsList.innerHTML = `<li class="empty">Loading…</li>`;
  recentSearchesList.innerHTML = `<li class="empty">Loading…</li>`;

  try {
    const termsSnap = await getDocs(
      query(collection(db, "searchCounts"), orderBy("count", "desc"), limit(10))
    );
    const terms = termsSnap.docs.map(d => d.data());
    renderTopTerms(terms);

    const recentSnap = await getDocs(
      query(collection(db, "searchLogs"), orderBy("at", "desc"), limit(20))
    );
    const recent = recentSnap.docs.map(d => d.data());
    renderRecentSearches(recent);

    statTotalSearches.textContent = recent.length === 20 ? "20+" : String(recent.length);
    statUniqueTerms.textContent   = String(terms.length);
    statTopTerm.textContent       = terms[0]?.term || "—";
  } catch (err) {
    console.error(err);
    topTermsList.innerHTML =
      `<li class="feedback error">Failed to load analytics: ${escapeHtml(err.message)}</li>`;
  }
}

function renderTopTerms(terms) {
  if (terms.length === 0) {
    topTermsList.innerHTML = `<li class="empty">No searches yet.</li>`;
    return;
  }
  const max = Math.max(...terms.map(t => t.count || 1));
  topTermsList.innerHTML = terms.map((t, i) => {
    const pct  = Math.round(((t.count || 0) / max) * 100);
    const last = t.lastAt?.toDate?.();
    const when = last ? timeAgo(last) : "";
    return `
      <li>
        <span class="rank">${i + 1}</span>
        <div class="term-info">
          <div class="term-name">${escapeHtml(t.term)}</div>
          <div class="term-meta">${when ? "Last: " + when : ""}</div>
        </div>
        <div class="bar-wrap">
          <div class="bar"><span style="width:${pct}%"></span></div>
          <span class="count">${t.count}</span>
        </div>
      </li>
    `;
  }).join("");
}

function renderRecentSearches(items) {
  if (items.length === 0) {
    recentSearchesList.innerHTML = `<li class="empty">No searches logged yet.</li>`;
    return;
  }
  recentSearchesList.innerHTML = items.map(s => {
    const when = s.at?.toDate ? timeAgo(s.at.toDate()) : "";
    const cat  = s.category && s.category !== "all"
      ? ` · ${escapeHtml(s.category)}` : "";
    return `
      <li>
        <span class="term">${escapeHtml(s.term)}</span>
        <span class="when">${when}${cat}</span>
      </li>
    `;
  }).join("");
}

// ============================================================
// HELPERS
// ============================================================
function setBtnLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle("loading", loading);
  btn.disabled = loading;
}

let toastTimer;
function toast(message, type = "info") {
  toastEl.textContent = message;
  toastEl.className = "toast " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 2800);
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));
}