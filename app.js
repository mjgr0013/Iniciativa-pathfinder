const STORAGE_KEY = "iniciativa-pathfinder-state-v1";

const DEFAULT_NAMES = ["Gorr", "Lyra", "Caedren", "Kumiko", "Adriana"];

function createDefaultState() {
  return {
    round: 1,
    participants: DEFAULT_NAMES.map((name, index) => ({
      id: `default-${index}-${Date.now()}`,
      name,
      initiative: 0,
      hidden: false,
      annotations: []
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
        return state;
      }
    }
  } catch (error) {
    console.warn("No se pudo cargar el encuentro guardado.", error);
  }
  return createDefaultState();
}

let state = loadState();

const activeList = document.querySelector("#active-list");
const hiddenList = document.querySelector("#hidden-list");
const template = document.querySelector("#participant-template");
const participantForm = document.querySelector("#participant-form");
const roundNumber = document.querySelector("#round-number");
const activeCount = document.querySelector("#active-count");
const hiddenCount = document.querySelector("#hidden-count");
const nextButton = document.querySelector("#next-button");
const resetButton = document.querySelector("#reset-button");
const resetDialog = document.querySelector("#reset-dialog");
const confirmReset = document.querySelector("#confirm-reset");
const hiddenToggle = document.querySelector("#hidden-toggle");
const hiddenChevron = document.querySelector("#hidden-chevron");

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function activeParticipants() {
  return state.participants
    .filter(participant => !participant.hidden)
    .sort(compareParticipants);
}

function compareParticipants(a, b) {
  if (b.initiative !== a.initiative) return b.initiative - a.initiative;
  return (a.order ?? 0) - (b.order ?? 0);
}

function ensureTurnOrder() {
  const active = activeParticipants();
  if (!active.length) {
    state.currentId = null;
  } else if (!active.some(participant => participant.id === state.currentId)) {
    state.currentId = active[0].id;
  }
}

function makeId(prefix = "participant") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setParticipantOrder(participant, participants) {
  if (participant.order === undefined) {
    participant.order = participants.length;
  }
}

function render() {
  ensureTurnOrder();
  roundNumber.textContent = state.round;

  const active = activeParticipants();
  const hidden = state.participants
    .filter(participant => participant.hidden)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  activeCount.textContent = `${active.length} activo${active.length === 1 ? "" : "s"}`;
  hiddenCount.textContent = hidden.length;
  nextButton.disabled = active.length === 0;

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
  card.querySelector(".edit-button").addEventListener("click", () => editParticipant(participant));

  const annotationForm = card.querySelector(".annotation-form");
  const roundsInput = annotationForm.elements.rounds;
  const infiniteInput = annotationForm.elements.infinite;
  infiniteInput.addEventListener("change", () => {
    roundsInput.disabled = infiniteInput.checked;
  });

  annotationForm.addEventListener("submit", event => {
    event.preventDefault();
    const formData = new FormData(annotationForm);
    const text = formData.get("text").trim();
    const infinite = formData.get("infinite") === "on";
    const rounds = Number(formData.get("rounds"));

    if (!text) return;
    if (!infinite && (!Number.isInteger(rounds) || rounds < 1)) {
      alert("Indica un número entero de rondas de al menos 1.");
      return;
    }

    participant.annotations.push({
      id: makeId("annotation"),
      text,
      infinite,
      rounds: infinite ? null : rounds
    });
    render();
  });

  return card;
}

participantForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = participantForm.elements.name.value.trim();
  const initiative = Number(participantForm.elements.initiative.value);

  if (!name) {
    alert("El nombre es obligatorio.");
    return;
  }
  if (!Number.isFinite(initiative)) {
    alert("La iniciativa debe ser un número.");
    return;
  }

  state.participants.push({
    id: makeId(),
    name,
    initiative,
    hidden: false,
    annotations: [],
    order: state.participants.length
  });
  ensureTurnOrder();
  participantForm.reset();
  participantForm.elements.initiative.value = 0;
  render();
});

nextButton.addEventListener("click", () => {
  const active = activeParticipants();
  if (!active.length) return;

  const currentIndex = active.findIndex(participant => participant.id === state.currentId);
  const isLast = currentIndex === active.length - 1;

  if (isLast) {
    state.round += 1;
    active.forEach(participant => {
      participant.annotations = participant.annotations.filter(annotation => {
        if (annotation.infinite) return true;
        annotation.rounds -= 1;
        return annotation.rounds > 0;
      });
    });
  }

  const nextIndex = isLast ? 0 : currentIndex + 1;
  state.currentId = active[nextIndex].id;
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
  if (!participant) return;
  if (!window.confirm(`¿Eliminar permanentemente a ${participant.name}?`)) return;
  state.participants = state.participants.filter(item => item.id !== id);
  render();
}

function editParticipant(participant) {
  const name = window.prompt("Nombre del participante", participant.name);
  if (name === null) return;
  const trimmedName = name.trim();
  if (!trimmedName) {
    alert("El nombre no puede estar vacío.");
    return;
  }

  const initiativeText = window.prompt("Iniciativa", String(participant.initiative));
  if (initiativeText === null) return;
  const initiative = Number(initiativeText);
  if (!Number.isFinite(initiative)) {
    alert("La iniciativa debe ser un número.");
    return;
  }

  participant.name = trimmedName;
  participant.initiative = initiative;
  render();
}

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
  const isOpen = hiddenToggle.getAttribute("aria-expanded") === "true";
  hiddenToggle.setAttribute("aria-expanded", String(!isOpen));
  hiddenList.hidden = isOpen;
  hiddenChevron.textContent = isOpen ? "▸" : "▾";
});

render();
