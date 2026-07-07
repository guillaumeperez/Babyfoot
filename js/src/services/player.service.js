// =========================
// 👤 PLAYER SERVICE
// =========================
// Logique métier liée aux joueurs : validation des demandes,
// acceptation/refus, mise à jour des stats après un match.
// Ne touche jamais le DOM directement.

import {
  getAllPlayers,
  createPlayer,
} from "../repositories/players.repository.js";

import {
  getPendingRequests,
  createRequest,
  deleteRequest,
} from "../repositories/requests.repository.js";

import { updatePlayer } from "../repositories/players.repository.js";

import { updateElo2v2, buildEloSnapshot } from "./elo.service.js";

import { APP_CONFIG } from "../config/app.config.js";
import {
  normalizePlayerName,
  nameExistsInList,
} from "../utils/validation.utils.js";
import { isTestMode } from "../core/state.js";
import {
  getAllMatches,
  updateMatch,
} from "../repositories/matches.repository.js";

// =========================
// 📩 DEMANDES D'AJOUT
// =========================

/**
 * Tente de créer une demande d'ajout de joueur.
 * Vérifie les doublons dans les demandes en attente et dans les joueurs existants.
 *
 * @returns {{ success: boolean, message: string, level: "green"|"orange"|"red" }}
 */
export async function requestNewPlayer(rawName) {
  const name = normalizePlayerName(rawName);

  if (!name) {
    return { success: false, message: "❌ Nom vide", level: "red" };
  }

  const pendingRequests = await getPendingRequests();
  if (nameExistsInList(name, pendingRequests)) {
    return {
      success: false,
      message:
        "⚠️ Une demande pour ce joueur est déjà en attente de validation",
      level: "orange",
    };
  }

  const players = await getAllPlayers();
  if (nameExistsInList(name, players)) {
    return {
      success: false,
      message: "❌ Ce joueur existe déjà",
      level: "red",
    };
  }

  await createRequest(name);

  return {
    success: true,
    message: `📩 "${name}" a été envoyé à l'admin (en attente de validation)`,
    level: "green",
  };
}

/**
 * Accepte une demande : crée le joueur et supprime la demande.
 */
export async function acceptPlayerRequest(requestId, name) {
  await createPlayer(name);
  await deleteRequest(requestId);
}

/**
 * Refuse une demande : supprime simplement la demande.
 */
export async function rejectPlayerRequest(requestId) {
  await deleteRequest(requestId);
}

// =========================
// 📊 STATS APRÈS MATCH
// =========================

function buildPlayersStateFromSnapshot(players, match) {
  const names = [match.b1, match.b2, match.r1, match.r2].filter(Boolean);
  const stateByName = new Map();

  for (const p of players) {
    if (!p?.name) continue;
    if (typeof p.elo !== "number" || isNaN(p.elo)) continue;
    if (!names.includes(p.name)) continue;

    const candidate = {
      id: p.id,
      name: p.name,
      oldElo: p.elo ?? APP_CONFIG.DEFAULT_ELO,
      elo: p.elo ?? APP_CONFIG.DEFAULT_ELO,
      wins: p.wins ?? 0,
      losses: p.losses ?? 0,
      history: Array.isArray(p.history)
        ? p.history.filter((h) => typeof h === "string")
        : [],
    };

    const existing = stateByName.get(p.name);
    if (!existing || (candidate.id?.length ?? 0) > (existing.id?.length ?? 0)) {
      stateByName.set(p.name, candidate);
    }
  }

  return Array.from(stateByName.values());
}

function buildInitialMemoryPlayersState(players) {
  const stateByName = new Map();

  for (const p of players) {
    if (!p?.name) continue;

    const candidate = {
      id: p.id,
      name: p.name,
      elo: APP_CONFIG.DEFAULT_ELO,
      wins: 0,
      losses: 0,
      history: [],
    };

    const existing = stateByName.get(p.name);
    if (!existing || (candidate.id?.length ?? 0) > (existing.id?.length ?? 0)) {
      stateByName.set(p.name, candidate);
    }
  }

  return Array.from(stateByName.values());
}

function calculateMatchResultForState(match, joueurs) {
  const blueWin = match.sb > match.sr;

  const teamBleu = joueurs.filter((j) => [match.b1, match.b2].includes(j.name));
  const teamRouge = joueurs.filter((j) =>
    [match.r1, match.r2].includes(j.name),
  );

  joueurs.forEach((j) => {
    if (typeof j.elo !== "number" || isNaN(j.elo)) {
      j.elo = APP_CONFIG.DEFAULT_ELO;
    }

    j.oldElo = j.elo;

    if (typeof j.oldElo !== "number" || isNaN(j.oldElo)) {
      j.oldElo = APP_CONFIG.DEFAULT_ELO;
    }

    if (!Array.isArray(j.history)) {
      j.history = [];
    }
  });

  updateElo2v2(teamBleu, teamRouge, blueWin ? 1 : 0);

  joueurs.forEach((j) => {
    j.history = j.history.filter((h) => typeof h === "string");
  });

  const simulationResult = [];

  for (const j of joueurs) {
    let wins = Number(j.wins) || 0;
    let losses = Number(j.losses) || 0;

    const isBlue = [match.b1, match.b2].includes(j.name);
    const isWinner = (isBlue && blueWin) || (!isBlue && !blueWin);

    if (isWinner) {
      wins++;
      j.history.push("🟢");
    } else {
      losses++;
      j.history.push("🔴");
    }

    if (j.history.length > APP_CONFIG.HISTORY_MAX_LENGTH) {
      j.history.shift();
    }

    j.wins = wins;
    j.losses = losses;

    const oldElo = j.oldElo ?? APP_CONFIG.DEFAULT_ELO;
    const newElo = j.elo ?? oldElo;

    simulationResult.push({
      name: j.name,
      oldElo,
      newElo,
      diff: newElo - oldElo,
      wins,
      losses,
      history: j.history,
    });
  }

  const snapshot = buildEloSnapshot(teamBleu, teamRouge);

  return {
    snapshot,
    debug: simulationResult,
  };
}

/**
 * Calcule et applique les nouvelles stats ELO/wins/losses/history
 * pour les 4 joueurs d'un match classique.
 *
 * Effectue les écritures Firestore (sauf en mode test).
 *
 * @param {{ b1, b2, r1, r2, sb, sr, type }} match
 * @returns {{ eloBefore, eloAfter, eloChange, debug }}
 */
export async function applyMatchResultToPlayers(match) {
  if (match.type === "tournament") {
    console.log("🚫 Match tournoi ignoré ELO global");
    return null;
  }

  const allPlayers = await getAllPlayers();
  const joueurs = buildPlayersStateFromSnapshot(allPlayers, match);

  if (joueurs.length === 0) {
    return {
      eloBefore: {},
      eloAfter: {},
      eloChange: {},
      debug: [],
    };
  }

  const result = calculateMatchResultForState(match, joueurs);

  if (!isTestMode()) {
    for (const j of joueurs) {
      if (!j.id) continue;

      const safeElo =
        typeof j.elo === "number" && !isNaN(j.elo)
          ? Math.round(j.elo)
          : APP_CONFIG.DEFAULT_ELO;

      const safeOldElo =
        typeof j.oldElo === "number" && !isNaN(j.oldElo)
          ? Math.round(j.oldElo)
          : APP_CONFIG.DEFAULT_ELO;

      const safeHistory = Array.isArray(j.history)
        ? j.history.filter((h) => typeof h === "string")
        : [];

      const payload = {
        wins: Number(j.wins) || 0,
        losses: Number(j.losses) || 0,
        elo: Number(safeElo) || APP_CONFIG.DEFAULT_ELO,
        lastDiff: Number(safeElo - safeOldElo) || 0,
        history: safeHistory,
      };

      try {
        await updatePlayer(j.id, payload);
      } catch (err) {
        console.error(`❌ Erreur sauvegarde pour ${j.name}:`, err.message);
      }
    }
  }

  return {
    ...result.snapshot,
    debug: result.debug,
  };
}
// =========================
// 🔧 REBUILD COMPLET DES STATS
// =========================

export async function rebuildAllStats() {
  console.log("🔧 Recalcul complet des stats...");

  const players = await getAllPlayers();
  const playersState = buildInitialMemoryPlayersState(players);

  const matches = await getAllMatches();

  matches.sort((a, b) => {
    const getTime = (m) => {
      if (m.createdAt?.toMillis) return m.createdAt.toMillis();
      if (m.createdAt?.seconds) return m.createdAt.seconds * 1000;
      if (m.createdAtLocal) return m.createdAtLocal;
      return 0;
    };

    return getTime(a) - getTime(b);
  });

  console.log(`📊 ${matches.length} matchs à rejouer`);

  for (const match of matches) {
    try {
      if (!match.b1 || !match.b2 || !match.r1 || !match.r2) continue;
      if (match.sb == null || match.sr == null) continue;
      if (match.type === "tournament") continue;

      const names = [match.b1, match.b2, match.r1, match.r2].filter(Boolean);
      const joueurs = playersState.filter((p) => names.includes(p.name));

      if (joueurs.length === 0) continue;

      const result = calculateMatchResultForState(match, joueurs);

      if (!isTestMode() && match.id && result?.snapshot) {
        await updateMatch(match.id, {
          eloBefore: result.snapshot.eloBefore ?? {},
          eloAfter: result.snapshot.eloAfter ?? {},
          eloChange: result.snapshot.eloChange ?? {},
          played: true,
        });
      }
    } catch (err) {
      console.error(`❌ Erreur sur le match ${match.id}`, err);
    }
  }

  if (!isTestMode()) {
    for (const playerState of playersState) {
      if (!playerState.id) continue;

      const safeElo =
        typeof playerState.elo === "number" && !isNaN(playerState.elo)
          ? Math.round(playerState.elo)
          : APP_CONFIG.DEFAULT_ELO;

      const safeOldElo =
        typeof playerState.oldElo === "number" && !isNaN(playerState.oldElo)
          ? Math.round(playerState.oldElo)
          : APP_CONFIG.DEFAULT_ELO;

      const safeHistory = Array.isArray(playerState.history)
        ? playerState.history.filter((h) => typeof h === "string")
        : [];

      await updatePlayer(playerState.id, {
        elo: Number(safeElo) || APP_CONFIG.DEFAULT_ELO,
        wins: Number(playerState.wins) || 0,
        losses: Number(playerState.losses) || 0,
        lastDiff: Number(safeElo - safeOldElo) || 0,
        history: safeHistory,
      });
    }
  }

  console.log("✅ Recalcul terminé");
  return true;
}
