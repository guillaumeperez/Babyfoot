// ⚙️ CONFIG
const K = 24;

// 📊 Probabilité
function getExpectedScore(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

// 🔥 ELO 2v2 AVEC HISTORY
function updateElo2v2(teamBleu, teamRouge, winBleu, matchId) {
  const eloBleu = (teamBleu[0].elo + teamBleu[1].elo) / 2;
  const eloRouge = (teamRouge[0].elo + teamRouge[1].elo) / 2;

  const expectedBleu = getExpectedScore(eloBleu, eloRouge);
  const expectedRouge = getExpectedScore(eloRouge, eloBleu);

  const diffBleu = K * (winBleu - expectedBleu);
  const diffRouge = K * (1 - winBleu - expectedRouge);

  const apply = (player, diff) => {
    const eloBefore = player.elo;

    player.elo = Math.round(player.elo + diff);

    if (!player.history) player.history = [];

    player.history.push({
      matchId,
      eloBefore,
      eloAfter: player.elo,
      diff: Math.round(diff),
    });
  };

  // 🔥 BLEU
  apply(teamBleu[0], diffBleu);
  apply(teamBleu[1], diffBleu);

  // 🔥 ROUGE
  apply(teamRouge[0], diffRouge);
  apply(teamRouge[1], diffRouge);
}

export { updateElo2v2 };
