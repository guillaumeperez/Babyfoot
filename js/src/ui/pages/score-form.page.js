// =========================
// ⚽ SCORE FORM PAGE
// =========================
// Comportements du formulaire de score / d'ajout de joueur repris de script.js :
// validation en direct du nom de joueur, limite de score input, nettoyage
// automatique du message quand l'utilisateur modifie un champ.

import { validatePlayerNameChars } from "../../utils/validation.utils.js";
import { Toast } from "../components/toast.js";

// =========================
// 👥 VALIDATION JOUEUR (live, sur input)
// =========================

/**
 * Vérifie en direct le contenu de #playerInput et affiche/cache #playerError.
 * Ne bloque pas la saisie, affiche juste un message d'erreur visuel.
 */
export function validatePlayer() {
  const input = document.getElementById("playerInput");
  const error = document.getElementById("playerError");

  if (!input || !error) return;

  const name = input.value.trim();

  error.style.display = "none";

  if (name === "") return;

  const check = validatePlayerNameChars(name);

  if (!check.valid) {
    error.textContent = check.error;
    error.style.display = "block";
  }
}

window.validatePlayer = validatePlayer;

// =========================
// ⚽ LIMITER SCORE (borne -10 / 10 sur l'input)
// =========================

export function limitScore(input) {
  const value = parseInt(input.value);

  if (isNaN(value)) return;

  if (value > 10) input.value = 10;
  if (value < -10) input.value = -10;
}

window.limitScore = limitScore;

// =========================
// 🎯 ÉCOUTEURS FORMULAIRE SCORE
// =========================
// Nettoie le message de score affiché dès que l'utilisateur retouche un champ.
// À appeler une seule fois depuis main.js au DOMContentLoaded.

export function initScoreFormListeners() {
  const fieldsToWatch = ["b1", "b2", "r1", "r2", "sb", "sr"];

  fieldsToWatch.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener("input", () => Toast.clearScore());
      field.addEventListener("change", () => Toast.clearScore());
    }
  });
}
