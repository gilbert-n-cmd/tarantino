/* ============================================
   FAQ Insights — Admin Analytics
   ============================================ */

import {
  collection, getDocs, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

(function () {
  "use strict";

  let logs = [];
  let wired = false;

  function waitForFirebase() {
    return new Promise((resolve) => {
      if (window.tarantinoAuth?.db) return resolve(window.tarantinoAuth);
      const check = setInterval(() => {
        if (window.tarantinoAuth?.db) {
          clearInterval(check);
          resolve(window.tarantinoAuth);
        }
      }, 50);
      setTimeout(() => clearInterval(check), 10000);
    });
  }

  function escapeHTML(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function formatDate(ts) {
    if (!ts) return "—";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      const diff = Date.now() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      if (days < 7) return `${days}d ago`;
      return d.toLocaleDateString();
    } catch { return "—"; }
  }

  // ============================================
  // LOAD LOGS
  // ============================================
  async function loadLogs() {
    const { db } = await waitForFirebase();
    const list = document.getElementById("faqList");
    if (list) list.textContent = "Loading…";

    try {
      // Read the collection directly. Sorting is done in JavaScript so FAQ
      // Insights does not depend on an index or on every document having a timestamp.
      const snap = await getDocs(collection(db, "faq_logs"));
      logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      logs.sort((a, b) => {
        const at = a.timestamp?.toMillis?.() || 0;
        const bt = b.timestamp?.toMillis?.() || 0;
        return bt - at;
      });
      logs = logs.slice(0, 500);
      console.log(`[FAQ Insights] Loaded ${logs.length} logs`);
      renderFAQ();
    } catch (e) {
      console.error("[FAQ Insights] Load failed:", e);
      if (list) list.innerHTML = `<p style="color:red">Failed to load: ${escapeHTML(e.message)}</p>`;
    }
  }

  // ============================================
  // GROUP + FILTER + RENDER
  // ============================================
  function getGrouped() {
    const timeFilter = document.getElementById("faqTimeFilter")?.value || "all";
    const now = Date.now();

    // Filter by time
    const filtered = logs.filter(l => {
      if (timeFilter === "all") return true;
      const t = l.timestamp?.toMillis?.() || 0;
      const diffDays = (now - t) / (1000 * 60 * 60 * 24);
      if (timeFilter === "1") return diffDays <= 1;
      return diffDays <= Number(timeFilter);
    });

    // Group by normalized question
    const map = new Map();
    filtered.forEach(l => {
      const key = l.question || "(empty)";
      if (!map.has(key)) {
        map.set(key, {
          question: key,
          originalQuestion: l.originalQuestion || key,
          count: 0,
          lastAsked: 0,
          firstSeen: Infinity
        });
      }
      const entry = map.get(key);
      entry.count++;
      const t = l.timestamp?.toMillis?.() || 0;
      if (t > entry.lastAsked) entry.lastAsked = t;
      if (t < entry.firstSeen) entry.firstSeen = t;
    });

    return Array.from(map.values());
  }

  function renderFAQ() {
    const list = document.getElementById("faqList");
    if (!list) return;

    let grouped = getGrouped();

    // Search filter
    const search = (document.getElementById("faqSearch")?.value || "").toLowerCase().trim();
    if (search) {
      grouped = grouped.filter(g => g.question.includes(search));
    }

    // Sort
    const sortBy = document.getElementById("faqSortBy")?.value || "count";
    if (sortBy === "count") grouped.sort((a, b) => b.count - a.count);
    if (sortBy === "recent") grouped.sort((a, b) => b.lastAsked - a.lastAsked);
    if (sortBy === "alpha") grouped.sort((a, b) => a.question.localeCompare(b.question));

    // Update stats
    const totalEl = document.getElementById("faqTotal");
    if (totalEl) {
      totalEl.textContent = logs.length;
      document.getElementById("faqUnique").textContent = grouped.length;
      const topCount = grouped[0]?.count || 0;
      document.getElementById("faqTopCount").textContent = topCount;
      let latest = 0;
      logs.forEach(l => {
        const t = l.timestamp?.toMillis?.() || 0;
        if (t > latest) latest = t;
      });
      document.getElementById("faqLast").textContent = latest ? formatDate({ toDate: () => new Date(latest) }) : "—";
    }

    if (grouped.length === 0) {
      list.innerHTML = `
        <div class="faq-empty">
          <h3>${logs.length === 0 ? "No questions logged yet" : "No matching questions"}</h3>
          <p>${logs.length === 0
            ? "As students ask the AI questions, they will appear here."
            : "Try clearing the search filter."}</p>
        </div>`;
      return;
    }

    list.innerHTML = grouped.map(g => `
      <div class="faq-row">
        <div class="faq-count">${g.count}</div>
        <div>
          <div class="faq-question">${escapeHTML(g.originalQuestion)}</div>
          ${g.originalQuestion.toLowerCase() !== g.question ? 
            `<div class="faq-original">normalized: ${escapeHTML(g.question)}</div>` : ""}
          <div style="font-size:11px;color:#9ca3af;margin-top:4px">Last asked: ${formatDate({ toDate: () => new Date(g.lastAsked) })}</div>
        </div>
        <div class="faq-actions">
          <button class="admin-btn small" data-add-faq="${escapeHTML(g.question)}">+ Add to Knowledge</button>
        </div>
      </div>
    `).join("");

    // Wire "Add to Knowledge" buttons — opens the knowledge modal pre-filled
    list.querySelectorAll("[data-add-faq]").forEach(btn => {
      btn.onclick = () => {
        const question = btn.dataset.addFaq;
        // Switch to knowledge tab
        document.querySelectorAll(".faq-tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelector('[data-maintab="knowledge"]').classList.add("active");
        document.getElementById("maintab-knowledge").style.display = "block";
        document.getElementById("maintab-faq").style.display = "none";
        
        // Open the knowledge modal with question pre-filled
        if (typeof window.openKnowledgeModal === "function") {
          window.openKnowledgeModal(null, question);
        } else {
          // Fallback: trigger the add button
          document.getElementById("addEntryBtn")?.click();
          setTimeout(() => {
            const qInput = document.getElementById("kQuestion");
            if (qInput) qInput.value = question;
          }, 100);
        }
      };
    });
  }

  // ============================================
  // CLEAR ALL LOGS
  // ============================================
  async function clearAllLogs() {
    if (!confirm("⚠️ Delete ALL FAQ logs? This cannot be undone.")) return;
    if (!confirm("Are you ABSOLUTELY sure? This will erase all analytics data.")) return;

    const { db } = await waitForFirebase();
    const btn = document.getElementById("clearFaqBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Clearing…"; }

    try {
      const snap = await getDocs(collection(db, "faq_logs"));
      let count = 0;
      for (const d of snap.docs) {
        await deleteDoc(doc(db, "faq_logs", d.id));
        count++;
      }
      alert(`✅ Deleted ${count} logs.`);
      logs = [];
      renderFAQ();
    } catch (e) {
      alert("Failed to clear: " + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "🗑️ Clear All Logs"; }
    }
  }

  // ============================================
  // WIRE UP
  // ============================================
  function wireUp() {
    if (wired) return;
    wired = true;

    // Main tab switching. Do not depend on another admin script's global flag.
    document.querySelectorAll(".faq-tab-btn").forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll(".faq-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.maintab;
        document.getElementById("maintab-knowledge").style.display = tab === "knowledge" ? "block" : "none";
        document.getElementById("maintab-faq").style.display = tab === "faq" ? "block" : "none";
        document.getElementById("maintab-chats").style.display = tab === "chats" ? "block" : "none";
        if (tab === "faq") loadLogs();
      };
    });

    const search = document.getElementById("faqSearch");
    const sortBy = document.getElementById("faqSortBy");
    const timeFilter = document.getElementById("faqTimeFilter");
    if (search) search.addEventListener("input", renderFAQ);
    if (sortBy) sortBy.addEventListener("change", renderFAQ);
    if (timeFilter) timeFilter.addEventListener("change", renderFAQ);

    const refresh = document.getElementById("refreshFaqBtn");
    if (refresh) refresh.onclick = loadLogs;

    const clear = document.getElementById("clearFaqBtn");
    if (clear) clear.onclick = clearAllLogs;

    console.log("[FAQ Insights] Wired successfully");
  }

  // Boot independently. The admin page performs the actual admin check;
  // this module only wires the UI and uses the already initialized Firebase DB.
  function boot() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", wireUp, { once: true });
    } else {
      wireUp();
    }
  }

  boot();

})();
