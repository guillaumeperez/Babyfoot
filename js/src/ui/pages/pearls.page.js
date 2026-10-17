// =========================
//  PEARLS PAGE
// =========================
// Affichage et gestion des perles du baby-foot.
// Les phrases sont stockées dans Firestore.

import {
  getAllPearls,
  addPearl,
  deletePearl,
} from "../../repositories/pearls.repository.js";
import { isTestMode, isAdmin } from "../../core/state.js";
import { confirmAction } from "../components/confirm.js";
import { Toast } from "../components/toast.js";

// --- État pour éviter les double-clics ---
let isAddingPearl = false;

/**
 * Charge toutes les perles depuis Firestore et les affiche dans le conteneur.
 */
export async function loadPearls() {
  const container = document.getElementById("pearlsContainer");
  if (!container) return;

  container.innerHTML = "";

  try {
    const pearls = await getAllPearls();

    if (pearls.length === 0) {
      container.innerHTML =
        '<div style="text-align:center; padding:20px; color:#999;">Aucune perle pour le moment...</div>';
      return;
    }

    const list = document.createElement("ul");
    list.style.listStyleType = "none";
    list.style.padding = "0";

    pearls.forEach((pearl) => {
      const li = document.createElement("li");
      li.style.padding = "10px";
      li.style.margin = "5px 0";
      li.style.backgroundColor = "#f5f5f5";
      li.style.borderRadius = "6px";
      li.style.borderLeft = "4px solid #9333ea";
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.gap = "10px";

      // Texte en DOM sécurisé (jamais d'innerHTML avec du contenu utilisateur)
      const label = document.createElement("span");
      label.textContent = pearl.text;
      label.style.flex = "1";
      label.style.wordBreak = "break-word";
      li.appendChild(label);

      // Croix de suppression : réservée à l'administration
      if (isAdmin()) {
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.textContent = "×";
        deleteBtn.title = "Supprimer cette perle";
        deleteBtn.setAttribute("aria-label", "Supprimer cette perle");
        deleteBtn.style.flex = "0 0 auto";
        deleteBtn.style.width = "26px";
        deleteBtn.style.height = "26px";
        deleteBtn.style.padding = "0";
        deleteBtn.style.border = "none";
        deleteBtn.style.borderRadius = "50%";
        deleteBtn.style.background = "#dc2626";
        deleteBtn.style.color = "white";
        deleteBtn.style.fontWeight = "bold";
        deleteBtn.style.fontSize = "16px";
        deleteBtn.style.lineHeight = "1";
        deleteBtn.style.cursor = "pointer";
        deleteBtn.onclick = () => handleDeletePearl(pearl.id);

        li.appendChild(deleteBtn);
      }

      list.appendChild(li);
    });

    container.appendChild(list);
  } catch (error) {
    console.error("Erreur lors du chargement des perles:", error);
    container.innerHTML =
      '<div style="text-align:center; padding:20px; color:#d32f2f;">Erreur lors du chargement des perles</div>';
  }
}

/**
 * Affiche le formulaire pour ajouter une nouvelle perle.
 */
export function handleAddPearl() {
  const container = document.getElementById("pearlsContainer");
  if (!container) return;

  // Repart d'un état propre si un précédent enregistrement était resté bloqué
  isAddingPearl = false;

  container.innerHTML = `
    <div style="
      padding: 20px;
      margin-top: 15px;
      background: #f9f9f9;
      border-radius: 10px;
      border: 2px solid #9333ea;
    ">
      <textarea
        id="pearlInput"
        placeholder="Écris une phrase amusante..."
        style="
          width: 100%;
          min-height: 100px;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-family: Arial, sans-serif;
          font-size: 14px;
          box-sizing: border-box;
        "
      ></textarea>

      <div style="
        display: flex;
        gap: 10px;
        margin-top: 15px;
        justify-content: center;
      ">
        <button
          id="submitPearlBtn"
          onclick="savePearlFromForm()"
          class="btn-add"
          style="
            padding: 10px 20px;
            background: #9333ea;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
          "
        >
           Valider
        </button>

        <button
          onclick="cancelAddPearl()"
          class="btn-danger"
          style="
            padding: 10px 20px;
            background: #dc2626;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
          "
        >
          Annuler
        </button>
      </div>
    </div>
  `;

  // Focus automatique sur le textarea
  setTimeout(() => {
    const input = document.getElementById("pearlInput");
    if (input) input.focus();
  }, 100);
}

/**
 * Annule l'ajout d'une perle et recharge la liste.
 */
export async function cancelAddPearl() {
  isAddingPearl = false;
  await loadPearls();
}

/**
 * Sauvegarde la perle saisie dans Firestore.
 */
export async function savePearlFromForm() {
  const input = document.getElementById("pearlInput");
  if (!input) {
    Toast.error(
      "Formulaire introuvable : ferme et rouvre le modal des perles.",
    );
    return;
  }

  const text = input.value;

  // Validation
  if (!text || text.trim() === "") {
    Toast.error("La perle ne peut pas être vide !");
    return;
  }

  if (text.trim().length > 500) {
    Toast.error("La perle ne peut pas dépasser 500 caractères");
    return;
  }

  // Éviter les double-clics (message explicite au lieu d'un retour silencieux)
  if (isAddingPearl) {
    Toast.error("⏳ Enregistrement en cours, patiente une seconde...");
    return;
  }

  isAddingPearl = true;

  const submitBtn = document.getElementById("submitPearlBtn");
  if (submitBtn) submitBtn.disabled = true;

  try {
    const cleanText = text.trim();

    // Anti-doublon : cette perle existe-t-elle déjà ?
    const existingPearls = await getAllPearls();
    const isDuplicate = existingPearls.some((p) => p.text === cleanText);
    if (isDuplicate) {
      Toast.error("❌ Cette perle existe déjà !");
      isAddingPearl = false;
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    const pearlId = await addPearl(cleanText);

    // safeAddDoc renvoie null quand l'écriture est bloquée
    // (FIREBASE_LOCK activé) : on n'affiche surtout pas de faux succès.
    if (!pearlId) {
      Toast.error("🛑 Écriture bloquée : la perle n'a PAS été enregistrée.");
      isAddingPearl = false;
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    Toast.success(
      isTestMode()
        ? "🧪 Perle simulée : visible pour cette session (mode test)"
        : "💎 Perle ajoutée avec succès !",
    );

    // Réinitialiser
    isAddingPearl = false;
    await loadPearls();
  } catch (error) {
    console.error("Erreur lors de l'ajout de la perle:", error);
    Toast.error(
      `Erreur lors de l'ajout de la perle : ${error?.message || error}`,
    );
    isAddingPearl = false;

    if (submitBtn) submitBtn.disabled = false;
  }
}

// =========================
// 🗑️ SUPPRESSION D'UNE PERLE
// =========================

// --- État pour éviter les clics multiples pendant la suppression ---
let isDeletingPearl = false;

/**
 * Supprime la perle après confirmation (réservé à l'administration).
 * En cas d'erreur, la liste est conservée telle quelle.
 */
export async function handleDeletePearl(pearlId) {
  if (!isAdmin()) {
    Toast.error("❌ Admin requis");
    return;
  }

  // Éviter les clics multiples pendant la suppression
  if (isDeletingPearl) return;

  if (!confirmAction("Voulez-vous vraiment supprimer cette perle ?")) return;

  isDeletingPearl = true;

  try {
    const result = await deletePearl(pearlId);

    // safeDeleteDoc renvoie null quand l'écriture est bloquée :
    // on affiche une erreur explicite au lieu d'un faux succès.
    if (!result) {
      Toast.error("🛑 Suppression bloquée : la perle n'a PAS été supprimée.");
      isDeletingPearl = false;
      return;
    }

    Toast.success("🗑 Perle supprimée");
    isDeletingPearl = false;
    await loadPearls();
  } catch (error) {
    console.error("Erreur lors de la suppression de la perle:", error);
    Toast.error(
      `Erreur lors de la suppression de la perle : ${error?.message || error}`,
    );
    isDeletingPearl = false;
    // Pas de rechargement : la liste est inchangée, la perle est conservée
  }
}
