import type { Annotation } from "../domain/types.ts";
import { renderToken, type TokenOwner } from "./tokens.ts";

export function durationLabel(remainingRounds: number | null): string {
  if (remainingRounds === null) return "Infinita";
  if (remainingRounds === 1) return "Última ronda";
  return `${remainingRounds} rondas`;
}

/** Cuándo termina una anotación finita: al volver el turno de quien la desencadenó (o al empezar la ronda, si no se sabe). */
export function expiryHint(remainingRounds: number | null, turnOwner: string | null): string | null {
  if (remainingRounds === null) return null;
  const moment = turnOwner ? `al volver el turno de ${turnOwner}` : "al empezar la ronda";
  return remainingRounds === 1 ? `Expira ${moment}` : `Descuenta una ronda ${moment}`;
}

/**
 * `turnOwner`: quien tenía el turno al crear la anotación. En las finitas se muestra su token en miniatura
 * («hasta [token]»): es al volver su turno cuando la anotación descuenta y expira.
 */
export function createAnnotationChip(annotation: Annotation, turnOwner: TokenOwner | null): HTMLElement {
  const item = document.createElement("span");
  item.className = "annotation";
  item.dataset.annotationId = annotation.id;
  item.classList.toggle("is-infinite", annotation.remainingRounds === null);
  item.classList.toggle("is-expiring", annotation.remainingRounds === 1);
  const hint = expiryHint(annotation.remainingRounds, turnOwner?.name ?? null);
  if (hint) item.title = hint;

  const text = document.createElement("span");
  text.className = "annotation-text";
  text.textContent = annotation.text;

  const duration = document.createElement("span");
  duration.className = "annotation-duration";
  duration.textContent = durationLabel(annotation.remainingRounds);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "annotation-delete";
  remove.dataset.action = "remove-annotation";
  remove.setAttribute("aria-label", `Quitar anotación: ${annotation.text}`);
  remove.textContent = "×";

  item.append(text, document.createTextNode(" · "), duration);
  if (turnOwner && annotation.remainingRounds !== null) item.append(createTurnOwner(turnOwner));
  item.append(remove);
  return item;
}

/** «hasta [token]»: indica en el turno de quién acaba la anotación. */
function createTurnOwner(owner: TokenOwner): HTMLElement {
  const wrapper = document.createElement("span");
  wrapper.className = "annotation-owner";
  const label = document.createElement("span");
  label.className = "annotation-owner-label";
  label.textContent = "hasta";
  const token = document.createElement("span");
  token.className = "participant-token token-mini";
  token.setAttribute("role", "img");
  token.setAttribute("aria-label", `el turno de ${owner.name}`);
  renderToken(token, owner);
  wrapper.append(label, token);
  return wrapper;
}
