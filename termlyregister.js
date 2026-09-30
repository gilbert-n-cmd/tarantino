import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD2g8x-tvOkFI0mi0gTzU2vFLo4aj8wB0s",
  authDomain: "noble-register.firebaseapp.com",
  projectId: "noble-register",
  storageBucket: "noble-register.firebasestorage.app",
  messagingSenderId: "280367520296",
  appId: "1:280367520296:web:29b32c0f9669bdfae6731d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const registerBtn = document.getElementById("registerBtn");
const loginBlock = document.getElementById("login-block");
const formBlock = document.getElementById("form-block");
const loginBtn = document.getElementById("loginBtn");
const message = document.getElementById("loginMessage");

let isLoginVisible = false;
let loggedIn = false;

registerBtn.addEventListener("click", () => {
  if (loggedIn) {
    signOut(auth).then(() => {
      alert("You have been signed out.");
      window.history.back();
    });
    return;
  }

  isLoginVisible = !isLoginVisible;
  if (isLoginVisible) {
    loginBlock.style.display = "block";
    registerBtn.textContent = "❌";
  } else {
    loginBlock.style.display = "none";
    registerBtn.textContent = "Register";
  }
});

loginBtn.addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      message.textContent = "✅ Login successful!";
      setTimeout(() => {
        loginBlock.style.display = "none";
        formBlock.style.display = "block";
        registerBtn.textContent = "Sign out";
        loggedIn = true;
        isLoginVisible = false;
      }, 1000);
    })
    .catch((error) => {
      message.textContent = "❌ " + error.message;
    });
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBlock.style.display = "none";
    formBlock.style.display = "block";
    registerBtn.textContent = "Sign out";
    loggedIn = true;
  } else {
    formBlock.style.display = "none";
    registerBtn.textContent = "Register";
    loggedIn = false;
  }
});
