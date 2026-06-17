// =========================
// 🗄️ MATCHES REPOSITORY
// =========================
// Toutes les lectures / écritures Firestore concernant les matchs.
// Aucune logique métier. Aucun accès au DOM.

import {
  collection,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "../core/firebase.client.js";
import { safeGetDocs, safeAddDoc, safeUpdateDoc, safeDeleteDoc, safeGetDoc } from "../core/safe-firebase.js";
import { APP_CONFIG } from "../config/app.config.js";

const COL = APP_CONFIG.COLLECTIONS.MATCHES;

// --- Lire tous les matchs (tri par date desc) ---
export async function getAllMatches() {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  const snapshot = await safeGetDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// --- Lire un match par ID ---
export async function getMatchById(id) {
  const snap = await safeGetDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// --- Créer un match ---
export async function createMatch(matchData) {
  return await safeAddDoc(collection(db, COL), {
    ...matchData,
    createdAt: serverTimestamp(),
    createdAtLocal: Date.now(),
  });
}

// --- Mettre à jour un match (ex: ajouter ELO après calcul) ---
export async function updateMatch(id, data) {
  return await safeUpdateDoc(doc(db, COL, id), data);
}

// --- Supprimer un match ---
export async function deleteMatch(id) {
  return await safeDeleteDoc(doc(db, COL, id));
}

// --- Supprimer tous les matchs ---
export async function deleteAllMatches() {
  const matches = await getAllMatches();
  for (const m of matches) {
    await safeDeleteDoc(doc(db, COL, m.id));
  }
}
