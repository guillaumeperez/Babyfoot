// =========================
// 📩 REQUESTS PANEL
// =========================
// Affichage et gestion des demandes d'ajout de joueurs en attente (admin).
// Fusionne les anciennes fonctions dupliquées loadDemandes / afficherDemandes
// et acceptPlayer / validerDemande en un seul flux cohérent.

import { getPendingRequests } from "../../repositories/requests.repository.js";
import {
  acceptPlayerRequest,
  rejectPlayerRequest,
} from "../../services/player.service.js";

import { Toast } from "../components/toast.js";
import { confirmAction } from "../components/confirm.js";
import { loadPlayersSelect } from "../pages/matches.page.js";
import { loadPlayersFilter } from "../pages/matches.page.js";
import { loadPendingRequests } from "../pages/players.page.js";

// =========================
// 📩 AFFICHAGE DES DEMANDES
// =========================

export async function loadDemandes() {
  const container = document.getElementById("listeDemandes");
  if (!container) return;

  container.innerHTML = "";

  try {
    const requests = await getPendingRequests();

    if (requests.length === 0) {
      container.innerHTML = "<p>Aucune demande</p>";
      return;
    }

    requests.forEach((req) => {
      const name = req.name || "Inconnu";
      const safeName = name.replace(/'/g, "\\'");

      const div = document.createElement("div");
      div.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 5px 0;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 8px;
      `;

      div.innerHTML = `
        <span>${name}</span>
        <div style="display:flex; gap:5px;">
          <button onclick="acceptPlayer('${req.id}', '${safeName}')">✅</button>
          <button onclick="rejectPlayer('${req.id}')">❌</button>
        </div>
      `;

      container.appendChild(div);
    });
  } catch (e) {
    console.error("loadDemandes error:", e);
  }
}

// =========================
// ✅ ACCEPTER UNE DEMANDE
// =========================

export async function handleAcceptPlayer(requestId, name) {
  if (!confirmAction(`Valider ${name} ?`)) return;

  try {
    await acceptPlayerRequest(requestId, name);

    Toast.success(`✅ ${name} ajouté`);

    await loadDemandes();
    await loadPlayersSelect();
    await loadPendingRequests();
  } catch (e) {
    console.error(e);
    Toast.error("❌ Erreur validation joueur");
  }
}

window.acceptPlayer = handleAcceptPlayer;

// =========================
// ❌ REFUSER UNE DEMANDE
// =========================

export async function handleRejectPlayer(requestId) {
  if (!confirmAction("Refuser cette demande ?")) return;

  try {
    await rejectPlayerRequest(requestId);

    Toast.success("❌ Demande refusée");

    await loadDemandes();
    await loadPendingRequests();
  } catch (e) {
    console.error(e);
    Toast.error("❌ Erreur refus");
  }
}

window.rejectPlayer = handleRejectPlayer;
