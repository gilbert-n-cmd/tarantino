// scripts/announcements.js
import { db } from "./auth.js";
import {
  collection, query, where, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const DISMISS_KEY = "dismissedAnnouncements";

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]"); }
  catch { return []; }
}
function saveDismissed(arr) {
  localStorage.setItem(DISMISS_KEY, JSON.stringify(arr));
}

/**
 * Load pinned announcements (category "news" + pinned true)
 * and show the most recent one that hasn't been dismissed.
 */
export async function initAnnouncements() {
  const bar = document.getElementById("announcementBar");
  const text = document.getElementById("announcementText");
  const close = document.getElementById("announcementClose");
  if (!bar || !text) return;

  try {
    const q = query(
      collection(db, "resources"),
      where("category", "==", "news"),
      where("pinned", "==", true),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const snap = await getDocs(q);

    if (snap.empty) return;

    const ann = snap.docs[0];
    const data = ann.data();
    const dismissed = getDismissed();
    if (dismissed.includes(ann.id)) return;

    text.textContent = data.title + (data.description ? ` — ${data.description}` : "");
    bar.classList.remove("hidden");

    close.addEventListener("click", () => {
      bar.classList.add("hidden");
      const d = getDismissed();
      if (!d.includes(ann.id)) d.push(ann.id);
      saveDismissed(d);
    });
  } catch (err) {
    // Index may not exist yet — silent fail
    console.warn("[Announcements] failed:", err);
  }
}

