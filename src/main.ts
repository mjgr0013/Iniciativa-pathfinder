import { encounterStore } from "./store.ts";
import type { Participant } from "./types.ts";
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

function sortedActive(participants: Participant[]): Participant[] {
  return participants
    .filter((participant) => !participant.hidden)
    .sort((a, b) => b.initiative - a.initiative || a.order - b.order);
}

function makeAnnotation(annotation: Participant["annotations"][number], participant: Participant): HTMLElement {
  const item = document.createElement("span");
  item.className = "annotation";

  const text = document.createElement("span");
  text.className = "annotation-text";
  text.textContent = annotation.text;

  const duration = document.createElement("span");
  duration.className = "annotation-duration";
  duration.textContent = annotation.rounds === 0
    ? "Infinita"
    : `${annotation.rounds} ronda${annotation.rounds === 1 ? "" : "s"}`;

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "annotation-delete";
  remove.setAttribute("aria-label", `Eliminar anotación: ${annotation.text}`);
  remove.textContent = "×";
  remove.addEventListener("click", () => encounterStore.getState().removeAnnotation(participant.id, annotation.id));

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
      else if (Number.isFinite(Number(value))) {
        encounterStore.getState().updateParticipant(participant.id, { initiative: Number(value) });
      }
    } else {
      render();
    }
  };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  });
  input.addEventListener("blur", () => finish(true));
}

function createParticipantCard(participant: Participant, isHidden: boolean): HTMLElement {
  const card = participantTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement;
  card.dataset.id = participant.id;
  card.classList.toggle("is-current", !isHidden && participant.id === encounterStore.getState().currentId);
  card.title = isHidden ? "Participante oculto" : "Haz doble clic para marcar este participante como actual";

  const initiativeButton = requiredElement<HTMLButtonElement>(".initiative-value", card);
  initiativeButton.textContent = String(participant.initiative);
  initiativeButton.setAttribute("aria-label", `Editar iniciativa de ${participant.name}, actual ${participant.initiative}`);
  const nameButton = requiredElement<HTMLButtonElement>(".participant-name", card);
  nameButton.textContent = participant.name;
  nameButton.setAttribute("aria-label", `Editar nombre de ${participant.name}`);
  requiredElement<HTMLElement>(".current-label", card).hidden = isHidden || participant.id !== encounterStore.getState().currentId;
  initiativeButton.addEventListener("click", () => editInline(initiativeButton, participant, "initiative"));
  nameButton.addEventListener("click", () => editInline(nameButton, participant, "name"));

  if (!isHidden) {
    card.addEventListener("dblclick", (event) => {
      if (event.target instanceof Element && event.target.closest("button, input, form")) return;
      encounterStore.getState().setCurrentParticipant(participant.id);
    });
  }

  const annotations = requiredElement<HTMLDivElement>(".annotations", card);
  participant.annotations.forEach((annotation) => annotations.append(makeAnnotation(annotation, participant)));

  const hideButton = requiredElement<HTMLButtonElement>(".hide-button", card);
  const restoreButton = requiredElement<HTMLButtonElement>(".restore-button", card);
  hideButton.hidden = isHidden;
  restoreButton.hidden = !isHidden;
  hideButton.addEventListener("click", () => encounterStore.getState().hideParticipant(participant.id));
  restoreButton.addEventListener("click", () => encounterStore.getState().restoreParticipant(participant.id));
  requiredElement<HTMLButtonElement>(".remove-button", card).addEventListener("click", () => {
    if (window.confirm(`¿Eliminar permanentemente a ${participant.name}?`)) {
      encounterStore.getState().removeParticipant(participant.id);
    }
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
    const durationInput = requiredElement<HTMLInputElement>('[name="rounds"]', annotationForm);
    const durationValue = durationInput.value.trim();
    const rounds = Number(durationValue);
    if (!text) return;
    if (durationValue === "" || !Number.isInteger(rounds) || rounds < 0) {
      window.alert("Indica un número entero de rondas igual o mayor que 0. Usa 0 para una duración infinita.");
      return;
    }
    encounterStore.getState().addAnnotation(participant.id, text, rounds);
  });

  return card;
}

function render(): void {
  const state = encounterStore.getState();
  const active = sortedActive(state.participants);
  const hidden = state.participants
    .filter((participant) => participant.hidden)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  roundNumber.textContent = String(state.round);
  dockRoundNumber.textContent = String(state.round);
  activeCount.textContent = `${active.length} activo${active.length === 1 ? "" : "s"}`;
  hiddenCount.textContent = String(hidden.length);
  nextButton.disabled = active.length === 0;
  currentTurnName.textContent = active.length
    ? `Turno de ${active.find((participant) => participant.id === state.currentId)?.name ?? active[0].name}`
    : "No hay participantes activos";

  activeList.replaceChildren(...active.map((participant) => createParticipantCard(participant, false)));
  hiddenList.replaceChildren(...hidden.map((participant) => createParticipantCard(participant, true)));
}

participantForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = requiredElement<HTMLInputElement>('[name="name"]', participantForm).value.trim();
  const initiativeInput = requiredElement<HTMLInputElement>('[name="initiative"]', participantForm);
  const initiative = Number(initiativeInput.value);
  if (!name) {
    window.alert("El nombre es obligatorio.");
    return;
  }
  if (!Number.isFinite(initiative)) {
    window.alert("La iniciativa debe ser un número.");
    return;
  }
  encounterStore.getState().addParticipant(name, initiative, false);
  participantForm.reset();
  initiativeInput.value = "0";
});

addHiddenParticipant.addEventListener("click", () => {
  const name = requiredElement<HTMLInputElement>('[name="name"]', participantForm).value.trim();
  const initiativeInput = requiredElement<HTMLInputElement>('[name="initiative"]', participantForm);
  const initiative = Number(initiativeInput.value);
  if (!name) {
    window.alert("El nombre es obligatorio.");
    return;
  }
  if (!Number.isFinite(initiative)) {
    window.alert("La iniciativa debe ser un número.");
    return;
  }
  encounterStore.getState().addParticipant(name, initiative, true);
  participantForm.reset();
  initiativeInput.value = "0";
});

nextButton.addEventListener("click", () => {
  const previousRound = encounterStore.getState().round;
  encounterStore.getState().nextTurn();
  if (encounterStore.getState().round !== previousRound) {
    requestAnimationFrame(() => {
      const currentCard = activeList.querySelector<HTMLElement>(".participant-card.is-current");
      if (!currentCard) return;
      const rect = currentCard.getBoundingClientRect();
      const offset = rect.top - window.innerHeight / 2 + rect.height / 2;
      if (Math.abs(offset) > 8) window.scrollBy({ top: offset, behavior: "smooth" });
    });
  }
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
  hiddenChevron.textContent = expanded ? "▸" : "▾";
});

encounterStore.subscribe(render);
render();
