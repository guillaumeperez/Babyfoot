// =========================
// 📜 HISTORY PAGE
// =========================
// Ouvre la modale "history" qui combine historique des matchs ET tendance ELO
// côte à côte. Reprise de openHistory() dans script.js.
// Gère elle-même le scroll car cette modale n'utilise pas openModal() standard
// (elle est ouverte directement, sans passer par le registre de hooks).

import { loadPlayersFilter } from "./matches.page.js";
import { loadPlayersTrendFilter, loadPlayerEloTrend } from "./trend.page.js";

let _scrollY = 0;

export async function openHistory() {
  const history = document.getElementById("history");
  if (!history) return;

  history.style.display = "flex";

  _scrollY = window.scrollY;
  document.body.classList.add("no-scroll");
  document.body.style.top = `-${_scrollY}px`;

  await loadPlayersFilter();
  await loadPlayersTrendFilter();
  await loadPlayerEloTrend();
}

window.openHistory = openHistory;
