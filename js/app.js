// Pour Firebase JS SDK v7.20.0 and later, measurementId is optional

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore,  collection,  addDoc,  getDocs} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA-B2_flq7AmCCr3I6iigHRbKLuS3gMSrY",
  authDomain: "babyfoot-a78f5.firebaseapp.com",
  projectId: "babyfoot-a78f5",
  storageBucket: "babyfoot-a78f5.firebasestorage.app",
  messagingSenderId: "579925171552",
  appId: "1:579925171552:web:b6faf8313581b7b8dd5205"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("FIREBASE OK");

// =========================
// 👥 LOAD PLAYERS
// =========================
window.loadPlayers = async function () {
  const list = document.getElementById("playerList");
  list.innerHTML = "";

  const snapshot = await getDocs(collection(db, "players"));

  snapshot.forEach(doc => {
    const p = doc.data();

    const li = document.createElement("li");
    li.textContent = `${p.name} - ${p.points || 0} pts`;

    list.appendChild(li);
  });
};

window.loadPlayersBottom = async function () {
  const list = document.getElementById("playersBottomList");
  list.innerHTML = "";

  const snapshot = await getDocs(collection(db, "players"));

  snapshot.forEach(doc => {
    const p = doc.data();

    const li = document.createElement("li");
    li.textContent = `${p.name} - ${p.points || 0} pts`;

    list.appendChild(li);
  });
};

// =========================
// ➕ ADD PLAYER
// =========================
window.addPlayer = async function () {
  const input = document.getElementById("playerInput");
  const name = input.value.trim();

  if (!name) return;

  await addDoc(collection(db, "players"), {
    name,
    points: 0,
    wins: 0,
    losses: 0
  });

  input.value = "";

  await loadPlayers();
  await loadPlayersBottom(); // 👈 IMPORTANT
};

// =========================
// Ajout score
// =========================
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

window.saveMatch = async function () {

  let sb = parseInt(document.getElementById("sb").value);
  let sr = parseInt(document.getElementById("sr").value);

  if (isNaN(sb) || isNaN(sr)) return;

  const match = {
    b1: document.getElementById("b1").value,
    b2: document.getElementById("b2").value,
    r1: document.getElementById("r1").value,
    r2: document.getElementById("r2").value,
    sb,
    sr,
    createdAt: serverTimestamp()
  };

  await addDoc(collection(db, "matches"), match);

  console.log("MATCH ENREGISTRÉ");

  updatePlayerStats(match);
};

// =========================
// Mise à jour des joueurs pour le score
// =========================
async function updatePlayerStats(match) {

  let blueWin = match.sb > match.sr;

  const allPlayersSnap = await getDocs(collection(db, "players"));

  allPlayersSnap.forEach(async (docSnap) => {
    const player = docSnap.data();
    const id = docSnap.id;

    let update = {};

    let isBlue = [match.b1, match.b2].includes(player.name);
    let isRed = [match.r1, match.r2].includes(player.name);

    if (!isBlue && !isRed) return;

    if (isBlue) {
      update.wins = player.wins || 0;
      update.losses = player.losses || 0;

      if (blueWin) update.wins++;
      else update.losses++;
    }

    if (isRed) {
      update.wins = player.wins || 0;
      update.losses = player.losses || 0;

      if (!blueWin) update.wins++;
      else update.losses++;
    }

    update.points = (update.wins || 0) - (update.losses || 0);

    await updateDoc(doc(db, "players", id), update);
  });

  loadPlayers();
  loadPlayersBottom();
};

// =========================
// HISTORIQUE MATCHS
// =========================

window.loadMatches = async function () {
  const list = document.getElementById("matchHistory");
  list.innerHTML = "";

  const snapshot = await getDocs(collection(db, "matches"));

  snapshot.forEach(doc => {
    const m = doc.data();

    const li = document.createElement("li");
    li.textContent =
      `${m.b1} ${m.b2} (${m.sb}) vs ${m.r1} ${m.r2} (${m.sr})`;

    list.appendChild(li);
  });
};

// =========================
// Classement MAJ
// =========================
window.loadRanking = async function () {

  const tbody = document.getElementById("rankingList");
  const podium = document.getElementById("podium");

  tbody.innerHTML = "";
  podium.innerHTML = "";

  const snapshot = await getDocs(collection(db, "players"));

  let players = [];

  snapshot.forEach(doc => {
    players.push(doc.data());
  });

  // 🧠 TRI
  players.sort((a, b) => {
    const pa = (a.wins || 0) - (a.losses || 0);
    const pb = (b.wins || 0) - (b.losses || 0);
    return pb - pa;
  });

  // 🏆 PODIUM (TOP 3)
  const medals = ["🥇", "🥈", "🥉"];

  players.slice(0, 3).forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "podium";
    div.textContent = `${medals[i]} ${p.name}`;
    podium.appendChild(div);
  });

  // 📊 TABLEAU
  players.forEach((p, index) => {

    let wins = p.wins || 0;
    let losses = p.losses || 0;
    let points = wins - losses;

    let tr = document.createElement("tr");

    let progress = wins + losses === 0
      ? 0
      : Math.round((wins / (wins + losses)) * 100);

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${p.name}</td>
      <td>${wins}</td>
      <td>${losses}</td>
      <td><b>${points}</b></td>
      <td>
        <div style="background:#ddd;height:8px;border-radius:5px;overflow:hidden;">
          <div style="width:${progress}%;height:100%;background:#4f46e5;"></div>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
};

// =========================
// Commentaire
// =========================
window.addComment = async function () {
  const input = document.getElementById("commentInput");
  const text = input.value.trim();

  if (!text) return;

  await addDoc(collection(db, "comments"), {
    text,
    createdAt: serverTimestamp()
  });

  input.value = "";

  loadComments();
};
// =========================
// Charcher le commentaire
// =========================
window.loadComments = async function () {
  const list = document.getElementById("commentList");
  list.innerHTML = "";

  const snapshot = await getDocs(collection(db, "comments"));

  snapshot.forEach(doc => {
    const c = doc.data();

    const li = document.createElement("li");
    li.textContent = c.text;

    list.appendChild(li);
  });
};


// initialisation
document.addEventListener("DOMContentLoaded", () => {
  loadPlayers();
  loadPlayersBottom();
  loadMatches();
  loadComments();
});