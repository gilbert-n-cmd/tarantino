
/* ============================================
   Student Portal — Logic
   Handles: login, dashboard, grades, fees,
            timetable, messages
   ============================================ */

(function () {
  "use strict";

  console.log("[Portal] Starting…");

  // ---------- Determine current page ----------
  const path = window.location.pathname;
  const isLoginPage     = path.includes("login.html");
  const isDashboardPage = path.includes("dashboard.html");
  const isGradesPage    = path.includes("grades.html");
  const isFeesPage      = path.includes("fees.html");
  const isTimetablePage = path.includes("timetable.html");
  const isMessagesPage  = path.includes("messages.html");

  // ---------- Cache the student record ----------
  let currentStudent = null;

  // ---------- Wait for auth to be ready ----------
  function waitForAuth(callback) {
    if (window.tarantinoUser !== undefined && window.tarantinoAuth) {
      setTimeout(callback, 100);
      return;
    }
    setTimeout(() => waitForAuth(callback), 100);
  }

  // ============================================
  // HELPERS
  // ============================================
  function escapeHTML(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(ts) {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  }

  function formatUGX(n) {
    if (n == null) return "—";
    return "UGX " + Number(n).toLocaleString();
  }

  // ============================================
  // LOGIN PAGE
  // ============================================
  function initLoginPage() {
    const form  = document.getElementById("portalLoginForm");
    const email = document.getElementById("portalEmail");
    const pass  = document.getElementById("portalPassword");
    const btn   = document.getElementById("portalLoginBtn");
    const err   = document.getElementById("portalError");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.textContent = "";
      btn.disabled = true;
      btn.textContent = "Signing in…";

      try {
        await window.tarantinoLogin(email.value.trim(), pass.value);
        window.location.href = "dashboard.html";
      } catch (ex) {
        console.error("[Portal] Login failed:", ex);
        err.textContent = friendlyError(ex);
        btn.disabled = false;
        btn.textContent = "Sign In";
      }
    });
  }

  function friendlyError(ex) {
    const code = ex.code || "";
    if (code.includes("user-not-found"))     return "No account found with that email.";
    if (code.includes("wrong-password"))     return "Incorrect password.";
    if (code.includes("invalid-credential")) return "Wrong email or password.";
    if (code.includes("invalid-email"))      return "Please enter a valid email.";
    if (code.includes("too-many-requests"))  return "Too many attempts. Try again later.";
    return "Login failed. Please try again.";
  }

  // ============================================
  // LOAD STUDENT RECORD (shared across pages)
  // ============================================
  async function loadStudent() {
    if (currentStudent) return currentStudent;
    const user = window.tarantinoUser;
    if (!user) return null;

    currentStudent = await window.tarantinoGetStudentByUid(user.uid);
    return currentStudent;
  }

  // ============================================
  // DASHBOARD PAGE
  // ============================================
  async function initDashboardPage() {
    try {
      const student = await loadStudent();
      if (!student) {
        alert("No student record found. Contact the school office.");
        return;
      }

      document.getElementById("studentName").textContent  = student.name || "Student";
      document.getElementById("studentClass").textContent = student.class || "—";
      document.getElementById("studentHouse").textContent = student.house || "—";

      // Latest grade
      const grades = await window.tarantinoGetGrades(student.id);
      const latestGradeEl = document.getElementById("latestGrade");
      if (grades.length > 0) {
        const g = grades[0];
        latestGradeEl.textContent = `${g.subject || "—"}: ${g.score ?? "—"} (${g.term || "—"})`;
      } else {
        latestGradeEl.textContent = "No grades yet";
      }

      // Fee balance
      const fees = await window.tarantinoGetFeeStatus(student.id);
      const feeEl = document.getElementById("feeBalance");
      if (fees.length > 0) {
        const balance = fees[0].balance ?? 0;
        feeEl.textContent = balance <= 0
          ? "✅ Fully paid"
          : formatUGX(balance);
      } else {
        feeEl.textContent = "No records";
      }

      // Unread messages
      const msgs = await window.tarantinoGetMessages(student.id);
      const unread = msgs.filter(m => !m.read && m.from !== "student").length;
      document.getElementById("unreadMsgs").textContent = unread;

      // Enrolled date
      document.getElementById("enrolledAt").textContent = formatDate(student.createdAt);

    } catch (ex) {
      console.error("[Portal] Dashboard failed:", ex);
    }
  }

  // ============================================
  // GRADES PAGE
  // ============================================
  async function initGradesPage() {
    const loadingEl = document.getElementById("gradesLoading");
    const emptyEl   = document.getElementById("gradesEmpty");
    const listEl    = document.getElementById("gradesList");

    try {
      const student = await loadStudent();
      if (!student) {
        loadingEl.textContent = "No student record found.";
        return;
      }

      const grades = await window.tarantinoGetGrades(student.id);
      loadingEl.style.display = "none";

      if (grades.length === 0) {
        emptyEl.style.display = "block";
        return;
      }

      listEl.innerHTML = grades.map(g => `
        <div class="grade-row">
          <div class="grade-subject">
            <strong>${escapeHTML(g.subject || "—")}</strong>
            <span class="grade-term">${escapeHTML(g.term || "—")}</span>
          </div>
          <div class="grade-score">${escapeHTML(g.score ?? "—")}</div>
          <div class="grade-grade">${escapeHTML(g.grade || "—")}</div>
        </div>
      `).join("");

    } catch (ex) {
      console.error("[Portal] Grades failed:", ex);
      loadingEl.textContent = "Failed to load grades.";
    }
  }

  // ============================================
  // FEES PAGE
  // ============================================
  async function initFeesPage() {
    const loadingEl = document.getElementById("feesLoading");
    const emptyEl   = document.getElementById("feesEmpty");
    const listEl    = document.getElementById("feesList");
    const summaryEl = document.getElementById("feeSummary");

    try {
      const student = await loadStudent();
      if (!student) {
        loadingEl.textContent = "No student record found.";
        return;
      }

      const fees = await window.tarantinoGetFeeStatus(student.id);
      loadingEl.style.display = "none";

      if (fees.length === 0) {
        emptyEl.style.display = "block";
        return;
      }

      // Latest fee for summary
      const latest = fees[0];
      const balance = latest.balance ?? 0;
      const isClear = balance <= 0;

      summaryEl.innerHTML = `
        <div class="fee-summary-card ${isClear ? "paid" : "owing"}">
          <div class="fee-summary-label">Current Balance</div>
          <div class="fee-summary-value">
            ${isClear ? "✅ Fully Paid" : formatUGX(balance)}
          </div>
          <div class="fee-summary-term">${escapeHTML(latest.term || "")}</div>
        </div>
      `;

      listEl.innerHTML = fees.map(f => `
        <div class="fee-row">
          <div class="fee-term">${escapeHTML(f.term || "—")}</div>
          <div class="fee-amounts">
            <span>Total: <strong>${formatUGX(f.amount)}</strong></span>
            <span>Paid: <strong>${formatUGX(f.paid)}</strong></span>
            <span class="${(f.balance ?? 0) > 0 ? "owing" : "paid"}">
              Balance: <strong>${formatUGX(f.balance)}</strong>
            </span>
          </div>
        </div>
      `).join("");

    } catch (ex) {
      console.error("[Portal] Fees failed:", ex);
      loadingEl.textContent = "Failed to load fee records.";
    }
  }

  // ============================================
  // TIMETABLE PAGE
  // ============================================
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  async function initTimetablePage() {
    const loadingEl = document.getElementById("ttLoading");
    const emptyEl   = document.getElementById("ttEmpty");
    const gridEl    = document.getElementById("timetableGrid");

    try {
      const student = await loadStudent();
      if (!student) {
        loadingEl.textContent = "No student record found.";
        return;
      }

      document.getElementById("ttClass").textContent = student.class || "—";
      document.getElementById("ttTerm").textContent  = student.term || "Current Term";

      if (!student.class) {
        loadingEl.style.display = "none";
        emptyEl.style.display = "block";
        return;
      }

      const tt = await window.tarantinoGetTimetable(student.class);
      loadingEl.style.display = "none";

      if (!tt || Object.keys(tt).length === 0) {
        emptyEl.style.display = "block";
        return;
      }

      // Build a table
      gridEl.innerHTML = `
        <table class="timetable-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Subject</th>
              <th>Teacher</th>
              <th>Room</th>
            </tr>
          </thead>
          <tbody>
            ${DAYS.map(day => {
              const slots = tt[day] || [];
              if (!Array.isArray(slots) || slots.length === 0) {
                return `<tr>
                  <td><strong>${day}</strong></td>
                  <td colspan="3" style="color:#94a3b8">No lessons</td>
                </tr>`;
              }
              return slots.map((slot, i) => `
                <tr>
                  ${i === 0 ? `<td rowspan="${slots.length}"><strong>${day}</strong></td>` : ""}
                  <td>${escapeHTML(slot.subject || "—")}</td>
                  <td>${escapeHTML(slot.teacher || "—")}</td>
                  <td>${escapeHTML(slot.room || "—")}</td>
                </tr>
              `).join("");
            }).join("")}
          </tbody>
        </table>
      `;

    } catch (ex) {
      console.error("[Portal] Timetable failed:", ex);
      loadingEl.textContent = "Failed to load timetable.";
    }
  }

  // ============================================
  // MESSAGES PAGE
  // ============================================
  async function initMessagesPage() {
    const loadingEl = document.getElementById("msgsLoading");
    const emptyEl   = document.getElementById("msgsEmpty");
    const listEl    = document.getElementById("messagesList");
    const textarea  = document.getElementById("newMessageText");
    const sendBtn   = document.getElementById("sendMessageBtn");

    try {
      const student = await loadStudent();
      if (!student) {
        loadingEl.textContent = "No student record found.";
        return;
      }

      await refreshMessages(student.id);

      // Send handler
      sendBtn.addEventListener("click", async () => {
        const text = textarea.value.trim();
        if (!text) return;
        sendBtn.disabled = true;
        sendBtn.textContent = "Sending…";
        try {
          await window.tarantinoSendMessage(student.id, text);
          textarea.value = "";
          await refreshMessages(student.id);
        } catch (ex) {
          console.error("[Portal] Send failed:", ex);
          alert("Failed to send message.");
        } finally {
          sendBtn.disabled = false;
          sendBtn.textContent = "Send";
        }
      });

    } catch (ex) {
      console.error("[Portal] Messages failed:", ex);
      loadingEl.textContent = "Failed to load messages.";
    }

    async function refreshMessages(studentId) {
      const msgs = await window.tarantinoGetMessages(studentId);
      loadingEl.style.display = "none";

      if (msgs.length === 0) {
        emptyEl.style.display = "block";
        listEl.innerHTML = "";
        return;
      }

      emptyEl.style.display = "none";
      listEl.innerHTML = msgs.map(m => `
        <div class="msg-bubble ${m.from === "student" ? "from-me" : "from-them"}">
          <div class="msg-meta">
            <strong>${escapeHTML(m.fromName || (m.from === "student" ? "You" : "School"))}</strong>
            <span>${formatDate(m.createdAt)}</span>
          </div>
          <div class="msg-text">${escapeHTML(m.text || "")}</div>
        </div>
      `).join("");
    }
  }

  // ============================================
  // LOGOUT
  // ============================================
  function setupLogout() {
    const btn = document.getElementById("portalLogout");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      if (confirm("Log out of the student portal?")) {
        await window.tarantinoLogout();
        window.location.href = "login.html";
      }
    });
  }

  // ============================================
  // PAGE GUARD
  // ============================================
  function guardPrivatePage() {
    if (isLoginPage) return;
    if (!window.tarantinoUser) {
      console.log("[Portal] Not logged in — redirecting");
      window.location.href = "login.html";
    }
  }

  // ============================================
  // BOOT
  // ============================================
  function boot() {
    waitForAuth(() => {
      guardPrivatePage();

      if (isLoginPage)     initLoginPage();
      if (isDashboardPage) initDashboardPage();
      if (isGradesPage)    initGradesPage();
      if (isFeesPage)      initFeesPage();
      if (isTimetablePage) initTimetablePage();
      if (isMessagesPage)  initMessagesPage();

      setupLogout();

      console.log("[Portal] Ready on", path);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
