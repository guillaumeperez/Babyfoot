// =========================
// 🔥 IMPORTS FIREBASE
// =========================

// Initialise Firebase (obligatoire)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

// 📦 Base de données (Firestore)
import {
  getFirestore,      // connexion à la base
  collection,        // accès à une collection
  addDoc,            // ajouter document
  getDocs,           // lire documents
  updateDoc,         // modifier
  doc,               // cibler un document
  serverTimestamp,   // date automatique
  deleteDoc,         // supprimer
  query, 
  orderBy            // trier
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔐 Authentification (login admin)
import {
  getAuth,                       // initialise auth
  signInWithEmailAndPassword,   // login
  onAuthStateChanged            // détecte si connecté ou non
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


// =========================
// ⚙️ CONFIG FIREBASE
// =========================

// 🔑 Clés de ton projet Firebase (normal qu'elles soient visibles)
const firebaseConfig = {
  apiKey: "AIzaSyA-...",
  authDomain: "babyfoot-a78f5.firebaseapp.com",
  projectId: "babyfoot-a78f5",
  storageBucket: "babyfoot-a78f5.firebasestorage.app",
  messagingSenderId: "579925171552",
  appId: "1:579925171552:web:b6faf8313581b7b8dd5205"
};


// =========================
// 🚀 INITIALISATION
// =========================

// Lance Firebase
const app = initializeApp(firebaseConfig);

// Connexion à la base de données
const db = getFirestore(app);

// Connexion au système d'authentification
const auth = getAuth(app);


// 🔐 LOGIN ADMIN
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
// 👤 GESTION ADMIN
// =========================

// Variable globale : est-ce que l'utilisateur est admin ?
let isAdmin = false;

// 🔍 Firebase écoute si quelqu'un est connecté
onAuthStateChanged(auth, (user) => {

  if (user) {
    // ✅ Quelqu'un est connecté
    console.log("✅ Admin connecté :", user.email);

    isAdmin = true;

  } else {
    // ❌ Personne connecté
    console.log("❌ Pas connecté");

    isAdmin = false;
  }
});

// =========================
// 👥 PLAYERS
// =========================

window.loadPlayers = async function () {
  const list = document.getElementById("playerList");
  list.innerHTML = "";

  const snapshot = await getDocs(collection(db, "players"));

  snapshot.forEach((d) => {
    const p = d.data();

    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";

    const span = document.createElement("span");
    span.textContent = `${p.name} - ${p.points || 0} pts`;

    li.appendChild(span); // 🔥 IMPORTANT

    if (isAdmin) {
      const btn = document.createElement("button");
      btn.textContent = "🗑";
      btn.onclick = () => deletePlayer(d.id);
      li.appendChild(btn);
    }

    list.appendChild(li); // 🔥 IMPORTANT
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
// Joeur dans le menue
// =========================
window.loadPlayersSelect = async function () {
  const snapshot = await getDocs(collection(db, "players"));

  const selects = ["b1", "b2", "r1", "r2"];

  selects.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;

    select.innerHTML = "<option value=''>-- choisir --</option>";
  });

  snapshot.forEach(doc => {
    const player = doc.data();

    selects.forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;

      const option = document.createElement("option");
      option.value = player.name;
      option.textContent = player.name;

      select.appendChild(option);
    });
  });
};


// =========================
// ➕ ADD PLAYER
// =========================

window.addPlayer = async function () {
  const input = document.getElementById("playerInput");
  let name = input.value.trim().toLowerCase(); //première lettre en majuscule
  name = name.charAt(0).toUpperCase() + name.slice(1);

  if (!name) {
    showPlayerMessage("❌ Nom vide", "red");
    return;
  }

  // 🔍 récupérer les joueurs
  const snapshot = await getDocs(collection(db, "players"));

  // 🔍 vérifier doublon (insensible à la casse)
  const exists = snapshot.docs.some(
    d => d.data().name.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    showPlayerMessage("❌ Joueur déjà existant", "red");
    return;
  }

  try {
    await addDoc(collection(db, "players"), {
      name,
      points: 0,
      wins: 0,
      losses: 0
    });

    input.value = "";

    await loadPlayers();
    await loadPlayersBottom();
    await loadPlayersSelect();

    showPlayerMessage(`✅ Joueur ajouté : ${name}`, "green");

  } catch (error) {
    console.error(error);
    showPlayerMessage("❌ Erreur Firebase", "red");
  }
};

function showPlayerMessage(text, color) {
  const box = document.getElementById("playerMessage");

  box.style.display = "block";
  box.style.background = color === "green" ? "#16a34a" : "#dc2626";
  box.style.color = "white";
  box.textContent = text;

  // disparaît après 2 secondes
  setTimeout(() => {
    box.style.display = "none";
  }, 2000);
}

// =========================
// - Delete PLAYER
// =========================
window.deletePlayer = async function (id) {

  const confirmDelete = confirm("⚠️ Supprimer ce joueur ?");

  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "players", id));

    await loadPlayers();
    await loadPlayersBottom();
    await loadPlayersSelect();

    alert("✅ Joueur supprimé");

  } catch (e) {
    console.error(e);
    alert("❌ Erreur suppression");
  }
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

  // ❌ score invalide
  if (isNaN(sb) || isNaN(sr)) {
    showScoreMessage("❌ Score invalide", "red");
    return;
  }

  // ❌ champs vides
  if (!b1 || !b2 || !r1 || !r2) {
    showScoreMessage("❌ Choisis tous les joueurs", "red");
    return;
  }

  // ❌ doublons
  const players = [b1, b2, r1, r2];
  const uniquePlayers = new Set(players);

  if (uniquePlayers.size !== players.length) {
    showScoreMessage("❌ Joueur en double interdit", "red");
    return;
  }

  const match = {
    b1,
    b2,
    r1,
    r2,
    sb,
    sr,
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "matches"), match);

    await updatePlayerStats(match);

    showScoreMessage("✅ Match enregistré !", "green");

  } catch (e) {
    console.error(e);
    showScoreMessage("❌ Erreur Firebase", "red");
  }
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

  // 🔥 importer query + orderBy en haut de ton fichier !
  const q = query(collection(db, "matches"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  snapshot.forEach((d) => {
    const m = d.data();

    const li = document.createElement("li");

    li.innerHTML = `
      <b>${m.b1} ${m.b2}</b> (${m.sb}) 
      vs 
      <b>${m.r1} ${m.r2}</b> (${m.sr})
    `;

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
  loadPlayersSelect();
});