// =========================
// 🏆 ANNUAL RANKING REPOSITORY
// =========================
// Gère la collection "annualRankingSettings" (exclusions de joueurs par année).
// Aucune logique métier. Aucun accès au DOM.

import {
  collection,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "../core/firebase.client.js";
import {
  safeGetDocs,
  safeGetDoc,
  safeSetDoc,
  safeUpdateDoc,
} from "../core/safe-firebase.js";
import { APP_CONFIG } from "../config/app.config.js";

const COL = APP_CONFIG.COLLECTIONS.ANNUAL_RANKING_SETTINGS;

/**
 * Récupère les paramètres du classement annuel pour une année donnée.
 * Si les paramètres n'existent pas, retourne un objet par défaut.
 *
 * @param {number} year - L'année (ex: 2026)
 * @returns {Promise<Object>}
 *   {
 *     year: 2026,
 *     excludedPlayers: ["cedric", "ancien-stagiaire"]  // noms normalisés
 *   }
 */
export async function getAnnualRankingSettings(year) {
  const docRef = doc(db, COL, String(year));
  const snap = await safeGetDoc(docRef);

  if (snap.exists()) {
    return snap.data();
  }

  // Par défaut, retourner un objet vide (pas d'exclusions)
  return {
    year,
    excludedPlayers: [],
  };
}

/**
 * Ajoute un joueur à la liste d'exclusion pour une année.
 *
 * @param {number} year
 * @param {string} normalizedPlayerName - Nom normalisé (ex: "cedric")
 * @returns {Promise<void>}
 */
export async function excludePlayerFromYear(year, normalizedPlayerName) {
  const docRef = doc(db, COL, String(year));
  const settings = await getAnnualRankingSettings(year);

  if (!settings.excludedPlayers.includes(normalizedPlayerName)) {
    settings.excludedPlayers.push(normalizedPlayerName);
  }

  await safeSetDoc(docRef, {
    ...settings,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Réintègre un joueur (le retire de la liste d'exclusion).
 *
 * @param {number} year
 * @param {string} normalizedPlayerName - Nom normalisé (ex: "cedric")
 * @returns {Promise<void>}
 */
export async function includePlayerForYear(year, normalizedPlayerName) {
  const docRef = doc(db, COL, String(year));
  const settings = await getAnnualRankingSettings(year);

  settings.excludedPlayers = settings.excludedPlayers.filter(
    (name) => name !== normalizedPlayerName,
  );

  await safeSetDoc(docRef, {
    ...settings,
    updatedAt: serverTimestamp(),
  });
}
