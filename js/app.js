let isTest =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"; 

window.currentTournamentId = null;

window.toggleTestMode = function () {
  isTest = !isTest;

  document.body.style.border = isTest ? "5px solid red" : "none";

  if (isTest) {
  console.log("%c🧪 MODE TEST ACTIVÉ", "color:red; font-size:16px;");
} else {
  console.log("%c🚀 MODE PROD ACTIVÉ", "color:green; font-size:16px;");
}

  alert("Mode test : " + (isTest ? "ON" : "OFF"));
};

// =========================
// 🔥 IMPORTS FIREBASE
// =========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  serverTimestamp,
  deleteDoc,
  query,
  orderBy,
  setDoc
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
  apiKey: "AIzaSyA-B2_flq7AmCCr3I6iigHRbKLuS3gMSrY",
  authDomain: "babyfoot-a78f5.firebaseapp.com",
  projectId: "babyfoot-a78f5",
  storageBucket: "babyfoot-a78f5.firebasestorage.app",
  messagingSenderId: "579925171552",
  appId: "1:579925171552:web:b6faf8313581b7b8dd5205"
};

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
  const panel = document.getElementById("adminPanel");
  if (!panel) return; // 🔥 important

  if (user && user.email === "guillaumeper34@gmail.com") {
    isAdmin = true;
    panel.style.display = "block";
    afficherDemandes();
  } else {
    isAdmin = false;
    panel.style.display = "none";
  }
});

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

  if (isTest) {
    return showPlayerMessage("🧪 Mode test activé", "red");
  }

  // 🔍 Vérifie si déjà en attente
  const snapshot = await getDocs(collection(db, "demandes"));

  const exists = snapshot.docs.some(
    d => d.data().name.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    return showPlayerMessage("⏳ Déjà en attente de validation", "orange");
  }

  await addDoc(collection(db, "demandes"), {
    name: name,
    date: new Date()
  });

  input.value = "";

  showPlayerMessage(`📩 Demande envoyée pour ${name}`, "green");
};

window.addComment = async function () {
  const textarea = document.getElementById("commentInput");
  const text = textarea?.value.trim();

  if (!text) return;

  await addDoc(collection(db, "comments"), {
    text,
    createdAt: serverTimestamp()
  });

  textarea.value = "";
  await loadComments();
};

function showPlayerMessage(text, color) {
  const box = document.getElementById("playerMessage");
  if (!box) return;

  box.style.display = "block";
  box.style.background =
    color === "green"
      ? "#16a34a"
      : color === "orange"
      ? "#f59e0b"
      : "#dc2626";
  box.textContent = text;

  setTimeout(() => box.style.display = "none", 2000);
}

// =========================
// Afficher les demandes des joueurs
// =========================

window.afficherDemandes = async function () {
  const container = document.getElementById("listeDemandes");
  container.innerHTML = "";

  const snapshot = await getDocs(collection(db, "demandes"));

  if (snapshot.empty) {
    container.innerHTML = "Aucune demande";
    return;
  }

  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    const div = document.createElement("div");
    div.style.marginBottom = "10px";

    div.innerHTML = `
  <span style="font-weight:bold;">
    ${data.name}
  </span>

  <button onclick="validerDemande('${docSnap.id}', '${data.name}')">
    ✅
  </button>

  <button onclick="refuserDemande('${docSnap.id}')">
    ❌
  </button>
`;

    container.appendChild(div);
  });
};

window.refuserDemande = async function (id) {
  await deleteDoc(doc(db, "demandes", id));

  alert("❌ Demande refusée");

  afficherDemandes();
};

// =========================
// valider demandes des joueurs
// =========================

window.validerDemande = async function (id, name) {
  // Ajoute dans players
  await setDoc(doc(db, "players", name.toLowerCase()), {
    name: name,
    wins: 0,
    losses: 0,
    elo: 2000
  });

  // Supprime la demande
  await deleteDoc(doc(db, "demandes", id));

  alert(`✅ ${name} validé`);

  // Recharge la liste
  afficherDemandes();

  // Recharge les joueurs
  loadPlayersSelect();
};

// =========================
// 🗑 DELETE PLAYER
// =========================
window.deletePlayer = async function (id) {
  if (!confirm("Supprimer ?")) return;
  if (isTest) return;

  await deleteDoc(doc(db, "players", id));

  loadPlayersSelect();
};

// =========================
// 💾 BACKUP & RESTORE ELO
// =========================
window.eloBackup = {}; // stocke les backups

window.backupPlayerELO = async function (playerName) {
  const playerRef = doc(db, "players", playerName.toLowerCase());
  const playerSnap = await getDoc(playerRef);
  
  if (playerSnap.exists()) {
    eloBackup[playerName.toLowerCase()] = {
      elo: playerSnap.data().elo,
      wins: playerSnap.data().wins,
      losses: playerSnap.data().losses,
      timestamp: Date.now()
    };
  }
};

window.backupAllPlayersELO = async function () {
  const snapshot = await getDocs(collection(db, "players"));
  snapshot.forEach(docSnap => {
    const name = docSnap.id;
    eloBackup[name] = {
      elo: docSnap.data().elo,
      wins: docSnap.data().wins,
      losses: docSnap.data().losses,
      timestamp: Date.now()
    };
  });
};

window.restorePlayerELO = async function (playerName) {
  const key = playerName.toLowerCase();
  
  if (!eloBackup[key]) {
    alert("❌ Aucun backup trouvé pour " + playerName);
    return;
  }

  const backup = eloBackup[key];
  
  try {
    await updateDoc(doc(db, "players", key), {
      elo: backup.elo,
      wins: backup.wins,
      losses: backup.losses
    });
    
    alert(`✅ ELO restauré pour ${playerName}\n⚖️ ${backup.elo} pts`);
    delete eloBackup[key];
  } catch (e) {
    console.error(e);
    alert("❌ Erreur restauration");
  }
};

// =========================
// 🗑 DELETE MATCH (with ELO restore)
// =========================
window.deleteMatch = async function (matchId) {
  if (!isAdmin) {
    alert("❌ Admin requis");
    return;
  }

  if (!confirm("Supprimer ce match et restaurer ELO ?")) return;

  try {
    const matchRef = doc(db, "matches", matchId);
    const matchSnap = await getDoc(matchRef);

    if (!matchSnap.exists()) {
      alert("❌ Match non trouvé");
      return;
    }

    const match = matchSnap.data();

    // 🔥 backup ELO des joueurs concernés
    if (match.blueTeam) {
      await backupPlayerELO(match.blueTeam.player1);
      await backupPlayerELO(match.blueTeam.player2);
    }
    if (match.redTeam) {
      await backupPlayerELO(match.redTeam.player1);
      await backupPlayerELO(match.redTeam.player2);
    }

    // Delete match
    await deleteDoc(matchRef);

    // 🔥 restore ELO si match était joué
    if (match.played) {
      if (match.blueTeam) {
        await restorePlayerELO(match.blueTeam.player1);
        await restorePlayerELO(match.blueTeam.player2);
      }
      if (match.redTeam) {
        await restorePlayerELO(match.redTeam.player1);
        await restorePlayerELO(match.redTeam.player2);
      }
    }

    alert("✅ Match supprimé (ELO restauré si joué)");
    loadMatches();

  } catch (e) {
    console.error(e);
    alert("❌ Erreur suppression");
  }
};

// =========================
// 🗑 DELETE TOURNAMENT
// =========================
window.deleteTournament = async function (tournamentId) {
  if (!isAdmin) {
    alert("❌ Admin requis");
    return;
  }

  if (!confirm("Supprimer ce tournoi ?\n⚠️ Les matchs et équipes seront aussi supprimés")) return;

  try {
    // backup all players ELO first
    await backupAllPlayersELO();

    // Delete matches
    const matchesSnapshot = await getDocs(
      collection(db, "tournaments", tournamentId, "matches")
    );
    for (const matchDoc of matchesSnapshot.docs) {
      await deleteDoc(matchDoc.ref);
    }

    // Delete teams
    const teamsSnapshot = await getDocs(
      collection(db, "tournaments", tournamentId, "teams")
    );
    for (const teamDoc of teamsSnapshot.docs) {
      await deleteDoc(teamDoc.ref);
    }

    // Delete tournament
    await deleteDoc(doc(db, "tournaments", tournamentId));

    alert("✅ Tournoi supprimé\n💾 ELO en backup pour annulation");
    loadTournaments();

  } catch (e) {
    console.error(e);
    alert("❌ Erreur suppression");
  }
};

// =========================
// 💾 SAVE MATCH
// =========================

window.isSaving = false;

window.saveMatch = async function () {

  if (window.isSaving) return; // 🔥 bloque spam
  window.isSaving = true;

  const btn = document.querySelector(".btn-add");
  btn.disabled = true;

  try {

    const sb = parseInt(document.getElementById("sb").value);
    const sr = parseInt(document.getElementById("sr").value);

    const b1 = document.getElementById("b1").value;
    const b2 = document.getElementById("b2").value;
    const r1 = document.getElementById("r1").value;
    const r2 = document.getElementById("r2").value;

    if (isNaN(sb) || isNaN(sr))
      return showScoreMessage("❌ Score invalide", "red");

    if (sb === sr)
      return showScoreMessage("❌ Match nul interdit", "red");

    const players = [b1, b2, r1, r2];
    if (players.includes(""))
      return showScoreMessage("❌ Choisis tous les joueurs", "red");

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
      createdAtLocal: Date.now()
    };

    if (isTest) {
      showScoreMessage("🧪 Mode test activé", "red");
      return;
    }

    await addDoc(collection(db, "matches"), match);
    await updatePlayerStats(match);
    await loadMatches();

    showScoreMessage("✅ Match enregistré", "green");

    // RESET
    document.getElementById("sb").value = "";
    document.getElementById("sr").value = "";

    document.getElementById("b1").selectedIndex = 0;
    document.getElementById("b2").selectedIndex = 0;
    document.getElementById("r1").selectedIndex = 0;
    document.getElementById("r2").selectedIndex = 0;

  } finally {
    // 🔥 toujours exécuté même si erreur
    window.isSaving = false;
    btn.disabled = false;
  }
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

    const form = p.history.map(r => {
  if (r === "W" || r === "w") return "🟢";
  if (r === "L" || r === "l") return "🔴";
  return r; // déjà emoji
}).join("");

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
      joueurs.push({
        ...p,
        id: d.id,
        oldElo: p.elo || 2000,
        history: p.history || []
      });
    }
  });

  const teamBleu = joueurs.filter(j =>
    [match.b1, match.b2].includes(j.name)
  );

  const teamRouge = joueurs.filter(j =>
    [match.r1, match.r2].includes(j.name)
  );

  // ✅ BOOLÉEN (IMPORTANT)
  const blueWin = match.sb > match.sr;

  // 🔧 ELO (si ta fonction attend 1/0)
  updateElo2v2(teamBleu, teamRouge, blueWin ? 1 : 0);

  for (const j of joueurs) {

    let wins = j.wins || 0;
    let losses = j.losses || 0;

    const isBlue = [match.b1, match.b2].includes(j.name);

    // ✅ logique claire
    const isWinner =
      (isBlue && blueWin) || (!isBlue && !blueWin);

    if (isWinner) {
      wins++;
      j.history.push("🟢");
    } else {
      losses++;
      j.history.push("🔴");
    }

    // 🔒 limite historique à 5
    if (j.history.length > 5) {
      j.history.shift();
    }

    await updateDoc(doc(db, "players", j.id), {
      wins,
      losses,
      elo: j.elo,
      lastDiff: Math.round(j.elo - j.oldElo),
      history: j.history
    });
  }
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
// Tournoi
// =========================
window.openTournamentTab = function (
  tab
) {

  // cache tout
  document
    .querySelectorAll(".tournament-tab")
    .forEach(el => {
      el.style.display = "none";
    });

  // ouvre bon onglet
  document.getElementById(
    `tournament-${tab}`
  ).style.display = "block";

  // 🔥 gestion du menu selon l'onglet
  const menu = document.querySelector(".tournament-menu");
  if (tab === "create") {
    // Pour "Créer un tournoi", cache le menu (comme une autre fenêtre)
    menu.style.display = "none";
  } else {
    // Pour les autres onglets, montre le menu
    menu.style.display = "block";
  }

};

window.openTournament = async function (tournamentId) {
  window.currentTournamentId = tournamentId;
  openModal("tournament");
  // Montre le menu des onglets pour les tournois existants
  document.querySelector(".tournament-menu").style.display = "block";
  openTournamentTab("matches");
  await loadTournamentMatches(tournamentId);
  await loadTournamentRanking(tournamentId);
};

window.openTournamentMatches = async function (tournamentId) {
  window.currentTournamentId = tournamentId;
  openModal("tournament");
  document.querySelector(".tournament-menu").style.display = "block";
  openTournamentTab("matches");
  await loadTournamentMatches(tournamentId);
  await loadTournamentRanking(tournamentId);
};

window.openTournamentRankingView = async function (tournamentId) {
  window.currentTournamentId = tournamentId;
  openModal("tournament");
  document.querySelector(".tournament-menu").style.display = "block";
  openTournamentTab("ranking");
  await loadTournamentRanking(tournamentId);
};

window.getTimestampDate = function (value) {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    return value.toDate();
  }
  return new Date(value);
};

window.lastTournamentCreation = 0;

window.createTournament = async function () {

  const name =
    document.getElementById(
      "tournamentName"
    ).value.trim();

  const mode =
    document.getElementById(
      "teamMode"
    ).value;

  const doubleRound =
    document.getElementById(
      "doubleRound"
    ).checked;

  const winPoints =
    parseInt(
      document.getElementById(
        "winPoints"
      ).value
    ) || 3;

  const lossPoints =
    parseInt(
      document.getElementById(
        "lossPoints"
      ).value
    ) || 0;

  const offBonus =
    parseInt(
      document.getElementById(
        "offBonus"
      ).value
    ) || 1;

  const defBonus =
    parseInt(
      document.getElementById(
        "defBonus"
      ).value
    ) || 1;

  // =========================
  // 🔒 NOM OBLIGATOIRE
  // =========================

  if (!name) {

    alert(
      "Nom du tournoi obligatoire"
    );

    return;

  }

  // =========================
  // 🔒 NOM UNIQUE
  // =========================

  const existingTournament =
    await getDocs(
      collection(db, "tournaments")
    );

  let alreadyExists = false;

  existingTournament.forEach(doc => {

    const t = doc.data();

    if (
      t.name.toLowerCase() ===
      name.toLowerCase()
    ) {

      alreadyExists = true;

    }

  });

  if (alreadyExists) {

    alert(
      "Un tournoi porte déjà ce nom"
    );

    return;

  }

  // =========================
  // ⏳ ANTI SPAM
  // =========================

  const now = Date.now();

  if (
    now - window.lastTournamentCreation
    < 5000
  ) {

    alert(
      "Attends 5 secondes avant de recréer un tournoi"
    );

    return;

  }

  window.lastTournamentCreation = now;

  // =========================
  // 🚀 CREATE
  // =========================

  try {

    const tournamentRef =
      await addDoc(
        collection(db, "tournaments"),
        {
          name,
          mode,
          doubleRound,
          winPoints,
          lossPoints,
          offBonus,
          defBonus,
          createdAt: serverTimestamp(),
          status: "waiting"
        }
      );

    // équipes
    await generateTeams(
      tournamentRef.id,
      mode
    );

    // matchs
    await generateMatches(
      tournamentRef.id,
      doubleRound
    );

    // tournoi actuel
    window.currentTournamentId =
      tournamentRef.id;

    // refresh
    await loadTournamentMatches(
      tournamentRef.id
    );

    await loadTournamentRanking(
      tournamentRef.id
    );

    await loadTournaments();

    console.log(
      "🏆 Tournoi créé :",
      tournamentRef.id
    );

    alert(
      "🏆 Tournoi créé avec succès"
    );

    // reset form
    document.getElementById(
      "tournamentName"
    ).value = "";

  } catch (e) {

    console.error(e);

    alert(
      "Erreur création tournoi"
    );

  }

};

window.generateTeams = async function (tournamentId,  mode) {

  const snapshot =
    await getDocs(collection(db, "players"));

  let players = [];

  snapshot.forEach(doc => {

    players.push({
      id: doc.id,
      ...doc.data()
    });

  });

  // minimum 4 joueurs
  if (players.length < 4) {
    alert("Pas assez de joueurs");
    return;
  }

  // =========================
  // 🔀 MODE ALÉATOIRE
  // =========================

  if (mode === "random") {

    players.sort(() => Math.random() - 0.5);

  }

  // =========================
  // ⚖️ MODE ELO
  // =========================

  if (mode === "elo") {

    // trie du plus fort au plus faible
    players.sort((a, b) =>
      (b.elo || 2000) - (a.elo || 2000));

    let balanced = [];

    while (players.length > 1) {

      const strong = players.shift();
      const weak = players.pop();

      balanced.push(strong);
      balanced.push(weak);

    }

    players = balanced;

  }

  // =========================
  // 👥 CRÉATION ÉQUIPES
  // =========================

  let teams = [];

  for (let i = 0; i < players.length; i += 2) {

    if (!players[i + 1]) break;

    teams.push({
      player1: players[i].name,
      player2: players[i + 1].name,
      points: 0,
      wins: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
  createdAt: serverTimestamp()
});

  }

  // =========================
  // 💾 SAVE FIREBASE
  // =========================

  for (const team of teams) {

    await addDoc(
      collection(
        db,
        "tournaments",
        tournamentId,
        "teams"
      ),
      team
    );

  }

  console.log("👥 Équipes créées :", teams);

};

window.loadTournaments = async function () {

  const activeContainer =
    document.getElementById("activeTournaments");
  const recentContainer =
    document.getElementById("recentTournaments");
  const historyContainer =
    document.getElementById("finishedTournaments");

  [activeContainer, recentContainer, historyContainer].forEach(c => {
    if (c) c.innerHTML = "";
  });

  const snapshot = await getDocs(
    collection(db, "tournaments")
  );

  if (snapshot.empty) {

    if (activeContainer)
      activeContainer.innerHTML = "<p>Aucun tournoi en cours</p>";
    if (recentContainer)
      recentContainer.innerHTML = "<p>Aucun podium récent</p>";
    if (historyContainer)
      historyContainer.innerHTML = "<p>Aucun tournoi</p>";

    return;

  }

  const now = Date.now();
  const recentThreshold = 48 * 60 * 60 * 1000;

  snapshot.forEach(docSnap => {

    const t = docSnap.data();
    const finishedAt = getTimestampDate(t.finishedAt);
    const isFinished = t.status === "finished";
    const isRecent =
      isFinished && finishedAt &&
      now - finishedAt.getTime() <= recentThreshold;

    const card = document.createElement("div");
    card.classList.add("match-card");

    if (isFinished && !isRecent) {
      const winnerText = t.winnerName
        ? `Victoire : ${t.winnerName}`
        : "Victoire : voir classement";

      card.innerHTML = `
        <h4>🏆 ${t.name}</h4>
        <p>${winnerText}</p>
      `;

      if (historyContainer) historyContainer.appendChild(card);
      return;
    }

    const modeText =
      t.mode === "elo"
        ? "⚖️ Mode ELO"
        : "🔀 Mode aléatoire";

    const roundText =
      t.doubleRound
        ? "🔁 Aller / retour"
        : "➡️ Match simple";

    card.innerHTML = `
      <h4>🏆 ${t.name}</h4>
      <p>${modeText}</p>
      <p>${roundText}</p>
      <div class="tournament-actions">
        <button class="btn-add" onclick="openTournamentMatches('${docSnap.id}')">
          Match à jouer
        </button>
        <button class="btn-add" onclick="openTournamentRankingView('${docSnap.id}')">
          Classement
        </button>
      </div>
    `;

    const target = isRecent ? recentContainer : activeContainer;
    if (target) target.appendChild(card);

  });

  if (activeContainer && !activeContainer.childNodes.length) {
    activeContainer.innerHTML = "<p>Aucun tournoi en cours</p>";
  }
  if (recentContainer && !recentContainer.childNodes.length) {
    recentContainer.innerHTML = "<p>Aucun podium récent</p>";
  }
  if (historyContainer && !historyContainer.childNodes.length) {
    historyContainer.innerHTML = "<p>Aucun tournoi</p>";
  }

};

window.generateMatches = async function (
  tournamentId,
  doubleRound
) {

  // récupère équipes
  const snapshot = await getDocs(
    collection(
      db,
      "tournaments",
      tournamentId,
      "teams"
    )
  );

  let teams = [];

  snapshot.forEach(doc => {

    teams.push({
      id: doc.id,
      ...doc.data()
    });

  });

  let matches = [];

  // =========================
  // 🔥 CHAQUE ÉQUIPE JOUE
  // CONTRE TOUTES LES AUTRES
  // =========================

  for (let i = 0; i < teams.length; i++) {

    for (let j = i + 1; j < teams.length; j++) {

      // match normal
      matches.push({
        blueTeamId: teams[i].id,
blueTeamName:
`${teams[i].player1}/${teams[i].player2}`,

redTeamId: teams[j].id,
redTeamName:
`${teams[j].player1}/${teams[j].player2}`,
        sb: null,
        sr: null,
        played: false,
        createdAt: serverTimestamp()
      });

      // aller / retour
      if (doubleRound) {

        matches.push({
          blueTeamId: teams[j].id,
blueTeamName:
`${teams[j].player1}/${teams[j].player2}`,

redTeamId: teams[i].id,
redTeamName:
`${teams[i].player1}/${teams[i].player2}`,
          sb: null,
          sr: null,
          played: false,
          createdAt: serverTimestamp()
        });

      }

    }

  }

  // =========================
  // 💾 SAVE FIREBASE
  // =========================

  for (const match of matches) {

    await addDoc(
      collection(
        db,
        "tournaments",
        tournamentId,
        "matches"
      ),
      match
    );

  }

  console.log("⚔️ Matchs générés :", matches);

};

window.loadTournamentMatches = async function (
  tournamentId
) {

  const container =
    document.getElementById(
      "tournamentMatches"
    );

  if (!container) return;

  container.innerHTML = "";

  const snapshot = await getDocs(
    collection(
      db,
      "tournaments",
      tournamentId,
      "matches"
    )
  );

  if (snapshot.empty) {

    container.innerHTML =
      "<p>Aucun match</p>";

    return;

  }

  snapshot.forEach(docSnap => {

    const match = docSnap.data();

    // ignore matchs déjà joués
    if (match.played) {
      return;
    }

    const div =
      document.createElement("div");

    div.classList.add("match-card");

    const blue = match.blueTeam
      ? `${match.blueTeam.player1}/${match.blueTeam.player2}`
      : match.blueTeamName;

    const red = match.redTeam
      ? `${match.redTeam.player1}/${match.redTeam.player2}`
      : match.redTeamName;

    div.innerHTML = `

      <div class="match-row team-blue">
        🔵 ${blue}
      </div>

      <div class="match-row team-red">
        🔴 ${red}
      </div>

      <div class="score-box">

        <div class="score-blue">

          <input
            type="number"
            id="sb-${docSnap.id}"
            placeholder="Bleu"
            min="0"
            max="10"
          >

        </div>

        <div class="score-red">

          <input
            type="number"
            id="sr-${docSnap.id}"
            placeholder="Rouge"
            min="0"
            max="10"
          >

        </div>

      </div>

      <button
        class="save-score-btn"
        onclick="saveTournamentMatch(
          '${tournamentId}',
          '${docSnap.id}'
        )"
      >
        Enregistrer
      </button>

    `;

    container.appendChild(div);

  });

};

window.saveTournamentMatch = async function (
  tournamentId,
  matchId
) {

  const sb = parseInt(
    document.getElementById(
      `sb-${matchId}`
    ).value
  );

  const sr = parseInt(
    document.getElementById(
      `sr-${matchId}`
    ).value
  );

  // =========================
  // 🔒 VALIDATION
  // =========================

  if (isNaN(sb) || isNaN(sr)) {

    alert("Score invalide");

    return;

  }

  // interdit égalité
  if (sb === sr) {

    alert("Match nul interdit");

    return;

  }

  // score min/max
  if (
    sb < 0 ||
    sr < 0 ||
    sb > 10 ||
    sr > 10
  ) {

    alert(
      "Les scores doivent être entre 0 et 10"
    );

    return;

  }

  // gagnant obligatoire
  if (
    sb !== 10 &&
    sr !== 10
  ) {

    alert(
      "Le gagnant doit avoir 10"
    );

    return;

  }

  // impossible
  if (
    sb === 10 &&
    sr === 10
  ) {

    alert("Score impossible");

    return;

  }

  // =========================
  // 🔥 RÉCUP MATCH
  // =========================

  const matchRef = doc(
    db,
    "tournaments",
    tournamentId,
    "matches",
    matchId
  );

  const matchDoc =
    await getDoc(matchRef);

  const existingMatch =
    matchDoc.data();

  // déjà joué
  if (existingMatch.played) {

    alert("Match déjà enregistré");

    return;

  }

  // =========================
  // 💾 SAVE MATCH
  // =========================

  await updateDoc(
    matchRef,
    {
      sb,
      sr,
      played: true
    }
  );

  // =========================
  // 🏆 UPDATE CLASSEMENT
  // =========================

  await updateTournamentRanking(
    tournamentId,
    {
      id: matchId,
      ...existingMatch,
      sb,
      sr
    }
  );

  // refresh liste matchs
  await loadTournamentMatches(
    tournamentId
  );

  alert("✅ Score enregistré");

};

window.updateTournamentRanking = async function (
  tournamentId,
  match
) {

  // =========================
  // RÉCUP TOURNOI
  // =========================

  const tournamentDoc = await getDoc(
    doc(db, "tournaments", tournamentId)
  );

  const tournament =
    tournamentDoc.data();

  // paramètres
  const winPoints =
    tournament.winPoints || 3;

  const lossPoints =
    tournament.lossPoints || 0;

  const offBonus =
    tournament.offBonus || 1;

  const defBonus =
    tournament.defBonus || 1;

  // =========================
  // RÉCUP ÉQUIPES
  // =========================

  const teamsSnapshot = await getDocs(
    collection(
      db,
      "tournaments",
      tournamentId,
      "teams"
    )
  );

  let teams = [];

  teamsSnapshot.forEach(docSnap => {

    teams.push({
      id: docSnap.id,
      ref: docSnap.ref,
      ...docSnap.data()
    });

  });

  // =========================
  // TROUVER LES 2 ÉQUIPES
  // =========================

 const blueTeam = teams.find(
  team => team.id === match.blueTeamId
);

const redTeam = teams.find(
  team => team.id === match.redTeamId
);

  if (!blueTeam || !redTeam) {
    console.error("Équipes introuvables");
    return;
  }

  // =========================
  // CALCULS
  // =========================

  let bluePoints = 0;
  let redPoints = 0;

  // victoire
  if (match.sb > match.sr) {

    bluePoints += winPoints;
    redPoints += lossPoints;

    blueTeam.wins++;
    redTeam.losses++;

  } else {

    redPoints += winPoints;
    bluePoints += lossPoints;

    redTeam.wins++;
    blueTeam.losses++;

  }

  // bonus offensif
  if (match.sb >= 10)
    bluePoints += offBonus;

  if (match.sr >= 10)
    redPoints += offBonus;

  // bonus défensif
  if (
    match.sb < match.sr &&
    match.sb >= 9
  ) {
    bluePoints += defBonus;
  }

  if (
    match.sr < match.sb &&
    match.sr >= 9
  ) {
    redPoints += defBonus;
  }

  // =========================
  // STATS
  // =========================

  blueTeam.points += bluePoints;
  redTeam.points += redPoints;

  blueTeam.goalsFor += match.sb;
  blueTeam.goalsAgainst += match.sr;

  redTeam.goalsFor += match.sr;
  redTeam.goalsAgainst += match.sb;

  // =========================
  // SAVE
  // =========================

  await updateDoc(
    blueTeam.ref,
    {
      points: blueTeam.points,
      wins: blueTeam.wins,
      losses: blueTeam.losses,
      goalsFor: blueTeam.goalsFor,
      goalsAgainst: blueTeam.goalsAgainst
    }
  );

  await updateDoc(
    redTeam.ref,
    {
      points: redTeam.points,
      wins: redTeam.wins,
      losses: redTeam.losses,
      goalsFor: redTeam.goalsFor,
      goalsAgainst: redTeam.goalsAgainst
    }
  );

  // refresh tableau
  await loadTournamentRanking(
    tournamentId
  );

  await checkTournamentFinished(tournamentId);

};

window.loadTournamentRanking = async function (
  tournamentId
) {

  const tbody =
    document.getElementById(
      "tournamentRanking"
    );

  if (!tbody) return;

  tbody.innerHTML = "";

  // =========================
  // RÉCUP ÉQUIPES
  // =========================

  const snapshot = await getDocs(
    collection(
      db,
      "tournaments",
      tournamentId,
      "teams"
    )
  );

  let teams = [];

  snapshot.forEach(docSnap => {

    teams.push({
      id: docSnap.id,
      ...docSnap.data()
    });

  });

  // =========================
  // TRI CLASSEMENT
  // =========================

  teams.sort((a, b) => {

    // points
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    // différence buts
    const diffA =
      a.goalsFor - a.goalsAgainst;

    const diffB =
      b.goalsFor - b.goalsAgainst;

    if (diffB !== diffA) {
      return diffB - diffA;
    }

    // buts marqués
    return b.goalsFor - a.goalsFor;

  });

  const winnerBox =
  document.getElementById(
    "tournamentWinner"
  );

if (winnerBox && teams.length > 0) {

  const winner = teams[0];

  winnerBox.innerHTML = `

    <div class="winner-card">

      🏆 Champion du tournoi

      <h2>
        ${winner.player1}
        /
        ${winner.player2}
      </h2>

      <p>
        ${winner.points} pts
      </p>

    </div>

  `;

}
  // =========================
  // AFFICHAGE
  // =========================

  teams.forEach((team, index) => {

    const tr =
      document.createElement("tr");

    const diff =
      team.goalsFor - team.goalsAgainst;

    tr.innerHTML = `
    
      <td>${index + 1}</td>

      <td>
        ${team.player1}
        /
        ${team.player2}
      </td>

      <td>${team.points}</td>

      <td>${team.wins}</td>

      <td>${team.losses}</td>

      <td>${team.goalsFor}</td>

      <td>${team.goalsAgainst}</td>

      <td>
        ${diff > 0 ? "+" : ""}
        ${diff}
      </td>

    `;

    tbody.appendChild(tr);

  });

};

window.storeTournamentWinner = async function (tournamentId) {
  const snapshot = await getDocs(
    collection(db, "tournaments", tournamentId, "teams")
  );

  let teams = [];
  snapshot.forEach(docSnap => {
    teams.push({ id: docSnap.id, ...docSnap.data() });
  });

  if (teams.length === 0) return null;

  teams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;

    const diffA = a.goalsFor - a.goalsAgainst;
    const diffB = b.goalsFor - b.goalsAgainst;

    if (diffB !== diffA) return diffB - diffA;

    return b.goalsFor - a.goalsFor;
  });

  const winner = teams[0];
  const winnerName = `${winner.player1}/${winner.player2}`;

  await updateDoc(doc(db, "tournaments", tournamentId), {
    winnerName
  });

  return winnerName;
};

window.checkTournamentFinished = async function (
  tournamentId
) {

  // récup matchs
  const snapshot = await getDocs(
    collection(
      db,
      "tournaments",
      tournamentId,
      "matches"
    )
  );

  let total = 0;
  let played = 0;

  snapshot.forEach(docSnap => {

    total++;

    const match = docSnap.data();

    if (match.played) {
      played++;
    }

  });

  // tournoi terminé
  if (total > 0 && total === played) {

    const winnerName = await storeTournamentWinner(
      tournamentId
    );

    await updateDoc(
      doc(
        db,
        "tournaments",
        tournamentId
      ),
      {
        status: "finished",
        finishedAt: serverTimestamp(),
        winnerName
      }
    );

    alert(
      `🏆 Tournoi terminé !${
        winnerName ? ` Podium : ${winnerName}` : ""
      }`
    );

    // récup classement final
    await loadTournamentRanking(
      tournamentId
    );

  }

};

// =========================
// 🚀 INIT
// =========================
document.addEventListener("DOMContentLoaded", () => {

  // 🔥 MODE TEST VISUEL
  if (isTest) {
    document.body.style.border = "5px solid red";
  }
  if (isTest) {
  console.log("🧪 MODE TEST ACTIVÉ");
} else {
  console.log("🚀 MODE PROD ACTIVÉ");
}

  loadMatches();
  loadComments();
  loadPlayersSelect();
  loadTournaments();
});