import type { Annotation } from "../domain/types.ts";

export function durationLabel(remainingRounds: number | null): string {
  if (remainingRounds === null) return "Infinita";
  if (remainingRounds === 1) return "Última ronda";
  return `${remainingRounds} rondas`;
}

/** Cuándo termina una anotación finita, según el turno en que empezó. */
export function expiryHint(remainingRounds: number | null, anchorName: string | null): string | null {
  if (remainingRounds === null) return null;
  const moment = anchorName ? `al llegar el turno de ${anchorName}` : "al empezar la ronda";
  return remainingRounds === 1 ? `Expira ${moment}` : `Descuenta una ronda ${moment}`;
}

export function createAnnotationChip(annotation: Annotation, anchorName: string | null = null): HTMLElement {
  const item = document.createElement("span");
  item.className = "annotation";
  item.dataset.annotationId = annotation.id;
  item.classList.toggle("is-infinite", annotation.remainingRounds === null);
  item.classList.toggle("is-expiring", annotation.remainingRounds === 1);
  const hint = expiryHint(annotation.remainingRounds, anchorName);
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

  item.append(text, document.createTextNode(" · "), duration, remove);
  return item;
}
