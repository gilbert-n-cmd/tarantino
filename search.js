import { db } from "./firebase-config.js";
import {
  ref,
  get,
  child
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
// ---------------- SEARCH ----------------
async function searchData(query) {
  const dbRef = ref(db);

  try {
    const snapshot = await get(child(dbRef, "users")); 
    // 🔥 change "users" to your node (students, messages, etc)

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();

    const results = Object.values(data).filter(item => {
      return Object.values(item)
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());
    });

    return results;

  } catch (error) {
    console.error(error);
    return [];
  }
}

// ---------------- DISPLAY ----------------
function displayResults(results) {
  const container = document.getElementById("results");

  container.innerHTML = "";

  if (results.length === 0) {
    container.innerHTML = "<p>No results found</p>";
    return;
  }

  results.forEach(item => {
    const div = document.createElement("div");

    div.style.padding = "10px";
    div.style.marginBottom = "10px";
    div.style.border = "1px solid #ddd";
    div.style.background = "white";

    div.innerHTML = `
      <p><b>Name:</b> ${item.name || "N/A"}</p>
      <p><b>Email:</b> ${item.email || "N/A"}</p>
      <p><b>Phone:</b> ${item.phone || "N/A"}</p>
    `;

    container.appendChild(div);
  });
}

// ---------------- GLOBAL FUNCTION ----------------
window.runSearch = async function () {
  const input = document.getElementById("searchBox").value.trim();

  if (!input) return;

  const results = await searchData(input);
  displayResults(results);
};