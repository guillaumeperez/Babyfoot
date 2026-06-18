// =========================
// 🛡️ SAFE FIREBASE WRAPPERS
// =========================
// Toutes les opérations d'écriture Firebase passent par ici.
// En mode test OU si FIREBASE_LOCK est activé, les écritures sont bloquées.
// Les lectures (get) sont toujours autorisées.

import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { isTestMode } from "./state.js";

// 🔥 KILL SWITCH GLOBAL (sécurité ultime)
const FIREBASE_LOCK = false;

// =========================
// 🧪 WRITE SAFE WRAPPERS
// =========================

export async function safeSetDoc(ref, data) {
  if (FIREBASE_LOCK || isTestMode()) {
    console.log("🧪🛑 [BLOCKED] setDoc →", data);
    return null;
  }

  return setDoc(ref, data);
}

export async function safeAddDoc(ref, data) {
  if (FIREBASE_LOCK || isTestMode()) {
    console.log("🧪🛑 [BLOCKED] addDoc →", data);
    return null;
  }

  return addDoc(ref, data);
}

export async function safeUpdateDoc(ref, data) {
  if (FIREBASE_LOCK || isTestMode()) {
    console.log("🧪🛑 [BLOCKED] updateDoc →", data);
    return null;
  }

  return updateDoc(ref, data);
}

export async function safeDeleteDoc(ref) {
  if (FIREBASE_LOCK || isTestMode()) {
    console.log("🧪🛑 [BLOCKED] deleteDoc");
    return null;
  }

  return deleteDoc(ref);
}

// =========================
// 📖 READ SAFE WRAPPERS
// =========================

export async function safeGetDoc(ref) {
  return getDoc(ref);
}

export async function safeGetDocs(q) {
  return getDocs(q);
}
