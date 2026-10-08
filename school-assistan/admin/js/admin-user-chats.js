/* ============================================
   Admin User Chats Viewer
   Reads the AI chat history stored under:
   users/{uid}/sessions/{sessionId}/messages
   ============================================ */

import {
  collection, doc, getDoc, getDocs,
  query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

async function waitForFirebase() {
  if (window.tarantinoAuth?.db && window.tarantinoAuth?.auth) return window.tarantinoAuth;
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (window.tarantinoAuth?.db && window.tarantinoAuth?.auth) {
        clearInterval(timer);
        resolve(window.tarantinoAuth);
      } else if (Date.now() - start > 10000) {
        clearInterval(timer);
        reject(new Error("Firebase is not ready."));
      }
    }, 50);
  });
}

const escapeHTML = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

let allUsers = [];
let selectedUid = null;

function formatDate(value) {
  try {
    return value?.toDate ? value.toDate().toLocaleString() : "—";
  } catch (_) { return "—"; }
}

async function isAdmin(db, auth) {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  const snap = await getDoc(doc(db, "adminUser", uid));
  return snap.exists() && snap.data()?.role === "admin";
}

async function loadUsers() {
  const { db, auth } = await waitForFirebase();
  if (!(await isAdmin(db, auth))) throw new Error("Admin access required.");

  const snap = await getDocs(collection(db, "users"));
  const users = [];

  for (const userDoc of snap.docs) {
    const data = userDoc.data() || {};
    const sessionsSnap = await getDocs(collection(db, "users", userDoc.id, "sessions"));
    if (sessionsSnap.empty) continue;

    let messageCount = 0;
    let latest = null;
    const sessions = [];

    for (const sessionDoc of sessionsSnap.docs) {
      const session = { id: sessionDoc.id, ...sessionDoc.data() };
      const messagesSnap = await getDocs(query(
        collection(db, "users", userDoc.id, "sessions", sessionDoc.id, "messages"),
        orderBy("createdAt", "asc")
      ));
      const messages = messagesSnap.docs.map(m => ({ id: m.id, ...m.data() }));
      messageCount += messages.length;
      sessions.push({ ...session, messages });
      if (!latest || (session.updatedAt?.toMillis?.() || 0) > (latest?.updatedAt?.toMillis?.() || 0)) latest = session;
    }

    users.push({
      uid: userDoc.id,
      email: data.email || "No email",
      displayName: data.displayName || data.email?.split("@")[0] || "User",
      sessions,
      messageCount,
      updatedAt: latest?.updatedAt || data.lastLogin || data.createdAt || null
    });
  }

  users.sort((a,b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
  allUsers = users;

  const totalMessages = users.reduce((sum,u) => sum + u.messageCount, 0);
  document.getElementById("chatUserTotal").textContent = users.length;
  document.getElementById("chatSessionTotal").textContent = users.reduce((sum,u) => sum + u.sessions.length, 0);
  document.getElementById("chatMessageTotal").textContent = totalMessages;

  renderUsers();
  if (selectedUid) renderSelectedUser();
}

function renderUsers() {
  const box = document.getElementById("userChatUsers");
  const term = (document.getElementById("userChatSearch")?.value || "").trim().toLowerCase();
  const users = allUsers.filter(u =>
    !term || u.displayName.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
  );

  if (!users.length) {
    box.innerHTML = '<div class="chat-empty-state">No users with saved chats.</div>';
    return;
  }

  box.innerHTML = users.map(u => `
    <div class="chat-user-card ${selectedUid === u.uid ? "active" : ""}" data-uid="${escapeHTML(u.uid)}">
      <div class="chat-user-name">${escapeHTML(u.displayName)}</div>
      <div class="chat-user-meta">${escapeHTML(u.email)}</div>
      <div class="chat-user-meta">${u.sessions.length} chat${u.sessions.length === 1 ? "" : "s"} · ${u.messageCount} messages · ${escapeHTML(formatDate(u.updatedAt))}</div>
    </div>
  `).join("");

  box.querySelectorAll(".chat-user-card").forEach(card => {
    card.addEventListener("click", () => {
      selectedUid = card.dataset.uid;
      renderUsers();
      renderSelectedUser();
    });
  });
}

function renderSelectedUser() {
  const box = document.getElementById("userChatMessages");
  const user = allUsers.find(u => u.uid === selectedUid);
  if (!user) {
    box.innerHTML = '<div class="chat-empty-state">Select a user to view their conversations.</div>';
    return;
  }

  if (!user.sessions.length) {
    box.innerHTML = '<div class="chat-empty-state">This user has no saved conversations.</div>';
    return;
  }

  box.innerHTML = `
    <div style="margin-bottom:14px;">
      <strong>${escapeHTML(user.displayName)}</strong><br>
      <span style="font-size:13px;color:#64748b;">${escapeHTML(user.email)}</span>
    </div>
    ${user.sessions.map(s => `
      <div class="chat-session-card">
        <div class="chat-session-head">
          ${escapeHTML(s.title || "Untitled chat")}
          <span style="float:right;font-size:12px;font-weight:400;color:#64748b;">${escapeHTML(formatDate(s.updatedAt))}</span>
        </div>
        ${s.messages.length ? s.messages.map(m => `
          <div class="chat-message ${m.sender === "user" ? "user" : "bot"}">
            <div class="chat-message-label">${m.sender === "user" ? "User" : "AI Assistant"}</div>
            <div>${escapeHTML(m.text || "")}</div>
          </div>
        `).join("") : '<div class="chat-message">No messages.</div>'}
      </div>
    `).join("")}
  `;
}

function bindUI() {
  document.querySelectorAll(".faq-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.maintab;
      document.querySelectorAll(".faq-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll("section[id^='maintab-']").forEach(section => section.style.display = "none");
      const section = document.getElementById(`maintab-${target}`);
      if (section) section.style.display = "block";
      if (target === "chats") loadUsers().catch(showError);
    });
  });

  document.getElementById("refreshUserChatsBtn")?.addEventListener("click", () => {
    loadUsers().catch(showError);
  });
  document.getElementById("userChatSearch")?.addEventListener("input", renderUsers);
}

function showError(error) {
  console.error("[Admin Chats]", error);
  document.getElementById("userChatUsers").innerHTML =
    `<div class="chat-empty-state">Unable to load chats. ${escapeHTML(error?.message || "Please check Firestore permissions.")}</div>`;
}

(async function init() {
  try {
    await waitForFirebase();
    bindUI();
  } catch (error) {
    showError(error);
  }
})();
