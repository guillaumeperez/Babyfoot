// =========================
// 🪟 MODAL COMPONENT
// =========================
// Ouverture / fermeture des modals avec hooks de chargement par ID.
// Remplace window.openModal dispersé dans app.js ET le openModal/closeModal
// de script.js (gestion du scroll body pendant qu'une modale est ouverte).

// Registre des hooks à exécuter à l'ouverture d'un modal donné.
// Chaque page UI s'enregistre ici plutôt que d'être appelée en dur.
const _onOpenHooks = new Map();

// Position de scroll sauvegardée à l'ouverture d'une modale, restaurée à la fermeture.
let _scrollY = 0;

/**
 * Enregistre une fonction à appeler automatiquement à l'ouverture du modal `id`.
 * Permet à modal.js de ne connaître aucune page UI spécifique.
 */
export function registerOnOpen(id, callback) {
  _onOpenHooks.set(id, callback);
}

export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.style.display = "flex";

  // 🔥 sauvegarde position scroll + bloque le scroll en arrière-plan
  _scrollY = window.scrollY;
  document.body.classList.add("no-scroll");
  document.body.style.top = `-${_scrollY}px`;

  const hook = _onOpenHooks.get(id);
  hook?.();
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.style.display = "none";

  document.body.classList.remove("no-scroll");

  // 🔥 restaure le scroll
  document.body.style.top = "";
  window.scrollTo(0, _scrollY);
}
