// =========================
// 🧠 STATE — SOURCE DE VÉRITÉ UNIQUE
// =========================
// Remplace tous les window.isAdmin, window.currentTournamentId, etc.
// Tout l'état de l'application vit ici, nulle part ailleurs.

const _state = {
  appMode: "prod",         // "test" | "prod"
  currentUser: null,       // objet Firebase User ou null
  isAdmin: false,          // boolean
  isSaving: false,         // anti-double-clic
  lastMatchSave: 0,        // timestamp pour anti-spam
  currentTournamentId: null, // ID du tournoi ouvert
  eloBackup: {},           // backup ELO avant suppression
};

// --- Getters ---

export function getAppMode()            { return _state.appMode; }
export function isTestMode()            { return _state.appMode === "test"; }
export function getCurrentUser()        { return _state.currentUser; }
export function isAdmin()               { return _state.isAdmin; }
export function isSaving()              { return _state.isSaving; }
export function getLastMatchSave()      { return _state.lastMatchSave; }
export function getCurrentTournamentId(){ return _state.currentTournamentId; }
export function getEloBackup()          { return _state.eloBackup; }

// --- Setters ---

export function setAppMode(mode) {
  _state.appMode = mode;
}

export function setCurrentUser(user) {
  _state.currentUser = user;
}

export function setIsAdmin(value) {
  _state.isAdmin = value;
}

export function setIsSaving(value) {
  _state.isSaving = value;
}

export function setLastMatchSave(timestamp) {
  _state.lastMatchSave = timestamp;
}

export function setCurrentTournamentId(id) {
  _state.currentTournamentId = id;
}

export function setEloBackup(name, data) {
  _state.eloBackup[name.toLowerCase()] = data;
}

export function getEloBackupFor(name) {
  return _state.eloBackup[name.toLowerCase()] ?? null;
}

export function clearEloBackup(name) {
  delete _state.eloBackup[name.toLowerCase()];
}
