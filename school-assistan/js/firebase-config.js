/* ============================================
   Firebase Configuration — AI BOT ONLY
   Project: tarantino-3e322
   ============================================ */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAlzi8-VRoq2S3fem1qHtoU8xcOL-ywUBo",
  authDomain: "tarantino-3e322.firebaseapp.com",
  projectId: "tarantino-3e322",
  storageBucket: "tarantino-3e322.firebasestorage.app",
  messagingSenderId: "364845638359",
  appId: "1:364845638359:web:1f8331fd05af099c7cc692"
};

// Init once (dedicated app name "bot")
const app = getApps().some(a => a.name === "bot")
  ? getApp("bot")
  : initializeApp(firebaseConfig, "bot");

const auth = getAuth(app);
const db   = getFirestore(app);

// Expose globally
window.FIREBASE_CONFIG = firebaseConfig;
window.FIREBASE_APP    = app;
window.FIREBASE_AUTH   = auth;
window.FIREBASE_DB     = db;
window.tarantinoAuth   = { auth, db };

console.log("[Firebase] ✅ Ready:", firebaseConfig.projectId);