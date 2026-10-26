/* ============================================
   AI Guide Bot — FINAL EDITION
   Includes: Voice Input, Voice Output, Network Handling,
   Database Search, Android Keyboard Fix, Typewriter.
   ============================================ */

(function () {
  "use strict";

  let botInitialized = false;
  let conversationHistory = [];
  let currentSessionId = null;
  let isLoggedIn = false;
  let currentUserName = null;

  let botButton, botWindow, messagesBox, inputField, sendButton, micBtn;
  let authBadge, historyButton, muteBtn;

  // ============================================
  // INIT
  // ============================================
  async function initBot() {
    if (botInitialized) return;
    botInitialized = true;

    injectHTML();
    
    await new Promise(r => setTimeout(r, 100));
    
    cacheElements();
    attachEvents();
    await showWelcome();

    window.addEventListener("ai-bot:login", onLogin);
    window.addEventListener("ai-bot:logout", onLogout);

    if (typeof window.aiBotAuthReady === "object" || window.aiBotAuthReady instanceof Promise) {
      try { await window.aiBotAuthReady; } catch (err) { console.error("[AI Bot] Auth startup failed:", err); }
    }

    if (typeof window.aiBotWaitAuth === "function") {
      const user = await window.aiBotWaitAuth();
      if (user && !isLoggedIn) onLogin({ detail: user });
    }

    // Network Sync
    window.addEventListener('offline', () => {
      addMessage("⚠️ <i>You have lost internet connection. The bot may not be able to answer until you reconnect.</i>", "bot");
    });

    window.addEventListener('online', async () => {
      addMessage("✅ <i>Connection restored. Syncing pending questions…</i>", "bot");
      await syncPendingQuestions();
    });
  }

  // ============================================
  // HTML
  // ============================================
  function injectHTML() {
    const html = `
      <div id="ai-bot-button" role="button" aria-label="Open school assistant" tabindex="0">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="6" r="2" fill="#0d3b66"/>
          <circle cx="18" cy="6" r="2" fill="#0d3b66"/>
          <circle cx="6" cy="18" r="2" fill="#0d3b66"/>
          <circle cx="18" cy="18" r="2" fill="#0d3b66"/>
          <circle cx="12" cy="12" r="3" fill="#0d3b66"/>
          <path d="M6 6L12 12M18 6L12 12M6 18L12 12M18 18L12 12" stroke="#0d3b66" stroke-width="1.5" opacity="0.7"/>
        </svg>
      </div>

      <div id="ai-bot-window" role="dialog" aria-label="School assistant chat">
        <div id="ai-bot-header">
          <div class="title">
            <span>🎓 School Assistant</span>
            <span class="status" id="ai-bot-status">● Online — guest mode</span>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <button id="ai-bot-mute" title="Toggle voice" style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px">🔊</button>
            <button id="ai-bot-history" title="Chat history" style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px">🕘</button>
            <button type="button" id="ai-bot-auth" title="Login / Account" style="background:none;border:none;color:#fff;cursor:pointer;font-size:18px;min-width:42px;min-height:42px;padding:8px;display:inline-flex;align-items:center;justify-content:center;">👤</button>
            <button id="ai-bot-close" aria-label="Close chat">✖</button>
          </div>
        </div>

        <div id="ai-bot-messages" aria-live="polite"></div>

        <div id="ai-bot-input-row">
          <button id="ai-bot-mic" title="Speak your question" style="background:none;border:none;color:#0d3b66;font-size:1.2rem;cursor:pointer;padding:0 12px;display:flex;align-items:center;">🎤</button>
          <input id="ai-bot-input" type="text" placeholder="Ask about admissions, fees..." autocomplete="off" />
          <button id="ai-bot-send">Send</button>
        </div>
      </div>

      <div id="ai-auth-modal">
        <div class="ai-auth-box">
          <button class="ai-auth-close" id="ai-auth-close">✖</button>
          <h2 id="ai-auth-title">Welcome Back</h2>
          <p id="ai-auth-sub">Sign in to save your chat history</p>
          <form id="ai-auth-form">
            <div id="ai-auth-name-row" style="display:none">
              <input type="text" id="ai-auth-name" placeholder="Your name" />
            </div>
            <input type="email" id="ai-auth-email" placeholder="Email address" required />
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
    micBtn        = document.getElementById("ai-bot-mic");
    muteBtn       = document.getElementById("ai-bot-mute");
  }

  function attachEvents() {
    botButton.addEventListener("click", toggleBot);
    botButton.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleBot(); }
    });

    document.getElementById("ai-bot-close").addEventListener("click", toggleBot);
    sendButton.addEventListener("click", handleSend);
    inputField.addEventListener("keypress", e => { if (e.key === "Enter") handleSend(); });

    authBadge.addEventListener("click", openAuthModal, { passive: true });
    authBadge.addEventListener("pointerup", (e) => {
      if (e.pointerType === "touch") { e.preventDefault(); openAuthModal(); }
    }, { passive: false });
    
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

    document.addEventListener("click", (e) => {
      const target = e.target.closest && e.target.closest("#ai-bot-auth");
      if (!target) return;
      if (e.__aiAuthHandled) return;
      e.__aiAuthHandled = true;
      openAuthModal();
    });

    // ============================================
    // VOICE INPUT & MUTE TOGGLE
    // ============================================
    if (muteBtn) {
      const isMuted = localStorage.getItem("ai-bot-muted") === "1";
      muteBtn.textContent = isMuted ? "🔇" : "🔊";
      muteBtn.addEventListener("click", () => {
        const nowMuted = localStorage.getItem("ai-bot-muted") === "1";
        localStorage.setItem("ai-bot-muted", nowMuted ? "0" : "1");
        muteBtn.textContent = nowMuted ? "🔊" : "🔇";
        if (nowMuted && window.speechSynthesis) window.speechSynthesis.cancel();
      });
    }

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SR();
      recognition.lang = "en-UG";
      recognition.interimResults = false;
      let listening = false;

      micBtn.addEventListener("click", () => {
        if (listening) { recognition.stop(); return; }
        try {
          recognition.start();
          listening = true;
          micBtn.textContent = "🔴";
          micBtn.title = "Listening... (tap to stop)";
        } catch (err) { console.warn("[Voice] Could not start:", err); }
      });

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        inputField.value = transcript;
        listening = false;
        micBtn.textContent = "🎤";
        micBtn.title = "Speak your question";
        handleSend();
      };

      recognition.onerror = () => { listening = false; micBtn.textContent = "🎤"; micBtn.title = "Speak your question"; };
      recognition.onend = () => { listening = false; micBtn.textContent = "🎤"; micBtn.title = "Speak your question"; };
    } else {
      if (micBtn) micBtn.style.display = "none";
    }

    // ============================================
    // ANDROID KEYBOARD FIX
    // ============================================
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        if (botWindow.classList.contains('open') && window.innerWidth <= 600) {
          botWindow.style.height = `${window.visualViewport.height}px`;
          botWindow.style.top = `${window.visualViewport.offsetTop}px`;
        }
      });
    }
  }

  // ============================================
  // AUTH & SESSION HANDLERS
  // ============================================
  async function onLogin(e) {
    if (window.aiBotChatReady) {
      try { await window.aiBotChatReady; } catch (err) {}
    }
    isLoggedIn = true;
    const user = e.detail;
    currentUserName = user.displayName || user.email?.split("@")[0] || "there";

    document.getElementById("ai-bot-status").textContent = `● ${currentUserName} — history on`;
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
    (async () => {
      await addTypedMessage(WELCOME_MESSAGE, false);
      showQuickReplies();
      await addTypedMessage("👋 You're now in guest mode. Chats won't be saved.", false);
    })();
  }

  async function loadLatestOrNewSession() {
    if (!isLoggedIn || !window.aiBotListSessions) return;
    try {
      const sessions = await window.aiBotListSessions(1);
      if (sessions.length > 0) {
        currentSessionId = sessions[0].id;
        await loadSession(currentSessionId);
      } else {
        currentSessionId = await window.aiBotCreateSession("New chat");
        clearMessages();
        await addTypedMessage(`👋 Welcome back, <b>${escapeHTML(currentUserName)}</b>! How can I help you today?`, "bot");
        showQuickReplies();
      }
    } catch (err) {}
  }

  async function loadSession(sessionId) {
    clearMessages();
    const msgs = await window.aiBotLoadMessages(sessionId);
    if (msgs.length === 0) {
      await addTypedMessage(`👋 Welcome back, <b>${escapeHTML(currentUserName)}</b>!`, "bot");
      showQuickReplies();
      return;
    }
    addMessage(`👋 Welcome back, <b>${escapeHTML(currentUserName)}</b>. Continuing your last chat:`, "bot");
    msgs.forEach(m => addMessage(m.text, m.sender));
    conversationHistory = msgs.map(m => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text })).slice(-8);
  }

  async function startNewChat() {
    document.getElementById("ai-history-modal").classList.remove("open");
    if (!isLoggedIn) return;
    currentSessionId = await window.aiBotCreateSession("New chat");
    conversationHistory = [];
    clearMessages();
    await addTypedMessage(`👋 New chat started. How can I help you, <b>${escapeHTML(currentUserName)}</b>?`, "bot");
    showQuickReplies();
  }

  // ============================================
  // MODALS
  // ============================================
  function openAuthModal() {
    if (isLoggedIn) {
      if (confirm("Log out? Your chats stay saved.")) window.aiBotLogout();
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
      await addTypedMessage("🔒 Please sign in to view chat history.", "bot");
      openAuthModal();
      return;
    }
    document.getElementById("ai-history-modal").classList.add("open");
    const list = document.getElementById("ai-history-list");
    list.innerHTML = "Loading…";

    try {
      const sessions = await window.aiBotListSessions(20);
      if (sessions.length === 0) { list.innerHTML = "<p>No chats yet.</p>"; return; }
      list.innerHTML = "";
      sessions.forEach(s => {
        const item = document.createElement("div");
        item.className = "ai-history-item";
        const date = s.updatedAt?.toDate ? s.updatedAt.toDate().toLocaleString() : "—";
        item.innerHTML = `<div class="ai-history-title">${escapeHTML(s.title || "Untitled")}</div><div class="ai-history-date">${date}</div>`;
        item.onclick = async () => {
          currentSessionId = s.id;
          await loadSession(s.id);
          document.getElementById("ai-history-modal").classList.remove("open");
        };
        list.appendChild(item);
      });
    } catch (err) { list.innerHTML = "<p style='color:red'>Failed to load.</p>"; }
  }

  // ============================================
  // AUTH FORM
  // ============================================
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
        title.textContent = "Create Account"; sub.textContent = "Save your chats and come back anytime";
        submit.textContent = "Sign Up"; switchText.textContent = "Already have an account?";
        switchLink.textContent = "Sign in"; nameRow.style.display = "block";
      } else {
        title.textContent = "Welcome Back"; sub.textContent = "Sign in to save your chat history";
        submit.textContent = "Sign In"; switchText.textContent = "Don't have an account?";
        switchLink.textContent = "Sign up"; nameRow.style.display = "none";
      }
    });

    document.getElementById("ai-auth-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email    = document.getElementById("ai-auth-email").value.trim();
      const password = document.getElementById("ai-auth-password").value;
      const name     = document.getElementById("ai-auth-name").value.trim();
      const errBox   = document.getElementById("ai-auth-error");
      errBox.textContent = "";
      submit.disabled = true; submit.textContent = "Connecting…";

      try {
        const started = Date.now();
        while ((!window.tarantinoLogin || !window.tarantinoSignUp) && Date.now() - started < 5000) {
          await new Promise(r => setTimeout(r, 50));
        }
        if (!window.tarantinoLogin || !window.tarantinoSignUp) throw new Error("Offline.");
      } catch (authInitError) {
        errBox.textContent = "Authentication could not start.";
        submit.disabled = false; submit.textContent = authMode === "signup" ? "Sign Up" : "Sign In";
        return;
      }

      submit.textContent = "Please wait…";
      try {
        if (authMode === "signup") await window.tarantinoSignUp(email, password, name);
        else await window.tarantinoLogin(email, password);
        closeAuthModal();
      } catch (err) {
        errBox.textContent = friendlyAuthError(err);
      } finally {
        submit.disabled = false; submit.textContent = authMode === "signup" ? "Sign Up" : "Sign In";
      }
    });
  }

  function friendlyAuthError(err) {
    const code = err.code || "";
    if (code.includes("email-already-in-use")) return "That email is already registered.";
    if (code.includes("invalid-email")) return "Please enter a valid email.";
    if (code.includes("weak-password")) return "Password must be at least 6 characters.";
    if (code.includes("user-not-found")) return "No account found. Sign up first.";
    if (code.includes("wrong-password")) return "Incorrect password.";
    if (code.includes("invalid-credential")) return "Wrong email or password.";
    if (code.includes("too-many-requests")) return "Too many attempts. Try later.";
    return "Something went wrong. Please try again.";
  }

  // ============================================
  // CHAT UI & TYPEWRITER
  // ============================================
  function toggleBot() {
    botWindow.classList.toggle("open");
    const isOpen = botWindow.classList.contains("open");
    botButton.style.display = isOpen ? "none" : "flex";
    if (isOpen) setTimeout(() => inputField.focus(), 200);
    else { botWindow.style.height = ''; botWindow.style.top = ''; }
  }

  function clearMessages() { messagesBox.innerHTML = ""; }

  function addMessage(text, sender, save = false) {
    const div = document.createElement("div");
    div.className = "msg " + sender;
    div.innerHTML = text;
    messagesBox.appendChild(div);
    messagesBox.scrollTop = messagesBox.scrollHeight;
    if (save && isLoggedIn && currentSessionId && window.aiBotSaveMessage) {
      window.aiBotSaveMessage(currentSessionId, sender, text).catch(() => {});
    }
    return div;
  }

  async function addTypedMessage(html, save = false) {
    const div = document.createElement("div");
    div.className = "msg bot typing-target";
    div.innerHTML = "";
    messagesBox.appendChild(div);

    let skipRequested = false;
    div.addEventListener("click", () => { skipRequested = true; }, { once: true });
    const tokens = tokenizeHTML(html);

    let rendered = "";
    let prevTokenText = "";
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const isTag = token.startsWith("<");
      rendered += token;
      div.innerHTML = rendered;
      messagesBox.scrollTop = messagesBox.scrollHeight;
      if (!isTag && !skipRequested) await sleep(computeHumanDelay(token, prevTokenText, i));
      if (!isTag) prevTokenText = token;
    }

    div.classList.add("done");
    div.classList.remove("typing-target");

    // VOICE OUTPUT
    if ("speechSynthesis" in window) {
      const muted = localStorage.getItem("ai-bot-muted") === "1";
      if (!muted) {
        const cleanText = html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ");
        const utter = new SpeechSynthesisUtterance(cleanText);
        utter.lang = "en-UG"; utter.rate = 1.0; utter.pitch = 1.0;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }
    }

    if (save && isLoggedIn && currentSessionId && window.aiBotSaveMessage) {
      window.aiBotSaveMessage(currentSessionId, "bot", html).catch(() => {});
    }
    return div;
  }

  function computeHumanDelay(token, prevToken, index) {
    const word = token.trim(); const wordLen = word.length;
    let delay = 40 + wordLen * 14;
    delay = Math.min(320, Math.max(55, delay));
    const lastChar = word[word.length - 1];
    if (lastChar === "." || lastChar === "!" || lastChar === "?") delay += 320 + Math.random() * 180;
    else if (lastChar === ",") delay += 140 + Math.random() * 80;
    else if (lastChar === ";" || lastChar === ":") delay += 180 + Math.random() * 100;
    else if (lastChar === "—" || lastChar === "–") delay += 220 + Math.random() * 120;
    if (/\.{3,}$/.test(word) || /…$/.test(word)) delay += 260 + Math.random() * 200;
    const fastWords = new Set(["a","an","the","and","or","but","is","are","was","were","to","of","in","on","at","by","for","as","it","its","we","you","they","i","he","she","me","us","them","do","be","so","if","no","yes","not"]);
    if (fastWords.has(word.toLowerCase())) delay = Math.round(delay * 0.55);
    if (wordLen >= 9) delay = Math.round(delay * 1.25);
    if (index > 2 && /^[A-Z][a-z]/.test(word) && !/^[A-Z]+$/.test(word)) delay = Math.round(delay * 1.15);
    if ((lastChar === "," || lastChar === ".") && Math.random() < 0.04) delay += 400 + Math.random() * 500;
    if (prevToken) {
      const prevWord = prevToken.trim(); const prevLast = prevWord[prevWord.length - 1];
      if (prevLast === "." || prevLast === "!" || prevLast === "?") delay += 60 + Math.random() * 60;
    }
    delay += Math.random() * 40 - 20;
    return Math.max(30, Math.round(delay));
  }

  function tokenizeHTML(html) {
    const tokens = []; let i = 0;
    while (i < html.length) {
      if (html[i] === "<") {
        const end = html.indexOf(">", i);
        if (end === -1) { tokens.push(html.slice(i)); break; }
        tokens.push(html.slice(i, end + 1)); i = end + 1;
      } else {
        let end = html.indexOf("<", i); if (end === -1) end = html.length;
        const chunk = html.slice(i, end);
        const parts = chunk.match(/\S+\s*|\s+/g) || [chunk];
        tokens.push(...parts); i = end;
      }
    }
    return tokens;
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
  
  function showTyping() {
    const div = document.createElement("div");
    div.className = "msg bot typing"; div.id = "ai-bot-typing";
    div.innerHTML = "<span></span><span></span><span></span>";
    messagesBox.appendChild(div); messagesBox.scrollTop = messagesBox.scrollHeight;
  }
  function removeTyping() { document.getElementById("ai-bot-typing")?.remove(); }

  async function showWelcome() {
    await addTypedMessage(WELCOME_MESSAGE, false);
    showQuickReplies();
  }

  function showQuickReplies() {
    const wrap = document.createElement("div");
    wrap.className = "quick-replies"; wrap.id = "quick-replies";
    QUICK_REPLIES.forEach(qr => {
      const btn = document.createElement("button");
      btn.className = "quick-reply"; btn.textContent = qr.label;
      btn.addEventListener("click", () => {
        removeQuickReplies();
        addMessage(escapeHTML(qr.query), "user", true);
        conversationHistory.push({ role: "user", content: qr.query });
        respondTo(qr.query);
      });
      wrap.appendChild(btn);
    });
    messagesBox.appendChild(wrap); messagesBox.scrollTop = messagesBox.scrollHeight;
  }
  function removeQuickReplies() { document.getElementById("quick-replies")?.remove(); }

  // ============================================
  // LOGGING & NETWORK SYNC
  // ============================================
  async function logQuestionForAdmin(text) {
    try {
      if (window.aiBotChatReady) await window.aiBotChatReady;
      if (typeof window.aiBotLogQuestion !== "function") return;
      await window.aiBotLogQuestion(text);
    } catch (err) {
      try {
        const pending = JSON.parse(localStorage.getItem("pending_faq_logs") || "[]");
        pending.push({ text, timestamp: Date.now() });
        localStorage.setItem("pending_faq_logs", JSON.stringify(pending));
      } catch {}
    }
  }

  async function syncPendingQuestions() {
    try {
      const pending = JSON.parse(localStorage.getItem("pending_faq_logs") || "[]");
      if (pending.length === 0) return;
      if (window.aiBotChatReady) await window.aiBotChatReady;
      
      let sent = 0;
      for (const item of pending) {
        if (typeof window.aiBotLogQuestion === "function") {
          try { await window.aiBotLogQuestion(item.text); sent++; } catch {}
        }
      }
      const failed = pending.slice(sent);
      if (failed.length > 0) localStorage.setItem("pending_faq_logs", JSON.stringify(failed));
      else localStorage.removeItem("pending_faq_logs");
      
      if (sent > 0) addMessage(`☁️ <i>Synced ${sent} pending question(s).</i>`, "bot");
    } catch {}
  }

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
    showTyping(); sendButton.disabled = true;
    try {
      if (!navigator.onLine) {
        removeTyping();
        await addTypedMessage("📶 <b>You appear to be offline.</b><br><br>Please check your internet connection and try again.", true);
        return;
      }

      let hit = null;
      if (typeof window.tarantinoSearchKnowledge === "function") {
        hit = await window.tarantinoSearchKnowledge(userText);
      }

      if (hit) {
        removeTyping();
        let reply = hit.answer || "Here's what I found:";
        if (hit.url) reply += `<br><br>👉 <a href="${hit.url}" target="_blank">Open page</a>`;
        await addTypedMessage(reply, true);
        conversationHistory.push({ role: "assistant", content: reply });
        return;
      }

      removeTyping();
      logQuestionForAdmin(userText);
      await addTypedMessage(FALLBACK_REPLY, true);
      conversationHistory.push({ role: "assistant", content: FALLBACK_REPLY });

    } catch (err) {
      removeTyping();
      if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("network"))) {
        await addTypedMessage("🌐 <b>Network Error</b><br><br>I couldn't reach the school database.", true);
        logQuestionForAdmin(userText);
      } else {
        await addTypedMessage(FALLBACK_REPLY, true);
        logQuestionForAdmin(userText);
      }
    } finally {
      sendButton.disabled = false;
      inputField.focus();
    }
  }

  function escapeHTML(str) {
    return String(str == null ? "" : str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initBot);
  else initBot();
})();