// =========================
// 🧪 FULL AUDIT SYSTEM
// =========================
// Outil de diagnostic global (à lancer depuis la console : auditAll())
// Vérifie : matches, players, stats, ELO simulation
// N'écrit jamais dans Firestore (lecture uniquement)

import { db } from "../../core/firebase.client.js";
import { isTestMode } from "../../core/state.js";

import {
  getDocs,
  collection,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ⚠️ IMPORTANT : on utilise TON vrai moteur ELO
import { updateElo2v2 } from "../../services/elo.service.js";

/**
 * 🔁 WRAPPER COMPATIBLE AUDIT
 * transforme updateElo2v2 (mutation directe) en simulateur exploitable
 */
function computeElo(params) {
  const { b1, b2, r1, r2, sb, sr, players } = params;

  const teamBleu = [players.get(b1), players.get(b2)];
  const teamRouge = [players.get(r1), players.get(r2)];

  if (!teamBleu[0] || !teamBleu[1] || !teamRouge[0] || !teamRouge[1]) {
    return null;
  }

  const winBleu = sb > sr ? 1 : 0;

  // copie des joueurs pour simulation safe (évite mutation audit)
  const before = new Map();
  for (const [id, p] of players.entries()) {
    before.set(id, p.elo);
  }

  // ⚠️ mutation réelle MAIS sur copie locale uniquement
  updateElo2v2(teamBleu, teamRouge, winBleu);

  const updatedPlayers = new Map();

  [...teamBleu, ...teamRouge].forEach((p) => {
    updatedPlayers.set(p.id, p.elo);
  });

  // restore safety (évite pollution audit)
  for (const [id, elo] of before.entries()) {
    const p = players.get(id);
    if (p) p.elo = elo;
  }

  return { updatedPlayers };
}

// =========================
// 🧪 MAIN AUDIT
// =========================

export async function auditAll() {
  console.log("🧪 === FULL AUDIT START ===");
  console.log("⚙️ Test mode =", isTestMode());

  try {
    // =========================
    // 1. FETCH DATA
    // =========================
    const [matchesSnap, playersSnap] = await Promise.all([
      getDocs(collection(db, "matches")),
      getDocs(collection(db, "players")),
    ]);

    const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    console.log("📊 Matches:", matches.length);
    console.log("👥 Players:", players.length);

    // =========================
    // 2. MATCH VALIDATION
    // =========================
    const badMatches = matches.filter((m) => {
      const hasTeams = m.b1 && m.b2 && m.r1 && m.r2;
      const hasScore =
        m.sb != null && m.sr != null && !isNaN(m.sb) && !isNaN(m.sr);

      return !hasTeams || !hasScore;
    });

    if (badMatches.length) {
      console.warn("❌ Matches invalides :", badMatches);
    } else {
      console.log("✅ Matches OK");
    }

    // =========================
    // 3. PLAYERS VALIDATION
    // =========================
    const names = players.map((p) => p.name?.toLowerCase()).filter(Boolean);
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);

    if (duplicates.length) {
      console.warn("⚠️ Doublons joueurs :", duplicates);
    } else {
      console.log("✅ Pas de doublons joueurs");
    }

    const badPlayers = players.filter(
      (p) =>
        !p ||
        p.elo == null ||
        isNaN(p.elo) ||
        p.wins == null ||
        isNaN(p.wins) ||
        p.losses == null ||
        isNaN(p.losses),
    );

    if (badPlayers.length) {
      console.warn("❌ Joueurs invalides :", badPlayers);
    } else {
      console.log("✅ Stats joueurs OK");
    }

    // =========================
    // 4. ACTIVE CHECK
    // =========================
    const inactiveVisible = players.filter(
      (p) => p.active === false && p.elo != null,
    );

    if (inactiveVisible.length) {
      console.warn("⚠️ Joueurs désactivés encore visibles :", inactiveVisible);
    } else {
      console.log("✅ Active state OK");
    }

    // =========================
    // 5. GLOBAL STATS CHECK
    // =========================
    const totalWins = players.reduce((s, p) => s + (p.wins || 0), 0);
    const totalLosses = players.reduce((s, p) => s + (p.losses || 0), 0);

    console.log("📈 Total wins:", totalWins);
    console.log("📉 Total losses:", totalLosses);

    if (totalWins !== totalLosses) {
      console.warn("⚠️ Déséquilibre wins/losses (possible bug ELO)");
    } else {
      console.log("✅ Cohérence stats OK");
    }

    // =========================
    // 6. ELO SIMULATION
    // =========================
    const map = new Map();

    players.forEach((p) => {
      map.set(p.id, {
        name: p.name,
        oldElo: p.elo,
        newElo: p.elo,
      });
    });

    for (const m of matches) {
      if (!m.b1 || !m.b2 || !m.r1 || !m.r2) continue;
      if (m.sb == null || m.sr == null) continue;

      const result = computeElo({
        ...m,
        players: map,
      });

      if (result?.updatedPlayers) {
        for (const [id, newElo] of result.updatedPlayers) {
          const p = map.get(id);
          if (p) p.newElo = newElo;
        }
      }
    }

    const report = Array.from(map.values()).map((p) => ({
      name: p.name,
      oldElo: p.oldElo,
      newElo: p.newElo,
      diff: p.newElo - p.oldElo,
    }));

    report.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    console.table(report);

    const extreme = report.filter((p) => Math.abs(p.diff) > 300);

    if (extreme.length) {
      console.warn("⚠️ GROS ÉCARTS ELO :", extreme);
    } else {
      console.log("✅ ELO cohérent");
    }

    console.log("🧪 === FULL AUDIT END ===");

    return report;
  } catch (err) {
    console.error("❌ AUDIT ERROR:", err);
  }
}

// expose console
window.auditAll = auditAll;
