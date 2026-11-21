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
      const loaded = JSON.parse(saved);
      if (Array.isArray(loaded.participants) && Number.isInteger(loaded.round)) {
        loaded.participants.forEach((participant, index) => {
          participant.order ??= index;
          participant.annotations ??= [];
          participant.hidden ??= false;
          participant.initiative = Number(participant.initiative) || 0;
        });
        loaded.round = Math.max(1, loaded.round);
        return loaded;
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

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("No se pudo guardar el encuentro.", error);
  }
}

function activeParticipants() {
  return state.participants
    .filter(participant => !participant.hidden)
    .sort((a, b) => b.initiative - a.initiative || a.order - b.order);
}

function ensureTurn() {
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

function centerCurrentParticipant(behavior = "smooth") {
  requestAnimationFrame(() => {
    const currentCard = activeList.querySelector(".participant-card.is-current");
    if (!currentCard) return;

    const cardRect = currentCard.getBoundingRect ? currentCard.getBoundingRect() : currentCard.getBoundingClientRect();
    const viewportCenter = window.innerHeight / 2;
    const desiredOffset = cardRect.top - viewportCenter + cardRect.height / 2;

    if (Math.abs(desiredOffset) > 8) {
      window.scrollBy({ top: desiredOffset, behavior });
    }
  });
}

function render({ centerCurrent = false, scrollBehavior = "smooth" } = {}) {
  ensureTurn();
  const active = activeParticipants();
  const hidden = state.participants
    .filter(participant => participant.hidden)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  roundNumber.textContent = String(state.round);
  dockRoundNumber.textContent = String(state.round);
  activeCount.textContent = `${active.length} activo${active.length === 1 ? "" : "s"}`;
  hiddenCount.textContent = String(hidden.length);
  nextButton.disabled = active.length === 0;
  currentTurnName.textContent = active.length
    ? `Turno de ${active.find(participant => participant.id === state.currentId)?.name ?? active[0].name}`
    : "No hay participantes activos";

  activeList.hidden = false;
  activeList.replaceChildren();
  hiddenList.replaceChildren();
  active.forEach(participant => activeList.append(createParticipantCard(participant, false)));
  hidden.forEach(participant => hiddenList.append(createParticipantCard(participant, true)));
  saveState();

  if (centerCurrent) centerCurrentParticipant(scrollBehavior);
}

function createParticipantCard(participant, hidden) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.dataset.id = participant.id;
  card.classList.toggle("is-current", !hidden && participant.id === state.currentId);
  card.title = hidden ? "Participante oculto" : "Haz doble clic para marcar este participante como actual";

  const initiativeButton = card.querySelector(".initiative-value");
  initiativeButton.textContent = String(participant.initiative);
  initiativeButton.setAttribute("aria-label", `Editar iniciativa de ${participant.name}, actual ${participant.initiative}`);
  const nameButton = card.querySelector(".participant-name");
  nameButton.textContent = participant.name;
  nameButton.setAttribute("aria-label", `Editar nombre de ${participant.name}`);
  card.querySelector(".current-label").hidden = hidden || participant.id !== state.currentId;

  initiativeButton.addEventListener("click", () => editInline(initiativeButton, participant, "initiative"));
  nameButton.addEventListener("click", () => editInline(nameButton, participant, "name"));

  if (!hidden) {
    card.addEventListener("dblclick", event => {
      if (event.target.closest("button, input, form")) return;
      state.currentId = participant.id;
      render({ centerCurrent: true });
    });
  }

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
  infiniteInput.addEventListener("change", () => { roundsInput.disabled = infiniteInput.checked; });
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

function editInline(button, participant, field) {
  if (button.querySelector("input")) return;
  const input = document.createElement("input");
  input.className = "inline-edit-input";
  input.value = String(participant[field]);
  input.type = field === "initiative" ? "number" : "text";
  if (field === "initiative") input.step = "1";
  input.setAttribute("aria-label", field === "initiative" ? `Nueva iniciativa para ${participant.name}` : "Nuevo nombre");
  button.replaceChildren(input);
  input.focus();
  input.select();

  let finished = false;
  const finish = save => {
    if (finished) return;
    finished = true;
    const value = input.value.trim();
    if (save && value !== "") {
      if (field === "name") participant.name = value;
      else if (Number.isFinite(Number(value))) participant.initiative = Number(value);
    }
    render();
  };
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") { event.prevent("default"); finish(true); }
    else if (event.key === "Escape") { event.prevent("default"); finish(false); }
  });
  input.addEventListener("blur", () => finish(true));
}

participantForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = participantForm.elements.name.value.trim();
  const initiative = Number(participantForm.elements.initiative.value);
  if (!name) return alert("El nombre es obligatorio.");
  if (!Number.isFinite(initiative)) return alert("La iniciativa debe ser un número.");
  state.participants.push({ id: makeId(), name, initiative, hidden: false, annotations: [], order: state.participants.length });
  participantForm.reset();
  participantForm.elements.initiative.value = 0;
  render();
});

nextButton.addEventListener("click", () => {
  const active = activeParticipants();
  if (!active.length) return;

  let currentIndex = active.findIndex(participant => participant.id === state.currentId);
  if (currentIndex < 0) currentIndex = 0;
  const isEndOfRound = currentIndex === active.length - 1;

  if (isEndOfRound) {
    state.round = (Number(state.round) || 1) + 1;
    active.forEach(participant => {
      participant.annotations = participant.annotations.filter(annotation => {
        if (annotation.infinite) return true;
        annotation.rounds = Number(annotation.rounds) - 1;
        return annotation.rounds > 0;
      });
    });
  }

  const nextIndex = isEndOfRound ? 0 : currentIndex + 1;
  state.currentId = active[nextIndex].id;
  render({ centerCurrent: true });
});

function hideParticipant(id) {
  const participant = state.participants.find(item => item.id === id);
  if (!participant) return;
  const active = activeParticipants();
  const currentIndex = active.findIndex(item => item.id === state.currentId);
  const isCurrent = participant.id === state.currentId;
  participant.hidden = true;
  if (isCurrent) {
    const nextVisible = active.slice(currentIndex + 1).find(item => !item.hidden)
      ?? active.slice(0, currentIndex).find(item => !item.hidden);
    state.currentId = nextVisible?.id ?? null;
  }
  render({ centerCurrent: true });
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
  if (participant.id === state.currentId) state.currentId = null;
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
  const expanded = hiddenToggle.getAttribute("aria-expanded") === "true";
  hiddenToggle.setAttribute("aria-expanded", String(!expanded));
  hiddenList.hidden = expanded;
  hiddenChevron.textContent = expanded ? "▸" : "▾";
});

render();
