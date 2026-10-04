// =========================
// 😊 FORM EMOJI SETTINGS REPOSITORY
// =========================
// Gère le document séparé "settings/formEmojis" sans toucher aux joueurs ni aux matchs.
// Le document contient un mapping { [playerId]: boolean }.

import { doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "../core/firebase.client.js";
import { isAdmin } from "../core/state.js";
import { safeGetDoc, safeSetDoc } from "../core/safe-firebase.js";

const SETTINGS_COLLECTION = "settings";
const SETTINGS_DOCUMENT_ID = "formEmojis";

export function getFormEmojiSettingsRef() {
  return doc(db, SETTINGS_COLLECTION, SETTINGS_DOCUMENT_ID);
}

export async function getFormEmojiSettings() {
  const ref = getFormEmojiSettingsRef();
  const snap = await safeGetDoc(ref);

  if (!snap.exists()) {
    return {};
  }

  const data = snap.data() || {};
  return typeof data === "object" ? data : {};
}

export async function setPlayerFormEmojiState(playerId, enabled) {
  if (!isAdmin()) {
    throw new Error("Accès réservé à l'administration");
  }

  const current = await getFormEmojiSettings();
  const next = {
    ...current,
    [String(playerId)]: Boolean(enabled),
  };

  await safeSetDoc(getFormEmojiSettingsRef(), next);
  return next;
}

export async function ensureDefaultMumuFormEmoji(players = []) {
  if (!isAdmin()) {
    return await getFormEmojiSettings();
  }

  const current = await getFormEmojiSettings();

  const mumuPlayer = players.find(
    (player) =>
      player &&
      typeof player.name === "string" &&
      player.name.trim().toLowerCase() === "mumu",
  );

  if (!mumuPlayer) {
    return current;
  }

  const mumuId = String(mumuPlayer.id);

  if (current[mumuId] === undefined) {
    const next = {
      ...current,
      [mumuId]: true,
    };

    await safeSetDoc(getFormEmojiSettingsRef(), next);
    return next;
  }

  return current;
}
