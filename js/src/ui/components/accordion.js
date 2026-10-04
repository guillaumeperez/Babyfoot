/* =========================
   🎛️ ACCORDION COMPONENT
========================= */

/**
 * Initialise les accordéons sur la page
 * Les accordéons basculent l'affichage du panel suivant
 */
export function initAccordions() {
  document.querySelectorAll(".accordion").forEach((btn) => {
    btn.addEventListener("click", function () {
      this.classList.toggle("active");

      const panel = this.nextElementSibling;

      if (!panel) return;

      if (panel.style.display === "block") {
        panel.style.display = "none";
      } else {
        panel.style.display = "block";
      }
    });
  });
}

/**
 * Toggle un accordéon spécifique par son élément
 * @param {HTMLElement} accordionElement - L'élément du bouton accordéon
 */
export function toggleAccordion(accordionElement) {
  accordionElement.classList.toggle("active");

  const panel = accordionElement.nextElementSibling;
  if (!panel) return;

  if (panel.style.display === "block") {
    panel.style.display = "none";
  } else {
    panel.style.display = "block";
  }
}

/**
 * Ouvre un accordéon spécifique
 * @param {HTMLElement} accordionElement - L'élément du bouton accordéon
 */
export function openAccordion(accordionElement) {
  accordionElement.classList.add("active");

  const panel = accordionElement.nextElementSibling;
  if (panel) {
    panel.style.display = "block";
  }
}

/**
 * Ferme un accordéon spécifique
 * @param {HTMLElement} accordionElement - L'élément du bouton accordéon
 */
export function closeAccordion(accordionElement) {
  accordionElement.classList.remove("active");

  const panel = accordionElement.nextElementSibling;
  if (panel) {
    panel.style.display = "none";
  }
}
