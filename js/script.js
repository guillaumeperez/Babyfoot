/* =========================
   🔧 MODALES
========================= */

function openModal(id){
  document.getElementById(id).style.display="block";

  if(id === "score"){
    window.loadPlayersSelect();
  }
}

function closeModal(id){
  document.getElementById(id).style.display="none";
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
    return;
  }
}

/* =========================
   👥 Confirmation et Suppression JOUEUR
========================= */


/* =========================
   ⚽ SCORE MESSAGE
========================= */

function showScoreMessage(text, color){

  let box = document.getElementById("scoreMessage");

  box.style.display = "block";
  box.style.background = color === "green" ? "#16a34a" : "#dc2626";
  box.style.color = "white";
  box.textContent = text;
}

/* =========================
   ⚽ LIMIT SCORE
========================= */

function limitScore(input){

  let value = parseInt(input.value);

  if(isNaN(value)) return;

  if(value > 10) input.value = 10;
  if(value < -10) input.value = -10;
}

/* =========================
   📜 MATCH HISTORY (TEMPORAIRE UI)
========================= */

function openHistory(){
  openModal("history");
  window.loadMatches(); // 🔥 appelle Firebase
}

/* =========================
   🏆 RANKING (TEMPORAIRE)
========================= */

function openRanking(){
  window.loadRanking();
  openModal("ranking");
}

/* =========================
   🚀 INIT
========================= */

document.addEventListener("DOMContentLoaded", function () {
  console.log("SCRIPT OK");
});