import { canRemove } from "../domain/encounter.ts";
import type { Participant } from "../domain/types.ts";
import { createAnnotationChip } from "./annotationChip.ts";
import { requiredElement } from "./dom.ts";
import { renderToken } from "./tokens.ts";

export interface CardOptions {
  isCurrent: boolean;
  annotationFormOpen: boolean;
}

const action = (card: HTMLElement, name: string) => requiredElement<HTMLButtonElement>(`[data-action="${name}"]`, card);

export function createParticipantCard(template: HTMLTemplateElement, participant: Participant, options: CardOptions): HTMLElement {
  const card = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
  const { hidden } = participant;
  card.dataset.id = participant.id;

  renderToken(requiredElement<HTMLElement>(".participant-token", card), participant);

  const initiative = action(card, "edit-initiative");
  initiative.textContent = String(participant.initiative);
  initiative.setAttribute("aria-label", `Iniciativa de ${participant.name}: ${participant.initiative}. Editar`);

  const name = action(card, "edit-name");
  name.textContent = participant.name;
  name.setAttribute("aria-label", `${participant.name}. Editar nombre`);

  requiredElement(".annotations", card).append(...participant.annotations.map((annotation) => createAnnotationChip(annotation, participant, "participant")));

  const toggleForm = action(card, "toggle-annotation-form");
  toggleForm.hidden = hidden;
  toggleForm.setAttribute("aria-expanded", String(options.annotationFormOpen && !hidden));
  requiredElement<HTMLFormElement>(".annotation-form", card).hidden = !options.annotationFormOpen || hidden;

  action(card, "hide").hidden = hidden;
  action(card, "restore").hidden = !hidden;
  const remove = action(card, "remove");
  remove.hidden = !canRemove(participant);
  remove.setAttribute("aria-label", `Eliminar a ${participant.name}`);

  setCardCurrent(card, options.isCurrent);
  return card;
}

export function setCardCurrent(card: HTMLElement, isCurrent: boolean): void {
  card.classList.toggle("is-current", isCurrent);
  if (isCurrent) card.setAttribute("aria-current", "step");
  else card.removeAttribute("aria-current");
  requiredElement<HTMLElement>(".current-label", card).hidden = !isCurrent;
}
