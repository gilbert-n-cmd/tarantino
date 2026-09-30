/* ============================================
   Admin Panel Logic — Tarantino AI
   ============================================ */

import { 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

function waitForFirebase() {
  return new Promise((resolve) => {
    if (window.tarantinoAuth?.auth && window.tarantinoAuth?.db) {
      return resolve(window.tarantinoAuth);
    }
    const check = setInterval(() => {
      if (window.tarantinoAuth?.auth && window.tarantinoAuth?.db) {
        clearInterval(check);
        resolve(window.tarantinoAuth);
      }
    }, 20);
    setTimeout(() => clearInterval(check), 10000);
  });
}

(async () => {
  const { auth, db } = await waitForFirebase();
  console.log("[AdminPanel] Starting…");

  // --- DOM Elements ---
  const logoutBtn = document.getElementById("logoutBtn");
  const adminEmailDisplay = document.getElementById("adminEmailDisplay");
  const pageTitle = document.getElementById("pageTitle");
  
  // Navigation
  const navLinks = document.querySelectorAll(".sidebar-nav a");
  const tabContents = document.querySelectorAll(".tab-content");

  // Knowledge Base
  const knowledgeForm = document.getElementById("knowledgeForm");
  const kbTitle = document.getElementById("kbTitle");
  const kbContent = document.getElementById("kbContent");
  const kbCategory = document.getElementById("kbCategory");
  const saveKbBtn = document.getElementById("saveKbBtn");
  const knowledgeList = document.getElementById("knowledgeList");

  // --- Auth Guard ---
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // Not logged in → kick back to login
      window.location.replace("admin-login.html");
      return;
    }
    adminEmailDisplay.textContent = user.email;
  });

  // --- Logout ---
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.replace("admin-login.html");
  });

  // --- Tab Navigation ---
  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      
      // Update active link
      navLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      // Show correct tab
      const tabId = link.dataset.tab;
      tabContents.forEach(tab => {
        tab.style.display = tab.id === `tab-${tabId}` ? "block" : "none";
      });

      // Update page title
      pageTitle.textContent = link.textContent;
    });
  });

  // --- Knowledge Base Logic ---

  // 1. Load Knowledge
  async function loadKnowledge() {
    knowledgeList.innerHTML = '<div class="loading">Loading knowledge base...</div>';
    try {
      const q = query(collection(db, "knowledge"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        knowledgeList.innerHTML = '<p style="color: var(--text-light); text-align: center;">No knowledge entries yet. Add one above!</p>';
        return;
      }

      knowledgeList.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const div = document.createElement("div");
        div.className = "knowledge-item";
        
        // Format timestamp
        let dateStr = "Just now";
        if (data.createdAt) {
          dateStr = data.createdAt.toDate().toLocaleDateString();
        }

        div.innerHTML = `
          <div class="knowledge-item-content">
            <h3>${data.title}</h3>
            <p>${data.content.substring(0, 150)}${data.content.length > 150 ? '...' : ''}</p>
            <span class="tag">${data.category || 'general'}</span>
            <span style="font-size: 0.75rem; color: var(--text-light); margin-left: 0.5rem;">${dateStr}</span>
          </div>
          <div class="actions">
            <button class="btn-sm btn-danger" data-id="${doc.id}">Delete</button>
          </div>
        `;
        knowledgeList.appendChild(div);
      });

      // Attach delete listeners
      document.querySelectorAll(".btn-danger").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const id = e.target.dataset.id;
          if (confirm("Are you sure you want to delete this knowledge?")) {
            await deleteDoc(doc(db, "knowledge", id));
            loadKnowledge(); // Refresh list
          }
        });
      });

    } catch (error) {
      console.error("[AdminPanel] Error loading knowledge:", error);
      knowledgeList.innerHTML = '<p style="color: red;">Failed to load knowledge base.</p>';
    }
  }

  // 2. Save New Knowledge
  knowledgeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    saveKbBtn.disabled = true;
    saveKbBtn.textContent = "Saving...";

    try {
      await addDoc(collection(db, "knowledge"), {
        title: kbTitle.value.trim(),
        content: kbContent.value.trim(),
        category: kbCategory.value,
        createdAt: serverTimestamp(),
        author: auth.currentUser.email
      });

      // Clear form
      knowledgeForm.reset();
      
      // Reload list
      await loadKnowledge();
      
      alert("Knowledge saved successfully!");
    } catch (error) {
      console.error("[AdminPanel] Error saving knowledge:", error);
      alert("Failed to save knowledge. Check console for details.");
    } finally {
      saveKbBtn.disabled = false;
      saveKbBtn.textContent = "Save Knowledge";
    }
  });

  // --- Initial Load ---
  loadKnowledge();

  console.log("[AdminPanel] Ready");
})();

