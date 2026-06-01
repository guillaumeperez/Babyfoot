/* =========================
   🔧 MODALES
========================= */

let scrollY = 0;

// Ouvre une modale
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.style.display = "flex";

  // 🔥 sauvegarde position scroll
  scrollY = window.scrollY;

  document.body.classList.add("no-scroll");
  document.body.style.top = `-${scrollY}px`;

  // 🧹 Nettoyer le message et réinitialiser le formulaire de score
  if (id === "score") {
    clearScoreMessage?.();
    resetScoreForm?.();
    loadPlayersSelect?.();
  }

  // � Charger les demandes en attente pour le modal joueurs
  if (id === "players") {
    loadPendingRequests?.();
  }

  // �🔥 réinitialise les onglets du tournoi
  if (id === "tournament") {
    document.querySelectorAll(".tournament-tab").forEach((el) => {
      el.style.display = "none";
    });
    document.querySelector(".tournament-menu").style.display = "block";
    // Par défaut, ouvre la liste des tournois en cours / podium récent
    if (typeof openTournamentTab === "function") {
      openTournamentTab("active");
    }
    if (typeof loadTournaments === "function") {
      loadTournaments();
    }
  }
}

// Ferme une modale
function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.style.display = "none";

  document.body.classList.remove("no-scroll");

  // 🔥 restaure scroll
  document.body.style.top = "";
  window.scrollTo(0, scrollY);
}

/* =========================
   👥 VALIDATION JOUEUR
========================= */

function validatePlayer() {
  let input = document.getElementById("playerInput");
  let error = document.getElementById("playerError");
  let name = input.value.trim();

  const regex = /^[a-zA-Z0-9 ]+$/;

  error.style.display = "none";

  if (name === "") return;

  if (!regex.test(name)) {
    error.textContent = "Caractères non autorisés !";
    error.style.display = "block";
  }
}

/* =========================
   ⚽ MESSAGE SCORE
========================= */

// 🧹 Nettoyage des anciens timers
let scoreMessageTimer = null;

function showScoreMessage(text, color, duration = 5000) {
  let box = document.getElementById("scoreMessage");
  if (!box) return;

  // 🧹 Nettoyer l'ancien timer
  if (scoreMessageTimer) {
    clearTimeout(scoreMessageTimer);
  }

  box.style.display = "block";
  box.style.background =
    color === "green" ? "#16a34a" : color === "orange" ? "#f59e0b" : "#dc2626";
  box.style.color = "white";
  box.textContent = text;

  // ⏱️ Auto-disparition après duration
  scoreMessageTimer = setTimeout(() => {
    box.style.display = "none";
    scoreMessageTimer = null;
  }, duration);
}

// 🧹 Fonction pour nettoyer le message
function clearScoreMessage() {
  if (scoreMessageTimer) {
    clearTimeout(scoreMessageTimer);
    scoreMessageTimer = null;
  }
  let box = document.getElementById("scoreMessage");
  if (box) {
    box.style.display = "none";
    box.textContent = "";
  }
}

// 📝 Fonction pour réinitialiser le formulaire de score
function resetScoreForm() {
  const b1 = document.getElementById("b1");
  const b2 = document.getElementById("b2");
  const r1 = document.getElementById("r1");
  const r2 = document.getElementById("r2");
  const sb = document.getElementById("sb");
  const sr = document.getElementById("sr");

  if (b1) b1.value = "";
  if (b2) b2.value = "";
  if (r1) r1.value = "";
  if (r2) r2.value = "";
  if (sb) sb.value = "";
  if (sr) sr.value = "";
}

// =========================
// 🎯 ÉCOUTEURS FORMULAIRE SCORE
// =========================
// Nettoyer le message quand l'utilisateur modifie un champ
document.addEventListener("DOMContentLoaded", () => {
  const fieldsToWatch = ["b1", "b2", "r1", "r2", "sb", "sr"];

  fieldsToWatch.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener("input", clearScoreMessage);
      field.addEventListener("change", clearScoreMessage);
    }
  });
});

/* =========================
   ⚽ LIMITER SCORE
========================= */

function limitScore(input) {
  let value = parseInt(input.value);

  if (isNaN(value)) return;

  if (value > 10) input.value = 10;
  if (value < -10) input.value = -10;
}

/* =========================
   📋 DEMANDES EN ATTENTE
========================= */

// 📋 Charger et afficher les demandes en attente
async function loadPendingRequests() {
  const container = document.getElementById("pendingRequestsList");
  if (!container) return;

  try {
    container.innerHTML =
      "<p style='color: #6b7280; margin: 0;'>Chargement...</p>";

    // Charger les demandes depuis Firebase
    const demandesSnap = (await safeGetDocs?.(
      collection?.(db, "demandes"),
    )) || { empty: true, docs: [] };

    if (demandesSnap.empty) {
      container.innerHTML =
        "<p style='color: #16a34a; margin: 0;'>✅ Aucune demande en attente</p>";
      return;
    }

    // Construire la liste des demandes
    let html = "<div style='color: #1f2937;'>";
    demandesSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const name = data.name || "Inconnu";
      html += `<div style="padding: 4px 0;">• ${name}</div>`;
    });
    html += "</div>";

    container.innerHTML = html;
  } catch (e) {
    console.error("❌ Erreur chargement demandes :", e);
    container.innerHTML =
      "<p style='color: #dc2626; margin: 0;'>❌ Erreur lors du chargement</p>";
  }
}

/* =========================
   📜 HISTORIQUE
========================= */

// Ouvre l'historique ET la tendance (côte à côte)
function openHistory() {
  const history = document.getElementById("history");

  if (!history) return;

  // ouvre UNE SEULE modale
  history.style.display = "flex";

  // sauvegarde scroll
  scrollY = window.scrollY;

  document.body.classList.add("no-scroll");
  document.body.style.top = `-${scrollY}px`;

  // chargements
  loadPlayersFilter();

  if (typeof loadPlayersTrendFilter === "function") {
    loadPlayersTrendFilter();
  }

  if (typeof loadPlayerEloTrend === "function") {
    loadPlayerEloTrend();
  }
}

/* =========================
   👤 PROFIL JOUEUR
========================= */

window.openPlayerProfile = function (name) {
  alert("Profil de " + name);
};

/* =========================
   🏆 CLASSEMENT
========================= */

function openRanking() {
  if (window.loadRanking) {
    window.loadRanking();
  }
  openModal("ranking");
}

document.querySelectorAll(".accordion").forEach((btn) => {
  btn.addEventListener("click", function () {
    this.classList.toggle("active");

    const panel = this.nextElementSibling;

    if (!panel) return;

    if (panel.style.display === "block") {
      panel.style.display = "none";
    } else {
      panel.style.display = "block";
    }
  });
});

/* =========================
   🚀 INIT
========================= */

document.addEventListener("DOMContentLoaded", function () {
  console.log("SCRIPT OK");
});
