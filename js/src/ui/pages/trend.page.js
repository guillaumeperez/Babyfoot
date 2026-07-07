// =========================
// 📈 TREND PAGE
// =========================
import { getAllMatches } from "../../repositories/matches.repository.js";
import { getAllPlayers } from "../../repositories/players.repository.js";
import { APP_CONFIG } from "../../config/app.config.js";

let eloChartInstance = null;

export async function loadPlayersTrendFilter() {
  const select1 = document.getElementById("trendPlayerFilter");
  const select2 = document.getElementById("trendPlayerFilter2");
  if (!select1 || !select2) return;

  select1.innerHTML = "<option value=''>-- Joueur 1 --</option>";
  select2.innerHTML = "<option value=''>-- Joueur 2 (optionnel) --</option>";

  const players = await getAllPlayers();
  players.forEach((p) => {
    [select1, select2].forEach((sel) => {
      const opt = document.createElement("option");
      opt.value = p.name;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
  });
}

// =========================
// 🔍 EXTRACTION HISTORIQUE
// =========================
function extractPlayerEloHistory(matches, playerNameLower) {
  const history = [];
  const labels = [];
  let step = 0;
  let startAdded = false;

  for (const m of matches) {
    if (!m.eloBefore || !m.eloAfter) continue;

    const posMap = {
      b1: m.b1?.toLowerCase(),
      b2: m.b2?.toLowerCase(),
      r1: m.r1?.toLowerCase(),
      r2: m.r2?.toLowerCase(),
    };

    const pos = Object.keys(posMap).find(
      (key) => posMap[key] === playerNameLower,
    );

    if (!pos) continue;

    const eloBefore = m.eloBefore[pos];
    const eloAfter = m.eloAfter[pos];

    console.log(
      `Match ${step + 1}`,
      "Position :",
      pos,
      "Avant :",
      eloBefore,
      "Après :",
      eloAfter,
    );

    if (eloBefore == null || eloAfter == null) continue;

    if (!startAdded) {
      history.push(eloBefore);
      labels.push("Départ");
      startAdded = true;
    }

    step++;
    history.push(eloAfter);
    labels.push(`M${step}`);
  }

  return { history, labels };
}

// =========================
// 📈 CHARGEMENT DU GRAPHIQUE
// =========================
export async function loadPlayerEloTrend() {
  const p1 = document
    .getElementById("trendPlayerFilter")
    ?.value?.trim()
    .toLowerCase();
  const p2 = document
    .getElementById("trendPlayerFilter2")
    ?.value?.trim()
    .toLowerCase();

  if (!p1 && !p2) return;

  // =========================
  // 📅 CHARGEMENT DES MATCHS
  // =========================
  // On trie toujours par date réelle : ancien → récent
  const allMatches = await getAllMatches();

  const matches = [...allMatches].sort((a, b) => {
    const getTime = (m) => {
      if (m.createdAt?.toMillis) return m.createdAt.toMillis();
      if (m.createdAt?.seconds) return m.createdAt.seconds * 1000;
      if (m.createdAtLocal) return m.createdAtLocal;
      return 0;
    };

    return getTime(a) - getTime(b);
  });

  const result1 = p1
    ? extractPlayerEloHistory(matches, p1)
    : { history: [], labels: [] };

  const result2 = p2
    ? extractPlayerEloHistory(matches, p2)
    : { history: [], labels: [] };

  const labels =
    result1.labels.length >= result2.labels.length
      ? result1.labels
      : result2.labels;

  const ctx = document.getElementById("eloChart")?.getContext("2d");
  if (!ctx) return;

  if (eloChartInstance) eloChartInstance.destroy();

  const datasets = [];

  if (p1 && result1.history.length > 0) {
    datasets.push({
      label: document.getElementById("trendPlayerFilter")?.value, // nom original
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

  if (p2 && result2.history.length > 0) {
    datasets.push({
      label: document.getElementById("trendPlayerFilter2")?.value,
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
            // Affiche eloBefore → eloAfter pour chaque point
            label: (context) => {
              const idx = context.dataIndex;
              const val = context.parsed.y;
              const prev = context.dataset.data[idx - 1];
              if (idx === 0 || prev == null) return `ELO départ : ${val}`;
              const diff = val - prev;
              const sign = diff >= 0 ? "+" : "";
              return `ELO : ${val} (${sign}${diff})`;
            },
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
