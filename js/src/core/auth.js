// =========================
// 🔐 AUTH — AUTHENTIFICATION
// =========================
// Gère la connexion / déconnexion admin.
// Met à jour le state global quand l'utilisateur change.
// Les autres modules utilisent isAdmin() depuis state.js.

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { auth } from "./firebase.client.js";
import { APP_CONFIG } from "../config/app.config.js";
import { setCurrentUser, setIsAdmin } from "./state.js";
import { Toast } from "../ui/components/toast.js";

// =========================
// 🔐 CONNEXION ADMIN
// =========================
export async function loginAdmin() {
  const email = prompt("Email admin");
  const password = prompt("Mot de passe");

  if (!email || !password) return;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    Toast.success("✅ Connecté !");
  } catch (e) {
    console.error("loginAdmin error:", e);
    Toast.error("❌ Erreur connexion");
  }
}

// =========================
// 🚪 DÉCONNEXION ADMIN
// =========================
export async function logoutAdmin() {
  try {
    await signOut(auth);
    Toast.success("🚪 Déconnecté");
  } catch (e) {
    console.error("logoutAdmin error:", e);
    Toast.error("❌ Erreur déconnexion");
  }
}

// =========================
// 👁 WATCHER D'ÉTAT AUTH
// =========================
// Appelé une seule fois au démarrage depuis main.js.
// Notifie les callbacks fournis à chaque changement d'état de connexion.

export function watchAuthState({ onLogin, onLogout }) {
  onAuthStateChanged(auth, (user) => {
    const isAdminUser =
      user != null && user.email === APP_CONFIG.ADMIN_EMAIL;

    setCurrentUser(user);
    setIsAdmin(isAdminUser);

    if (isAdminUser) {
      onLogin?.();
    } else {
      onLogout?.();
    }
  });
}
