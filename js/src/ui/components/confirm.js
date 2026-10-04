// =========================
// ❓ CONFIRM COMPONENT
// =========================
// Wrapper autour de window.confirm().
// Isolé ici pour pouvoir être remplacé plus tard par une modale stylisée
// sans toucher au reste de l'application.

export function confirmAction(message) {
  return window.confirm(message);
}
