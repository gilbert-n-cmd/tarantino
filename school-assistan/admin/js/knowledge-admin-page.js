/* ============================================
   Knowledge Admin Page — AI Bot Only
   ============================================ */

import {
  collection, doc, addDoc, getDocs, deleteDoc, updateDoc, getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

(function () {
  "use strict";

  console.log("[KnowledgeAdmin] Loading…");

  let cache = [];
  let filtered = [];
  let wired = false;
  let currentUser = null;
  let isAdminVerified = false;

  // ---------- Waits ----------
  function waitForFirebase(timeoutMs = 10000) {
    return new Promise((resolve) => {
      if (window.tarantinoAuth?.db) return resolve(window.tarantinoAuth);
      const start = Date.now();
      const check = setInterval(() => {
        if (window.tarantinoAuth?.db) {
          clearInterval(check);
          resolve(window.tarantinoAuth);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(check);
          resolve(null);
        }
      }, 50);
    });
  }

  // FIXED: Wait for user using onAuthStateChanged directly
  function waitForUser(timeoutMs = 10000) {
    return new Promise((resolve) => {
      const { auth } = window.tarantinoAuth || {};
      if (!auth) return resolve(null);

      // If already logged in
      if (auth.currentUser) {
        window.tarantinoUser = auth.currentUser;
        return resolve(auth.currentUser);
      }

      // Otherwise wait for auth state
      const unsub = onAuthStateChanged(auth, (user) => {
        unsub();
        window.tarantinoUser = user;
        resolve(user);
      });

      // Timeout fallback
      setTimeout(() => {
        unsub();
        resolve(auth.currentUser || null);
      }, timeoutMs);
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
      return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch { return "—"; }
  }

  // ============================================
  // LOAD + RENDER
  // ============================================
  async function loadEntries() {
    const { db } = await waitForFirebase();
    if (!db) return;

    const list = document.getElementById("knowledgeList");
    if (list) list.textContent = "Loading…";

    try {
      const snap = await getDocs(collection(db, "knowledge"));
      cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateStats();
      updateCategoryFilter();
      applyFilters();
      console.log(`[KnowledgeAdmin] Loaded ${cache.length} entries`);
    } catch (e) {
      console.error("[KnowledgeAdmin] Load failed:", e);
      if (list) list.innerHTML = `<p style="color:red">Failed to load: ${escapeHTML(e.message)}</p>`;
    }
  }

  function updateStats() {
    const el1 = document.getElementById("statTotal");
    if (!el1) return;
    el1.textContent = cache.length;
    document.getElementById("statUrls").textContent = cache.filter(e => e.url).length;
    document.getElementById("statCategories").textContent =
      new Set(cache.map(e => e.category).filter(Boolean)).size;

    let latest = 0;
    cache.forEach(e => {
      const t = e.updatedAt?.toMillis?.() || e.createdAt?.toMillis?.() || 0;
      if (t > latest) latest = t;
    });
    document.getElementById("statUpdated").textContent =
      latest ? formatDate({ toDate: () => new Date(latest) }) : "—";
  }

  function updateCategoryFilter() {
    const sel = document.getElementById("categoryFilter");
    if (!sel) return;
    const cats = [...new Set(cache.map(e => e.category).filter(Boolean))].sort();
    sel.innerHTML = `<option value="">All categories</option>` +
      cats.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
  }

  function applyFilters() {
    const search = (document.getElementById("knowledgeSearch")?.value || "").toLowerCase().trim();
    const cat    = document.getElementById("categoryFilter")?.value || "";
    const sortBy = document.getElementById("sortBy")?.value || "priority";

    filtered = cache.filter(e => {
      if (cat && e.category !== cat) return false;
      if (!search) return true;
      const haystack = [
        e.question || "",
        e.answer || "",
        Array.isArray(e.keywords) ? e.keywords.join(" ") : ""
      ].join(" ").toLowerCase();
      return haystack.includes(search);
    });

    filtered.sort((a, b) => {
      if (sortBy === "priority") return (Number(b.priority) || 0) - (Number(a.priority) || 0);
      if (sortBy === "question") return String(a.question || "").localeCompare(String(b.question || ""));
      if (sortBy === "category") return String(a.category || "").localeCompare(String(b.category || ""));
      return 0;
    });

    renderList();
  }

  function renderList() {
    const list = document.getElementById("knowledgeList");
    if (!list) return;

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="knowledge-empty">
          <h3>${cache.length === 0 ? "No entries yet" : "No matching entries"}</h3>
          <p>${cache.length === 0
            ? "Click <strong>+ Add Entry</strong> or <strong>⚡ Load Starter Pack</strong> to begin."
            : "Try changing the search or filter."}</p>
        </div>`;
      return;
    }

    list.innerHTML = filtered.map(e => `
      <div class="knowledge-row">
        <div>
          <div class="knowledge-question">${escapeHTML(e.question || "(no question)")}</div>
          <div class="knowledge-answer">${escapeHTML(e.answer || "")}</div>
          <div class="knowledge-meta">
            ${Array.isArray(e.keywords) ? e.keywords.map(k => `<span class="knowledge-tag">${escapeHTML(k)}</span>`).join("") : ""}
            ${e.category ? `<span class="knowledge-tag category">${escapeHTML(e.category)}</span>` : ""}
            ${e.priority ? `<span class="knowledge-tag priority">P: ${escapeHTML(e.priority)}</span>` : ""}
            ${e.url ? `<span class="knowledge-tag url">🔗 Link</span>` : ""}
          </div>
        </div>
        <div class="knowledge-row-actions">
          <button class="admin-btn small" data-edit="${e.id}">Edit</button>
          <button class="admin-btn danger" data-del="${e.id}">Delete</button>
        </div>
      </div>
    `).join("");

    list.querySelectorAll("[data-edit]").forEach(b => {
      b.onclick = () => openModal(b.dataset.edit);
    });

    list.querySelectorAll("[data-del]").forEach(b => {
      b.onclick = async () => {
        if (!confirm("Delete this entry?")) return;
        const { db } = await waitForFirebase();
        try {
          await deleteDoc(doc(db, "knowledge", b.dataset.del));
          if (window.tarantinoClearKnowledgeCache) window.tarantinoClearKnowledgeCache();
          loadEntries();
        } catch (e) {
          alert("Delete failed: " + e.message);
        }
      };
    });
  }

  // ============================================
  // ADD / EDIT MODAL
  // ============================================
  function openModal(docId, prefillQuestion) {
    const modal = document.getElementById("knowledgeModal");
    const form  = document.getElementById("knowledgeForm");
    form.reset();
    document.getElementById("knowledgeFormError").textContent = "";
    document.getElementById("knowledgeDocId").value = "";

    if (docId) {
      const e = cache.find(x => x.id === docId);
      if (!e) return;
      document.getElementById("knowledgeModalTitle").textContent = "Edit Entry";
      document.getElementById("knowledgeDocId").value = docId;
      document.getElementById("kQuestion").value = e.question || "";
      document.getElementById("kKeywords").value = Array.isArray(e.keywords) ? e.keywords.join(", ") : "";
      document.getElementById("kAnswer").value = e.answer || "";
      document.getElementById("kUrl").value = e.url || "";
      document.getElementById("kCategory").value = e.category || "";
      document.getElementById("kPriority").value = e.priority || 10;
    } else {
      document.getElementById("knowledgeModalTitle").textContent = "Add Entry";
      document.getElementById("kPriority").value = 10;

      if (prefillQuestion) {
        document.getElementById("kQuestion").value = prefillQuestion;
      }
    }

    modal.classList.add("open");
    setTimeout(() => {
      if (prefillQuestion) {
        document.getElementById("kKeywords").focus();
      } else {
        document.getElementById("kQuestion").focus();
      }
    }, 100);
  }

  window.openKnowledgeModal = openModal;

  window.switchToKnowledgeTab = function () {
    document.querySelectorAll(".faq-tab-btn").forEach(b => b.classList.remove("active"));
    const kbBtn = document.querySelector('[data-maintab="knowledge"]');
    if (kbBtn) kbBtn.classList.add("active");

    const kbSection = document.getElementById("maintab-knowledge");
    const faqSection = document.getElementById("maintab-faq");
    if (kbSection) kbSection.style.display = "block";
    if (faqSection) faqSection.style.display = "none";
  };

  function setupForm() {
    const form = document.getElementById("knowledgeForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const { db } = await waitForFirebase();
      const err = document.getElementById("knowledgeFormError");
      err.textContent = "";

      const docId = document.getElementById("knowledgeDocId").value;
      const keywords = document.getElementById("kKeywords").value
        .split(",").map(k => k.trim().toLowerCase()).filter(Boolean);

      if (keywords.length === 0) {
        err.textContent = "Add at least one keyword.";
        return;
      }

      const data = {
        question: document.getElementById("kQuestion").value.trim(),
        keywords,
        answer: document.getElementById("kAnswer").value.trim(),
        url: document.getElementById("kUrl").value.trim(),
        category: document.getElementById("kCategory").value.trim() || "general",
        priority: Number(document.getElementById("kPriority").value) || 10,
        updatedAt: serverTimestamp()
      };

      try {
        if (docId) {
          await updateDoc(doc(db, "knowledge", docId), data);
        } else {
          data.createdAt = serverTimestamp();
          await addDoc(collection(db, "knowledge"), data);
        }
        if (window.tarantinoClearKnowledgeCache) window.tarantinoClearKnowledgeCache();
        document.getElementById("knowledgeModal").classList.remove("open");
        loadEntries();
      } catch (ex) {
        console.error("[KnowledgeAdmin] Save failed:", ex);
        err.textContent = "Save failed: " + ex.message;
      }
    });
  }

  // ============================================
  // BULK PASTE
  // ============================================
  function setupBulk() {
    const btn = document.getElementById("bulkPasteBtn");
    const modal = document.getElementById("bulkModal");
    const confirm = document.getElementById("bulkConfirm");
    const textarea = document.getElementById("bulkText");
    const errEl = document.getElementById("bulkError");

    if (btn) btn.onclick = () => {
      modal.classList.add("open");
      textarea.value = "";
      errEl.textContent = "";
    };

    if (confirm) confirm.onclick = async () => {
      const { db } = await waitForFirebase();
      const raw = textarea.value.trim();
      if (!raw) { errEl.textContent = "Paste at least one entry."; return; }

      const blocks = raw.split(/\n-{3,}\n/);
      const parsed = [];

      for (const block of blocks) {
        const obj = { keywords: [] };
        for (const line of block.split("\n")) {
          const m = line.match(/^([QKA UCP])\s*:\s*(.+)$/i);
          if (!m) continue;
          const key = m[1].toUpperCase();
          const val = m[2].trim();
          if (key === "Q") obj.question = val;
          if (key === "K") obj.keywords = val.split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
          if (key === "A") obj.answer = val;
          if (key === "U") obj.url = val;
          if (key === "C") obj.category = val;
          if (key === "P") obj.priority = Number(val) || 10;
        }
        if (obj.question && obj.answer && obj.keywords.length > 0) {
          obj.category = obj.category || "general";
          obj.priority = obj.priority || 10;
          obj.url = obj.url || "";
          parsed.push(obj);
        }
      }

      if (parsed.length === 0) {
        errEl.textContent = "No valid entries. Use Q:, K:, A: format.";
        return;
      }

      confirm.disabled = true;
      confirm.textContent = `Saving ${parsed.length}…`;

      let ok = 0, fail = 0;
      for (const entry of parsed) {
        try {
          entry.createdAt = serverTimestamp();
          entry.updatedAt = serverTimestamp();
          await addDoc(collection(db, "knowledge"), entry);
          ok++;
        } catch (e) {
          console.error("Failed:", entry.question, e);
          fail++;
        }
      }

      if (window.tarantinoClearKnowledgeCache) window.tarantinoClearKnowledgeCache();
      alert(`✅ Imported ${ok}. ${fail} failed.`);
      modal.classList.remove("open");
      confirm.disabled = false;
      confirm.textContent = "Import";
      loadEntries();
    };
  }

  // ============================================
  // STARTER PACK
  // ============================================
  const STARTER_ENTRIES = [
    { q: "What is the school motto?", k: ["motto","slogan","pride","school motto"], a: "Our motto is Primus Inter Pares — Latin for 'First Among Equals'. 🎓", u: "", c: "general", p: 10 },
    { q: "Where is the school located?", k: ["location","where","address","find school","fort portal","directions"], a: "We're located in Fort Portal, Kabarole District, Uganda.", u: "https://gilbert-n-cmd.github.io/tarantino/contact.html", c: "general", p: 10 },
    { q: "Who is the headmaster?", k: ["headmaster","head teacher","principal","headteacher","leader"], a: "Our headmaster is ONDOGA CHARLES (Regn. No. 25633).", u: "", c: "staff", p: 10 },
    { q: "How do I apply for A-Level?", k: ["a-level","a level","s5","s6","senior 5","advanced level","apply a-level"], a: "For A-Level (S5–S6) admission, bring your UCE results, a passport photo, and the application fee.", u: "https://gilbert-n-cmd.github.io/tarantino/a-level.html", c: "admissions", p: 10 },
    { q: "How do I apply for O-Level?", k: ["o-level","o level","s1","s4","senior 1","senior 4","ordinary level","apply o-level"], a: "For O-Level (S1–S4) admission, bring your PLE results and a birth certificate.", u: "https://gilbert-n-cmd.github.io/tarantino/o-level.html", c: "admissions", p: 10 },
    { q: "How do I apply to the school?", k: ["apply","admission","join","enroll","register","application"], a: "You can apply for O-Level or A-Level. See our admissions page for details.", u: "https://gilbert-n-cmd.github.io/tarantino/admissions.html", c: "admissions", p: 9 },
    { q: "How much are school fees?", k: ["fees","fee","cost","payment","tuition","how much","charges"], a: "School fees vary by level and whether you're a day or boarding student.", u: "https://gilbert-n-cmd.github.io/tarantino/fees.html", c: "fees", p: 10 },
    { q: "Where can I buy the school uniform?", k: ["uniform","buy uniform","school uniform","dress code","clothes"], a: "Uniforms are available at the school shop, open Monday–Friday, 8am–4pm.", u: "", c: "general", p: 8 },
    { q: "When does the new term start?", k: ["term","start","opening","new term","term dates","resume","when"], a: "Please check the school calendar for exact dates or contact the office.", u: "https://gilbert-n-cmd.github.io/tarantino/contact.html", c: "calendar", p: 8 },
    { q: "What subjects are offered?", k: ["subjects","courses","subjects offered","streams","departments","offer"], a: "We offer Sciences, Arts, and Business subjects across O-Level and A-Level.", u: "https://gilbert-n-cmd.github.io/tarantino/departments.html", c: "academics", p: 10 },
    { q: "What facilities do you have?", k: ["facilities","facility","campus","library","labs","sports","ground"], a: "We have modern classrooms, science labs, a library, sports grounds, and a drama room.", u: "https://gilbert-n-cmd.github.io/tarantino/facilities.html", c: "campus", p: 10 },
    { q: "How can I contact the school?", k: ["contact","phone","email","call","reach","whatsapp"], a: "You can reach us by phone, email, or WhatsApp.", u: "https://gilbert-n-cmd.github.io/tarantino/contact.html", c: "general", p: 10 },
    { q: "How do I access the student portal?", k: ["portal","student portal","login","sign in","student login"], a: "Students can log in to the portal to view grades, fees, timetable, and messages.", u: "https://gilbert-n-cmd.github.io/tarantino/portal/login.html", c: "portal", p: 10 },
    { q: "How do I join the alumni network?", k: ["alumni","old boy","old girl","graduate","network","former student"], a: "Join our alumni network to reconnect with classmates and access opportunities.", u: "https://gilbert-n-cmd.github.io/tarantino/alumni.html", c: "community", p: 10 },
    { q: "Tell me about the school", k: ["about","history","vision","mission","background","story"], a: "Bishop Angelo Tarantino Memorial SS is a leading secondary school in Fort Portal, Uganda — Primus Inter Pares!", u: "https://gilbert-n-cmd.github.io/tarantino/about.html", c: "general", p: 8 },
    { q: "What are the school values?", k: ["values","god fearing","morals","vision","mission"], a: "We nurture quality education, teamwork, and God-fearing values alongside academic excellence. 🙏", u: "", c: "general", p: 8 },
    { q: "Do you offer boarding?", k: ["boarding","boarder","hostel","dormitory","stay"], a: "Yes, we offer both day and boarding options. Contact the office for details.", u: "https://gilbert-n-cmd.github.io/tarantino/contact.html", c: "general", p: 8 },
    { q: "What are the school hours?", k: ["hours","time","open","close","school hours","schedule"], a: "School opens at 7:30 AM and closes at 4:30 PM, Monday to Friday.", u: "", c: "general", p: 8 },
    { q: "What streams do you offer?", k: ["streams","stream","combination","sciences","arts","business"], a: "We offer Sciences, Arts, and Business streams at both O-Level and A-Level.", u: "https://gilbert-n-cmd.github.io/tarantino/departments.html", c: "academics", p: 8 },
    { q: "Is the school religious?", k: ["religion","church","god","pray","religious"], a: "We promote moral and spiritual growth alongside academics. 🙏", u: "", c: "general", p: 6 }
  ];

  function setupSeed() {
    const btn = document.getElementById("seedDefaultsBtn");
    const modal = document.getElementById("seedModal");
    const confirm = document.getElementById("seedConfirm");

    if (btn) btn.onclick = () => modal.classList.add("open");

    if (confirm) confirm.onclick = async () => {
      const { db } = await waitForFirebase();
      confirm.disabled = true;
      confirm.textContent = `Adding ${STARTER_ENTRIES.length}…`;

      let ok = 0, fail = 0;
      for (const s of STARTER_ENTRIES) {
        try {
          await addDoc(collection(db, "knowledge"), {
            question: s.q,
            keywords: s.k,
            answer: s.a,
            url: s.u,
            category: s.c,
            priority: s.p,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          ok++;
        } catch (e) {
          console.error("Failed:", s.q, e);
          fail++;
        }
      }

      if (window.tarantinoClearKnowledgeCache) window.tarantinoClearKnowledgeCache();
      alert(`✅ Added ${ok} entries. ${fail} failed.`);
      modal.classList.remove("open");
      confirm.disabled = false;
      confirm.textContent = "Add 20 Entries";
      loadEntries();
    };
  }

  // ============================================
  // FILTERS + LOGOUT + MODAL CLOSE
  // ============================================
  function setupFilters() {
    const s = document.getElementById("knowledgeSearch");
    const c = document.getElementById("categoryFilter");
    const sort = document.getElementById("sortBy");
    if (s) s.addEventListener("input", applyFilters);
    if (c) c.addEventListener("change", applyFilters);
    if (sort) sort.addEventListener("change", applyFilters);
  }

  function setupLogout() {
    const btn = document.getElementById("portalLogout");
    if (!btn) return;
    btn.onclick = async () => {
      if (!confirm("Log out?")) return;
      const { auth } = await waitForFirebase();
      if (auth) await auth.signOut().catch(() => {});
      window.location.href = "admin-login.html";
    };
  }

  function setupModalClose() {
    document.querySelectorAll("[data-close]").forEach(el => {
      el.onclick = () => {
        const t = document.getElementById(el.dataset.close);
        if (t) t.classList.remove("open");
      };
    });

    document.querySelectorAll(".admin-modal").forEach(m => {
      m.addEventListener("click", (e) => {
        if (e.target === m) m.classList.remove("open");
      });
    });
  }

  // ============================================
  // ADMIN CHECK — FIXED
  // ============================================
  async function checkAdmin(uid) {
    try {
      const { db } = await waitForFirebase();
      if (!db) {
        console.error("[KnowledgeAdmin] No DB available for admin check");
        return false;
      }
      
      console.log("[KnowledgeAdmin] Checking adminUser/" + uid);
      const snap = await getDoc(doc(db, "adminUser", uid));
      
      if (!snap.exists()) {
        console.warn("[KnowledgeAdmin] No adminUser document found for UID:", uid);
        return false;
      }
      
      const data = snap.data();
      console.log("[KnowledgeAdmin] Admin document data:", data);
      
      return data.role === "admin";
    } catch (e) {
      console.error("[KnowledgeAdmin] Admin check failed:", e);
      return false;
    }
  }

  // ============================================
  // WIRE UP
  // ============================================
  function wireUp() {
    if (wired) return;
    wired = true;

    const addBtn = document.getElementById("addEntryBtn");
    if (addBtn) addBtn.onclick = () => openModal();

    setupForm();
    setupBulk();
    setupSeed();
    setupFilters();
    setupLogout();
    setupModalClose();

    loadEntries();

    console.log("[KnowledgeAdmin] ✅ Wired");
  }

  // ============================================
  // BOOT — FIXED
  // ============================================
  (async () => {
    console.log("[KnowledgeAdmin] Booting…");

    const fb = await waitForFirebase();
    if (!fb) {
      console.error("[KnowledgeAdmin] Firebase never loaded");
      const list = document.getElementById("knowledgeList");
      if (list) list.innerHTML = "<p style='color:red'>Firebase failed to load. Check console.</p>";
      return;
    }

    // Wait for auth to fully initialize
    const user = await waitForUser();
    console.log("[KnowledgeAdmin] User:", user ? user.email : "none");

    if (!user) {
      console.log("[KnowledgeAdmin] No user — redirecting to login");
      window.location.replace("admin-login.html");
      return;
    }

    // Verify admin status
    const isAdmin = await checkAdmin(user.uid);
    console.log("[KnowledgeAdmin] Is admin?", isAdmin);

    if (!isAdmin) {
      console.warn("[KnowledgeAdmin] Not admin — showing alert and redirecting");
      alert("⛔ Admin access required.\n\nYour UID: " + user.uid + "\n\nMake sure this UID exists as a document in the 'adminUser' collection with role='admin'.");
      window.location.replace("admin-login.html");
      return;
    }

    isAdminVerified = true;
    wireUp();
  })();

})();