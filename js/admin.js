/* ============================================
   Admin Panel — FULLY SELF-CONTAINED
   No dependencies on other modules
   ============================================ */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, getDoc, getDocs, deleteDoc, setDoc,
  query, where, orderBy, limit as fbLimit,
  serverTimestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

(function () {
  "use strict";

  console.log("═══════════════════════════════════════");
  console.log("[Admin] BOOTING");
  console.log("═══════════════════════════════════════");

  // ============================================
  // 1. FIREBASE CONFIG (hardcoded — no external file)
  // ============================================
  const firebaseConfig = {
  apiKey: "AIzaSyCdC66xNRXiEDTNfuJufkOhNvL57i-SxTs",
  authDomain: "tarantino-student-portal.firebaseapp.com",
  projectId: "tarantino-student-portal",
  storageBucket: "tarantino-student-portal.firebasestorage.app",
  messagingSenderId: "637346861909",
  appId: "1:637346861909:web:dc9661aad445d3488b95dc"
};

  // Init or reuse
  let app, auth, db;
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("[Admin] ✅ Firebase initialized:", firebaseConfig.projectId);
  } catch (e) {
    console.error("[Admin] ❌ Firebase init failed:", e);
    alert("Firebase initialization failed. Check console.");
    return;
  }

  // Expose globally so other modules can use if needed
  window.tarantinoAuth = { auth, db };
  window.tarantinoUser = null;

  // ============================================
  // 2. HELPERS
  // ============================================
  function escapeHTML(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function formatUGX(n) {
    if (n == null || isNaN(n)) return "—";
    return "UGX " + Number(n).toLocaleString();
  }

  function formatDate(ts) {
    if (!ts) return "—";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleString();
    } catch { return "—"; }
  }

  // ============================================
  // 3. STATE
  // ============================================
  let allStudents = [];
  let currentStudentId = null;
  let csvRows = [];

  // ============================================
  // 4. AUTH CHECK
  // ============================================
  async function checkAdmin(uid) {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      return snap.exists() && snap.data().role === "admin";
    } catch (e) {
      console.error("[Admin] Admin check failed:", e);
      return false;
    }
  }

  // ============================================
  // 5. MAIN BOOT — run once user is known
  // ============================================
  onAuthStateChanged(auth, async (user) => {
    console.log("[Admin] Auth state:", user ? user.email : "not logged in");
    window.tarantinoUser = user;

    if (!user) {
      console.log("[Admin] No user — redirecting to login");
      window.location.href = "admin-login.html";
      return;
    }

    const isAdmin = await checkAdmin(user.uid);
    console.log("[Admin] Is admin?", isAdmin);

    if (!isAdmin) {
      alert("⛔ Access denied. Admin only.");
      window.location.href = "admin.html";
      return;
    }

    // ✅ Admin confirmed — wire up everything
    console.log("[Admin] ✅ Admin confirmed. Wiring up UI...");
    wireUpAll();
  });

  // ============================================
  // 6. WIRE UP EVERYTHING
  // ============================================
  function wireUpAll() {
    console.log("[Admin] Wiring up...");

    wireNavTabs();
    wireLogout();
    wireStudentButtons();
    wireGradeButtons();
    wireFeeButtons();
    wireTimetableButtons();
    wireMessageButtons();
    wireCsvImport();
    wireModalCloseButtons();

    // Load initial data
    loadOverview();
    populateStudentSelects();

    console.log("[Admin] ✅ All systems go");
  }

  // ============================================
  // 7. NAV TABS
  // ============================================
  function wireNavTabs() {
    // Note: nav switching already works via inline onclick in HTML
    // This just adds data loading
    document.querySelectorAll(".nav-tab[data-tab]").forEach(tab => {
      tab.addEventListener("click", () => {
        const key = tab.dataset.tab;
        console.log("[Admin] Tab:", key);
        setTimeout(() => loadTabData(key), 50);
      });
    });
    console.log("[Admin] ✅ Nav tabs wired");
  }

  function loadTabData(key) {
    if (key === "overview") loadOverview();
    if (key === "students") loadStudents();
    if (key === "grades")   populateStudentSelects();
    if (key === "fees")     populateStudentSelects();
    if (key === "messages") { populateStudentSelects(); loadRecentMessages(); }
  }

  // ============================================
  // 8. LOGOUT
  // ============================================
  function wireLogout() {
    const btn = document.getElementById("portalLogout");
    if (!btn) return;
    btn.onclick = async () => {
      if (!confirm("Log out?")) return;
      await signOut(auth);
      window.location.href = "login.html";
    };
    console.log("[Admin] ✅ Logout wired");
  }

  // ============================================
  // 9. OVERVIEW
  // ============================================
  async function loadOverview() {
    console.log("[Admin] Loading overview...");
    try {
      const studentsSnap = await getDocs(collection(db, "students"));
      const studentCount = studentsSnap.size;

      let totalGrades = 0, outstanding = 0, unread = 0;

      for (const s of studentsSnap.docs) {
        const gSnap = await getDocs(collection(db, "students", s.id, "grades"));
        totalGrades += gSnap.size;

        const fSnap = await getDocs(collection(db, "students", s.id, "fees"));
        fSnap.forEach(f => {
          const b = f.data().balance || 0;
          if (b > 0) outstanding += b;
        });

        const mSnap = await getDocs(collection(db, "students", s.id, "messages"));
        mSnap.forEach(m => {
          const d = m.data();
          if (!d.read && d.from === "student") unread++;
        });
      }

      document.getElementById("statStudents").textContent = studentCount;
      document.getElementById("statGrades").textContent = totalGrades;
      document.getElementById("statFees").textContent = formatUGX(outstanding);
      document.getElementById("statMsgs").textContent = unread;

      console.log("[Admin] ✅ Overview loaded");
    } catch (e) {
      console.error("[Admin] Overview failed:", e);
    }
  }

  // ============================================
  // 10. STUDENTS
  // ============================================
  function wireStudentButtons() {
    const addBtn = document.getElementById("addStudentBtn");
    if (addBtn) addBtn.onclick = () => openStudentModal();

    const search = document.getElementById("studentSearch");
    if (search) search.oninput = renderStudentList;

    const form = document.getElementById("studentForm");
    if (form) form.onsubmit = saveStudent;

    console.log("[Admin] ✅ Student buttons wired");
  }

  async function loadStudents() {
    const list = document.getElementById("studentsList");
    if (!list) return;
    list.textContent = "Loading…";

    try {
      const snap = await getDocs(collection(db, "students"));
      allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderStudentList();
      console.log("[Admin] ✅ Loaded", allStudents.length, "students");
    } catch (e) {
      console.error("[Admin] Load students failed:", e);
      list.textContent = "Failed to load: " + e.message;
    }
  }

  function renderStudentList() {
    const list = document.getElementById("studentsList");
    if (!list) return;

    const search = (document.getElementById("studentSearch")?.value || "").toLowerCase().trim();
    let filtered = allStudents;
    if (search) {
      filtered = allStudents.filter(s =>
        (s.name || "").toLowerCase().includes(search) ||
        (s.email || "").toLowerCase().includes(search) ||
        (s.class || "").toLowerCase().includes(search)
      );
    }

    if (filtered.length === 0) {
      list.innerHTML = `<p>${search ? "No students match your search." : "No students yet. Click <strong>+ Add Student</strong>."}</p>`;
      return;
    }

    list.innerHTML = filtered.map(s => `
      <div class="admin-row">
        <div class="admin-row-info">
          <strong>${escapeHTML(s.name || "Unnamed")}</strong>
          <span>${escapeHTML(s.email || "—")} · ${escapeHTML(s.class || "—")} · ${escapeHTML(s.house || "—")}</span>
        </div>
        <div class="admin-row-actions">
          <button class="admin-btn small" data-edit="${s.id}">Edit</button>
          <button class="admin-btn small" data-reset="${s.id}">Reset PW</button>
          <button class="admin-btn danger" data-del="${s.id}">Delete</button>
        </div>
      </div>
    `).join("");

    list.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => openStudentModal(b.dataset.edit));

    list.querySelectorAll("[data-reset]").forEach(b => {
      b.onclick = async () => {
        const s = allStudents.find(x => x.id === b.dataset.reset);
        if (!s?.email) return alert("No email on record");
        if (!confirm(`Send password reset email to ${s.email}?`)) return;
        try {
          await sendPasswordResetEmail(auth, s.email);
          alert("✅ Reset email sent to " + s.email);
        } catch (e) {
          alert("Failed: " + e.message);
        }
      };
    });

    list.querySelectorAll("[data-del]").forEach(b => {
      b.onclick = async () => {
        if (!confirm("Delete this student? (Firebase Auth account stays)")) return;
        try {
          await deleteDoc(doc(db, "students", b.dataset.del));
          loadStudents();
        } catch (e) {
          alert("Delete failed: " + e.message);
        }
      };
    });
  }

  function openStudentModal(docId) {
    document.getElementById("studentForm").reset();
    document.getElementById("studentFormError").textContent = "";
    document.getElementById("uidHelp").style.display = "none";

    if (docId) {
      const s = allStudents.find(x => x.id === docId);
      document.getElementById("studentModalTitle").textContent = "Edit Student";
      document.getElementById("studentDocId").value = docId;
      document.getElementById("studentNameInput").value = s.name || "";
      document.getElementById("studentEmailInput").value = s.email || "";
      document.getElementById("studentUidInput").value = s.uid || "";
      document.getElementById("studentClassInput").value = s.class || "";
      document.getElementById("studentHouseInput").value = s.house || "";
      document.getElementById("studentTermInput").value = s.term || "";
    } else {
      document.getElementById("studentModalTitle").textContent = "Add Student";
      document.getElementById("studentDocId").value = "";
      document.getElementById("uidHelp").style.display = "block";
    }

    document.getElementById("studentModal").classList.add("open");
  }

  async function saveStudent(e) {
    e.preventDefault();
    const err = document.getElementById("studentFormError");
    err.textContent = "";

    const docId = document.getElementById("studentDocId").value;
    const data = {
      name:  document.getElementById("studentNameInput").value.trim(),
      email: document.getElementById("studentEmailInput").value.trim().toLowerCase(),
      uid:   document.getElementById("studentUidInput").value.trim(),
      class: document.getElementById("studentClassInput").value.trim(),
      house: document.getElementById("studentHouseInput").value.trim(),
      term:  document.getElementById("studentTermInput").value.trim()
    };

    try {
      if (docId) {
        await updateDoc(doc(db, "students", docId), data);
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, "students"), data);
      }
      document.getElementById("studentModal").classList.remove("open");
      loadStudents();
    } catch (ex) {
      err.textContent = "Save failed: " + ex.message;
    }
  }

  // ============================================
  // 11. STUDENT SELECTS
  // ============================================
  async function populateStudentSelects() {
    if (allStudents.length === 0) {
      try {
        const snap = await getDocs(collection(db, "students"));
        allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.error("Populate selects failed:", e);
        return;
      }
    }

    const options = allStudents
      .map(s => `<option value="${s.id}">${escapeHTML(s.name)} — ${escapeHTML(s.class || "")}</option>`)
      .join("");

    ["gradeStudentFilter", "feeStudentFilter"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<option value="">— Select a student —</option>${options}`;
    });

    ["gradeStudentSelect", "feeStudentSelect"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = options;
    });

    const msgPick = document.getElementById("msgStudentPicker");
    if (msgPick) msgPick.innerHTML = `<option value="">— Select student —</option>${options}`;
  }

  // ============================================
  // 12. GRADES
  // ============================================
  function wireGradeButtons() {
    const addBtn = document.getElementById("addGradeBtn");
    if (addBtn) addBtn.onclick = () => openGradeModal();

    const printBtn = document.getElementById("printReportBtn");
    if (printBtn) printBtn.onclick = printReportCard;

    const filter = document.getElementById("gradeStudentFilter");
    if (filter) filter.onchange = (e) => {
      if (e.target.value) {
        currentStudentId = e.target.value;
        loadGradesForStudent(e.target.value);
      } else {
        currentStudentId = null;
        document.getElementById("gradesList").textContent = "Select a student above";
      }
    };

    const form = document.getElementById("gradeForm");
    if (form) form.onsubmit = saveGrade;

    console.log("[Admin] ✅ Grade buttons wired");
  }

  async function saveGrade(e) {
    e.preventDefault();
    const err = document.getElementById("gradeFormError");
    err.textContent = "";

    const studentId = document.getElementById("gradeStudentSelect").value;
    const docId = document.getElementById("gradeDocId").value;

    const data = {
      subject: document.getElementById("gradeSubject").value.trim(),
      score:   Number(document.getElementById("gradeScore").value),
      grade:   document.getElementById("gradeLetter").value.trim(),
      term:    document.getElementById("gradeTerm").value.trim(),
      teacher: document.getElementById("gradeTeacher").value.trim()
    };

    if (!studentId) { err.textContent = "Select a student"; return; }

    try {
      if (docId) {
        await updateDoc(doc(db, "students", studentId, "grades", docId), data);
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, "students", studentId, "grades"), data);
      }
      document.getElementById("gradeModal").classList.remove("open");
      if (document.getElementById("gradeStudentFilter").value === studentId) {
        loadGradesForStudent(studentId);
      }
    } catch (ex) {
      err.textContent = "Save failed: " + ex.message;
    }
  }

  function openGradeModal(grade) {
    document.getElementById("gradeForm").reset();
    document.getElementById("gradeFormError").textContent = "";
    document.getElementById("gradeDocId").value = grade?.id || "";

    const filterVal = document.getElementById("gradeStudentFilter").value;
    if (filterVal) document.getElementById("gradeStudentSelect").value = filterVal;

    if (grade) {
      document.getElementById("gradeModalTitle").textContent = "Edit Grade";
      document.getElementById("gradeSubject").value = grade.subject || "";
      document.getElementById("gradeScore").value   = grade.score ?? "";
      document.getElementById("gradeLetter").value  = grade.grade || "";
      document.getElementById("gradeTerm").value    = grade.term || "";
      document.getElementById("gradeTeacher").value = grade.teacher || "";
    } else {
      document.getElementById("gradeModalTitle").textContent = "Add Grade";
    }

    document.getElementById("gradeModal").classList.add("open");
  }

  async function loadGradesForStudent(studentId) {
    const list = document.getElementById("gradesList");
    list.textContent = "Loading…";

    try {
      const snap = await getDocs(collection(db, "students", studentId, "grades"));
      const grades = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (grades.length === 0) {
        list.innerHTML = "<p>No grades recorded yet.</p>";
        return;
      }

      list.innerHTML = `
        <table class="admin-table">
          <thead><tr><th>Subject</th><th>Score</th><th>Grade</th><th>Term</th><th>Teacher</th><th>Actions</th></tr></thead>
          <tbody>
            ${grades.map(g => `
              <tr>
                <td>${escapeHTML(g.subject)}</td>
                <td>${escapeHTML(g.score)}</td>
                <td>${escapeHTML(g.grade)}</td>
                <td>${escapeHTML(g.term)}</td>
                <td>${escapeHTML(g.teacher)}</td>
                <td>
                  <button class="admin-btn small" data-gedit="${g.id}">Edit</button>
                  <button class="admin-btn danger" data-gdel="${g.id}">Delete</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;

      list.querySelectorAll("[data-gedit]").forEach(b => {
        const grade = grades.find(g => g.id === b.dataset.gedit);
        b.onclick = () => openGradeModal(grade);
      });

      list.querySelectorAll("[data-gdel]").forEach(b => {
        b.onclick = async () => {
          if (!confirm("Delete this grade?")) return;
          await deleteDoc(doc(db, "students", studentId, "grades", b.dataset.gdel));
          loadGradesForStudent(studentId);
        };
      });
    } catch (e) {
      console.error("Load grades failed:", e);
      list.textContent = "Failed: " + e.message;
    }
  }

  async function printReportCard() {
    if (!currentStudentId) return alert("Select a student first");
    const student = allStudents.find(s => s.id === currentStudentId);
    if (!student) return alert("Student not found");

    try {
      const snap = await getDocs(collection(db, "students", currentStudentId, "grades"));
      const grades = snap.docs.map(d => d.data());

      const totalScore = grades.reduce((sum, g) => sum + (Number(g.score) || 0), 0);
      const avgScore = grades.length ? (totalScore / grades.length).toFixed(1) : "—";

      document.getElementById("printArea").innerHTML = `
        <div class="print-header">
          <h1>Bishop Angelo Tarantino Memorial Secondary School</h1>
          <p>Report Card</p>
          <p><strong>${escapeHTML(student.name)}</strong> — ${escapeHTML(student.class || "")}</p>
          <p>Term: ${escapeHTML(student.term || "—")} · Date: ${new Date().toLocaleDateString()}</p>
        </div>
        <table class="print-table">
          <thead><tr><th>Subject</th><th>Score</th><th>Grade</th><th>Teacher</th></tr></thead>
          <tbody>
            ${grades.map(g => `
              <tr>
                <td>${escapeHTML(g.subject)}</td>
                <td>${escapeHTML(g.score)}</td>
                <td>${escapeHTML(g.grade)}</td>
                <td>${escapeHTML(g.teacher)}</td>
              </tr>
            `).join("")}
            <tr>
              <td colspan="2"><strong>Average:</strong> ${avgScore}</td>
              <td colspan="2"><strong>Total:</strong> ${totalScore}</td>
            </tr>
          </tbody>
        </table>
        <p style="margin-top:30px">Signature: _____________________</p>
        <p>Date: _____________________</p>
      `;

      window.print();
    } catch (e) {
      alert("Print failed: " + e.message);
    }
  }

  // ============================================
  // 13. FEES
  // ============================================
  function wireFeeButtons() {
    const addBtn = document.getElementById("addFeeBtn");
    if (addBtn) addBtn.onclick = () => openFeeModal();

    const printBtn = document.getElementById("printReceiptBtn");
    if (printBtn) printBtn.onclick = printReceipt;

    const filter = document.getElementById("feeStudentFilter");
    if (filter) filter.onchange = (e) => {
      if (e.target.value) {
        currentStudentId = e.target.value;
        loadFeesForStudent(e.target.value);
      } else {
        currentStudentId = null;
        document.getElementById("feesList").textContent = "Select a student above";
      }
    };

    const form = document.getElementById("feeForm");
    if (form) form.onsubmit = saveFee;

    console.log("[Admin] ✅ Fee buttons wired");
  }

  async function saveFee(e) {
    e.preventDefault();
    const err = document.getElementById("feeFormError");
    err.textContent = "";

    const studentId = document.getElementById("feeStudentSelect").value;
    const docId = document.getElementById("feeDocId").value;

    const amount = Number(document.getElementById("feeAmount").value);
    const paid   = Number(document.getElementById("feePaid").value);

    const data = {
      term:    document.getElementById("feeTerm").value.trim(),
      amount,
      paid,
      balance: amount - paid
    };

    if (!studentId) { err.textContent = "Select a student"; return; }

    try {
      if (docId) {
        await updateDoc(doc(db, "students", studentId, "fees", docId), data);
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, "students", studentId, "fees"), data);
      }
      document.getElementById("feeModal").classList.remove("open");
      if (document.getElementById("feeStudentFilter").value === studentId) {
        loadFeesForStudent(studentId);
      }
    } catch (ex) {
      err.textContent = "Save failed: " + ex.message;
    }
  }

  function openFeeModal(fee) {
    document.getElementById("feeForm").reset();
    document.getElementById("feeFormError").textContent = "";
    document.getElementById("feeDocId").value = fee?.id || "";

    const filterVal = document.getElementById("feeStudentFilter").value;
    if (filterVal) document.getElementById("feeStudentSelect").value = filterVal;

    if (fee) {
      document.getElementById("feeModalTitle").textContent = "Edit Fee";
      document.getElementById("feeTerm").value   = fee.term || "";
      document.getElementById("feeAmount").value = fee.amount ?? "";
      document.getElementById("feePaid").value   = fee.paid ?? "";
    } else {
      document.getElementById("feeModalTitle").textContent = "Record Fee";
    }

    document.getElementById("feeModal").classList.add("open");
  }

  async function loadFeesForStudent(studentId) {
    const list = document.getElementById("feesList");
    list.textContent = "Loading…";

    try {
      const snap = await getDocs(collection(db, "students", studentId, "fees"));
      const fees = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (fees.length === 0) {
        list.innerHTML = "<p>No fee records yet.</p>";
        return;
      }

      list.innerHTML = `
        <table class="admin-table">
          <thead><tr><th>Term</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Actions</th></tr></thead>
          <tbody>
            ${fees.map(f => `
              <tr>
                <td>${escapeHTML(f.term)}</td>
                <td>${formatUGX(f.amount)}</td>
                <td>${formatUGX(f.paid)}</td>
                <td style="color:${(f.balance||0)>0?'#dc2626':'#059669'};font-weight:700">${formatUGX(f.balance)}</td>
                <td>
                  <button class="admin-btn small" data-fedit="${f.id}">Edit</button>
                  <button class="admin-btn danger" data-fdel="${f.id}">Delete</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;

      list.querySelectorAll("[data-fedit]").forEach(b => {
        const fee = fees.find(f => f.id === b.dataset.fedit);
        b.onclick = () => openFeeModal(fee);
      });

      list.querySelectorAll("[data-fdel]").forEach(b => {
        b.onclick = async () => {
          if (!confirm("Delete this fee record?")) return;
          await deleteDoc(doc(db, "students", studentId, "fees", b.dataset.fdel));
          loadFeesForStudent(studentId);
        };
      });
    } catch (e) {
      list.textContent = "Failed: " + e.message;
    }
  }

  async function printReceipt() {
    if (!currentStudentId) return alert("Select a student first");
    const student = allStudents.find(s => s.id === currentStudentId);

    try {
      const snap = await getDocs(collection(db, "students", currentStudentId, "fees"));
      const fees = snap.docs.map(d => d.data()).sort((a, b) => (b.term || "").localeCompare(a.term || ""));

      if (fees.length === 0) return alert("No fee records to print");

      document.getElementById("printArea").innerHTML = `
        <div class="print-header">
          <h1>Bishop Angelo Tarantino Memorial Secondary School</h1>
          <p>Fee Receipt</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>
        <p><strong>Student:</strong> ${escapeHTML(student.name)} (${escapeHTML(student.class || "")})</p>
        <table class="print-table">
          <thead><tr><th>Term</th><th>Total</th><th>Paid</th><th>Balance</th></tr></thead>
          <tbody>
            ${fees.map(f => `
              <tr>
                <td>${escapeHTML(f.term)}</td>
                <td>${formatUGX(f.amount)}</td>
                <td>${formatUGX(f.paid)}</td>
                <td>${formatUGX(f.balance)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <p style="margin-top:30px">Bursar Signature: _____________________</p>
      `;
      window.print();
    } catch (e) {
      alert("Print failed: " + e.message);
    }
  }

  // ============================================
  // 14. TIMETABLE
  // ============================================
  function wireTimetableButtons() {
    const addBtn = document.getElementById("addSlotBtn");
    if (addBtn) addBtn.onclick = () => openSlotModal();

    const input = document.getElementById("ttClassInput");
    if (input) input.onchange = () => {
      if (input.value.trim()) loadTimetableForClass(input.value.trim());
      else document.getElementById("timetableList").textContent = "Enter a class name";
    };

    const form = document.getElementById("slotForm");
    if (form) form.onsubmit = saveSlot;

    console.log("[Admin] ✅ Timetable buttons wired");
  }

  async function saveSlot(e) {
    e.preventDefault();
    const err = document.getElementById("slotFormError");
    err.textContent = "";

    const cls = document.getElementById("slotClass").value.trim();
    const day = document.getElementById("slotDay").value;
    const editIdx = document.getElementById("slotEditIdx").value;
    const editDay = document.getElementById("slotEditDay").value;

    const slot = {
      subject: document.getElementById("slotSubject").value.trim(),
      teacher: document.getElementById("slotTeacher").value.trim(),
      room:    document.getElementById("slotRoom").value.trim()
    };

    try {
      if (editIdx !== "" && editDay && editDay !== day) {
        const oldRef = doc(db, "timetable", cls, "days", editDay);
        const oldSnap = await getDoc(oldRef);
        if (oldSnap.exists()) {
          const arr = (oldSnap.data().slots || []).filter((_, i) => i !== Number(editIdx));
          await setDoc(oldRef, { slots: arr });
        }
      }

      const dayRef = doc(db, "timetable", cls, "days", day);
      const existing = await getDoc(dayRef);
      let arr = existing.exists() ? (existing.data().slots || []) : [];

      if (editIdx !== "" && editDay === day) {
        arr[Number(editIdx)] = slot;
      } else {
        arr.push(slot);
      }

      await setDoc(dayRef, { slots: arr }, { merge: true });

      document.getElementById("slotModal").classList.remove("open");
      loadTimetableForClass(cls);
    } catch (ex) {
      err.textContent = "Save failed: " + ex.message;
    }
  }

  function openSlotModal(slot, cls, day, idx) {
    document.getElementById("slotForm").reset();
    document.getElementById("slotFormError").textContent = "";

    const input = document.getElementById("ttClassInput");
    const currentClass = cls || input.value.trim();

    if (!currentClass) {
      alert("Enter a class name first");
      input.focus();
      return;
    }

    document.getElementById("slotClass").value = currentClass;

    if (slot) {
      document.getElementById("slotModalTitle").textContent = "Edit Timetable Slot";
      document.getElementById("slotEditIdx").value = idx;
      document.getElementById("slotEditDay").value = day;
      document.getElementById("slotDay").value = day;
      document.getElementById("slotSubject").value = slot.subject || "";
      document.getElementById("slotTeacher").value = slot.teacher || "";
      document.getElementById("slotRoom").value    = slot.room || "";
    } else {
      document.getElementById("slotModalTitle").textContent = "Add Timetable Slot";
      document.getElementById("slotEditIdx").value = "";
      document.getElementById("slotEditDay").value = "";
    }

    document.getElementById("slotModal").classList.add("open");
  }

  async function loadTimetableForClass(cls) {
    const list = document.getElementById("timetableList");
    list.textContent = "Loading…";

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    let rows = [];

    try {
      for (const d of days) {
        const dayDoc = await getDoc(doc(db, "timetable", cls, "days", d));
        const slots = dayDoc.exists() ? (dayDoc.data().slots || []) : [];
        slots.forEach((s, i) => rows.push({ day: d, idx: i, ...s }));
      }

      if (rows.length === 0) {
        list.innerHTML = "<p>No slots yet. Click <strong>+ Add Slot</strong>.</p>";
        return;
      }

      list.innerHTML = `
        <table class="admin-table">
          <thead><tr><th>Day</th><th>Subject</th><th>Teacher</th><th>Room</th><th>Actions</th></tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${r.day}</td>
                <td>${escapeHTML(r.subject)}</td>
                <td>${escapeHTML(r.teacher)}</td>
                <td>${escapeHTML(r.room)}</td>
                <td>
                  <button class="admin-btn small" data-sedit="${r.day}|${r.idx}">Edit</button>
                  <button class="admin-btn danger" data-sdel="${r.day}|${r.idx}">Delete</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;

      list.querySelectorAll("[data-sedit]").forEach(b => {
        const [day, idx] = b.dataset.sedit.split("|");
        const slot = rows.find(r => r.day === day && r.idx === Number(idx));
        b.onclick = () => openSlotModal(slot, cls, day, Number(idx));
      });

      list.querySelectorAll("[data-sdel]").forEach(b => {
        b.onclick = async () => {
          if (!confirm("Delete this slot?")) return;
          const [day, idx] = b.dataset.sdel.split("|");
          const dayRef = doc(db, "timetable", cls, "days", day);
          const snap = await getDoc(dayRef);
          if (!snap.exists()) return;
          const arr = (snap.data().slots || []).filter((_, i) => i !== Number(idx));
          await setDoc(dayRef, { slots: arr });
          loadTimetableForClass(cls);
        };
      });
    } catch (e) {
      list.textContent = "Failed: " + e.message;
    }
  }

  // ============================================
  // 15. MESSAGES
  // ============================================
  function wireMessageButtons() {
    document.querySelectorAll("input[name=msgTarget]").forEach(r => {
      r.onchange = () => {
        const v = document.querySelector("input[name=msgTarget]:checked").value;
        document.getElementById("msgTargetPicker").style.display = v === "all" ? "none" : "block";
        document.getElementById("msgClassInput").style.display   = v === "class" ? "block" : "none";
        document.getElementById("msgStudentPicker").style.display = v === "one" ? "block" : "none";
      };
    });

    const sendBtn = document.getElementById("sendAnnouncementBtn");
    if (sendBtn) sendBtn.onclick = sendAnnouncement;

    console.log("[Admin] ✅ Message buttons wired");
  }

  async function sendAnnouncement() {
    const text = document.getElementById("announcementText").value.trim();
    if (!text) return alert("Type a message");

    const target = document.querySelector("input[name=msgTarget]:checked").value;
    const btn = document.getElementById("sendAnnouncementBtn");
    btn.disabled = true;
    btn.textContent = "Sending…";

    try {
      let recipients = [];
      if (target === "all") {
        recipients = allStudents.map(s => s.id);
      } else if (target === "class") {
        const cls = document.getElementById("msgClassInput").value.trim();
        recipients = allStudents.filter(s => s.class === cls).map(s => s.id);
      } else {
        const one = document.getElementById("msgStudentPicker").value;
        if (one) recipients = [one];
      }

      if (recipients.length === 0) return alert("No recipients found");

      for (const sid of recipients) {
        await addDoc(collection(db, "students", sid, "messages"), {
          from: "admin",
          fromName: window.tarantinoUser?.displayName || "School Admin",
          text,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      document.getElementById("announcementText").value = "";
      alert(`✅ Sent to ${recipients.length} student(s)`);
      loadRecentMessages();
    } catch (ex) {
      alert("Send failed: " + ex.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Send Announcement";
    }
  }

  async function loadRecentMessages() {
    const list = document.getElementById("messagesList");
    list.textContent = "Loading…";

    try {
      let all = [];
      for (const s of allStudents) {
        const snap = await getDocs(collection(db, "students", s.id, "messages"));
        snap.forEach(m => all.push({ studentName: s.name, studentId: s.id, ...m.data(), _id: m.id }));
      }

      all.sort((a, b) => ((b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
      all = all.slice(0, 30);

      if (all.length === 0) {
        list.innerHTML = "<p>No messages yet.</p>";
        return;
      }

      list.innerHTML = all.map(m => `
        <div class="admin-row">
          <div class="admin-row-info">
            <strong>${escapeHTML(m.studentName || "—")} ← ${escapeHTML(m.from === "admin" ? "Admin" : "Student")}</strong>
            <span>${escapeHTML(m.text)} · ${formatDate(m.createdAt)}</span>
          </div>
          <div class="admin-row-actions">
            <button class="admin-btn danger" data-mdel="${m.studentId}|${m._id}">Delete</button>
          </div>
        </div>
      `).join("");

      list.querySelectorAll("[data-mdel]").forEach(b => {
        b.onclick = async () => {
          if (!confirm("Delete this message?")) return;
          const [sid, mid] = b.dataset.mdel.split("|");
          await deleteDoc(doc(db, "students", sid, "messages", mid));
          loadRecentMessages();
        };
      });
    } catch (e) {
      list.textContent = "Failed: " + e.message;
    }
  }

  // ============================================
  // 16. CSV IMPORT
  // ============================================
  function wireCsvImport() {
    const btn = document.getElementById("importCsvBtn");
    const fileInput = document.getElementById("csvFileInput");
    const confirmBtn = document.getElementById("csvImportConfirm");

    if (btn) btn.onclick = () => {
      document.getElementById("csvModal").classList.add("open");
      csvRows = [];
      if (fileInput) fileInput.value = "";
      document.getElementById("csvPreview").innerHTML = "";
      document.getElementById("csvError").textContent = "";
      if (confirmBtn) confirmBtn.disabled = true;
    };

    if (fileInput) fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        csvRows = parseCSV(ev.target.result);

        if (csvRows.length === 0) {
          document.getElementById("csvError").textContent = "No valid rows found.";
          return;
        }

        const preview = document.getElementById("csvPreview");
        preview.innerHTML = `
          <table>
            <thead><tr>${Object.keys(csvRows[0]).map(k => `<th>${escapeHTML(k)}</th>`).join("")}</tr></thead>
            <tbody>
              ${csvRows.slice(0, 10).map(r => `
                <tr>${Object.values(r).map(v => `<td>${escapeHTML(v)}</td>`).join("")}</tr>
              `).join("")}
            </tbody>
          </table>
          <p style="margin-top:8px;color:#6b7280;font-size:12px">${csvRows.length} rows (showing first 10)</p>
        `;

        if (confirmBtn) confirmBtn.disabled = false;
      };
      reader.readAsText(file);
    };

    if (confirmBtn) confirmBtn.onclick = async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Importing…";

      let imported = 0, failed = 0;
      for (const row of csvRows) {
        try {
          const email = (row.email || "").trim().toLowerCase();
          if (!email) { failed++; continue; }

          await addDoc(collection(db, "students"), {
            name: row.name || "",
            email,
            uid: row.uid || "",
            class: row.class || "",
            house: row.house || "",
            term: row.term || "",
            createdAt: serverTimestamp()
          });
          imported++;
        } catch (ex) {
          failed++;
        }
      }

      alert(`✅ Imported ${imported}. ${failed} failed.`);
      document.getElementById("csvModal").classList.remove("open");
      confirmBtn.textContent = "Import";
      loadStudents();
    };

    console.log("[Admin] ✅ CSV import wired");
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = splitCSVLine(lines[i]);
      const obj = {};
      headers.forEach((h, idx) => obj[h] = (values[idx] || "").trim());
      rows.push(obj);
    }
    return rows;
  }

  function splitCSVLine(line) {
    const out = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = !inQ;
      else if (c === ',' && !inQ) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out;
  }

  // ============================================
  // 17. MODAL CLOSE
  // ============================================
  function wireModalCloseButtons() {
    document.querySelectorAll("[data-close]").forEach(el => {
      el.onclick = () => document.getElementById(el.dataset.close).classList.remove("open");
    });

    document.querySelectorAll(".admin-modal").forEach(m => {
      m.onclick = (e) => {
        if (e.target === m) m.classList.remove("open");
      };
    });

    console.log("[Admin] ✅ Modal close wired");
  }

  console.log("[Admin] Module loaded — waiting for auth...");
})();