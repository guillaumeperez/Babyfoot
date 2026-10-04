// =========================
// ⚔️ MATCHES PAGE
// =========================
// Formulaire de saisie de match classique, historique des matchs, filtres.

import { getAllMatches } from "../../repositories/matches.repository.js";
import { getActivePlayers } from "../../repositories/players.repository.js";

import {
  validateClassicMatch,
  saveClassicMatch,
  deleteClassicMatchAndRestoreElo,
  filterMatchesForPlayer,
} from "../../services/match.service.js";

import { formatMatchDate } from "../../utils/date.utils.js";
import { Toast } from "../components/toast.js";
import { confirmAction } from "../components/confirm.js";
import { closeModal } from "../components/modal.js";

import {
  getLastMatchSave,
  setLastMatchSave,
  isSaving,
  setIsSaving,
  isAdmin,
  getAppMode,
} from "../../core/state.js";

import { loadRanking } from "./ranking.page.js";

// =========================
// 🎯 SELECT JOUEURS (formulaire de match)
// =========================

/**
 * Remplit les 4 selects (b1, b2, r1, r2) avec les joueurs actifs.
 */
export async function loadPlayersSelect() {
  const players = await getActivePlayers();
  const selectIds = ["b1", "b2", "r1", "r2"];

  selectIds.forEach((id) => {
    const select = document.getElementById(id);
    if (select) select.innerHTML = "<option value=''>-- choisir --</option>";
  });

  players.forEach((p) => {
    selectIds.forEach((id) => {
      const select = document.getElementById(id);
      if (!select) return;

      const option = document.createElement("option");
      option.value = p.name;
      option.textContent = p.name;
      select.appendChild(option);
    });
  });
}

// =========================
// 💾 SAUVEGARDE D'UN MATCH
// =========================

function resetScoreForm() {
  ["b1", "b2", "r1", "r2", "sb", "sr"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function toggleFormDisabled(disabled) {
  ["b1", "b2", "r1", "r2", "sb", "sr"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
}

/**
 * Gère le clic sur "Enregistrer le match". À brancher sur l'event du bouton.
 */
export async function handleSaveMatch(event) {
  if (isSaving()) return;
  setIsSaving(true);

  const btn = event?.target;

  Toast.clearScore();
  Toast.score("⏳ Enregistrement en cours...", "orange", 0);

  if (btn) btn.disabled = true;
  toggleFormDisabled(true);

  try {
    const b1 = document.getElementById("b1")?.value;
    const b2 = document.getElementById("b2")?.value;
    const r1 = document.getElementById("r1")?.value;
    const r2 = document.getElementById("r2")?.value;
    const sb = parseInt(document.getElementById("sb")?.value);
    const sr = parseInt(document.getElementById("sr")?.value);

    const check = validateClassicMatch({
      b1, b2, r1, r2, sb, sr,
      lastMatchSave: getLastMatchSave(),
    });

    if (!check.valid) {
      Toast.score(check.error, "red", 3000);
      return;
    }

    setLastMatchSave(Date.now());

    const { testMode } = await saveClassicMatch({ b1, b2, r1, r2, sb, sr });

    if (testMode) {
      Toast.score("🧪 Match simulé", "orange", 5000);
      resetScoreForm();
      return;
    }

    Toast.score("✅ Match enregistré", "green", 5000);
    resetScoreForm();

    await Promise.all([loadRanking(), loadMatches()]);

    setTimeout(() => closeModal("score"), 5000);
  } catch (e) {
    console.error("❌ handleSaveMatch error:", e);
    const errorMsg = e?.message || e || "Erreur inconnue";
    Toast.score(`❌ Erreur lors de l'enregistrement\n${errorMsg}`, "red", 5000);
  } finally {
    setIsSaving(false);

    const scoreModal = document.getElementById("score");
    if (scoreModal && scoreModal.style.display === "flex") {
      if (btn) btn.disabled = false;
      toggleFormDisabled(false);
    }
  }
}

// =========================
// 🗑️ SUPPRESSION D'UN MATCH
// =========================

export async function handleDeleteMatch(matchId) {
  if (!isAdmin()) {
    Toast.error("❌ Admin requis");
    return;
  }

  if (!confirmAction("Supprimer ce match et restaurer les ELO ?")) return;

  const result = await deleteClassicMatchAndRestoreElo(matchId);

  if (!result.success) {
    Toast.error(result.error);
    return;
  }

  Toast.success("✅ Match supprimé + ELO restauré");
  await loadMatches();
}

// expose pour les onclick inline générés dynamiquement
window.deleteMatch = handleDeleteMatch;
window.saveMatch = handleSaveMatch;

// =========================
// 📜 HISTORIQUE DES MATCHS
// =========================

function renderEloInfo(m) {
  if (!m.eloChange) return "";

  return `
    <div style="
      display:grid;
      grid-template-columns: 1fr auto;
      font-size:12px;
      margin-top:6px;
      padding:0 6px;
      font-weight:bold;
      row-gap:4px;
    ">
      <div style="color:#3b82f6;">🔵 ${m.b1}-${m.b2}</div>
      <div style="color:#3b82f6; text-align:right;">${m.sb}</div>
      <div style="color:#3b82f6;">
        ${m.eloChange.b1 > 0 ? "+" : ""}${m.eloChange.b1}
        &nbsp;&nbsp;
        ${m.eloChange.b2 > 0 ? "+" : ""}${m.eloChange.b2}
      </div>
      <div></div>
      <div style="color:#ef4444; margin-top:6px;">🔴 ${m.r1}-${m.r2}</div>
      <div style="color:#ef4444; text-align:right; margin-top:6px;">${m.sr}</div>
      <div style="color:#ef4444;">
        ${m.eloChange.r1 > 0 ? "+" : ""}${m.eloChange.r1}
        &nbsp;&nbsp;
        ${m.eloChange.r2 > 0 ? "+" : ""}${m.eloChange.r2}
      </div>
      <div></div>
    </div>
  `;
}

function renderMatchCard(m, isAdminUser) {
  const li = document.createElement("li");
  li.classList.add("match-card");
  li.style.minWidth = "260px";
  li.style.maxWidth = "260px";

  const date = formatMatchDate(m);

  li.innerHTML = `
    <div class="match-row team-blue">
      <span>🔵 ${m.b1}-${m.b2}</span>
      <span class="score">${m.sb} ${m.blueWin ? "🏆" : ""}</span>
    </div>

    <div class="match-row team-red">
      <span>🔴 ${m.r1}-${m.r2}</span>
      <span class="score">${m.sr} ${!m.blueWin ? "🏆" : ""}</span>
    </div>

    ${renderEloInfo(m)}

    <div class="date">📅 ${date}</div>

    ${
      isAdminUser
        ? `
      <button
        onclick="deleteMatch('${m.id}')"
        style="
          margin-top:10px;
          background:#dc2626;
          color:white;
          border:none;
          padding:8px 12px;
          border-radius:8px;
          cursor:pointer;
          width:100%;
          font-weight:bold;
        "
      >
        🗑 Supprimer
      </button>
    `
        : ""
    }
  `;

  return li;
}

/**
 * Charge et affiche l'historique des matchs pour le joueur sélectionné
 * dans #historyPlayerFilter, filtré par #historyResultFilter.
 */
export async function loadMatches() {
  const list = document.getElementById("matchHistory");
  if (!list) return;

  list.innerHTML = "";

  const selectedPlayer =
    document.getElementById("historyPlayerFilter")?.value?.toLowerCase() || "";

  if (!selectedPlayer) {
    list.innerHTML = `
      <div style="padding:20px; text-align:center; color:#64748b; font-weight:bold;">
        👤 Sélectionne un joueur pour afficher les matchs
      </div>
    `;
    return;
  }

  const resultFilter = document.getElementById("historyResultFilter")?.value || "";

  const matches = await getAllMatches();
  const filtered = filterMatchesForPlayer(matches, selectedPlayer, resultFilter);

  filtered.forEach((m) => {
    list.appendChild(renderMatchCard(m, isAdmin()));
  });
}

// =========================
// 📜 FILTRE JOUEUR (historique)
// =========================

export async function loadPlayersFilter() {
  const select = document.getElementById("historyPlayerFilter");
  if (!select) return;

  select.innerHTML = "<option value=''>-- Choisir joueur --</option>";

  const players = await getActivePlayers();

  players.forEach((p) => {
    if (!p.name) return;

    const option = document.createElement("option");
    option.value = p.name;
    option.textContent = p.name;
    select.appendChild(option);
  });

  select.onchange = function () {
    const trendSelect = document.getElementById("trendPlayerFilter");
    if (trendSelect) trendSelect.value = this.value;

    import("./trend.page.js").then(({ loadPlayerEloTrend }) => {
      loadPlayerEloTrend();
    });
  };
}
