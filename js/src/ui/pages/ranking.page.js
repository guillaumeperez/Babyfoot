// =========================
// 🏆 RANKING PAGE
// =========================
// Affiche le classement et le podium. Reçoit des données déjà prêtes
// depuis le repository, ne fait que les afficher.

import { getActivePlayers } from "../../repositories/players.repository.js";

let isRankingLoading = false;
let lastRankingCall = 0;

const MEDALS = ["🥇", "🥈", "🥉"];

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

function renderRankingTable(players, tbodyEl) {
  tbodyEl.innerHTML = "";

  players.forEach((p, i) => {
    const diff = p.lastDiff || 0;
    const diffText = diff > 0 ? "+" + diff : diff;

    let color = "white";
    if (diff > 0) color = "#22c55e";
    if (diff < 0) color = "#ef4444";

    const form = (p.history || []).join("");

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td>${p.wins}</td>
      <td>${p.losses}</td>
      <td><b>${p.elo}</b></td>
      <td style="color:${color}; font-weight:bold;">${diffText}</td>
      <td>${form}</td>
    `;

    tbodyEl.appendChild(tr);
  });
}

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

    players.forEach((p) => {
      p.elo = p.elo || 2000;
      p.wins = p.wins || 0;
      p.losses = p.losses || 0;
      p.lastDiff = p.lastDiff || 0;
      p.history = p.history || [];
    });

    if (players.length === 0) {
      tbody.innerHTML = "<tr><td colspan='7'>Aucun joueur</td></tr>";
      return;
    }

    players.sort((a, b) => b.elo - a.elo);

    renderPodium(players.slice(0, 3), podium);
    renderRankingTable(players, tbody);
  } finally {
    isRankingLoading = false;
  }
}
