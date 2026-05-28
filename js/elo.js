// ⚙️ CONFIG
const K = 24;

// 📊 Probabilité
function getExpectedScore(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

// 🔥 ELO 2v2
function updateElo2v2(teamBleu, teamRouge, winBleu) {
  const eloBleu = (teamBleu[0].elo + teamBleu[1].elo) / 2;
  const eloRouge = (teamRouge[0].elo + teamRouge[1].elo) / 2;

  const expectedBleu = getExpectedScore(eloBleu, eloRouge);
  const expectedRouge = getExpectedScore(eloRouge, eloBleu);

  const diffBleu = K * (winBleu - expectedBleu);
  const diffRouge = K * (1 - winBleu - expectedRouge);

  // 🔥 IMPORTANT : modification DIRECTE
  teamBleu[0].elo += diffBleu;
  teamBleu[1].elo += diffBleu;

  teamRouge[0].elo += diffRouge;
  teamRouge[1].elo += diffRouge;

  // arrondi
  teamBleu.forEach((p) => (p.elo = Math.round(p.elo)));
  teamRouge.forEach((p) => (p.elo = Math.round(p.elo)));
}

export { updateElo2v2 };
