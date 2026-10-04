/* =========================
   👤 PLAYER PROFILE PAGE
========================= */

import { getPlayerByName } from "../../repositories/players.repository.js";

let playerProfileCache = null;

/**
 * Ouvre le profil d'un joueur
 * @param {string} playerName - Le nom du joueur
 */
export async function openPlayerProfile(playerName) {
  if (!playerName) {
    console.error("❌ Nom de joueur vide");
    return;
  }

  try {
    // Récupérer les données du joueur
    const player = await getPlayerByName(playerName);

    if (!player) {
      console.warn(`⚠️ Joueur "${playerName}" non trouvé`);
      return;
    }

    playerProfileCache = player;

    // Afficher le profil
    displayPlayerProfile(player);
  } catch (error) {
    console.error("❌ Erreur lors de l'ouverture du profil:", error);
  }
}

/**
 * Affiche le profil d'un joueur dans une modale
 * @param {Object} player - Les données du joueur
 */
function displayPlayerProfile(player) {
  // Créer ou récupérer la modale du profil
  let profileModal = document.getElementById("playerProfile");

  if (!profileModal) {
    // Créer la modale si elle n'existe pas
    profileModal = createPlayerProfileModal();
    document.querySelector(".page").appendChild(profileModal);
  }

  // Remplir les données du profil
  const statsContainer = profileModal.querySelector(".profile-stats");
  const historyContainer = profileModal.querySelector(".profile-history");

  // Stats
  statsContainer.innerHTML = `
    <div class="stat-item">
      <span class="stat-label">Victoires:</span>
      <span class="stat-value">${player.wins || 0}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Défaites:</span>
      <span class="stat-value">${player.losses || 0}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">ELO:</span>
      <span class="stat-value">${player.elo || 2000}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Ratio:</span>
      <span class="stat-value">${calculateWinRate(player.wins, player.losses)}</span>
    </div>
  `;

  // Historique (simplifié)
  if (player.matchHistory && player.matchHistory.length > 0) {
    historyContainer.innerHTML = `
      <h4>📜 Derniers matchs</h4>
      <div class="match-list">
        ${player.matchHistory
          .slice(0, 5)
          .map(
            (match) => `
          <div class="match-item">
            <span>${match.result === "win" ? "✅" : "❌"}</span>
            <span>${match.opponent}</span>
            <span>${match.date}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  } else {
    historyContainer.innerHTML = "<p>Pas de matchs enregistrés</p>";
  }

  // Ouvrir la modale
  profileModal.style.display = "flex";

  // Gérer le scroll
  const scrollY = window.scrollY;
  document.body.classList.add("no-scroll");
  document.body.style.top = `-${scrollY}px`;
}

/**
 * Crée la modale du profil joueur
 * @returns {HTMLElement} La modale créée
 */
function createPlayerProfileModal() {
  const modal = document.createElement("div");
  modal.id = "playerProfile";
  modal.classList.add("modal");
  modal.style.cssText = "display:none;";

  modal.innerHTML = `
    <div class="box">
      <h3 class="title">👤 Profil Joueur</h3>

      <div class="profile-stats" style="
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
        margin: 20px 0;
      ">
      </div>

      <hr style="margin: 20px 0;">

      <div class="profile-history" style="margin: 20px 0;">
      </div>

      <div class="actions">
        <button onclick="closePlayerProfile()" class="btn-danger">
          <img src="img/closed.png" alt="">
          Fermer
        </button>
      </div>
    </div>
  `;

  return modal;
}

/**
 * Ferme la modale du profil joueur
 */
export function closePlayerProfile() {
  const profileModal = document.getElementById("playerProfile");

  if (!profileModal) return;

  profileModal.style.display = "none";

  document.body.classList.remove("no-scroll");
  document.body.style.top = "";

  // Restaurer le scroll (approximatif)
  window.scrollTo(0, 0);
}

/**
 * Calcule le ratio de victoires
 * @param {number} wins - Nombre de victoires
 * @param {number} losses - Nombre de défaites
 * @returns {string} Le ratio formaté
 */
function calculateWinRate(wins, losses) {
  if (!wins && !losses) return "N/A";

  const total = wins + losses;
  const rate = ((wins / total) * 100).toFixed(1);
  return `${rate}%`;
}

/**
 * Mise à jour du profil en cache
 * @param {Object} updatedData - Les données à mettre à jour
 */
export function updatePlayerProfileCache(updatedData) {
  if (playerProfileCache) {
    playerProfileCache = { ...playerProfileCache, ...updatedData };
  }
}

/**
 * Récupère le profil en cache
 * @returns {Object|null} Le profil en cache
 */
export function getPlayerProfileCache() {
  return playerProfileCache;
}
