import { encounterStore } from "./store.ts";
import type { Annotation, Participant } from "./types.ts";
import "../styles.css";

function requiredElement<T extends Element>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`No se encontró el elemento requerido: ${selector}`);
  return element;
}

const activeList = requiredElement<HTMLDivElement>("#active-list");
const hiddenList = requiredElement<HTMLDivElement>("#hidden-list");
const participantTemplate = requiredElement<HTMLTemplateElement>("#participant-template");
const participantForm = requiredElement<HTMLFormElement>("#participant-form");
const globalAnnotationForm = requiredElement<HTMLFormElement>("#global-annotation-form");
const globalAnnotationsList = requiredElement<HTMLDivElement>("#global-annotations");
const roundNumber = requiredElement<HTMLElement>("#round-number");
const dockRoundNumber = requiredElement<HTMLElement>("#dock-round-number");
const currentTurnName = requiredElement<HTMLElement>("#current-turn-name");
const activeCount = requiredElement<HTMLElement>("#active-count");
const hiddenCount = requiredElement<HTMLElement>("#hidden-count");
const nextButton = requiredElement<HTMLButtonElement>("#next-button");
const resetButton = requiredElement<HTMLButtonElement>("#reset-button");
const resetDialog = requiredElement<HTMLDialogElement>("#reset-dialog");
const confirmReset = requiredElement<HTMLButtonElement>("#confirm-reset");
const hiddenToggle = requiredElement<HTMLButtonElement>("#hidden-toggle");
const hiddenChevron = requiredElement<HTMLElement>("#hidden-chevron");
const addHiddenParticipant = requiredElement<HTMLButtonElement>("#add-hidden-participant");

const CAEDREN_TOKEN_URL = new URL("../b7d15285-eb1f-473f-ab85-9bd5dece3773.jpeg", import.meta.url).href;
const DEFAULT_NAMES = ["Gorr", "Lyra", "Caedren", "Kumiko", "Adriana", "Shary"];
let pendingRemovalAnimations = 0;

function sortedActive(participants: Participant[]): Participant[] {
  return participants.filter((participant) => !participant.hidden)
    .sort((a, b) => b.initiative - a.initiative || a.order - b.order);
}

function isDefaultParticipant(participant: Participant): boolean {
  const withDefaultFlag = participant as Participant & { isDefault?: boolean };
  if (typeof withDefaultFlag.isDefault === "boolean") return withDefaultFlag.isDefault;
  return DEFAULT_NAMES.some((name) => name.toLocaleLowerCase("es") === participant.name.toLocaleLowerCase("es"));
}

function makeEmptyState(message: string): HTMLElement {
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

function makeFallbackToken(name: string): string {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const palettes = [["#486b57", "#b3c781"], ["#465a78", "#a7c3d6"], ["#754f4d", "#d49a77"], ["#665379", "#c2a8d7"]];
  const [background, accent] = palettes[hash % palettes.length]!;
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 102 102"><rect width="102" height="102" rx="20" fill="${background}"/><circle cx="51" cy="49" r="34" fill="none" stroke="${accent}" stroke-width="3"/><circle cx="51" cy="43" r="17" fill="${accent}" opacity=".25"/><text x="51" y="57" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="28" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function animateAnnotationRemoval(item: HTMLElement, onComplete?: () => void): void {
  if (item.classList.contains("is-removing")) return;
  const removeButton = item.querySelector<HTMLButtonElement>(".annotation-delete");
  if (removeButton) removeButton.disabled = true;
  item.classList.add("is-removing");
  pendingRemovalAnimations += 1;
  nextButton.disabled = true;
  const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 280;
  window.setTimeout(() => {
    pendingRemovalAnimations = Math.max(0, pendingRemovalAnimations - 1);
    onComplete?.();
  }, duration);
}

function makeAnnotation(annotation: Annotation, onRemove: () => void, label: string): HTMLElement {
  const item = document.createElement("span");
  item.className = "annotation";
  item.dataset.annotationId = annotation.id;
  if (annotation.rounds === 1) {
    item.classList.add("is-expiring");
    item.title = "Expira al finalizar esta ronda";
  }
  const text = document.createElement("span");
  text.className = "annotation-text";
  text.textContent = annotation.text;
  const duration = document.createElement("span");
  duration.className = "annotation-duration";
  duration.textContent = annotation.rounds === 0 ? "Infinita" : annotation.rounds === 1 ? "Última ronda" : `${annotation.rounds} rondas`;
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "annotation-delete";
  remove.setAttribute("aria-label", `Eliminar anotación: ${label}`);
  remove.textContent = "×";
  remove.addEventListener("click", () => animateAnnotationRemoval(item, onRemove));
  item.append(text, document.createTextNode(" · "), duration, remove);
  return item;
}

function editInline(button: HTMLButtonElement, participant: Participant, field: "name" | "initiative"): void {
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
  const finish = (save: boolean): void => {
    if (finished) return;
    finished = true;
    const value = input.value.trim();
    if (save && value !== "") {
      if (field === "name") encounterStore.getState().updateParticipant(participant.id, { name: value });
      else if (Number.isFinite(Number(value))) encounterStore.getState().updateParticipant(participant.id, { initiative: Number(value) });
    } else render();
  };
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); finish(true); }
    else if (event.key === "Escape") { event.preventDefault(); finish(false); }
  });
  input.addEventListener("blur", () => finish(true));
}

function createParticipantCard(participant: Participant, isHidden: boolean): HTMLElement {
  const card = participantTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement;
  card.dataset.id = participant.id;
  card.classList.toggle("is-current", !isHidden && participant.id === encounterStore.getState().currentId);
  card.title = isHidden ? "Participante oculto" : "Selecciona para marcar este participante como actual";

  if (isDefaultParticipant(participant)) {
    const token = document.createElement("img");
    token.className = "participant-token";
    token.src = participant.name.toLocaleLowerCase("es") === "caedren" ? CAEDREN_TOKEN_URL : makeFallbackToken(participant.name);
    token.alt = `Token de ${participant.name}`;
    token.width = 64;
    token.height = 64;
    token.loading = "eager";
    token.decoding = "async";
    card.insertBefore(token, card.firstElementChild);
  }

  const initiativeButton = requiredElement<HTMLButtonElement>(".initiative-value", card);
  initiativeButton.textContent = String(participant.initiative);
  initiativeButton.setAttribute("aria-label", `Editar iniciativa de ${participant.name}, actual ${participant.initiative}`);
  const nameButton = requiredElement<HTMLButtonElement>(".participant-name", card);
  nameButton.textContent = participant.name;
  nameButton.setAttribute("aria-label", `Editar nombre de ${participant.name}`);
  requiredElement<HTMLElement>(".current-label", card).hidden = isHidden || participant.id !== encounterStore.getState().currentId;
  initiativeButton.addEventListener("click", () => editInline(initiativeButton, participant, "initiative"));
  nameButton.addEventListener("click", () => editInline(nameButton, participant, "name"));

  if (!isHidden) card.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("button, input, form")) return;
    encounterStore.getState().setCurrentParticipant(participant.id);
  });

  const annotations = requiredElement<HTMLDivElement>(".annotations", card);
  participant.annotations.forEach((annotation) => annotations.append(makeAnnotation(
    annotation,
    () => encounterStore.getState().removeAnnotation(participant.id, annotation.id),
    annotation.text,
  )));

  const hideButton = requiredElement<HTMLButtonElement>(".hide-button", card);
  const restoreButton = requiredElement<HTMLButtonElement>(".restore-button", card);
  hideButton.hidden = isHidden;
  restoreButton.hidden = !isHidden;
  hideButton.addEventListener("click", () => encounterStore.getState().hideParticipant(participant.id));
  restoreButton.addEventListener("click", () => encounterStore.getState().restoreParticipant(participant.id));

  const removeButton = requiredElement<HTMLButtonElement>(".remove-button", card);
  removeButton.hidden = isDefaultParticipant(participant);
  removeButton.addEventListener("click", () => {
    if (isDefaultParticipant(participant)) return;
    if (window.confirm(`¿Eliminar permanentemente a ${participant.name}?`)) encounterStore.getState().removeParticipant(participant.id);
  });

  const addAnnotationButton = requiredElement<HTMLButtonElement>(".add-annotation-button", card);
  const annotationForm = requiredElement<HTMLFormElement>(".annotation-form", card);
  addAnnotationButton.hidden = isHidden;
  addAnnotationButton.addEventListener("click", () => {
    annotationForm.hidden = !annotationForm.hidden;
    addAnnotationButton.setAttribute("aria-expanded", String(!annotationForm.hidden));
    if (!annotationForm.hidden) requiredElement<HTMLInputElement>('[name="text"]', annotationForm).focus();
  });
  annotationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = requiredElement<HTMLInputElement>('[name="text"]', annotationForm).value.trim();
    const input = requiredElement<HTMLInputElement>('[name="rounds"]', annotationForm);
    const rawRounds = input.value.trim();
    const rounds = Number(rawRounds);
    if (!text) return;
    if (rawRounds === "" || !Number.isInteger(rounds) || rounds < 0) {
      window.alert("Indica un número entero de rondas igual o mayor que 0. Usa 0 para una duración infinita.");
      return;
    }
    encounterStore.getState().addAnnotation(participant.id, text, rounds);
  });
  return card;
}

function updateCurrentTurn(state = encounterStore.getState()): void {
  const active = sortedActive(state.participants);
  currentTurnName.textContent = active.length
    ? `Turno de ${active.find((participant) => participant.id === state.currentId)?.name ?? active[0].name}`
    : "No hay participantes activos";
  activeList.querySelectorAll<HTMLElement>(".participant-card").forEach((card) => {
    const isCurrent = card.dataset.id === state.currentId;
    card.classList.toggle("is-current", isCurrent);
    const currentLabel = card.querySelector<HTMLElement>(".current-label");
    if (currentLabel) currentLabel.hidden = !isCurrent;
  });
}

function render(): void {
  const state = encounterStore.getState();
  const active = sortedActive(state.participants);
  const hidden = state.participants.filter((participant) => participant.hidden)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  roundNumber.textContent = String(state.round);
  dockRoundNumber.textContent = String(state.round);
  activeCount.textContent = `${active.length} ${active.length === 1 ? "activo" : "activos"}`;
  hiddenCount.textContent = String(hidden.length);
  nextButton.disabled = active.length === 0 || pendingRemovalAnimations > 0;
  const activeCards = active.map((participant) => createParticipantCard(participant, false));
  activeList.replaceChildren(...(activeCards.length ? activeCards : [makeEmptyState("Añade un participante para empezar a preparar el orden de iniciativa.")]));
  hiddenList.replaceChildren(...hidden.map((participant) => createParticipantCard(participant, true)));
  const globalAnnotations = state.globalAnnotations.map((annotation) => makeAnnotation(
    annotation,
    () => encounterStore.getState().removeGlobalAnnotation(annotation.id),
    `global: ${annotation.text}`,
  ));
  globalAnnotationsList.replaceChildren(...(globalAnnotations.length ? globalAnnotations : [makeEmptyState("Los efectos que añadas aquí se aplicarán a todo el encuentro.")]));
  updateCurrentTurn(state);
}

function addParticipantFromForm(hidden: boolean): void {
  const name = requiredElement<HTMLInputElement>('[name="name"]', participantForm).value.trim();
  const initiativeInput = requiredElement<HTMLInputElement>('[name="initiative"]', participantForm);
  const initiative = Number(initiativeInput.value);
  if (!name) { window.alert("El nombre es obligatorio."); return; }
  if (!Number.isFinite(initiative)) { window.alert("La iniciativa debe ser un número."); return; }
  encounterStore.getState().addParticipant(name, initiative, hidden);
  participantForm.reset();
  initiativeInput.value = "0";
}

participantForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addParticipantFromForm(false);
});
addHiddenParticipant.addEventListener("click", () => addParticipantFromForm(true));

globalAnnotationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const textInput = requiredElement<HTMLInputElement>('[name="text"]', globalAnnotationForm);
  const roundsInput = requiredElement<HTMLInputElement>('[name="rounds"]', globalAnnotationForm);
  const text = textInput.value.trim();
  const rawRounds = roundsInput.value.trim();
  const rounds = Number(rawRounds);
  if (!text) return;
  if (rawRounds === "" || !Number.isInteger(rounds) || rounds < 0) {
    window.alert("Indica un número entero de rondas igual o mayor que 0. Usa 0 para una duración infinita.");
    return;
  }
  encounterStore.getState().addGlobalAnnotation(text, rounds);
  globalAnnotationForm.reset();
  roundsInput.value = "1";
});

nextButton.addEventListener("click", () => {
  const state = encounterStore.getState();
  const active = sortedActive(state.participants);
  if (!active.length) return;
  const currentIndex = Math.max(0, active.findIndex((participant) => participant.id === state.currentId));
  const endOfRound = currentIndex === active.length - 1;
  if (!endOfRound) {
    encounterStore.getState().nextTurn();
    return;
  }
  const expiringIds = new Set([
    ...state.participants.filter((participant) => !participant.hidden)
      .flatMap((participant) => participant.annotations.filter((annotation) => annotation.rounds === 1).map((annotation) => annotation.id)),
    ...state.globalAnnotations.filter((annotation) => annotation.rounds === 1).map((annotation) => annotation.id),
  ]);
  const expiringElements = [
    ...activeList.querySelectorAll<HTMLElement>(".annotation[data-annotation-id]"),
    ...globalAnnotationsList.querySelectorAll<HTMLElement>(".annotation[data-annotation-id]"),
  ].filter((item) => expiringIds.has(item.dataset.annotationId ?? ""));
  if (!expiringElements.length) {
    encounterStore.getState().nextTurn();
    return;
  }
  const before = state.round;
  expiringElements.forEach((item) => animateAnnotationRemoval(item));
  const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 280;
  window.setTimeout(() => {
    encounterStore.getState().nextTurn();
    if (encounterStore.getState().round !== before) requestAnimationFrame(() => {
      const currentCard = activeList.querySelector<HTMLElement>(".participant-card.is-current");
      if (!currentCard) return;
      const rect = currentCard.getBoundingClientRect();
      const offset = rect.top - window.innerHeight / 2 + rect.height / 2;
      if (Math.abs(offset) > 8) window.scrollBy({ top: offset, behavior: "smooth" });
    });
  }, duration);
});

resetButton.addEventListener("click", () => resetDialog.showModal());
confirmReset.addEventListener("click", (event) => {
  event.preventDefault();
  encounterStore.getState().resetEncounter();
  resetDialog.close();
});
hiddenToggle.addEventListener("click", () => {
  const expanded = hiddenToggle.getAttribute("aria-expanded") === "true";
  hiddenToggle.setAttribute("aria-expanded", String(!expanded));
  hiddenList.hidden = expanded;
  hiddenChevron.textContent = expanded ? "⌄" : "⌃";
});

encounterStore.subscribe((state, previousState) => {
  const onlyTurnChanged = state.participants === previousState.participants
    && state.globalAnnotations === previousState.globalAnnotations
    && state.round === previousState.round;
  if (onlyTurnChanged) {
    updateCurrentTurn(state);
    return;
  }
  render();
});
render();
