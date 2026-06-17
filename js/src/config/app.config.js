// =========================
// ⚙️ CONFIGURATION MÉTIER
// =========================
// Toutes les constantes de l'application sont ici.
// Pour changer une valeur (ex: ELO de départ), tu ne touches qu'ici.

export const APP_CONFIG = {
  // --- ELO ---
  DEFAULT_ELO: 2000,
  ELO_K_FACTOR: 24,

  // --- SCORES ---
  MAX_SCORE: 10,
  MIN_SCORE: 0,

  // --- ANTI-SPAM ---
  MATCH_SAVE_COOLDOWN_MS: 10_000, // 10 secondes entre deux matchs

  // --- TOURNOIS ---
  TOURNAMENT_RECENT_THRESHOLD_MS: 48 * 60 * 60 * 1000, // 48h
  TOURNAMENT_MIN_TEAMS: 2,
  TOURNAMENT_MIN_PLAYERS: 4,

  // --- HISTORIQUE JOUEUR ---
  HISTORY_MAX_LENGTH: 5, // nb de résultats affichés dans la forme

  // --- ADMIN ---
  ADMIN_EMAIL: "guillaumeper34@gmail.com",

  // --- COLLECTIONS FIRESTORE ---
  COLLECTIONS: {
    PLAYERS: "players",
    MATCHES: "matches",
    TOURNAMENTS: "tournaments",
    ARCHIVES: "archives",
    REQUESTS: "demandes",
    COMMENTS: "comments",
  },
};
