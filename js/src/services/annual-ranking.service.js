// =========================
// 🏆 ANNUAL RANKING SERVICE
// =========================
// Logique métier pour le classement annuel.
// Construit un classement basé sur l'évolution ELO à partir des archives mensuelles.
// Ne touche jamais le DOM directement.

import { APP_CONFIG } from "../config/app.config.js";

/**
 * Normalise un nom de joueur pour le regroupement.
 * Supprime les accents, passe en minuscules, trim, et normalise les espaces.
 * Ex: "Cédric" -> "cedric", " ÉLODIE " -> "elodie"
 *
 * Cette fonction est utilisée **uniquement comme clé de regroupement**,
 * pas pour modifier les noms affichés.
 *
 * @param {string} name
 * @returns {string}
 */
export function normalizePlayerName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Extrait le numéro du mois (1-12) du seasonName (ex: "février 2026" -> 2).
 * @param {string} seasonName
 * @returns {number|null}
 */
export function extractMonthNumberFromSeasonName(seasonName) {
  if (!seasonName) return null;
  const months = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];

  const lowerName = seasonName.toLowerCase();
  for (let i = 0; i < months.length; i++) {
    if (lowerName.includes(months[i])) {
      return i + 1; // Retourner le numéro (1-12)
    }
  }
  return null;
}

/**
 * Convertit un numéro de mois (1-12) en nom français.
 * @param {number} monthNumber
 * @returns {string}
 */
export function getMonthNameFromNumber(monthNumber) {
  const months = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];
  return months[monthNumber - 1] || "inconnu";
}

/**
 * Extrait le mois du seasonName (ex: "février 2026" -> "février").
 * @param {string} seasonName
 * @returns {string|null}
 */
export function extractMonthFromSeasonName(seasonName) {
  if (!seasonName) return null;
  const months = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];

  const lowerName = seasonName.toLowerCase();
  for (let i = 0; i < months.length; i++) {
    if (lowerName.includes(months[i])) {
      return months[i];
    }
  }
  return null;
}

/**
 * Récupère l'indice du mois (0-11) pour le tri.
 */
function getMonthIndex(monthName) {
  const months = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];
  const index = months.indexOf(monthName?.toLowerCase());
  return index !== -1 ? index : -1;
}

/**
 * Extrait l'année du seasonName (ex: "mai 2026" -> 2026).
 * @param {string} seasonName
 * @returns {number|null}
 */
export function extractYearFromSeasonName(seasonName) {
  if (!seasonName) return null;
  const match = seasonName.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Groupe les archives par année.
 * @param {Array} archives - Toutes les archives
 * @returns {Object} - { year: [archives] }
 */
export function groupArchivesByYear(archives) {
  const grouped = {};

  archives.forEach((archive) => {
    const year = extractYearFromSeasonName(archive.seasonName);
    if (year) {
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(archive);
    }
  });

  return grouped;
}

/**
 * Extrait la liste unique des années disponibles, triées décroissant.
 * @param {Array} archives
 * @returns {Array<number>}
 */
export function getAvailableYears(archives) {
  const years = new Set();
  archives.forEach((archive) => {
    const year = extractYearFromSeasonName(archive.seasonName);
    if (year) {
      years.add(year);
    }
  });

  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Construit le classement annuel pour une année donnée.
 * Utilise les indices numériques de mois (1-12) en interne pour un tri robuste.
 * Normalise les noms des joueurs pour regrouper "Cédric" et "Cedric" comme un seul joueur.
 * Filtre les joueurs exclus.
 *
 * Retourne un objet avec : allPlayers, monthlyData, monthOrder, monthNumberMap, displayNames
 *
 * @param {Array} archivesForYear - Archives pour cette année
 * @param {Array} excludedPlayers - Noms normalisés à exclure (ex: ["cedric", "ancien-stagiaire"])
 * @returns {Object}
 *   - allPlayers: Array trié des noms normalisés (non exclus)
 *   - monthlyData: Map { normalizedName -> { 5: elo, 6: elo, ... } } (clés numériques)
 *   - monthOrder: Array trié des numéros de mois [5, 6, 7, 8]
 *   - monthNumberMap: Map { 5: "mai", 6: "juin", ... } pour l'affichage
 *   - displayNames: Map { normalizedName -> "Nom Officiel" } (nom original de la dernière archive)
 */
export function buildAnnualRanking(archivesForYear, excludedPlayers = []) {
  const allPlayers = new Set(); // noms normalisés
  const monthlyData = new Map(); // normalizedName -> { monthNumber: elo, ... }
  const displayNames = new Map(); // normalizedName -> originalName (de la dernière archive)
  const monthSet = new Set(); // numéros de mois uniques
  const monthNumberMap = new Map(); // monthNumber -> monthName

  console.log(
    `📊 Archives trouvées pour cette année : ${archivesForYear.length}`,
  );
  console.log(
    `🚫 Joueurs exclus (${excludedPlayers.length}) : ${excludedPlayers.join(", ") || "aucun"}`,
  );

  // Parcourir les archives et extraire les mois
  archivesForYear.forEach((archive) => {
    const monthNumber = extractMonthNumberFromSeasonName(archive.seasonName);
    const monthName = extractMonthFromSeasonName(archive.seasonName);

    console.log(
      `  - ${archive.seasonName} -> mois ${monthNumber} (${monthName})`,
    );

    if (monthNumber && monthName) {
      monthSet.add(monthNumber);
      monthNumberMap.set(monthNumber, monthName);

      const ranking = archive.ranking || [];

      ranking.forEach((player) => {
        const originalName = player.name;
        const normalizedName = normalizePlayerName(originalName);

        // ⏭️ Sauter si le joueur est exclu
        if (excludedPlayers.includes(normalizedName)) {
          return;
        }

        allPlayers.add(normalizedName);
        displayNames.set(normalizedName, originalName);

        if (!monthlyData.has(normalizedName)) {
          monthlyData.set(normalizedName, {});
        }

        // Stocker avec la clé numérique du mois
        monthlyData.get(normalizedName)[monthNumber] = player.elo;
      });
    }
  });

  const monthOrder = Array.from(monthSet).sort((a, b) => a - b);

  console.log(
    `🗓️  Colonnes générées : ${monthOrder.map((m) => monthNumberMap.get(m)).join(", ")}`,
  );

  return {
    allPlayers: Array.from(allPlayers).sort(),
    monthlyData,
    monthOrder,
    monthNumberMap,
    displayNames,
  };
}

/**
 * Calcule les statistiques annuelles pour chaque joueur.
 * @param {Array} allPlayers - Noms normalisés
 * @param {Map} monthlyData - { normalizedName -> { monthNumber: elo, ... } }
 * @param {Array} monthOrder - [5, 6, 7, 8, ...]
 * @param {Map} displayNames - { normalizedName -> originalName } pour l'affichage
 * @returns {Array}
 *   [ { name, eloStart, eloEnd, evolution, monthlyElos }, ... ]
 *   où `name` est le nom original (displayName)
 */
export function calculateAnnualStats(
  allPlayers,
  monthlyData,
  monthOrder,
  displayNames,
) {
  const stats = [];

  allPlayers.forEach((normalizedName) => {
    const displayName = displayNames.get(normalizedName) || normalizedName;
    const monthlyElos = monthlyData.get(normalizedName) || {};

    // ELO début : premier mois disponible (en utilisant les indices numériques)
    let eloStart = null;
    for (const monthNumber of monthOrder) {
      if (monthlyElos[monthNumber] !== undefined) {
        eloStart = monthlyElos[monthNumber];
        break;
      }
    }

    // ELO fin : dernier mois disponible
    let eloEnd = null;
    for (let i = monthOrder.length - 1; i >= 0; i--) {
      const monthNumber = monthOrder[i];
      if (monthlyElos[monthNumber] !== undefined) {
        eloEnd = monthlyElos[monthNumber];
        break;
      }
    }

    // Évolution
    const evolution =
      eloStart !== null && eloEnd !== null ? eloEnd - eloStart : null;

    stats.push({
      name: displayName,
      eloStart,
      eloEnd,
      evolution,
      monthlyElos, // { monthNumber: elo, ... }
    });
  });

  return stats;
}

/**
 * Trie les statistiques annuelles par évolution ELO décroissante.
 * Critère secondaire : ELO final (pour les joueurs avec même évolution).
 *
 * Tri principal : Évolution du plus élevé (+150) au plus faible (-30)
 * Tri secondaire : ELO final du plus élevé au plus faible (si évolutions égales)
 *
 * @param {Array} stats
 * @returns {Array}
 */
export function sortByEvolution(stats) {
  return stats.sort((a, b) => {
    const evolutionA = a.evolution ?? -Infinity;
    const evolutionB = b.evolution ?? -Infinity;

    // Tri principal : évolution décroissante
    if (evolutionA !== evolutionB) {
      return evolutionB - evolutionA;
    }

    // Tri secondaire : ELO final décroissant (si évolutions égales)
    const eloA = a.eloEnd ?? -Infinity;
    const eloB = b.eloEnd ?? -Infinity;
    return eloB - eloA;
  });
}

/**
 * Trie les statistiques annuelles par ELO final décroissant.
 * ⚠️ DÉPRÉCIÉ — Utilisé uniquement en cas de compatibilité.
 * Le classement annuel préfère `sortByEvolution()`.
 *
 * @param {Array} stats
 * @returns {Array}
 */
export function sortByEloEnd(stats) {
  return stats.sort((a, b) => {
    const eloA = a.eloEnd ?? -Infinity;
    const eloB = b.eloEnd ?? -Infinity;
    return eloB - eloA;
  });
}

/**
 * Calcule le rang final pour chaque joueur basé sur l'ELO de fin d'année.
 * @param {Array} stats - Stats triées
 * @returns {Array} - Stats avec .rank ajouté
 */
export function addRankToStats(stats) {
  return stats.map((stat, index) => ({
    ...stat,
    rank: index + 1,
  }));
}

/**
 * Récupère les détails d'un joueur pour une année donnée.
 * Normalise les noms pour gérer les variantes (Cédric / Cedric).
 *
 * @param {string} playerName
 * @param {Array} archivesForYear
 * @returns {Object}
 *   {
 *     name,
 *     monthlyDetails: [ { monthNumber, monthName, elo, rank, wins, losses, offense, defense }, ... ]
 *   }
 */
export function getPlayerAnnualDetails(playerName, archivesForYear) {
  const monthlyDetails = [];
  const monthMap = new Map(); // monthNumber -> archive data
  const normalizedSearchName = normalizePlayerName(playerName);

  // Construire une map des archives par numéro de mois
  archivesForYear.forEach((archive) => {
    const monthNumber = extractMonthNumberFromSeasonName(archive.seasonName);
    const monthName = extractMonthFromSeasonName(archive.seasonName);

    if (monthNumber && monthName) {
      const ranking = archive.ranking || [];
      const playerData = ranking.find((p) => {
        const normalizedArchiveName = normalizePlayerName(p.name);
        return normalizedArchiveName === normalizedSearchName;
      });

      monthMap.set(monthNumber, {
        monthName,
        playerData,
      });
    }
  });

  // Construire les détails triés par numéro de mois
  const sortedMonths = Array.from(monthMap.keys()).sort((a, b) => a - b);

  sortedMonths.forEach((monthNumber) => {
    const { monthName, playerData } = monthMap.get(monthNumber);

    if (playerData) {
      monthlyDetails.push({
        monthNumber,
        monthName,
        elo: playerData.elo,
        rank: playerData.rank,
        wins: playerData.wins,
        losses: playerData.losses,
        offense: playerData.offense,
        defense: playerData.defense,
        statsMatches: playerData.statsMatches,
      });
    } else {
      monthlyDetails.push({
        monthNumber,
        monthName,
        elo: null,
        rank: null,
        wins: null,
        losses: null,
        offense: null,
        defense: null,
        statsMatches: null,
      });
    }
  });

  return {
    name: playerName,
    monthlyDetails,
  };
}
