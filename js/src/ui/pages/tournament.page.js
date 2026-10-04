// =========================
// 🏆 TOURNAMENT PAGE
// =========================
// Liste des tournois, création, affichage des matchs et du classement de tournoi.

import {
  getAllTournaments,
  getTournamentTeams,
  getTournamentMatches,
  getTournamentMatchById,
} from "../../repositories/tournaments.repository.js";

import {
  generateTeams,
  generateMatches,
  buildTournamentConfig,
  validateManualTeams,
  sortTeamsByRanking,
  applyTournamentMatchResult,
  validateTournamentMatchScore,
  checkTournamentFinished,
  classifyTournament,
  deleteTournamentWithCleanup,
} from "../../services/tournament.service.js";

import { createTournament as createTournamentDoc, updateTournamentMatch } from "../../repositories/tournaments.repository.js";
import { getActivePlayers } from "../../repositories/players.repository.js";

import { Toast } from "../components/toast.js";
import { confirmAction } from "../components/confirm.js";
import { openModal } from "../components/modal.js";
import { setCurrentTournamentId, getCurrentTournamentId, isAdmin } from "../../core/state.js";

// =========================
// 📂 ONGLET TOURNOI
// =========================

export function openTournamentTab(tab) {
  document.querySelectorAll(".tournament-tab").forEach((el) => {
    el.style.display = "none";
  });

  document.getElementById(`tournament-${tab}`).style.display = "block";

  const menu = document.querySelector(".tournament-menu");
  if (menu) {
    menu.style.display = tab === "create" ? "none" : "block";
  }
}

window.openTournamentTab = openTournamentTab;

async function openTournamentWithTab(tournamentId, tab) {
  setCurrentTournamentId(tournamentId);
  openModal("tournament");

  const menu = document.querySelector(".tournament-menu");
  if (menu) menu.style.display = "block";

  openTournamentTab(tab);
  await loadTournamentMatches(tournamentId);
  await loadTournamentRanking(tournamentId);
}

export async function openTournament(tournamentId) {
  await openTournamentWithTab(tournamentId, "matches");
}

export async function openTournamentMatches(tournamentId) {
  await openTournamentWithTab(tournamentId, "matches");
}

export async function openTournamentRankingView(tournamentId) {
  await openTournamentWithTab(tournamentId, "ranking");
}

window.openTournament = openTournament;
window.openTournamentMatches = openTournamentMatches;
window.openTournamentRankingView = openTournamentRankingView;

// =========================
// 🎛️ MODE D'ÉQUIPE (UI)
// =========================

let manualTeamCount = 0;

export function updateTeamModeUI() {
  const teamMode = document.getElementById("teamMode").value;
  const manualSection = document.getElementById("manualTeamSection");

  if (teamMode === "manual") {
    manualSection.style.display = "block";
    manualTeamCount = 0;
    document.getElementById("manualTeamContainer").innerHTML = "";

    addManualTeam();
    addManualTeam();

    loadPlayersSelectForTournament();
  } else {
    manualSection.style.display = "none";
  }
}

window.updateTeamModeUI = updateTeamModeUI;

// =========================
// ➕ / ➖ ÉQUIPES MANUELLES
// =========================

export function addManualTeam() {
  manualTeamCount++;
  const teamId = manualTeamCount;

  const container = document.getElementById("manualTeamContainer");

  const teamDiv = document.createElement("div");
  teamDiv.id = `team-${teamId}`;
  teamDiv.style.marginBottom = "20px";
  teamDiv.style.padding = "15px";
  teamDiv.style.border = "1px solid #cbd5e1";
  teamDiv.style.borderRadius = "8px";
  teamDiv.style.backgroundColor = "rgba(255,255,255,0.5)";

  let removeBtn = "";
  if (manualTeamCount > 2) {
    removeBtn = `<button type="button" onclick="removeManualTeam(${teamId})" class="btn-danger" style="margin-top: 10px; width: 100%; max-width: 150px;">Supprimer</button>`;
  }

  teamDiv.innerHTML = `
    <h5 style="margin-top: 0; color: #1e293b;">⚽ Équipe ${teamId}</h5>

    <label style="display: block; margin-bottom: 5px;">Nom personnalisé</label>
    <input id="teamName-${teamId}" type="text" placeholder="Ex: Les Invincibles">

    <label style="display: block; margin-top: 10px; margin-bottom: 5px;">Joueur 1</label>
    <select id="teamPlayer1-${teamId}"></select>

    <label style="display: block; margin-top: 10px; margin-bottom: 5px;">Joueur 2</label>
    <select id="teamPlayer2-${teamId}"></select>

    ${removeBtn}
  `;

  container.appendChild(teamDiv);

  loadPlayersForTeam(teamId);
}

export function removeManualTeam(teamId) {
  const teamDiv = document.getElementById(`team-${teamId}`);
  if (teamDiv) teamDiv.remove();
}

window.addManualTeam = addManualTeam;
window.removeManualTeam = removeManualTeam;

async function loadPlayersForTeam(teamId) {
  const players = await getActivePlayers();

  const select1 = document.getElementById(`teamPlayer1-${teamId}`);
  const select2 = document.getElementById(`teamPlayer2-${teamId}`);

  if (!select1 || !select2) return;

  select1.innerHTML = "<option value=''>-- choisir --</option>";
  select2.innerHTML = "<option value=''>-- choisir --</option>";

  players.forEach((p) => {
    const option1 = document.createElement("option");
    option1.value = p.name;
    option1.textContent = p.name;

    const option2 = document.createElement("option");
    option2.value = p.name;
    option2.textContent = p.name;

    select1.appendChild(option1);
    select2.appendChild(option2);
  });
}

async function loadPlayersSelectForTournament() {
  // recharge tous les selects d'équipe déjà créés
  const teamDivs = document.querySelectorAll("#manualTeamContainer > div");
  for (const teamDiv of teamDivs) {
    const id = teamDiv.id.replace("team-", "");
    await loadPlayersForTeam(id);
  }
}

// =========================
// 🏗️ CRÉATION D'UN TOURNOI
// =========================

export async function createTournament() {
  try {
    const config = buildTournamentConfig({
      name: document.getElementById("tournamentName")?.value?.trim(),
      mode: document.getElementById("tournamentMode")?.value,
      doubleRound: document.getElementById("doubleRound")?.checked,
      winPoints: document.getElementById("winPoints")?.value,
      lossPoints: document.getElementById("lossPoints")?.value,
      offBonus: document.getElementById("offBonus")?.value,
      defBonus: document.getElementById("defBonus")?.value,
    });

    if (!config.name) {
      Toast.error("Nom du tournoi obligatoire");
      return;
    }

    const tournamentRef = await createTournamentDoc(config);

    let manualTeamsData = null;

    if (config.mode === "manual") {
      manualTeamsData = [];
      const teamDivs = document.querySelectorAll("#manualTeamContainer > div");

      teamDivs.forEach((teamDiv, index) => {
        const realId = teamDiv.id.replace("team-", "");

        const nameInput = document.getElementById(`teamName-${realId}`);
        const player1Select = document.getElementById(`teamPlayer1-${realId}`);
        const player2Select = document.getElementById(`teamPlayer2-${realId}`);

        manualTeamsData.push({
          teamName: nameInput?.value?.trim() || `Équipe ${index + 1}`,
          player1: player1Select?.value,
          player2: player2Select?.value,
        });
      });

      validateManualTeams(manualTeamsData);
    }

    await generateTeams(tournamentRef.id, config.mode, manualTeamsData);
    await generateMatches(tournamentRef.id, config.doubleRound);

    setCurrentTournamentId(tournamentRef.id);

    await loadTournamentMatches(tournamentRef.id);
    await loadTournamentRanking(tournamentRef.id);
    await loadTournaments();

    Toast.success("🏆 Tournoi créé avec succès");

    const input = document.getElementById("tournamentName");
    if (input) input.value = "";
  } catch (e) {
    console.error("createTournament error:", e);
    Toast.error("Erreur création tournoi");
  }
}

window.createTournament = createTournament;

// =========================
// 📋 LISTE DES TOURNOIS
// =========================

function renderTournamentCard(t, id) {
  const card = document.createElement("div");
  card.classList.add("match-card");

  const category = classifyTournament(t);

  if (category === "history") {
    const winnerText = t.winnerName ? `Victoire : ${t.winnerName}` : "Victoire : voir classement";
    card.innerHTML = `<h4>🏆 ${t.name}</h4><p>${winnerText}</p>`;
    return { card, category };
  }

  const modeText = t.mode === "elo" ? "⚖️ Mode ELO" : "🔀 Mode aléatoire";
  const roundText = t.doubleRound ? "🔁 Aller / retour" : "➡️ Match simple";

  card.innerHTML = `
    <h4>🏆 ${t.name}</h4>
    <p>${modeText}</p>
    <p>${roundText}</p>
    <div class="tournament-actions">
      <button class="btn-add" onclick="openTournamentMatches('${id}')">Match à jouer</button>
      <button class="btn-add" onclick="openTournamentRankingView('${id}')">Classement</button>
    </div>
  `;

  return { card, category };
}

export async function loadTournaments() {
  const activeContainer = document.getElementById("activeTournaments");
  const recentContainer = document.getElementById("recentTournaments");
  const historyContainer = document.getElementById("finishedTournaments");

  [activeContainer, recentContainer, historyContainer].forEach((c) => {
    if (c) c.innerHTML = "";
  });

  const tournaments = await getAllTournaments();

  if (tournaments.length === 0) {
    if (activeContainer) activeContainer.innerHTML = "<p>Aucun tournoi en cours</p>";
    if (recentContainer) recentContainer.innerHTML = "<p>Aucun podium récent</p>";
    if (historyContainer) historyContainer.innerHTML = "<p>Aucun tournoi</p>";
    return;
  }

  tournaments.forEach((t) => {
    const { card, category } = renderTournamentCard(t, t.id);

    const target =
      category === "active" ? activeContainer :
      category === "recent" ? recentContainer :
      historyContainer;

    if (target) target.appendChild(card);
  });

  if (activeContainer && !activeContainer.childNodes.length) {
    activeContainer.innerHTML = "<p>Aucun tournoi en cours</p>";
  }
  if (recentContainer && !recentContainer.childNodes.length) {
    recentContainer.innerHTML = "<p>Aucun podium récent</p>";
  }
  if (historyContainer && !historyContainer.childNodes.length) {
    historyContainer.innerHTML = "<p>Aucun tournoi</p>";
  }
}

// =========================
// ⚔️ MATCHS DE TOURNOI
// =========================

function renderTournamentMatchCard(docId, match, tournamentId) {
  const div = document.createElement("div");
  div.classList.add("match-card");

  const blue = match.blueTeam
    ? match.blueTeam.teamName || `${match.blueTeam.player1}/${match.blueTeam.player2}`
    : match.blueTeamName;

  const red = match.redTeam
    ? match.redTeam.teamName || `${match.redTeam.player1}/${match.redTeam.player2}`
    : match.redTeamName;

  const bluePlayers = match.blueTeam ? `${match.blueTeam.player1} / ${match.blueTeam.player2}` : "";
  const redPlayers = match.redTeam ? `${match.redTeam.player1} / ${match.redTeam.player2}` : "";

  div.innerHTML = `
    <div class="match-row team-blue">
      <div>🔵 <strong>${blue}</strong><br/><small style="color: #666;">${bluePlayers}</small></div>
    </div>

    <div class="match-row team-red">
      <div>🔴 <strong>${red}</strong><br/><small style="color: #666;">${redPlayers}</small></div>
    </div>

    <div class="score-box">
      <div class="score-blue">
        <input type="number" id="sb-${docId}" placeholder="Bleu" min="0" max="10">
      </div>
      <div class="score-red">
        <input type="number" id="sr-${docId}" placeholder="Rouge" min="0" max="10">
      </div>
    </div>

    <button id="save-btn-${docId}" class="save-score-btn" onclick="saveTournamentMatch('${tournamentId}', '${docId}')">
      Enregistrer
    </button>
  `;

  return div;
}

export async function loadTournamentMatches(tournamentId) {
  const container = document.getElementById("tournamentMatches");
  if (!container) return;

  container.innerHTML = "";

  const matches = await getTournamentMatches(tournamentId);
  const unplayed = matches.filter((m) => !m.played);

  if (unplayed.length === 0) {
    container.innerHTML = "<p>Aucun match</p>";
    return;
  }

  unplayed.forEach((match) => {
    container.appendChild(renderTournamentMatchCard(match.id, match, tournamentId));
  });
}

// =========================
// 💾 SAUVEGARDE D'UN SCORE DE TOURNOI
// =========================

export async function saveTournamentMatch(tournamentId, matchId) {
  const button = document.getElementById(`save-btn-${matchId}`);
  if (!button) return;

  const resetButton = () => {
    button.disabled = false;
    button.textContent = "Enregistrer";
    button.style.opacity = "1";
    button.style.cursor = "pointer";
    button.style.background = "";
  };

  const lockButton = () => {
    button.disabled = true;
    button.textContent = "Enregistrement...";
    button.style.opacity = "0.6";
    button.style.cursor = "not-allowed";
  };

  const getScore = (id) => parseInt(document.getElementById(id)?.value);

  if (button.disabled) return;

  lockButton();

  const sb = getScore(`sb-${matchId}`);
  const sr = getScore(`sr-${matchId}`);

  try {
    const check = validateTournamentMatchScore(sb, sr);
    if (!check.valid) {
      Toast.error(check.error);
      return;
    }

    const match = await getTournamentMatchById(tournamentId, matchId);

    if (match?.played) {
      button.textContent = "✅ Déjà enregistré";
      button.style.background = "#16a34a";
      return;
    }

    await updateTournamentMatch(tournamentId, matchId, {
      sb,
      sr,
      played: true,
      type: "tournament",
    });

    await applyTournamentMatchResult(tournamentId, { ...match, sb, sr });
    await loadTournamentRanking(tournamentId);
    await checkAndAnnounceTournamentFinished(tournamentId);

    await loadTournamentMatches(tournamentId);

    Toast.success("✅ Score enregistré");
  } catch (err) {
    console.error("saveTournamentMatch error:", err);
    Toast.error("Erreur enregistrement");
  } finally {
    resetButton();
  }
}

window.saveTournamentMatch = saveTournamentMatch;

async function checkAndAnnounceTournamentFinished(tournamentId) {
  const result = await checkTournamentFinished(tournamentId);

  if (result.finished) {
    Toast.success(`🏆 Tournoi terminé !${result.winnerName ? ` Podium : ${result.winnerName}` : ""}`);
    await loadTournamentRanking(tournamentId);
  }
}

// =========================
// 📊 CLASSEMENT DE TOURNOI
// =========================

export async function loadTournamentRanking(tournamentId) {
  const tbody = document.getElementById("tournamentRanking");
  if (!tbody) return;

  tbody.innerHTML = "";

  const teams = await getTournamentTeams(tournamentId);
  const sorted = sortTeamsByRanking(teams);

  const winnerBox = document.getElementById("tournamentWinner");

  if (winnerBox && sorted.length > 0) {
    const winner = sorted[0];

    winnerBox.innerHTML = `
      <div class="winner-card">
        🏆 Champion du tournoi
        <h2>${winner.teamName || `${winner.player1} / ${winner.player2}`}</h2>
        <p style="font-size: 13px;">${winner.player1} / ${winner.player2}</p>
        <p>${winner.points} pts</p>
      </div>
    `;
  }

  sorted.forEach((team, index) => {
    const tr = document.createElement("tr");
    const diff = team.goalsFor - team.goalsAgainst;

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <strong>${team.teamName || "Équipe"}</strong><br/>
        <small style="color: #666;">${team.player1} / ${team.player2}</small>
      </td>
      <td>${team.points}</td>
      <td>${team.wins}</td>
      <td>${team.losses}</td>
      <td>${team.goalsFor}</td>
      <td>${team.goalsAgainst}</td>
      <td>${diff > 0 ? "+" : ""}${diff}</td>
    `;

    tbody.appendChild(tr);
  });
}

// =========================
// 🗑️ SUPPRESSION D'UN TOURNOI
// =========================

export async function deleteTournament(tournamentId) {
  if (!isAdmin()) {
    Toast.error("❌ Admin requis");
    return;
  }

  if (!confirmAction("Supprimer ce tournoi ?\n⚠️ Les matchs et équipes seront aussi supprimés")) return;

  try {
    await deleteTournamentWithCleanup(tournamentId);
    Toast.success("✅ Tournoi supprimé\n💾 ELO en backup pour annulation");
    await loadTournaments();
  } catch (e) {
    console.error(e);
    Toast.error("❌ Erreur suppression");
  }
}

window.deleteTournament = deleteTournament;
