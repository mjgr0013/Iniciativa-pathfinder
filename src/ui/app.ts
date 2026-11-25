import { completesRound, expiringAnnotationIds, getCurrent, leavingCompletesRound, sortHidden, turnOrder } from "../domain/encounter.ts";
import { parseAnnotationText, parseInitiative, parseName, parseRounds } from "../domain/validation.ts";
import type { EncounterState, EncounterStore } from "../store.ts";
import { createAnnotationChip } from "./annotationChip.ts";
import { confirmAction } from "./confirmDialog.ts";
import { animateOut, formInput, makeEmptyState, prefersReducedMotion, requiredElement, setFormError } from "./dom.ts";
import { startInlineEdit } from "./inlineEdit.ts";
import { createParticipantCard, setCardCurrent } from "./participantCard.ts";

export function mountApp(store: EncounterStore): void {
  const el = {
    workspace: requiredElement<HTMLElement>(".dashboard-grid"),
    activeList: requiredElement<HTMLElement>("#active-list"),
    hiddenList: requiredElement<HTMLElement>("#hidden-list"),
    template: requiredElement<HTMLTemplateElement>("#participant-template"),
    participantForm: requiredElement<HTMLFormElement>("#participant-form"),
    globalForm: requiredElement<HTMLFormElement>("#global-annotation-form"),
    globalList: requiredElement<HTMLElement>("#global-annotations"),
    roundNumbers: [requiredElement<HTMLElement>("#round-number"), requiredElement<HTMLElement>("#dock-round-number")],
    currentTurnName: requiredElement<HTMLElement>("#current-turn-name"),
    activeCount: requiredElement<HTMLElement>("#active-count"),
    hiddenCount: requiredElement<HTMLElement>("#hidden-count"),
    hiddenToggle: requiredElement<HTMLButtonElement>("#hidden-toggle"),
    nextButton: requiredElement<HTMLButtonElement>("#next-button"),
    resetButton: requiredElement<HTMLButtonElement>("#reset-button"),
    confirmDialog: requiredElement<HTMLDialogElement>("#confirm-dialog"),
  };

  /** Estado puramente visual que debe sobrevivir a los re-renders. */
  const ui = {
    openAnnotationForms: new Set<string>(),
    advancing: false,
    /** Tarjetas activas por id: se reutilizan al rotar el turno para no redibujarlas (evita parpadeo de los tokens). */
    activeCards: new Map<string, HTMLElement>(),
  };

  const actions = () => store.getState();

  // ---------- Render ----------

  function roundDivider(round: number): HTMLElement {
    const divider = document.createElement("div");
    divider.className = "round-divider";
    divider.setAttribute("role", "separator");
    divider.textContent = `Ronda ${round}`;
    return divider;
  }

  /** Coloca las tarjetas activas en orden de turno (el actual primero) y actualiza el indicador de turno. */
  function renderCurrentTurn(state: EncounterState): void {
    const current = getCurrent(state);
    el.currentTurnName.textContent = current ? `Turno de ${current.name}` : "No hay participantes activos";
    el.nextButton.disabled = current === null || ui.advancing;

    const order = turnOrder(state);
    if (order.participants.length === 0) {
      el.activeList.replaceChildren(makeEmptyState("Añade un participante para empezar a preparar el orden de iniciativa."));
      return;
    }
    const nodes: HTMLElement[] = order.participants.map((participant) => {
      const card = ui.activeCards.get(participant.id)!;
      setCardCurrent(card, participant.id === state.currentId);
      return card;
    });
    if (order.nextRoundIndex !== null) nodes.splice(order.nextRoundIndex, 0, roundDivider(state.round + 1));
    el.activeList.replaceChildren(...nodes);
  }

  function render(state: EncounterState = store.getState()): void {
    const active = turnOrder(state).participants;
    const hidden = sortHidden(state.participants);

    el.roundNumbers.forEach((node) => (node.textContent = String(state.round)));
    el.activeCount.textContent = `${active.length} ${active.length === 1 ? "activo" : "activos"}`;
    el.hiddenCount.textContent = String(hidden.length);

    const card = (participant: (typeof active)[number]) =>
      createParticipantCard(el.template, participant, {
        isCurrent: !participant.hidden && participant.id === state.currentId,
        annotationFormOpen: ui.openAnnotationForms.has(participant.id),
      });
    ui.activeCards = new Map(active.map((participant) => [participant.id, card(participant)]));
    el.hiddenList.replaceChildren(...hidden.map(card));

    const globals = state.globalAnnotations.map(createAnnotationChip);
    el.globalList.replaceChildren(
      ...(globals.length ? globals : [makeEmptyState("Los efectos que añadas aquí se aplicarán a todo el encuentro.")]),
    );

    renderCurrentTurn(state);
  }

  function scrollCurrentIntoView(): void {
    const card = el.activeList.querySelector<HTMLElement>(".participant-card.is-current");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const dockHeight = requiredElement<HTMLElement>(".turn-dock").offsetHeight;
    if (rect.top >= 0 && rect.bottom <= window.innerHeight - dockHeight) return;
    card.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  // ---------- Acciones ----------

  /**
   * Ejecuta un cambio de turno. Si cierra la ronda, primero anima las anotaciones que van a expirar
   * y bloquea el avance mientras tanto, para no encadenar dos cambios de turno.
   */
  async function changeTurn(closesRound: boolean, expiring: Set<string>, change: () => void): Promise<void> {
    if (ui.advancing) return;
    if (closesRound) {
      const chips = [...el.workspace.querySelectorAll<HTMLElement>(".annotation[data-annotation-id]")]
        .filter((chip) => expiring.has(chip.dataset.annotationId!));
      ui.advancing = true;
      el.nextButton.disabled = true;
      await animateOut(chips);
      ui.advancing = false;
    }
    change();
    requestAnimationFrame(scrollCurrentIntoView);
  }

  function advanceTurn(): Promise<void> {
    const state = store.getState();
    if (!getCurrent(state)) return Promise.resolve();
    return changeTurn(completesRound(state), expiringAnnotationIds(state), () => actions().nextTurn());
  }

  /** Ocultar o eliminar al que tiene el turno cuenta como terminar su turno (ver `leavingCompletesRound`). */
  function leaveTurnOrder(id: string, leave: () => void): Promise<void> {
    const state = store.getState();
    return changeTurn(leavingCompletesRound(state, id), expiringAnnotationIds(state, id), leave);
  }

  async function removeAnnotation(chip: HTMLElement, participantId: string | undefined): Promise<void> {
    if (chip.classList.contains("is-removing")) return;
    const annotationId = chip.dataset.annotationId!;
    await animateOut([chip]);
    if (participantId) actions().removeAnnotation(participantId, annotationId);
    else actions().removeGlobalAnnotation(annotationId);
  }

  async function removeParticipant(id: string): Promise<void> {
    const participant = store.getState().participants.find((p) => p.id === id);
    if (!participant) return;
    const confirmed = await confirmAction(el.confirmDialog, {
      title: `¿Eliminar a ${participant.name}?`,
      message: "Se eliminará permanentemente junto con sus anotaciones. Si solo ha caído en combate, usa «Ocultar».",
      confirmLabel: "Eliminar",
    });
    if (confirmed) {
      ui.openAnnotationForms.delete(id);
      await leaveTurnOrder(id, () => actions().removeParticipant(id));
    }
  }

  async function resetEncounter(): Promise<void> {
    const confirmed = await confirmAction(el.confirmDialog, {
      title: "¿Reiniciar el encuentro?",
      message: "Se borrarán los participantes añadidos y las anotaciones. Gorr, Lyra, Caedren, Kumiko, Adriana y Shary volverán con iniciativa 0.",
      confirmLabel: "Reiniciar encuentro",
    });
    if (confirmed) {
      ui.openAnnotationForms.clear();
      actions().resetEncounter();
    }
  }

  function toggleAnnotationForm(card: HTMLElement, id: string, button: HTMLButtonElement): void {
    const form = requiredElement<HTMLFormElement>(".annotation-form", card);
    const open = form.hidden;
    form.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (open) {
      ui.openAnnotationForms.add(id);
      formInput(form, "text").focus();
    } else {
      ui.openAnnotationForms.delete(id);
    }
  }

  function editField(button: HTMLButtonElement, id: string, field: "name" | "initiative"): void {
    const participant = store.getState().participants.find((p) => p.id === id);
    if (!participant) return;
    startInlineEdit<string | number>(button, field === "name"
      ? {
          value: participant.name,
          label: `Nuevo nombre para ${participant.name}`,
          type: "text",
          parse: parseName,
          onSave: (name) => (name === participant.name ? render() : actions().updateParticipant(id, { name: name as string })),
          onCancel: () => render(),
        }
      : {
          value: String(participant.initiative),
          label: `Nueva iniciativa para ${participant.name}`,
          type: "number",
          parse: parseInitiative,
          onSave: (initiative) =>
            initiative === participant.initiative ? render() : actions().updateParticipant(id, { initiative: initiative as number }),
          onCancel: () => render(),
        });
  }

  // ---------- Eventos (delegados) ----------

  el.workspace.addEventListener("click", (event) => {
    const target = event.target as Element;
    const card = target.closest<HTMLElement>(".participant-card");
    const participantId = card?.dataset.id;
    const button = target.closest<HTMLButtonElement>("button[data-action]");

    if (!button) return;

    if (button.dataset.action === "remove-annotation") {
      void removeAnnotation(button.closest<HTMLElement>(".annotation")!, participantId);
      return;
    }
    if (!card || !participantId) return;

    switch (button.dataset.action) {
      case "edit-name": return editField(button, participantId, "name");
      case "edit-initiative": return editField(button, participantId, "initiative");
      case "toggle-annotation-form": return toggleAnnotationForm(card, participantId, button);
      case "hide": return void leaveTurnOrder(participantId, () => actions().hideParticipant(participantId));
      case "restore": return actions().restoreParticipant(participantId);
      case "remove": return void removeParticipant(participantId);
    }
  });

  // Dar el turno a mano: doble clic (escritorio) o pulsación larga (táctil) en una zona libre de una tarjeta activa,
  // siempre con confirmación. Un clic simple no hace nada, para evitar cambios de turno accidentales.

  async function giveTurnManually(id: string): Promise<void> {
    const state = store.getState();
    const target = state.participants.find((participant) => participant.id === id);
    const current = getCurrent(state);
    if (!target || target.hidden || current?.id === id || ui.advancing) return;
    const confirmed = await confirmAction(el.confirmDialog, {
      title: `¿Dar el turno a ${target.name}?`,
      message: current
        ? `Ahora es el turno de ${current.name}. El turno pasará a ${target.name} sin cambiar de ronda ni descontar anotaciones.`
        : `El turno pasará a ${target.name} sin cambiar de ronda ni descontar anotaciones.`,
      confirmLabel: "Dar el turno",
      tone: "primary",
    });
    if (confirmed) {
      actions().setCurrentParticipant(id);
      requestAnimationFrame(scrollCurrentIntoView);
    }
  }

  /** Id del participante activo cuya tarjeta se ha tocado fuera de botones, campos y anotaciones. */
  function turnTargetAt(target: EventTarget | null): string | null {
    if (!(target instanceof Element) || target.closest("button, input, form, .annotation")) return null;
    const id = target.closest<HTMLElement>(".participant-card")?.dataset.id;
    return id && ui.activeCards.has(id) ? id : null;
  }

  // Si el primer clic del doble clic cayó en un control (p. ej. «＋ Efecto», que al abrir el formulario
  // desplaza los botones), el segundo puede caer en zona libre: eso no debe dar el turno.
  let doubleClickStartedOnControl = false;
  el.activeList.addEventListener("mousedown", (event) => {
    if (event.detail === 1) doubleClickStartedOnControl = turnTargetAt(event.target) === null;
  });
  el.activeList.addEventListener("dblclick", (event) => {
    const id = turnTargetAt(event.target);
    if (id && !doubleClickStartedOnControl) void giveTurnManually(id);
  });

  const LONG_PRESS_MS = 500;
  const LONG_PRESS_MOVE_TOLERANCE_PX = 10;
  /**
   * Pulsación larga en curso. Al cumplirse el tiempo queda `ready` (con vibración y resalte), pero el diálogo
   * se abre al levantar el dedo: si se abriera antes, al soltar podría pulsarse sin querer un botón del diálogo.
   */
  let longPress: { id: string; card: HTMLElement; timer: number; x: number; y: number; ready: boolean } | null = null;
  let lastPointerType = "mouse";
  const cancelLongPress = () => {
    if (!longPress) return;
    window.clearTimeout(longPress.timer);
    longPress.card.classList.remove("is-long-pressed");
    longPress = null;
  };

  el.activeList.addEventListener("pointerdown", (event) => {
    lastPointerType = event.pointerType;
    cancelLongPress();
    const id = turnTargetAt(event.target);
    if (event.pointerType === "mouse" || !id) return;
    const card = ui.activeCards.get(id)!;
    const press = {
      id,
      card,
      x: event.clientX,
      y: event.clientY,
      ready: false,
      timer: window.setTimeout(() => {
        press.ready = true;
        card.classList.add("is-long-pressed");
        navigator.vibrate?.(15);
      }, LONG_PRESS_MS),
    };
    longPress = press;
  });
  el.activeList.addEventListener("pointerup", () => {
    const press = longPress;
    cancelLongPress();
    if (press?.ready) void giveTurnManually(press.id);
  });
  el.activeList.addEventListener("pointermove", (event) => {
    if (longPress && Math.hypot(event.clientX - longPress.x, event.clientY - longPress.y) > LONG_PRESS_MOVE_TOLERANCE_PX) {
      cancelLongPress();
    }
  });
  ["pointercancel", "pointerleave"].forEach((type) => el.activeList.addEventListener(type, cancelLongPress));
  // En táctil, la pulsación larga abriría el menú contextual del navegador sobre la tarjeta.
  el.activeList.addEventListener("contextmenu", (event) => {
    if (lastPointerType !== "mouse" && turnTargetAt(event.target)) event.preventDefault();
  });

  el.workspace.addEventListener("submit", (event) => {
    const form = event.target as HTMLFormElement;
    if (!form.classList.contains("participant-annotation-form")) return;
    event.preventDefault();
    const participantId = form.closest<HTMLElement>(".participant-card")?.dataset.id;
    const annotation = readAnnotationForm(form);
    if (!participantId || !annotation) return;
    ui.openAnnotationForms.delete(participantId);
    actions().addAnnotation(participantId, annotation.text, annotation.rounds);
  });

  el.participantForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = el.participantForm;
    const nameInput = formInput(form, "name");
    const initiativeInput = formInput(form, "initiative");
    const name = parseName(nameInput.value);
    if (!name.ok) return setFormError(form, name.error, nameInput);
    const initiative = parseInitiative(initiativeInput.value);
    if (!initiative.ok) return setFormError(form, initiative.error, initiativeInput);

    setFormError(form, null);
    const hidden = (event.submitter as HTMLElement | null)?.dataset.hidden === "true";
    actions().addParticipant({ name: name.value, initiative: initiative.value, hidden });
    form.reset();
    nameInput.focus();
  });

  el.globalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const annotation = readAnnotationForm(el.globalForm);
    if (!annotation) return;
    actions().addGlobalAnnotation(annotation.text, annotation.rounds);
    el.globalForm.reset();
  });

  el.nextButton.addEventListener("click", () => void advanceTurn());
  el.resetButton.addEventListener("click", () => void resetEncounter());

  el.hiddenToggle.addEventListener("click", () => {
    const expanded = el.hiddenToggle.getAttribute("aria-expanded") === "true";
    el.hiddenToggle.setAttribute("aria-expanded", String(!expanded));
    el.hiddenList.hidden = expanded;
  });

  store.subscribe((state, previous) => {
    const onlyTurnChanged =
      state.participants === previous.participants &&
      state.globalAnnotations === previous.globalAnnotations &&
      state.round === previous.round;
    if (onlyTurnChanged) renderCurrentTurn(state);
    else render(state);
  });

  render();
}

function readAnnotationForm(form: HTMLFormElement): { text: string; rounds: number | null } | null {
  const textInput = formInput(form, "text");
  const roundsInput = formInput(form, "rounds");
  const text = parseAnnotationText(textInput.value);
  if (!text.ok) {
    setFormError(form, text.error, textInput);
    return null;
  }
  const rounds = parseRounds(roundsInput.value);
  if (!rounds.ok) {
    setFormError(form, rounds.error, roundsInput);
    return null;
  }
  setFormError(form, null);
  return { text: text.value, rounds: rounds.value };
}
