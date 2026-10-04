// =========================
// 🗄️ PEARLS REPOSITORY
// =========================
// Toutes les lectures / écritures Firestore concernant les perles.
// Aucune logique métier. Aucun accès au DOM.

import {
  collection,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "../core/firebase.client.js";
import { safeGetDocs, safeAddDoc } from "../core/safe-firebase.js";
import { APP_CONFIG } from "../config/app.config.js";

const COL = APP_CONFIG.COLLECTIONS.PEARLS;

// --- Lire toutes les perles (tri par date desc) ---
export async function getAllPearls() {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  const snapshot = await safeGetDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// --- Ajouter une nouvelle perle ---
export async function addPearl(text) {
  if (!text || text.trim() === "") {
    throw new Error("La perle ne peut pas être vide");
  }

  return await safeAddDoc(collection(db, COL), {
    text: text.trim(),
    createdAt: serverTimestamp(),
    createdAtLocal: Date.now(),
  });
}
