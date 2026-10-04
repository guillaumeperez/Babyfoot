// =========================
// 🏆 RANKING PAGE
// =========================
// Affiche le classement et le podium.
// La logique métier reste dans les services/repositories.
// Exception : calcul de l'affichage spécial de Mumu dans la colonne Forme.

import { getActivePlayers } from "../../repositories/players.repository.js";
import { getAllMatches } from "../../repositories/matches.repository.js";

import {
  calculateOffense,
  calculateDefense,
  formatStatsNumber,
} from "../../services/player-stats.service.js";

let isRankingLoading = false;
let lastRankingCall = 0;

const MEDALS = ["🥇", "🥈", "🥉"];

// =========================
// 😊 EMOJIS SPÉCIAUX DE MUMU
// =========================

function getMumuFormEmoji(scoreFor, scoreAgainst) {
  if (scoreFor === 10) {
    switch (scoreAgainst) {
      case 9:
        return "😎";
      case 8:
        return "💪";
      case 7:
        return "🔥";
      case 6:
        return "🚀";
      case 5:
        return "👑";
      case 4:
        return "⚡";
      case 3:
        return "🏆";
      case 2:
        return "🚀";
      case 1:
        return "👑";
      case 0:
        return "🚀🔥";
      default:
        return "";
    }
  }

  if (scoreAgainst === 10) {
    switch (scoreFor) {
      case 9:
        return "🫡";
      case 8:
        return "🥲";
      case 7:
        return "💪";
      case 6:
        return "🌱";
      case 5:
        return "🔄";
      case 4:
        return "😅";
      case 3:
        return "🫠";
      case 2:
        return "😂";
      case 1:
        return "💀";
      case 0:
        return "🪦";
      default:
        return "";
    }
  }

  return "";
}

// =========================
// ⚽ FORME SPÉCIALE DE MUMU
// =========================

function getMumuForm(matches, player) {
  const playerName = String(player.name || "")
    .trim()
    .toLowerCase();

  if (playerName !== "mumu") {
    return null;
  }

  const mumuMatches = matches
    .filter((match) => {
      if (!match) return false;

      const b1 = String(match.b1 || "")
        .trim()
        .toLowerCase();
      const b2 = String(match.b2 || "")
        .trim()
        .toLowerCase();
      const r1 = String(match.r1 || "")
        .trim()
        .toLowerCase();
      const r2 = String(match.r2 || "")
        .trim()
        .toLowerCase();

      return (
        b1 === playerName ||
        b2 === playerName ||
        r1 === playerName ||
        r2 === playerName
      );
    })
    .filter((match) => {
      const sb = Number(match.sb);
      const sr = Number(match.sr);

      return Number.isFinite(sb) && Number.isFinite(sr);
    })
    .sort((a, b) => {
      const dateA =
        Number(a.createdAtLocal) ||
        (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);

      const dateB =
        Number(b.createdAtLocal) ||
        (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);

      return dateA - dateB;
    })
    .slice(-5);

  return mumuMatches
    .map((match) => {
      const b1 = String(match.b1 || "")
        .trim()
        .toLowerCase();
      const b2 = String(match.b2 || "")
        .trim()
        .toLowerCase();
      const r1 = String(match.r1 || "")
        .trim()
        .toLowerCase();
      const r2 = String(match.r2 || "")
        .trim()
        .toLowerCase();

      const sb = Number(match.sb);
      const sr = Number(match.sr);

      const isBlue = b1 === playerName || b2 === playerName;
      const isRed = r1 === playerName || r2 === playerName;

      if (isBlue) {
        return getMumuFormEmoji(sb, sr);
      }

      if (isRed) {
        return getMumuFormEmoji(sr, sb);
      }

      return "";
    })
    .filter(Boolean)
    .join("");
}

// =========================
// 🏆 PODIUM
// =========================

function renderPodium(top3, podiumEl) {
  podiumEl.innerHTML = "";

  top3.forEach((p, i) => {
    const div = document.createElement("div");
    div.classList.add("podium-box");

    if (i === 0) div.classList.add("podium-1");
    if (i === 1) div.classList.add("podium-2");
    if (i === 2) div.classList.add("podium-3");

    div.innerHTML = `
      <div style="font-size:24px">${MEDALS[i]}</div>
      <span>${p.name}</span>
      <span>${p.elo}</span>
    `;

    podiumEl.appendChild(div);
  });
}

// =========================
// 📋 TABLEAU CLASSEMENT
// =========================

function renderRankingTable(players, tbodyEl, matches) {
  tbodyEl.innerHTML = "";

  players.forEach((p, i) => {
    const diff = p.lastDiff || 0;
    const diffText = diff > 0 ? "+" + diff : diff;

    let color = "white";

    if (diff > 0) color = "#22c55e";
    if (diff < 0) color = "#ef4444";

    // Pour tous les joueurs : fonctionnement actuel.
    let form = (p.history || []).join("");

    // Exception : Mumu utilise les emojis calculés à partir
    // de ses 5 derniers vrais scores.
    const mumuForm = getMumuForm(matches, p);

    if (mumuForm !== null) {
      form = mumuForm;
    }

    const statsMatches = Number(p.statsMatches) || 0;

    const offense = formatStatsNumber(
      calculateOffense(Number(p.offense) || 0, statsMatches),
    );

    const defense = formatStatsNumber(
      calculateDefense(Number(p.defense) || 0, statsMatches),
    );

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="ranking-rank">${i + 1}</td>
      <td class="ranking-player">${p.name}</td>
      <td class="ranking-wins">${p.wins}</td>
      <td class="ranking-losses">${p.losses}</td>
      <td class="ranking-elo"><b>${p.elo}</b></td>
      <td class="ranking-diff" style="color:${color}; font-weight:bold;">${diffText}</td>
      <td class="ranking-offense">${offense}</td>
      <td class="ranking-defense">${defense}</td>
      <td class="ranking-form-cell">${form}</td>
    `;

    tbodyEl.appendChild(tr);
  });
}

// =========================
// 📊 CHARGEMENT DU CLASSEMENT
// =========================

/**
 * Charge les joueurs actifs et affiche podium + tableau de classement.
 * Anti-rebond intégré (200ms) pour éviter les appels en rafale.
 */
export async function loadRanking() {
  if (isRankingLoading) return;

  const now = Date.now();

  if (now - lastRankingCall < 200) return;

  lastRankingCall = now;
  isRankingLoading = true;

  try {
    const tbody = document.getElementById("rankingList");
    const podium = document.getElementById("podium");

    if (!tbody || !podium) return;

    tbody.innerHTML = "";
    podium.innerHTML = "";

    const players = await getActivePlayers();

    // Lecture uniquement.
    // Aucun match n'est modifié.
    const matches = await getAllMatches();

    players.forEach((p) => {
      p.elo = p.elo || 2000;
      p.wins = p.wins || 0;
      p.losses = p.losses || 0;
      p.lastDiff = p.lastDiff || 0;
      p.history = p.history || [];
    });

    if (players.length === 0) {
      tbody.innerHTML = "<tr><td colspan='9'>Aucun joueur</td></tr>";

      return;
    }

    players.sort((a, b) => b.elo - a.elo);

    renderPodium(players.slice(0, 3), podium);
    renderRankingTable(players, tbody, matches);
  } finally {
    isRankingLoading = false;
  }
}
