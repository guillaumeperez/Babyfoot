// =========================
// 📦 ARCHIVE PAGE
// =========================
// Liste des archives, affichage d'une archive, comparaison entre deux archives.

import { getAllArchives, getArchiveById } from "../../repositories/archives.repository.js";
import { buildArchiveOptions, compareArchives as compareArchivesService } from "../../services/archive.service.js";

let archiveChart = null;
let seasonChart = null;

// =========================
// 🪟 OUVERTURE / FERMETURE MODAL
// =========================

export async function openArchiveModal() {
  const modal = document.getElementById("archiveModal");
  if (!modal) return;

  modal.style.display = "flex";

  const select = document.getElementById("archiveSelect");
  if (select) select.value = "";

  try {
    await loadArchiveList();
  } catch (e) {
    console.error("loadArchiveList error:", e);
  }
}

export function closeArchiveModal() {
  const modal = document.getElementById("archiveModal");
  if (modal) modal.style.display = "none";
}

window.openArchiveModal = openArchiveModal;
window.closeArchiveModal = closeArchiveModal;

// =========================
// 📈 GRAPHIQUE D'UNE ARCHIVE
// =========================

function renderArchiveChart(ranking) {
  const canvas = document.getElementById("archiveChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const labels = ranking.map((p) => p.name);
  const data = ranking.map((p) => p.elo || 0);

  if (archiveChart) archiveChart.destroy();

  const min = Math.min(...data);
  const max = Math.max(...data);
  const padding = 30;

  archiveChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "ELO", data, backgroundColor: "#3b82f6" }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { bottom: 40 } },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 90,
            minRotation: 90,
            font: { size: 10 },
          },
        },
        y: { min: min - padding, max: max + padding },
      },
    },
  });
}

// =========================
// 📂 LISTE DES ARCHIVES
// =========================

export async function loadArchiveList() {
  const selects = [
    document.getElementById("archiveSelect"),
    document.getElementById("archiveA"),
    document.getElementById("archiveB"),
  ];

  selects.forEach((select) => {
    if (select) {
      select.innerHTML = `<option value="">-- Choisir une archive --</option>`;
    }
  });

  const archives = await getAllArchives();
  const options = buildArchiveOptions(archives);

  options.forEach((archive) => {
    selects.forEach((select) => {
      if (!select) return;

      const option = document.createElement("option");
      option.value = archive.id;
      option.textContent = `📅 ${archive.date}`;
      select.appendChild(option);
    });
  });

  const archiveSelect = document.getElementById("archiveSelect");

  if (archiveSelect) {
    archiveSelect.onchange = function () {
      const container = document.getElementById("archiveTable");
      const title = document.getElementById("archiveTitle");

      if (!this.value) {
        if (container) container.innerHTML = "";
        if (title) title.innerText = "";

        if (archiveChart) {
          archiveChart.destroy();
          archiveChart = null;
        }

        return;
      }

      loadArchive(this.value);
    };
  }
}

// =========================
// 📊 AFFICHAGE D'UNE ARCHIVE
// =========================

export async function loadArchive(archiveId) {
  const tbody = document.getElementById("archiveTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  const archive = await getArchiveById(archiveId);
  if (!archive) return;

  const ranking = archive.ranking || [];

  ranking.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.rank}</td>
      <td>${p.name}</td>
      <td>${p.wins}</td>
      <td>${p.losses}</td>
      <td><b>${p.elo}</b></td>
    `;
    tbody.appendChild(tr);
  });

  const title = document.getElementById("archiveTitle");
  if (title) title.innerText = archive.seasonName || "Archive";

  renderArchiveChart(ranking);
}

// =========================
// 📂 COMPARAISON D'ARCHIVES
// =========================

function renderEvolutionTable(data) {
  const tbody = document.getElementById("evolutionTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  data.forEach((p) => {
    let color = "black";
    if (p.diff > 0) color = "green";
    if (p.diff < 0) color = "red";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.before}</td>
      <td>${p.after}</td>
      <td style="color:${color}; font-weight:bold;">
        ${p.diff > 0 ? "+" : ""}${p.diff}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderSeasonChart(data) {
  const ctx = document.getElementById("seasonChart");
  if (!ctx) return;

  if (seasonChart) seasonChart.destroy();

  seasonChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map((p) => p.name),
      datasets: [{ label: "ELO fin de saison", data: data.map((p) => p.after) }],
    },
    options: { responsive: true },
  });
}

export async function runArchiveComparison() {
  const a = document.getElementById("archiveA")?.value;
  const b = document.getElementById("archiveB")?.value;

  if (!a || !b) return;

  const evolution = await compareArchivesService(a, b);
  if (!evolution) return;

  renderEvolutionTable(evolution);
  renderSeasonChart(evolution);
}

window.runArchiveComparison = runArchiveComparison;
