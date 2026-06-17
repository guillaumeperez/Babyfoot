// =========================
// ✅ VALIDATION UTILS
// =========================
// Fonctions pures de validation. Aucune dépendance, aucun effet de bord.
// Chaque fonction renvoie { valid: boolean, error?: string }.

import { APP_CONFIG } from "../config/app.config.js";

/**
 * Valide un score de match classique (2v2).
 * Règles : nombres valides, pas de match nul.
 */
export function validateClassicScore(sb, sr) {
  if (isNaN(sb) || isNaN(sr)) {
    return { valid: false, error: "❌ Score invalide" };
  }

  if (sb === sr) {
    return { valid: false, error: "❌ Match nul interdit" };
  }

  return { valid: true };
}

/**
 * Valide que les 4 joueurs d'un match classique sont sélectionnés.
 */
export function validatePlayersSelected(b1, b2, r1, r2) {
  if (!b1 || !b2 || !r1 || !r2) {
    return {
      valid: false,
      error: "❌ Tous les joueurs doivent être sélectionnés",
    };
  }
  return { valid: true };
}

/**
 * Valide l'anti-spam : refuse si le dernier match a été sauvegardé
 * il y a moins de MATCH_SAVE_COOLDOWN_MS.
 */
export function validateAntiSpam(lastMatchSave) {
  const elapsed = Date.now() - (lastMatchSave || 0);

  if (elapsed < APP_CONFIG.MATCH_SAVE_COOLDOWN_MS) {
    return {
      valid: false,
      error: "❌ Attends 10 secondes avant d'ajouter un nouveau match",
    };
  }

  return { valid: true };
}

/**
 * Valide un score de match de tournoi.
 * Règles : nombres valides, pas de match nul, bornes [0, MAX_SCORE],
 * le gagnant doit avoir exactement MAX_SCORE, pas les deux à MAX_SCORE.
 */
export function validateTournamentScore(sb, sr) {
  if ([sb, sr].some((v) => isNaN(v))) {
    return { valid: false, error: "Score invalide" };
  }

  if (sb === sr) {
    return { valid: false, error: "Match nul interdit" };
  }

  if (
    sb < APP_CONFIG.MIN_SCORE ||
    sr < APP_CONFIG.MIN_SCORE ||
    sb > APP_CONFIG.MAX_SCORE ||
    sr > APP_CONFIG.MAX_SCORE
  ) {
    return {
      valid: false,
      error: `Les scores doivent être entre ${APP_CONFIG.MIN_SCORE} et ${APP_CONFIG.MAX_SCORE}`,
    };
  }

  if (sb !== APP_CONFIG.MAX_SCORE && sr !== APP_CONFIG.MAX_SCORE) {
    return {
      valid: false,
      error: `Le gagnant doit avoir ${APP_CONFIG.MAX_SCORE}`,
    };
  }

  if (sb === APP_CONFIG.MAX_SCORE && sr === APP_CONFIG.MAX_SCORE) {
    return { valid: false, error: "Score impossible" };
  }

  return { valid: true };
}

/**
 * Normalise un nom de joueur : trim + première lettre majuscule, reste minuscule.
 * Ex: "  jEAN" -> "Jean"
 */
export function normalizePlayerName(rawName) {
  const trimmed = (rawName || "").trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/**
 * Vérifie si un nom existe déjà dans une liste d'objets ayant une propriété `name`
 * (comparaison insensible à la casse).
 */
export function nameExistsInList(name, list) {
  const lower = name.toLowerCase();
  return list.some((item) => (item.name || "").toLowerCase() === lower);
}

/**
 * Caractères autorisés dans un nom de joueur : lettres, chiffres, espaces.
 * Reprise de la regex utilisée dans script.js (validatePlayer).
 */
const PLAYER_NAME_REGEX = /^[a-zA-Z0-9 ]+$/;

/**
 * Valide les caractères d'un nom de joueur saisi (pas de trim, pas de check de vide :
 * la fonction sert juste à détecter des caractères interdits en temps réel).
 *
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePlayerNameChars(name) {
  if (name === "") {
    return { valid: true }; // champ vide : pas d'erreur affichée, géré ailleurs
  }

  if (!PLAYER_NAME_REGEX.test(name)) {
    return { valid: false, error: "Caractères non autorisés !" };
  }

  return { valid: true };
}
