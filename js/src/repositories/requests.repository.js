// =========================
// 🗄️ REQUESTS REPOSITORY
// =========================
// Gère la collection "demandes" (demandes d'ajout de joueurs).
// Fusionne loadDemandes + afficherDemandes qui faisaient la même chose.

import {
  collection,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "../core/firebase.client.js";
import { safeGetDocs, safeAddDoc, safeDeleteDoc } from "../core/safe-firebase.js";
import { APP_CONFIG } from "../config/app.config.js";

const COL = APP_CONFIG.COLLECTIONS.REQUESTS;

// --- Lire toutes les demandes en attente ---
export async function getPendingRequests() {
  const snapshot = await safeGetDocs(collection(db, COL));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// --- Créer une demande ---
export async function createRequest(name) {
  return await safeAddDoc(collection(db, COL), {
    name,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

// --- Supprimer une demande (acceptée ou refusée) ---
export async function deleteRequest(id) {
  return await safeDeleteDoc(doc(db, COL, id));
}
