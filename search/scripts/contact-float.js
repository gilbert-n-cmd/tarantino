// scripts/contact-float.js
import { db } from "./auth.js";
import {
  doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Wire the contact float button.
 * Loads contact info from `resources` where category == "contact"
 * (optional) or uses fallback values baked into the HTML.
 */
export function initContactFloat() {
  const toggle = document.getElementById("contactToggle");
  const menu = document.getElementById("contactMenu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("hidden");
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && e.target !== toggle) {
      menu.classList.add("hidden");
    }
  });

  // Optional: enrich from Firestore
  loadContactInfo();
}

async function loadContactInfo() {
  try {
    // Look for a contact resource and pull phone/email from it
    const snap = await getDoc(doc(db, "resources", "school_contact"));
    if (!snap.exists()) return;

    const data = snap.data() || {};
    if (data.phone) {
      const tel = document.getElementById("cfCall");
      if (tel) tel.href = `tel:${data.phone.replace(/\s+/g, "")}`;
    }
    if (data.whatsapp) {
      const wa = document.getElementById("cfWhatsapp");
      if (wa) wa.href = `https://wa.me/${data.whatsapp.replace(/\D/g, "")}`;
    }
    if (data.email) {
      const em = document.getElementById("cfEmail");
      if (em) em.href = `mailto:${data.email}`;
    }
    if (data.mapUrl) {
      const dir = document.getElementById("cfDirections");
      if (dir) dir.href = data.mapUrl;
    }
  } catch (err) {
    // Silent — the static defaults in the HTML still work
  }
}

