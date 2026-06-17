// =========================
// ⚔️ MATCH SERVICE
// =========================
// Orchestre la logique métier des matchs classiques :
// validation, sauvegarde, calcul ELO, suppression + restauration ELO.
// Ne touche jamais le DOM directement.

import {
  createMatch,
  updateMatch,
  getMatchById,
  deleteMatch as deleteMatchDoc,
} from "../repositories/matches.repository.js";

import { getAllPlayers, updatePlayer } from "../repositories/players.repository.js";
import { applyMatchResultToPlayers } from "./player.service.js";
import { APP_CONFIG } from "../config/app.config.js";

import {
  validateClassicScore,
  validatePlayersSelected,
  validateAntiSpam,
} from "../utils/validation.utils.js";

import { isTestMode } from "../core/state.js";

/**
 * Valide les données d'un match classique avant sauvegarde.
 * Renvoie { valid, error } — error est un message prêt à afficher.
 */
export function validateClassicMatch({ b1, b2, r1, r2, sb, sr, lastMatchSave }) {
  const scoreCheck = validateClassicScore(sb, sr);
  if (!scoreCheck.valid) return scoreCheck;

  const playersCheck = validatePlayersSelected(b1, b2, r1, r2);
  if (!playersCheck.valid) return playersCheck;

  const spamCheck = validateAntiSpam(lastMatchSave);
  if (!spamCheck.valid) return spamCheck;

  return { valid: true };
}

/**
 * Sauvegarde un match classique (2v2) :
 * - en mode test : simule le calcul ELO sans écrire en base
 * - en mode prod : crée le match, calcule l'ELO, met à jour le match avec le snapshot ELO
 *
 * @param {{b1,b2,r1,r2,sb,sr}} matchData
 * @returns {{ testMode: boolean, result: object|null, matchId: string|null }}
 */
export async function saveClassicMatch(matchData) {
  const match = {
    ...matchData,
    type: "classic",
  };

  if (isTestMode()) {
    const result = await applyMatchResultToPlayers(match);
    return { testMode: true, result, matchId: null };
  }

  const matchRef = await createMatch(match);
  const result = await applyMatchResultToPlayers(match);

  const safeResult = {
    eloBefore: result?.eloBefore ?? {},
    eloAfter: result?.eloAfter ?? {},
    eloChange: result?.eloChange ?? {},
  };

  await updateMatch(matchRef.id, {
    ...safeResult,
    played: true,
  });

  return { testMode: false, result, matchId: matchRef.id };
}

/**
 * Supprime un match classique et restaure l'ELO/wins/losses/history
 * des 4 joueurs concernés à leur état avant ce match.
 *
 * @param {string} matchId
 * @returns {{ success: boolean, error?: string }}
 */
export async function deleteClassicMatchAndRestoreElo(matchId) {
  const match = await getMatchById(matchId);

  if (!match) {
    return { success: false, error: "❌ Match non trouvé" };
  }

  if (match.eloBefore) {
    const players = [
      { name: match.b1, elo: match.eloBefore.b1, diff: match.eloChange?.b1 || 0 },
      { name: match.b2, elo: match.eloBefore.b2, diff: match.eloChange?.b2 || 0 },
      { name: match.r1, elo: match.eloBefore.r1, diff: match.eloChange?.r1 || 0 },
      { name: match.r2, elo: match.eloBefore.r2, diff: match.eloChange?.r2 || 0 },
    ];

    const allPlayers = await getAllPlayers();

    for (const p of players) {
      if (!p.name) continue;

      const playerDoc = allPlayers.find(
        (pl) => pl.name?.toLowerCase() === p.name.toLowerCase(),
      );

      if (!playerDoc) continue;

      let wins = playerDoc.wins || 0;
      let losses = playerDoc.losses || 0;

      if (p.diff > 0) {
        wins = Math.max(0, wins - 1);
      } else if (p.diff < 0) {
        losses = Math.max(0, losses - 1);
      }

      let history = [...(playerDoc.history || [])];
      history = history.filter((h) => {
        if (typeof h === "object") {
          return h.matchId !== matchId;
        }
        return true;
      });

      await updatePlayer(playerDoc.id, {
        elo: p.elo ?? APP_CONFIG.DEFAULT_ELO,
        wins: wins ?? 0,
        losses: losses ?? 0,
        history: Array.isArray(history) ? history : [],
        lastDiff: 0,
      });
    }
  }

  await deleteMatchDoc(matchId);

  return { success: true };
}

/**
 * Filtre une liste de matchs pour un joueur donné, avec un filtre de résultat
 * (victoire / défaite / aucun).
 *
 * @param {Array} matches
 * @param {string} selectedPlayer - nom en minuscules
 * @param {"win"|"loss"|""} resultFilter
 * @returns {Array} matchs filtrés (chaque entrée enrichie avec isWin, blueWin)
 */
export function filterMatchesForPlayer(matches, selectedPlayer, resultFilter) {
  if (!selectedPlayer) return [];

  return matches
    .map((m) => {
      const players = [m.b1, m.b2, m.r1, m.r2]
        .filter((p) => p)
        .map((p) => p.toLowerCase());

      if (!players.includes(selectedPlayer)) return null;

      const inBlue =
        m.b1?.toLowerCase() === selectedPlayer ||
        m.b2?.toLowerCase() === selectedPlayer;

      const inRed =
        m.r1?.toLowerCase() === selectedPlayer ||
        m.r2?.toLowerCase() === selectedPlayer;

      let isWin = false;
      if (inBlue) isWin = m.sb > m.sr;
      else if (inRed) isWin = m.sr > m.sb;

      if (resultFilter === "win" && !isWin) return null;
      if (resultFilter === "loss" && isWin) return null;

      return { ...m, isWin, blueWin: m.sb > m.sr };
    })
    .filter(Boolean);
}
