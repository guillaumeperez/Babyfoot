function getAppMode() {
  const host = window.location.hostname;

  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "" ||
    host === "0.0.0.0";

  return isLocal ? "test" : "prod";
}

window.APP_MODE = getAppMode();

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
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { updateElo2v2 } from "./elo.js";

// =========================
// 🧪 MODE TEST
// =========================

function testLog(action, data) {
  console.log("🧪 TEST MODE:", action, data);
}

function isTestMode() {
  return window.APP_MODE === "test";
}

// =========================
// ⚙️ Wrappers SAFE FIREBASE
// =========================
async function safeSetDoc(ref, data) {
  if (isTestMode()) {
    console.log("🧪 [TEST] setDoc bloqué", data);
    return;
  }
  return await setDoc(ref, data);
}

async function safeAddDoc(ref, data) {
  if (isTestMode()) {
    console.log("🧪 [TEST] addDoc bloqué", data);
    return { id: "test-id" };
  }
  return await addDoc(ref, data);
}

async function safeUpdateDoc(ref, data) {
  if (isTestMode()) {
    console.log("🧪 [TEST] updateDoc bloqué", data);
    return;
  }
  return await updateDoc(ref, data);
}
async function safeDeleteDoc(ref) {
  if (isTestMode()) {
    console.log("🧪 [TEST] deleteDoc bloqué");
    return;
  }
  return await deleteDoc(ref);
}

async function safeGetDoc(ref) {
  return await getDoc(ref);
}

async function safeGetDocs(q) {
  return await getDocs(q);
}

// =========================
// ⚙️ CONFIG FIREBASE
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyA-B2_flq7AmCCr3I6iigHRbKLuS3gMSrY",
  authDomain: "babyfoot-a78f5.firebaseapp.com",
  projectId: "babyfoot-a78f5",
  storageBucket: "babyfoot-a78f5.firebasestorage.app",
  messagingSenderId: "579925171552",
  appId: "1:579925171552:web:b6faf8313581b7b8dd5205",
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
// 🚪 LOGOUT ADMIN
// =========================
window.logoutAdmin = async function () {
  try {
    await signOut(auth);
    alert("🚪 Déconnecté");
  } catch (e) {
    console.error(e);
    alert("❌ Erreur déconnexion");
  }
};

// =========================
// 👤 ADMIN STATE
// =========================
window.isAdmin = false;

onAuthStateChanged(auth, (user) => {
  const panel = document.getElementById("adminPanel");
  const badge = document.getElementById("adminBadge");
  const adminPlayersPanel = document.getElementById("adminPlayersPanel");

  const isAdminUser = user && user.email === "guillaumeper34@gmail.com";

  window.isAdmin = !!isAdminUser;

  if (panel) panel.style.display = isAdminUser ? "block" : "none";
  if (badge) badge.style.display = isAdminUser ? "block" : "none";

  // ⚠️ seulement si DOM existe
  if (adminPlayersPanel) {
    adminPlayersPanel.style.display = isAdminUser ? "block" : "none";
  }

  if (isAdminUser) {
    loadDemandes?.();
    loadAdminPlayers?.();
  }

  loadMatches?.();
});

// =========================
//  ADMIN
// =========================

//  Supp les matchs

window.resetAllMatches = async function () {
  const confirmReset = confirm("⚠️ Supprimer TOUS les matchs ?");

  if (!confirmReset) return;

  const snapshot = await getDocs(collection(db, "matches"));

  for (const d of snapshot.docs) {
    await deleteDoc(doc(db, "matches", d.id));
  }

  alert("✅ Tous les matchs supprimés");

  loadMatches?.();
  loadRanking?.();
};

//  Supp les tournois
window.resetAllTournaments = async function () {
  const confirmReset = confirm("⚠️ Supprimer TOUS les tournois ?");

  if (!confirmReset) return;

  const snapshot = await getDocs(collection(db, "tournaments"));

  for (const d of snapshot.docs) {
    await deleteDoc(doc(db, "tournaments", d.id));
  }

  alert("✅ Tous les tournois supprimés");
};

//  Reset elo + classement + sauvegarde archive
window.resetAllWithArchive = async function () {
  const confirmAction = confirm("⚠️ ARCHIVER puis RESET le classement ?");

  if (!confirmAction) return;

  try {
    const snapshot = await safeGetDocs(collection(db, "players"));

    // =========================
    // 📦 ARCHIVE
    // =========================

    let ranking = [];

    snapshot.forEach((d) => {
      const p = d.data();

      ranking.push({
        name: p.name || "Inconnu",
        wins: p.wins || 0,
        losses: p.losses || 0,
        elo: p.elo || 2000,
      });
    });

    ranking.sort((a, b) => b.elo - a.elo);

    ranking = ranking.map((p, i) => ({
      rank: i + 1,
      ...p,
    }));

    const dateKey = new Date().toISOString().replace(/[:.]/g, "-");

    const seasonName = new Date().toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });

    // 💾 SAVE ARCHIVE
    await safeSetDoc(doc(db, "archives", `archive_${dateKey}`), {
      seasonName,
      createdAt: serverTimestamp(),
      ranking,
    });

    // =========================
    // 🧨 DELETE MATCHES
    // =========================

    const matchesSnap = await safeGetDocs(collection(db, "matches"));

    if (!matchesSnap.empty) {
      for (const d of matchesSnap.docs) {
        await safeDeleteDoc(doc(db, "matches", d.id));
      }
    }

    // =========================
    // 🔥 RESET PLAYERS
    // =========================

    for (const d of snapshot.docs) {
      await safeUpdateDoc(doc(db, "players", d.id), {
        elo: 2000,
        wins: 0,
        losses: 0,
        lastDiff: 0,
        history: [],
      });
    }

    alert("✅ Archive + reset terminé !");
    loadRanking?.();
  } catch (error) {
    console.error("❌ reset+archive error :", error);
    alert("❌ Erreur lors du reset + archive");
  }
};

window.openModal = function (id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.style.display = "block";

  // 👇 hooks automatiques selon modal
  if (id === "players") {
    loadPlayersModal?.();
  }

  if (id === "ranking") {
    loadRanking?.();
  }

  if (id === "history") {
    loadMatches?.();
    loadPlayersFilter?.();
  }
};
// RESET COMPLET ☢
window.fullReset = async function () {
  const confirmReset = confirm("☢ RESET COMPLET APPLICATION ?");

  if (!confirmReset) return;

  // MATCHS
  const matches = await getDocs(collection(db, "matches"));

  for (const d of matches.docs) {
    await deleteDoc(doc(db, "matches", d.id));
  }

  // TOURNOIS
  const tournaments = await getDocs(collection(db, "tournaments"));

  for (const d of tournaments.docs) {
    await deleteDoc(doc(db, "tournaments", d.id));
  }

  // RESET JOUEURS
  const players = await getDocs(collection(db, "players"));

  for (const d of players.docs) {
    await updateDoc(doc(db, "players", d.id), {
      elo: 1000,
      victory: 0,
      defeat: 0,
      goals: 0,
      goalsAgainst: 0,
      games: 0,
    });
  }

  alert("☢ RESET COMPLET TERMINÉ");

  loadRanking?.();
  loadMatches?.();
  loadPlayers?.();
};

// =========================
// 📩 DEMANDES JOUEURS
// =========================
window.loadDemandes = async function () {
  const container = document.getElementById("listeDemandes");
  if (!container) return;

  container.innerHTML = "";

  try {
    const snapshot = await safeGetDocs(collection(db, "demandes"));

    if (snapshot.empty) {
      container.innerHTML = "<p>Aucune demande</p>";
      return;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const div = document.createElement("div");

      div.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 5px 0;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 8px;
      `;

      const name = data.name || "Inconnu";

      const safeName = name.replace(/'/g, "\\'");

      div.innerHTML = `
        <span>${name}</span>

        <div style="display:flex; gap:5px;">
          <button onclick="acceptPlayer('${docSnap.id}', '${safeName}')">✅</button>
          <button onclick="rejectPlayer('${docSnap.id}')">❌</button>
        </div>
      `;

      container.appendChild(div);
    });
  } catch (e) {
    console.error("loadDemandes error:", e);
  }
};

// =========================
// ✅ ACCEPT PLAYER
// =========================
window.acceptPlayer = async function (id, name) {
  if (!confirm(`Valider ${name} ?`)) return;

  try {
    await safeAddDoc(collection(db, "players"), {
      name,
      elo: 2000,
      wins: 0,
      losses: 0,
      active: true,
      createdAt: new Date(),
    });

    await deleteDoc(doc(db, "demandes", id));

    alert(`✅ ${name} ajouté`);

    loadDemandes?.();
    loadPlayers?.();
    loadPlayersSelect?.();
  } catch (e) {
    console.error(e);
    alert("❌ Erreur validation joueur");
  }
};

// =========================
// ❌ REJECT PLAYER
// =========================
window.rejectPlayer = async function (id, name) {
  if (!confirm(`Refuser ${name} ?`)) return;

  try {
    await deleteDoc(doc(db, "demandes", id));

    alert(`❌ ${name} refusé`);

    loadDemandes?.();
  } catch (e) {
    console.error(e);
    alert("❌ Erreur refus");
  }
};

// =========================
// 🧑 ADMIN PLAYER LIST
// =========================
window.loadAdminPlayers = async function () {
  const container = document.getElementById("adminPlayersList");
  if (!container) return;

  container.innerHTML = "";

  const snapshot = await safeGetDocs(collection(db, "players"));

  snapshot.forEach((docSnap) => {
    const p = docSnap.data();
    const isActive = p.active !== false;

    const div = document.createElement("div");

    div.style = `
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:8px;
      margin:5px 0;
      border:1px solid #ddd;
      border-radius:8px;
    `;

    div.innerHTML = `
      <span style="font-weight:bold;">
        ${p.name} ${isActive ? "" : "(désactivé)"}
      </span>

      <button onclick="togglePlayer('${docSnap.id}', ${isActive})">
        ${isActive ? "🚫 Désactiver" : "♻️ Réactiver"}
      </button>
    `;

    container.appendChild(div);
  });
};

window.openPlayersModal = function () {
  openModal("players");

  if (window.isAdmin) {
    const panel = document.getElementById("adminPlayersPanel");
    if (panel) panel.style.display = "block";

    loadAdminPlayers?.();
  } else {
    const panel = document.getElementById("adminPlayersPanel");
    if (panel) panel.style.display = "none";
  }
};
// =========================
// 🔄 TOGGLE PLAYER
// =========================
window.togglePlayer = async function (id, isActive) {
  const confirmAction = confirm(
    isActive ? "Désactiver ce joueur ?" : "Réactiver ce joueur ?",
  );

  if (!confirmAction) return;

  await updateDoc(doc(db, "players", id), {
    active: !isActive,
  });

  loadAdminPlayers?.();
  loadRanking?.();
};

// =========================
// 👥 MODAL PLAYERS (USER VIEW)
// =========================
window.loadPlayersModal = async function () {
  const container = document.getElementById("playersList");
  if (!container) return;

  container.innerHTML = "";

  const snapshot = await safeGetDocs(collection(db, "players"));

  snapshot.forEach((docSnap) => {
    const p = docSnap.data();

    if (p.active === false) return;

    const div = document.createElement("div");
    div.style = `
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:8px 0;
      border-bottom:1px solid #eee;
    `;

    div.innerHTML = `
      <span>• ${p.name}</span>

      ${
        window.isAdmin
          ? `<button onclick="togglePlayer('${docSnap.id}', ${p.active !== false})">
              🚫
            </button>`
          : ""
      }
    `;

    container.appendChild(div);
  });
};

// =========================
// 🎯 SELECT PLAYERS (IMPORTANT FILTER)
// =========================
window.loadPlayersSelect = async function () {
  const snapshot = await safeGetDocs(collection(db, "players"));
  const selects = ["b1", "b2", "r1", "r2"];

  selects.forEach((id) => {
    const select = document.getElementById(id);
    if (select) select.innerHTML = "<option value=''>-- choisir --</option>";
  });

  snapshot.forEach((docSnap) => {
    const p = docSnap.data();

    if (p.active === false) return;

    selects.forEach((id) => {
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
// ➕ ADD PLAYER REQUEST
// =========================
window.addPlayer = async function () {
  const input = document.getElementById("playerInput");
  let name = input.value.trim();

  if (!name) {
    showPlayerMessage("❌ Nom vide", "red");
    return;
  }

  name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

  try {
    // =========================
    // 🔎 CHECK DOUBLON (demandes)
    // =========================
    const demandesSnap = await safeGetDocs(collection(db, "demandes"));

    const alreadyRequested = demandesSnap.docs.some(
      (d) => (d.data().name || "").toLowerCase() === name.toLowerCase(),
    );

    if (alreadyRequested) {
      showPlayerMessage("⏳ Déjà en attente de validation", "orange");
      return;
    }

    // =========================
    // 🔎 CHECK DOUBLON (players)
    // =========================
    const playersSnap = await safeGetDocs(collection(db, "players"));

    const alreadyExists = playersSnap.docs.some(
      (d) => (d.data().name || "").toLowerCase() === name.toLowerCase(),
    );

    if (alreadyExists) {
      showPlayerMessage("❌ Ce joueur existe déjà", "red");
      return;
    }

    // =========================
    // 📩 CREATE REQUEST
    // =========================
    await safeAddDoc(collection(db, "demandes"), {
      name,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    input.value = "";

    showPlayerMessage(
      `📩 "${name}" a été envoyé à l'admin (en attente de validation)`,
      "green",
    );
  } catch (e) {
    console.error("addPlayer error:", e);

    showPlayerMessage("❌ Erreur lors de l'envoi de la demande", "red");
  }
};

// =========================
// 💬 COMMENTS
// =========================
window.addComment = async function () {
  const textarea = document.getElementById("commentInput");
  const text = textarea?.value.trim();

  if (!text) return;

  await safeAddDoc(collection(db, "comments"), {
    text,
    createdAt: serverTimestamp(),
  });

  textarea.value = "";
  await loadComments();
};

// =========================
// 🔔 UI MESSAGE
// =========================
function showPlayerMessage(text, color) {
  const box = document.getElementById("playerMessage");
  if (!box) return;

  box.style.display = "block";
  box.style.background =
    color === "green" ? "#16a34a" : color === "orange" ? "#f59e0b" : "#dc2626";

  box.textContent = text;

  setTimeout(() => (box.style.display = "none"), 2000);
}

// =========================
// Afficher les demandes des joueurs
// =========================

window.afficherDemandes = async function () {
  const container = document.getElementById("listeDemandes");
  container.innerHTML = "";

  const snapshot = await safeGetDocs(collection(db, "demandes"));

  if (snapshot.empty) {
    container.innerHTML = "Aucune demande";
    return;
  }

  snapshot.forEach((docSnap) => {
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
  await safeDeleteDoc(doc(db, "demandes", id));

  alert("❌ Demande refusée");

  afficherDemandes();
};

// =========================
// valider demandes des joueurs
// =========================

window.validerDemande = async function (id, name) {
  // Ajoute dans players
  await safeSetDoc(doc(db, "players", name.toLowerCase()), {
    name: name,
    wins: 0,
    losses: 0,
    elo: 2000,
  });

  // Supprime la demande
  await safeDeleteDoc(doc(db, "demandes", id));

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
  if (!isAdmin) {
    alert("❌ Admin requis");
    return;
  }

  if (!confirm("Supprimer ?")) return;
  if (window.APP_MODE === "test") return;

  await safeDeleteDoc(doc(db, "players", id));

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
      timestamp: Date.now(),
    };
  }
};

window.backupAllPlayersELO = async function () {
  const snapshot = await safeGetDocs(collection(db, "players"));
  snapshot.forEach((docSnap) => {
    const name = docSnap.id;
    eloBackup[name] = {
      elo: docSnap.data().elo,
      wins: docSnap.data().wins,
      losses: docSnap.data().losses,
      timestamp: Date.now(),
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
    await safeUpdateDoc(doc(db, "players", key), {
      elo: backup.elo,
      wins: backup.wins,
      losses: backup.losses,
    });

    alert(`✅ ELO restauré pour ${playerName}\n⚖️ ${backup.elo} pts`);
    delete eloBackup[key];
  } catch (e) {
    console.error(e);
    alert("❌ Erreur restauration");
  }
};

// =========================
// 🗑 DELETE MATCH + RESTORE ELO
// =========================

window.deleteMatch = async function (matchId) {
  // 🔐 Vérification admin
  if (!window.isAdmin) {
    alert("❌ Admin requis");
    return;
  }

  // ⚠️ Confirmation
  const confirmation = confirm("Supprimer ce match et restaurer les ELO ?");

  if (!confirmation) return;

  try {
    // 📄 Référence du match
    const matchRef = doc(db, "matches", matchId);

    // 📥 Récupération du match
    const matchSnap = await safeGetDoc(matchRef);

    // ❌ Match introuvable
    if (!matchSnap.exists()) {
      alert("❌ Match non trouvé");
      return;
    }

    // 📦 Données du match
    const match = matchSnap.data();

    console.log("🗑 Suppression match :", match);

    // =========================
    // 🔥 RESTORE ELO
    // =========================

    if (match.eloBefore) {
      const players = [
        {
          name: match.b1,
          elo: match.eloBefore.b1,
          diff: match.eloChange?.b1 || 0,
        },
        {
          name: match.b2,
          elo: match.eloBefore.b2,
          diff: match.eloChange?.b2 || 0,
        },
        {
          name: match.r1,
          elo: match.eloBefore.r1,
          diff: match.eloChange?.r1 || 0,
        },
        {
          name: match.r2,
          elo: match.eloBefore.r2,
          diff: match.eloChange?.r2 || 0,
        },
      ];

      for (const p of players) {
        // joueur vide
        if (!p.name) continue;

        const playerRef = doc(db, "players", p.name.toLowerCase());

        const playerSnap = await safeGetDoc(playerRef);

        // joueur inexistant
        if (!playerSnap.exists()) continue;

        const data = playerSnap.data();

        let wins = data.wins || 0;
        let losses = data.losses || 0;

        // 🔥 Restore win/loss
        if (p.diff > 0) {
          wins = Math.max(0, wins - 1);
        } else if (p.diff < 0) {
          losses = Math.max(0, losses - 1);
        }

        // =========================
        // 📜 REMOVE ONLY THIS MATCH
        // =========================

        let history = [...(data.history || [])];

        history = history.filter((h) => {
          // historique stocké en objet
          if (typeof h === "object") {
            return h.matchId !== matchId;
          }

          return true;
        });

        // =========================
        // 💾 UPDATE PLAYER
        // =========================

        await safeUpdateDoc(playerRef, {
  elo: p.elo ?? 2000,
  wins: wins ?? 0,
  losses: losses ?? 0,
  history: Array.isArray(history) ? history : [],
  lastDiff: 0,
});

        console.log(`♻️ ${p.name} restauré à ${p.elo}`);
      }
    }

    // =========================
    // 🗑 DELETE MATCH
    // =========================

    await safeDeleteDoc(matchRef);

    // ✅ Succès
    alert("✅ Match supprimé + ELO restauré");

    // 🔄 Reload
    loadMatches?.();
  } catch (error) {
    console.error("❌ Erreur suppression :", error);

    alert("❌ Erreur pendant la suppression");
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

  if (
    !confirm(
      "Supprimer ce tournoi ?\n⚠️ Les matchs et équipes seront aussi supprimés",
    )
  )
    return;

  try {
    // backup all players ELO first
    await backupAllPlayersELO();

    // Delete matches
    const matchesSnapshot = await safeGetDocs(
      collection(db, "tournaments", tournamentId, "matches"),
    );
    for (const matchDoc of matchesSnapshot.docs) {
      await safeDeleteDoc(matchDoc.ref);
    }

    // Delete teams
    const teamsSnapshot = await safeGetDocs(
      collection(db, "tournaments", tournamentId, "teams"),
    );
    for (const teamDoc of teamsSnapshot.docs) {
      await safeDeleteDoc(teamDoc.ref);
    }

    // Delete tournament
    await safeDeleteDoc(doc(db, "tournaments", tournamentId));

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
window.saveMatch = async function (event) {
  if (window.isSaving) return;
  window.isSaving = true;

  const btn = event?.target;
  if (btn) btn.disabled = true;

  try {
    const sb = parseInt(document.getElementById("sb")?.value);
    const sr = parseInt(document.getElementById("sr")?.value);

    const b1 = document.getElementById("b1")?.value;
    const b2 = document.getElementById("b2")?.value;
    const r1 = document.getElementById("r1")?.value;
    const r2 = document.getElementById("r2")?.value;

    // =========================
    // 🔒 VALIDATION
    // =========================
    if (isNaN(sb) || isNaN(sr)) {
      alert("Score invalide");
      return;
    }

    if (sb === sr) {
      alert("Match nul interdit");
      return;
    }

    if (!b1 || !b2 || !r1 || !r2) {
      alert("Tous les joueurs doivent être sélectionnés");
      return;
    }

    // =========================
    // ⏳ ANTI-SPAM
    // =========================
    if (Date.now() - (window.lastMatchSave || 0) < 10000) {
      alert("⏳ Attends 10 secondes avant d'ajouter un nouveau match.");
      return;
    }

    const match = {
      b1,
      b2,
      r1,
      r2,
      sb,
      sr,
      type: "classic",
      createdAt: serverTimestamp(),
      createdAtLocal: Date.now(),
    };

    // =========================
    // 🧪 MODE TEST
    // =========================
    if (window.APP_MODE === "test") {
      console.log("🧪 MATCH TEST (NON ENREGISTRÉ)", match);

      const result = await updatePlayerStats(match);
      console.log("🧪 RESULT TEST :", result);

      showScoreMessage("🧪 Match simulé", "orange");
      return;
    }

    // =========================
    // 🚀 SAVE MATCH
    // =========================
    window.lastMatchSave = Date.now();

    const matchRef = await safeAddDoc(collection(db, "matches"), match);

    const result = await updatePlayerStats(match);

    // =========================
    // 🧪 DEBUG SAFE (résultat ELO)
    // =========================
    console.log("🧪 ELO RESULT DEBUG :", result);

    // =========================
    // 💾 UPDATE MATCH
    // =========================
   const safeResult = {
  eloBefore: result?.eloBefore ?? {},
  eloAfter: result?.eloAfter ?? {},
  eloChange: result?.eloChange ?? {},
};

await safeUpdateDoc(matchRef, {
  ...safeResult,
  played: true,
});

    showScoreMessage("✅ Match enregistré", "green");

    await Promise.all([
      loadRanking(),
      loadMatches(),
    ]);

  } catch (e) {
    console.error("saveMatch error :", e);

    alert(
      "Erreur : " +
      (e?.message || e) +
      "\nCode : " +
      (e?.code || "aucun")
    );

  } finally {
    window.isSaving = false;

    if (btn) btn.disabled = false;
  }
};

// =========================
// 🏆 RANKING
// =========================

let isRankingLoading = false;
let lastRankingCall = 0;

window.loadRanking = async function () {
  if (isRankingLoading) return;

  const now = Date.now();
  if (now - lastRankingCall < 200) return;

  lastRankingCall = now;
  isRankingLoading = true;

  try {
    console.log("🏆 loadRanking exécuté");

    const tbody = document.getElementById("rankingList");
    const podium = document.getElementById("podium");

    if (!tbody || !podium) return;

    tbody.innerHTML = "";
    podium.innerHTML = "";

    const snapshot = await safeGetDocs(collection(db, "players"));

    let players = [];

    snapshot.forEach((d) => {
      const data = d.data();

      if (data.active === false) return;

      players.push({
        name: data.name || "Inconnu",
        wins: data.wins || 0,
        losses: data.losses || 0,
        elo: data.elo || 2000,
        lastDiff: data.lastDiff || 0,
        history: data.history || [],
      });
    });

    if (players.length === 0) {
      tbody.innerHTML = "<tr><td colspan='7'>Aucun joueur</td></tr>";
      return;
    }

    // TRI
    players.sort((a, b) => b.elo - a.elo);

    // PODIUM
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

    // TABLEAU
    players.forEach((p, i) => {
      const diff = p.lastDiff || 0;
      const diffText = diff > 0 ? "+" + diff : diff;

      let color = "white";
      if (diff > 0) color = "#22c55e";
      if (diff < 0) color = "#ef4444";

      const form = (p.history || []).join("");

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
  } finally {
    isRankingLoading = false;
  }
};

// =========================
// 📦  ARCHIVE
// =========================

window.openArchiveModal = async function () {
  const modal = document.getElementById("archiveModal");

  if (!modal) return;

  modal.style.display = "flex";

  const select = document.getElementById("archiveSelect");
  if (select) select.value = "";

  try {
    await loadArchiveList();
  } catch (e) {
    console.error("loadArchiveList error:", e);
  }
};

let archiveChart = null;

function renderArchiveChart(ranking) {
  const canvas = document.getElementById("archiveChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const labels = ranking.map((p) => p.name);
  const data = ranking.map((p) => p.elo || 0);

  if (archiveChart) {
    archiveChart.destroy();
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const padding = 30;

  archiveChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "ELO",
          data,
          backgroundColor: "#3b82f6",
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      layout: {
        padding: {
          bottom: 40,
        },
      },

      plugins: {
        legend: { display: false },
      },

      scales: {
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 90,
            minRotation: 90,
            font: {
              size: 10,
            },
          },
        },

        y: {
          min: min - padding,
          max: max + padding,
        },
      },
    },
  });
}

// =========================
// ❌ CLOSE ARCHIVE MODAL
// =========================

window.closeArchiveModal = function () {
  const modal = document.getElementById("archiveModal");
  if (!modal) return;

  modal.style.display = "none";
};

// =========================
// 📂 LOAD ARCHIVE LIST
// =========================

window.loadArchiveList = async function () {
  const selects = [
    document.getElementById("archiveSelect"),
    document.getElementById("archiveA"),
    document.getElementById("archiveB"),
  ];

  // 🧹 reset des selects
  selects.forEach((select) => {
    if (select) {
      select.innerHTML = `<option value="">-- Choisir une archive --</option>`;
    }
  });

  const snapshot = await safeGetDocs(collection(db, "archives"));

  const archives = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    archives.push({
      id: docSnap.id,
      date: data.seasonName || data.dateKey || docSnap.id,
      createdAt: data.createdAt?.seconds || 0,
    });
  });

  // 🔥 tri par date
  archives.sort((a, b) => b.createdAt - a.createdAt);

  // 📦 remplissage des selects
  archives.forEach((archive) => {
    selects.forEach((select) => {
      if (!select) return;

      const option = document.createElement("option");
      option.value = archive.id;
      option.textContent = `📅 ${archive.date}`;

      select.appendChild(option);
    });
  });

  const archiveSelect = document.getElementById("archiveSelect");

  if (archiveSelect) {
    archiveSelect.onchange = function () {
      const container = document.getElementById("archiveTable");
      const title = document.getElementById("archiveTitle");

      // 🧹 si rien sélectionné → fermeture complète
      if (!this.value) {
        if (container) container.innerHTML = "";
        if (title) title.innerText = "";

        if (window.archiveChart) {
          window.archiveChart.destroy();
          window.archiveChart = null;
        }

        return;
      }

      loadArchive(this.value);
    };
  }
};

window.loadArchive = async function (archiveId) {
  const tbody = document.getElementById("archiveTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  const snap = await safeGetDoc(doc(db, "archives", archiveId));
  if (!snap.exists()) return;

  const data = snap.data();
  const ranking = data.ranking || [];

  // =========================
  // 📊 TABLEAU
  // =========================
  ranking.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.rank}</td>
      <td>${p.name}</td>
      <td>${p.wins}</td>
      <td>${p.losses}</td>
      <td><b>${p.elo}</b></td>
    `;

    tbody.appendChild(tr);
  });

  // =========================
  // 📈 TITRE
  // =========================
  const title = document.getElementById("archiveTitle");
  if (title) {
    title.innerText = data.seasonName || "Archive";
  }

  // =========================
  // 📈 GRAPHIQUE
  // =========================
  if (typeof renderArchiveChart === "function") {
    renderArchiveChart(ranking);
  }
};

// =========================
// 📂 Compare ARCHIVE LIST
// =========================
window.compareArchives = async function (idA, idB) {
  if (!idA || !idB) return;

  const aSnap = await safeGetDoc(doc(db, "archives", idA));
  const bSnap = await safeGetDoc(doc(db, "archives", idB));

  if (!aSnap.exists() || !bSnap.exists()) return;

  const a = aSnap.data().ranking || [];
  const b = bSnap.data().ranking || [];

  const mapA = new Map(a.map((p) => [p.name, p.elo]));
  const mapB = new Map(b.map((p) => [p.name, p.elo]));

  const allNames = new Set([...mapA.keys(), ...mapB.keys()]);

  const evolution = [];

  allNames.forEach((name) => {
    const eloA = mapA.get(name) ?? 2000;
    const eloB = mapB.get(name) ?? 2000;

    evolution.push({
      name,
      before: eloA,
      after: eloB,
      diff: eloB - eloA,
    });
  });

  evolution.sort((a, b) => b.diff - a.diff);

  renderEvolutionTable(evolution);
  renderSeasonChart(evolution);
};

window.runArchiveComparison = function () {
  const a = document.getElementById("archiveA")?.value;
  const b = document.getElementById("archiveB")?.value;

  window.compareArchives(a, b);
};

// =========================
// 📂 Evolution dans ARCHIVE
// =========================
window.renderEvolutionTable = function (data) {
  const tbody = document.getElementById("evolutionTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  data.forEach((p) => {
    const tr = document.createElement("tr");

    let color = "black";
    if (p.diff > 0) color = "green";
    if (p.diff < 0) color = "red";

    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.before}</td>
      <td>${p.after}</td>
      <td style="color:${color}; font-weight:bold;">
        ${p.diff > 0 ? "+" : ""}${p.diff}
      </td>
    `;

    tbody.appendChild(tr);
  });
};

let seasonChart = null;

window.renderSeasonChart = function (data) {
  const ctx = document.getElementById("seasonChart");

  if (!ctx) return;

  if (seasonChart) {
    seasonChart.destroy();
  }

  seasonChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map((p) => p.name),
      datasets: [
        {
          label: "ELO fin de saison",
          data: data.map((p) => p.after),
        },
      ],
    },
    options: {
      responsive: true,
    },
  });
};

// =========================
// 📊 UPDATE ELO (FIXÉ)
// =========================
async function updatePlayerStats(match) {
  console.log("🔥 updatePlayerStats lancé");

  if (match.type === "tournament") {
    console.log("🚫 Match tournoi ignoré ELO global");
    return;
  }

  const snapshot = await safeGetDocs(collection(db, "players"));
  const names = [match.b1, match.b2, match.r1, match.r2].filter(Boolean);

  let joueurs = [];

  snapshot.forEach((d) => {
    const p = d.data();

    // ✅ Ignore documents sans name ou sans elo valide (doublons corrompus)
    if (!p?.name) return;
    if (typeof p.elo !== "number") return;
    if (!names.includes(p.name)) return;

    joueurs.push({
      ...p,
      id: d.id,
      name: p.name,
      oldElo: p.elo ?? 2000,
      elo: p.elo ?? 2000,
      wins: p.wins ?? 0,
      losses: p.losses ?? 0,
      history: Array.isArray(p.history) ? [...p.history] : [],
    });
  });

  // ✅ Dédoublonnage : garder uniquement le joueur avec ID auto-généré (le plus long)
  const seen = new Map();
  for (const j of joueurs) {
    if (!seen.has(j.name) || j.id.length > seen.get(j.name).id.length) {
      seen.set(j.name, j);
    }
  }
  joueurs = Array.from(seen.values());

  console.log("Joueurs trouvés :", joueurs);

  const blueWin = match.sb > match.sr;

  const teamBleu = joueurs.filter((j) => [match.b1, match.b2].includes(j.name));
  const teamRouge = joueurs.filter((j) => [match.r1, match.r2].includes(j.name));

  [...teamBleu, ...teamRouge].forEach(j => {
    if (typeof j.elo !== "number" || isNaN(j.elo)) j.elo = 2000;
    if (typeof j.oldElo !== "number" || isNaN(j.oldElo)) j.oldElo = 2000;
  });

  updateElo2v2(teamBleu, teamRouge, blueWin ? 1 : 0);

  let simulationResult = [];

  for (const j of joueurs) {
    let wins = j.wins;
    let losses = j.losses;

    const isBlue = [match.b1, match.b2].includes(j.name);
    const isWinner = (isBlue && blueWin) || (!isBlue && !blueWin);

    if (isWinner) {
      wins++;
      j.history.push("🟢");
    } else {
      losses++;
      j.history.push("🔴");
    }

    if (j.history.length > 5) j.history.shift();

    const oldElo = j.oldElo ?? 2000;
    const newElo = j.elo ?? oldElo;

    simulationResult.push({
      name: j.name,
      oldElo,
      newElo,
      diff: newElo - oldElo,
      wins,
      losses,
      history: j.history,
    });

    if (!isTestMode() && j.id) {
  const safeElo = typeof newElo === "number" && !isNaN(newElo) ? Math.round(newElo) : 2000;
  const safeOldElo = typeof oldElo === "number" && !isNaN(oldElo) ? Math.round(oldElo) : 2000;
  const safeHistory = Array.isArray(j.history)
    ? j.history.filter(h => h !== undefined && h !== null)
    : [];

  const payload = {
    wins: Number(wins) || 0,
    losses: Number(losses) || 0,
    elo: Number(safeElo) || 2000,
    lastDiff: Number(safeElo - safeOldElo) || 0,
    history: safeHistory,
  };

  console.log("💾 Sauvegarde:", j.name, j.id, JSON.stringify(payload));

  try {
    await safeUpdateDoc(doc(db, "players", j.id), payload);
    console.log("✅ Sauvegardé:", j.name);
  } catch (err) {
    console.error("❌ Erreur sauvegarde pour", j.name, ":", err.message);
  }
}

  return {
    eloBefore: {
      b1: Math.round(teamBleu[0]?.oldElo ?? 2000),
      b2: Math.round(teamBleu[1]?.oldElo ?? 2000),
      r1: Math.round(teamRouge[0]?.oldElo ?? 2000),
      r2: Math.round(teamRouge[1]?.oldElo ?? 2000),
    },
    eloAfter: {
      b1: Math.round(teamBleu[0]?.elo ?? 2000),
      b2: Math.round(teamBleu[1]?.elo ?? 2000),
      r1: Math.round(teamRouge[0]?.elo ?? 2000),
      r2: Math.round(teamRouge[1]?.elo ?? 2000),
    },
    eloChange: {
      b1: Math.round((teamBleu[0]?.elo ?? 2000) - (teamBleu[0]?.oldElo ?? 2000)),
      b2: Math.round((teamBleu[1]?.elo ?? 2000) - (teamBleu[1]?.oldElo ?? 2000)),
      r1: Math.round((teamRouge[0]?.elo ?? 2000) - (teamRouge[0]?.oldElo ?? 2000)),
      r2: Math.round((teamRouge[1]?.elo ?? 2000) - (teamRouge[1]?.oldElo ?? 2000)),
    },
    debug: simulationResult,
  };
}

// =========================
// 📜 MATCHES
// =========================

window.loadMatches = async function () {
  const list = document.getElementById("matchHistory");
  if (!list) return;

  list.innerHTML = "";

  const selectedPlayer =
    document.getElementById("historyPlayerFilter")?.value?.toLowerCase() || "";

  if (!selectedPlayer) {
    list.innerHTML = `
      <div style="
        padding:20px;
        text-align:center;
        color:#64748b;
        font-weight:bold;
      ">
        👤 Sélectionne un joueur pour afficher les matchs
      </div>
    `;
    return;
  }

  const resultFilter =
    document.getElementById("historyResultFilter")?.value || "";

  const q = query(collection(db, "matches"), orderBy("createdAt", "desc"));

  const snapshot = await safeGetDocs(q);

  snapshot.forEach((d) => {
    const m = d.data();

    const players = [m.b1, m.b2, m.r1, m.r2]
      .filter((p) => p)
      .map((p) => p.toLowerCase());

    if (!players.includes(selectedPlayer)) return;

    let isWin = false;

    const inBlue =
      m.b1?.toLowerCase() === selectedPlayer ||
      m.b2?.toLowerCase() === selectedPlayer;

    const inRed =
      m.r1?.toLowerCase() === selectedPlayer ||
      m.r2?.toLowerCase() === selectedPlayer;

    if (inBlue) {
      isWin = m.sb > m.sr;
    } else if (inRed) {
      isWin = m.sr > m.sb;
    }

    if (resultFilter === "win" && !isWin) return;
    if (resultFilter === "loss" && isWin) return;

    const li = document.createElement("li");
    li.classList.add("match-card");
    li.style.minWidth = "260px";
    li.style.maxWidth = "260px";

    const blueWin = m.sb > m.sr;

    // =========================
    // 📅 DATE
    // =========================
    let date = "Date inconnue";

    if (m.createdAt?.seconds) {
      date = new Date(m.createdAt.seconds * 1000).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
    } else if (m.createdAtLocal) {
      date = new Date(m.createdAtLocal).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
    }

    // =========================
    // 💰 ELO INFO
    // =========================
    let eloInfo = "";

    if (m.eloChange) {
      eloInfo = `
        <div style="
          display:grid;
          grid-template-columns: 1fr auto;
          font-size:12px;
          margin-top:6px;
          padding:0 6px;
          font-weight:bold;
          row-gap:4px;
        ">

          <div style="color:#3b82f6;">
            🔵 ${m.b1}-${m.b2}
          </div>

          <div style="color:#3b82f6; text-align:right;">
            ${m.sb}
          </div>

          <div style="color:#3b82f6;">
            ${m.eloChange.b1 > 0 ? "+" : ""}${m.eloChange.b1}
            &nbsp;&nbsp;
            ${m.eloChange.b2 > 0 ? "+" : ""}${m.eloChange.b2}
          </div>

          <div></div>

          <div style="color:#ef4444; margin-top:6px;">
            🔴 ${m.r1}-${m.r2}
          </div>

          <div style="color:#ef4444; text-align:right; margin-top:6px;">
            ${m.sr}
          </div>

          <div style="color:#ef4444;">
            ${m.eloChange.r1 > 0 ? "+" : ""}${m.eloChange.r1}
            &nbsp;&nbsp;
            ${m.eloChange.r2 > 0 ? "+" : ""}${m.eloChange.r2}
          </div>

          <div></div>

        </div>
      `;
    }

    // =========================
    // 🖼 HTML MATCH
    // =========================

    li.innerHTML = `
      <div class="match-row team-blue">
        <span>🔵 ${m.b1}-${m.b2}</span>
        <span class="score">${m.sb} ${blueWin ? "🏆" : ""}</span>
      </div>

      <div class="match-row team-red">
        <span>🔴 ${m.r1}-${m.r2}</span>
        <span class="score">${m.sr} ${!blueWin ? "🏆" : ""}</span>
      </div>

      ${eloInfo}

      <div class="date">
        📅 ${date}
      </div>

      ${
        window.isAdmin
          ? `
        <button
          onclick="deleteMatch('${d.id}')"
          style="
            margin-top:10px;
            background:#dc2626;
            color:white;
            border:none;
            padding:8px 12px;
            border-radius:8px;
            cursor:pointer;
            width:100%;
            font-weight:bold;
          "
        >
          🗑 Supprimer
        </button>
      `
          : ""
      }
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

  const snapshot = await safeGetDocs(collection(db, "players"));

  snapshot.forEach((doc) => {
    const p = doc.data();

    // 🚫 ignore les joueurs désactivés
    if (p.active === false) return;

    if (!p.name) return; // sécurité bonus

    const option = document.createElement("option");
    option.value = p.name;
    option.textContent = p.name;

    select.appendChild(option);
  });

  // 🔥 éviter d'empiler plusieurs listeners
  select.onchange = function () {
    const trendSelect = document.getElementById("trendPlayerFilter");

    if (trendSelect) {
      trendSelect.value = this.value;
    }

    if (typeof loadPlayerEloTrend === "function") {
      loadPlayerEloTrend();
    }
  };
};

// =========================
// Commentaire
// =========================
window.loadComments = async function () {
  const list = document.getElementById("commentList");
  if (!list) return;

  list.innerHTML = "";

  const snapshot = await safeGetDocs(collection(db, "comments"));

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
window.openTournamentTab = function (tab) {
  // cache tout
  document.querySelectorAll(".tournament-tab").forEach((el) => {
    el.style.display = "none";
  });

  // ouvre bon onglet
  document.getElementById(`tournament-${tab}`).style.display = "block";

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
  const menu = document.querySelector(".tournament-menu");

  if (menu) {
    menu.style.display = "block";
  }
  openTournamentTab("matches");
  await loadTournamentMatches(tournamentId);
  await loadTournamentRanking(tournamentId);
};

window.openTournamentMatches = async function (tournamentId) {
  window.currentTournamentId = tournamentId;
  openModal("tournament");
  const menu = document.querySelector(".tournament-menu");

  if (menu) {
    menu.style.display = "block";
  }
  openTournamentTab("matches");
  await loadTournamentMatches(tournamentId);
  await loadTournamentRanking(tournamentId);
};

window.openTournamentRankingView = async function (tournamentId) {
  window.currentTournamentId = tournamentId;
  openModal("tournament");
  const menu = document.querySelector(".tournament-menu");

  if (menu) {
    menu.style.display = "block";
  }
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

// =========================
// 🎛️ UPDATE TEAM MODE UI
// =========================
window.updateTeamModeUI = function () {
  const teamMode = document.getElementById("teamMode").value;
  const manualSection = document.getElementById("manualTeamSection");

  if (teamMode === "manual") {
    manualSection.style.display = "block";
    window.manualTeamCount = 0;
    document.getElementById("manualTeamContainer").innerHTML = "";

    // Ajouter 2 équipes par défaut
    addManualTeam();
    addManualTeam();

    loadPlayersSelect();
  } else {
    manualSection.style.display = "none";
  }
};

// =========================
// ➕ AJOUTER UNE ÉQUIPE MANUELLE
// =========================
window.addManualTeam = function () {
  if (!window.manualTeamCount) {
    window.manualTeamCount = 0;
  }

  window.manualTeamCount++;
  const teamId = window.manualTeamCount;

  const container = document.getElementById("manualTeamContainer");

  const teamDiv = document.createElement("div");
  teamDiv.id = `team-${teamId}`;
  teamDiv.style.marginBottom = "20px";
  teamDiv.style.padding = "15px";
  teamDiv.style.border = "1px solid #cbd5e1";
  teamDiv.style.borderRadius = "8px";
  teamDiv.style.backgroundColor = "rgba(255,255,255,0.5)";

  let removeBtn = "";
  if (window.manualTeamCount > 2) {
    removeBtn = `<button type="button" onclick="removeManualTeam(${teamId})" class="btn-danger" style="margin-top: 10px; width: 100%; max-width: 150px;">Supprimer</button>`;
  }

  teamDiv.innerHTML = `
    <h5 style="margin-top: 0; color: #1e293b;">⚽ Équipe ${teamId}</h5>
    
    <label style="display: block; margin-bottom: 5px;">Nom personnalisé</label>
    <input 
      id="teamName-${teamId}" 
      type="text" 
      placeholder="Ex: Les Invincibles"
    >
    
    <label style="display: block; margin-top: 10px; margin-bottom: 5px;">Joueur 1</label>
    <select id="teamPlayer1-${teamId}"></select>
    
    <label style="display: block; margin-top: 10px; margin-bottom: 5px;">Joueur 2</label>
    <select id="teamPlayer2-${teamId}"></select>
    
    ${removeBtn}
  `;

  container.appendChild(teamDiv);

  // Remplir les sélecteurs avec les joueurs
  loadPlayersForTeam(teamId);
};

// =========================
// ➖ SUPPRIMER UNE ÉQUIPE MANUELLE
// =========================
window.removeManualTeam = function (teamId) {
  const teamDiv = document.getElementById(`team-${teamId}`);
  if (teamDiv) {
    teamDiv.remove();
  }
};

// =========================
// 🎯 CHARGER JOUEURS POUR UNE ÉQUIPE
// =========================
window.loadPlayersForTeam = async function (teamId) {
  const snapshot = await safeGetDocs(collection(db, "players"));

  const select1 = document.getElementById(`teamPlayer1-${teamId}`);
  const select2 = document.getElementById(`teamPlayer2-${teamId}`);

  if (!select1 || !select2) return;

  select1.innerHTML = "<option value=''>-- choisir --</option>";
  select2.innerHTML = "<option value=''>-- choisir --</option>";

  snapshot.forEach((doc) => {
    const p = doc.data();

    // 🚫 ignore joueurs désactivés
    if (p.active === false) return;

    // sécurité
    if (!p.name) return;

    const option1 = document.createElement("option");
    option1.value = p.name;
    option1.textContent = p.name;

    const option2 = document.createElement("option");
    option2.value = p.name;
    option2.textContent = p.name;

    select1.appendChild(option1);
    select2.appendChild(option2);
  });
};

window.createTournament = async function () {
  try {
    const name = document.getElementById("tournamentName")?.value?.trim();
    const mode = document.getElementById("tournamentMode")?.value;
    const doubleRound = document.getElementById("doubleRound")?.checked;
    const winPoints = parseInt(
      document.getElementById("winPoints")?.value || 3,
    );
    const lossPoints = parseInt(
      document.getElementById("lossPoints")?.value || 0,
    );
    const offBonus = parseInt(document.getElementById("offBonus")?.value || 1);
    const defBonus = parseInt(document.getElementById("defBonus")?.value || 1);

    if (!name) {
      alert("Nom du tournoi obligatoire");
      return;
    }

    // =========================
    // 🏆 CREATE TOURNAMENT
    // =========================
    const tournamentRef = await safeAddDoc(collection(db, "tournaments"), {
      name,
      mode,
      doubleRound,
      winPoints,
      lossPoints,
      offBonus,
      defBonus,
      createdAt: serverTimestamp(),
      status: "waiting",
    });

    let manualTeamsData = null;

    // =========================
    // 👥 MODE MANUAL
    // =========================
    if (mode === "manual") {
      manualTeamsData = [];
      const teamDivs = document.querySelectorAll("#manualTeamContainer > div");
      const usedPlayers = new Set();

      teamDivs.forEach((teamDiv, index) => {
        const realId = teamDiv.id.replace("team-", "");

        const nameInput = document.getElementById(`teamName-${realId}`);
        const player1Select = document.getElementById(`teamPlayer1-${realId}`);
        const player2Select = document.getElementById(`teamPlayer2-${realId}`);

        const teamName = nameInput?.value?.trim() || `Équipe ${index + 1}`;
        const player1 = player1Select?.value;
        const player2 = player2Select?.value;

        if (!player1 || !player2) {
          throw new Error("Missing player");
        }

        if (player1 === player2) {
          throw new Error("Same players");
        }

        if (usedPlayers.has(player1) || usedPlayers.has(player2)) {
          throw new Error("Duplicate player");
        }

        usedPlayers.add(player1);
        usedPlayers.add(player2);

        manualTeamsData.push({
          teamName,
          player1,
          player2,
        });
      });

      if (manualTeamsData.length < 2) {
        alert("Au moins 2 équipes nécessaires");
        return;
      }
    }

    // =========================
    // ⚙️ GENERATION
    // =========================
    await generateTeams(tournamentRef.id, mode, manualTeamsData);

    await generateMatches(tournamentRef.id, doubleRound);

    // =========================
    // 🔁 REFRESH UI
    // =========================
    window.currentTournamentId = tournamentRef.id;

    await loadTournamentMatches(tournamentRef.id);
    await loadTournamentRanking(tournamentRef.id);
    await loadTournaments();

    alert("🏆 Tournoi créé avec succès");

    const input = document.getElementById("tournamentName");
    if (input) input.value = "";
  } catch (e) {
    console.error("createTournament error:", e);
    alert("Erreur création tournoi");
  }
};

window.generateTeams = async function (tournamentId, mode, manualTeamsData) {
  const snapshot = await safeGetDocs(collection(db, "players"));

  let players = [];

  snapshot.forEach((doc) => {
    players.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  // =========================
  // 👥 CRÉATION ÉQUIPES MANUELLES
  // =========================

  if (mode === "manual" && manualTeamsData && Array.isArray(manualTeamsData)) {
    let teams = manualTeamsData.map((team) => ({
      player1: team.player1,
      player2: team.player2 || "",
      teamName: team.teamName,
      points: 0,
      wins: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      createdAt: serverTimestamp(),
    }));

    for (const team of teams) {
      await safeAddDoc(
        collection(db, "tournaments", tournamentId, "teams"),
        team,
      );
    }

    return;
  }

  // minimum 4 joueurs
  if (players.length < 4) {
    alert("Pas assez de joueurs");
    return;
  }

  // =========================
  // 🔀 MODE ALÉATOIRE
  // =========================

  if (mode === "random") {
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }
  }

  // =========================
  // ⚖️ MODE ELO
  // =========================

  if (mode === "elo") {
    // trie du plus fort au plus faible
    players.sort((a, b) => (b.elo || 2000) - (a.elo || 2000));

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
      teamName: `${players[i].name} & ${players[i + 1].name}`,
      points: 0,
      wins: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      createdAt: serverTimestamp(),
    });
  }

  // =========================
  // 💾 SAVE FIREBASE
  // =========================

  for (const team of teams) {
    await safeAddDoc(
      collection(db, "tournaments", tournamentId, "teams"),
      team,
    );
  }

  console.log("👥 Équipes créées :", teams);
};

window.loadTournaments = async function () {
  const activeContainer = document.getElementById("activeTournaments");
  const recentContainer = document.getElementById("recentTournaments");
  const historyContainer = document.getElementById("finishedTournaments");

  [activeContainer, recentContainer, historyContainer].forEach((c) => {
    if (c) c.innerHTML = "";
  });

  const snapshot = await safeGetDocs(collection(db, "tournaments"));

  if (snapshot.empty) {
    if (activeContainer)
      activeContainer.innerHTML = "<p>Aucun tournoi en cours</p>";
    if (recentContainer)
      recentContainer.innerHTML = "<p>Aucun podium récent</p>";
    if (historyContainer) historyContainer.innerHTML = "<p>Aucun tournoi</p>";

    return;
  }

  const now = Date.now();
  const recentThreshold = 48 * 60 * 60 * 1000;

  snapshot.forEach((docSnap) => {
    const t = docSnap.data();
    const finishedAt = getTimestampDate(t.finishedAt);
    const isFinished = t.status === "finished";
    const isRecent =
      isFinished && finishedAt && now - finishedAt.getTime() <= recentThreshold;

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

    const modeText = t.mode === "elo" ? "⚖️ Mode ELO" : "🔀 Mode aléatoire";

    const roundText = t.doubleRound ? "🔁 Aller / retour" : "➡️ Match simple";

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

window.generateMatches = async function (tournamentId, doubleRound) {
  // récupère équipes
  const snapshot = await safeGetDocs(
    collection(db, "tournaments", tournamentId, "teams"),
  );

  let teams = [];

  snapshot.forEach((doc) => {
    teams.push({
      id: doc.id,
      ...doc.data(),
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
        blueTeamName: `${teams[i].player1}/${teams[i].player2}`,

        redTeamId: teams[j].id,
        redTeamName: `${teams[j].player1}/${teams[j].player2}`,
        sb: null,
        sr: null,
        played: false,
        createdAt: serverTimestamp(),
      });

      // aller / retour
      if (doubleRound) {
        matches.push({
          blueTeamId: teams[j].id,
          blueTeamName: `${teams[j].player1}/${teams[j].player2}`,

          redTeamId: teams[i].id,
          redTeamName: `${teams[i].player1}/${teams[i].player2}`,
          sb: null,
          sr: null,
          played: false,
          createdAt: serverTimestamp(),
        });
      }
    }
  }

  // =========================
  // 💾 SAVE FIREBASE
  // =========================

  for (const match of matches) {
    await safeAddDoc(
      collection(db, "tournaments", tournamentId, "matches"),
      match,
    );
  }

  console.log("⚔️ Matchs générés :", matches);
};

window.loadTournamentMatches = async function (tournamentId) {
  const container = document.getElementById("tournamentMatches");

  if (!container) return;

  container.innerHTML = "";

  const snapshot = await safeGetDocs(
    collection(db, "tournaments", tournamentId, "matches"),
  );

  if (snapshot.empty) {
    container.innerHTML = "<p>Aucun match</p>";

    return;
  }

  snapshot.forEach((docSnap) => {
    const match = docSnap.data();

    // ignore matchs déjà joués
    if (match.played) {
      return;
    }

    const div = document.createElement("div");

    div.classList.add("match-card");

    const blue = match.blueTeam
      ? `${match.blueTeam.teamName || `${match.blueTeam.player1}/${match.blueTeam.player2}`}`
      : match.blueTeamName;

    const red = match.redTeam
      ? `${match.redTeam.teamName || `${match.redTeam.player1}/${match.redTeam.player2}`}`
      : match.redTeamName;

    const bluePlayers = match.blueTeam
      ? `${match.blueTeam.player1} / ${match.blueTeam.player2}`
      : "";

    const redPlayers = match.redTeam
      ? `${match.redTeam.player1} / ${match.redTeam.player2}`
      : "";

    div.innerHTML = `

      <div class="match-row team-blue">
        <div>
          🔵 <strong>${blue}</strong><br/>
          <small style="color: #666;">${bluePlayers}</small>
        </div>
      </div>

      <div class="match-row team-red">
        <div>
          🔴 <strong>${red}</strong><br/>
          <small style="color: #666;">${redPlayers}</small>
        </div>
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
  id="save-btn-${docSnap.id}"
  class="save-score-btn"
  onclick="saveTournamentMatch(
    '${tournamentId}',
    '${docSnap.id}')">
  Enregistrer
</button>

    `;

    container.appendChild(div);
  });
};

window.saveTournamentMatch = async function (tournamentId, matchId) {
  const button = document.getElementById(`save-btn-${matchId}`);

  if (!button) return;

  const resetButton = () => {
    button.disabled = false;
    button.textContent = "Enregistrer";
    button.style.opacity = "1";
    button.style.cursor = "pointer";
    button.style.background = "";
  };

  const lockButton = () => {
    button.disabled = true;
    button.textContent = "Enregistrement...";
    button.style.opacity = "0.6";
    button.style.cursor = "not-allowed";
  };

  const getScore = (id) => parseInt(document.getElementById(id)?.value);

  if (button.disabled) return;

  lockButton();

  const sb = getScore(`sb-${matchId}`);
  const sr = getScore(`sr-${matchId}`);

  try {
    // =========================
    // VALIDATION
    // =========================

    if ([sb, sr].some((v) => isNaN(v))) {
      alert("Score invalide");
      return;
    }

    if (sb === sr) {
      alert("Match nul interdit");
      return;
    }

    if (sb < 0 || sr < 0 || sb > 10 || sr > 10) {
      alert("Les scores doivent être entre 0 et 10");
      return;
    }

    if (sb !== 10 && sr !== 10) {
      alert("Le gagnant doit avoir 10");
      return;
    }

    if (sb === 10 && sr === 10) {
      alert("Score impossible");
      return;
    }

    // =========================
    // FIREBASE
    // =========================

    const matchRef = doc(db, "tournaments", tournamentId, "matches", matchId);
    const matchSnap = await getDoc(matchRef);

    const match = matchSnap.data();

    if (match?.played) {
      button.textContent = "✅ Déjà enregistré";
      button.style.background = "#16a34a";
      return;
    }

    await safeUpdateDoc(matchRef, {
      sb,
      sr,
      played: true,
      type: "tournament",
    });

    await updateTournamentRanking(tournamentId, {
      id: matchId,
      ...match,
      sb,
      sr,
    });

    await loadTournamentMatches(tournamentId);

    alert("✅ Score enregistré");
  } catch (err) {
    console.error("saveTournamentMatch error:", err);
    alert("Erreur enregistrement");
  } finally {
    resetButton();
  }
};

window.updateTournamentRanking = async function (tournamentId, match) {
  // 🚫 sécurité : ne traiter que les matchs tournoi
  if (match.type === "classic") {
    console.log("🚫 Match classique ignoré dans tournoi");
    return;
  }

  // =========================
  // RÉCUP TOURNOI
  // =========================

  const tournamentDoc = await getDoc(doc(db, "tournaments", tournamentId));

  const tournament = tournamentDoc.data();

  if (!tournament) {
    console.error("Tournoi introuvable");
    return;
  }

  // paramètres
  const winPoints = tournament.winPoints || 3;
  const lossPoints = tournament.lossPoints || 0;
  const offBonus = tournament.offBonus || 1;
  const defBonus = tournament.defBonus || 1;

  // =========================
  // RÉCUP ÉQUIPES
  // =========================

  const teamsSnapshot = await safeGetDocs(
    collection(db, "tournaments", tournamentId, "teams"),
  );

  let teams = [];

  teamsSnapshot.forEach((docSnap) => {
    teams.push({
      id: docSnap.id,
      ref: docSnap.ref,
      ...docSnap.data(),
    });
  });

  // =========================
  // TROUVER LES 2 ÉQUIPES
  // =========================

  const blueTeam = teams.find((team) => team.id === match.blueTeamId);

  const redTeam = teams.find((team) => team.id === match.redTeamId);

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
  if (match.sb >= 10) bluePoints += offBonus;
  if (match.sr >= 10) redPoints += offBonus;

  // bonus défensif
  if (match.sb < match.sr && match.sb >= 9) {
    bluePoints += defBonus;
  }

  if (match.sr < match.sb && match.sr >= 9) {
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

  await safeUpdateDoc(blueTeam.ref, {
    points: blueTeam.points,
    wins: blueTeam.wins,
    losses: blueTeam.losses,
    goalsFor: blueTeam.goalsFor,
    goalsAgainst: blueTeam.goalsAgainst,
  });

  await safeUpdateDoc(redTeam.ref, {
    points: redTeam.points,
    wins: redTeam.wins,
    losses: redTeam.losses,
    goalsFor: redTeam.goalsFor,
    goalsAgainst: redTeam.goalsAgainst,
  });

  // =========================
  // REFRESH UI
  // =========================

  await loadTournamentRanking(tournamentId);
  await checkTournamentFinished(tournamentId);
};

window.loadTournamentRanking = async function (tournamentId) {
  const tbody = document.getElementById("tournamentRanking");

  if (!tbody) return;

  tbody.innerHTML = "";

  // =========================
  // RÉCUP ÉQUIPES
  // =========================

  const snapshot = await safeGetDocs(
    collection(db, "tournaments", tournamentId, "teams"),
  );

  let teams = [];

  snapshot.forEach((docSnap) => {
    teams.push({
      id: docSnap.id,
      ...docSnap.data(),
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
    const diffA = a.goalsFor - a.goalsAgainst;

    const diffB = b.goalsFor - b.goalsAgainst;

    if (diffB !== diffA) {
      return diffB - diffA;
    }

    // buts marqués
    return b.goalsFor - a.goalsFor;
  });

  const winnerBox = document.getElementById("tournamentWinner");

  if (winnerBox && teams.length > 0) {
    const winner = teams[0];

    winnerBox.innerHTML = `

    <div class="winner-card">

      🏆 Champion du tournoi

      <h2>
        ${winner.teamName || `${winner.player1} / ${winner.player2}`}
      </h2>

      <p style="font-size: 13px;">
        ${winner.player1} / ${winner.player2}
      </p>

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
    const tr = document.createElement("tr");

    const diff = team.goalsFor - team.goalsAgainst;

    tr.innerHTML = `
    
      <td>${index + 1}</td>

      <td>
        <strong>${team.teamName || "Équipe"}</strong><br/>
        <small style="color: #666;">${team.player1} / ${team.player2}</small>
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
  const snapshot = await safeGetDocs(
    collection(db, "tournaments", tournamentId, "teams"),
  );

  let teams = [];
  snapshot.forEach((docSnap) => {
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

  await safeUpdateDoc(doc(db, "tournaments", tournamentId), {
    winnerName,
  });

  return winnerName;
};

window.checkTournamentFinished = async function (tournamentId) {
  // récup matchs
  const snapshot = await safeGetDocs(
    collection(db, "tournaments", tournamentId, "matches"),
  );

  let total = 0;
  let played = 0;

  snapshot.forEach((docSnap) => {
    total++;

    const match = docSnap.data();

    if (match.played) {
      played++;
    }
  });

  // tournoi terminé
  if (total > 0 && total === played) {
    const winnerName = await storeTournamentWinner(tournamentId);

    await safeUpdateDoc(doc(db, "tournaments", tournamentId), {
      status: "finished",
      finishedAt: serverTimestamp(),
      winnerName,
    });

    alert(`🏆 Tournoi terminé !${winnerName ? ` Podium : ${winnerName}` : ""}`);

    // récup classement final
    await loadTournamentRanking(tournamentId);
  }
};

// =========================
// � TENDANCE ELO
// =========================

// 🔥 Charger les joueurs dans le select Tendance
window.loadPlayersTrendFilter = async function () {
  const select1 = document.getElementById("trendPlayerFilter");
  const select2 = document.getElementById("trendPlayerFilter2");

  if (!select1 || !select2) return;

  select1.innerHTML = "<option value=''>-- Joueur 1 --</option>";
  select2.innerHTML = "<option value=''>-- Joueur 2 (optionnel) --</option>";

  const snapshot = await safeGetDocs(collection(db, "players"));

  snapshot.forEach((doc) => {
    const p = doc.data();

    const option1 = document.createElement("option");
    option1.value = p.name;
    option1.textContent = p.name;

    const option2 = document.createElement("option");
    option2.value = p.name;
    option2.textContent = p.name;

    select1.appendChild(option1);
    select2.appendChild(option2);
  });
};

// 🔥 Charger l'historique ELO d'un joueur et afficher le graphique
window.loadPlayerEloTrend = async function () {
  const p1 = document.getElementById("trendPlayerFilter")?.value?.toLowerCase();

  const p2 = document
    .getElementById("trendPlayerFilter2")
    ?.value?.toLowerCase();

  if (!p1 && !p2) return;

  const q = query(collection(db, "matches"), orderBy("createdAt", "asc"));

  const snapshot = await safeGetDocs(q);

  const history1 = [];
  const history2 = [];
  const labels = [];

  let step = 0;

  snapshot.forEach((d) => {
    const m = d.data();

    // ignore matchs invalides
    if (!m.eloAfter) return;

    const players = {
      b1: m.b1?.toLowerCase(),
      b2: m.b2?.toLowerCase(),
      r1: m.r1?.toLowerCase(),
      r2: m.r2?.toLowerCase(),
    };

    let changed = false;

    // =========================
    // JOUEUR 1
    // =========================
    if (p1) {
      if (players.b1 === p1) {
        history1.push(m.eloAfter.b1);
        changed = true;
      } else if (players.b2 === p1) {
        history1.push(m.eloAfter.b2);
        changed = true;
      } else if (players.r1 === p1) {
        history1.push(m.eloAfter.r1);
        changed = true;
      } else if (players.r2 === p1) {
        history1.push(m.eloAfter.r2);
        changed = true;
      }
    }

    // =========================
    // JOUEUR 2
    // =========================
    if (p2) {
      if (players.b1 === p2) {
        history2.push(m.eloAfter.b1);
        changed = true;
      } else if (players.b2 === p2) {
        history2.push(m.eloAfter.b2);
        changed = true;
      } else if (players.r1 === p2) {
        history2.push(m.eloAfter.r1);
        changed = true;
      } else if (players.r2 === p2) {
        history2.push(m.eloAfter.r2);
        changed = true;
      }
    }

    // label seulement si utile
    if (changed) {
      step++;
      labels.push(`M${step}`);
    }
  });

  const ctx = document.getElementById("eloChart")?.getContext("2d");

  if (!ctx) return;

  // destroy ancien chart
  if (window.eloChartInstance) {
    window.eloChartInstance.destroy();
  }

  const datasets = [];

  // =========================
  // DATASET P1
  // =========================
  if (p1) {
    datasets.push({
      label: p1,
      data: history1,
      borderColor: "#3b82f6",
      backgroundColor: "rgba(59,130,246,0.12)",
      borderWidth: 3,
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: true,
    });
  }

  // =========================
  // DATASET P2
  // =========================
  if (p2) {
    datasets.push({
      label: p2,
      data: history2,
      borderColor: "#ef4444",
      backgroundColor: "rgba(239,68,68,0.12)",
      borderWidth: 3,
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: true,
    });
  }

  // =========================
  // CHART
  // =========================
  window.eloChartInstance = new Chart(ctx, {
    type: "line",

    data: {
      labels,
      datasets,
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        mode: "index",
        intersect: false,
      },

      plugins: {
        legend: {
          display: true,
        },

        tooltip: {
          callbacks: {
            label: function (context) {
              return `ELO : ${context.parsed.y}`;
            },
          },
        },
      },

      scales: {
        y: {
          beginAtZero: false,

          ticks: {
            callback: function (value) {
              return value;
            },
          },
        },
      },
    },
  });
};

// =========================
// 🚀 INIT
// =========================
document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // 🧪 MODE TEST / PROD
  // =========================
  if (window.APP_MODE === "test") {
    document.body.style.border = "5px solid red";
    console.log("🧪 MODE TEST ACTIVÉ");
  } else {
    console.log("🚀 MODE PROD ACTIVÉ");
  }

  // =========================
  // 🧠 DEBUG CONSOLE (IMPORTANT)
  // =========================
  // permet de tester Firebase directement dans la console
  if (typeof db !== "undefined") window.db = db;
  if (typeof getDocs !== "undefined") window.getDocs = getDocs;
  if (typeof collection !== "undefined") window.collection = collection;

  // expose fonctions utiles pour debug manuel
  window.loadRanking = loadRanking;
  window.loadMatches = loadMatches;
  window.loadComments = loadComments;
  window.loadPlayersSelect = loadPlayersSelect;
  window.loadPlayersFilter = loadPlayersFilter;
  window.loadPlayersTrendFilter = loadPlayersTrendFilter;
  window.loadTournaments = loadTournaments;
  loadRanking();

  // =========================
  // 🚀 LOAD INITIAL DATA
  // =========================
  loadMatches();
  loadComments();
  loadPlayersSelect();
  loadPlayersFilter();
  loadPlayersTrendFilter();
  loadTournaments();
});
