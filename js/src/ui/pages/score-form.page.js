// =========================
// ⚽ SCORE FORM PAGE
// =========================
// Comportements du formulaire de score / d'ajout de joueur repris de script.js :
// validation en direct du nom de joueur, limite de score input, nettoyage
// automatique du message quand l'utilisateur retouche un champ.

import { validatePlayerNameChars } from "../../utils/validation.utils.js";
import { Toast } from "../components/toast.js";
import { calculateOffenseDefense } from "../../services/offense-defense.service.js";

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

function updateScoreStatsPreview() {
  const sb = parseInt(document.getElementById("sb")?.value);
  const sr = parseInt(document.getElementById("sr")?.value);
  const preview = document.getElementById("scoreStatsPreview");

  if (!preview) return;

  if (Number.isNaN(sb) || Number.isNaN(sr)) {
    preview.innerHTML = "";
    return;
  }

  const stats = calculateOffenseDefense(sb, sr);

  preview.innerHTML = `
    <div class="score-preview-box">
      <div class="score-preview-title">📊 Statistiques du match</div>
      <div class="score-preview-team team-blue">
        <div>🔵 Équipe Bleue</div>
        <div>⚡ Offensive : +${stats.blueOffense}</div>
        <div>🛡️ Défensive : +${stats.blueDefense}</div>
      </div>
      <div class="score-preview-team team-red">
        <div>🔴 Équipe Rouge</div>
        <div>⚡ Offensive : +${stats.redOffense}</div>
        <div>🛡️ Défensive : +${stats.redDefense}</div>
      </div>
    </div>
  `;
}

window.updateScoreStatsPreview = updateScoreStatsPreview;

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
      field.addEventListener("input", () => {
        Toast.clearScore();
        updateScoreStatsPreview();
      });
      field.addEventListener("change", () => {
        Toast.clearScore();
        updateScoreStatsPreview();
      });
    }
  });

  updateScoreStatsPreview();
}
