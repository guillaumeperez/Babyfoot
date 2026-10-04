// =========================
// 🏆 TOURNAMENT SERVICE
// =========================
// Logique métier des tournois : génération des équipes, génération des matchs,
// calcul du classement, détection de fin de tournoi.
// Ne touche jamais le DOM directement.

import {
  getTournamentTeams,
  addTeamToTournament,
  addMatchToTournament,
  getTournamentMatches,
  updateTeam,
  updateTournament,
  getTournamentById,
  deleteAllTeams,
  deleteAllTournamentMatches,
  deleteTournament as deleteTournamentDoc,
} from "../repositories/tournaments.repository.js";

import { getAllPlayers } from "../repositories/players.repository.js";
import { backupAllPlayersElo } from "./archive.service.js";

import { APP_CONFIG } from "../config/app.config.js";
import { validateTournamentScore } from "../utils/validation.utils.js";
import { getTimestampDate, isRecent } from "../utils/date.utils.js";

// =========================
// 👥 GÉNÉRATION DES ÉQUIPES
// =========================

/**
 * Génère les équipes d'un tournoi selon le mode choisi.
 *
 * @param {string} tournamentId
 * @param {"random"|"elo"|"manual"} mode
 * @param {Array|null} manualTeamsData - requis si mode === "manual"
 */
export async function generateTeams(tournamentId, mode, manualTeamsData) {
  // =========================
  // 👥 MODE MANUEL
  // =========================
  if (mode === "manual" && Array.isArray(manualTeamsData)) {
    const teams = manualTeamsData.map((team) => ({
      player1: team.player1,
      player2: team.player2 || "",
      teamName: team.teamName,
      points: 0,
      wins: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    }));

    for (const team of teams) {
      await addTeamToTournament(tournamentId, team);
    }

    return { success: true };
  }

  let players = await getAllPlayers();

  if (players.length < APP_CONFIG.TOURNAMENT_MIN_PLAYERS) {
    return { success: false, error: "Pas assez de joueurs" };
  }

  // =========================
  // 🔀 MODE ALÉATOIRE
  // =========================
  if (mode === "random") {
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }
  }

  // =========================
  // ⚖️ MODE ELO
  // =========================
  if (mode === "elo") {
    players.sort((a, b) => (b.elo || APP_CONFIG.DEFAULT_ELO) - (a.elo || APP_CONFIG.DEFAULT_ELO));

    const balanced = [];
    const pool = [...players];

    while (pool.length > 1) {
      const strong = pool.shift();
      const weak = pool.pop();
      balanced.push(strong, weak);
    }

    players = balanced;
  }

  // =========================
  // 👥 CRÉATION ÉQUIPES (pairs successives)
  // =========================
  const teams = [];

  for (let i = 0; i < players.length; i += 2) {
    if (!players[i + 1]) break;

    teams.push({
      player1: players[i].name,
      player2: players[i + 1].name,
      teamName: `${players[i].name} & ${players[i + 1].name}`,
      points: 0,
      wins: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    });
  }

  for (const team of teams) {
    await addTeamToTournament(tournamentId, team);
  }

  return { success: true, teamsCount: teams.length };
}

// =========================
// ⚔️ GÉNÉRATION DES MATCHS
// =========================

/**
 * Génère tous les matchs d'un tournoi (round-robin, simple ou aller/retour).
 */
export async function generateMatches(tournamentId, doubleRound) {
  const teams = await getTournamentTeams(tournamentId);
  const matches = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        blueTeamId: teams[i].id,
        blueTeamName: `${teams[i].player1}/${teams[i].player2}`,
        redTeamId: teams[j].id,
        redTeamName: `${teams[j].player1}/${teams[j].player2}`,
        sb: null,
        sr: null,
        played: false,
      });

      if (doubleRound) {
        matches.push({
          blueTeamId: teams[j].id,
          blueTeamName: `${teams[j].player1}/${teams[j].player2}`,
          redTeamId: teams[i].id,
          redTeamName: `${teams[i].player1}/${teams[i].player2}`,
          sb: null,
          sr: null,
          played: false,
        });
      }
    }
  }

  for (const match of matches) {
    await addMatchToTournament(tournamentId, match);
  }

  return matches.length;
}

// =========================
// 🏗️ CRÉATION COMPLÈTE D'UN TOURNOI
// =========================

/**
 * Construit le payload de configuration d'un tournoi à partir des valeurs brutes du formulaire.
 */
export function buildTournamentConfig({ name, mode, doubleRound, winPoints, lossPoints, offBonus, defBonus }) {
  return {
    name,
    mode,
    doubleRound: !!doubleRound,
    winPoints: parseInt(winPoints) || 3,
    lossPoints: parseInt(lossPoints) || 0,
    offBonus: parseInt(offBonus) || 1,
    defBonus: parseInt(defBonus) || 1,
  };
}

/**
 * Valide les équipes manuelles : pas de joueur en double, pas de doublon entre équipes,
 * minimum 2 équipes.
 *
 * @throws {Error} avec un message lisible si invalide
 */
export function validateManualTeams(manualTeamsData) {
  const usedPlayers = new Set();

  for (const team of manualTeamsData) {
    if (!team.player1 || !team.player2) {
      throw new Error("Missing player");
    }

    if (team.player1 === team.player2) {
      throw new Error("Same players");
    }

    if (usedPlayers.has(team.player1) || usedPlayers.has(team.player2)) {
      throw new Error("Duplicate player");
    }

    usedPlayers.add(team.player1);
    usedPlayers.add(team.player2);
  }

  if (manualTeamsData.length < APP_CONFIG.TOURNAMENT_MIN_TEAMS) {
    throw new Error("Au moins 2 équipes nécessaires");
  }
}

// =========================
// 📊 CLASSEMENT
// =========================

/**
 * Trie les équipes par points, puis différence de buts, puis buts marqués.
 */
export function sortTeamsByRanking(teams) {
  return [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;

    const diffA = a.goalsFor - a.goalsAgainst;
    const diffB = b.goalsFor - b.goalsAgainst;

    if (diffB !== diffA) return diffB - diffA;

    return b.goalsFor - a.goalsFor;
  });
}

/**
 * Valide et applique le résultat d'un match de tournoi :
 * met à jour les points/stats des deux équipes selon le barème du tournoi.
 *
 * @returns {{ success: boolean, error?: string }}
 */
export async function applyTournamentMatchResult(tournamentId, match) {
  if (match.type === "classic") {
    return { success: false, error: "Match classique ignoré dans tournoi" };
  }

  const tournament = await getTournamentById(tournamentId);
  if (!tournament) {
    return { success: false, error: "Tournoi introuvable" };
  }

  const winPoints = tournament.winPoints || 3;
  const lossPoints = tournament.lossPoints || 0;
  const offBonus = tournament.offBonus || 1;
  const defBonus = tournament.defBonus || 1;

  const teams = await getTournamentTeams(tournamentId);

  const blueTeam = teams.find((t) => t.id === match.blueTeamId);
  const redTeam = teams.find((t) => t.id === match.redTeamId);

  if (!blueTeam || !redTeam) {
    return { success: false, error: "Équipes introuvables" };
  }

  let bluePoints = 0;
  let redPoints = 0;

  if (match.sb > match.sr) {
    bluePoints += winPoints;
    redPoints += lossPoints;
    blueTeam.wins++;
    redTeam.losses++;
  } else {
    redPoints += winPoints;
    bluePoints += lossPoints;
    redTeam.wins++;
    blueTeam.losses++;
  }

  if (match.sb >= APP_CONFIG.MAX_SCORE) bluePoints += offBonus;
  if (match.sr >= APP_CONFIG.MAX_SCORE) redPoints += offBonus;

  if (match.sb < match.sr && match.sb >= APP_CONFIG.MAX_SCORE - 1) {
    bluePoints += defBonus;
  }

  if (match.sr < match.sb && match.sr >= APP_CONFIG.MAX_SCORE - 1) {
    redPoints += defBonus;
  }

  blueTeam.points += bluePoints;
  redTeam.points += redPoints;

  blueTeam.goalsFor += match.sb;
  blueTeam.goalsAgainst += match.sr;

  redTeam.goalsFor += match.sr;
  redTeam.goalsAgainst += match.sb;

  await updateTeam(blueTeam.ref, {
    points: blueTeam.points,
    wins: blueTeam.wins,
    losses: blueTeam.losses,
    goalsFor: blueTeam.goalsFor,
    goalsAgainst: blueTeam.goalsAgainst,
  });

  await updateTeam(redTeam.ref, {
    points: redTeam.points,
    wins: redTeam.wins,
    losses: redTeam.losses,
    goalsFor: redTeam.goalsFor,
    goalsAgainst: redTeam.goalsAgainst,
  });

  return { success: true };
}

/**
 * Valide un score de match de tournoi (délègue à validation.utils).
 */
export function validateTournamentMatchScore(sb, sr) {
  return validateTournamentScore(sb, sr);
}

// =========================
// 🏁 FIN DE TOURNOI
// =========================

/**
 * Détermine le vainqueur d'un tournoi et l'enregistre dans le document tournoi.
 *
 * @returns {string|null} le nom du vainqueur ("player1/player2") ou null
 */
export async function storeTournamentWinner(tournamentId) {
  const teams = await getTournamentTeams(tournamentId);

  if (teams.length === 0) return null;

  const sorted = sortTeamsByRanking(teams);
  const winner = sorted[0];
  const winnerName = `${winner.player1}/${winner.player2}`;

  await updateTournament(tournamentId, { winnerName });

  return winnerName;
}

/**
 * Vérifie si tous les matchs d'un tournoi ont été joués.
 * Si oui : marque le tournoi comme terminé et enregistre le vainqueur.
 *
 * @returns {{ finished: boolean, winnerName?: string|null }}
 */
export async function checkTournamentFinished(tournamentId) {
  const matches = await getTournamentMatches(tournamentId);

  const total = matches.length;
  const played = matches.filter((m) => m.played).length;

  if (total > 0 && total === played) {
    const winnerName = await storeTournamentWinner(tournamentId);

    await updateTournament(tournamentId, {
      status: "finished",
      finishedAt: new Date(),
      winnerName,
    });

    return { finished: true, winnerName };
  }

  return { finished: false };
}

// =========================
// 🗑️ SUPPRESSION DE TOURNOI
// =========================

/**
 * Supprime un tournoi avec ses équipes et matchs.
 * Effectue un backup ELO de tous les joueurs avant suppression
 * (permet une annulation manuelle ultérieure).
 */
export async function deleteTournamentWithCleanup(tournamentId) {
  await backupAllPlayersElo();

  await deleteAllTournamentMatches(tournamentId);
  await deleteAllTeams(tournamentId);
  await deleteTournamentDoc(tournamentId);
}

// =========================
// 📅 CLASSIFICATION DES TOURNOIS
// =========================

/**
 * Classe un tournoi en "actif", "récent" (terminé il y a moins de 48h) ou "historique".
 *
 * @returns {"active"|"recent"|"history"}
 */
export function classifyTournament(tournament) {
  const isFinished = tournament.status === "finished";

  if (!isFinished) return "active";

  const finishedAt = getTimestampDate(tournament.finishedAt);
  const recent = finishedAt && isRecent(tournament.finishedAt, APP_CONFIG.TOURNAMENT_RECENT_THRESHOLD_MS);

  return recent ? "recent" : "history";
}
