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

import {
  groupArchivesByYear,
  getAvailableYears,
  buildAnnualRanking,
  calculateAnnualStats,
  sortByEvolution,
  addRankToStats,
  getPlayerAnnualDetails,
  getMonthNameFromNumber,
  normalizePlayerName,
} from "../../services/annual-ranking.service.js";

import { isAdmin } from "../../core/state.js";

import {
  getAnnualRankingSettings,
  excludePlayerFromYear,
  includePlayerForYear,
} from "../../repositories/annual-ranking.repository.js";

// =========================
// 🪟 OUVERTURE / FERMETURE MODAL
// =========================

export async function openArchiveModal() {
  const modal = document.getElementById("archiveModal");
  if (!modal) return;

  modal.style.display = "flex";

  // Afficher le menu principal des archives
  showArchiveMainMenu();
}

export function closeArchiveModal() {
  const modal = document.getElementById("archiveModal");
  if (modal) modal.style.display = "none";
}

window.openArchiveModal = openArchiveModal;
window.closeArchiveModal = closeArchiveModal;

// =========================
// 🏠 MENU PRINCIPAL DES ARCHIVES
// =========================

export function showArchiveMainMenu() {
  const content = document.getElementById("archiveContent");
  if (!content) return;

  content.innerHTML = `
    <div style="text-align: center;">
      <h2>📦 Archives du classement</h2>
      <p style="color: #666; margin-bottom: 30px;">Que souhaitez-vous faire ?</p>

      <div style="display: flex; flex-direction: column; gap: 15px; max-width: 400px; margin: 0 auto;">
        <button
          onclick="showCompareArchivesView()"
          style="
            padding: 20px;
            background: #3b82f6;
            color: black;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            text-align: left;
          "
        >
          <div style="font-size: 20px; margin-bottom: 5px;">📊 Comparer des archives</div>
          <div style="font-size: 12px; opacity: 0.8;">Comparer l'évolution entre plusieurs archives.</div>
        </button>

        <button
          onclick="showViewArchiveView()"
          style="
            padding: 20px;
            background: #3b82f6;
            color: black;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            text-align: left;
          "
        >
          <div style="font-size: 20px; margin-bottom: 5px;">📁 Voir une archive</div>
          <div style="font-size: 12px; opacity: 0.8;">Consulter le classement d'un mois précis.</div>
        </button>

        <button
          onclick="showAnnualRankingView()"
          style="
            padding: 20px;
            background: #3b82f6;
            color: black;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            text-align: left;
          "
        >
          <div style="font-size: 20px; margin-bottom: 5px;">🏆 Classement annuel</div>
          <div style="font-size: 12px; opacity: 0.8;">Suivre l'évolution des joueurs sur toute une année.</div>
        </button>
      </div>

      <button
        onclick="closeArchiveModal()"
        style="
          margin-top: 30px;
          padding: 10px 14px;
          background: #ef4444;
          color: black;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          width: 100%;
        "
      >
        ❌ Fermer
      </button>
    </div>
  `;
}

// =========================
// 📊 VUE COMPARAISON D'ARCHIVES
// =========================

export async function showCompareArchivesView() {
  const content = document.getElementById("archiveContent");
  if (!content) return;

  content.innerHTML = `
    <div>
      <h3>📊 Évolution entre 2 saisons</h3>

      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
        <select id="archiveA" style="flex: 1; padding: 10px; min-width: 150px;">
          <option value="">Saison A</option>
        </select>

        <select id="archiveB" style="flex: 1; padding: 10px; min-width: 150px;">
          <option value="">Saison B</option>
        </select>

        <button
          onclick="runArchiveComparison()"
          style="
            padding: 10px 14px;
            background: #16a34a;
            color: black;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
          "
        >
          Comparer
        </button>
      </div>

      <table style="width: 100%; margin-top: 10px;">
        <thead>
          <tr>
            <th>Joueur</th>
            <th>Début</th>
            <th>Fin</th>
            <th>Δ ELO</th>
          </tr>
        </thead>
        <tbody id="evolutionTable"></tbody>
      </table>

      <button
        onclick="showArchiveMainMenu()"
        style="
          margin-top: 15px;
          padding: 10px 14px;
          background: #6b7280;
          color: black;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          width: 100%;
        "
      >
        ← Retour
      </button>
    </div>
  `;

  // Charger les archives
  await loadArchiveList();
}

// =========================
// 📁 VUE VOIR UNE ARCHIVE
// =========================

export async function showViewArchiveView() {
  const content = document.getElementById("archiveContent");
  if (!content) return;

  content.innerHTML = `
    <div>
      <h3>📁 Voir une archive</h3>

      <select id="archiveSelect" style="
        width: 100%;
        padding: 10px;
        margin: 10px 0;
        border-radius: 8px;
      ">
        <option value="">-- Choisir une archive --</option>
      </select>

      <h4 id="archiveTitle" style="margin-top: 15px;"></h4>

      <div class="archive-table-wrapper" style="margin-top: 10px; width: 100%; overflow: hidden;">
        <table class="archive-ranking-table">
          <thead>
            <tr>
              <th>Rang</th>
              <th>Joueur</th>
              <th>V</th>
              <th>D</th>
              <th>O</th>
              <th>Df</th>
              <th>ELO</th>
            </tr>
          </thead>
          <tbody id="archiveTable"></tbody>
        </table>
      </div>

      <button
        onclick="showArchiveMainMenu()"
        style="
          margin-top: 15px;
          padding: 10px 14px;
          background: #6b7280;
          color: black;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          width: 100%;
        "
      >
        ← Retour
      </button>
    </div>
  `;

  // Charger les archives
  await loadArchiveList();
}

// =========================
// 🏆 VUE CLASSEMENT ANNUEL
// =========================

export async function showAnnualRankingView() {
  const content = document.getElementById("archiveContent");
  if (!content) return;

  const adminButtonHtml = isAdmin()
    ? `
      <button
        id="annualRankingAdminBtn"
        onclick="openAnnualRankingPlayerManager()"
        style="
          margin-bottom: 15px;
          padding: 10px 14px;
          background: #f59e0b;
          color: black;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          width: 100%;
        "
      >
        ⚙️ Gérer les joueurs
      </button>
    `
    : "";

  content.innerHTML = `
    <div>
      <h2>🏆 Classement annuel</h2>

      <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
        <label for="annualYearSelect" style="font-weight: bold;">Année :</label>
        <select id="annualYearSelect" style="padding: 8px 12px; border-radius: 6px; font-size: 16px;">
          <option value="">-- Choisir une année --</option>
        </select>
      </div>

      ${adminButtonHtml}

      <div id="annualRankingContainer"></div>

      <button
        onclick="showArchiveMainMenu()"
        style="
          margin-top: 15px;
          padding: 10px 14px;
          background: #6b7280;
          color: black;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          width: 100%;
        "
      >
        ← Retour
      </button>
    </div>
  `;

  const archives = await getAllArchives();
  const years = getAvailableYears(archives);

  const yearSelect = document.getElementById("annualYearSelect");
  if (yearSelect) {
    years.forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    });

    yearSelect.onchange = function () {
      if (this.value) {
        loadAnnualRanking(parseInt(this.value, 10), archives);
      }
    };

    if (years.length > 0) {
      yearSelect.value = years[0];
      loadAnnualRanking(years[0], archives);
    }
  }
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

// =========================
// 🏆 CLASSEMENT ANNUEL
// =========================

/**
 * Charge et affiche le classement annuel pour une année donnée.
 */
export async function loadAnnualRanking(year, allArchives = null) {
  const container = document.getElementById("annualRankingContainer");
  if (!container) return;

  container.innerHTML = "<p>Chargement...</p>";

  try {
    const archives = allArchives || (await getAllArchives());
    const archivesByYear = groupArchivesByYear(archives);
    const archivesForYear = archivesByYear[year] || [];

    if (archivesForYear.length === 0) {
      container.innerHTML =
        '<p style="color: #d32f2f;">Aucune archive trouvée pour cette année.</p>';
      return;
    }

    const settings = await getAnnualRankingSettings(year);
    const excludedPlayers = (settings.excludedPlayers || []).map((name) =>
      normalizePlayerName(name),
    );

    const {
      allPlayers,
      monthlyData,
      monthOrder,
      monthNumberMap,
      displayNames,
    } = buildAnnualRanking(archivesForYear, excludedPlayers);

    const stats = calculateAnnualStats(
      allPlayers,
      monthlyData,
      monthOrder,
      displayNames,
    );
    const sortedStats = sortByEvolution(stats);
    const rankedStats = addRankToStats(sortedStats);

    // Afficher le tableau annuel
    const table = document.createElement("table");
    table.style.cssText =
      "width: 100%; border-collapse: collapse; margin-top: 15px; overflow-x: auto;";

    // En-têtes
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.style.cssText = "background: #f0f0f0; font-weight: bold;";

    const th1 = document.createElement("th");
    th1.textContent = "Joueur";
    th1.style.cssText =
      "padding: 10px; text-align: left; border: 1px solid #ddd;";
    headerRow.appendChild(th1);

    // Ajouter les mois en en-têtes (utiliser monthOrder qui contient les numéros de mois)
    monthOrder.forEach((monthNumber) => {
      const th = document.createElement("th");
      const monthName = monthNumberMap.get(monthNumber);
      // Afficher le nom complet du mois (pas juste 3 lettres)
      th.textContent = monthName.substring(0, 3).toUpperCase();
      th.title = monthName;
      th.style.cssText =
        "padding: 10px; text-align: center; border: 1px solid #ddd; font-size: 12px;";
      headerRow.appendChild(th);
    });

    const thStart = document.createElement("th");
    thStart.textContent = "ELO début";
    thStart.style.cssText =
      "padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold;";
    headerRow.appendChild(thStart);

    const thEnd = document.createElement("th");
    thEnd.textContent = "ELO fin";
    thEnd.style.cssText =
      "padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold;";
    headerRow.appendChild(thEnd);

    const thEvolution = document.createElement("th");
    thEvolution.textContent = "Évolution";
    thEvolution.style.cssText =
      "padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold;";
    headerRow.appendChild(thEvolution);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");

    rankedStats.forEach((stat) => {
      const tr = document.createElement("tr");
      tr.style.cssText = "border-bottom: 1px solid #eee;";
      tr.style.cursor = "pointer";
      tr.onclick = () =>
        showPlayerAnnualDetails(stat.name, year, archivesForYear);

      // Nom du joueur
      const tdName = document.createElement("td");
      tdName.textContent = stat.name;
      tdName.style.cssText =
        "padding: 10px; text-align: left; border: 1px solid #ddd; font-weight: bold;";
      tr.appendChild(tdName);

      // ELO pour chaque mois (utiliser monthOrder qui contient les numéros)
      monthOrder.forEach((monthNumber) => {
        const td = document.createElement("td");
        const elo = stat.monthlyElos[monthNumber];
        td.textContent = elo !== undefined ? elo : "—";
        td.style.cssText =
          "padding: 10px; text-align: center; border: 1px solid #ddd; font-size: 12px;";
        tr.appendChild(td);
      });

      // ELO début
      const tdStart = document.createElement("td");
      tdStart.textContent = stat.eloStart !== null ? stat.eloStart : "—";
      tdStart.style.cssText =
        "padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold;";
      tr.appendChild(tdStart);

      // ELO fin
      const tdEnd = document.createElement("td");
      tdEnd.textContent = stat.eloEnd !== null ? stat.eloEnd : "—";
      tdEnd.style.cssText =
        "padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold;";
      tr.appendChild(tdEnd);

      // Évolution
      const tdEvolution = document.createElement("td");
      let evolutionColor = "black";
      let evolutionText = "—";

      if (stat.evolution !== null) {
        evolutionText = stat.evolution > 0 ? "+" : "";
        evolutionText += stat.evolution;

        if (stat.evolution > 0) evolutionColor = "green";
        if (stat.evolution < 0) evolutionColor = "red";
      }

      tdEvolution.textContent = evolutionText;
      tdEvolution.style.cssText = `padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold; color: ${evolutionColor};`;
      tr.appendChild(tdEvolution);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    // Afficher le tableau
    container.innerHTML = "";
    container.appendChild(table);

    // Ajouter un message pour les clics
    const hint = document.createElement("p");
    hint.textContent = "Cliquez sur un joueur pour voir ses détails annuels.";
    hint.style.cssText =
      "color: #666; font-size: 12px; margin-top: 10px; text-align: center;";
    container.appendChild(hint);
  } catch (error) {
    console.error("Erreur lors du chargement du classement annuel:", error);
    container.innerHTML =
      '<p style="color: #d32f2f;">Erreur lors du chargement des données.</p>';
  }
}

/**
 * Affiche les détails d'un joueur pour une année donnée.
 */
export function showPlayerAnnualDetails(playerName, year, archivesForYear) {
  const container = document.getElementById("annualRankingContainer");
  if (!container) return;

  const playerDetails = getPlayerAnnualDetails(playerName, archivesForYear);

  const div = document.createElement("div");
  div.style.cssText = "margin-top: 20px;";

  // Titre
  const title = document.createElement("h3");
  title.textContent = `${playerName} — Saison ${year}`;
  title.style.cssText = "margin-bottom: 15px;";
  div.appendChild(title);

  // Tableau des détails
  const table = document.createElement("table");
  table.style.cssText =
    "width: 100%; border-collapse: collapse; margin-bottom: 15px;";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.style.cssText = "background: #f0f0f0; font-weight: bold;";

  const headers = ["Mois", "ELO", "Rang", "V", "D", "O", "Df"];
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    th.style.cssText =
      "padding: 10px; text-align: center; border: 1px solid #ddd; font-size: 12px;";
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  playerDetails.monthlyDetails.forEach((detail) => {
    const tr = document.createElement("tr");
    tr.style.cssText = "border-bottom: 1px solid #eee;";

    const cells = [
      detail.monthName, // Utiliser monthName au lieu de month
      detail.elo !== null ? detail.elo : "—",
      detail.rank !== null ? detail.rank : "—",
      detail.wins !== null ? detail.wins : "—",
      detail.losses !== null ? detail.losses : "—",
      detail.offense !== null ? detail.offense.toFixed(1) : "—",
      detail.defense !== null ? detail.defense.toFixed(1) : "—",
    ];

    cells.forEach((cell, index) => {
      const td = document.createElement("td");
      td.textContent = cell;
      td.style.cssText =
        "padding: 10px; text-align: center; border: 1px solid #ddd; font-size: 12px;";

      if (index === 0) {
        td.style.textAlign = "left";
        td.style.fontWeight = "bold";
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  div.appendChild(table);

  // Bouton Retour
  const backBtn = document.createElement("button");
  backBtn.textContent = "← Retour au classement";
  backBtn.style.cssText = `
    padding: 10px 14px;
    background: #6b7280;
    color: black;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    width: 100%;
  `;
  backBtn.onclick = () => {
    loadAnnualRanking(year, archivesForYear);
  };
  div.appendChild(backBtn);

  // Remplacer le contenu
  container.innerHTML = "";
  container.appendChild(div);
}

// =========================
// 🪟 EXPOSITION GLOBALE
// =========================

async function openAnnualRankingPlayerManager() {
  const yearSelect = document.getElementById("annualYearSelect");
  const year = yearSelect && yearSelect.value ? Number(yearSelect.value) : null;
  const container = document.getElementById("annualRankingContainer");
  if (!container || !year) return;

  container.innerHTML = "<p>Chargement des joueurs...</p>";

  const archives = await getAllArchives();
  const archivesByYear = groupArchivesByYear(archives);
  const archivesForYear = archivesByYear[year] || [];

  if (archivesForYear.length === 0) {
    container.innerHTML =
      '<p style="color: #d32f2f;">Aucune archive disponible pour cette année.</p>';
    return;
  }

  const settings = await getAnnualRankingSettings(year);
  const excluded = new Set(
    (settings.excludedPlayers || []).map((name) => normalizePlayerName(name)),
  );

  const uniquePlayers = new Map();
  archivesForYear.forEach((archive) => {
    (archive.ranking || []).forEach((player) => {
      const normalized = normalizePlayerName(player.name);
      if (!uniquePlayers.has(normalized)) {
        uniquePlayers.set(normalized, player.name || normalized);
      }
    });
  });

  const title = document.createElement("h3");
  title.textContent = `⚙️ Joueurs inclus dans le classement ${year}`;
  title.style.cssText = "margin: 0 0 15px;";
  container.innerHTML = "";
  container.appendChild(title);

  const list = document.createElement("div");
  list.style.cssText = "display: flex; flex-direction: column; gap: 10px;";

  const entries = Array.from(uniquePlayers.entries()).sort((a, b) =>
    a[1].localeCompare(b[1], "fr"),
  );

  entries.forEach(([normalized, originalName]) => {
    const row = document.createElement("label");
    row.style.cssText =
      "display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: #f3f4f6; border-radius: 8px; cursor: pointer;";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !excluded.has(normalized);
    checkbox.onchange = async () => {
      if (checkbox.checked) {
        await includePlayerForYear(year, normalized);
      } else {
        await excludePlayerFromYear(year, normalized);
      }
      await loadAnnualRanking(year, archives);
    };

    const label = document.createElement("span");
    label.textContent = originalName;
    label.style.cssText = "font-weight: bold;";

    row.appendChild(checkbox);
    row.appendChild(label);
    list.appendChild(row);
  });

  container.appendChild(list);
}

window.showArchiveMainMenu = showArchiveMainMenu;
window.showCompareArchivesView = showCompareArchivesView;
window.showViewArchiveView = showViewArchiveView;
window.showAnnualRankingView = showAnnualRankingView;
window.loadAnnualRanking = loadAnnualRanking;
window.showPlayerAnnualDetails = showPlayerAnnualDetails;
window.openAnnualRankingPlayerManager = openAnnualRankingPlayerManager;
