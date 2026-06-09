import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBhr4S2pX7PM1ENEbYPOJRdAQ4np3HCQqs",
  authDomain: "search-afa41.firebaseapp.com",
  databaseURL: "https://search-afa41-default-rtdb.firebaseio.com",
  projectId: "search-afa41",
  storageBucket: "search-afa41.firebasestorage.app",
  messagingSenderId: "750620318797",
  appId: "1:750620318797:web:e9ab5ad199f7361c1f9004"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };