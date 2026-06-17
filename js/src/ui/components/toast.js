// =========================
// 🔔 TOAST COMPONENT
// =========================
// Remplace showPlayerMessage(), showScoreMessage() et alert() dispersés
// par une interface unifiée : Toast.success(msg), Toast.error(msg), Toast.warning(msg).
//
// Utilise les éléments #playerMessage et #scoreMessage existants dans le DOM
// si présents, sinon retombe sur alert() pour ne jamais perdre un message.

const COLORS = {
  green: "#16a34a",
  orange: "#f59e0b",
  red: "#dc2626",
};

// Timer dédié au message de score : sans ça, un ancien setTimeout peut
// masquer un message qui vient juste d'être affiché par un appel suivant.
let _scoreMessageTimer = null;

function showInBox(boxId, text, color, durationMs) {
  const box = document.getElementById(boxId);

  if (!box) {
    // Pas de zone d'affichage dédiée dans cette page -> fallback simple
    alert(text);
    return;
  }

  box.style.display = "block";
  box.style.background = COLORS[color] || COLORS.red;
  box.textContent = text;

  if (durationMs) {
    setTimeout(() => {
      box.style.display = "none";
    }, durationMs);
  }
}

export const Toast = {
  /**
   * Message générique (alert natif), utilisé pour les confirmations d'action
   * qui n'ont pas de zone d'affichage dédiée (ex: admin).
   */
  success(text) {
    alert(text);
  },

  error(text) {
    alert(text);
  },

  /**
   * Message dans la zone #playerMessage (formulaire d'ajout de joueur).
   */
  player(text, level = "red", durationMs = 2000) {
    showInBox("playerMessage", text, level, durationMs);
  },

  /**
   * Message dans la zone #scoreMessage (formulaire de saisie de score).
   * Annule proprement tout timer de masquage précédent avant d'afficher
   * le nouveau message, comme dans script.js (showScoreMessage).
   */
  score(text, level = "red", durationMs = 5000) {
    const box = document.getElementById("scoreMessage");

    if (!box) {
      alert(text);
      return;
    }

    if (_scoreMessageTimer) {
      clearTimeout(_scoreMessageTimer);
      _scoreMessageTimer = null;
    }

    box.style.display = "block";
    box.style.background = COLORS[level] || COLORS.red;
    box.style.color = "white";
    box.textContent = text;

    if (durationMs) {
      _scoreMessageTimer = setTimeout(() => {
        box.style.display = "none";
        _scoreMessageTimer = null;
      }, durationMs);
    }
  },

  /**
   * Efface le message de score affiché et annule le timer en cours.
   */
  clearScore() {
    if (_scoreMessageTimer) {
      clearTimeout(_scoreMessageTimer);
      _scoreMessageTimer = null;
    }

    const box = document.getElementById("scoreMessage");
    if (box) {
      box.style.display = "none";
      box.textContent = "";
    }
  },
};
