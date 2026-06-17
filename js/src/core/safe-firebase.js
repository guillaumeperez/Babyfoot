// =========================
// 🛡️ SAFE FIREBASE WRAPPERS
// =========================
// Toutes les opérations d'écriture Firebase passent par ici.
// En mode test, les écritures sont bloquées et loguées dans la console.
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

export async function safeSetDoc(ref, data) {
  if (isTestMode()) {
    console.log("🧪 [TEST] setDoc bloqué →", data);
    return null;
  }
  return await setDoc(ref, data);
}

export async function safeAddDoc(ref, data) {
  if (isTestMode()) {
    console.log("🧪 [TEST] addDoc bloqué →", data);
    return { id: "test-id-" + Date.now() };
  }
  return await addDoc(ref, data);
}

export async function safeUpdateDoc(ref, data) {
  if (isTestMode()) {
    console.log("🧪 [TEST] updateDoc bloqué →", data);
    return null;
  }
  return await updateDoc(ref, data);
}

export async function safeDeleteDoc(ref) {
  if (isTestMode()) {
    console.log("🧪 [TEST] deleteDoc bloqué");
    return null;
  }
  return await deleteDoc(ref);
}

// Les lectures sont toujours autorisées (pas d'effet de bord)
export async function safeGetDoc(ref) {
  return await getDoc(ref);
}

export async function safeGetDocs(q) {
  return await getDocs(q);
}
