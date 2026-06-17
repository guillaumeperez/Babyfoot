// =========================
// 🚀 MAIN — POINT D'ENTRÉE
// =========================
// Ce fichier remplace le ancien app.js monolithique.
// Il n'a qu'un seul rôle : assembler les modules et lancer l'application.
// Aucune logique métier ne doit être ajoutée ici.

import { setAppMode } from "./core/state.js";
import { watchAuthState, loginAdmin, logoutAdmin } from "./core/auth.js";
import {
  openModal,
  closeModal,
  registerOnOpen,
} from "./ui/components/modal.js";

// --- Pages ---
import { loadRanking } from "./ui/pages/ranking.page.js";
import {
  loadMatches,
  loadPlayersFilter,
  loadPlayersSelect,
  handleSaveMatch,
} from "./ui/pages/matches.page.js";
import {
  loadPlayersModal,
  loadPendingRequests,
  handleAddPlayer,
} from "./ui/pages/players.page.js";
import {
  loadPlayersTrendFilter,
  loadPlayerEloTrend,
} from "./ui/pages/trend.page.js";
import {
  loadTournaments,
  createTournament,
  addManualTeam,
  updateTeamModeUI,
  openTournamentTab,
} from "./ui/pages/tournament.page.js";
import { loadComments, handleAddComment } from "./ui/pages/comments.page.js";
import { validatePlayer } from "./ui/pages/score-form.page.js";

// --- Admin ---
import {
  loadAdminPlayers,
  openPlayersModalWithAdminPanel,
} from "./ui/admin/admin.panel.js";
import { loadDemandes } from "./ui/admin/requests.panel.js";

// --- Pages supplémentaires ---
import { openArchiveModal as archiveModal } from "./ui/pages/archive.page.js";
import {
  openPlayerProfile,
  closePlayerProfile,
} from "./ui/pages/player-profile.page.js";

// --- Debug ---
import "./ui/debug/audit.js";

// =========================
// 🧪 MODE TEST / PROD
// =========================

function detectAppMode() {
  const host = window.location.hostname;

  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "" ||
    host === "0.0.0.0";

  return isLocal ? "test" : "prod";
}

setAppMode(detectAppMode());
window.APP_MODE = detectAppMode(); // compat: certains modules legacy lisent encore window.APP_MODE

// =========================
// 🪟 HOOKS D'OUVERTURE DE MODAL
// =========================

registerOnOpen("players", loadPlayersModal);
registerOnOpen("ranking", loadRanking);
registerOnOpen("history", async () => {
  await loadMatches();
  await loadPlayersFilter();
});

// =========================
// 🌐 EXPOSITION GLOBALE (compat onclick= dans le HTML existant)
// =========================

window.openModal = openModal;
window.closeModal = closeModal;
window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;
window.loadPlayerEloTrend = loadPlayerEloTrend;

// Wrappers pour les appels onclick du HTML
window.openPlayersModal = function () {
  openModal("players");
  openPlayersModalWithAdminPanel(window.isAdmin === true);
};

window.openRanking = function () {
  loadRanking();
  openModal("ranking");
};

window.openHistory = function () {
  openModal("history");
};

window.openArchiveModal = function () {
  archiveModal();
};

// Fonctions du profil joueur
window.openPlayerProfile = openPlayerProfile;
window.closePlayerProfile = closePlayerProfile;

// Autres fonctions exposées depuis les pages
window.loadMatches = loadMatches;
window.loadPlayersSelect = loadPlayersSelect;
window.loadPlayersFilter = loadPlayersFilter;
window.loadPlayersTrendFilter = loadPlayersTrendFilter;
window.loadTournaments = loadTournaments;
window.loadComments = loadComments;

// Fonctions appelées depuis onclick du HTML
window.addPlayer = handleAddPlayer;
window.saveMatch = handleSaveMatch;
window.addComment = handleAddComment;
window.createTournament = createTournament;
window.addManualTeam = addManualTeam;
window.updateTeamModeUI = updateTeamModeUI;
window.openTournamentTab = openTournamentTab;
window.validatePlayer = validatePlayer;

// =========================
// 👁 WATCHER AUTH
// =========================

watchAuthState({
  onLogin: () => {
    window.isAdmin = true;

    const panel = document.getElementById("adminPanel");
    const badge = document.getElementById("adminBadge");
    const adminPlayersPanel = document.getElementById("adminPlayersPanel");

    if (panel) panel.style.display = "block";
    if (badge) badge.style.display = "block";
    if (adminPlayersPanel) adminPlayersPanel.style.display = "block";

    loadDemandes();
    loadAdminPlayers();
    loadMatches();
  },
  onLogout: () => {
    window.isAdmin = false;

    const panel = document.getElementById("adminPanel");
    const badge = document.getElementById("adminBadge");
    const adminPlayersPanel = document.getElementById("adminPlayersPanel");

    if (panel) panel.style.display = "none";
    if (badge) badge.style.display = "none";
    if (adminPlayersPanel) adminPlayersPanel.style.display = "none";

    loadMatches();
  },
});

// =========================
// 🚀 INITIALISATION
// =========================

document.addEventListener("DOMContentLoaded", () => {
  if (window.APP_MODE === "test") {
    document.body.style.border = "5px solid red";
    console.log("🧪 MODE TEST ACTIVÉ");
  } else {
    console.log("🚀 MODE PROD ACTIVÉ");
  }

  // Expose quelques fonctions utiles pour debug manuel en console
  window.loadRanking = loadRanking;
  window.loadMatches = loadMatches;
  window.loadComments = loadComments;
  window.loadPlayersSelect = loadPlayersSelect;
  window.loadPlayersFilter = loadPlayersFilter;
  window.loadPlayersTrendFilter = loadPlayersTrendFilter;
  window.loadTournaments = loadTournaments;
  window.saveMatch = handleSaveMatch;

  loadRanking();
  loadMatches();
  loadComments();
  loadPlayersSelect();
  loadPlayersFilter();
  loadPlayersTrendFilter();
  loadTournaments();
});
