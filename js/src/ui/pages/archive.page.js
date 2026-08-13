// =========================
// 📦 ARCHIVE PAGE
// =========================
// Liste des archives, affichage d'une archive, comparaison entre deux archives.

import {
  getAllArchives,
  getArchiveById,
} from "../../repositories/archives.repository.js";

import {
  buildArchiveOptions,
  compareArchives as compareArchivesService,
} from "../../services/archive.service.js";

import {
  calculateOffense,
  calculateDefense,
  formatStatsNumber,
} from "../../services/player-stats.service.js";

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
    const statsMatches = Number(p.statsMatches) || 0;
    const offense = formatStatsNumber(
      calculateOffense(Number(p.offense) || 0, statsMatches),
    );
    const defense = formatStatsNumber(
      calculateDefense(Number(p.defense) || 0, statsMatches),
    );

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.rank}</td>
      <td>${p.name}</td>
      <td>${p.wins}</td>
      <td>${p.losses}</td>
      <td>${offense}</td>
      <td>${defense}</td>
      <td><b>${p.elo}</b></td>
    `;

    tbody.appendChild(tr);
  });

  const title = document.getElementById("archiveTitle");

  if (title) {
    title.innerText = archive.seasonName || "Archive";
  }
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

export async function runArchiveComparison() {
  const a = document.getElementById("archiveA")?.value;
  const b = document.getElementById("archiveB")?.value;

  if (!a || !b) return;

  const evolution = await compareArchivesService(a, b);

  if (!evolution) return;

  renderEvolutionTable(evolution);
}

window.runArchiveComparison = runArchiveComparison;
