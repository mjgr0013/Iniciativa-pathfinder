import type { Annotation } from "../domain/types.ts";

export function durationLabel(remainingRounds: number | null): string {
  if (remainingRounds === null) return "Infinita";
  if (remainingRounds === 1) return "Última ronda";
  return `${remainingRounds} rondas`;
}

export function createAnnotationChip(annotation: Annotation): HTMLElement {
  const item = document.createElement("span");
  item.className = "annotation";
  item.dataset.annotationId = annotation.id;
  item.classList.toggle("is-infinite", annotation.remainingRounds === null);
  if (annotation.remainingRounds === 1) {
    item.classList.add("is-expiring");
    item.title = "Expira al finalizar esta ronda";
  }

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
