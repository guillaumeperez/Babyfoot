// =========================
// 📈 TREND PAGE
// =========================
// Graphique de tendance ELO pour un ou deux joueurs, basé sur l'historique des matchs.

import { getAllMatches } from "../../repositories/matches.repository.js";
import { getAllPlayers } from "../../repositories/players.repository.js";

let eloChartInstance = null;

// =========================
// 🔥 SELECT JOUEURS (tendance)
// =========================

export async function loadPlayersTrendFilter() {
  const select1 = document.getElementById("trendPlayerFilter");
  const select2 = document.getElementById("trendPlayerFilter2");

  if (!select1 || !select2) return;

  select1.innerHTML = "<option value=''>-- Joueur 1 --</option>";
  select2.innerHTML = "<option value=''>-- Joueur 2 (optionnel) --</option>";

  const players = await getAllPlayers();

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

// =========================
// 🔥 GRAPHIQUE DE TENDANCE
// =========================

function extractPlayerEloHistory(matches, playerNameLower) {
  const history = [];
  const labels = [];
  let step = 0;

  matches.forEach((m) => {
    if (!m.eloAfter) return;

    const players = {
      b1: m.b1?.toLowerCase(),
      b2: m.b2?.toLowerCase(),
      r1: m.r1?.toLowerCase(),
      r2: m.r2?.toLowerCase(),
    };

    let changed = false;

    if (players.b1 === playerNameLower) {
      history.push(m.eloAfter.b1);
      changed = true;
    } else if (players.b2 === playerNameLower) {
      history.push(m.eloAfter.b2);
      changed = true;
    } else if (players.r1 === playerNameLower) {
      history.push(m.eloAfter.r1);
      changed = true;
    } else if (players.r2 === playerNameLower) {
      history.push(m.eloAfter.r2);
      changed = true;
    }

    if (changed) {
      step++;
      labels.push(`M${step}`);
    }
  });

  return { history, labels };
}

/**
 * Charge l'historique ELO d'un ou deux joueurs (sélectionnés dans
 * #trendPlayerFilter / #trendPlayerFilter2) et affiche le graphique #eloChart.
 */
export async function loadPlayerEloTrend() {
  const p1 = document.getElementById("trendPlayerFilter")?.value?.toLowerCase();
  const p2 = document.getElementById("trendPlayerFilter2")?.value?.toLowerCase();

  if (!p1 && !p2) return;

  // Les matchs doivent être triés par date croissante pour une courbe lisible
  const allMatches = await getAllMatches();
  const matches = [...allMatches].reverse(); // getAllMatches() est desc -> on inverse

  const result1 = p1 ? extractPlayerEloHistory(matches, p1) : { history: [], labels: [] };
  const result2 = p2 ? extractPlayerEloHistory(matches, p2) : { history: [], labels: [] };

  // On prend les labels du jeu de données le plus complet pour l'axe X
  const labels = result1.labels.length >= result2.labels.length ? result1.labels : result2.labels;

  const ctx = document.getElementById("eloChart")?.getContext("2d");
  if (!ctx) return;

  if (eloChartInstance) {
    eloChartInstance.destroy();
  }

  const datasets = [];

  if (p1) {
    datasets.push({
      label: p1,
      data: result1.history,
      borderColor: "#3b82f6",
      backgroundColor: "rgba(59,130,246,0.12)",
      borderWidth: 3,
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: true,
    });
  }

  if (p2) {
    datasets.push({
      label: p2,
      data: result2.history,
      borderColor: "#ef4444",
      backgroundColor: "rgba(239,68,68,0.12)",
      borderWidth: 3,
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: true,
    });
  }

  eloChartInstance = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (context) => `ELO : ${context.parsed.y}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: { callback: (value) => value },
        },
      },
    },
  });
}
