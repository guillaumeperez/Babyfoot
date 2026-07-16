// =========================
// 🔥 CLOUD FUNCTIONS - BABYFOOT
// =========================
// Fonctions serveur Firebase pour automatiser les archives de saison

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialiser Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// =========================
// 📦 ARCHIVAGE AUTOMATIQUE - FIN DE MOIS
// =========================

/**
 * Cloud Function HTTP déclenchée par Cloud Scheduler
 * S'exécute le dernier jour du mois à 23h00
 *
 * Configuration Cloud Scheduler:
 * - Frequency: "0 23 28-31 * *" (chaque jour 28-31 du mois à 23h UTC)
 * - Timezone: UTC
 * - HTTP Method: POST
 * - URL: https://[REGION]-[PROJECT-ID].cloudfunctions.net/archiveSeasonAtMonthEnd
 * - Auth: OIDC Token, avec Service Account approprié
 */
exports.archiveSeasonAtMonthEnd = functions.https.onRequest(
  async (req, res) => {
    try {
      // === Vérifier que c'est bien le dernier jour du mois ===
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Si demain est le 1er du mois, alors aujourd'hui est le dernier jour
      if (tomorrow.getDate() !== 1) {
        return res.status(200).json({
          success: false,
          message: "❌ Pas le dernier jour du mois",
          today: now.toISOString().split("T")[0],
        });
      }

      console.log("📦 Début archivage automatique de fin de mois...");

      // === Récupérer tous les joueurs ===
      const playersSnapshot = await db.collection("players").get();
      const players = playersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // === Construire le snapshot de classement ===
      const ranking = buildRankingSnapshot(players);

      // === Créer l'archive ===
      const seasonName = buildSeasonName();
      const now_timestamp = admin.firestore.Timestamp.now();

      const archiveRef = db.collection("archives").doc();
      await archiveRef.set({
        seasonName,
        ranking,
        createdAt: now_timestamp,
        archivedBy: "auto-scheduler",
      });

      console.log(`✅ Archive créée: ${seasonName}`);

      // === Supprimer tous les matchs ===
      const matchesSnapshot = await db.collection("matches").get();
      const batch = db.batch();

      matchesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`✅ ${matchesSnapshot.size} matchs supprimés`);

      // === Reset ELO pour tous les joueurs ===
      const DEFAULT_ELO = 2000;

      const playerBatch = db.batch();
      for (const p of players) {
        playerBatch.update(db.collection("players").doc(p.id), {
          elo: DEFAULT_ELO,
          wins: 0,
          losses: 0,
          lastDiff: 0,
          history: [],
        });
      }

      await playerBatch.commit();
      console.log(`✅ ELO reset pour ${players.length} joueurs`);

      // === Succès ===
      return res.status(200).json({
        success: true,
        message: `✅ Archive ${seasonName} créée, matchs supprimés, ELO reset`,
        archiveId: archiveRef.id,
        playersReset: players.length,
        matchesDeleted: matchesSnapshot.size,
      });
    } catch (error) {
      console.error("❌ Erreur archivage automatique:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// =========================
// 🛠️ UTILITAIRES
// =========================

/**
 * Construit le classement trié à partir de la liste brute des joueurs
 */
function buildRankingSnapshot(players) {
  let ranking = players.map((p) => ({
    name: p.name || "Inconnu",
    wins: p.wins || 0,
    losses: p.losses || 0,
    elo: p.elo || 2000,
  }));

  ranking.sort((a, b) => b.elo - a.elo);

  return ranking.map((p, i) => ({ rank: i + 1, ...p }));
}

/**
 * Génère un libellé de saison au format "Saison Janvier 2025"
 */
function buildSeasonName() {
  const months = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];

  const now = new Date();
  const monthIndex = now.getMonth();
  const year = now.getFullYear();

  return `Saison ${months[monthIndex]} ${year}`;
}
