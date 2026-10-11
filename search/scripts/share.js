// scripts/share.js

/**
 * Build a shareable URL for a resource id.
 * Uses `?id=<docId>` on the current path.
 */
export function buildShareUrl(resourceId) {
  const url = new URL(location.href);
  url.searchParams.set("id", resourceId);
  return url.toString();
}

/**
 * Copy the share URL to clipboard and show a brief toast.
 */
export async function shareResource(resourceId, title) {
  const url = buildShareUrl(resourceId);

  // Prefer native share on mobile
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return { ok: true, method: "native" };
    } catch {
      // User cancelled or share not available → fall through
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    showCopyToast("🔗 Link copied!");
    return { ok: true, method: "clipboard" };
  } catch (err) {
    // Fallback: prompt the user
    prompt("Copy this link:", url);
    return { ok: false, method: "prompt" };
  }
}

let toastTimer;
export function showCopyToast(message) {
  let el = document.getElementById("copyToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "copyToast";
    el.className = "copy-toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.remove("hidden");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 2000);
}

/**
 * If the URL has ?id=<docId>, scroll to and highlight that result.
 * Call after results render.
 */
export function focusSharedResult() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) return;

  const li = document.querySelector(`[data-result-id="${id}"]`);
  if (!li) return;

  li.scrollIntoView({ behavior: "smooth", block: "center" });
  li.style.transition = "box-shadow 0.4s, border-color 0.4s";
  li.style.borderColor = "#4f46e5";
  li.style.boxShadow = "0 0 0 4px rgba(79,70,229,0.15)";
  setTimeout(() => {
    li.style.borderColor = "";
    li.style.boxShadow = "";
  }, 2500);
}

