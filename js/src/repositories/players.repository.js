// =========================
// 🗄️ PLAYERS REPOSITORY
// =========================
// Toutes les lectures / écritures Firestore concernant les joueurs.
// Aucune logique métier ici. Aucun accès au DOM.
// Les autres modules importent ces fonctions pour lire/écrire des joueurs.

import {
  collection,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "../core/firebase.client.js";
import {
  safeGetDocs,
  safeAddDoc,
  safeUpdateDoc,
  safeDeleteDoc,
  safeGetDoc,
} from "../core/safe-firebase.js";
import { APP_CONFIG } from "../config/app.config.js";

const COL = APP_CONFIG.COLLECTIONS.PLAYERS;

// --- Lire tous les joueurs ---
export async function getAllPlayers() {
  const snapshot = await safeGetDocs(collection(db, COL));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// --- Lire les joueurs actifs uniquement ---
export async function getActivePlayers() {
  const all = await getAllPlayers();
  return all.filter((p) => p.active !== false);
}

// --- Lire un joueur par ID ---
export async function getPlayerById(id) {
  const snap = await safeGetDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// --- Lire un joueur par nom ---
export async function getPlayerByName(name) {
  const all = await getAllPlayers();
  return all.find((p) => p.name === name) || null;
}

// --- Créer un joueur ---
export async function createPlayer(name) {
  return await safeAddDoc(collection(db, COL), {
    name,
    elo: APP_CONFIG.DEFAULT_ELO,
    wins: 0,
    losses: 0,
    active: true,
    history: [],
    createdAt: new Date(),
  });
}

// --- Mettre à jour un joueur (partial update) ---
export async function updatePlayer(id, data) {
  return await safeUpdateDoc(doc(db, COL, id), data);
}

// --- Activer / désactiver un joueur ---
export async function togglePlayerActive(id, currentlyActive) {
  return await safeUpdateDoc(doc(db, COL, id), {
    active: !currentlyActive,
  });
}

// --- Supprimer un joueur ---
export async function deletePlayer(id) {
  return await safeDeleteDoc(doc(db, COL, id));
}

// --- Reset ELO d'un joueur ---
export async function resetPlayerElo(id) {
  return await safeUpdateDoc(doc(db, COL, id), {
    elo: APP_CONFIG.DEFAULT_ELO,
    wins: 0,
    losses: 0,
    lastDiff: 0,
    history: [],
  });
}
