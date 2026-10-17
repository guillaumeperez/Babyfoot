// =========================
// 🗄️ PEARLS REPOSITORY
// =========================
// Toutes les lectures / écritures Firestore concernant les perles.
// Aucune logique métier. Aucun accès au DOM.

import {
  collection,
  query,
  orderBy,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "../core/firebase.client.js";
import { safeGetDocs, safeAddDoc, safeDeleteDoc } from "../core/safe-firebase.js";
import { isTestMode } from "../core/state.js";
import { APP_CONFIG } from "../config/app.config.js";

const COL = APP_CONFIG.COLLECTIONS.PEARLS;

// 🧪 Perles ajoutées en mode test : safeAddDoc bloque les écritures Firestore,
// on les garde donc en mémoire pour la session
// (même logique que les matchs "simulés" de match.service.js).
const _testPearls = [];

// --- Lire toutes les perles (tri par date desc) ---
export async function getAllPearls() {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  const snapshot = await safeGetDocs(q);
  const pearls = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (!isTestMode() || _testPearls.length === 0) return pearls;

  // En mode test, les perles locales passent au-dessus (tri date desc)
  return [..._testPearls, ...pearls].sort(
    (a, b) => (b.createdAtLocal || 0) - (a.createdAtLocal || 0),
  );
}

// --- Ajouter une nouvelle perle ---
export async function addPearl(text) {
  if (!text || text.trim() === "") {
    throw new Error("La perle ne peut pas être vide");
  }

  const cleanText = text.trim();

  // 🧪 Mode test : on simule localement au lieu d'écrire dans Firestore
  if (isTestMode()) {
    const localPearl = {
      id: `local-${Date.now()}`,
      text: cleanText,
      createdAtLocal: Date.now(),
      isLocal: true,
    };
    _testPearls.unshift(localPearl);
    return localPearl.id;
  }

  return await safeAddDoc(collection(db, COL), {
    text: cleanText,
    createdAt: serverTimestamp(),
    createdAtLocal: Date.now(),
  });
}

// --- Supprimer une perle ---
export async function deletePearl(id) {
  // Perles locales de mode test (jamais écrites dans Firestore)
  const idx = _testPearls.findIndex((p) => p.id === id);
  if (idx !== -1) {
    _testPearls.splice(idx, 1);
    return id;
  }

  const outcome = await safeDeleteDoc(doc(db, COL, id));
  // deleteDoc résout en undefined (Promise<void>) : seul null = écriture bloquée.
  // Une exception levée par safeDeleteDoc remonte telle quelle (gestion d'erreur de la page).
  if (outcome === null) return null;
  return id;
}
