// =========================
// 🗄️ ARCHIVES REPOSITORY
// =========================
// Gère la collection "archives" (snapshots de classement de saison).
// Aucune logique métier. Aucun accès au DOM.

import {
  collection,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "../core/firebase.client.js";
import { safeGetDocs, safeSetDoc, safeGetDoc } from "../core/safe-firebase.js";
import { APP_CONFIG } from "../config/app.config.js";

const COL = APP_CONFIG.COLLECTIONS.ARCHIVES;

// --- Lire toutes les archives ---
export async function getAllArchives() {
  const snapshot = await safeGetDocs(collection(db, COL));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// --- Lire une archive par ID ---
export async function getArchiveById(id) {
  const snap = await safeGetDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// --- Créer une archive (clé = archive_<dateKey>) ---
export async function createArchive(dateKey, data) {
  return await safeSetDoc(doc(db, COL, `archive_${dateKey}`), {
    ...data,
    createdAt: serverTimestamp(),
  });
}
