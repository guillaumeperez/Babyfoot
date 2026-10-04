// =========================
//  PEARLS PAGE
// =========================
// Affichage et gestion des perles du baby-foot.
// Les phrases sont stockées dans Firestore.

import {
  getAllPearls,
  addPearl,
} from "../../repositories/pearls.repository.js";
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
      li.textContent = pearl.text;

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
  if (!input) return;

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

  // Éviter les double-clics
  if (isAddingPearl) return;
  isAddingPearl = true;

  const submitBtn = document.getElementById("submitPearlBtn");
  if (submitBtn) submitBtn.disabled = true;

  try {
    await addPearl(text);
    Toast.success("💎 Perle ajoutée avec succès !");

    // Réinitialiser
    isAddingPearl = false;
    await loadPearls();
  } catch (error) {
    console.error("Erreur lors de l'ajout de la perle:", error);
    Toast.error("Erreur lors de l'ajout de la perle");
    isAddingPearl = false;

    if (submitBtn) submitBtn.disabled = false;
  }
}
