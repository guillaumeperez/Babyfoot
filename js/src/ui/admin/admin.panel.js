// =========================
// 🛡️ ADMIN PANEL
// =========================
// Actions réservées à l'admin : resets, archivage, activation/désactivation joueurs,
// renommage et gestion des emojis de forme par joueur.

import {
  getAllPlayers,
  togglePlayerActive,
} from "../../repositories/players.repository.js";

import { deleteAllMatches } from "../../repositories/matches.repository.js";

import { deleteAllTournaments } from "../../repositories/tournaments.repository.js";

import { archiveAndResetSeason } from "../../services/archive.service.js";

import { updatePlayer } from "../../repositories/players.repository.js";

import {
  ensureDefaultMumuFormEmoji,
  getFormEmojiSettings,
  getPlayerFormEmojiConfig,
  setPlayerFormEmojiState,
  setPlayerFormEmojiConfig,
} from "../../repositories/form-emoji.repository.js";

import { Toast } from "../components/toast.js";
import { confirmAction } from "../components/confirm.js";
import { openModal, closeModal } from "../components/modal.js";

import { isAdmin } from "../../core/state.js";

import { loadRanking } from "../pages/ranking.page.js";
import { loadMatches } from "../pages/matches.page.js";

import {
  rebuildAllStats,
  renamePlayer,
} from "../../services/player.service.js";

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
// ☢️ RESET COMPLET
// =========================
// Conserve le comportement d'origine pour compatibilité.

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
// ✏️ RENOMMER UN JOUEUR
// =========================

let _playerToRename = null;

export async function handleOpenRenameModal(id, name) {
  _playerToRename = {
    id,
    name,
  };

  const input = document.getElementById("renamePlayerInput");

  if (input) {
    input.value = name;
    input.focus();
    input.select();
  }

  openModal("renamePlayerModal");
}

window.openRenameModal = handleOpenRenameModal;

// =========================
// 😊 GESTION DES EMOJIS DE FORME
// =========================

const FORM_EMOJI_WINS = [
  "10-9",
  "10-8",
  "10-7",
  "10-6",
  "10-5",
  "10-4",
  "10-3",
  "10-2",
  "10-1",
  "10-0",
];

const FORM_EMOJI_LOSSES = [
  "9-10",
  "8-10",
  "7-10",
  "6-10",
  "5-10",
  "4-10",
  "3-10",
  "2-10",
  "1-10",
  "0-10",
];

let _formEmojiSelectedPlayer = null;

// =========================
// 📋 AFFICHER LA LISTE
// =========================

export async function handleOpenFormEmojiManagementModal() {
  if (!isAdmin()) {
    Toast.error("❌ Accès réservé à l'administration");
    return;
  }

  const list = document.getElementById("formEmojiSettingsList");
  const listView = document.getElementById("formEmojiPlayerListView");
  const editor = document.getElementById("formEmojiPlayerEditor");

  if (!list) return;

  // Toujours revenir à la liste quand on ouvre
  // la gestion depuis les options Admin.
  if (listView) {
    listView.style.display = "block";
  }

  if (editor) {
    editor.style.display = "none";
    editor.innerHTML = "";
  }

  _formEmojiSelectedPlayer = null;

  list.innerHTML = "<p>Chargement...</p>";

  try {
    const players = (await getAllPlayers()).filter((p) => p.active !== false);

    // Initialise Mumu uniquement s'il n'a encore aucune configuration.
    await ensureDefaultMumuFormEmoji(players);

    const settings = await getFormEmojiSettings();

    list.innerHTML = "";

    if (players.length === 0) {
      list.innerHTML = "<p>Aucun joueur actif.</p>";

      openModal("formEmojiSettingsModal");

      return;
    }

    players.forEach((player) => {
      const row = document.createElement("div");

      row.style = `
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        padding:10px 8px;
        margin-bottom:8px;
        border:1px solid #ddd;
        border-radius:8px;
        background:#f9fafb;
      `;

      // =========================
      // 👤 NOM DU JOUEUR
      // =========================

      const playerButton = document.createElement("button");

      playerButton.type = "button";

      playerButton.style = `
        flex:1;
        text-align:left;
        border:none;
        background:transparent;
        padding:6px;
        cursor:pointer;
        font-weight:bold;
        font-size:16px;
      `;

      playerButton.textContent = player.name || "Joueur";

      playerButton.title = `Modifier les emojis de ${player.name || "ce joueur"}`;

      playerButton.onclick = () => {
        openPlayerFormEmojiEditor(player);
      };

      // =========================
      // 🔘 ACTIVATION
      // =========================

      const toggleWrap = document.createElement("div");

      toggleWrap.style = `
        display:flex;
        align-items:center;
        gap:8px;
      `;

      const config = settings[String(player.id)] || {
        enabled: false,
      };

      const isEnabled = Boolean(config.enabled);

      const status = document.createElement("span");

      status.textContent = isEnabled ? "🟢 Activé" : "⚪ Désactivé";

      status.style.color = isEnabled ? "#16a34a" : "#6b7280";

      const checkbox = document.createElement("input");

      checkbox.type = "checkbox";
      checkbox.checked = isEnabled;

      checkbox.title = `Activer/désactiver les emojis spéciaux pour ${player.name}`;

      checkbox.onclick = (event) => {
        event.stopPropagation();
      };

      checkbox.onchange = async () => {
        try {
          await setPlayerFormEmojiState(player.id, checkbox.checked);

          const updatedConfig = await getPlayerFormEmojiConfig(player.id);

          const newStatus = Boolean(updatedConfig.enabled);

          status.textContent = newStatus ? "🟢 Activé" : "⚪ Désactivé";

          status.style.color = newStatus ? "#16a34a" : "#6b7280";

          Toast.success(
            newStatus
              ? `😊 Emojis activés pour ${player.name}`
              : `⚪ Emojis désactivés pour ${player.name}`,
          );
        } catch (error) {
          console.error("Erreur activation emojis :", error);

          checkbox.checked = !checkbox.checked;

          Toast.error("❌ Impossible de modifier le réglage");
        }
      };

      toggleWrap.appendChild(status);
      toggleWrap.appendChild(checkbox);

      row.appendChild(playerButton);
      row.appendChild(toggleWrap);

      list.appendChild(row);
    });

    openModal("formEmojiSettingsModal");
  } catch (error) {
    console.error("Erreur chargement gestion emojis :", error);

    list.innerHTML = "<p>❌ Impossible de charger les réglages.</p>";

    Toast.error("❌ Impossible de charger les réglages des emojis");
  }
}

window.openFormEmojiManagementModal = handleOpenFormEmojiManagementModal;

// =========================
// 😊 OUVRIR LA CONFIGURATION
// D'UN JOUEUR
// =========================
// IMPORTANT :
// On ne crée PAS de nouveau modal.
// On utilise le même formEmojiSettingsModal.
// On masque simplement la liste et on affiche l'éditeur.

async function openPlayerFormEmojiEditor(player) {
  if (!isAdmin()) {
    Toast.error("❌ Accès réservé à l'administration");
    return;
  }

  _formEmojiSelectedPlayer = player;

  const listView = document.getElementById("formEmojiPlayerListView");

  const editor = document.getElementById("formEmojiPlayerEditor");

  if (!editor) {
    Toast.error("❌ Zone d'édition des emojis introuvable");

    return;
  }

  try {
    const config = await getPlayerFormEmojiConfig(player.id);

    editor.innerHTML = "";

    // =========================
    // 🔙 RETOUR
    // =========================

    const backButton = document.createElement("button");

    backButton.type = "button";

    backButton.textContent = "← Retour aux joueurs";

    backButton.style = `
      width:100%;
      margin-bottom:12px;
      padding:9px;
      border:1px solid #ddd;
      border-radius:8px;
      background:#f3f4f6;
      cursor:pointer;
      font-weight:bold;
    `;

    backButton.onclick = () => {
      editor.style.display = "none";

      if (listView) {
        listView.style.display = "block";
      }

      _formEmojiSelectedPlayer = null;
    };

    editor.appendChild(backButton);

    // =========================
    // TITRE
    // =========================

    const title = document.createElement("h3");

    title.textContent = `😊 Emojis de forme — ${player.name}`;

    title.style = `
      margin:0 0 15px 0;
      text-align:center;
    `;

    editor.appendChild(title);

    // =========================
    // 🏆 VICTOIRES
    // =========================

    const winsTitle = document.createElement("h4");

    winsTitle.textContent = "🏆 VICTOIRE";

    winsTitle.style = `
      margin:12px 0 8px;
    `;

    editor.appendChild(winsTitle);

    FORM_EMOJI_WINS.forEach((score) => {
      editor.appendChild(
        createFormEmojiInput(score, config.wins?.[score] || ""),
      );
    });

    // =========================
    // 😅 DÉFAITES
    // =========================

    const lossesTitle = document.createElement("h4");

    lossesTitle.textContent = "😅 DÉFAITE";

    lossesTitle.style = `
      margin:18px 0 8px;
    `;

    editor.appendChild(lossesTitle);

    FORM_EMOJI_LOSSES.forEach((score) => {
      editor.appendChild(
        createFormEmojiInput(score, config.losses?.[score] || ""),
      );
    });

    // =========================
    // 💾 ENREGISTRER
    // =========================

    const saveButton = document.createElement("button");

    saveButton.type = "button";

    saveButton.textContent = "💾 Enregistrer";

    saveButton.style = `
      width:100%;
      margin-top:20px;
      padding:12px;
      border:none;
      border-radius:8px;
      cursor:pointer;
      font-weight:bold;
      font-size:16px;
    `;

    saveButton.onclick = async () => {
      await savePlayerFormEmojiConfig();
    };

    editor.appendChild(saveButton);

    // =========================
    // ON RESTE DANS LE MÊME MODAL
    // =========================

    if (listView) {
      listView.style.display = "none";
    }

    editor.style.display = "block";
  } catch (error) {
    console.error("Erreur ouverture configuration emojis :", error);

    Toast.error("❌ Impossible de charger la configuration");
  }
}

// =========================
// 📝 CRÉER UN CHAMP EMOJI
// =========================

function createFormEmojiInput(score, value) {
  const row = document.createElement("div");

  row.style = `
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    margin-bottom:8px;
  `;

  const label = document.createElement("span");

  label.textContent = score;

  label.style = `
    min-width:55px;
    font-weight:bold;
  `;

  const input = document.createElement("input");

  input.type = "text";
  input.value = value;
  input.placeholder = "😊";
  input.maxLength = 20;

  input.dataset.score = score;

  input.style = `
    flex:1;
    min-width:0;
    padding:8px;
    font-size:22px;
    text-align:center;
    border:1px solid #ccc;
    border-radius:8px;
  `;

  // Permet l'utilisation du clavier emoji du téléphone
  // et le collage de plusieurs emojis.
  input.autocomplete = "off";
  input.spellcheck = false;

  row.appendChild(label);
  row.appendChild(input);

  return row;
}

// =========================
// 💾 ENREGISTRER LA CONFIG
// D'UN SEUL JOUEUR
// =========================

async function savePlayerFormEmojiConfig() {
  if (!isAdmin()) {
    Toast.error("❌ Accès réservé à l'administration");
    return;
  }

  if (!_formEmojiSelectedPlayer) {
    Toast.error("❌ Aucun joueur sélectionné");
    return;
  }

  const editor = document.getElementById("formEmojiPlayerEditor");

  if (!editor) return;

  const wins = {};
  const losses = {};

  const inputs = editor.querySelectorAll("input[data-score]");

  inputs.forEach((input) => {
    const score = input.dataset.score;
    const value = input.value.trim();

    if (FORM_EMOJI_WINS.includes(score)) {
      wins[score] = value;
    }

    if (FORM_EMOJI_LOSSES.includes(score)) {
      losses[score] = value;
    }
  });

  try {
    const currentConfig = await getPlayerFormEmojiConfig(
      _formEmojiSelectedPlayer.id,
    );

    await setPlayerFormEmojiConfig(_formEmojiSelectedPlayer.id, {
      // On conserve l'activation actuelle.
      enabled: currentConfig.enabled,

      // On modifie uniquement les emojis
      // du joueur sélectionné.
      wins,
      losses,
    });

    Toast.success(`✅ Emojis de ${_formEmojiSelectedPlayer.name} enregistrés`);

    // Retour à la liste dans LE MÊME MODAL.
    const listView = document.getElementById("formEmojiPlayerListView");

    if (editor) {
      editor.style.display = "none";
    }

    if (listView) {
      listView.style.display = "block";
    }

    _formEmojiSelectedPlayer = null;

    // Recharge la liste pour afficher l'état actuel.
    await handleOpenFormEmojiManagementModal();
  } catch (error) {
    console.error("Erreur enregistrement emojis :", error);

    Toast.error("❌ Impossible d'enregistrer les emojis");
  }
}

// =========================
// ✏️ CONFIRMER RENOMMAGE
// =========================

export async function handleConfirmRename() {
  if (!_playerToRename) return;

  const input = document.getElementById("renamePlayerInput");

  const newName = input?.value?.trim();

  if (!newName) {
    Toast.error("❌ Nom vide");
    return;
  }

  const result = await renamePlayer(
    _playerToRename.id,
    _playerToRename.name,
    newName,
  );

  if (result.success) {
    Toast.success(result.message);

    closeModal("renamePlayerModal");

    await loadAdminPlayers();
    await loadRanking();
    await loadMatches();
  } else {
    Toast.error(result.message);
  }

  _playerToRename = null;
}

window.confirmRename = handleConfirmRename;

// =========================
// 👥 LISTE ADMIN DES JOUEURS
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
      <span style="font-weight:bold;">
        ${p.name} ${isActive ? "" : "(désactivé)"}
      </span>

      <div style="display:flex; gap:8px;">
        <button onclick="openRenameModal('${p.id}', '${p.name}')">
          ✏️ Renommer
        </button>

        <button onclick="togglePlayer('${p.id}', ${isActive})">
          ${isActive ? "🚫 Désactiver" : "♻️ Réactiver"}
        </button>
      </div>
    `;

    container.appendChild(div);
  });
}

// =========================
// 🪟 OUVERTURE MODAL JOUEURS
// =========================

export function openPlayersModalWithAdminPanel(isAdminUser) {
  const panel = document.getElementById("adminPlayersPanel");

  if (!panel) return;

  panel.style.display = isAdminUser ? "block" : "none";

  if (isAdminUser) {
    loadAdminPlayers();
  }
}

// =========================
// 🔄 RECALCULER TOUS LES STATS
// =========================

export async function handleRebuildAllStats() {
  if (!confirmAction("⚠️ Recalculer tous les ELO ?")) {
    return;
  }

  await rebuildAllStats();

  Toast.success("✅ Classement reconstruit");

  await loadRanking();
  await loadMatches();
}

window.rebuildAllStats = handleRebuildAllStats;
