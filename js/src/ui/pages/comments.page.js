// =========================
// 💬 COMMENTS PAGE
// =========================
// Ajout et affichage des commentaires libres.

import {
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "../../core/firebase.client.js";
import { safeAddDoc, safeGetDocs } from "../../core/safe-firebase.js";
import { APP_CONFIG } from "../../config/app.config.js";

const COL = APP_CONFIG.COLLECTIONS.COMMENTS;

export async function loadComments() {
  const list = document.getElementById("commentList");
  if (!list) return;

  list.innerHTML = "";

  const snapshot = await safeGetDocs(collection(db, COL));

  snapshot.forEach((d) => {
    const c = d.data();

    const li = document.createElement("li");
    li.textContent = c.text;

    list.appendChild(li);
  });
}

export async function handleAddComment() {
  const textarea = document.getElementById("commentInput");
  const text = textarea?.value.trim();

  if (!text) return;

  await safeAddDoc(collection(db, COL), {
    text,
    createdAt: serverTimestamp(),
  });

  textarea.value = "";
  await loadComments();
}
