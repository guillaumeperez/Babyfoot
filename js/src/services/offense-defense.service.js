// =========================
// ⚡ OFFENSE / DEFENSE SERVICE
// =========================
// Logique pure et réutilisable pour calculer les statistiques
// offensives et défensives à partir du score d'un match.
// Aucun accès Firebase, aucun état global.

function clampScore(value) {
  const score = Number(value);
  return Number.isFinite(score) && !Number.isNaN(score)
    ? Math.max(0, score)
    : 0;
}

function calculateOffensePoints(score) {
  const goals = clampScore(score);
  if (goals >= 10) return 3;
  if (goals >= 8) return 2;
  if (goals >= 5) return 1;
  return 0;
}

function calculateDefensePoints(goalsConceded) {
  const conceded = clampScore(goalsConceded);
  if (conceded <= 2) return 3;
  if (conceded <= 5) return 2;
  if (conceded <= 7) return 1;
  return 0;
}

export function calculateOffenseDefense(blueScore, redScore) {
  const sb = clampScore(blueScore);
  const sr = clampScore(redScore);

  return {
    blueOffense: calculateOffensePoints(sb),
    blueDefense: calculateDefensePoints(sr),
    redOffense: calculateOffensePoints(sr),
    redDefense: calculateDefensePoints(sb),
  };
}
