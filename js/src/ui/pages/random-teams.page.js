// =========================
// 🎲 RANDOM TEAMS PAGE
// =========================
// Tirage aléatoire multi-touch : 4 doigts max, compte à rebours et répartition 2 vs 2.
// 100% frontend, aucune dépendance Firebase.

import { openModal, closeModal } from "../components/modal.js";

const MAX_POINTERS = 4;

const randomTeamsState = {
  pointers: new Map(),
  circles: new Map(),
  countdownTimer: null,
  isDrawing: false,
  pointerListenerInstalled: false,
  assignment: {},
};

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getArenaElement() {
  return document.getElementById("randomTeamsArena");
}

function getStatusElement() {
  return document.getElementById("randomTeamsStatus");
}

function getCountdownElement() {
  return document.getElementById("randomTeamsCountdown");
}

function getBlueLabelElement() {
  return document.getElementById("randomTeamBlue");
}

function getRedLabelElement() {
  return document.getElementById("randomTeamRed");
}

function clearCountdownTimer() {
  if (randomTeamsState.countdownTimer) {
    clearTimeout(randomTeamsState.countdownTimer);
    randomTeamsState.countdownTimer = null;
  }
}

function resetTeamLabels() {
  const blueEl = getBlueLabelElement();
  const redEl = getRedLabelElement();

  if (blueEl) blueEl.textContent = "🔵 ÉQUIPE BLEUE";
  if (redEl) redEl.textContent = "🔴 ÉQUIPE ROUGE";
}

function updateStatusText() {
  const statusEl = getStatusElement();
  const count = randomTeamsState.pointers.size;
  if (statusEl) {
    statusEl.textContent = `${count} / ${MAX_POINTERS}`;
  }
}

function clearCountdownText() {
  const countdownEl = getCountdownElement();
  if (countdownEl) {
    countdownEl.textContent = "";
  }
}

function clearAllPointerCircles() {
  const arena = getArenaElement();
  if (!arena) return;

  randomTeamsState.circles.forEach((node) => node.remove());
  randomTeamsState.circles.clear();
}

function updateArenaPointerVisuals() {
  const arena = getArenaElement();
  if (!arena) return;

  const pointerIds = Array.from(randomTeamsState.pointers.keys());

  pointerIds.forEach((pointerId) => {
    const pointer = randomTeamsState.pointers.get(pointerId);
    if (!pointer) return;

    let circle = randomTeamsState.circles.get(pointerId);
    if (!circle) {
      circle = document.createElement("div");
      circle.style.position = "absolute";
      circle.style.width = "42px";
      circle.style.height = "42px";
      circle.style.borderRadius = "50%";
      circle.style.border = "3px solid #111827";
      circle.style.background = "rgba(255, 255, 255, 0.9)";
      circle.style.transform = "translate(-50%, -50%)";
      circle.style.pointerEvents = "none";
      circle.style.transition =
        "background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease";
      circle.style.zIndex = "3";
      arena.appendChild(circle);
      randomTeamsState.circles.set(pointerId, circle);
    }

    const x = pointer.x;
    const y = pointer.y;
    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;
    circle.style.boxShadow = "0 4px 12px rgba(0,0,0,0.18)";

    if (randomTeamsState.assignment[pointerId] === "blue") {
      circle.style.background = "#60a5fa";
      circle.style.borderColor = "#1d4ed8";
    } else if (randomTeamsState.assignment[pointerId] === "red") {
      circle.style.background = "#f87171";
      circle.style.borderColor = "#b91c1c";
    } else {
      circle.style.background = "rgba(255, 255, 255, 0.9)";
      circle.style.borderColor = "#111827";
    }
  });

  const currentIds = new Set(pointerIds);
  randomTeamsState.circles.forEach((circle, pointerId) => {
    if (!currentIds.has(pointerId)) {
      circle.remove();
      randomTeamsState.circles.delete(pointerId);
    }
  });
}

function resetRandomTeamsState() {
  clearCountdownTimer();
  randomTeamsState.isDrawing = false;
  randomTeamsState.assignment = {};
  randomTeamsState.pointers.clear();
  clearAllPointerCircles();
  updateStatusText();
  clearCountdownText();
  resetTeamLabels();
}

function startCountdown() {
  if (
    randomTeamsState.isDrawing ||
    randomTeamsState.pointers.size !== MAX_POINTERS
  ) {
    return;
  }

  clearCountdownTimer();
  const countdownValues = [3, 2, 1, "🎲"];
  let index = 0;

  const tick = () => {
    if (randomTeamsState.pointers.size !== MAX_POINTERS) {
      clearCountdownTimer();
      updateStatusText();
      clearCountdownText();
      resetTeamLabels();
      return;
    }

    const countdownEl = getCountdownElement();
    if (countdownEl) {
      countdownEl.textContent = countdownValues[index];
    }

    if (index === countdownValues.length - 1) {
      randomTeamsState.isDrawing = true;
      randomTeamsState.countdownTimer = null;
      finalizeRandomTeams();
      return;
    }

    index += 1;
    randomTeamsState.countdownTimer = setTimeout(tick, 700);
  };

  tick();
}

function finalizeRandomTeams() {
  const pointerIds = Array.from(randomTeamsState.pointers.keys());
  if (pointerIds.length !== MAX_POINTERS) {
    resetRandomTeamsState();
    return;
  }

  const shuffled = shuffle([...pointerIds]);
  const blueIds = shuffled.slice(0, 2);
  const redIds = shuffled.slice(2, 4);

  randomTeamsState.assignment = {};
  blueIds.forEach((id) => {
    randomTeamsState.assignment[id] = "blue";
  });
  redIds.forEach((id) => {
    randomTeamsState.assignment[id] = "red";
  });

  updateArenaPointerVisuals();

  const blueEl = getBlueLabelElement();
  const redEl = getRedLabelElement();
  if (blueEl) blueEl.textContent = "🔵 ÉQUIPE BLEUE — 2 joueurs";
  if (redEl) redEl.textContent = "🔴 ÉQUIPE ROUGE — 2 joueurs";

  const statusEl = getStatusElement();
  if (statusEl) {
    statusEl.textContent = `${MAX_POINTERS} / ${MAX_POINTERS}`;
  }
}

function getPointerCoordinates(event, arena) {
  const bounds = arena.getBoundingClientRect();
  const x = Math.max(0, Math.min(event.clientX - bounds.left, bounds.width));
  const y = Math.max(0, Math.min(event.clientY - bounds.top, bounds.height));
  return { x, y };
}

function handlePointerDown(event) {
  const arena = getArenaElement();
  if (!arena || randomTeamsState.isDrawing) return;

  if (!arena.hasPointerCapture || !arena.hasPointerCapture(event.pointerId)) {
    try {
      arena.setPointerCapture(event.pointerId);
    } catch (error) {
      // Le support navigateur peut être limité; on ignore l'erreur.
    }
  }

  if (randomTeamsState.pointers.size >= MAX_POINTERS) {
    return;
  }

  const existingId = Array.from(randomTeamsState.pointers.keys()).find(
    (pointerId) => pointerId === event.pointerId,
  );
  if (existingId !== undefined) {
    return;
  }

  randomTeamsState.pointers.set(event.pointerId, {
    ...getPointerCoordinates(event, arena),
  });

  updateStatusText();
  updateArenaPointerVisuals();

  if (randomTeamsState.pointers.size === MAX_POINTERS) {
    startCountdown();
  }
}

function handlePointerMove(event) {
  const arena = getArenaElement();
  if (!arena || !randomTeamsState.pointers.has(event.pointerId)) return;

  const pointer = randomTeamsState.pointers.get(event.pointerId);
  if (!pointer) return;

  randomTeamsState.pointers.set(event.pointerId, {
    ...getPointerCoordinates(event, arena),
  });

  if (!randomTeamsState.isDrawing) {
    updateArenaPointerVisuals();
  }
}

function handlePointerEnd(event) {
  const arena = getArenaElement();
  if (!arena) return;

  if (randomTeamsState.isDrawing) {
    if (randomTeamsState.pointers.has(event.pointerId)) {
      randomTeamsState.pointers.delete(event.pointerId);
    }
    return;
  }

  if (
    randomTeamsState.countdownTimer &&
    randomTeamsState.pointers.size < MAX_POINTERS
  ) {
    clearCountdownTimer();
    clearCountdownText();
  }

  if (randomTeamsState.pointers.has(event.pointerId)) {
    randomTeamsState.pointers.delete(event.pointerId);
    randomTeamsState.assignment = {};
    clearCountdownText();
    updateStatusText();
    updateArenaPointerVisuals();
    resetTeamLabels();
  }
}

function installRandomTeamsPointerListeners() {
  const arena = getArenaElement();
  if (!arena || randomTeamsState.pointerListenerInstalled) return;

  arena.addEventListener("pointerdown", handlePointerDown);
  arena.addEventListener("pointermove", handlePointerMove);
  arena.addEventListener("pointerup", handlePointerEnd);
  arena.addEventListener("pointercancel", handlePointerEnd);

  randomTeamsState.pointerListenerInstalled = true;
}

function removeRandomTeamsPointerListeners() {
  const arena = getArenaElement();
  if (!arena || !randomTeamsState.pointerListenerInstalled) return;

  arena.removeEventListener("pointerdown", handlePointerDown);
  arena.removeEventListener("pointermove", handlePointerMove);
  arena.removeEventListener("pointerup", handlePointerEnd);
  arena.removeEventListener("pointercancel", handlePointerEnd);

  randomTeamsState.pointerListenerInstalled = false;
}

export function openRandomTeams() {
  resetRandomTeamsState();
  installRandomTeamsPointerListeners();
  openModal("randomTeams");
}

export function recalculateTeams() {
  const arena = getArenaElement();
  if (!arena) return;

  clearCountdownTimer();
  randomTeamsState.isDrawing = false;
  randomTeamsState.assignment = {};
  randomTeamsState.pointers.clear();
  clearAllPointerCircles();
  updateStatusText();
  clearCountdownText();
  resetTeamLabels();
}

export function closeRandomTeamsModal() {
  clearCountdownTimer();
  randomTeamsState.isDrawing = false;
  randomTeamsState.assignment = {};
  randomTeamsState.pointers.clear();
  clearAllPointerCircles();
  removeRandomTeamsPointerListeners();
  closeModal("randomTeams");
  updateStatusText();
  clearCountdownText();
  resetTeamLabels();
}

window.openRandomTeams = openRandomTeams;
window.recalculateTeams = recalculateTeams;
window.closeRandomTeamsModal = closeRandomTeamsModal;
