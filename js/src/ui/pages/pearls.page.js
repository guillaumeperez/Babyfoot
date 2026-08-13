// =========================
//  PEARLS PAGE
// =========================
// Affichage et gestion des perles du baby-foot.
// Les phrases sont stockées dans un tableau local (pas de Firestore).

// =========================
// 📋 TABLEAU DES PERLES
// =========================
// Ajoute tes phrases humoristiques ici !
const PEARLS = [
  // Nous ajouterons nos phrases ici
];

/**
 * Charge toutes les perles du tableau et les affiche dans le conteneur.
 */
export function loadPearls() {
  const container = document.getElementById("pearlsContainer");
  if (!container) return;

  container.innerHTML = "";

  if (PEARLS.length === 0) {
    container.innerHTML =
      '<div style="text-align:center; padding:20px; color:#999;">Aucune perle pour le moment...</div>';
    return;
  }

  const list = document.createElement("ul");
  list.style.listStyleType = "none";
  list.style.padding = "0";

  PEARLS.forEach((pearl) => {
    const li = document.createElement("li");
    li.style.padding = "10px";
    li.style.margin = "5px 0";
    li.style.backgroundColor = "#f5f5f5";
    li.style.borderRadius = "6px";
    li.style.borderLeft = "4px solid #9333ea";
    li.textContent = pearl;

    list.appendChild(li);
  });

  container.appendChild(list);
}

/**
 * Affiche une perle aléatoire dans le conteneur.
 */
export function handleShowRandomPearl() {
  const container = document.getElementById("pearlsContainer");
  if (!container) return;

  if (PEARLS.length === 0) {
    container.innerHTML =
      '<div style="text-align:center; padding:20px; color:#999;">Aucune perle pour le moment...</div>';
    return;
  }

  const randomIndex = Math.floor(Math.random() * PEARLS.length);
  const randomPearl = PEARLS[randomIndex];

  container.innerHTML = `
    <div style="
      padding: 20px;
      margin-top: 15px;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      color: white;
      border-radius: 10px;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      box-shadow: 0 4px 12px rgba(147, 51, 234, 0.4);
      line-height: 1.6;
    ">
       ${randomPearl}
    </div>
  `;
}
