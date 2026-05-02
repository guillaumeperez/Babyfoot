// =========================
// 🔥 IMPORTS FIREBASE
// =========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  deleteDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { updateElo2v2 } from "./elo.js";

// =========================
// ⚙️ CONFIG FIREBASE
// =========================
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "babyfoot-a78f5.firebaseapp.com",
  projectId: "babyfoot-a78f5",
  storageBucket: "babyfoot-a78f5.firebasestorage.app",
  messagingSenderId: "579925171552",
  appId: "1:579925171552:web:b6faf8313581b7b8dd5205"
};

// =========================
// 🚀 INIT
// =========================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// =========================
// 🔐 LOGIN ADMIN
// =========================
window.loginAdmin = async function () {
  const email = prompt("Email admin");
  const password = prompt("Mot de passe");

  if (!email || !password) return;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("✅ Connecté !");
  } catch (e) {
    console.error(e);
    alert("❌ Erreur connexion");
  }
};

// =========================
// 👤 ADMIN STATE
// =========================
let isAdmin = false;

onAuthStateChanged(auth, (user) => {
  isAdmin = !!user;
});

// =========================
// 👥 LISTE BAS (ELO)
// =========================
window.loadPlayersBottom = async function () {
  const list = document.getElementById("playersBottomList");
  if (!list) return;

  list.innerHTML = "";

  const snapshot = await getDocs(collection(db, "players"));

  let players = [];
  snapshot.forEach(d => players.push(d.data()));

  players.sort((a, b) => (b.elo || 0) - (a.elo || 0));

  players.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.name} : ${p.elo || 2000}`;
    list.appendChild(li);
  });
};

// =========================
// 🎯 SELECT JOUEURS
// =========================
window.loadPlayersSelect = async function () {
  const snapshot = await getDocs(collection(db, "players"));
  const selects = ["b1", "b2", "r1", "r2"];

  selects.forEach(id => {
    const select = document.getElementById(id);
    if (select) select.innerHTML = "<option value=''>-- choisir --</option>";
  });

  snapshot.forEach(doc => {
    const p = doc.data();

    selects.forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;

      const option = document.createElement("option");
      option.value = p.name;
      option.textContent = p.name;
      select.appendChild(option);
    });
  });
};

// =========================
// ➕ ADD PLAYER
// =========================
window.addPlayer = async function () {
  const input = document.getElementById("playerInput");
  let name = input.value.trim();

  if (!name) return showPlayerMessage("❌ Nom vide", "red");

  name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

  const snapshot = await getDocs(collection(db, "players"));

  const exists = snapshot.docs.some(
    d => d.data().name.toLowerCase() === name.toLowerCase()
  );

  if (exists) return showPlayerMessage("❌ Joueur déjà existant", "red");

  await addDoc(collection(db, "players"), {
    name,
    wins: 0,
    losses: 0,
    elo: 2000
  });

  input.value = "";

  await loadPlayersBottom();
  await loadPlayersSelect();

  showPlayerMessage(`✅ ${name} ajouté`, "green");
};

function showPlayerMessage(text, color) {
  const box = document.getElementById("playerMessage");
  if (!box) return;

  box.style.display = "block";
  box.style.background = color === "green" ? "#16a34a" : "#dc2626";
  box.textContent = text;

  setTimeout(() => box.style.display = "none", 2000);
}

// =========================
// 🗑 DELETE PLAYER
// =========================
window.deletePlayer = async function (id) {
  if (!confirm("Supprimer ?")) return;

  await deleteDoc(doc(db, "players", id));

  loadPlayersBottom();
  loadPlayersSelect();
};

// =========================
// 💾 SAVE MATCH
// =========================
window.saveMatch = async function () {
  const sb = parseInt(document.getElementById("sb").value);
  const sr = parseInt(document.getElementById("sr").value);

  const b1 = document.getElementById("b1").value;
  const b2 = document.getElementById("b2").value;
  const r1 = document.getElementById("r1").value;
  const r2 = document.getElementById("r2").value;

  if (isNaN(sb) || isNaN(sr)) return showScoreMessage("❌ Score invalide", "red");

  const players = [b1, b2, r1, r2];
  if (players.includes("")) return showScoreMessage("❌ Choisis tous les joueurs", "red");

  if (new Set(players).size !== 4)
    return showScoreMessage("❌ Joueur en double", "red");

  const match = {
    b1,
    b2,
    r1,
    r2,
    sb,
    sr,
    createdAt: serverTimestamp(),
    createdAtLocal: Date.now() // 🔥 IMPORTANT
  };

  await addDoc(collection(db, "matches"), match);
  await updatePlayerStats(match);

  // 🔥 recharge direct l'historique
  await loadMatches();

  showScoreMessage("✅ Match enregistré", "green");
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

  snapshot.forEach((d) => {
    const data = d.data();

    players.push({
      name: data.name || "Inconnu",
      wins: data.wins || 0,
      losses: data.losses || 0,
      elo: data.elo || 2000,
      lastDiff: data.lastDiff || 0,
      history: data.history || []
    });
  });

  // 🔥 DEBUG
  console.log("JOUEURS :", players);

  if (players.length === 0) {
    tbody.innerHTML = "<tr><td colspan='7'>Aucun joueur</td></tr>";
    return;
  }

  // 🔥 TRI PAR ELO
  players.sort((a, b) => b.elo - a.elo);

  
  // 🏆 PODIUM MODERNE
const top3 = players.slice(0, 3);

top3.forEach((p, i) => {
  const div = document.createElement("div");

  div.classList.add("podium-box");

  if (i === 0) div.classList.add("podium-1");
  if (i === 1) div.classList.add("podium-2");
  if (i === 2) div.classList.add("podium-3");

  const medal = ["🥇", "🥈", "🥉"][i];

  div.innerHTML = `
    <div style="font-size:24px">${medal}</div>
    <span>${p.name}</span>
    <span>${p.elo || 2000}</span>
  `;

  podium.appendChild(div);
});

  // 📊 TABLEAU
  players.forEach((p, i) => {

    const diff = p.lastDiff || 0;
    const diffText = diff > 0 ? "+" + diff : diff;

    let color = "white";
    if (diff > 0) color = "#22c55e";
    if (diff < 0) color = "#ef4444";

    const form = p.history.map(r => r === "W" ? "🟢" : "🔴").join("");

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td>${p.wins}</td>
      <td>${p.losses}</td>
      <td><b>${p.elo}</b></td>
      <td style="color:${color}; font-weight:bold;">${diffText}</td>
      <td>${form}</td>
    `;

    tbody.appendChild(tr);
  });
};

// =========================
// 📊 UPDATE ELO
// =========================
async function updatePlayerStats(match) {

  const snapshot = await getDocs(collection(db, "players"));
  let joueurs = [];

  snapshot.forEach(d => {
    const p = d.data();
    if ([match.b1, match.b2, match.r1, match.r2].includes(p.name)) {
      joueurs.push({ ...p, id: d.id, oldElo: p.elo || 2000, history: p.history || [] });
    }
  });

  const teamBleu = joueurs.filter(j => [match.b1, match.b2].includes(j.name));
  const teamRouge = joueurs.filter(j => [match.r1, match.r2].includes(j.name));

  const blueWin = match.sb > match.sr ? 1 : 0;

  updateElo2v2(teamBleu, teamRouge, blueWin);

  for (const j of joueurs) {

    let wins = j.wins || 0;
    let losses = j.losses || 0;

    const isBlue = [match.b1, match.b2].includes(j.name);

    if ((isBlue && blueWin) || (!isBlue && !blueWin)) {
      wins++;
      j.history.push("W");
    } else {
      losses++;
      j.history.push("L");
    }

    if (j.history.length > 5) j.history.shift();

    await updateDoc(doc(db, "players", j.id), {
      wins,
      losses,
      elo: j.elo,
      lastDiff: Math.round(j.elo - j.oldElo),
      history: j.history
    });
  }

  loadPlayersBottom();
}

// =========================
// 📜 MATCHES
// =========================
window.loadMatches = async function () {
  const list = document.getElementById("matchHistory");
  if (!list) return;

  list.innerHTML = "";

  const selectedPlayer = document.getElementById("historyPlayerFilter")?.value?.toLowerCase() || "";
  const resultFilter = document.getElementById("historyResultFilter")?.value || "";

  const q = query(collection(db, "matches"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  console.log("NB MATCHS:", snapshot.size);

  snapshot.forEach(d => {
    const m = d.data();

    const players = [m.b1, m.b2, m.r1, m.r2]
      .filter(p => p)
      .map(p => p.toLowerCase());

    // 🔥 filtre joueur
    if (selectedPlayer && !players.includes(selectedPlayer)) return;

    // 🔥 déterminer victoire / défaite
    let isWin = false;

    if (selectedPlayer) {
      const inBlue = m.b1?.toLowerCase() === selectedPlayer || m.b2?.toLowerCase() === selectedPlayer;
      const inRed = m.r1?.toLowerCase() === selectedPlayer || m.r2?.toLowerCase() === selectedPlayer;

      if (inBlue) {
        isWin = m.sb > m.sr;
      } else if (inRed) {
        isWin = m.sr > m.sb;
      }
    }

    // 🔥 filtre résultat
    if (selectedPlayer) {
       if (resultFilter === "win" && !isWin) return;
       if (resultFilter === "loss" && isWin) return;
}

    const li = document.createElement("li");
    li.classList.add("match-card");

    const blueWin = m.sb > m.sr;

    let date = "Date inconnue";
    if (m.createdAt?.seconds) {
      date = new Date(m.createdAt.seconds * 1000)
        .toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit"
        });
    } else if (m.createdAtLocal) {
      date = new Date(m.createdAtLocal)
        .toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit"
        });
    }

    li.innerHTML = `
      <div class="match-row team-blue">
        <span>🔵 ${m.b1}-${m.b2}</span>
        <span class="score">${m.sb} ${blueWin ? "🏆" : ""}</span>
      </div>

      <div class="match-row team-red">
        <span>🔴 ${m.r1}-${m.r2}</span>
        <span class="score">${m.sr} ${!blueWin ? "🏆" : ""}</span>
      </div>

      <div class="date">
        📅 ${date}
      </div>
    `;

    list.appendChild(li);
  });
};


// =========================
// 📜 FILTER
// =========================
window.loadPlayersFilter = async function () {
  const select = document.getElementById("historyPlayerFilter");
  if (!select) return;

  select.innerHTML = "<option value=''>-- Choisir joueur --</option>";

  const snapshot = await getDocs(collection(db, "players"));

  snapshot.forEach(doc => {
    const p = doc.data();
    const option = document.createElement("option");
    option.value = p.name;
    option.textContent = p.name;
    select.appendChild(option);
  });
};

// =========================
// Commentaire
// =========================
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
// 🚀 INIT
// =========================
document.addEventListener("DOMContentLoaded", () => {
  loadPlayersBottom();
  loadMatches();
  loadComments();
  loadPlayersSelect();
});