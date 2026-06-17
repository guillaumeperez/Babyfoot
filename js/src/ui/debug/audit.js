// =========================
// 🧪 AUDIT APP
// =========================
// Outil de diagnostic manuel (à lancer depuis la console : auditApp()).
// Vérifie la cohérence des données Firestore par rapport au vrai schéma
// de l'application : matches { b1, b2, r1, r2, sb, sr }, players { name, elo, wins, losses }.
// N'écrit jamais dans Firestore, lecture uniquement.

import { db } from "../../core/firebase.client.js";
import { isTestMode } from "../../core/state.js";

import {
  getDocs,
  collection,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function auditApp() {
  console.log("🧪 === AUDIT APP START ===");

  // =========================
  // 1. TEST MODE CHECK
  // =========================
  console.log("⚙️ Test mode =", isTestMode());

  try {
    // =========================
    // 2. FETCH DATA
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
    // 3. MATCH VALIDATION
    // =========================
    // Vrai schéma : { b1, b2, r1, r2, sb, sr }
    const badMatches = matches.filter((m) => {
      const hasTeams = m.b1 && m.b2 && m.r1 && m.r2;
      const hasScore =
        m.sb != null && m.sr != null && !isNaN(m.sb) && !isNaN(m.sr);
      return !hasTeams || !hasScore;
    });

    if (badMatches.length) {
      console.warn("❌ Matches invalides détectés :", badMatches);
    } else {
      console.log("✅ Matches OK");
    }

    // =========================
    // 4. DUPLICATE PLAYERS
    // =========================
    const names = players.map((p) => p.name?.toLowerCase()).filter(Boolean);
    const duplicates = names.filter((name, i) => names.indexOf(name) !== i);

    if (duplicates.length) {
      console.warn("⚠️ Doublons joueurs :", duplicates);
    } else {
      console.log("✅ Pas de doublons joueurs");
    }

    // =========================
    // 5. PLAYER STATS VALIDATION
    // =========================
    const badPlayers = players.filter((p) => {
      return (
        !p ||
        p.elo == null ||
        isNaN(p.elo) ||
        p.wins == null ||
        isNaN(p.wins) ||
        p.losses == null ||
        isNaN(p.losses)
      );
    });

    if (badPlayers.length) {
      console.warn("❌ Joueurs avec stats cassées :", badPlayers);
    } else {
      console.log("✅ Stats joueurs OK");
    }

    // =========================
    // 6. ACTIVE STATE CHECK
    // =========================
    const inactiveStillVisible = players.filter(
      (p) => p.active === false && p.elo != null,
    );

    if (inactiveStillVisible.length) {
      console.warn(
        "⚠️ Joueurs désactivés mais encore actifs :",
        inactiveStillVisible,
      );
    } else {
      console.log("✅ Active state OK");
    }

    // =========================
    // 7. ELO CONSISTENCY CHECK
    // =========================
    const totalWins = players.reduce((sum, p) => sum + (p.wins || 0), 0);
    const totalLosses = players.reduce((sum, p) => sum + (p.losses || 0), 0);

    console.log("📈 Total wins:", totalWins);
    console.log("📉 Total losses:", totalLosses);

    if (totalWins !== totalLosses) {
      console.warn("⚠️ Déséquilibre wins/losses → possible double update ELO");
    } else {
      console.log("✅ Cohérence ELO OK");
    }

    console.log("🧪 === AUDIT END ===");
  } catch (err) {
    console.error("❌ AUDIT ERROR:", err);
  }
}

// Exposé en console pour un lancement manuel : auditApp()
window.auditApp = auditApp;
