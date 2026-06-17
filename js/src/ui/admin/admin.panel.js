// =========================
// 🛡️ ADMIN PANEL
// =========================
// Actions réservées à l'admin : resets, archivage, activation/désactivation joueurs.

import { getAllPlayers, togglePlayerActive } from "../../repositories/players.repository.js";
import { deleteAllMatches } from "../../repositories/matches.repository.js";
import { deleteAllTournaments } from "../../repositories/tournaments.repository.js";
import { archiveAndResetSeason } from "../../services/archive.service.js";
import { updatePlayer } from "../../repositories/players.repository.js";

import { Toast } from "../components/toast.js";
import { confirmAction } from "../components/confirm.js";
import { loadRanking } from "../pages/ranking.page.js";
import { loadMatches } from "../pages/matches.page.js";

// =========================
// 🗑️ RESET MATCHS
// =========================

export async function handleResetAllMatches() {
  if (!confirmAction("⚠️ Supprimer TOUS les matchs ?")) return;

  await deleteAllMatches();

  Toast.success("✅ Tous les matchs supprimés");

  await loadMatches();
  await loadRanking();
}

window.resetAllMatches = handleResetAllMatches;

// =========================
// 🗑️ RESET TOURNOIS
// =========================

export async function handleResetAllTournaments() {
  if (!confirmAction("⚠️ Supprimer TOUS les tournois ?")) return;

  await deleteAllTournaments();

  Toast.success("✅ Tous les tournois supprimés");
}

window.resetAllTournaments = handleResetAllTournaments;

// =========================
// 📦 ARCHIVAGE + RESET CLASSEMENT
// =========================

export async function handleResetAllWithArchive() {
  if (!confirmAction("⚠️ ARCHIVER puis RESET le classement ?")) return;

  const result = await archiveAndResetSeason();

  if (!result.success) {
    Toast.error("❌ " + result.error);
    return;
  }

  Toast.success("✅ Archive + reset terminé !");
  await loadRanking();
}

window.resetAllWithArchive = handleResetAllWithArchive;

// =========================
// ☢️ RESET COMPLET (legacy, structure de champs différente)
// =========================
// Conserve le comportement d'origine : remet à 1000 et utilise victory/defeat/goals
// au lieu de wins/losses/elo standard. Conservé tel quel pour compatibilité.

export async function handleFullReset() {
  if (!confirmAction("☢ RESET COMPLET APPLICATION ?")) return;

  await deleteAllMatches();
  await deleteAllTournaments();

  const players = await getAllPlayers();

  for (const p of players) {
    await updatePlayer(p.id, {
      elo: 1000,
      victory: 0,
      defeat: 0,
      goals: 0,
      goalsAgainst: 0,
      games: 0,
    });
  }

  Toast.success("☢ RESET COMPLET TERMINÉ");

  await loadRanking();
  await loadMatches();
}

window.fullReset = handleFullReset;

// =========================
// 🔄 ACTIVER / DÉSACTIVER UN JOUEUR
// =========================

export async function handleTogglePlayer(id, isActive) {
  const msg = isActive ? "Désactiver ce joueur ?" : "Réactiver ce joueur ?";
  if (!confirmAction(msg)) return;

  await togglePlayerActive(id, isActive);

  await loadAdminPlayers();
  await loadRanking();
}

window.togglePlayer = handleTogglePlayer;

// =========================
// 🧑 LISTE ADMIN DES JOUEURS
// =========================

export async function loadAdminPlayers() {
  const container = document.getElementById("adminPlayersList");
  if (!container) return;

  container.innerHTML = "";

  const players = await getAllPlayers();

  players.forEach((p) => {
    const isActive = p.active !== false;

    const div = document.createElement("div");
    div.style = `
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:8px;
      margin:5px 0;
      border:1px solid #ddd;
      border-radius:8px;
    `;

    div.innerHTML = `
      <span style="font-weight:bold;">${p.name} ${isActive ? "" : "(désactivé)"}</span>
      <button onclick="togglePlayer('${p.id}', ${isActive})">
        ${isActive ? "🚫 Désactiver" : "♻️ Réactiver"}
      </button>
    `;

    container.appendChild(div);
  });
}

// =========================
// 🪟 OUVERTURE MODAL JOUEURS (avec panneau admin conditionnel)
// =========================

export function openPlayersModalWithAdminPanel(isAdminUser) {
  const panel = document.getElementById("adminPlayersPanel");
  if (!panel) return;

  panel.style.display = isAdminUser ? "block" : "none";

  if (isAdminUser) {
    loadAdminPlayers();
  }
}
