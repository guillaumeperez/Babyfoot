// =========================
// 😊 FORM EMOJI SETTINGS REPOSITORY
// =========================
// Gère le document séparé "settings/formEmojis"
// sans toucher aux joueurs ni aux matchs.
//
// Structure :
// {
//   [playerId]: {
//     enabled: true,
//     wins: {
//       "10-9": "😎",
//       "10-8": "💪",
//       ...
//     },
//     losses: {
//       "9-10": "🫡",
//       "8-10": "🥲",
//       ...
//     }
//   }
// }

import { doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "../core/firebase.client.js";
import { isAdmin } from "../core/state.js";
import { safeGetDoc, safeSetDoc } from "../core/safe-firebase.js";

const SETTINGS_COLLECTION = "settings";
const SETTINGS_DOCUMENT_ID = "formEmojis";

// =========================
// 🎯 EMOJIS PAR DÉFAUT
// =========================

const DEFAULT_WINS = {
  "10-9": "😎",
  "10-8": "💪",
  "10-7": "🔥",
  "10-6": "🚀",
  "10-5": "👑",
  "10-4": "⚡",
  "10-3": "🏆",
  "10-2": "🚀",
  "10-1": "👑",
  "10-0": "🚀🔥",
};

const DEFAULT_LOSSES = {
  "9-10": "🫡",
  "8-10": "🥲",
  "7-10": "💪",
  "6-10": "🌱",
  "5-10": "🔄",
  "4-10": "😅",
  "3-10": "🫠",
  "2-10": "😂",
  "1-10": "💀",
  "0-10": "🪦",
};

// =========================
// 📄 RÉFÉRENCE FIRESTORE
// =========================

export function getFormEmojiSettingsRef() {
  return doc(db, SETTINGS_COLLECTION, SETTINGS_DOCUMENT_ID);
}

// =========================
// 🧹 NORMALISATION D'UNE CONFIG
// =========================

function normalizePlayerConfig(config) {
  // Ancienne structure :
  // playerId: true / false
  //
  // On la convertit automatiquement vers :
  // {
  //   enabled: true / false,
  //   wins: {...},
  //   losses: {...}
  // }

  if (typeof config === "boolean") {
    return {
      enabled: config,
      wins: { ...DEFAULT_WINS },
      losses: { ...DEFAULT_LOSSES },
    };
  }

  if (!config || typeof config !== "object") {
    return {
      enabled: false,
      wins: { ...DEFAULT_WINS },
      losses: { ...DEFAULT_LOSSES },
    };
  }

  return {
    enabled: Boolean(config.enabled),
    wins: {
      ...DEFAULT_WINS,
      ...(config.wins && typeof config.wins === "object"
        ? config.wins
        : {}),
    },
    losses: {
      ...DEFAULT_LOSSES,
      ...(config.losses && typeof config.losses === "object"
        ? config.losses
        : {}),
    },
  };
}

// =========================
// 📥 LIRE TOUS LES RÉGLAGES
// =========================

export async function getFormEmojiSettings() {
  const ref = getFormEmojiSettingsRef();
  const snap = await safeGetDoc(ref);

  if (!snap.exists()) {
    return {};
  }

  const data = snap.data() || {};

  if (typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  const normalized = {};

  Object.entries(data).forEach(([playerId, config]) => {
    normalized[String(playerId)] = normalizePlayerConfig(config);
  });

  return normalized;
}

// =========================
// 🔍 LIRE LA CONFIG D'UN JOUEUR
// =========================

export async function getPlayerFormEmojiConfig(playerId) {
  const settings = await getFormEmojiSettings();

  return (
    settings[String(playerId)] ||
    normalizePlayerConfig(null)
  );
}

// =========================
// 🔘 ACTIVER / DÉSACTIVER
// =========================

export async function setPlayerFormEmojiState(playerId, enabled) {
  if (!isAdmin()) {
    throw new Error("Accès réservé à l'administration");
  }

  const current = await getFormEmojiSettings();

  const playerKey = String(playerId);

  const currentPlayerConfig = normalizePlayerConfig(
    current[playerKey],
  );

  const next = {
    ...current,
    [playerKey]: {
      ...currentPlayerConfig,
      enabled: Boolean(enabled),
    },
  };

  await safeSetDoc(getFormEmojiSettingsRef(), next);

  return next;
}

// =========================
// 😊 ENREGISTRER LES EMOJIS
// D'UN SEUL JOUEUR
// =========================

export async function setPlayerFormEmojiConfig(playerId, config) {
  if (!isAdmin()) {
    throw new Error("Accès réservé à l'administration");
  }

  const current = await getFormEmojiSettings();

  const playerKey = String(playerId);

  const currentPlayerConfig = normalizePlayerConfig(
    current[playerKey],
  );

  const nextPlayerConfig = {
    ...currentPlayerConfig,
    ...(config && typeof config === "object" ? config : {}),
  };

  const normalizedPlayerConfig =
    normalizePlayerConfig(nextPlayerConfig);

  const next = {
    ...current,
    [playerKey]: normalizedPlayerConfig,
  };

  await safeSetDoc(getFormEmojiSettingsRef(), next);

  return next;
}

// =========================
// 🟢 INITIALISATION DE MUMU
// =========================
// Mumu est activé par défaut si aucune configuration
// n'existe encore pour lui.
//
// Cela ne modifie PAS la configuration des autres joueurs.

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

  const existingConfig = current[mumuId];

  // Si Mumu possède déjà une configuration,
  // on ne touche absolument à rien.
  if (existingConfig) {
    return current;
  }

  const next = {
    ...current,
    [mumuId]: {
      enabled: true,
      wins: { ...DEFAULT_WINS },
      losses: { ...DEFAULT_LOSSES },
    },
  };

  await safeSetDoc(getFormEmojiSettingsRef(), next);

  return next;
}