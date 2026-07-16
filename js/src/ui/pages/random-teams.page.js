// =========================
// 🎲 RANDOM TEAMS PAGE
// =========================
// Tirage aléatoire de 4 joueurs numérotés (1, 2, 3, 4) en deux équipes.
// 100% frontend, aucune dépendance Firebase.

import { openModal, closeModal } from "../components/modal.js";

// =========================
// 🎲 LOGIQUE DU TIRAGE
// =========================

/**
 * Mélange un tableau en place (algorithme Fisher-Yates).
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Génère un tirage aléatoire : répartit [1, 2, 3, 4] en deux équipes de 2.
 * @returns {{ blue: number[], red: number[] }}
 */
function drawTeams() {
  const numbers = shuffle([1, 2, 3, 4]);
  return {
    blue: [numbers[0], numbers[1]].sort((a, b) => a - b),
    red: [numbers[2], numbers[3]].sort((a, b) => a - b),
  };
}

// =========================
// 🖼️ AFFICHAGE
// =========================

function renderTeams() {
  const { blue, red } = drawTeams();

  const blueEl = document.getElementById("randomTeamBlue");
  const redEl = document.getElementById("randomTeamRed");

  if (blueEl) blueEl.textContent = blue.join(" et ");
  if (redEl) redEl.textContent = red.join(" et ");
}

// =========================
// 🌐 EXPOSITION GLOBALE
// =========================

export function openRandomTeams() {
  openModal("randomTeams");
  renderTeams();
}

export function recalculateTeams() {
  renderTeams();
}

window.openRandomTeams = openRandomTeams;
window.recalculateTeams = recalculateTeams;
