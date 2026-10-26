/* ============================================
   Dashboard — Live Analytics
   ============================================ */

import {
  collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

(function () {
  "use strict";
  let wired = false;

  function waitForFirebase() {
    return new Promise((resolve) => {
      if (window.tarantinoAuth?.db) return resolve(window.tarantinoAuth);
      const check = setInterval(() => {
        if (window.tarantinoAuth?.db) { clearInterval(check); resolve(window.tarantinoAuth); }
      }, 50);
      setTimeout(() => clearInterval(check), 10000);
    });
  }

  function escapeHTML(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  async function loadDashboard() {
    const { db } = await waitForFirebase();
    const snap = await getDocs(collection(db, "faq_logs"));
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Stats
    const chatsToday = logs.filter(l => (l.timestamp?.toMillis?.() || 0) >= oneDayAgo).length;
    const weekCount = logs.filter(l => (l.timestamp?.toMillis?.() || 0) >= oneWeekAgo).length;
    const uniqueUsers = new Set(logs.map(l => l.userId).filter(Boolean)).size;

    document.getElementById("statChatsToday").textContent = chatsToday;
    document.getElementById("statWeek").textContent = weekCount;
    document.getElementById("statAllTime").textContent = logs.length;
    document.getElementById("statUniqueUsers").textContent = uniqueUsers || "—";

    // Top Questions
    const grouped = {};
    logs.forEach(l => {
      const q = (l.question || "").toLowerCase().trim();
      if (!q) return;
      if (!grouped[q]) grouped[q] = { original: l.originalQuestion || q, count: 0 };
      grouped[q].count++;
    });

    const top5 = Object.values(grouped).sort((a, b) => b.count - a.count).slice(0, 5);
    const topList = document.getElementById("topQuestionsList");
    if (top5.length === 0) {
      topList.innerHTML = `<li class="empty">No questions logged yet.</li>`;
    } else {
      const max = top5[0].count;
      topList.innerHTML = top5.map((q, i) => {
        const pct = Math.round((q.count / max) * 100);
        return `
          <li>
            <span class="rank">${i + 1}</span>
            <div class="term-info"><div class="term-name">${escapeHTML(q.original)}</div></div>
            <div class="bar-wrap"><div class="bar"><span style="width:${pct}%"></span></div><span class="count">${q.count}</span></div>
          </li>
        `;
      }).join("");
    }

    // Hourly Chart
    const hours = new Array(24).fill(0);
    logs.forEach(l => {
      const ts = l.timestamp?.toDate?.();
      if (ts) hours[ts.getHours()]++;
    });

    const maxHour = Math.max(...hours, 1);
    const chartEl = document.getElementById("hourlyChart");
    chartEl.innerHTML = hours.map((count, h) => {
      const heightPct = (count / maxHour) * 100;
      return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
          <div style="width:100%;background:linear-gradient(180deg,#818cf8,#4f46e5);height:${heightPct}%;border-radius:4px 4px 0 0;min-height:2px;" title="${h}:00 — ${count} questions"></div>
          <span style="font-size:9px;color:#94a3b8;margin-top:4px;">${h}</span>
        </div>
      `;
    }).join("");
  }

  function wireUp() {
    if (wired) return;
    wired = true;
    document.querySelectorAll(".faq-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.dataset.maintab === "dashboard") loadDashboard();
      });
    });
    const refresh = document.getElementById("refreshDashboardBtn");
    if (refresh) refresh.onclick = loadDashboard;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireUp);
  else wireUp();
})();