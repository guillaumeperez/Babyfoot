// =========================
// 👥 PLAYERS PAGE
// =========================
// Vue utilisateur des joueurs (modal "players"), formulaire d'ajout
// et affichage des demandes en attente.

import { getActivePlayers } from "../../repositories/players.repository.js";
import { requestNewPlayer } from "../../services/player.service.js";
import { getPendingRequests } from "../../repositories/requests.repository.js";

import { Toast } from "../components/toast.js";
import { isAdmin } from "../../core/state.js";
// NOTE: la désactivation/réactivation d'un joueur passe par window.togglePlayer,
// exposé globalement par ui/admin/admin.panel.js. Pas d'import direct ici
// pour éviter un cycle players.page.js <-> admin.panel.js.

// =========================
// 👥 LISTE DES JOUEURS (vue utilisateur)
// =========================

export async function loadPlayersModal() {
  const container = document.getElementById("playersList");
  if (!container) return;

  container.innerHTML = "";

  const players = await getActivePlayers();

  players.forEach((p) => {
    const div = document.createElement("div");
    div.style = `
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:8px 0;
      border-bottom:1px solid #eee;
    `;

    div.innerHTML = `
      <span>• ${p.name}</span>
      ${
        isAdmin()
          ? `<button onclick="togglePlayer('${p.id}', true)">🚫</button>`
          : ""
      }
    `;

    container.appendChild(div);
  });
}

// =========================
// ➕ AJOUT D'UN JOUEUR (demande)
// =========================

export async function handleAddPlayer() {
  const input = document.getElementById("playerInput");
  const rawName = input?.value || "";

  const result = await requestNewPlayer(rawName);

  Toast.player(result.message, result.level);

  if (result.success) {
    input.value = "";
    await loadPendingRequests();
  }
}

window.addPlayer = handleAddPlayer;

// =========================
// 📋 DEMANDES EN ATTENTE (liste textuelle, comportement de script.js)
// =========================

export async function loadPendingRequests() {
  const container = document.getElementById("pendingRequestsList");
  if (!container) return;

  container.innerHTML =
    "<p style='color: #6b7280; margin: 0;'>Chargement...</p>";

  try {
    const requests = await getPendingRequests();

    if (requests.length === 0) {
      container.innerHTML =
        "<p style='color: #16a34a; margin: 0;'>✅ Aucune demande en attente</p>";
      return;
    }

    let html = "<div style='color: #1f2937;'>";
    requests.forEach((req) => {
      const name = req.name || "Inconnu";
      html += `<div style="padding: 4px 0;">• ${name}</div>`;
    });
    html += "</div>";

    container.innerHTML = html;
  } catch (e) {
    console.error("❌ Erreur chargement demandes :", e);
    container.innerHTML =
      "<p style='color: #dc2626; margin: 0;'>❌ Erreur lors du chargement</p>";
  }
}
