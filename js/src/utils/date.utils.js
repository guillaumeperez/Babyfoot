// =========================
// 📅 DATE UTILS
// =========================
// Fonctions pures de formatage de dates. Aucune dépendance.

/**
 * Formate un timestamp Firestore ou un timestamp local (ms) en date FR (jj/mm/aa).
 * Gère les deux formats trouvés dans l'app : m.createdAt (Firestore) ou m.createdAtLocal (Date.now()).
 */
export function formatMatchDate(match) {
  if (match.createdAt?.seconds) {
    return new Date(match.createdAt.seconds * 1000).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  }

  if (match.createdAtLocal) {
    return new Date(match.createdAtLocal).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  }

  return "Date inconnue";
}

/**
 * Convertit une valeur Firestore Timestamp (ou date brute) en objet Date JS.
 * Retourne null si value est falsy.
 */
export function getTimestampDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    return value.toDate();
  }
  return new Date(value);
}

/**
 * Indique si un timestamp Firestore est "récent" par rapport à maintenant,
 * selon un seuil en millisecondes.
 */
export function isRecent(timestampValue, thresholdMs) {
  const date = getTimestampDate(timestampValue);
  if (!date) return false;
  return Date.now() - date.getTime() <= thresholdMs;
}

/**
 * Retourne une clé de date sûre pour un nom de document Firestore
 * (pas de ":" ni de ".").
 */
export function buildDateKey(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

/**
 * Retourne le nom de saison au format "mois année" en français.
 * Ex: "juin 2026"
 */
export function buildSeasonName(date = new Date()) {
  return date.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}
