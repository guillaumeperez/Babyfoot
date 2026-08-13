// =========================
// 📊 PLAYER STATS SERVICE
// =========================
// Logique pure pour calculer les statistiques offensives et défensives
// basées sur les vrais buts marqués et encaissés par match.
// Aucun accès Firebase, aucun état global.

function clampScore(value) {
  const score = Number(value);
  return Number.isFinite(score) && !Number.isNaN(score)
    ? Math.max(0, score)
    : 0;
}

/**
 * Calcule les statistiques brutes pour un seul match.
 * Retourne les buts marqués et encaissés pour chaque équipe.
 *
 * @param {number} blueScore - Score de l'équipe bleue
 * @param {number} redScore - Score de l'équipe rouge
 * @returns {{
 *   blueGoalsFor: number,
 *   blueGoalsAgainst: number,
 *   redGoalsFor: number,
 *   redGoalsAgainst: number
 * }}
 */
export function calculateMatchStats(blueScore, redScore) {
  const sb = clampScore(blueScore);
  const sr = clampScore(redScore);

  return {
    blueGoalsFor: sb,
    blueGoalsAgainst: sr,
    redGoalsFor: sr,
    redGoalsAgainst: sb,
  };
}

/**
 * Calcule la moyenne offensive (buts marqués par match).
 *
 * @param {number} totalGoalsFor - Total des buts marqués par l'équipe
 * @param {number} statsMatches - Nombre de matchs joués
 * @returns {number} Moyenne des buts marqués par match
 */
export function calculateOffense(totalGoalsFor, statsMatches) {
  if (statsMatches === 0) return 0;
  return totalGoalsFor / statsMatches;
}

/**
 * Calcule la moyenne défensive (buts encaissés par match).
 *
 * @param {number} totalGoalsAgainst - Total des buts encaissés par l'équipe
 * @param {number} statsMatches - Nombre de matchs joués
 * @returns {number} Moyenne des buts encaissés par match
 */
export function calculateDefense(totalGoalsAgainst, statsMatches) {
  if (statsMatches === 0) return 0;
  return totalGoalsAgainst / statsMatches;
}

/**
 * Formate un nombre de statistiques avec 2 décimales.
 * Utilise la virgule comme séparateur décimal (format français).
 *
 * @param {number} value - Valeur à formater
 * @returns {string} Valeur formatée (ex: "7,98")
 */
export function formatStatsNumber(value) {
  const num = Number(value) || 0;
  const rounded = Math.round(num * 100) / 100;
  return rounded.toString().replace(".", ",");
}
