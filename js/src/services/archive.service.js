// =========================
// 📦 ARCHIVE SERVICE
// =========================
// Logique métier des archives de saison : construction du snapshot de classement,
// backup/restauration ELO, comparaison entre deux archives.
// Ne touche jamais le DOM directement.

import { getAllPlayers, updatePlayer, resetPlayerElo } from "../repositories/players.repository.js";
import { deleteAllMatches } from "../repositories/matches.repository.js";
import { createArchive, getArchiveById } from "../repositories/archives.repository.js";

import { APP_CONFIG } from "../config/app.config.js";
import { buildDateKey, buildSeasonName } from "../utils/date.utils.js";
import { setEloBackup, getEloBackupFor, clearEloBackup } from "../core/state.js";

// =========================
// 📸 SNAPSHOT DE CLASSEMENT
// =========================

/**
 * Construit le classement trié (rank, name, wins, losses, elo) à partir
 * de la liste brute des joueurs.
 */
export function buildRankingSnapshot(players) {
  let ranking = players.map((p) => ({
    name: p.name || "Inconnu",
    wins: p.wins || 0,
    losses: p.losses || 0,
    elo: p.elo || APP_CONFIG.DEFAULT_ELO,
  }));

  ranking.sort((a, b) => b.elo - a.elo);

  return ranking.map((p, i) => ({ rank: i + 1, ...p }));
}

// =========================
// 💾 ARCHIVAGE + RESET COMPLET
// =========================

/**
 * Archive le classement actuel, supprime tous les matchs,
 * puis remet tous les joueurs à l'ELO de départ.
 *
 * @returns {{ success: boolean, error?: string }}
 */
export async function archiveAndResetSeason() {
  try {
    const players = await getAllPlayers();
    const ranking = buildRankingSnapshot(players);

    const dateKey = buildDateKey();
    const seasonName = buildSeasonName();

    await createArchive(dateKey, { seasonName, ranking });

    await deleteAllMatches();

    for (const p of players) {
      await resetPlayerElo(p.id);
    }

    return { success: true };
  } catch (error) {
    console.error("❌ archiveAndResetSeason error:", error);
    return { success: false, error: "Erreur lors du reset + archive" };
  }
}

// =========================
// 💾 BACKUP / RESTAURATION ELO (joueur par joueur)
// =========================

/**
 * Sauvegarde l'ELO/wins/losses actuels de tous les joueurs dans le state en mémoire.
 * Utilisé avant une opération destructive (ex: suppression de tournoi) pour
 * permettre une restauration manuelle ultérieure.
 */
export async function backupAllPlayersElo() {
  const players = await getAllPlayers();

  for (const p of players) {
    setEloBackup(p.name, {
      elo: p.elo,
      wins: p.wins,
      losses: p.losses,
      timestamp: Date.now(),
    });
  }
}

/**
 * Restaure l'ELO d'un joueur à partir du backup en mémoire.
 *
 * @returns {{ success: boolean, error?: string, elo?: number }}
 */
export async function restorePlayerEloFromBackup(playerName) {
  const backup = getEloBackupFor(playerName);

  if (!backup) {
    return { success: false, error: `❌ Aucun backup trouvé pour ${playerName}` };
  }

  const players = await getAllPlayers();
  const player = players.find(
    (p) => p.name?.toLowerCase() === playerName.toLowerCase(),
  );

  if (!player) {
    return { success: false, error: `❌ Joueur ${playerName} introuvable` };
  }

  await updatePlayer(player.id, {
    elo: backup.elo,
    wins: backup.wins,
    losses: backup.losses,
  });

  clearEloBackup(playerName);

  return { success: true, elo: backup.elo };
}

// =========================
// 📊 COMPARAISON D'ARCHIVES
// =========================

/**
 * Construit la liste de toutes les archives, triées par date décroissante,
 * avec un libellé d'affichage prêt à l'emploi.
 */
export function buildArchiveOptions(archives) {
  return archives
    .map((a) => ({
      id: a.id,
      date: a.seasonName || a.dateKey || a.id,
      createdAt: a.createdAt?.seconds || 0,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Compare deux archives et renvoie l'évolution d'ELO de chaque joueur présent
 * dans au moins une des deux, triée par évolution décroissante.
 *
 * @param {string} archiveIdA
 * @param {string} archiveIdB
 * @returns {Array<{name, before, after, diff}>|null}
 */
export async function compareArchives(archiveIdA, archiveIdB) {
  const archiveA = await getArchiveById(archiveIdA);
  const archiveB = await getArchiveById(archiveIdB);

  if (!archiveA || !archiveB) return null;

  const a = archiveA.ranking || [];
  const b = archiveB.ranking || [];

  const mapA = new Map(a.map((p) => [p.name, p.elo]));
  const mapB = new Map(b.map((p) => [p.name, p.elo]));

  const allNames = new Set([...mapA.keys(), ...mapB.keys()]);

  const evolution = [];

  allNames.forEach((name) => {
    const eloA = mapA.get(name) ?? APP_CONFIG.DEFAULT_ELO;
    const eloB = mapB.get(name) ?? APP_CONFIG.DEFAULT_ELO;

    evolution.push({
      name,
      before: eloA,
      after: eloB,
      diff: eloB - eloA,
    });
  });

  evolution.sort((x, y) => y.diff - x.diff);

  return evolution;
}
