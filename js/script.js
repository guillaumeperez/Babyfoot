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

  // 🔥 réinitialise les onglets du tournoi
  if (id === "tournament") {
    document
      .querySelectorAll(".tournament-tab")
      .forEach(el => {
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

function validatePlayer(){
  let input = document.getElementById("playerInput");
  let error = document.getElementById("playerError");
  let name = input.value.trim();

  const regex = /^[a-zA-Z0-9 ]+$/;

  error.style.display = "none";

  if(name === "") return;

  if(!regex.test(name)){
    error.textContent = "Caractères non autorisés !";
    error.style.display = "block";
  }
}

/* =========================
   ⚽ MESSAGE SCORE
========================= */

function showScoreMessage(text, color){
  let box = document.getElementById("scoreMessage");

  box.style.display = "block";
  box.style.background = color === "green" ? "#16a34a" : "#dc2626";
  box.style.color = "white";
  box.textContent = text;
}

/* =========================
   ⚽ LIMITER SCORE
========================= */

function limitScore(input){
  let value = parseInt(input.value);

  if(isNaN(value)) return;

  if(value > 10) input.value = 10;
  if(value < -10) input.value = -10;
}

/* =========================
   📜 HISTORIQUE
========================= */

// Ouvre l'historique
function openHistory() {
  openModal("history");

  // 🔥 Charger le filtre joueurs
  loadPlayersFilter();

  // 🔥 Charger les matchs
  loadMatches();
}


/* =========================
   👤 PROFIL JOUEUR
========================= */

window.openPlayerProfile = function(name) {
  alert("Profil de " + name);
};

/* =========================
   🏆 CLASSEMENT
========================= */

function openRanking(){
  if(window.loadRanking){
    window.loadRanking();
  }
  openModal("ranking");
}



document.querySelectorAll(".accordion").forEach(btn => {
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