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
  const names = [match.b1, match.b2, match.r1, match.r2].filter(Boolean);

  let joueurs = [];

  for (const p of allPlayers) {
    if (!p?.name) continue;
    if (typeof p.elo !== "number") continue;
    if (!names.includes(p.name)) continue;

    joueurs.push({
      id: p.id,
      name: p.name,
      oldElo: p.elo ?? APP_CONFIG.DEFAULT_ELO,
      elo: p.elo ?? APP_CONFIG.DEFAULT_ELO,
      wins: p.wins ?? 0,
      losses: p.losses ?? 0,
      history: Array.isArray(p.history) ? [...p.history] : [],
    });
  }

  // Dédoublonnage : garder le joueur avec l'ID le plus long (auto-généré)
  const seen = new Map();
  for (const j of joueurs) {
    if (!seen.has(j.name) || j.id.length > seen.get(j.name).id.length) {
      seen.set(j.name, j);
    }
  }
  joueurs = Array.from(seen.values());

  const blueWin = match.sb > match.sr;

  const teamBleu = joueurs.filter((j) => [match.b1, match.b2].includes(j.name));
  const teamRouge = joueurs.filter((j) =>
    [match.r1, match.r2].includes(j.name),
  );

  // Sécurité : ELO valides
  [...teamBleu, ...teamRouge].forEach((j) => {
    if (typeof j.elo !== "number" || isNaN(j.elo))
      j.elo = APP_CONFIG.DEFAULT_ELO;
    if (typeof j.oldElo !== "number" || isNaN(j.oldElo))
      j.oldElo = APP_CONFIG.DEFAULT_ELO;
  });

  updateElo2v2(teamBleu, teamRouge, blueWin ? 1 : 0);

  // Garde uniquement les entrées d'historique au format string (🟢/🔴)
  joueurs.forEach((j) => {
    j.history = j.history.filter((h) => typeof h === "string");
  });

  const simulationResult = [];

  for (const j of joueurs) {
    let wins = j.wins;
    let losses = j.losses;

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

    if (!isTestMode() && j.id) {
      const safeElo =
        typeof newElo === "number" && !isNaN(newElo)
          ? Math.round(newElo)
          : APP_CONFIG.DEFAULT_ELO;

      const safeOldElo =
        typeof oldElo === "number" && !isNaN(oldElo)
          ? Math.round(oldElo)
          : APP_CONFIG.DEFAULT_ELO;

      const safeHistory = Array.isArray(j.history)
        ? j.history.filter((h) => typeof h === "string")
        : [];

      const payload = {
        wins: Number(wins) || 0,
        losses: Number(losses) || 0,
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

  const snapshot = buildEloSnapshot(teamBleu, teamRouge);

  return {
    ...snapshot,
    debug: simulationResult,
  };
}
// =========================
// 🔧 REBUILD COMPLET DES STATS
// =========================

export async function rebuildAllStats() {
  console.log("🔧 Recalcul complet des stats...");

  const players = await getAllPlayers();

  // =========================
  // 🔁 RESET TO CLEAN STATE
  // =========================
  // IMPORTANT : on ne fait PAS de write async dans la boucle + logique stable

  for (const p of players) {
    await updatePlayer(p.id, {
      elo: APP_CONFIG.DEFAULT_ELO, // 2000
      wins: 0,
      losses: 0,
      lastDiff: 0,
      history: [],
    });
  }

  // =========================
  // 📊 LOAD ALL MATCHES
  // =========================

  const matches = await getAllMatches();

  // =========================
  // 📅 SORT MATCHES (CRUCIAL FIX)
  // =========================
  // On sécurise le tri (timestamp fallback propre)

  matches.sort((a, b) => {
    const getTime = (m) => {
      if (m.createdAt?.seconds) return m.createdAt.seconds;
      if (m.createdAt?.toMillis) return m.createdAt.toMillis();
      if (m.createdAtLocal) return m.createdAtLocal;
      return 0;
    };

    return getTime(a) - getTime(b);
  });

  console.log(`📊 ${matches.length} matchs à rejouer`);

  // =========================
  // ⚽ REPLAY ALL MATCHES
  // =========================
  // IMPORTANT : on rejoue uniquement via applyMatchResultToPlayers

  for (const match of matches) {
    try {
      // sécurité minimale
      if (!match.b1 || !match.b2 || !match.r1 || !match.r2) continue;
      if (match.sb == null || match.sr == null) continue;

      const result = await applyMatchResultToPlayers(match);

      if (!isTestMode() && match.id && result) {
        await updateMatch(match.id, {
          eloBefore: result.eloBefore ?? {},
          eloAfter: result.eloAfter ?? {},
          eloChange: result.eloChange ?? {},
          played: true,
        });
      }
    } catch (err) {
      console.error(`❌ Erreur sur le match ${match.id}`, err);
    }
  }

  // =========================
  // ✅ END
  // =========================

  console.log("✅ Recalcul terminé");
  return true;
}
