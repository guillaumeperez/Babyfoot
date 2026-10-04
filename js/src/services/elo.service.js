// =========================
// ⚖️ ELO SERVICE
// =========================
// Logique pure du calcul ELO. Aucune dépendance Firebase, aucun DOM.
// Reprend et enrichit le elo.js d'origine.
// Peut être testé avec de simples objets joueurs en mémoire.

import { APP_CONFIG } from "../config/app.config.js";

const K = APP_CONFIG.ELO_K_FACTOR;

/**
 * Probabilité de victoire de l'équipe A face à l'équipe B (formule ELO standard).
 */
export function getExpectedScore(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

/**
 * Applique le calcul ELO 2v2 à deux équipes (mutate teamBleu/teamRouge en place).
 * Chaque joueur doit avoir une propriété `elo` (number) et optionnellement `history` (array).
 *
 * @param {Array} teamBleu  - [joueur1, joueur2]
 * @param {Array} teamRouge - [joueur1, joueur2]
 * @param {number} winBleu  - 1 si bleu gagne, 0 si rouge gagne
 * @param {string} [matchId] - optionnel, ajouté à l'historique de chaque joueur
 */
export function updateElo2v2(teamBleu, teamRouge, winBleu, matchId) {
  const eloBleu = (teamBleu[0].elo + teamBleu[1].elo) / 2;
  const eloRouge = (teamRouge[0].elo + teamRouge[1].elo) / 2;

  const expectedBleu = getExpectedScore(eloBleu, eloRouge);
  const expectedRouge = getExpectedScore(eloRouge, eloBleu);

  const diffBleu = K * (winBleu - expectedBleu);
  const diffRouge = K * (1 - winBleu - expectedRouge);

  const apply = (player, diff) => {
    const eloBefore = player.elo;
    player.elo = Math.round(player.elo + diff);

    if (!player.history) player.history = [];

    player.history.push({
      matchId,
      eloBefore,
      eloAfter: player.elo,
      diff: Math.round(diff),
    });
  };

  apply(teamBleu[0], diffBleu);
  apply(teamBleu[1], diffBleu);
  apply(teamRouge[0], diffRouge);
  apply(teamRouge[1], diffRouge);
}

/**
 * Construit le snapshot eloBefore/eloAfter/eloChange attendu par les matchs
 * classiques (b1, b2, r1, r2), à partir des objets joueurs après calcul.
 *
 * @param {Array} teamBleu  - [joueur1, joueur2] après updateElo2v2
 * @param {Array} teamRouge - [joueur1, joueur2] après updateElo2v2
 * @returns {{ eloBefore: object, eloAfter: object, eloChange: object }}
 */
export function buildEloSnapshot(teamBleu, teamRouge) {
  const safeRound = (v) => Math.round(v ?? APP_CONFIG.DEFAULT_ELO);

  const before = (p) => safeRound(p?.oldElo ?? APP_CONFIG.DEFAULT_ELO);
  const after = (p) => safeRound(p?.elo ?? APP_CONFIG.DEFAULT_ELO);

  return {
    eloBefore: {
      b1: before(teamBleu[0]),
      b2: before(teamBleu[1]),
      r1: before(teamRouge[0]),
      r2: before(teamRouge[1]),
    },
    eloAfter: {
      b1: after(teamBleu[0]),
      b2: after(teamBleu[1]),
      r1: after(teamRouge[0]),
      r2: after(teamRouge[1]),
    },
    eloChange: {
      b1: after(teamBleu[0]) - before(teamBleu[0]),
      b2: after(teamBleu[1]) - before(teamBleu[1]),
      r1: after(teamRouge[0]) - before(teamRouge[0]),
      r2: after(teamRouge[1]) - before(teamRouge[1]),
    },
  };
}
