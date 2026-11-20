const STORAGE_KEY = "iniciativa-pathfinder-state-v1";
const DEFAULT_NAMES = ["Gorr", "Lyra", "Caedren", "Kumiko", "Adriana"];

function createDefaultState() {
  return {
    round: 1,
    participants: DEFAULT_NAMES.map((name, order) => ({
      id: `default-${order}-${Date.now()}`,
      name,
      initiative: 0,
      hidden: false,
      annotations: [],
      order
    })),
    currentId: null
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved);
      if (Array.isArray(state.participants) && Number.isInteger(state.round)) {
        state.participants.forEach((participant, index) => {
          participant.order ??= index;
          participant.annotations ??= [];
          participant.hidden ??= false;
        });
        return state;
      }
    }
  } catch (error) {
    console.warn("No se pudo cargar el encuentro guardado.", error);
  }
  return createDefaultState();
}

let state = loadState();
let participantBeingEdited = null;

const activeList = document.querySelector("#active-list");
const hiddenList = document.querySelector("#hidden-list");
const template = document.querySelector("#participant-template");
const participantForm = document.querySelector("#participant-form");
const roundNumber = document.querySelector("#round-number");
const dockRoundNumber = document.querySelector("#dock-round-number");
const currentTurnName = document.querySelector("#current-turn-name");
const activeCount = document.querySelector("#active-count");
const hiddenCount = document.querySelector("#hidden-count");
const nextButton = document.querySelector("#next-button");
const resetButton = document.querySelector("#reset-button");
const resetDialog = document.querySelector("#reset-dialog");
const confirmReset = document.querySelector("#confirm-reset");
const hiddenToggle = document.querySelector("#hidden-toggle");
const hiddenChevron = document.querySelector("#hidden-chevron");
const editDialog = document.querySelector("#edit-dialog");
const editForm = document.querySelector("#edit-form");
const editName = document.querySelector("#edit-name");
const editInitiative = document.querySelector("#edit-initiative");

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("No se pudo guardar el encuentro.", error);
  }
}

function initiativeOrder() {
  return state.participants
    .filter(participant => !participant.hidden)
    .sort((a, b) => b.initiative - a.initiative || a.order - b.order);
}

// Keep the initiative order cyclic: the current participant is always displayed first.
function activeParticipants() {
  const ordered = initiativeOrder();
  const currentIndex = ordered.findIndex(participant => participant.id === state.currentId);
  if (currentIndex <= 0) return ordered;
  return ordered.slice(currentIndex).concat(ordered.slice(0, currentIndex));
}

function ensureTurnOrder() {
  const ordered = initiativeOrder();
  if (!ordered.length) {
    state.currentId = null;
  } else if (!ordered.some(participant => participant.id === state.currentId)) {
    state.currentId = ordered[0].id;
  }
}

function makeId(prefix = "participant") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function render() {
  ensureTurnOrder();
  roundNumber.textContent = state.round;
  dockRoundNumber.textContent = state.round;

  const active = activeParticipants();
  const hidden = state.participants
    .filter(participant => participant.hidden)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  activeCount.textContent = `${active.length} activo${active.length === 1 ? "" : "s"}`;
  hiddenCount.textContent = hidden.length;
  nextButton.disabled = active.length === 0;
  currentTurnName.textContent = active.length ? `Turno de ${active[0].name}` : "No hay participantes activos";

  activeList.replaceChildren();
  hiddenList.replaceChildren();
  active.forEach(participant => activeList.append(createParticipantCard(participant, false)));
  hidden.forEach(participant => hiddenList.append(createParticipantCard(participant, true)));
  saveState();
}

function createParticipantCard(participant, hidden) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.dataset.id = participant.id;
  card.classList.toggle("is-current", !hidden && participant.id === state.currentId);
  card.querySelector(".initiative-badge strong").textContent = participant.initiative;
  card.querySelector(".participant-name").textContent = participant.name;
  card.querySelector(".current-label").hidden = hidden || participant.id !== state.currentId;

  const annotations = card.querySelector(".annotations");
  participant.annotations.forEach(annotation => {
    const element = document.createElement("span");
    element.className = "annotation";
    const text = document.createElement("span");
    text.className = "annotation-text";
    text.textContent = annotation.text;
    const duration = document.createElement("span");
    duration.className = "annotation-duration";
    duration.textContent = annotation.infinite ? "Infinita" : `${annotation.rounds} ronda${annotation.rounds === 1 ? "" : "s"}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "annotation-delete";
    remove.setAttribute("aria-label", `Eliminar anotación: ${annotation.text}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => removeAnnotation(participant.id, annotation.id));
    element.append(text, document.createTextNode(" · "), duration, remove);
    annotations.append(element);
  });

  const hideButton = card.querySelector(".hide-button");
  const restoreButton = card.querySelector(".restore-button");
  hideButton.hidden = hidden;
  restoreButton.hidden = !hidden;
  hideButton.addEventListener("click", () => hideParticipant(participant.id));
  restoreButton.addEventListener("click", () => restoreParticipant(participant.id));
  card.querySelector(".remove-button").addEventListener("click", () => removeParticipant(participant.id));
  card.querySelector(".edit-button").addEventListener("click", () => openEditDialog(participant));

  const addAnnotationButton = card.querySelector(".add-annotation-button");
  const annotationForm = card.querySelector(".annotation-form");
  const roundsInput = annotationForm.elements.rounds;
  const infiniteInput = annotationForm.elements.infinite;
  addAnnotationButton.hidden = hidden;
  annotationForm.hidden = true;
  addAnnotationButton.addEventListener("click", () => {
    annotationForm.hidden = !annotationForm.hidden;
    addAnnotationButton.setAttribute("aria-expanded", String(!annotationForm.hidden));
    if (!annotationForm.hidden) annotationForm.elements.text.focus();
  });
  infiniteInput.addEventListener("change", () => {
    roundsInput.disabled = infiniteInput.checked;
  });

  annotationForm.addEventListener("submit", event => {
    event.preventDefault();
    const text = annotationForm.elements.text.value.trim();
    const infinite = infiniteInput.checked;
    const rounds = Number(roundsInput.value);
    if (!text) return;
    if (!infinite && (!Number.isInteger(rounds) || rounds < 1)) {
      alert("Indica un número entero de rondas de al menos 1.");
      return;
    }
    participant.annotations.push({ id: makeId("annotation"), text, infinite, rounds: infinite ? null : rounds });
    render();
  });

  return card;
}

participantForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = participantForm.elements.name.value.trim();
  const initiative = Number(participantForm.elements.initiative.value);
  if (!name) return alert("El nombre es obligatorio.");
  if (!Number.isFinite(initiative)) return alert("La iniciativa debe ser un número.");

  state.participants.push({
    id: makeId(), name, initiative, hidden: false, annotations: [], order: state.participants.length
  });
  participantForm.reset();
  participantForm.elements.initiative.value = 0;
  render();
});

nextButton.addEventListener("click", () => {
  const active = activeParticipants();
  if (!active.length) return;
  const isLast = active.length === 1 || active[active.length - 1].id === state.currentId;
  if (isLast) {
    state.round += 1;
    active.forEach(participant => {
      participant.annotations = participant.annotations.filter(annotation => {
        if (annotation.infinite) return true;
        annotation.rounds -= 1;
        return annotation.rounds > 0;
      });
    });
    state.currentId = active[0].id;
  } else {
    state.currentId = active[1].id;
  }
  render();
});

function hideParticipant(id) {
  const participant = state.participants.find(item => item.id === id);
  if (!participant) return;
  participant.hidden = true;
  render();
}

function restoreParticipant(id) {
  const participant = state.participants.find(item => item.id === id);
  if (!participant) return;
  participant.hidden = false;
  render();
}

function removeParticipant(id) {
  const participant = state.participants.find(item => item.id === id);
  if (!participant || !window.confirm(`¿Eliminar permanentemente a ${participant.name}?`)) return;
  state.participants = state.participants.filter(item => item.id !== id);
  render();
}

function openEditDialog(participant) {
  participantBeingEdited = participant.id;
  editName.value = participant.name;
  editInitiative.value = participant.initiative;
  editDialog.showModal();
  editName.focus();
}

editForm.addEventListener("submit", event => {
  event.preventDefault();
  const participant = state.participants.find(item => item.id === participantBeingEdited);
  if (!participant) return editDialog.close();
  const name = editName.value.trim();
  const initiative = Number(editInitiative.value);
  if (!name) return alert("El nombre no puede estar vacío.");
  if (!Number.isFinite(initiative)) return alert("La iniciativa debe ser un número válido.");
  participant.name = name;
  participant.initiative = initiative;
  participantBeingEdited = null;
  editDialog.close();
  render();
});

document.querySelector("#cancel-edit").addEventListener("click", () => {
  participantBeingEdited = null;
  editDialog.close();
});

function removeAnnotation(participantId, annotationId) {
  const participant = state.participants.find(item => item.id === participantId);
  if (!participant) return;
  participant.annotations = participant.annotations.filter(annotation => annotation.id !== annotationId);
  render();
}

resetButton.addEventListener("click", () => resetDialog.showModal());
confirmReset.addEventListener("click", event => {
  event.preventDefault();
  state = createDefaultState();
  resetDialog.close();
  render();
});

hiddenToggle.addEventListener("click", () => {
  const expanded = hiddenToggle.getAttribute("aria-expanded") === "true";
  hiddenToggle.setAttribute("aria-expanded", String(!expanded));
  hiddenList.hidden = expanded;
  hiddenChevron.textContent = expanded ? "▸" : "▾";
});

render();
