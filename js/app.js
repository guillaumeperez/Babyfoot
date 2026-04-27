// =========================
// Firebase INIT
// =========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("🔥 APP JS CHARGÉ");
window.test = "OK";

// =========================
// CONFIG FIREBASE
// =========================

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

console.log("🔥 FIREBASE OK");

// =========================
// 👥 PLAYERS
// =========================

window.loadPlayers = async function () {
  const list = document.getElementById("playerList");
  if (!list) return;

  list.innerHTML = "";

  const snapshot = await getDocs(collection(db, "players"));

  snapshot.forEach((d) => {
    const p = d.data();
    const li = document.createElement("li");
    li.textContent = `${p.name} - ${p.points || 0} pts`;
    list.appendChild(li);
  });
};

window.loadPlayersBottom = async function () {
  const list = document.getElementById("playersBottomList");
  if (!list) return;

  list.innerHTML = "";

  const snapshot = await getDocs(collection(db, "players"));

  snapshot.forEach((d) => {
    const p = d.data();
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
  await loadPlayersBottom();
};

// =========================
// 💾 SAVE MATCH
// =========================

window.saveMatch = async function () {
  const sb = parseInt(document.getElementById("sb").value);
  const sr = parseInt(document.getElementById("sr").value);

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

  console.log("✅ MATCH ENREGISTRÉ");

  await updatePlayerStats(match);
};

// =========================
// 📊 UPDATE STATS
// =========================

async function updatePlayerStats(match) {
  const blueWin = match.sb > match.sr;

  const snapshot = await getDocs(collection(db, "players"));

  snapshot.forEach(async (d) => {
    const player = d.data();
    const id = d.id;

    let update = {
      wins: player.wins || 0,
      losses: player.losses || 0
    };

    const isBlue = [match.b1, match.b2].includes(player.name);
    const isRed = [match.r1, match.r2].includes(player.name);

    if (!isBlue && !isRed) return;

    if (isBlue) {
      if (blueWin) update.wins++;
      else update.losses++;
    }

    if (isRed) {
      if (!blueWin) update.wins++;
      else update.losses++;
    }

    update.points = update.wins - update.losses;

    await updateDoc(doc(db, "players", id), update);
  });

  loadPlayers();
  loadPlayersBottom();
}

// =========================
// 📜 MATCHES
// =========================

window.loadMatches = async function () {
  const list = document.getElementById("matchHistory");
  if (!list) return;

  list.innerHTML = "";

  const snapshot = await getDocs(collection(db, "matches"));

  snapshot.forEach((d) => {
    const m = d.data();

    const li = document.createElement("li");
    li.textContent = `${m.b1} ${m.b2} (${m.sb}) vs ${m.r1} ${m.r2} (${m.sr})`;

    list.appendChild(li);
  });
};

// =========================
// 🏆 RANKING
// =========================

window.loadRanking = async function () {
  const tbody = document.getElementById("rankingList");
  const podium = document.getElementById("podium");

  if (!tbody || !podium) return;

  tbody.innerHTML = "";
  podium.innerHTML = "";

  const snapshot = await getDocs(collection(db, "players"));

  let players = [];

  snapshot.forEach((d) => players.push(d.data()));

  players.sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));

  const medals = ["🥇", "🥈", "🥉"];

  players.slice(0, 3).forEach((p, i) => {
    const div = document.createElement("div");
    div.textContent = `${medals[i]} ${p.name}`;
    podium.appendChild(div);
  });

  players.forEach((p, i) => {
    const tr = document.createElement("tr");

    const wins = p.wins || 0;
    const losses = p.losses || 0;
    const points = wins - losses;

    const progress =
      wins + losses === 0 ? 0 : Math.round((wins / (wins + losses)) * 100);

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td>${wins}</td>
      <td>${losses}</td>
      <td><b>${points}</b></td>
      <td>
        <div style="background:#ddd;height:8px;border-radius:5px;">
          <div style="width:${progress}%;height:100%;background:#4f46e5;"></div>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
};

// =========================
// 💬 COMMENTS
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

window.loadComments = async function () {
  const list = document.getElementById("commentList");
  if (!list) return;

  list.innerHTML = "";

  const snapshot = await getDocs(collection(db, "comments"));

  snapshot.forEach((d) => {
    const c = d.data();
    const li = document.createElement("li");
    li.textContent = c.text;
    list.appendChild(li);
  });
};

// =========================
// INIT
// =========================

document.addEventListener("DOMContentLoaded", () => {
  loadPlayers();
  loadPlayersBottom();
  loadMatches();
  loadComments();
});