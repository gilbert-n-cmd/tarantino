/* ============================================
   AI Guide Bot — Main Logic
   Bishop Angelo Tarantino Memorial Secondary School
   ============================================ */

(function () {
  "use strict";

  let botInitialized = false;
  let conversationHistory = [];
  let currentSessionId = null;
  let isLoggedIn = false;
  let currentUserName = null;

  let botButton, botWindow, messagesBox, inputField, sendButton;
  let authBadge, historyButton;

  /* ============================================
     INIT
     ============================================ */
  async function initBot() {
    if (botInitialized) return;
    botInitialized = true;

    if (typeof SITE_ACTIONS === "undefined") {
      console.error("[AI Bot] ai-knowledge.js not loaded");
      return;
    }

    injectHTML();
    cacheElements();
    attachEvents();
    showWelcome();

    window.addEventListener("auth:login", onLogin);
    window.addEventListener("auth:logout", onLogout);

    if (typeof window.tarantinoWaitAuth === "function") {
      const user = await window.tarantinoWaitAuth();
      if (user && !isLoggedIn) onLogin({ detail: user });
    }
  }

  /* ---------- HTML ---------- */
  function injectHTML() {
    const html = `
      <div id="ai-bot-button" role="button" aria-label="Open school assistant" tabindex="0">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="6" r="2" fill="#0d3b66"/>
          <circle cx="18" cy="6" r="2" fill="#0d3b66"/>
          <circle cx="6" cy="18" r="2" fill="#0d3b66"/>
          <circle cx="18" cy="18" r="2" fill="#0d3b66"/>
          <circle cx="12" cy="12" r="3" fill="#0d3b66"/>
          <path d="M6 6L12 12M18 6L12 12M6 18L12 12M18 18L12 12"
                stroke="#0d3b66" stroke-width="1.5" opacity="0.7"/>
        </svg>
      </div>

      <div id="ai-bot-window" role="dialog" aria-label="School assistant chat">
        <div id="ai-bot-header">
          <div class="title">
            <span>🎓 School Assistant</span>
            <span class="status" id="ai-bot-status">● Online — guest mode</span>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <button id="ai-bot-history" title="Chat history" style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px">🕘</button>
            <button id="ai-bot-auth" title="Login / Account" style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px">👤</button>
            <button id="ai-bot-close" aria-label="Close chat">✖</button>
          </div>
        </div>

        <div id="ai-bot-messages" aria-live="polite"></div>

        <div id="ai-bot-input-row">
          <input id="ai-bot-input" type="text" placeholder="Ask about admissions, fees..." autocomplete="off" />
          <button id="ai-bot-send">Send</button>
        </div>
      </div>

      <!-- Auth Modal -->
      <div id="ai-auth-modal">
        <div class="ai-auth-box">
          <button class="ai-auth-close" id="ai-auth-close">✖</button>
          <h2 id="ai-auth-title">Welcome Back</h2>
          <p id="ai-auth-sub">Sign in to save your chat history</p>

          <form id="ai-auth-form">
            <div id="ai-auth-name-row" style="display:none">
              <input type="text" id="ai-auth-name" placeholder="Your name" />
            </div>
            <input type="email"    id="ai-auth-email"    placeholder="Email address" required />
            <input type="password" id="ai-auth-password" placeholder="Password (min 6 chars)" required minlength="6" />
            <button type="submit" id="ai-auth-submit">Sign In</button>
          </form>

          <p class="ai-auth-switch">
            <span id="ai-auth-switch-text">Don't have an account?</span>
            <a href="#" id="ai-auth-switch-link">Sign up</a>
          </p>

          <p class="ai-auth-guest">
            <a href="#" id="ai-auth-continue-guest">Continue as guest (no history saved)</a>
          </p>

          <p class="ai-auth-error" id="ai-auth-error"></p>
        </div>
      </div>

      <!-- History Modal -->
      <div id="ai-history-modal">
        <div class="ai-history-box">
          <button class="ai-auth-close" id="ai-history-close">✖</button>
          <h2>Your Chats</h2>
          <button id="ai-history-new">+ New Chat</button>
          <div id="ai-history-list">Loading…</div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
  }

  function cacheElements() {
    botButton     = document.getElementById("ai-bot-button");
    botWindow     = document.getElementById("ai-bot-window");
    messagesBox   = document.getElementById("ai-bot-messages");
    inputField    = document.getElementById("ai-bot-input");
    sendButton    = document.getElementById("ai-bot-send");
    authBadge     = document.getElementById("ai-bot-auth");
    historyButton = document.getElementById("ai-bot-history");
  }

  function attachEvents() {
    botButton.addEventListener("click", toggleBot);
    botButton.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleBot();
      }
    });

    document.getElementById("ai-bot-close").addEventListener("click", toggleBot);
    sendButton.addEventListener("click", handleSend);
    inputField.addEventListener("keypress", e => { if (e.key === "Enter") handleSend(); });

    authBadge.addEventListener("click", openAuthModal);
    document.getElementById("ai-auth-close").addEventListener("click", closeAuthModal);
    document.getElementById("ai-auth-continue-guest").addEventListener("click", (e) => {
      e.preventDefault();
      closeAuthModal();
    });

    historyButton.addEventListener("click", openHistoryModal);
    document.getElementById("ai-history-close").addEventListener("click", () => {
      document.getElementById("ai-history-modal").classList.remove("open");
    });
    document.getElementById("ai-history-new").addEventListener("click", startNewChat);

    setupAuthForm();
  }

  /* ============================================
     AUTH STATE HANDLERS
     ============================================ */
  async function onLogin(e) {
    isLoggedIn = true;
    const user = e.detail;
    currentUserName = user.displayName || user.email?.split("@")[0] || "there";

    document.getElementById("ai-bot-status").textContent =
      `● ${currentUserName} — history on`;
    authBadge.textContent = "🚪";
    authBadge.title = "Logout";

    await loadLatestOrNewSession();
  }

  function onLogout() {
    isLoggedIn = false;
    currentSessionId = null;
    currentUserName = null;
    conversationHistory = [];

    document.getElementById("ai-bot-status").textContent = "● Online — guest mode";
    authBadge.textContent = "👤";
    authBadge.title = "Login / Sign up";

    clearMessages();
    addMessage(WELCOME_MESSAGE, "bot");
    showQuickReplies();
    addMessage("👋 You're now in guest mode. Chats won't be saved.", "bot");
  }

  async function loadLatestOrNewSession() {
    if (!isLoggedIn || !window.tarantinoListSessions) return;
    try {
      const sessions = await window.tarantinoListSessions(1);
      if (sessions.length > 0) {
        currentSessionId = sessions[0].id;
        await loadSession(currentSessionId);
      } else {
        currentSessionId = await window.tarantinoCreateSession("New chat");
        clearMessages();
        addMessage(
          `👋 Welcome back, <b>${escapeHTML(currentUserName)}</b>! How can I help you today?`,
          "bot"
        );
        showQuickReplies();
      }
    } catch (err) {
      console.error("[Bot] Failed to load session:", err);
    }
  }

  async function loadSession(sessionId) {
    clearMessages();
    const msgs = await window.tarantinoLoadMessages(sessionId);

    if (msgs.length === 0) {
      addMessage(
        `👋 Welcome back, <b>${escapeHTML(currentUserName)}</b>! How can I help you today?`,
        "bot"
      );
      showQuickReplies();
      return;
    }

    addMessage(
      `👋 Welcome back, <b>${escapeHTML(currentUserName)}</b>. Continuing your last chat:`,
      "bot"
    );

    msgs.forEach(m => addMessage(m.text, m.sender));

    conversationHistory = msgs.map(m => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text
    })).slice(-8);
  }

  async function startNewChat() {
    document.getElementById("ai-history-modal").classList.remove("open");
    if (!isLoggedIn) return;

    currentSessionId = await window.tarantinoCreateSession("New chat");
    conversationHistory = [];
    clearMessages();
    addMessage(
      `👋 New chat started. How can I help you, <b>${escapeHTML(currentUserName)}</b>?`,
      "bot"
    );
    showQuickReplies();
  }

  /* ============================================
     UI: MODALS
     ============================================ */
  function openAuthModal() {
    if (isLoggedIn) {
      if (confirm("Log out? Your chats stay saved.")) {
        window.tarantinoLogout();
      }
      return;
    }
    document.getElementById("ai-auth-modal").classList.add("open");
    document.getElementById("ai-auth-email").focus();
  }

  function closeAuthModal() {
    document.getElementById("ai-auth-modal").classList.remove("open");
    document.getElementById("ai-auth-error").textContent = "";
  }

  async function openHistoryModal() {
    if (!isLoggedIn) {
      addMessage("🔒 Please sign in to view chat history.", "bot");
      openAuthModal();
      return;
    }

    document.getElementById("ai-history-modal").classList.add("open");
    const list = document.getElementById("ai-history-list");
    list.innerHTML = "Loading…";

    try {
      const sessions = await window.tarantinoListSessions(20);
      if (sessions.length === 0) {
        list.innerHTML = "<p>No chats yet. Start one below!</p>";
        return;
      }
      list.innerHTML = "";
      sessions.forEach(s => {
        const item = document.createElement("div");
        item.className = "ai-history-item";
        const date = s.updatedAt?.toDate
          ? s.updatedAt.toDate().toLocaleString()
          : "—";
        item.innerHTML = `
          <div class="ai-history-title">${escapeHTML(s.title || "Untitled")}</div>
          <div class="ai-history-date">${date}</div>
        `;
        item.onclick = async () => {
          currentSessionId = s.id;
          await loadSession(s.id);
          document.getElementById("ai-history-modal").classList.remove("open");
        };
        list.appendChild(item);
      });
    } catch (err) {
      list.innerHTML = "<p style='color:red'>Failed to load history.</p>";
      console.error(err);
    }
  }

  /* ============================================
     UI: AUTH FORM
     ============================================ */
  let authMode = "login";

  function setupAuthForm() {
    const switchLink = document.getElementById("ai-auth-switch-link");
    const switchText = document.getElementById("ai-auth-switch-text");
    const title      = document.getElementById("ai-auth-title");
    const sub        = document.getElementById("ai-auth-sub");
    const submit     = document.getElementById("ai-auth-submit");
    const nameRow    = document.getElementById("ai-auth-name-row");

    switchLink.addEventListener("click", (e) => {
      e.preventDefault();
      authMode = authMode === "login" ? "signup" : "login";

      if (authMode === "signup") {
        title.textContent = "Create Account";
        sub.textContent = "Save your chats and come back anytime";
        submit.textContent = "Sign Up";
        switchText.textContent = "Already have an account?";
        switchLink.textContent = "Sign in";
        nameRow.style.display = "block";
      } else {
        title.textContent = "Welcome Back";
        sub.textContent = "Sign in to save your chat history";
        submit.textContent = "Sign In";
        switchText.textContent = "Don't have an account?";
        switchLink.textContent = "Sign up";
        nameRow.style.display = "none";
      }
    });

    document.getElementById("ai-auth-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email    = document.getElementById("ai-auth-email").value.trim();
      const password = document.getElementById("ai-auth-password").value;
      const name     = document.getElementById("ai-auth-name").value.trim();
      const errBox   = document.getElementById("ai-auth-error");
      errBox.textContent = "";

      if (!window.tarantinoSignUp || !window.tarantinoLogin) {
        errBox.textContent = "Auth service not ready. Please refresh the page.";
        return;
      }

      submit.disabled = true;
      submit.textContent = "Please wait…";

      try {
        if (authMode === "signup") {
          await window.tarantinoSignUp(email, password, name);
        } else {
          await window.tarantinoLogin(email, password);
        }
        closeAuthModal();
      } catch (err) {
        console.error("[Auth]", err);
        errBox.textContent = friendlyAuthError(err);
      } finally {
        submit.disabled = false;
        submit.textContent = authMode === "signup" ? "Sign Up" : "Sign In";
      }
    });
  }

  function friendlyAuthError(err) {
    const code = err.code || "";
    if (code.includes("email-already-in-use")) return "That email is already registered. Try logging in.";
    if (code.includes("invalid-email"))          return "Please enter a valid email address.";
    if (code.includes("weak-password"))          return "Password must be at least 6 characters.";
    if (code.includes("user-not-found"))         return "No account found. Sign up first.";
    if (code.includes("wrong-password"))         return "Incorrect password. Try again.";
    if (code.includes("invalid-credential"))     return "Wrong email or password.";
    if (code.includes("too-many-requests"))      return "Too many attempts. Please wait a minute.";
    if (code.includes("operation-not-allowed"))  return "Email/Password sign-in is not enabled.";
    if (code.includes("unauthorized-domain"))    return "This domain isn't authorized.";
    if (code.includes("network-request-failed")) return "Network error. Check your connection.";
    return "Something went wrong. Please try again.";
  }

  /* ============================================
     UI: CHAT
     ============================================ */
  function toggleBot() {
    botWindow.classList.toggle("open");
    if (botWindow.classList.contains("open")) {
      setTimeout(() => inputField.focus(), 200);
    }
  }

  function clearMessages() {
    messagesBox.innerHTML = "";
  }

  function addMessage(text, sender, save = false) {
    const div = document.createElement("div");
    div.className = "msg " + sender;
    div.innerHTML = text;
    messagesBox.appendChild(div);
    messagesBox.scrollTop = messagesBox.scrollHeight;

    if (save && isLoggedIn && currentSessionId && window.tarantinoSaveMessage) {
      window.tarantinoSaveMessage(currentSessionId, sender, text).catch(err =>
        console.warn("[Bot] Failed to save message:", err)
      );
    }
  }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "msg bot typing";
    div.id = "ai-bot-typing";
    div.innerHTML = "<span></span><span></span><span></span>";
    messagesBox.appendChild(div);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function removeTyping() {
    document.getElementById("ai-bot-typing")?.remove();
  }

  function showWelcome() {
    addMessage(WELCOME_MESSAGE, "bot");
    showQuickReplies();
  }

  function showQuickReplies() {
    const wrap = document.createElement("div");
    wrap.className = "quick-replies";
    wrap.id = "quick-replies";
    QUICK_REPLIES.forEach(qr => {
      const btn = document.createElement("button");
      btn.className = "quick-reply";
      btn.textContent = qr.label;
      btn.addEventListener("click", () => {
        removeQuickReplies();
        addMessage(escapeHTML(qr.query), "user", true);
        conversationHistory.push({ role: "user", content: qr.query });
        respondTo(qr.query);
      });
      wrap.appendChild(btn);
    });
    messagesBox.appendChild(wrap);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function removeQuickReplies() {
    document.getElementById("quick-replies")?.remove();
  }

  /* ============================================
     SEND + RESPOND
     ============================================ */
  function handleSend() {
    const text = inputField.value.trim();
    if (!text) return;

    removeQuickReplies();
    addMessage(escapeHTML(text), "user", true);
    conversationHistory.push({ role: "user", content: text });
    inputField.value = "";
    respondTo(text);
  }

  async function respondTo(userText) {
    showTyping();
    sendButton.disabled = true;

    try {
      // ═══════════════════════════════════════════════════
      // 1️⃣ SEARCH FIRESTORE KNOWLEDGE FIRST
      // ═══════════════════════════════════════════════════
      if (typeof window.tarantinoSearchKnowledge === "function") {
        try {
          const hit = await window.tarantinoSearchKnowledge(userText);
          if (hit) {
            removeTyping();

            let reply = hit.answer || "Here's what I found:";
            if (hit.url) {
              reply += `<br><br>👉 <a href="${hit.url}" target="_blank">Open page</a>`;
            }

            addMessage(reply, "bot", true);
            conversationHistory.push({ role: "assistant", content: reply });
            return;
          }
        } catch (kbErr) {
          console.warn("[AI Bot] Knowledge search failed:", kbErr);
        }
      }

      // ═══════════════════════════════════════════════════
      // 2️⃣ TRY AI (if enabled)
      // ═══════════════════════════════════════════════════
      if (typeof BOT_CONFIG !== "undefined" && BOT_CONFIG.useAI) {
        try {
          const aiReply = await askAI(userText);
          removeTyping();
          addMessage(aiReply, "bot", true);
          conversationHistory.push({ role: "assistant", content: aiReply });
          return;
        } catch (aiErr) {
          console.warn("[AI Bot] AI failed, falling back:", aiErr);
        }
      }

      // ═══════════════════════════════════════════════════
      // 3️⃣ LOCAL RULES (greetings, math, time, jokes)
      // ═══════════════════════════════════════════════════
      if (typeof getGeneralResponse === "function") {
        const generalReply = getGeneralResponse(userText);
        if (generalReply) {
          removeTyping();
          addMessage(generalReply, "bot", true);
          conversationHistory.push({ role: "assistant", content: generalReply });
          return;
        }
      }

      // ═══════════════════════════════════════════════════
      // 4️⃣ HARDCODED SITE_ACTIONS
      // ═══════════════════════════════════════════════════
      const reply = await keywordMatch(userText);
      removeTyping();
      addMessage(reply, "bot", true);
      conversationHistory.push({ role: "assistant", content: reply });

    } catch (err) {
      removeTyping();
      addMessage(FALLBACK_REPLY, "bot", true);
      console.error("Bot error:", err);
    } finally {
      sendButton.disabled = false;
      inputField.focus();
    }
  }

  function keywordMatch(query) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const text = query.toLowerCase();
        let best = null, bestScore = 0;
        for (const key in SITE_ACTIONS) {
          const action = SITE_ACTIONS[key];
          let score = 0;
          action.keywords.forEach(kw => {
            if (text.includes(kw.toLowerCase())) score += kw.length;
          });
          if (score > bestScore) { bestScore = score; best = action; }
        }
        if (best) {
          resolve(`${best.reply}<br><br>👉 <a href="${best.url}" target="_blank">Open page</a>`);
        } else {
          resolve(FALLBACK_REPLY);
        }
      }, 400 + Math.random() * 400);
    });
  }

  async function askAI(userText) {
    const res = await fetch(BOT_CONFIG.apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userText,
        history: conversationHistory.slice(-6)
      })
    });
    if (!res.ok) throw new Error("API error: " + res.status);
    const data = await res.json();
    return data.reply || FALLBACK_REPLY;
  }

  /* ============================================
     UTIL
     ============================================ */
  function escapeHTML(str) {
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;")
              .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
              .replace(/'/g,"&#39;");
  }

  /* ============================================
     BOOT
     ============================================ */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBot);
  } else {
    initBot();
  }
})();
