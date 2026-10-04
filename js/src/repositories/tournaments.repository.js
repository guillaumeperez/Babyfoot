// =========================
// 🗄️ TOURNAMENTS REPOSITORY
// =========================
// Toutes les lectures / écritures Firestore concernant les tournois,
// leurs équipes (sous-collection "teams") et leurs matchs (sous-collection "matches").
// Aucune logique métier. Aucun accès au DOM.

import {
  collection,
  doc,
  serverTimestamp,
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

const COL = APP_CONFIG.COLLECTIONS.TOURNAMENTS;

// =========================
// 🏆 TOURNOIS
// =========================

// --- Lire tous les tournois ---
export async function getAllTournaments() {
  const snapshot = await safeGetDocs(collection(db, COL));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// --- Lire un tournoi par ID ---
export async function getTournamentById(id) {
  const snap = await safeGetDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// --- Créer un tournoi ---
export async function createTournament(data) {
  return await safeAddDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
    status: "waiting",
  });
}

// --- Mettre à jour un tournoi ---
export async function updateTournament(id, data) {
  return await safeUpdateDoc(doc(db, COL, id), data);
}

// --- Supprimer un tournoi ---
export async function deleteTournament(id) {
  return await safeDeleteDoc(doc(db, COL, id));
}

// --- Supprimer tous les tournois ---
export async function deleteAllTournaments() {
  const tournaments = await getAllTournaments();
  for (const t of tournaments) {
    await safeDeleteDoc(doc(db, COL, t.id));
  }
}

// =========================
// 👥 ÉQUIPES (sous-collection)
// =========================

// --- Lire toutes les équipes d'un tournoi ---
export async function getTournamentTeams(tournamentId) {
  const snapshot = await safeGetDocs(
    collection(db, COL, tournamentId, "teams"),
  );
  return snapshot.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
}

// --- Ajouter une équipe à un tournoi ---
export async function addTeamToTournament(tournamentId, teamData) {
  return await safeAddDoc(collection(db, COL, tournamentId, "teams"), {
    ...teamData,
    createdAt: serverTimestamp(),
  });
}

// --- Mettre à jour une équipe (via sa ref directement) ---
export async function updateTeam(teamRef, data) {
  return await safeUpdateDoc(teamRef, data);
}

// --- Supprimer toutes les équipes d'un tournoi ---
export async function deleteAllTeams(tournamentId) {
  const teams = await getTournamentTeams(tournamentId);
  for (const team of teams) {
    await safeDeleteDoc(team.ref);
  }
}

// =========================
// ⚔️ MATCHS DE TOURNOI (sous-collection)
// =========================

// --- Lire tous les matchs d'un tournoi ---
export async function getTournamentMatches(tournamentId) {
  const snapshot = await safeGetDocs(
    collection(db, COL, tournamentId, "matches"),
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// --- Lire un match de tournoi par ID ---
export async function getTournamentMatchById(tournamentId, matchId) {
  const ref = doc(db, COL, tournamentId, "matches", matchId);
  const snap = await safeGetDoc(ref);
  if (!snap.exists()) return null;
  return { ref, id: snap.id, ...snap.data() };
}

// --- Ajouter un match à un tournoi ---
export async function addMatchToTournament(tournamentId, matchData) {
  return await safeAddDoc(collection(db, COL, tournamentId, "matches"), {
    ...matchData,
    createdAt: serverTimestamp(),
  });
}

// --- Mettre à jour un match de tournoi ---
export async function updateTournamentMatch(tournamentId, matchId, data) {
  const ref = doc(db, COL, tournamentId, "matches", matchId);
  return await safeUpdateDoc(ref, data);
}

// --- Supprimer tous les matchs d'un tournoi ---
export async function deleteAllTournamentMatches(tournamentId) {
  const matches = await getTournamentMatches(tournamentId);
  for (const m of matches) {
    const ref = doc(db, COL, tournamentId, "matches", m.id);
    await safeDeleteDoc(ref);
  }
}
