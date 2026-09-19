/* ============================================
   Firebase Configuration
   ============================================ */

const firebaseConfig = {
  apiKey: "AIzaSyAGWdBaIUOYT-SwOQuWMjRymDUnRNP60MA",
  authDomain: "my-registration-and-login.firebaseapp.com",
  projectId: "my-registration-and-login",
  storageBucket: "my-registration-and-login.firebasestorage.app",
  messagingSenderId: "751883676713",
  appId: "1:751883676713:web:4401fcf89e4ce348ef8038",
  measurementId: "G-NRKKC9K2ZM"
};

const FIREBASE_VERSION = "10.12.0";
const FIREBASE_CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

/* ✅ Expose globally for modules */
window.FIREBASE_CONFIG  = firebaseConfig;
window.FIREBASE_VERSION = FIREBASE_VERSION;
window.FIREBASE_CDN     = FIREBASE_CDN;

console.log("[Firebase] Config loaded:", firebaseConfig.projectId);