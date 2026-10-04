// =========================
// 🚨 ERROR UTILS
// =========================
// Journalisation centralisée des erreurs avec contexte.
// Remplace les console.error dispersés sans contexte clair.

/**
 * Logue une erreur avec un contexte (nom de la fonction/module concerné).
 * Retourne un message lisible utilisable pour l'affichage utilisateur.
 */
export function handleError(error, context) {
  console.error(`❌ [${context}]`, error);
  return error?.message || String(error) || "Erreur inconnue";
}
